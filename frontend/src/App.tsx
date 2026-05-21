import { lazy, Suspense, useEffect, useState } from "react";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EnlacesPage = lazy(() => import("./pages/EnlacesPage"));
const GarageDashboard = lazy(() => import("./pages/GarageDashboard"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PortalAuth = lazy(() => import("./pages/PortalAuth"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));

function currentPath(): string {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function shouldBypassClientRouter(href: string): boolean {
  return /^\/(api|r|t|qr)(\/|$)/.test(href);
}

export default function App() {
  const [path, setPath] = useState(currentPath);
  const autoSlug = path.startsWith("/auto/") ? decodeURIComponent(path.slice(6)) : null;

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
      {autoSlug ? <ShowcasePage slug={autoSlug} /> : null}
      {path === "/portal" ? <PortalAuth /> : null}
      {path === "/portal/garage" ? <GarageDashboard /> : null}
      {path !== "/dashboard" &&
      path !== "/enlaces" &&
      !path.startsWith("/enlaces/") &&
      !path.startsWith("/auto/") &&
      path !== "/portal" &&
      path !== "/portal/garage" ? <LandingPage /> : null}
    </Suspense>
  );
}
