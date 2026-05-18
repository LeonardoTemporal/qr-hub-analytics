import { lazy, Suspense, useEffect, useState } from "react";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EnlacesPage = lazy(() => import("./pages/EnlacesPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

function currentPath(): string {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function shouldBypassClientRouter(href: string): boolean {
  return /^\/(api|r|t|qr)(\/|$)/.test(href);
}

export default function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPopState = () => setPath(currentPath());
    window.addEventListener("popstate", onPopState);

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        shouldBypassClientRouter(href) ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }
      event.preventDefault();
      window.history.pushState({}, "", href);
      setPath(currentPath());
      window.scrollTo({ top: 0 });
    };

    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-bg-base text-text-muted">7FITMENT</div>}>
      {path === "/enlaces" || path.startsWith("/enlaces/") ? <EnlacesPage /> : null}
      {path === "/dashboard" ? <DashboardPage /> : null}
      {path !== "/dashboard" && path !== "/enlaces" && !path.startsWith("/enlaces/") ? <LandingPage /> : null}
    </Suspense>
  );
}
