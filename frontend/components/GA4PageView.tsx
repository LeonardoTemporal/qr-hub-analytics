/**
 * GA4PageView – componente cliente que dispara un evento page_view
 * cada vez que se monta (navegación a una nueva campaña).
 *
 * Se mantiene separado del layout para no forzar RSC a ser Client Component.
 * Al ser un componente de bajo nivel sin UI, el bundle overhead es mínimo.
 */

"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gtag?: (...args: any[]) => void;
  }
}

interface GA4PageViewProps {
  campaignId: string;
}

export function GA4PageView({ campaignId }: GA4PageViewProps) {
  useEffect(() => {
    if (typeof window.gtag !== "function") return;

    window.gtag("event", "page_view", {
      page_title: `Campaign: ${campaignId}`,
      page_path: `/enlaces/${campaignId}`,
      campaign_id: campaignId,
    });
  }, [campaignId]);

  // No renderiza nada en el DOM
  return null;
}
