"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const loadingMessages = [
  "Tera resume padh ke aansu aa gaye... 😭",
  "Consulting 15 rejected LinkedIn applications for reference...",
  "Checking if 'MS Office Expert' is a real skill...",
  "TCS NextStep bhi shocked hai yaar...",
  "Ammi Papa ka sapna tod raha hun slowly...",
  "Calculating damage to your FAANG dreams...",
  "Bhai kitne buzzwords daale hain yaar... 💀",
  "Grammarly ne bhi surrender kar diya...",
];

export default function LoadingRoast() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/95 backdrop-blur-sm"
    >
      {/* Background Sparks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-orange-500 rounded-full"
            initial={{
              x: `${50 + (Math.random() - 0.5) * 40}%`,
              y: `${50 + (Math.random() - 0.5) * 40}%`,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              y: `${50 + (Math.random() - 0.5) * 60 - 20}%`,
              scale: [0, 1, 0],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Animated Fire Emoji */}
        <motion.div
          className="relative"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-8xl">🔥</span>

          {/* Fire Glow Effect */}
          <motion.div
            className="absolute inset-0 blur-2xl bg-orange-500/30 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Loading Text */}
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold font-mono">
            Roasting Your Resume...
          </h3>

          {/* Rotating Messages */}
          <div className="h-8 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-accent-slate font-mono"
              >
                {loadingMessages[currentIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1 bg-navy-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
            initial={{ width: "0%" }}
            animate={{
              width: ["0%", "100%", "0%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
