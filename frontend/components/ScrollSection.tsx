/**
 * ScrollSection - Scroll-triggered animation wrapper
 * 
 * Animates children when they enter the viewport
 */

"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface ScrollSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollSection({
  children,
  className = "",
  delay = 0,
}: ScrollSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-80px",
  });

  return (
    <motion.section
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.section>
  );
}
