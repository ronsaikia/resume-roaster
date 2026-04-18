"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, RotateCcw } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ResumeAnalysis } from "@/lib/types";

interface ReportDownloadProps {
  analysis: ResumeAnalysis;
}

export default function ReportDownload({ analysis }: ReportDownloadProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!reportRef.current) return;

    setIsGenerating(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#f0ede8",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save("resume-roast-report.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("resumeAnalysis");
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      {/* Download Button - Primary */}
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
        onClick={handleDownload}
        disabled={isGenerating}
        className="px-8 py-4 bg-[#e8441a] text-white font-bold text-lg
                 border-4 border-[#1a1a1a] flex items-center justify-center gap-2
                 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ boxShadow: '4px 4px 0px #1a1a1a' }}
      >
        {isGenerating ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Download Roast Report
          </>
        )}
      </motion.button>

      {/* Reset Button - Secondary */}
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
        onClick={handleReset}
        className="px-8 py-4 bg-white text-[#1a1a1a] font-bold text-lg
                 border-4 border-[#1a1a1a] flex items-center justify-center gap-2"
        style={{ boxShadow: '4px 4px 0px #1a1a1a' }}
      >
        <RotateCcw className="w-5 h-5" />
        Roast Another Resume
      </motion.button>

      {/* Hidden report container for PDF generation - light theme */}
      <div
        ref={reportRef}
        className="w-[800px] p-8 bg-[#f0ede8]"
        style={{ position: "absolute", left: "-9999px" }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1a1a1a] mb-2">Resume Roast Report</h1>
          <p className="text-[#1a1a1a] font-medium">AI-Powered Resume Analysis</p>
        </div>

        <div className="space-y-6">
          {/* Overall Score */}
          <div className="text-center border-4 border-[#1a1a1a] p-4 bg-white">
            <h2 className="text-xl font-bold text-[#1a1a1a]">Overall Score: {analysis.overallScore}/100</h2>
          </div>

          {/* Roast */}
          <div className="bg-white p-4 border-4 border-[#1a1a1a]">
            <h3 className="text-lg font-bold text-[#e8441a] mb-2">{analysis.roastHeadline}</h3>
            <p className="text-[#1a1a1a] font-medium">{analysis.roastQuote}</p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Category Scores</h3>
            <div className="space-y-2">
              {Object.entries(analysis.categories).map(([key, cat]) => (
                <div key={key} className="flex justify-between items-center border-2 border-[#1a1a1a] p-2 bg-white">
                  <span className="text-[#1a1a1a] font-medium">{key}</span>
                  <span className="text-[#1a1a1a] font-mono font-bold">{cat.score}/{cat.maxScore}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <h3 className="text-lg font-bold text-green-600 mb-2">Top Strengths</h3>
            <ul className="list-disc pl-5 text-[#1a1a1a] font-medium">
              {analysis.topStrengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Critical Fixes */}
          <div>
            <h3 className="text-lg font-bold text-red-600 mb-2">Critical Fixes</h3>
            <ul className="list-disc pl-5 text-[#1a1a1a] font-medium">
              {analysis.criticalFixes.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>

          {/* Action Plan */}
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Action Plan</h3>
            <div className="space-y-2">
              {analysis.actionPlan.map((action, i) => (
                <div key={i} className="flex items-center gap-2 border-2 border-[#1a1a1a] p-2 bg-white">
                  <span className={`px-2 py-0.5 text-xs font-bold border-2 ${
                    action.priority === "HIGH" ? "bg-red-500 text-white border-red-700" :
                    action.priority === "MEDIUM" ? "bg-yellow-500 text-black border-yellow-700" :
                    "bg-[#e8441a] text-white border-[#d63b14]"
                  }`}>
                    {action.priority}
                  </span>
                  <span className="text-[#1a1a1a] font-medium">{action.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
