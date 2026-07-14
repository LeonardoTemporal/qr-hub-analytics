import { Navigate, Outlet, useLocation } from "react-router-dom";

import { RouteLoading } from "../../../ui/RouteState";
import { useAdminSession } from "./AdminSessionProvider";

export default function RequireAdmin() {
  const { session, loading } = useAdminSession();
  const location = useLocation();

  if (loading) return <RouteLoading label="Validando sesion" />;
  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
