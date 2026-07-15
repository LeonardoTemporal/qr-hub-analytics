import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";

import RequireAdmin from "./features/admin/auth/RequireAdmin";
import AdminLayout from "./features/admin/layout/AdminLayout";
import { RouteLoading } from "./ui/RouteState";

const AdminLoginPage = lazy(() => import("./features/admin/pages/AdminLoginPage"));
const AdminOverviewPage = lazy(() => import("./features/admin/pages/AdminOverviewPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EnlacesPage = lazy(() => import("./pages/EnlacesPage"));
const GarageDashboard = lazy(() => import("./pages/GarageDashboard"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const MediaPage = lazy(() => import("./features/admin/pages/MediaPage"));
const OrdersPage = lazy(() => import("./features/admin/pages/OrdersPage"));
const PortalAuth = lazy(() => import("./pages/PortalAuth"));
const PublicationPage = lazy(() => import("./features/admin/pages/PublicationPage"));
const SecurityPage = lazy(() => import("./features/admin/pages/SecurityPage"));
const ShowcasePage = lazy(() => import("./pages/ShowcasePage"));
const WorkshopPage = lazy(() => import("./features/admin/pages/WorkshopPage"));
const WarrantiesPage = lazy(() => import("./features/admin/pages/WarrantiesPage"));

function ShowcaseRoute() {
  const { slug = "" } = useParams();
  return <ShowcasePage slug={decodeURIComponent(slug)} />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/enlaces/*" element={<EnlacesPage />} />
        <Route path="/auto/:slug" element={<ShowcaseRoute />} />
        <Route path="/portal" element={<PortalAuth />} />
        <Route path="/portal/garage" element={<GarageDashboard />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="workshop" element={<WorkshopPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="warranties" element={<WarrantiesPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="publication" element={<PublicationPage />} />
            <Route path="analytics" element={<DashboardPage />} />
            <Route path="security" element={<SecurityPage />} />
          </Route>
        </Route>

        <Route path="/dashboard" element={<Navigate to="/admin/analytics" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
