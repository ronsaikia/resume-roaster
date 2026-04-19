"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, RotateCcw } from "lucide-react";
import jsPDF from "jspdf";
import { ResumeAnalysis, CategoryKey, categoryLabels } from "@/lib/types";

interface ReportDownloadProps {
  analysis: ResumeAnalysis;
}

export default function ReportDownload({ analysis }: ReportDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = 20;

      const checkPageBreak = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
      };

      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return lines.length * lineHeight;
      };

      const generateFaviconPng = async (): Promise<string | null> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);
            ctx.drawImage(img, 0, 0, 64, 64);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = () => resolve(null);
          // Try to load favicon, could be .ico or .svg
          img.src = "/favicon.svg"; 
        });
      };

      const generateScoreGaugePng = (score: number): string | null => {
        const canvas = document.createElement("canvas");
        const size = 200;
        const strokeWidth = 12;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        
        const radius = (size - strokeWidth) / 2;
        const cx = size / 2;
        const cy = size / 2;
        
        let color = "#ef4444"; // Red
        if (score >= 70) color = "#22c55e"; // Green
        else if (score >= 50) color = "#eab308"; // Yellow
        
        // Draw background circle
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = "#e8e4df";
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
        
        // Draw progress arc
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (score / 100) * (2 * Math.PI);
        ctx.beginPath();
        // If score is 0, don't draw overlapping arc or just draw a tiny dot
        if (score > 0) {
          ctx.arc(cx, cy, radius, startAngle, endAngle);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.stroke();
        
        return canvas.toDataURL("image/png");
      };

      try {
        const faviconData = await generateFaviconPng();
        if (faviconData) {
          doc.addImage(faviconData, "PNG", margin, yPos - 8, 10, 10);
        }
      } catch (e) {
         // ignore
      }

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(26, 26, 26); // #1a1a1a
      doc.text("JhalmuriCV", margin + 12, yPos);
      const titleWidth = doc.getTextWidth("JhalmuriCV");
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("— Resume Report", margin + 12 + titleWidth + 3, yPos);
      yPos += 25;

      // Overall Score
      const gaugeData = generateScoreGaugePng(analysis.overallScore);
      if (gaugeData) {
        doc.addImage(gaugeData, "PNG", pageWidth / 2 - 20, yPos - 10, 40, 40);
      } else {
        // Fallback
        doc.setDrawColor(239, 68, 68);
        doc.setLineWidth(2);
        doc.circle(pageWidth / 2, yPos + 10, 18, "S");
      }
      
      doc.setTextColor(26, 26, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`${analysis.overallScore}`, pageWidth / 2, yPos + 9, { align: "center", baseline: "middle" });
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Score", pageWidth / 2, yPos + 15, { align: "center", baseline: "middle" });
      yPos += 45;

      // Roast Headline
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(232, 68, 26); // #e8441a
      yPos += addWrappedText(`"${analysis.roastHeadline}"`, margin, yPos, pageWidth - 2 * margin, 9);
      yPos += 8;

      // Roast Quote
      doc.setFont("helvetica", "italic");
      doc.setFontSize(14);
      doc.setTextColor(26, 26, 26);
      yPos += addWrappedText(`"${analysis.roastQuote}"`, margin, yPos, pageWidth - 2 * margin, 7);
      yPos += 20;

      // Category Scores
      checkPageBreak(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Category Scores", margin, yPos);
      yPos += 12;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      Object.entries(analysis.categories).forEach(([key, cat]) => {
        const title = categoryLabels[key as CategoryKey]?.title || key;
        
        checkPageBreak(20);
        doc.setDrawColor(26, 26, 26);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 12);
        doc.setFont("helvetica", "normal");
        doc.text(title, margin + 5, yPos + 8);
        doc.setFont("helvetica", "bold");
        doc.text(`${cat.score}/${cat.maxScore}`, pageWidth - margin - 15, yPos + 8);
        yPos += 16;
      });
      yPos += 10;

      // Strengths
      checkPageBreak(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(34, 197, 94); // green-600
      doc.text("Top Strengths", margin, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(26, 26, 26);
      doc.setFont("helvetica", "normal");
      analysis.topStrengths.forEach((s) => {
        checkPageBreak(25);
        doc.text("•", margin, yPos);
        const textHeight = addWrappedText(s, margin + 6, yPos, pageWidth - 2 * margin - 6, 6);
        yPos += textHeight + 6;
      });
      yPos += 10;

      // Critical Fixes
      checkPageBreak(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(220, 38, 38); // red-600
      doc.text("Critical Fixes", margin, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.setTextColor(26, 26, 26);
      doc.setFont("helvetica", "normal");
      analysis.criticalFixes.forEach((f) => {
        checkPageBreak(25);
        doc.text("•", margin, yPos);
        const textHeight = addWrappedText(f, margin + 6, yPos, pageWidth - 2 * margin - 6, 6);
        yPos += textHeight + 6;
      });
      yPos += 10;

      // Action Plan
      checkPageBreak(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(26, 26, 26);
      doc.text("Action Plan", margin, yPos);
      yPos += 10;

      analysis.actionPlan.forEach((action) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const textLines = doc.splitTextToSize(action.action, pageWidth - margin - 50);
        const boxHeight = Math.max(14, textLines.length * 6 + 6);

        checkPageBreak(boxHeight + 10);

        // Border
        doc.setDrawColor(26, 26, 26);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos, pageWidth - 2 * margin, boxHeight);

        // Priority Badge Box
        let badgeColor = [232, 68, 26] as [number, number, number]; // Low
        if (action.priority === "HIGH") badgeColor = [239, 68, 68]; // Red
        if (action.priority === "MEDIUM") badgeColor = [234, 179, 8]; // Yellow

        doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
        doc.rect(margin + 2, yPos + 2, 22, 10, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        if (action.priority === "MEDIUM") {
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setTextColor(255, 255, 255);
        }
        doc.text(action.priority, margin + 13, yPos + 8.5, { align: "center", baseline: "middle" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(26, 26, 26);
        doc.text(textLines, margin + 28, yPos + 7.5);

        yPos += boxHeight + 6;
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated by JhalmuriCV - ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center", baseline: "middle" });
      }

      doc.save("resume-roast-report.pdf");
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
    </div>
  );
}
