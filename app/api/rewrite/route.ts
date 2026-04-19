import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function callGeminiWithMultiKeyFallback(
  prompt: string
): Promise<string> {
  const apiKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];

  if (apiKeys.length === 0) {
    throw new Error("No Gemini API keys configured");
  }

  const MAX_RETRIES_PER_KEY = 2;
  const RETRY_DELAYS = [500, 1000];

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    const keySuffix = apiKey.slice(-4);

    for (let attempt = 0; attempt <= MAX_RETRIES_PER_KEY; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (!text || text.trim().length === 0) {
          throw new Error("Empty response from Gemini");
        }

        return text;
      } catch (error) {
        logErrorDetails(`Gemini key ${keyIndex + 1} attempt ${attempt + 1}`, error);

        if (isRateLimitError(error)) {
          console.warn(`[Gemini] Key ...${keySuffix} hit rate limit on attempt ${attempt + 1}`);

          if (attempt < MAX_RETRIES_PER_KEY) {
            const delay = RETRY_DELAYS[attempt];
            await sleep(delay);
            continue;
          }

          if (keyIndex < apiKeys.length - 1) {
            await sleep(500);
          }
          break;
        } else {
          console.error(`[Gemini] Non-retryable error with key ...${keySuffix}:`, error instanceof Error ? error.message : error);
          throw error;
        }
      }
    }
  }

  throw new Error("All Gemini API keys failed due to rate limits or quotas");
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY_1) {
      return NextResponse.json(
        { error: "Server API key missing." },
        { status: 500 }
      );
    }

    const { bullet, role } = await request.json();

    if (!bullet) {
      return NextResponse.json({ error: "No bullet provided" }, { status: 400 });
    }

    const prompt = `
First check if this input is a valid resume bullet point or work experience description. If it is gibberish, random characters, too vague, a single meaningless word, or clearly not resume content, return ONLY this JSON:
{ "status": "invalid" }

If it IS valid resume content, then you are an expert ATS resume writer and recruiter. The user wants to rewrite a weak or poorly written resume bullet point to be more professional, ATS-friendly, and impactful.
${role ? `Their target role is: ${role}. Tailor the rewrite to highlight skills relevant to this role if possible.` : ""}

Here is the original bullet:
"${bullet}"

Please rewrite this bullet point to be strong, quantified, action-oriented, and impactful.
CRITICAL INSTRUCTION: USE PLACEHOLDER METRICS like [X%] or [N users] since real numbers aren't known. DO NOT invent arbitrary fake numbers, always use bracketed placeholders.

Return this JSON:
{
  "status": "success",
  "rewritten": "The new, highly improved bullet with bracketed placeholders",
  "tip": "A short, 1-2 sentence tip on why this is better or what they should add"
}
`;

    const result = await callGeminiWithMultiKeyFallback(prompt);

    let cleanedText = result.trim();
    if (cleanedText.startsWith("\`\`\`json")) cleanedText = cleanedText.slice(7);
    else if (cleanedText.startsWith("\`\`\`")) cleanedText = cleanedText.slice(3);
    if (cleanedText.endsWith("\`\`\`")) cleanedText = cleanedText.slice(0, -3);
    cleanedText = cleanedText.trim();

    const data = JSON.parse(cleanedText);
    
    if (data.status === "invalid") {
      return NextResponse.json({ status: "invalid" }, { status: 422 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (isRateLimitError(error) || (error instanceof Error && error.message.toLowerCase().includes("all gemini api keys failed"))) {
      return NextResponse.json(
        { status: "quota_exceeded" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: "error" },
      { status: 500 }
    );
  }
}
