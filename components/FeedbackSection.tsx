"use client";

import { motion } from "framer-motion";
import { ThumbsUp, Flame, CheckCircle, AlertTriangle } from "lucide-react";

interface FeedbackSectionProps {
  strengths: string[];
  criticalFixes: string[];
}

export default function FeedbackSection({
  strengths,
  criticalFixes,
}: FeedbackSectionProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Strengths */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="card-chunky border-l-4 border-l-green-500"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <ThumbsUp className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            What&apos;s Working 💪
          </h3>
        </div>

        <ul className="space-y-0">
          {strengths.map((strength, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-start gap-3 py-3 border-b border-navy-700 last:border-b-0"
            >
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-accent-slate">{strength}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Critical Fixes */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="card-chunky border-l-4 border-l-red-500"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            Fix This NOW 🔥
          </h3>
        </div>

        <ul className="space-y-0">
          {criticalFixes.map((fix, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-start gap-3 py-3 border-b border-navy-700 last:border-b-0"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-accent-slate">{fix}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
