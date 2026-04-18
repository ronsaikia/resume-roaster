import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, VISION_ANALYSIS_PROMPT, SIMPLIFIED_JSON_PROMPT } from "@/lib/analyzePrompt";
import crypto from "crypto";

interface PdfjsLib {
  GlobalWorkerOptions: { workerSrc: string | false };
  getDocument: (options: {
    data: Uint8Array;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
    disableWorker?: boolean;
  }) => { promise: Promise<PDFDocument> };
}

interface PDFDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PDFPage>;
  destroy?: () => void;
}

interface PDFPage {
  getTextContent: () => Promise<TextContent>;
}

interface TextContent {
  items: Array<TextItem | TextMarkedContent>;
}

interface TextItem {
  str?: string;
}

interface TextMarkedContent {
  type: 'beginMarkedContent' | 'endMarkedContent';
  items?: Array<TextItem | TextMarkedContent>;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory request deduplication cache
interface CachedResult {
  result: string;
  timestamp: number;
}
const requestCache = new Map<string, CachedResult>();
const CACHE_TTL_MS = 60000; // 60 seconds

// Clean old cache entries periodically
function cleanOldCacheEntries(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  requestCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_TTL_MS) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => requestCache.delete(key));
}

/**
 * Extract text from text content items recursively (handles marked content)
 */
function extractTextFromItems(items: Array<TextItem | TextMarkedContent>): string {
  const textParts: string[] = [];

  for (const item of items) {
    if ('str' in item && item.str !== undefined) {
      textParts.push(item.str);
    } else if ('type' in item && item.type === 'beginMarkedContent' && item.items) {
      textParts.push(extractTextFromItems(item.items));
    }
  }

  return textParts.join(' ');
}

async function parsePDFWithPdfjs(buffer: Buffer): Promise<{ text: string }> {
  try {
    const pdfjsLib = await import("pdfjs-dist") as unknown as PdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = false;

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableWorker: true,
    });
    const pdf = await loadingTask.promise;
    let fullText = "";
    const pagesToProcess = Math.min(pdf.numPages, 5);

    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = extractTextFromItems(textContent.items);
      fullText += pageText + "\n";
    }

    const trimmedText = fullText.trim();
    console.log(`[PDF Parse] pdfjs extracted ${trimmedText.length} chars`);
    return { text: trimmedText };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PDF Parse] pdfjs failed:", msg);
    throw new Error("pdfjs extraction failed: " + msg);
  }
}

async function parsePDFWithRegex(buffer: Buffer): Promise<{ text: string }> {
  try {
    const pdfString = buffer.toString("latin1");
    const textParts: string[] = [];
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btEtRegex.exec(pdfString)) !== null) {
      const block = btMatch[1];
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) textParts.push(tjMatch[1]);
      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjArrayMatch;
      while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
        const arrayContent = tjArrayMatch[1];
        const stringRegex = /\(([^)]*)\)/g;
        let strMatch;
        while ((strMatch = stringRegex.exec(arrayContent)) !== null) textParts.push(strMatch[1]);
      }
    }
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch;
    while ((streamMatch = streamRegex.exec(pdfString)) !== null) {
      const content = streamMatch[1];
      if (/[a-zA-Z]{10,}/.test(content)) {
        const words = content.match(/[a-zA-Z][a-zA-Z\s.,@\-+]{3,}/g);
        if (words) textParts.push(...words);
      }
    }
    const fullText = textParts
      .join(" ")
      .replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\t/g, " ")
      .replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\")
      .replace(/\s+/g, " ").trim();
    if (fullText.length > 100) {
      console.log("[PDF Parse] Regex extracted", fullText.length, "chars");
      return { text: fullText };
    }
    throw new Error("Regex extraction yielded insufficient text: " + fullText.length + " chars");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error("Regex extraction failed: " + msg);
  }
}

async function parsePDF(buffer: Buffer): Promise<{ text: string; needsVision: boolean }> {
  try {
    const result = await parsePDFWithPdfjs(buffer);
    if (result.text.length >= 50) return { text: result.text, needsVision: false };
    console.log("[PDF Parse] pdfjs returned insufficient text (<50 chars), trying regex...");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[PDF Parse] pdfjs failed:", msg);
  }
  try {
    const result = await parsePDFWithRegex(buffer);
    if (result.text.length >= 50) return { text: result.text, needsVision: false };
    console.log("[PDF Parse] regex returned insufficient text (<50 chars), falling back to vision");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[PDF Parse] regex failed:", msg);
  }
  return { text: "", needsVision: true };
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("429") ||
      message.includes("503") ||
      message.includes("quota") ||
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("resource exhausted")
    );
  }
  return false;
}

function logErrorDetails(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[${context}] Error:`, error.message);
  } else {
    console.error(`[${context}] Unknown error:`, JSON.stringify(error));
  }
}

/**
 * Multi-key fallback logic for Gemini API calls with exponential backoff
 * Each key gets MAX 2 retries with backoff (500ms, 1000ms) before moving to next key
 * Only retries on rate-limit/quota errors (429, 503, resource exhausted)
 * Non-rate-limit errors fail fast
 */
async function callGeminiWithMultiKeyFallback(
  prompt: string,
  isVisionMode: boolean = false,
  pdfBase64?: string,
  targetRole?: string | null
): Promise<string> {
  // Collect available API keys
  const apiKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];

  if (apiKeys.length === 0) {
    throw new Error("No Gemini API keys configured");
  }

  console.log(`[Gemini] Starting multi-key fallback with ${apiKeys.length} key(s), targetRole: ${targetRole || 'none'}`);

  const MAX_RETRIES_PER_KEY = 2;
  const RETRY_DELAYS = [500, 1000]; // Exponential backoff delays in ms

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    const keySuffix = apiKey.slice(-4);

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_KEY; attempt++) {
      try {
        console.log(`[Gemini] Key ${keyIndex + 1}/${apiKeys.length} (ending ...${keySuffix}) - Attempt ${attempt + 1}/${MAX_RETRIES_PER_KEY + 1}`);

        // Create a NEW client for each attempt
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let result;

        if (isVisionMode && pdfBase64) {
          // Vision mode: pass PDF as inline data
          result = await model.generateContent([
            prompt,
            {
              inlineData: {
                data: pdfBase64,
                mimeType: "application/pdf",
              },
            },
          ]);
        } else {
          // Text mode: standard prompt
          result = await model.generateContent(prompt);
        }

        const response = result.response;
        const text = response.text();

        if (!text || text.trim().length === 0) {
          throw new Error("Empty response from Gemini");
        }

        console.log(`[Gemini] Success with key ...${keySuffix} on attempt ${attempt + 1}. Response length: ${text.length}`);
        return text;
      } catch (error) {
        logErrorDetails(`Gemini key ${keyIndex + 1} attempt ${attempt + 1}`, error);

        if (isRateLimitError(error)) {
          console.warn(`[Gemini] Key ...${keySuffix} hit rate limit/quota on attempt ${attempt + 1}`);

          // If we have more retries for this key, wait and retry
          if (attempt < MAX_RETRIES_PER_KEY) {
            const delay = RETRY_DELAYS[attempt];
            console.log(`[Gemini] Waiting ${delay}ms before retry ${attempt + 2}...`);
            await sleep(delay);
            continue;
          }

          // Exhausted retries for this key, move to next key if available
          if (keyIndex < apiKeys.length - 1) {
            console.log(`[Gemini] Exhausted retries for key ...${keySuffix}, moving to next key...`);
            await sleep(500); // Small delay before trying next key
          }
          break; // Move to next key
        } else {
          // Non-rate-limit error - fail fast, don't retry with other keys
          console.error(`[Gemini] Non-retryable error with key ...${keySuffix}:`, error instanceof Error ? error.message : error);
          throw error;
        }
      }
    }
  }

  // All keys exhausted
  throw new Error("All Gemini API keys failed due to rate limits or quotas");
}

function looksLikeResume(text: string): boolean {
  const resumeKeywords = [
    "experience", "education", "skills", "work", "job", "employment",
    "qualification", "degree", "university", "college", "project", "achievement",
    "summary", "objective", "contact", "email", "phone", "linkedin", "github",
    "professional", "career", "internship", "certificate", "training", "references",
    "gpa", "cgpa", "intern", "developer", "engineer", "b.tech", "btech", "b.e",
    "mtech", "m.tech", "computer science", "information technology", "software",
    "coding", "programming", "java", "python", "react", "node",
  ];
  const textLower = text.toLowerCase();
  const keywordCount = resumeKeywords.filter((kw) => textLower.includes(kw)).length;
  const hasEmailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasNamePattern = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text);
  return keywordCount >= 2 || (hasEmailPattern && hasNamePattern);
}

const invalidDocumentMessages = [
  "Bhai, ye resume hai? Bijli ka bill upload kar diya kya?",
  "Uploaded document is as irrelevant as your 1st-year engineering syllabus.",
  "Tinder bio de diya kya? Because HR isn't swiping right on this either.",
  "Aadhaar card upload mat kar bhai, job CV pe milti hai.",
  "Kya Matlab? Kuch bhi upload karega?",
];

export async function POST(request: NextRequest) {
  try {
    // Clean old cache entries periodically
    cleanOldCacheEntries();

    // Check for primary API key - throw 500 if missing
    if (!process.env.GEMINI_API_KEY_1) {
      return NextResponse.json(
        { error: "Bhai, server ka API key missing hai 😭 Admin se baat kar!" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;
    const targetRole = formData.get("targetRole") as string | null;

    console.log(`[Request] File: ${file?.name}, Size: ${file?.size}, Type: ${file?.type}`);

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    let bytes: ArrayBuffer;
    try {
      bytes = await file.arrayBuffer();
    } catch {
      return NextResponse.json({ error: "Failed to read file. The file may be corrupted." }, { status: 400 });
    }

    const buffer = Buffer.from(bytes);

    // Generate file hash for deduplication
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const cacheKey = `${fileHash}-${targetRole || "general"}`;

    // Check cache for recent duplicate request
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      console.log(`[Cache] Returning cached result for file hash ${fileHash.slice(0, 8)}...`);
      return NextResponse.json(JSON.parse(cached.result));
    }

    // Try text extraction first
    let pdfText = "";
    let useVisionMode = false;

    try {
      const result = await parsePDF(buffer);
      pdfText = result.text;
      useVisionMode = result.needsVision;
    } catch {
      useVisionMode = true;
    }

    if (!useVisionMode && (!pdfText || pdfText.trim().length < 50)) {
      console.log("[PDF Parse] Text too short (<50 chars), switching to vision mode");
      useVisionMode = true;
    }

    let result: string | undefined;

    // VISION MODE: PDF as base64 inline data
    if (useVisionMode) {
      // Convert PDF buffer to base64, trim to 4MB max
      let pdfBase64 = buffer.toString("base64");
      const maxBase64Size = 4 * 1024 * 1024; // 4MB

      if (pdfBase64.length > maxBase64Size) {
        console.log(`[Vision] PDF base64 too large (${pdfBase64.length} chars), truncating to 4MB`);
        pdfBase64 = pdfBase64.substring(0, maxBase64Size);
      }

      const visionPrompt = SYSTEM_PROMPT + "\n\n" + VISION_ANALYSIS_PROMPT(targetRole);

      try {
        result = await callGeminiWithMultiKeyFallback(visionPrompt, true, pdfBase64, targetRole);
      } catch (visionError) {
        logErrorDetails("Vision mode failed", visionError);

        // Check if we should fall back to text mode
        const msg = visionError instanceof Error ? visionError.message.toLowerCase() : "";
        const isUnsupportedError =
          msg.includes("400") ||
          msg.includes("422") ||
          msg.includes("unsupported") ||
          msg.includes("invalid") ||
          msg.includes("image") ||
          msg.includes("multimodal") ||
          msg.includes("mime type");

        if (isUnsupportedError) {
          console.log("[Vision] Model rejected PDF input, falling back to text mode");
          useVisionMode = false;
        }

        // If we have some text, try text mode as fallback
        if (!useVisionMode && pdfText && pdfText.trim().length > 10) {
          console.log("[Vision] Falling back to text mode with extracted text (pdfText.length=" + pdfText.length + ")");
        } else if (!useVisionMode) {
          // No text and vision failed - return error
          return NextResponse.json(
            { error: "Bhai, PDF process nahi ho raha 😵 Ek alag readable PDF try kar!" },
            { status: 400 }
          );
        }
      }
    }

    // TEXT MODE: Use extracted text with multi-key fallback
    if (!useVisionMode && !result) {
      if (!pdfText || pdfText.trim().length < 10) {
        return NextResponse.json(
          { error: "Bhai, PDF se kuchh text nahi nikla 😵 Scanned/image PDF lag raha hai. Readable digital PDF upload kar!" },
          { status: 400 }
        );
      }

      if (!looksLikeResume(pdfText)) {
        const randomMessage = invalidDocumentMessages[Math.floor(Math.random() * invalidDocumentMessages.length)];
        return NextResponse.json(
          { status: "invalid_document", message: randomMessage, error: "Invalid document uploaded" },
          { status: 400 }
        );
      }

      const textPrompt = SYSTEM_PROMPT + "\n\n" + ANALYSIS_PROMPT(pdfText, targetRole);

      try {
        result = await callGeminiWithMultiKeyFallback(textPrompt, false, undefined, targetRole);
      } catch (textError) {
        logErrorDetails("Text mode failed", textError);
        throw textError;
      }
    }

    if (!result) {
      throw new Error("Failed to get response after all attempts");
    }

    // Parse and sanitize the JSON response
    try {
      let cleanedText = result.trim();

      // Strip markdown code blocks
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      let analysis;

      try {
        analysis = JSON.parse(cleanedText);
      } catch {
        console.error("[Parse] Direct JSON parse failed, trying extraction...");
        console.error("[Parse] Response preview:", cleanedText.substring(0, 300));

        // Try simplified retry for vision mode
        if (useVisionMode) {
          try {
            let pdfBase64 = buffer.toString("base64");
            const maxBase64Size = 4 * 1024 * 1024;
            if (pdfBase64.length > maxBase64Size) {
              pdfBase64 = pdfBase64.substring(0, maxBase64Size);
            }

            const retryPrompt = SYSTEM_PROMPT + "\n\n" + VISION_ANALYSIS_PROMPT(targetRole) + "\n\n" + SIMPLIFIED_JSON_PROMPT;
            const retryText = await callGeminiWithMultiKeyFallback(retryPrompt, true, pdfBase64, targetRole);

            let retryCleaned = retryText.trim();
            if (retryCleaned.startsWith("```json")) retryCleaned = retryCleaned.slice(7);
            else if (retryCleaned.startsWith("```")) retryCleaned = retryCleaned.slice(3);
            if (retryCleaned.endsWith("```")) retryCleaned = retryCleaned.slice(0, -3);

            analysis = JSON.parse(retryCleaned.trim());
            console.log("[Parse] Simplified retry succeeded");
          } catch (retryError) {
            console.error("[Parse] Simplified retry failed:", retryError);
          }
        }

        if (!analysis) {
          // Try to extract JSON from response using regex
          const jsonMatches = cleanedText.match(/\{[\s\S]*\}/g);
          if (jsonMatches) {
            for (let i = jsonMatches.length - 1; i >= 0; i--) {
              try {
                analysis = JSON.parse(jsonMatches[i]);
                console.log("[Parse] Extracted JSON at match", i);
                break;
              } catch { continue; }
            }
          }
        }

        if (!analysis) {
          return NextResponse.json(
            { error: "Failed to parse analysis response. Please try again." },
            { status: 500 }
          );
        }
      }

      if (analysis.status === "invalid_document") {
        return NextResponse.json(
          { status: "invalid_document", message: analysis.message || "This doesn't look like a resume.", error: "Invalid document uploaded" },
          { status: 400 }
        );
      }

      if (typeof analysis.overallScore === "number" && analysis.overallScore >= 0) {
        // Cache the successful result
        requestCache.set(cacheKey, { result: JSON.stringify(analysis), timestamp: Date.now() });
        return NextResponse.json(analysis);
      }

      if (!analysis.roastHeadline || !analysis.roastQuote) {
        return NextResponse.json({ error: "Invalid analysis response structure" }, { status: 500 });
      }

      // Cache the successful result
      requestCache.set(cacheKey, { result: JSON.stringify(analysis), timestamp: Date.now() });
      return NextResponse.json(analysis);
    } catch (parseError) {
      console.error("[Parse] Fatal error:", parseError);
      return NextResponse.json({ error: "Analysis failed. Please try again later." }, { status: 500 });
    }
  } catch (error) {
    logErrorDetails("POST Handler", error);
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";

    if (
      errorMessage.includes("503") ||
      errorMessage.includes("429") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("all gemini api keys failed")
    ) {
      return NextResponse.json(
        { error: "API busy hai abhi 😤 Thoda wait karo aur retry karo, ya Demo mode try kar", retryAfter: 5 },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Yaar kuchh toh gadbad ho gayi 😭 Thodi der baad dubara try karo!" },
      { status: 500 }
    );
  }
}
