"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <>
      {/* Color stripe at top */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] h-[3px]"
        style={{
          background: "linear-gradient(90deg, #f97316 0%, #2563eb 100%)",
        }}
      />

      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-[3px] left-0 right-0 z-50 bg-background border-b border-[#1e3a5f]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[60px]">
            {/* LEFT: Logo */}
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <span className="font-mono font-bold text-lg text-white">
                🔥 Resume Roaster
              </span>
            </motion.div>

            {/* RIGHT: Warning badge + Made in India */}
            <div className="flex items-center gap-4">
              {/* Warning Badge - Link to /secret */}
              <Link href="/secret" passHref>
                <motion.div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900/80 border border-red-800 cursor-pointer"
                  animate={{
                    rotate: [-1, 1, -1, 1, -1, 0],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-xs font-mono text-white animate-pulse">
                    ⚠️ Do not redeem the card!!
                  </span>
                </motion.div>
              </Link>

              {/* Made in India */}
              <span className="text-xs text-accent-slate hidden sm:inline-block">
                Made in 🇮🇳
              </span>
            </div>
          </div>
        </div>
      </motion.nav>
    </>
  );
}
