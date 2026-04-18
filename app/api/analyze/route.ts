import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT, ANALYSIS_PROMPT, VISION_ANALYSIS_PROMPT, SIMPLIFIED_JSON_PROMPT } from "@/lib/analyzePrompt";

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
}
interface PDFPage {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<TextContent>;
  render: (options: { canvasContext: unknown; viewport: { width: number; height: number } }) => { promise: Promise<void> };
}
interface TextContent { items: TextItem[] }
interface TextItem { str?: string }

if (!process.env.OPENROUTER_API_KEY) {
  console.error("[Startup] OPENROUTER_API_KEY is not set!");
}

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "JhalmuriCV",
  },
});

const TEXT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
const TEXT_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
];
const VISION_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function parsePDFWithPdfjs(buffer: Buffer): Promise<{ text: string }> {
  try {
    const pdfjsLib = await import("pdfjs-dist") as unknown as PdfjsLib;
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
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
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
    if (result.text.length >= 100) return { text: result.text, needsVision: false };
    console.log("[PDF Parse] pdfjs returned insufficient text, trying regex...");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[PDF Parse] pdfjs failed:", msg);
  }
  try {
    const result = await parsePDFWithRegex(buffer);
    if (result.text.length >= 100) return { text: result.text, needsVision: false };
    console.log("[PDF Parse] regex returned insufficient text, falling back to vision");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[PDF Parse] regex failed:", msg);
  }
  return { text: "", needsVision: true };
}

function isOverloadedError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("503") || message.includes("429") ||
      message.includes("overloaded") || message.includes("rate limit") ||
      message.includes("too many requests") || message.includes("resource exhausted") ||
      message.includes("try again later") || message.includes("max retries")
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

async function callOpenRouterWithRetry(
  prompt: string,
  model: string,
  pdfBase64?: string,
  maxRetries = 3
): Promise<string> {
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let messages: OpenAI.Chat.ChatCompletionMessageParam[];

      if (pdfBase64) {
        // Send PDF directly as base64 document to vision model
        // OpenRouter vision models accept image_url with base64 data URIs
        // We send the PDF as a base64 encoded data URI
        messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              } as OpenAI.Chat.ChatCompletionContentPart,
            ],
          },
        ];
      } else {
        messages = [{ role: "user", content: prompt }];
      }

      console.log(`[OpenRouter] Model: ${model}, attempt: ${attempt + 1}, mode: ${pdfBase64 ? "pdf-vision" : "text"}`);

      const completion = await openrouter.chat.completions.create({
        model,
        messages,
        max_tokens: 8192,
        temperature: 0.7,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      if (!responseText) throw new Error("Empty response from OpenRouter");

      console.log(`[OpenRouter] Response length: ${responseText.length}`);
      return responseText;
    } catch (error) {
      logErrorDetails(`OpenRouter attempt ${attempt + 1}`, error);
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
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "Bhai, server ka API key missing hai 😭 Admin se baat kar, ya Demo try karo!" },
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
      console.log("[PDF Parse] Text too short, switching to vision mode");
      useVisionMode = true;
    }

    const rolePrefix = targetRole && targetRole !== "General / Fresher"
      ? `TARGET ROLE: ${targetRole} - Evaluate the resume specifically for this role.\n\n`
      : "";

    let result: string | undefined;

    if (useVisionMode) {
      // Convert buffer to base64 and send directly to vision model
      // No canvas rendering needed — just raw PDF bytes as base64
      const pdfBase64 = buffer.toString("base64");
      console.log(`[Vision] Sending PDF as base64 (${pdfBase64.length} chars) to vision model`);

      const visionPrompt = rolePrefix + SYSTEM_PROMPT + "\n\n" + VISION_ANALYSIS_PROMPT;

      const maxAttempts = 3;
      let visionSucceeded = false;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          result = await callOpenRouterWithRetry(visionPrompt, VISION_MODEL, pdfBase64);
          visionSucceeded = true;
          break;
        } catch (visionError) {
          logErrorDetails(`Vision attempt ${attempt + 1}`, visionError);
          const msg = visionError instanceof Error ? visionError.message.toLowerCase() : "";

          // If vision model rejects the PDF format, fall back to text mode
          if (msg.includes("400") || msg.includes("422") || msg.includes("unsupported") ||
              msg.includes("invalid") || msg.includes("image") || msg.includes("multimodal")) {
            console.log("[Vision] Model rejected PDF, falling back to text mode");
            useVisionMode = false;
            break;
          }

          if (isOverloadedError(visionError) && attempt < maxAttempts - 1) {
            await sleep(2000 * (attempt + 1));
            continue;
          }
          throw visionError;
        }
      }

      // If vision failed and we have no text, this PDF can't be processed
      if (!visionSucceeded && !useVisionMode) {
        if (!pdfText || pdfText.trim().length < 10) {
          return NextResponse.json(
            { error: "Bhai, PDF process nahi ho raha 😵 Ek alag readable PDF try kar!" },
            { status: 400 }
          );
        }
        // Fall through to text mode with whatever text we have
      }
    }

    // Text mode (original path or vision fallback)
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

      const truncatedText = pdfText.slice(0, 15000);
      const textPrompt = rolePrefix + SYSTEM_PROMPT + "\n\n" + ANALYSIS_PROMPT(truncatedText);
      const textModels = [TEXT_MODEL, ...TEXT_FALLBACKS];

      for (const m of textModels) {
        try {
          console.log(`[Text] Trying model: ${m}`);
          result = await callOpenRouterWithRetry(textPrompt, m);
          console.log(`[Text] Model ${m} succeeded`);
          break;
        } catch (err) {
          logErrorDetails(`Text model ${m}`, err);
          const msg = err instanceof Error ? err.message.toLowerCase() : "";
          const isOverload = msg.includes("503") || msg.includes("429") ||
            msg.includes("overloaded") || msg.includes("rate limit");
          if (isOverload && m !== textModels[textModels.length - 1]) {
            console.log(`[Text] ${m} overloaded, trying next...`);
            await sleep(1500);
            continue;
          }
          throw err;
        }
      }
    }

    if (!result) {
      throw new Error("Failed to get response after all attempts");
    }

    // Parse the response
    try {
      let cleanedText = result.trim();
      if (cleanedText.startsWith("```json")) cleanedText = cleanedText.slice(7);
      else if (cleanedText.startsWith("```")) cleanedText = cleanedText.slice(3);
      if (cleanedText.endsWith("```")) cleanedText = cleanedText.slice(0, -3);
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
            const pdfBase64 = buffer.toString("base64");
            const retryPrompt = rolePrefix + SYSTEM_PROMPT + "\n\n" + VISION_ANALYSIS_PROMPT + "\n\n" + SIMPLIFIED_JSON_PROMPT;
            const retryText = await callOpenRouterWithRetry(retryPrompt, VISION_MODEL, pdfBase64);
            let retryCleaned = retryText;
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
          // Try to extract JSON from response
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
        return NextResponse.json(analysis);
      }
      if (!analysis.roastHeadline || !analysis.roastQuote) {
        return NextResponse.json({ error: "Invalid analysis response structure" }, { status: 500 });
      }
      return NextResponse.json(analysis);

    } catch (parseError) {
      console.error("[Parse] Fatal error:", parseError);
      return NextResponse.json({ error: "Analysis failed. Please try again later." }, { status: 500 });
    }

  } catch (error) {
    logErrorDetails("POST Handler", error);
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";

    if (errorMessage.includes("503") || errorMessage.includes("429") ||
        errorMessage.includes("overloaded") || errorMessage.includes("rate limit") ||
        errorMessage.includes("max retries")) {
      return NextResponse.json(
        { error: "API busy hai abhi 😤 Thoda wait karo aur retry karo, ya Demo mode try karo", retryAfter: 5 },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Yaar kuchh toh gadbad ho gayi 😭 Thodi der baad dubara try karo!" },
      { status: 500 }
    );
  }
}