import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import { useLocation } from "react-router";

import {
  fetchAdminSession,
  loginAdmin,
  logoutAdmin,
  type AdminLoginInput,
  type AdminSession,
} from "../api";

interface AdminSessionContextValue {
  session: AdminSession | null;
  loading: boolean;
  login: (input: AdminLoginInput) => Promise<AdminSession>;
  logout: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);
const SESSION_QUERY_KEY = ["admin", "session"] as const;

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const sessionQuery = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchAdminSession,
    retry: false,
    enabled: location.pathname.startsWith("/admin") || location.pathname === "/dashboard",
  });
  const loginMutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (session) => queryClient.setQueryData(SESSION_QUERY_KEY, session),
  });
  const logoutMutation = useMutation({
    mutationFn: logoutAdmin,
    onSettled: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: ["admin"], exact: false });
    },
  });

  return (
    <AdminSessionContext.Provider
      value={{
        session: sessionQuery.data ?? null,
        loading: sessionQuery.isLoading,
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionContextValue {
  const context = useContext(AdminSessionContext);
  if (!context) throw new Error("useAdminSession must be used within AppProviders");
  return context;
}
