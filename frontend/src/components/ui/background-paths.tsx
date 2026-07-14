import { domAnimation, LazyMotion, m, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { cn } from "../../lib/utils";

interface FloatingPathsProps {
  active: boolean;
  density: number;
  position: 1 | -1;
  reduceMotion: boolean;
}

interface BackgroundPathsProps {
  className?: string;
  density?: number;
  observeTarget?: Element | null;
}

function FloatingPaths({
  active,
  density,
  position,
  reduceMotion,
}: FloatingPathsProps) {
  const paths = useMemo(
    () =>
      Array.from({ length: density }, (_, index) => ({
        id: `${position}-${index}`,
        d: `M-${380 - index * 5 * position} -${189 + index * 6}C-${
          380 - index * 5 * position
        } -${189 + index * 6} -${312 - index * 5 * position} ${
          216 - index * 6
        } ${152 - index * 5 * position} ${343 - index * 6}C${
          616 - index * 5 * position
        } ${470 - index * 6} ${684 - index * 5 * position} ${
          875 - index * 6
        } ${684 - index * 5 * position} ${875 - index * 6}`,
        duration: 20 + ((index * 17 + (position === 1 ? 3 : 11)) % 10),
        opacity: 0.1 + index * 0.03,
        width: 0.5 + index * 0.03,
      })),
    [density, position],
  );

  return (
    <div style={{ inset: 0, pointerEvents: "none", position: "absolute" }}>
      <svg
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="none"
        style={{
          display: "block",
          height: "100%",
          width: "100%",
        }}
      >
        <title>Background Paths 7Fitment</title>
        {paths.map((path) => (
          <m.path
            key={path.id}
            data-background-path="true"
            d={path.d}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeOpacity={path.opacity}
            strokeWidth={path.width}
            vectorEffect="non-scaling-stroke"
            initial={
              reduceMotion
                ? false
                : { opacity: 0.3, pathLength: 0.3, pathOffset: 0 }
            }
            animate={
              active && !reduceMotion
                ? {
                    opacity: [0.3, 0.6, 0.3],
                    pathLength: 1,
                    pathOffset: [0, 1, 0],
                  }
                : { opacity: 0.34, pathLength: reduceMotion ? 1 : 0.3, pathOffset: 0 }
            }
            transition={
              active && !reduceMotion
                ? {
                    duration: path.duration,
                    ease: "linear",
                    repeat: Number.POSITIVE_INFINITY,
                  }
                : { duration: 0.35, ease: "easeOut" }
            }
          />
        ))}
      </svg>
    </div>
  );
}

export function BackgroundPaths({
  className,
  density = 36,
  observeTarget = null,
}: BackgroundPathsProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!observeTarget || reduceMotion) {
      setActive(Boolean(observeTarget));
      return;
    }

    const frameWindow = observeTarget.ownerDocument.defaultView;
    const Observer = frameWindow?.IntersectionObserver;
    if (!Observer) {
      setActive(true);
      return;
    }

    const observer = new Observer(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "10% 0px" },
    );
    observer.observe(observeTarget);
    return () => observer.disconnect();
  }, [observeTarget, reduceMotion]);

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        aria-hidden="true"
        className={cn(className)}
        data-motion-active={active ? "true" : "false"}
        style={{
          color: "#f2f2f2",
          inset: 0,
          maskImage:
            "linear-gradient(to bottom, transparent, black 7%, black 93%, transparent)",
          overflow: "hidden",
          pointerEvents: "none",
          position: "absolute",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 7%, black 93%, transparent)",
        }}
      >
        <div
          data-background-paths-stage="true"
          style={{
            height: "100%",
            inset: 0,
            position: "absolute",
            width: "100%",
          }}
        >
          <FloatingPaths
            active={active}
            density={density}
            position={1}
            reduceMotion={reduceMotion}
          />
          <FloatingPaths
            active={active}
            density={density}
            position={-1}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>
    </LazyMotion>
  );
}
