"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertCircle, Lightbulb, ArrowRight } from "lucide-react";
import { CategoryScore, CategoryKey } from "@/lib/types";
import { categoryLabels } from "@/lib/types";

interface CategoryCardProps {
  categoryKey: CategoryKey;
  data: CategoryScore;
  index: number;
}

function CategoryCard({
  categoryKey,
  data,
  index,
}: CategoryCardProps) {
  // Each card has completely isolated state
  const [isExpanded, setIsExpanded] = useState(false);

  const percentage = (data.score / data.maxScore) * 100;
  const label = categoryLabels[categoryKey];

  // Handle click with stopPropagation and preventDefault to prevent event bubbling
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  // Color based on percentage
  const getColor = (p: number): { bg: string; text: string; border: string } => {
    if (p >= 80)
      return {
        bg: "bg-green-500",
        text: "text-green-600",
        border: "border-green-600",
      };
    if (p >= 50)
      return {
        bg: "bg-yellow-500",
        text: "text-yellow-600",
        border: "border-yellow-500",
      };
    return {
      bg: "bg-red-500",
      text: "text-red-600",
      border: "border-red-600",
    };
  };

  const colors = getColor(percentage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white border-4 border-[#1a1a1a] p-6 cursor-pointer
        hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#1a1a1a]
        transition-all duration-100"
      style={{ boxShadow: '4px 4px 0px #1a1a1a' }}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-lg tracking-tight text-[#1a1a1a]">{label.title}</h3>
        </div>

        {/* Score fraction - RIGHT aligned, large */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`font-mono font-bold text-2xl ${colors.text}`}>
            {data.score}/{data.maxScore}
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-[#1a1a1a]" />
          </motion.div>
        </div>
      </div>

      {/* Progress Bar - neo-brutalist */}
      <div className="h-3 bg-[#e8e4df] overflow-hidden border-2 border-[#1a1a1a] mb-3">
        <motion.div
          className={`h-full ${colors.bg}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
        />
      </div>

      {/* Feedback - Shows Hinglish subtitle by default */}
      <p className="text-sm text-[#e8441a] font-bold italic">{label.subtitle}</p>

      {/* Expanded Content - Use categoryKey as unique key for AnimatePresence */}
      <AnimatePresence key={`${categoryKey}-presence`}>
        {isExpanded && (
          <motion.div
            key={`${categoryKey}-expanded`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4 border-t-3 border-[#1a1a1a] mt-4">
              {/* Original Feedback - shown when expanded */}
              <div className="bg-[#f0ede8] p-3 border-2 border-[#1a1a1a]">
                <p className="text-sm text-[#1a1a1a] font-medium">{data.feedback}</p>
              </div>

              {/* Issues */}
              {data.issues.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-bold text-red-600">
                      Issues
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {data.issues.map((issue, i) => (
                      <li
                        key={i}
                        className="text-sm text-[#1a1a1a] flex items-start gap-2 font-medium"
                      >
                        <ArrowRight className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {data.suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-[#e8441a]" />
                    <span className="text-sm font-bold text-[#e8441a]">
                      Suggestions
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {data.suggestions.map((suggestion, i) => (
                      <li
                        key={i}
                        className="text-sm text-[#1a1a1a] flex items-start gap-2 font-medium"
                      >
                        <ArrowRight className="w-4 h-4 text-[#e8441a] flex-shrink-0 mt-0.5" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(CategoryCard);
