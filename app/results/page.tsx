"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Share2,
  Copy,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ScoreGauge from "@/components/ScoreGauge";
import CategoryCard from "@/components/CategoryCard";
import ATSChecker from "@/components/ATSChecker";
import FeedbackSection from "@/components/FeedbackSection";
import ReportDownload from "@/components/ReportDownload";
import { ResumeAnalysis, CategoryKey, sectionLabels, getScoreReaction } from "@/lib/types";

// Toast notification component
interface ToastProps {
  message: string;
  subMessage?: string;
  isVisible: boolean;
  onClose: () => void;
}

function Toast({ message, subMessage, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none"
        >
          <div
            className="bg-white px-6 py-4 pointer-events-auto mx-4 border-4 border-green-600"
            style={{ boxShadow: '4px 4px 0px #22c55e' }}
          >
            <p className="text-[#1a1a1a] font-bold text-center">{message}</p>
            {subMessage && (
              <p className="text-sm text-[#6b6b6b] text-center mt-1 font-medium">{subMessage}</p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reactionSeed] = useState(() => {
    if (typeof window === 'undefined') return 0.5;
    try {
      const stored = localStorage.getItem('resumeAnalysis');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return (parsed.overallScore ?? 50) / 100;
        } catch {
          return 0.5;
        }
      }
    } catch {
      return 0.5;
    }
    return 0.5;
  });

  useEffect(() => {
    // Get analysis from localStorage
    const stored = localStorage.getItem("resumeAnalysis");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAnalysis(parsed);

        // Trigger confetti for high scores (85+) - delayed to let page load first
        if (parsed.overallScore >= 85) {
          setTimeout(async () => {
            const confetti = (await import("canvas-confetti")).default;
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ["#22c55e", "#e8441a", "#1a1a1a", "#eab308"],
            });
          }, 1000);
        }
      } catch (e) {
        console.error("Failed to parse analysis from localStorage:", e);
        setIsLoading(false);
        router.push("/");
        return;
      }
    } else {
      console.error("No analysis found in localStorage, redirecting to home");
      setIsLoading(false);
      router.push("/");
      return;
    }
    setIsLoading(false);
  }, [router]);

  const handleShare = async () => {
    if (!analysis) return;

    const shareText = `I just got roasted by AI — scored ${analysis.overallScore}/100. Apparently my resume is "${analysis.roastHeadline}". Check yours at ${typeof window !== "undefined" ? window.location.origin : ""} 🔥`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setShowToast(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for HTTP or clipboard API failure
      window.prompt("Copy this:", shareText);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f0ede8] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-[#1a1a1a] border-t-[#e8441a] rounded-full mx-auto mb-4"
          />
          <p className="text-[#1a1a1a] font-bold">Loading results...</p>
        </div>
      </main>
    );
  }

  if (!analysis) {
    return null; // Will redirect
  }

  const categoryEntries = Object.entries(
    analysis.categories
  ) as [CategoryKey, ResumeAnalysis["categories"][CategoryKey]][];

  const scoreReaction = getScoreReaction(analysis.overallScore, reactionSeed);

  return (
    <div style={{ minHeight: '100vh', height: 'fit-content', overflow: 'hidden' }}>
      <Navbar />

      <main className="min-h-screen bg-[#f0ede8] overflow-x-hidden pt-8">
        <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto flex flex-col gap-16 overflow-hidden">
            {/* Section 1: Roast Header */}
            <section className="text-center">
              {/* Score Gauge - Fixed spacing with py-12 */}
              <div className="py-12 flex justify-center overflow-visible">
                <ScoreGauge score={analysis.overallScore} showLabel={false} />
              </div>

              {/* Overall Score label */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg font-bold text-[#1a1a1a] mb-6"
              >
                Overall Score
              </motion.p>

              {/* Score Reaction Badge - Neo-brutalist pill */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center mb-10 px-2"
              >
                <div
                  className={`inline-flex flex-col sm:flex-row items-center gap-3 px-8 py-5 bg-white border-4 border-[#1a1a1a] font-mono font-bold text-xl sm:text-2xl
                    hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_#1a1a1a] transition-all duration-100 cursor-pointer justify-center text-center`}
                  style={{
                    boxShadow: '6px 6px 0px #1a1a1a',
                    borderColor: analysis.overallScore >= 70 ? '#22c55e' :
                      analysis.overallScore >= 50 ? '#eab308' : '#ef4444'
                  }}
                >
                  <span className="text-3xl leading-none">{scoreReaction.emoji}</span>
                  <span style={{ color: scoreReaction.color }} className="leading-snug">
                    {scoreReaction.text}
                  </span>
                </div>
              </motion.div>

              {/* Roast Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-12 px-2"
              >
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-[#e8441a] leading-snug sm:leading-snug md:leading-tight">
                  &ldquo;{analysis.roastHeadline}&rdquo;
                </h1>
              </motion.div>

              {/* Roast Quote Card - Neo-brutalist with hover */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-2xl mx-auto"
              >
                <div
                  className="bg-white border-4 border-[#1a1a1a] p-6 sm:p-8
                    hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#1a1a1a]
                    transition-all duration-100 cursor-default"
                  style={{ boxShadow: '6px 6px 0px #1a1a1a', borderLeft: '4px solid #e8441a' }}
                >
                  <p className="text-lg text-[#1a1a1a] italic font-medium">
                    &ldquo;{analysis.roastQuote}&rdquo;
                    <span className="inline-block w-2 h-6 bg-[#e8441a] ml-1 animate-blink-cursor" />
                  </p>
                </div>
              </motion.div>
            </section>

            {/* Section 2: Score Breakdown */}
            <section>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-8"
              >

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-syne text-[#1a1a1a] tracking-tight">Score Breakdown</h2>
                <p className="text-[#1a1a1a] mt-1 font-medium">Detailed analysis across 7 key dimensions</p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryEntries.map(([key, data], index) => (
                  <CategoryCard
                    key={key}
                    categoryKey={key}
                    data={data}
                    index={index}
                  />
                ))}
              </div>
            </section>

            {/* Section 3: Section Detection */}
            <section>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-8"
              >

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-syne text-[#1a1a1a] tracking-tight">Section Detection</h2>
                <p className="text-[#1a1a1a] mt-1 font-medium">Which sections we found in your resume</p>
              </motion.div>

              <div className="bg-white border-4 border-[#1a1a1a] p-6 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#1a1a1a] transition-all duration-100 cursor-default"
                style={{ boxShadow: '4px 4px 0px #1a1a1a' }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                  {Object.entries(analysis.detectedSections).map(
                    ([section, detected], index) => (
                      <motion.div
                        key={section}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex flex-col items-center gap-2 p-4 border-3
                          transition-all duration-100 cursor-default
                          ${detected
                            ? "bg-green-100 border-green-600 hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#16a34a]"
                            : "bg-[#e8e4df] border-[#1a1a1a] hover:translate-y-[-2px] hover:shadow-[3px_3px_0px_#1a1a1a]"
                          }`}
                      >
                        {detected ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500" />
                        )}
                        <span
                          className={`text-sm text-center font-bold ${detected ? "text-[#1a1a1a]" : "text-[#6b6b6b]"
                            }`}
                        >
                          {
                            sectionLabels[
                            section as keyof typeof sectionLabels
                            ]
                          }
                        </span>
                      </motion.div>
                    )
                  )}
                </div>

                {/* Missing Sections Warning */}
                {analysis.missingSections.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 flex items-center gap-3 p-4 bg-yellow-100 border-3 border-yellow-600"
                    style={{ boxShadow: '3px 3px 0px #eab308' }}
                  >
                    <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-yellow-800">
                        Missing Important Sections:
                      </p>
                      <p className="text-sm text-[#1a1a1a] font-medium">
                        {analysis.missingSections.join(", ")}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </section>

            {/* Section 4: ATS Compatibility */}
            <section>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-8"
              >

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-syne text-[#1a1a1a] tracking-tight">ATS Compatibility</h2>
                <p className="text-[#1a1a1a] mt-1 font-medium">How well your resume performs with Applicant Tracking Systems</p>
              </motion.div>

              <ATSChecker data={analysis.atsKeywords} />
            </section>

            {/* Section 5: Strengths vs Critical Fixes */}
            <section>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-8"
              >

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-syne text-[#1a1a1a] tracking-tight">The Good vs The Ugly</h2>
              </motion.div>

              <FeedbackSection
                strengths={analysis.topStrengths}
                criticalFixes={analysis.criticalFixes}
              />
            </section>

            {/* Section 6: Action Plan */}
            <section>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-8"
              >

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-syne text-[#1a1a1a] tracking-tight">Your Action Plan</h2>
                <p className="text-[#1a1a1a] mt-1 font-medium">Prioritized steps to improve your resume</p>
              </motion.div>

              <div className="bg-white border-4 border-[#1a1a1a] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#1a1a1a] transition-all duration-100 cursor-default"
                style={{ boxShadow: '4px 4px 0px #1a1a1a' }}
              >
                {analysis.actionPlan.map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 py-4 px-4
                             transition-colors duration-100 hover:bg-[#f0ede8] relative group
                             ${index !== analysis.actionPlan.length - 1 ? 'border-b-3 border-[#1a1a1a]' : ''}`}
                  >
                    {/* Left accent stripe on hover */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e8441a] transform scale-y-0 group-hover:scale-y-100 transition-transform duration-100 origin-top" />
                    <span className="font-mono text-[#1a1a1a] text-sm w-8 font-bold">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs font-bold uppercase border-2 ${action.priority === "HIGH"
                        ? "bg-red-500 text-white border-red-700"
                        : action.priority === "MEDIUM"
                          ? "bg-yellow-500 text-black border-yellow-700"
                          : "bg-[#e8441a] text-white border-[#d63b14]"
                        }`}
                    >
                      {action.priority}
                    </span>
                    <span className="text-[#1a1a1a] flex-1 min-w-0 break-words font-medium">{action.action}</span>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Section 7: Download Report & Share */}
            <section className="text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white border-4 border-[#1a1a1a] py-12 px-4 sm:px-8
                  hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_#1a1a1a]
                  transition-all duration-100 cursor-default"
                style={{ boxShadow: '6px 6px 0px #1a1a1a' }}
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1a1a1a] mb-6 tracking-tight">
                  Ready to make your resume fire? 🔥
                </h2>
                <p className="text-[#1a1a1a] mb-8 max-w-lg mx-auto font-medium">
                  Download your complete roast report and start implementing these
                  improvements today.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <ReportDownload analysis={analysis} />

                  {/* Share Roast Button */}
                  <motion.button
                    whileHover={{
                      x: 2,
                      y: 2,
                      boxShadow: '2px 2px 0px #1a1a1a'
                    }}
                    whileTap={{
                      x: 4,
                      y: 4,
                      boxShadow: '0px 0px 0px #1a1a1a'
                    }}
                    onClick={handleShare}
                    className="px-8 py-4 bg-white text-[#1a1a1a] font-bold text-lg
                             border-4 border-[#1a1a1a] flex items-center justify-center gap-2"
                    style={{ boxShadow: '4px 4px 0px #1a1a1a' }}
                  >
                    {copied ? (
                      <>
                        <Copy className="w-5 h-5 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" />
                        Share My Roast 🔥
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </section>
          </div>
        </div>

        {/* Toast Notification */}
        <Toast
          message="Copied to clipboard!"
          subMessage="Ab share karo sharam ke saath 😂"
          isVisible={showToast}
          onClose={() => setShowToast(false)}
        />

        {/* Footer - Built by Chiron */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="py-12 text-center"
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
      </main>
    </div>
  );
}
