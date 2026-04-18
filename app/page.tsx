
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles, Flame, RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import UploadZone from "@/components/UploadZone";
import LoadingRoast from "@/components/LoadingRoast";
import { ResumeAnalysis } from "@/lib/types";

// Error states for invalid document
interface InvalidDocumentError {
  status: "invalid_document";
  message: string;
}

// Hindi/Hinglish button texts for the modal
const hindiButtonTexts = [
  "Theek hai bhai, asli wali upload karta hun 😭",
  "Sorry yaar, galti ho gayi 🙏",
  "Ek minute, sahi file dhundta hun 💀",
  "Haan haan, resume upload karta hun abhi 🤡",
  "Bhai maaf karo, CV laata hun 😬",
];

// Emojis for the modal
const modalEmojis = ["🤡", "💀"];

// Invalid document messages - randomly selected on client side
const invalidDocumentMessages = [
  "Bhai, ye resume hai? Bijli ka bill upload kar diya kya?",
  "Uploaded document is as irrelevant as your 1st-year engineering syllabus.",
  "Tinder bio de diya kya? Because HR isn't swiping right on this either.",
  "Aadhaar card upload mat kar bhai, job CV pe milti hai.",
  "Kya Matlab? Kuch bhi upload karega?",
  "Bhai ye kya hai? Resume nahi hai toh mat bhej!",
  "Yaar, ye document dekh ke HR ne chai pi li aur window minimize kar di.",
];

// Demo roast headlines (15 options from analyzePrompt.ts)
const demoRoastHeadlines = [
  "Bhai, tera resume dekh ke HR ne chai pi li aur ghost kar diya.",
  "TCS NextStep pe bhi shortlist nahi hoga tera with this CV.",
  "Tera CGPA aur tera impact metrics dono hi 6.5 ke neeche hain.",
  "This resume has more buzzwords than a startup pitch at a tier-3 college fest.",
  "Beta, 'team player' likhna band kar - sabko pata hai tu akela baitha tha dorm room mein.",
  "Your projects section reads like a copy-paste from GeeksForGeeks tutorials.",
  "IIT ka sapna dekh rahe ho? Yeh resume toh local coaching center bhi reject kar dega.",
  "Tera 'proficient in C++ since class 6' - bhai, Turbo C++ chalana seekha hai bas.",
  "Resume dekh ke lagta hai tujhe coding nahi, coding ne trauma diya hai.",
  "FAANG wale tumhe nahi, tumhare resume ko therapy dilayenge.",
  "Is resume se achha toh tera LinkedIn bio hai - aur woh bhi cringe hai.",
  "Naukri.com pe mass apply karte ho na? Isi liye response nahi aata.",
  "Tera resume aur tera attendance dono hi 75% se zyada fake lagte hain.",
  "Bhai, 'worked at startup of 2 people' ko 'Founding Engineer' mat likh.",
  "Hackathon winner? Bhai, college fest mein participation certificate mat dikha.",
];

// Demo roast quotes (10 options from analyzePrompt.ts)
const demoRoastQuotes = [
  "Look, I've seen grocery lists with more compelling narratives than this. You have the ingredients for a great resume, but you're serving them raw. Tera 'proficient in everything' actually means 'master of nothing' - aur yeh sabko dikhta hai except tereko.",
  "Bhai, tu Tier-3 college se hai toh portfolio Tier-1 hona chahiye. Yeh copy-paste job description wala experience kisi ko impress nahi karega. 'Learned a lot' mat likh - kya seekha, kitna seekha, dikha numbers mein.",
  "Tera CGPA 6.5 hai aur resume mein 'hardworking' likha hai? Bhai, yeh oxymoron lag raha hai. Aur yeh 'leadership skills' - class representative banne se leadership nahi aati, projects dikha jisme tu actually lead kiya ho.",
  "This resume screams 'mass hiring candidate' - and not in a good way. TCS/Infosys bhi sochte honge ki isse achha koi aur fresher mil jayega. 'Team player' ke alawa kuchh aur bhi likh de, sab yahi likhte hain.",
  "Ammi-Papa ke sapno ko justify karne ke liye thodi mehnat karta? FAANG wale tere is generic experience se bore ho gaye hain pehle se hi. Kuchh unique kiya hai life mein? Dikha na resume pe!",
  "Yeh resume dekh ke HR sochti hai ki 'kitna package maangega ye?' - aur phir sochti hai 'rejected, bach gaya paise se.' Tere skills section mein MS Office aur HTML dono hai - bhai decide kar, developer hai ya data entry operator?",
  "Tera LinkedIn hustle culture wala bio aur yeh resume match nahi kar raha. LinkedIn pe 'passionate SDE' aur resume pe 3 projects with zero deployed links? At least screenshots toh daal de bhai.",
  "Campus placement mein shortlist nahi hua toh off-campus apply kar raha hai? Strategy same hai, result bhi same hoga. Yeh 'quick learner' wala tagline hata - 4 saal mein itna nahi seekha ki resume theek ban sake.",
  "Beta, tu '3 years experience as fresher' wala meme ban raha hai. Internship ko 'Software Engineer' mat likh, recruiters pakad lete hain jhoot. Aur agar sach mein 3 saal kaam kiya hai, toh achievements kahan hain?",
  "Resume mein ' IIT preparation' likh ke kya prove karna chahta hai? Ki tu drop year mein bhi select nahi hua? Abhi bhi time hai - skills build kar, projects bana, yeh past ki dukh bhari kahani mat suna.",
];

// Demo data for demo mode - defined outside component to avoid re-creation
const demoAnalysis: ResumeAnalysis = {
  overallScore: 73,
  roastHeadline:
    "Bhai, tera resume dekh ke HR ne chai pi li aur ghost kar diya.",
  roastQuote:
    "Look, I've seen grocery lists with more compelling narratives. You have the ingredients for a great resume, but you're serving them raw. Tera 'proficient in everything' actually means 'master of nothing' - aur yeh sabko dikhta hai except tereko.",
  categories: {
    structureCompleteness: {
      score: 16,
      maxScore: 20,
      feedback:
        "Solid foundation with most essential sections present, but missing a compelling summary.",
      issues: [
        "No professional summary or objective statement",
        "Projects section is thin",
      ],
      suggestions: [
        "Add a 2-3 sentence professional summary at the top",
        "Expand projects section with more details",
      ],
    },
    contentQuality: {
      score: 14,
      maxScore: 20,
      feedback:
        "Good start but relies too heavily on buzzwords and generic phrases.",
      issues: [
        "Overuse of 'responsible for' and 'assisted with'",
        "Vague descriptions without specific outcomes",
      ],
      suggestions: [
        "Replace passive voice with active voice",
        "Focus on outcomes, not just tasks",
      ],
    },
    impactMetrics: {
      score: 9,
      maxScore: 15,
      feedback:
        "Some quantified achievements present but could use more numbers.",
      issues: [
        "Only 2 bullet points have quantified results",
        "Missing scale of impact",
      ],
      suggestions: [
        "Add percentages, dollar amounts, or user counts",
        "Show before/after comparisons",
      ],
    },
    languageWriting: {
      score: 7,
      maxScore: 10,
      feedback: "Clean writing with good grammar, but could be more concise.",
      issues: ["Some wordy phrases", "Inconsistent verb tense in experience"],
      suggestions: [
        "Cut 10-20% of words from each bullet",
        "Use present tense for current role, past for previous",
      ],
    },
    formattingReadability: {
      score: 11,
      maxScore: 15,
      feedback: "Clean layout with good visual hierarchy.",
      issues: [
        "Inconsistent spacing between sections",
        "Skills list runs too long",
      ],
      suggestions: [
        "Standardize whitespace",
        "Group skills into categories",
      ],
    },
    atsCompatibility: {
      score: 7,
      maxScore: 10,
      feedback: "Good keyword density but missing some standard terms.",
      issues: [
        "Missing standard ATS keywords",
        "No mention of methodologies used",
      ],
      suggestions: [
        "Add more industry-standard keywords",
        "Include Agile, Scrum, or other methodologies",
      ],
    },
    skillsRelevance: {
      score: 9,
      maxScore: 10,
      feedback:
        "Strong technical skills that align well with current market demands.",
      issues: ["Could mention soft skills more"],
      suggestions: ["Add leadership and communication skills"],
    },
  },
  detectedSections: {
    education: true,
    experience: true,
    skills: true,
    projects: true,
    summary: false,
    certifications: false,
    achievements: true,
  },
  missingSections: ["Professional Summary", "Certifications"],
  atsKeywords: {
    found: ["Python", "React", "Git", "JavaScript", "Node.js", "SQL"],
    missing: ["CI/CD", "Agile", "REST API", "Docker", "AWS"],
    score: 65,
  },
  topStrengths: [
    "Strong technical skill set with modern frameworks",
    "Clear career progression shown",
    "Good educational background with relevant degree",
  ],
  criticalFixes: [
    "Add quantified metrics to ALL experience bullet points",
    "Write a compelling professional summary",
    "Fix verb tense consistency in experience section",
  ],
  actionPlan: [
    {
      priority: "HIGH",
      action:
        "Add quantified metrics to all experience bullet points (%, $, #)",
    },
    {
      priority: "HIGH",
      action:
        "Write a 2-3 sentence professional summary highlighting your unique value",
    },
    {
      priority: "MEDIUM",
      action: "Group skills into categories (Frontend, Backend, Tools)",
    },
    {
      priority: "MEDIUM",
      action: "Add missing ATS keywords: CI/CD, Agile, REST API, Docker",
    },
    {
      priority: "LOW",
      action: "Standardize spacing and formatting throughout",
    },
  ],
};

// Invalid Document Modal Component
interface InvalidDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

function InvalidDocModal({ isOpen, onClose, message }: InvalidDocModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Randomize button text and emoji on each open
  const [buttonText, setButtonText] = useState("");
  const [emoji, setEmoji] = useState("");

  useEffect(() => {
    if (isOpen) {
      setButtonText(hindiButtonTexts[Math.floor(Math.random() * hindiButtonTexts.length)]);
      setEmoji(modalEmojis[Math.floor(Math.random() * modalEmojis.length)]);
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === modalRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <div
            ref={modalRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-4 border-[#1a1a1a] w-full max-w-md mx-4 overflow-hidden relative"
              style={{ boxShadow: "8px 8px 0px #1a1a1a" }}
            >
            {/* Terminal-style header bar */}
            <div className="bg-[#e8441a] px-4 py-3 flex items-center gap-2 border-b-4 border-[#1a1a1a]">
              <div className="w-4 h-4 bg-white border-2 border-[#1a1a1a]" />
              <div className="w-4 h-4 bg-white border-2 border-[#1a1a1a]" />
              <div className="w-4 h-4 bg-white border-2 border-[#1a1a1a]" />
              <span className="ml-auto text-white font-mono font-bold text-sm">
                invalid_cv.exe
              </span>
            </div>

            {/* Modal content */}
            <div className="p-8 text-center">
              {/* Large emoji */}
              <div className="text-8xl mb-6">{emoji}</div>

              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4 font-mono">
                Invalid Document
              </h2>

              <p className="text-lg text-[#1a1a1a] mb-8 italic font-bold">
                &ldquo;{message}&rdquo;
              </p>

              {/* Neo-brutalist button */}
              <motion.button
                whileHover={{
                  x: 2,
                  y: 2,
                  boxShadow: "2px 2px 0px #1a1a1a",
                }}
                whileTap={{
                  x: 4,
                  y: 4,
                  boxShadow: "0px 0px 0px #1a1a1a",
                }}
                onClick={onClose}
                className="w-full px-6 py-4 bg-[#e8441a] text-white font-bold text-lg
                         border-4 border-[#1a1a1a] flex items-center justify-center gap-2"
                style={{ boxShadow: "4px 4px 0px #1a1a1a" }}
              >
                <RotateCcw className="w-5 h-5" />
                {buttonText}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Home() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("General / Fresher");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidDocError, setInvalidDocError] = useState<InvalidDocumentError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Check if error is retryable (API busy/overloaded)
  const isRetryableError = (errMsg: string): boolean => {
    const msg = errMsg.toLowerCase();
    return (
      msg.includes("503") ||
      msg.includes("overloaded") ||
      msg.includes("api busy") ||
      msg.includes("rate limit") ||
      msg.includes("try again")
    );
  };

  // Previous roasts history from localStorage
  const [previousRoasts, setPreviousRoasts] = useState<{ score: number; headline: string; date: string; role: string }[]>([]);

  // Load previous roasts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("previousRoasts");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPreviousRoasts(parsed.slice(0, 3));
        }
      } catch (e) {
        console.error("Failed to parse previous roasts:", e);
      }
    }
  }, []);

  // Save roast to history
  const saveRoastToHistory = (analysis: ResumeAnalysis, role: string) => {
    const newRoast = {
      score: analysis.overallScore,
      headline: analysis.roastHeadline,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      role: role,
    };

    setPreviousRoasts((prev) => {
      const updated = [newRoast, ...prev].slice(0, 3);
      localStorage.setItem("previousRoasts", JSON.stringify(updated));
      return updated;
    });
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setInvalidDocError(null);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    setInvalidDocError(null);
  };

  // handleRetry does the same thing as handleClearFile - reuse it
  const handleRetry = handleClearFile;

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please upload a resume first");
      return;
    }

    setIsLoading(true);
    setError(null);
    setInvalidDocError(null);

    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const formData = new FormData();
      formData.append("resume", selectedFile);
      formData.append("targetRole", targetRole);

      // Add AbortController with 90-second timeout (vision analysis takes longer)
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 90000);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const data = await response.json();

      // Check for invalid document error
      if (data.status === "invalid_document") {
        // Always pick a random message from the client-side array
        const randomMsg = invalidDocumentMessages[
          Math.floor(Math.random() * invalidDocumentMessages.length)
        ];
        setInvalidDocError({
          status: "invalid_document",
          message: randomMsg,
        });
        setIsLoading(false);
        return;
      }

      // Handle other errors
      if (!response.ok) {
        // Use server's error message if available, otherwise generic message
        const serverError = data.error || "Failed to analyze resume";
        throw new Error(serverError);
      }

      // Store analysis in localStorage
      localStorage.setItem("resumeAnalysis", JSON.stringify(data));

      // Trigger confetti if score is high
      if (data.overallScore > 80) {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#22c55e", "#e8441a", "#1a1a1a"],
        });
      }

      // Save to history before navigating
      saveRoastToHistory(data, targetRole);

      setIsLoading(false);
      router.push("/results");
    } catch (err) {
      // Show user-friendly error messages (Hindi/Hinglish)
      let userMessage = "Something went wrong. Please try again.";

      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        const originalMsg = err.message;

        // If server already sent a Hindi/Hinglish message, use it directly
        if (msg.includes("api busy") || msg.includes("tokens khatam") || msg.includes("demo mode") || msg.includes("gadbad") || msg.includes("api key missing")) {
          userMessage = originalMsg;
        } else if (msg.includes("503") || msg.includes("429") || msg.includes("overloaded") || msg.includes("rate limit") || msg.includes("max retries")) {
          userMessage = "Yaar API ke tokens khatam ho gaye 😭 Demo try karo — warna thodi der baad dubara try karo!";
        } else if (msg.includes("timeout") || msg.includes("abort") || msg.includes("signal") || msg.includes("aborted")) {
          userMessage = "Bhai itna bada PDF? Server so gaya. Chota PDF upload kar ya Demo try kar.";
        } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed")) {
          userMessage = "Internet slow hai ya server gone for chai break ☕ Dubara try kar.";
        } else if (msg.includes("json") || msg.includes("parse")) {
          userMessage = "We had trouble reading the response. Please try again.";
        } else if (originalMsg && originalMsg !== "Failed to analyze resume") {
          // Use server error message if available and not the generic fallback
          userMessage = originalMsg;
        }
      }

      setError(userMessage);
      setIsLoading(false);
    } finally {
      // Always clear the timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const handleDemo = async () => {
    setIsLoading(true);

    // Safety timeout: force clear loading state if navigation fails (12 seconds)
    const safetyTimeout = setTimeout(() => {
      console.log("[handleDemo] Safety timeout triggered - forcing loading state reset");
      setIsLoading(false);
    }, 12000);

    try {
      // Randomize overallScore between 45 and 82
      const randomOverallScore = Math.floor(Math.random() * (82 - 45 + 1)) + 45;

      // Calculate scaling factor based on original score of 73
      const scaleFactor = randomOverallScore / 73;

      // Scale category scores proportionally while keeping within bounds
      const scaleScore = (originalScore: number, maxScore: number) => {
        const scaled = Math.round(originalScore * scaleFactor);
        return Math.min(scaled, maxScore);
      };

      const randomizedDemo = {
        ...demoAnalysis,
        overallScore: randomOverallScore,
        roastHeadline: demoRoastHeadlines[Math.floor(Math.random() * demoRoastHeadlines.length)],
        roastQuote: demoRoastQuotes[Math.floor(Math.random() * demoRoastQuotes.length)],
        categories: {
          structureCompleteness: {
            ...demoAnalysis.categories.structureCompleteness,
            score: scaleScore(demoAnalysis.categories.structureCompleteness.score, 20),
          },
          contentQuality: {
            ...demoAnalysis.categories.contentQuality,
            score: scaleScore(demoAnalysis.categories.contentQuality.score, 20),
          },
          impactMetrics: {
            ...demoAnalysis.categories.impactMetrics,
            score: scaleScore(demoAnalysis.categories.impactMetrics.score, 15),
          },
          languageWriting: {
            ...demoAnalysis.categories.languageWriting,
            score: scaleScore(demoAnalysis.categories.languageWriting.score, 10),
          },
          formattingReadability: {
            ...demoAnalysis.categories.formattingReadability,
            score: scaleScore(demoAnalysis.categories.formattingReadability.score, 15),
          },
          atsCompatibility: {
            ...demoAnalysis.categories.atsCompatibility,
            score: scaleScore(demoAnalysis.categories.atsCompatibility.score, 10),
          },
          skillsRelevance: {
            ...demoAnalysis.categories.skillsRelevance,
            score: scaleScore(demoAnalysis.categories.skillsRelevance.score, 10),
          },
        },
      };

      // Store the analysis first
      localStorage.setItem("resumeAnalysis", JSON.stringify(randomizedDemo));

      // Simulate loading delay to show loading messages (6 seconds)
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Navigate WITHOUT clearing loading state - the navigation will unmount the component
      // Calling setIsLoading(false) here causes a flash of the homepage before navigation
      router.push("/results");
      // Note: isLoading remains true - the LoadingRoast component stays visible until navigation
    } finally {
      // Clear the safety timeout if navigation succeeded
      clearTimeout(safetyTimeout);
    }
  };

  return (
    <main className="min-h-screen bg-[#f0ede8] overflow-x-hidden">
      <Navbar />

      {isLoading && <LoadingRoast />}

      {/* Invalid Document Modal */}
      <InvalidDocModal
        isOpen={!!invalidDocError}
        onClose={handleRetry}
        message={invalidDocError?.message || ""}
      />

      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <Hero />

          {/* Upload Section */}
          <div className="mt-12">
            <UploadZone
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onClearFile={handleClearFile}
              targetRole={targetRole}
              onTargetRoleChange={setTargetRole}
              isProcessing={isLoading && !!selectedFile}
            />

            {/* Error Message with Retry Button */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-[#ef4444] text-white font-bold border-3 border-[#1a1a1a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{ boxShadow: "4px 4px 0px #1a1a1a" }}
              >
                <span>{error}</span>
                {isRetryableError(error) && (
                  <motion.button
                    whileHover={{
                      x: 1,
                      y: 1,
                      boxShadow: "1px 1px 0px #1a1a1a",
                    }}
                    whileTap={{
                      x: 2,
                      y: 2,
                      boxShadow: "0px 0px 0px #1a1a1a",
                    }}
                    onClick={() => {
                      setIsRetrying(true);
                      handleAnalyze().finally(() => setIsRetrying(false));
                    }}
                    disabled={isRetrying}
                    className="px-4 py-2 text-sm bg-white text-[#ef4444] font-bold
                             border-3 border-[#1a1a1a] flex items-center gap-2
                             disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ boxShadow: "2px 2px 0px #1a1a1a" }}
                  >
                    {isRetrying ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-4 h-4 border-2 border-[#ef4444] border-t-transparent rounded-full"
                        />
                        Retrying...
                      </>
                    ) : (
                      <>Retry</>
                    )}
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Action Buttons - NEOBRUTALIST */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              {/* Roast My Resume - Primary */}
              <motion.button
                whileHover={{
                  x: 2,
                  y: 2,
                  boxShadow: "2px 2px 0px #1a1a1a",
                }}
                whileTap={{
                  x: 4,
                  y: 4,
                  boxShadow: "0px 0px 0px #1a1a1a",
                }}
                onClick={handleAnalyze}
                disabled={isLoading || !selectedFile}
                className="px-8 py-4 bg-[#e8441a] text-white font-bold text-lg
                         border-4 border-[#1a1a1a] flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: "4px 4px 0px #1a1a1a" }}
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Flame className="w-5 h-5" />
                    Roast My Resume
                  </>
                )}
              </motion.button>

              {/* Try Demo - Secondary */}
              <motion.button
                whileHover={{
                  x: 2,
                  y: 2,
                  boxShadow: "2px 2px 0px #1a1a1a",
                }}
                whileTap={{
                  x: 4,
                  y: 4,
                  boxShadow: "0px 0px 0px #1a1a1a",
                }}
                onClick={handleDemo}
                className="px-8 py-4 bg-white text-[#1a1a1a] font-bold text-lg
                         border-4 border-[#1a1a1a] flex items-center justify-center gap-2"
                style={{ boxShadow: "4px 4px 0px #1a1a1a" }}
              >
                <Sparkles className="w-5 h-5" />
                Try Demo
              </motion.button>
            </div>
          </div>

          {/* Previous Roasts History */}
          {previousRoasts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-16"
            >
              <h3 className="text-lg font-bold text-[#1a1a1a] mb-4 font-mono text-center">
                Previous Roasts
              </h3>
              <div className="flex flex-wrap justify-center gap-4">
                {previousRoasts.map((roast, index) => {
                  // Determine color based on score
                  const getScoreColor = (s: number) => {
                    if (s <= 40) return "#ef4444";
                    if (s <= 70) return "#eab308";
                    return "#22c55e";
                  };
                  const scoreColor = getScoreColor(roast.score);

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white border-4 border-[#1a1a1a] p-3 relative cursor-default"
                      style={{ boxShadow: "4px 4px 0px #1a1a1a" }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Score Badge */}
                        <div
                          className="w-12 h-12 flex items-center justify-center text-white font-bold text-lg border-3 border-[#1a1a1a]"
                          style={{ backgroundColor: scoreColor }}
                        >
                          {roast.score}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-xs text-[#6b6b6b] font-mono">
                            {roast.role}
                          </p>
                          <p className="text-xs text-[#6b6b6b] font-mono mt-0.5">
                            {roast.date}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Marquee Strip - Fixed: removed redundant motion.div wrapper */}
          <div className="mt-20 overflow-hidden relative border-y-2 border-[#1a1a1a] py-4 bg-white group">
            <div
              className="flex whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused]"
              style={{ fontFamily: "var(--font-space-mono), monospace" }}
            >
              {Array(2)
                .fill(null)
                .map((_, setIndex) => (
                  <div key={setIndex} className="flex items-center">
                    {[
                      "ANALYZE",
                      "SCORE",
                      "IMPROVE",
                      "ROAST",
                      "ANALYZE",
                      "SCORE",
                      "IMPROVE",
                      "ROAST",
                    ].map((text, i) => (
                      <span
                        key={i}
                        className="text-[#e8441a] text-lg sm:text-xl md:text-2xl font-mono mx-4 sm:mx-6 font-bold"
                      >
                        {text}
                        <span className="text-[#1a1a1a] mx-4 sm:mx-6">•</span>
                      </span>
                    ))}
                  </div>
                ))}
            </div>
          </div>

          {/* Footer Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-16 text-center"
          >
            <a
              href="https://linktr.ee/_chironnnn_"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1a1a1a] font-bold font-mono text-sm border-3 border-[#1a1a1a] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
              style={{ boxShadow: "4px 4px 0px #1a1a1a" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "2px 2px 0px #1a1a1a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "4px 4px 0px #1a1a1a";
              }}
            >
              Built by CHIRON 🔥
            </a>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
