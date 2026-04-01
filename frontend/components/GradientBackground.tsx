/**
 * GradientBackground - Decorative background effect
 * 
 * Subtle gradient orbs for luxury aesthetic
 */

interface GradientBackgroundProps {
  variant?: "centered" | "top" | "bottom";
  intensity?: "subtle" | "medium" | "strong";
}

const positionStyles = {
  centered: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  top: "-top-40 left-1/2 -translate-x-1/2",
  bottom: "-bottom-40 left-1/2 -translate-x-1/2",
};

const intensityStyles = {
  subtle: "bg-white/[0.02]",
  medium: "bg-white/[0.04]",
  strong: "bg-white/[0.06]",
};

export function GradientBackground({ 
  variant = "top", 
  intensity = "subtle" 
}: GradientBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div 
        className={`absolute w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] lg:w-[800px] lg:h-[800px] rounded-full ${intensityStyles[intensity]} blur-[120px] sm:blur-[150px] ${positionStyles[variant]}`} 
      />
    </div>
  );
}
