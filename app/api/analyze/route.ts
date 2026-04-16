import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from "@/lib/analyzePrompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

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
  ];

  const textLower = text.toLowerCase();
  const keywordCount = resumeKeywords.filter((kw) =>
    textLower.includes(kw)
  ).length;

  // If less than 3 resume keywords found, likely not a resume
  // Also check for minimum length
  return keywordCount >= 3 && text.length > 300;
}

// Pool of invalid document messages
const invalidDocumentMessages = [
  "Bhai, ye resume hai? Bijli ka bill upload kar diya kya?",
  "Uploaded document is as irrelevant as your 1st-year engineering syllabus.",
  "Did you just upload your Tinder bio? Because HR isn't swiping right on this either.",
  "Aadhaar card upload mat kar bhai, job CV pe milti hai.",
  "System confused: Is this a resume or a grocery list? Go back and upload a real CV.",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse PDF text
    let pdfText: string;
    try {
      const data = await pdfParse(buffer);
      pdfText = data.text;
    } catch (parseError) {
      console.error("PDF parsing error:", parseError);
      return NextResponse.json(
        { error: "Could not read PDF. Make sure it's not image-only or corrupted." },
        { status: 400 }
      );
    }

    // Check if we have meaningful text
    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json(
        { error: "PDF contains too little text. It may be image-based or scanned." },
        { status: 400 }
      );
    }

    // Validate that this looks like a resume
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

    // Call Claude API
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: ANALYSIS_PROMPT(truncatedText),
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude API");
      }

      let analysisText = content.text.trim();

      // Remove markdown code block markers if present
      if (analysisText.startsWith("```json")) {
        analysisText = analysisText.slice(7);
      } else if (analysisText.startsWith("```")) {
        analysisText = analysisText.slice(3);
      }
      if (analysisText.endsWith("```")) {
        analysisText = analysisText.slice(0, -3);
      }
      analysisText = analysisText.trim();

      // Parse the JSON response
      let analysis;
      try {
        analysis = JSON.parse(analysisText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Response text:", analysisText.substring(0, 500));

        // Try to extract JSON from the response if Claude added extra text
        try {
          const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analysis = JSON.parse(jsonMatch[0]);
            console.log("Successfully extracted JSON from response");
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

      // Validate the response structure
      if (!analysis.overallScore && analysis.overallScore !== 0) {
        return NextResponse.json(
          { error: "Invalid analysis response structure" },
          { status: 500 }
        );
      }

      return NextResponse.json(analysis);
    } catch (apiError) {
      console.error("Claude API error:", apiError);
      return NextResponse.json(
        { error: "Analysis failed. Please try again later." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
