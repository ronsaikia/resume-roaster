"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const messages = [
  "Kya dekhne aaya hai yahan? 🤡",
  "Beta, yeh page nahi tha tera. Apna resume fix kar pehle. 💀",
  "HR ne tujhe reject kiya, ab yeh page bhi kar raha hai. 🔥",
  "Teri curiosity hi tera sabse bada weakness hai. Resume pe likh de. 😂",
  "404: Life goals not found. Resume bhi nahi bana tere se. 💅",
  "Bhai, ek page pe aaya aur ye bhi samajh nahi aaya? Coding sikhle pehle.",
];

const emojis = ["🤡", "💀"];

export default function SecretPageClient() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEmoji, setCurrentEmoji] = useState(emojis[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
      setCurrentEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background flex items-center justify-center px-4"
    >
      {/* Background Sparks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-red-500 rounded-full"
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

      <div className="relative z-10 max-w-lg w-full">
        {/* Terminal Card */}
        <div className="rounded-xl overflow-hidden border-2 border-red-500/50">
          {/* Terminal Header */}
          <div className="bg-navy-800 px-4 py-3 flex items-center gap-2 border-b border-navy-700">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-4 text-sm text-accent-slate font-mono">
              pakde_gaye.exe
            </span>
          </div>

          {/* Terminal Content */}
          <div className="bg-[#0d1b2e] p-8 text-center">
            {/* Bouncing Emoji */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 0.5,
              }}
              className="text-8xl mb-6"
            >
              {currentEmoji}
            </motion.div>

            {/* Rotating Messages */}
            <div className="h-16 flex items-center justify-center mb-8">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-xl text-white font-medium"
                >
                  {messages[currentIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Back Button */}
            <Link href="/" passHref>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-6 py-4 bg-red-600 text-white font-semibold rounded-lg
                         transition-all duration-300 hover:bg-red-500
                         flex items-center justify-center gap-2"
              >
                Theek hai bhai, wapas jata hun 😭
              </motion.button>
            </Link>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-accent-slate/50 text-sm mt-6 font-mono">
          // Kya socha tha? Kuch milega yahan aake?
        </p>
      </div>
    </motion.div>
  );
}
