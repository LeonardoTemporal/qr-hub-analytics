/**
 * useAuthFetch — wrapper de fetch que adjunta HTTP Basic Auth
 *
 * Lee la credencial codificada en base64 desde sessionStorage
 * (key: dashboard_basic_auth) y la envia como Authorization: Basic ....
 *
 * Si el endpoint responde 401, limpia las credenciales para forzar
 * que el dashboard regrese a la pantalla de login.
 */

const AUTH_STORAGE_KEY = "dashboard_basic_auth";

export class UnauthorizedError extends Error {
  constructor(message: string = "No autorizado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function getStoredAuth(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(AUTH_STORAGE_KEY);
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem("dashboard_auth");
}

export async function authFetch<T>(path: string): Promise<T> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const url = `${apiUrl}${path}`;

  const auth = getStoredAuth();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    headers.Authorization = `Basic ${auth}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 401) {
    clearStoredAuth();
    throw new UnauthorizedError("Sesion expirada");
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}
