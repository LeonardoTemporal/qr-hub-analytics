import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Flip } from "gsap/Flip";
import { X } from "lucide-react";
import { gsap, EASE, prefersReducedMotion } from "../lib/motion";

gsap.registerPlugin(Flip);

export interface LightboxItem {
  mediaUrl: string;
  mediaType: string;
  caption?: string | null;
  serviceType: string;
  index: number;
  total: number;
}

interface MediaLightboxProps {
  item: LightboxItem;
  sourceRect: DOMRect;
  onClose: () => void;
}

const FIT_VARS = { duration: 0.8, ease: EASE.inOut, absolute: true } as const;

export default function MediaLightbox({ item, sourceRect, onClose }: MediaLightboxProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  const indexLabel = `${String(item.index + 1).padStart(2, "0")} / ${String(item.total).padStart(2, "0")}`;

  useLayoutEffect(() => {
    const media = mediaRef.current;
    const backdrop = backdropRef.current;
    if (!media || !backdrop) return;

    if (prefersReducedMotion()) {
      gsap.set(backdrop, { opacity: 1 });
      gsap.set([media, metaRef.current], { opacity: 1, clearProps: "transform" });
      return;
    }

    const fullRect = media.getBoundingClientRect();
    Flip.fit(media, sourceRect as unknown as HTMLElement);
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(metaRef.current, { opacity: 0, y: 16 });

    const tl = gsap.timeline();
    tl.to(backdrop, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
    tl.add(() => {
      Flip.fit(media, fullRect as unknown as DOMRect & HTMLElement, FIT_VARS);
    }, 0);
    tl.to(metaRef.current, { opacity: 1, y: 0, duration: 0.5, ease: EASE.out }, 0.35);

    return () => {
      tl.kill();
    };
    // sourceRect/item are stable for the lifetime of an open lightbox
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const media = mediaRef.current;
    const backdrop = backdropRef.current;

    if (!media || !backdrop || prefersReducedMotion()) {
      onClose();
      return;
    }

    gsap.to(metaRef.current, { opacity: 0, y: 12, duration: 0.3, ease: "power2.in" });
    gsap.to(backdrop, { opacity: 0, duration: 0.55, delay: 0.1, ease: "power2.inOut", onComplete: onClose });
    Flip.fit(media, sourceRect as unknown as HTMLElement, {
      duration: 0.6,
      ease: EASE.inOut,
      absolute: true,
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-5 md:p-12"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.caption ?? item.serviceType}
    >
      <button
        type="button"
        onClick={handleClose}
        aria-label="Cerrar"
        className="absolute right-5 top-5 z-[102] flex h-11 w-11 items-center justify-center border border-white/15 bg-black/40 text-[#f2f2f2] transition-colors hover:border-white/60"
      >
        <X size={18} strokeWidth={1.5} />
      </button>

      <div
        ref={mediaRef}
        className="relative max-h-[82vh] w-auto max-w-[92vw] overflow-hidden border border-white/10 bg-[#0a0a0a]"
        onClick={(e) => e.stopPropagation()}
      >
        {item.mediaType === "video" ? (
          <video
            src={item.mediaUrl}
            className="block max-h-[82vh] w-auto max-w-[92vw] object-contain"
            controls
            autoPlay
            muted
            playsInline
          />
        ) : (
          <img
            src={item.mediaUrl}
            alt={item.caption ?? item.serviceType}
            className="block max-h-[82vh] w-auto max-w-[92vw] object-contain"
          />
        )}
      </div>

      <div
        ref={metaRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-5 md:p-10"
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#707070]">
            {item.serviceType}
          </p>
          <p className="mt-2 text-[15px] text-[#f2f2f2]">{item.caption ?? "Proceso 7Fitment"}</p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#707070]">{indexLabel}</p>
      </div>
    </div>,
    document.body,
  );
}
