"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <div className="space-y-8">
      {/* Main Heading - Bold Editorial Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-2 text-left md:text-left"
      >
        <h1 className="text-editorial font-bold text-white" style={{ fontSize: 'clamp(48px, 8vw, 96px)' }}>
          Get Your Resume
        </h1>
        <h1 className="text-editorial font-bold text-gradient-fire underline-accent" style={{ fontSize: 'clamp(48px, 8vw, 96px)' }}>
          Roasted 🔥
        </h1>
      </motion.div>

      {/* Subheading Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <span className="badge-pill border-electric-500 text-electric-500">
          AI-POWERED • BRUTAL • HONEST
        </span>
      </motion.div>

      {/* Three Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="flex items-center gap-6 md:gap-12 pt-4"
      >
        <div className="text-left">
          <div className="text-4xl md:text-5xl font-bold text-white font-mono">7</div>
          <div className="text-sm text-accent-slate mt-1">Categories</div>
        </div>

        <div className="w-px h-12 bg-navy-700" />

        <div className="text-left">
          <div className="text-4xl md:text-5xl font-bold text-white font-mono">100</div>
          <div className="text-sm text-accent-slate mt-1">Points</div>
        </div>

        <div className="w-px h-12 bg-navy-700" />

        <div className="text-left">
          <div className="text-4xl md:text-5xl font-bold text-white font-mono">0</div>
          <div className="text-sm text-accent-slate mt-1">Mercy</div>
        </div>
      </motion.div>
    </div>
  );
}
