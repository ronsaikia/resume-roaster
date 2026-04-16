"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertCircle, Lightbulb, ArrowRight } from "lucide-react";
import { CategoryScore, CategoryKey } from "@/lib/types";
import { categoryLabels } from "@/lib/types";

interface CategoryCardProps {
  categoryKey: CategoryKey;
  data: CategoryScore;
  index: number;
}

export default function CategoryCard({
  categoryKey,
  data,
  index,
}: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const percentage = (data.score / data.maxScore) * 100;
  const label = categoryLabels[categoryKey];

  // Color based on percentage
  const getColor = (p: number): { bg: string; text: string; border: string } => {
    if (p >= 80)
      return {
        bg: "bg-green-500",
        text: "text-green-500",
        border: "border-green-500",
      };
    if (p >= 50)
      return {
        bg: "bg-yellow-500",
        text: "text-yellow-500",
        border: "border-yellow-500",
      };
    return {
      bg: "bg-red-500",
      text: "text-red-500",
      border: "border-red-500",
    };
  };

  const colors = getColor(percentage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`card-chunky cursor-pointer ${
        isExpanded ? "border-electric-500" : ""
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-mono font-bold text-lg text-white">{label.title}</h3>
          {/* Hinglish Subtitle */}
          <p className="text-sm text-accent-slate/70 mt-1 truncate">
            {label.subtitle}
          </p>
        </div>

        {/* Score fraction - RIGHT aligned, large */}
        <div className="flex items-center gap-3">
          <span className={`font-mono font-bold text-2xl ${colors.text}`}>
            {data.score}/{data.maxScore}
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-accent-slate" />
          </motion.div>
        </div>
      </div>

      {/* Progress Bar - thicker, flat color */}
      <div className="h-1.5 rounded-full bg-navy-800 overflow-hidden mb-3">
        <motion.div
          className={`h-full rounded-full ${colors.bg}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
        />
      </div>

      {/* Feedback */}
      <p className="text-sm text-accent-slate line-clamp-2">{data.feedback}</p>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4 border-t border-navy-700 mt-4">
              {/* Issues */}
              {data.issues.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">
                      Issues
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {data.issues.map((issue, i) => (
                      <li
                        key={i}
                        className="text-sm text-accent-slate flex items-start gap-2"
                      >
                        <ArrowRight className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
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
                    <Lightbulb className="w-4 h-4 text-electric-500" />
                    <span className="text-sm font-medium text-electric-500">
                      Suggestions
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {data.suggestions.map((suggestion, i) => (
                      <li
                        key={i}
                        className="text-sm text-accent-slate flex items-start gap-2"
                      >
                        <ArrowRight className="w-4 h-4 text-electric-500 flex-shrink-0 mt-0.5" />
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
