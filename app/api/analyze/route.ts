import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, VISION_ANALYSIS_PROMPT, SIMPLIFIED_JSON_PROMPT } from "@/lib/analyzePrompt";

// Type definitions for PDF.js v5
interface PdfjsLib {
  GlobalWorkerOptions: {
    workerSrc: string | false;
  };
  getDocument: (options: {
    data: Uint8Array;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    useSystemFonts?: boolean;
    disableWorker?: boolean;
  }) => {
    promise: Promise<PDFDocument>;
  };
}

interface PDFDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PDFPage>;
}

interface PDFPage {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<TextContent>;
  render: (options: {
    canvasContext: unknown;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
}

interface TextContent {
  items: TextItem[];
}

interface TextItem {
  str?: string;
}

// Environment variable checks at startup
if (!process.env.OPENROUTER_API_KEY) {
  console.error("[Startup] OPENROUTER_API_KEY is not set!");
}
if (!process.env.NEXT_PUBLIC_SITE_URL) {
  console.warn("[Startup] NEXT_PUBLIC_SITE_URL is not set, using default");
}

// OpenRouter client - single instance
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "JhalmuriCV",
  },
});

// Best free text/reasoning model
const TEXT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const TEXT_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
];
// Only free vision-capable model in the list
const VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

// PDF parsing requires Node.js runtime
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sleep helper for retry logic
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Parse PDF using pdfjs-dist v5 - fixed import path
async function parsePDFWithPdfjs(buffer: Buffer): Promise<{ text: string }> {
  try {
    // pdfjs-dist v5: use the main package with disableWorker option
    const pdfjsLib = await import("pdfjs-dist") as unknown as PdfjsLib;
    // For v5, we disable worker via getDocument options, not GlobalWorkerOptions

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableWorker: true, // v5 way to disable worker for Node.js
    });
    const pdf = await loadingTask.promise;

    let fullText = "";
    // Process up to 5 pages to avoid timeout issues
    const pagesToProcess = Math.min(pdf.numPages, 5);

    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    const trimmedText = fullText.trim();
    console.log(`[PDF Parse] pdfjs extraction succeeded, got ${trimmedText.length} chars from ${pagesToProcess} pages`);

    return { text: trimmedText };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PDF Parse] pdfjs strategy failed:", msg);
    throw new Error("Could not extract text from PDF using pdfjs: " + msg);
  }
}

// Convert PDF pages to JPEG images for vision mode - fixed dynamic import
async function convertPDFToImages(buffer: Buffer): Promise<string[]> {
  try {
    // Use dynamic import instead of require for @napi-rs/canvas
    const { createCanvas } = await import("@napi-rs/canvas");

    const pdfjsLib = await import("pdfjs-dist") as unknown as PdfjsLib;

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableWorker: true,
    });
    const pdf = await loadingTask.promise;

    const images: string[] = [];
    const pagesToConvert = Math.min(pdf.numPages, 2);

    for (let i = 1; i <= pagesToConvert; i++) {
      const page = await pdf.getPage(i);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d");

      // White background so text is readable
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // pdfjs v5: pass ONLY canvasContext + viewport
      await page.render({
        canvasContext: ctx as unknown,
        viewport: viewport,
      }).promise;

      // @napi-rs/canvas encode returns a Promise - await it
      const jpegBuffer = await canvas.encode("jpeg", 85);
      images.push(jpegBuffer.toString("base64"));
      console.log(`[PDF Vision] Page ${i}: ${canvas.width}x${canvas.height}, ${jpegBuffer.length} bytes`);
    }

    if (images.length === 0) {
      throw new Error("PDF_RENDER_FAIL: no pages rendered");
    }
    return images;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PDF Vision] convertPDFToImages failed:", msg);
    throw new Error("PDF_RENDER_FAIL: " + msg);
  }
}

// Parse PDF using pure regex approach - fallback when pdfjs fails
async function parsePDFWithRegex(buffer: Buffer): Promise<{ text: string }> {
  try {
    const pdfString = buffer.toString("latin1");
    const textParts: string[] = [];

    // Extract text from BT...ET blocks
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btEtRegex.exec(pdfString)) !== null) {
      const block = btMatch[1];
      // Match Tj operator (single string)
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        textParts.push(tjMatch[1]);
      }
      // Match TJ operator (array of strings)
      const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
      let tjArrayMatch;
      while ((tjArrayMatch = tjArrayRegex.exec(block)) !== null) {
        const arrayContent = tjArrayMatch[1];
        const stringRegex = /\(([^)]*)\)/g;
        let strMatch;
        while ((strMatch = stringRegex.exec(arrayContent)) !== null) {
          textParts.push(strMatch[1]);
        }
      }
    }

    // Also try to find plain text streams
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch;
    while ((streamMatch = streamRegex.exec(pdfString)) !== null) {
      const content = streamMatch[1];
      if (/[a-zA-Z]{10,}/.test(content)) {
        // Looks like readable text
        const words = content.match(/[a-zA-Z][a-zA-Z\s.,@\-+]{3,}/g);
        if (words) textParts.push(...words);
      }
    }

    const fullText = textParts
      .join(" ")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .replace(/\s+/g, " ")
      .trim();

    if (fullText.length > 100) {
      console.log("[PDF Parse] Regex extraction succeeded, got", fullText.length, "chars");
      return { text: fullText };
    }

    throw new Error("Regex extraction yielded insufficient text: " + fullText.length + " chars");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PDF Parse] Regex strategy failed:", msg);
    throw new Error("Could not extract text from PDF: " + msg);
  }
}

// Main PDF parser - tries pdfjs first, then regex, then falls back to vision
async function parsePDF(buffer: Buffer): Promise<{ text: string; needsVision: boolean }> {
  // Strategy 1: Try pdfjs-dist text extraction
  try {
    const result = await parsePDFWithPdfjs(buffer);
    if (result.text.length >= 100) {
      return { text: result.text, needsVision: false };
    }
    console.log("[PDF Parse] pdfjs returned insufficient text, trying regex...");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[PDF Parse] pdfjs failed:", msg, "- falling back to regex...");
  }

  // Strategy 2: Try regex-based extraction
  try {
    const result = await parsePDFWithRegex(buffer);
    if (result.text.length >= 100) {
      return { text: result.text, needsVision: false };
    }
    console.log("[PDF Parse] regex returned insufficient text, will use vision mode");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[PDF Parse] regex failed:", msg, "- will use vision mode");
  }

  // Strategy 3: Fall back to vision mode
  return { text: "", needsVision: true };
}

// Check if an error indicates a 503/overload/429 condition
function isOverloadedError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("503") ||
      message.includes("429") ||
      message.includes("overloaded") ||
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("resource exhausted") ||
      message.includes("try again later") ||
      message.includes("max retries")
    );
  }
  return false;
}

// Check if error indicates vision model rejected the images
function isVisionModelError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("image") ||
      message.includes("multimodal") ||
      message.includes("vision") ||
      message.includes("unsupported") ||
      message.includes("400") ||
      message.includes("422")
    );
  }
  return false;
}

// Helper to log full error details
function logErrorDetails(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[${context}] Error:`, error.message);
    console.error(`[${context}] Stack:`, error.stack);
  } else {
    console.error(`[${context}] Unknown error:`, JSON.stringify(error));
  }
}

async function callOpenRouterWithRetry(
  prompt: string,
  model: string,
  imageBase64List?: string[],
  maxRetries = 3
): Promise<string> {
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let messages: OpenAI.Chat.ChatCompletionMessageParam[];

      if (imageBase64List && imageBase64List.length > 0) {
        // Vision mode: send images as base64 data URLs
        const contentParts: OpenAI.Chat.ChatCompletionContentPart[] = [
          { type: "text", text: prompt },
        ];

        // Add each image
        for (const imageBase64 of imageBase64List) {
          contentParts.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
            },
          });
        }

        messages = [
          {
            role: "user",
            content: contentParts,
          },
        ];
      } else {
        // Text mode
        messages = [
          {
            role: "user",
            content: prompt,
          },
        ];
      }

      console.log(`[OpenRouter] Calling model: ${model}, attempt: ${attempt + 1}, mode: ${imageBase64List ? 'vision' : 'text'}`);

      const completion = await openrouter.chat.completions.create({
        model: model,
        messages,
        max_tokens: 8192,
        temperature: 0.7,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      if (!responseText) {
        throw new Error("Empty response from OpenRouter");
      }

      console.log(`[OpenRouter] Response received, length: ${responseText.length}, preview: ${responseText.substring(0, 200)}...`);

      return responseText;
    } catch (error) {
      logErrorDetails(`OpenRouter Attempt ${attempt + 1}`, error);

      if (attempt < maxRetries && isOverloadedError(error)) {
        const delay = delays[attempt] || 4000;
        console.log(`[OpenRouter] Retrying after ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw new Error("503 Service Unavailable: Max retries exceeded");
}

// Function to check if text looks like a resume
function looksLikeResume(text: string): boolean {
  const resumeKeywords = [
    "experience",
    "education",
    "skills",
    "work",
    "job",
    "employment",
    "qualification",
    "degree",
    "university",
    "college",
    "project",
    "achievement",
    "summary",
    "objective",
    "contact",
    "email",
    "phone",
    "linkedin",
    "github",
    "professional",
    "career",
    "internship",
    "certificate",
    "training",
    "references",
    "gpa",
    "cgpa",
    "intern",
    "developer",
    "engineer",
    "b.tech",
    "btech",
    "b.e",
    "mtech",
    "m.tech",
    "computer science",
    "information technology",
    "software",
    "coding",
    "programming",
    "java",
    "python",
    "react",
    "node",
  ];

  const textLower = text.toLowerCase();
  const keywordCount = resumeKeywords.filter((kw) =>
    textLower.includes(kw)
  ).length;

  // Check for name + email pattern (common in resumes)
  const hasEmailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasNamePattern = /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text);

  // Relaxed criteria: 2+ keywords OR (has name pattern AND email pattern)
  return keywordCount >= 2 || (hasEmailPattern && hasNamePattern);
}

// Pool of invalid document messages
const invalidDocumentMessages = [
  "Bhai, ye resume hai? Bijli ka bill upload kar diya kya?",
  "Uploaded document is as irrelevant as your 1st-year engineering syllabus.",
  "Tinder bio de diya kya? Because HR isn't swiping right on this either.",
  "Aadhaar card upload mat kar bhai, job CV pe milti hai.",
  "Kya Matlab? Kuch bhi upload karega?",
];

export async function POST(request: NextRequest) {
  // Wrap entire handler in try/catch for robustness
  try {
    // Startup check for environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not set!");
      return NextResponse.json(
        { error: "Bhai, server ka API key missing hai 😭 Admin se baat kar, ya Demo try karo!" },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.warn("NEXT_PUBLIC_SITE_URL is not set, using default");
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;
    const targetRole = formData.get("targetRole") as string | null;

    // Request logging for debugging
    console.log(`[Request] File: ${file?.name || 'none'}, Size: ${file?.size || 0} bytes, Type: ${file?.type || 'unknown'}, TargetRole: ${targetRole || 'General / Fresher'}`);

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Convert file to buffer with error handling
    let bytes: ArrayBuffer;
    try {
      bytes = await file.arrayBuffer();
    } catch (readError) {
      console.error("[PDF Read] Failed to read file:", readError);
      return NextResponse.json(
        { error: "Failed to read file. The file may be corrupted." },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(bytes);

    // Try to parse PDF text using new multi-strategy approach
    let pdfText = "";
    let useVisionMode = false;

    try {
      const result = await parsePDF(buffer);
      pdfText = result.text;
      useVisionMode = result.needsVision;
    } catch (error) {
      logErrorDetails("PDF Parse", error);
      // Last resort: try vision mode
      useVisionMode = true;
    }

    // Check if we have meaningful text - if not, use vision mode
    if (!useVisionMode && (!pdfText || pdfText.trim().length < 50)) {
      console.log("[PDF Parse] Text too short (" + (pdfText?.length || 0) + " chars), using vision mode");
      useVisionMode = true;
    }

    let result: string | undefined;
    let imageBase64List: string[] | undefined;
    let visionFailed = false;

    // Prepare images for vision mode if needed
    if (useVisionMode) {
      try {
        console.log("[PDF Vision] Converting PDF to images...");
        imageBase64List = await convertPDFToImages(buffer);
        console.log(`[PDF Vision] Converted ${imageBase64List.length} pages to JPEG`);
      } catch (error) {
        logErrorDetails("PDF Vision Conversion", error);
        // Vision conversion failed - fall back to text mode with whatever we have
        console.log("[PDF Vision] Conversion failed, falling back to text mode with partial text");
        visionFailed = true;
        useVisionMode = false;
        // If we have at least some text, use it; otherwise we'll try regex one more time
        if (!pdfText || pdfText.length < 20) {
          // Last ditch effort - try to get ANY text
          try {
            const regexResult = await parsePDFWithRegex(buffer);
            pdfText = regexResult.text;
          } catch {
            pdfText = "";
          }
        }
      }
    }

    // Build the prompt with target role if provided
    const rolePrefix = targetRole && targetRole !== "General / Fresher"
      ? `TARGET ROLE: ${targetRole} - Evaluate the resume specifically for this role. Adjust ATS keywords, skills relevance scoring, and feedback accordingly.\n\n`
      : "";

    // Wrap OpenRouter calls in a retry loop for 503 errors
    const maxOpenRouterAttempts = 3;
    const delays = [1000, 2000, 4000];

    for (let attempt = 0; attempt < maxOpenRouterAttempts; attempt++) {
      try {
        if (useVisionMode && imageBase64List) {
          // Vision mode: send converted JPEG images to OpenRouter
          console.log("[OpenRouter] Using vision mode with converted JPEGs, pages:", imageBase64List.length);

          const visionPrompt = rolePrefix + SYSTEM_PROMPT + "\n\n" + VISION_ANALYSIS_PROMPT;

          try {
            const visionResponse = await callOpenRouterWithRetry(
              visionPrompt,
              VISION_MODEL,
              imageBase64List
            );
            result = visionResponse;
          } catch (visionError) {
            logErrorDetails("Vision Model", visionError);

            // If vision model rejected the images, fall back to text mode
            if (isVisionModelError(visionError)) {
              console.log("[OpenRouter] Vision model rejected images, falling back to text mode");
              useVisionMode = false;
              visionFailed = true;

              // Try to extract any text we can find
              if (!pdfText || pdfText.length < 20) {
                try {
                  const regexResult = await parsePDFWithRegex(buffer);
                  pdfText = regexResult.text;
                } catch {
                  pdfText = "";
                }
              }

              // Continue to text mode below
            } else {
              throw visionError;
            }
          }
        }

        // Text mode (either originally or as fallback from vision)
        if (!useVisionMode || visionFailed) {
          // If we have no text at all, we can't proceed
          if (!pdfText || pdfText.trim().length < 10) {
            return NextResponse.json(
              { error: "Bhai, PDF se kuchh text nahi nikla 😵 Scanned/image PDF lag raha hai. Readable digital PDF upload kar!" },
              { status: 400 }
            );
          }

          // Text mode: validate it's a resume first
          if (!looksLikeResume(pdfText)) {
            const randomMessage =
              invalidDocumentMessages[Math.floor(Math.random() * invalidDocumentMessages.length)];
            return NextResponse.json(
              {
                status: "invalid_document",
                message: randomMessage,
                error: "Invalid document uploaded",
              },
              { status: 400 }
            );
          }

          // Truncate very long resumes to avoid token limits
          const truncatedText = pdfText.slice(0, 15000);

          console.log("[OpenRouter] Using text mode with extracted PDF text, length:", truncatedText.length);
          const textPrompt = rolePrefix + SYSTEM_PROMPT + "\n\n" + ANALYSIS_PROMPT(truncatedText);
          const textModels = [TEXT_MODEL, ...TEXT_FALLBACKS];
          let textResult: string | undefined;

          for (const m of textModels) {
            try {
              console.log(`[OpenRouter] Trying text model: ${m}`);
              textResult = await callOpenRouterWithRetry(textPrompt, m);
              console.log(`[OpenRouter] Text model ${m} succeeded`);
              break;
            } catch (err) {
              logErrorDetails(`Text Model ${m}`, err);
              const msg = err instanceof Error ? err.message.toLowerCase() : "";
              const isOverload = msg.includes("503") || msg.includes("429") ||
                msg.includes("overloaded") || msg.includes("rate limit");
              if (isOverload && m !== textModels[textModels.length - 1]) {
                console.log(`[Text] ${m} overloaded, trying next model...`);
                await sleep(1500);
                continue;
              }
              throw err;
            }
          }
          result = textResult;
        }

        // If we get here, the call succeeded - break out of retry loop
        break;
      } catch (error) {
        logErrorDetails(`OpenRouter Handler Attempt ${attempt + 1}`, error);

        // Only retry on 503/overload errors
        if (attempt < maxOpenRouterAttempts - 1 && isOverloadedError(error)) {
          const delay = delays[attempt] || 4000;
          console.log(`[OpenRouter] Handler retrying after ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        // Don't retry on other errors - throw to outer handler
        throw error;
      }
    }

    if (!result) {
      throw new Error("Failed to get OpenRouter response after all retries");
    }

    // Process the response
    try {
      const analysisText = (result as string).trim();

      let cleanedText = analysisText;

      // Remove markdown code block markers if present
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }
      cleanedText = cleanedText.trim();

      // Parse the JSON response
      let analysis;
      try {
        analysis = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Response text:", cleanedText.substring(0, 500));

        // In vision mode, try one more time with a simplified prompt
        if (useVisionMode && imageBase64List && !visionFailed) {
          console.log("[OpenRouter] Vision mode JSON parse failed, attempting simplified retry...");
          try {
            const retryPrompt = rolePrefix + SYSTEM_PROMPT + "\n\n" + VISION_ANALYSIS_PROMPT + "\n\n" + SIMPLIFIED_JSON_PROMPT;
            const retryText = await callOpenRouterWithRetry(
              retryPrompt,
              VISION_MODEL,
              imageBase64List
            );
            let retryCleaned = retryText;
            if (retryCleaned.startsWith("```json")) retryCleaned = retryCleaned.slice(7);
            else if (retryCleaned.startsWith("```")) retryCleaned = retryCleaned.slice(3);
            if (retryCleaned.endsWith("```")) retryCleaned = retryCleaned.slice(0, -3);
            retryCleaned = retryCleaned.trim();

            analysis = JSON.parse(retryCleaned);
            console.log("[OpenRouter] Simplified retry succeeded");
          } catch (retryError) {
            console.error("Simplified retry also failed:", retryError);
            throw new Error("Failed to parse analysis response after retry");
          }
        } else {
          // Try to extract JSON from the response if it added extra text
          // Take the LAST complete JSON object (models sometimes output reasoning first)
          try {
            const jsonMatches = cleanedText.match(/\{[\s\S]*?\}/g);
            if (jsonMatches && jsonMatches.length > 0) {
              // Try each match from last to first
              for (let i = jsonMatches.length - 1; i >= 0; i--) {
                try {
                  analysis = JSON.parse(jsonMatches[i]);
                  console.log("Successfully extracted JSON from response at match", i);
                  break;
                } catch {
                  continue;
                }
              }
              if (!analysis) {
                throw new Error("No valid JSON object found in response");
              }
            } else {
              throw new Error("No JSON object found in response");
            }
          } catch (extractError) {
            console.error("Failed to extract JSON:", extractError);
            return NextResponse.json(
              { error: "Failed to parse analysis response. Please try again." },
              { status: 500 }
            );
          }
        }
      }

      // Check for invalid_document status from model (in vision mode)
      if (analysis.status === "invalid_document") {
        return NextResponse.json(
          {
            status: "invalid_document",
            message: analysis.message || "This doesn't look like a resume. Please upload a valid CV.",
            error: "Invalid document uploaded",
          },
          { status: 400 }
        );
      }

      // Validate the response structure
      // Check if overallScore is present and >= 0 - if so, treat as valid response
      if (typeof analysis.overallScore === "number" && analysis.overallScore >= 0) {
        return NextResponse.json(analysis);
      }

      // If overallScore is missing, check for other essential fields
      if (!analysis.roastHeadline || !analysis.roastQuote) {
        return NextResponse.json(
          { error: "Invalid analysis response structure" },
          { status: 500 }
        );
      }

      // Accept responses even if missingSections is empty or detectedSections has all false values
      // These are valid for bad resumes
      return NextResponse.json(analysis);
    } catch (apiError) {
      console.error("Error processing OpenRouter response:", apiError);
      return NextResponse.json(
        { error: "Analysis failed. Please try again later." },
        { status: 500 }
      );
    }
  } catch (error) {
    logErrorDetails("POST Handler", error);

    // Check for specific error types to show user-friendly messages
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";

    // PDF canvas render failure — pdfjs or @napi-rs/canvas crashed
    if (
      errorMessage.includes("pdf_render_fail") ||
      errorMessage.includes("cannot read properties") ||
      errorMessage.includes("encode") ||
      errorMessage.includes("napi")
    ) {
      return NextResponse.json(
        { error: "Tera PDF render nahi ho raha bhai 😵 Normal digital PDF upload kar, scanned image wala nahi chalega!" },
        { status: 400 }
      );
    }

    // Vision model specifically failed (model returned error about images)
    if (
      errorMessage.includes("image_url") ||
      errorMessage.includes("multimodal") ||
      errorMessage.includes("vision")
    ) {
      return NextResponse.json(
        { error: "Vision model abhi busy hai 😤 Thodi der baad retry kar, ya ek readable PDF try kar!" },
        { status: 503 }
      );
    }

    // Service overload errors - show friendly retry message
    if (
      errorMessage.includes("503") ||
      errorMessage.includes("429") ||
      errorMessage.includes("overloaded") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests") ||
      errorMessage.includes("resource exhausted") ||
      errorMessage.includes("max retries")
    ) {
      return NextResponse.json(
        {
          error: "API busy hai abhi 😤 Thoda wait karo aur retry karo, ya Demo mode try karo",
          retryAfter: 5
        },
        { status: 503 }
      );
    }

    // Generic error - show friendly message in Hinglish
    return NextResponse.json(
      { error: "Yaar kuchh toh gadbad ho gayi 😭 Thodi der baad dubara try karo!" },
      { status: 500 }
    );
  }
}
