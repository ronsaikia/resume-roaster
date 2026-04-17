"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
}

export default function ScoreGauge({
  score,
  size = 200,
  strokeWidth = 12,
  showLabel = true,
  label = "Overall Score",
}: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [showStamp, setShowStamp] = useState(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Color based on score
  const getColor = (s: number): string => {
    if (s <= 40) return "#ef4444"; // Red
    if (s <= 70) return "#eab308"; // Yellow
    return "#22c55e"; // Green
  };

  const color = getColor(score);
  const trackColor = "#e8e4df";

  // Animate score counting
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
        // Trigger stamp effect after score animation completes
        setShowStamp(true);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  // Calculate stroke dash offset based on actual score (not displayScore) to avoid visual glitch
  const scoreProgress = (score / 100) * circumference;
  const strokeDashoffset = score >= 100 ? 0 : circumference - scoreProgress;

  return (
    <div className="relative flex flex-col items-center">
      {/* Container - neo-brutalist style with stamp animation */}
      <motion.div
        className="bg-white border-4 border-[#1a1a1a] p-6 relative"
        style={{
          width: size + 48,
          height: size + 48,
          boxShadow: '6px 6px 0px #1a1a1a'
        }}
        animate={showStamp ? {
          scale: [1, 1.05, 1],
        } : {}}
        transition={{
          duration: 0.3,
          ease: "easeOut",
        }}
      >
        {/* SVG Gauge */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          style={{ overflow: "visible" }}
        >
          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Progress Circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-5xl font-bold font-mono"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            {displayScore}
          </motion.span>
          <span className="text-sm text-[#6b6b6b] mt-1 font-bold">/100</span>
        </div>
      </motion.div>

      {/* Label */}
      {showLabel && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-lg font-bold text-[#1a1a1a]"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
