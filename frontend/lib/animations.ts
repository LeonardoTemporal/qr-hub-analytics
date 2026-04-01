/**
 * Framer Motion animation variants
 * 
 * Centralized animation definitions for consistent motion design
 * across the application. Luxury automotive aesthetic - smooth, refined.
 */

import type { Variants, Transition } from "framer-motion";

// Default spring transition - smooth and refined
export const springTransition: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 15,
};

// Quick spring for micro-interactions
export const quickSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 20,
};

// Smooth ease for page transitions
export const smoothEase: Transition = {
  duration: 0.6,
  ease: [0.25, 0.1, 0.25, 1],
};

// Container with stagger children
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Fade up animation for items
export const fadeUp: Variants = {
  hidden: { 
    y: 20, 
    opacity: 0 
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: springTransition,
  },
};

// Fade in animation
export const fadeIn: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

// Scale fade animation
export const scaleFade: Variants = {
  hidden: { 
    scale: 0.95, 
    opacity: 0 
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: springTransition,
  },
  exit: {
    scale: 1.05,
    opacity: 0,
    transition: {
      duration: 0.3,
    },
  },
};

// Slide from left
export const slideFromLeft: Variants = {
  hidden: { 
    x: -30, 
    opacity: 0 
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: smoothEase,
  },
};

// Slide from right
export const slideFromRight: Variants = {
  hidden: { 
    x: 30, 
    opacity: 0 
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: smoothEase,
  },
};

// Header slide down
export const headerSlide: Variants = {
  hidden: { 
    y: -100, 
    opacity: 0 
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: springTransition,
  },
};

// Page transition variants
export const pageTransition: Variants = {
  initial: { 
    opacity: 0, 
    y: 20 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: smoothEase,
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.3,
    },
  },
};

// Card hover interaction
export const cardHover = {
  scale: 1.02,
  y: -4,
  transition: quickSpring,
};

// Button tap interaction
export const buttonTap = {
  scale: 0.98,
};

// Button hover interaction
export const buttonHover = {
  scale: 1.02,
};

// Progress bar animation
export const progressBar: Variants = {
  hidden: { 
    scaleX: 0 
  },
  visible: (custom: number) => ({
    scaleX: 1,
    transition: {
      delay: custom * 0.05 + 0.15,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
};

// Counter animation config for framer-motion animate()
export const counterAnimation = {
  duration: 1.5,
  ease: [0.25, 0.1, 0.25, 1] as const,
};
