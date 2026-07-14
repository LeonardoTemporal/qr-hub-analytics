import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

export const EASE = {
  out: "expo.out",
  text: "power4.out",
  inOut: "expo.inOut",
  css: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export const DUR = {
  micro: 0.6,
  base: 0.9,
  hero: 1.2,
} as const;

export const STAGGER = {
  chars: 0.035,
  words: 0.06,
  cards: 0.09,
} as const;

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 767px)").matches;
}

interface SplitHeadingOptions {
  type?: "chars" | "words";
  stagger?: number;
  duration?: number;
  delay?: number;
  scrollTrigger?: ScrollTrigger.Vars;
}

/**
 * Masked SplitText rise on a heading. Waits for fonts so split metrics are
 * final (no CLS / mid-word wraps). Returns the SplitText instance so callers
 * can revert() it in cleanup, or null when skipped.
 */
export async function splitHeading(
  el: Element | string,
  options: SplitHeadingOptions = {},
): Promise<SplitText | null> {
  const {
    type = "chars",
    stagger = type === "chars" ? STAGGER.chars : STAGGER.words,
    duration = 1.15,
    delay = 0,
    scrollTrigger,
  } = options;

  if (prefersReducedMotion()) return null;
  const target = typeof el === "string" ? document.querySelector(el) : el;
  if (!target) return null;

  await document.fonts.ready;
  if (!target.isConnected) return null;

  const split = SplitText.create(target, {
    type,
    mask: type,
    autoSplit: true,
    onSplit(self) {
      return gsap.from(type === "chars" ? self.chars : self.words, {
        yPercent: 115,
        duration,
        delay,
        stagger,
        ease: EASE.text,
        ...(scrollTrigger ? { scrollTrigger } : {}),
      });
    },
  });
  return split;
}

interface BatchRevealOptions {
  y?: number;
  start?: string;
  stagger?: number;
  duration?: number;
}

/** House entrance for grids: one-shot batched rise on scroll. */
export function batchReveal(
  selector: string,
  options: BatchRevealOptions = {},
): void {
  const { y = 34, start = "top 88%", stagger = STAGGER.cards, duration = DUR.base } = options;
  gsap.set(selector, { opacity: 0, y });
  ScrollTrigger.batch(selector, {
    start,
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration, ease: EASE.out, stagger }),
  });
}

export { gsap, ScrollTrigger, SplitText };
