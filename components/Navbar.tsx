"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export default function Navbar() {
  return (
    <>
      {/* Orange-red solid line at top */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] h-[4px] bg-[#e8441a] border-b-2 border-[#1a1a1a]"
      />

      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-[4px] left-0 right-0 z-50 bg-[#f0ede8] border-b-3 border-[#1a1a1a]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[64px]">
            {/* LEFT: Logo */}
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
                <div className="relative w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex-shrink-0">
                  <Image
                    src="/favicon.svg"
                    alt="JhalmuriCV Flame"
                    fill
                    className="object-contain"
                  />
                </div>
                <span
                  className="font-syne font-extrabold text-[1.25rem] sm:text-[1.5rem] md:text-[2rem] text-[#1a1a1a] leading-none tracking-tight"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  JhalmuriCV
                </span>
              </Link>
            </motion.div>

            {/* RIGHT: Warning badge + Made in India */}
            <div className="flex items-center gap-4">
              {/* Warning Badge - Link to secret page - NEOBRUTALIST STYLE */}
              <Link href="/secret">
              <motion.button
                title="Click to discover who's watching 👀"
                className="flex items-center gap-2 px-4 py-2 bg-[#ef4444] text-white
                         border-3 border-[#1a1a1a] font-bold font-mono text-xs
                         cursor-pointer select-none"
                style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                whileHover={{
                  x: 1,
                  y: 1,
                  boxShadow: '2px 2px 0px #1a1a1a'
                }}
                whileTap={{
                  x: 3,
                  y: 3,
                  boxShadow: '0px 0px 0px #1a1a1a'
                }}
                animate={{
                  rotate: [-1, 1, -1, 1, -1, 0],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              >
                <span className="animate-pulse truncate max-w-[100px] sm:max-w-none">
                  NEAR YOU 👀
                </span>
              </motion.button>
              </Link>

            </div>
          </div>
        </div>
      </motion.nav>
    </>
  );
}
