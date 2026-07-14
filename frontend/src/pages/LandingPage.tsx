import { useCallback, useState, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";

import { BackgroundPaths } from "../components/ui/background-paths";

interface LandingPortalTarget {
  mount: HTMLElement;
  section: HTMLElement;
}

export default function LandingPage() {
  const [portalTarget, setPortalTarget] = useState<LandingPortalTarget | null>(null);

  const handleFrameLoad = useCallback((event: SyntheticEvent<HTMLIFrameElement>) => {
    const frameDocument = event.currentTarget.contentDocument;
    const mount = frameDocument?.getElementById("manifestoPaths");
    const section = frameDocument?.getElementById("filosofia");

    setPortalTarget(mount && section ? { mount, section } : null);
  }, []);

  return (
    <>
      <iframe
        src="/landing.html"
        title="7Fitment"
        onLoad={handleFrameLoad}
        style={{
          background: "#050505",
          border: 0,
          display: "block",
          minHeight: "100svh",
          width: "100%",
        }}
      />
      {portalTarget
        ? createPortal(
            <BackgroundPaths density={36} observeTarget={portalTarget.section} />,
            portalTarget.mount,
          )
        : null}
    </>
  );
}
