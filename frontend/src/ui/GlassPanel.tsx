import type { HTMLAttributes, ReactNode } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "article" | "div";
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
}

export default function GlassPanel({
  as: Element = "section",
  eyebrow,
  title,
  action,
  className = "",
  children,
  ...props
}: GlassPanelProps) {
  return (
    <Element
      className={`relative overflow-hidden rounded-[6px] border border-white/[0.07] bg-white/[0.025] backdrop-blur-xl ${className}`}
      {...props}
    >
      <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-white/25" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-white/25" />
      {eyebrow || title || action ? (
        <header className="flex items-end justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
          <div>
            {eyebrow ? (
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#626262]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-1 text-[17px] font-medium tracking-[-0.04em] text-[#f2f2f2]">
                {title}
              </h2>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </Element>
  );
}
