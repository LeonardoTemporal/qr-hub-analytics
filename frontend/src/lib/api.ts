export type TimeRange = "hoy" | "7d" | "30d";

export interface NameValue {
  name: string;
  value: number;
}

export interface KpisResponse {
  campaign_id: string;
  total_scans: number;
  recent_scans_7d: number;
  scans_30d: number;
  daily_avg: number;
  unique_devices: number;
  unique_countries: number;
}

export interface DistributionResponse {
  campaign_id: string;
  devices: NameValue[];
  os: NameValue[];
  browsers: NameValue[];
}

export interface GeoResponse {
  campaign_id: string;
  countries: NameValue[];
  states: NameValue[];
  municipalities: NameValue[];
  cities: NameValue[];
}

export interface TimelinePoint {
  date: string;
  scans: number;
}

export interface TimelineResponse {
  campaign_id: string;
  range: TimeRange;
  bucket: "day" | "hour";
  series: TimelinePoint[];
}

export interface AnalyticsBundle {
  kpis: KpisResponse;
  distribution: DistributionResponse;
  geo: GeoResponse;
  timeline: TimelineResponse;
}

export interface CampaignOption {
  label: string;
  value: string;
  description: string;
}

const AUTH_KEY = "7fitment_dashboard_basic_auth";
const AUTH_FLAG = "7fitment_dashboard_session";
const LOCAL_DASHBOARD_PASSWORD = "7fitment2026";
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
export const PUBLIC_SITE_URL =
  (import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://7fitment.com").replace(/\/$/, "");
export const DEFAULT_CAMPAIGN_ID =
  import.meta.env.VITE_DEFAULT_CAMPAIGN_ID || "qr_general";
export const QR_GENERAL_TRACKING_URL = `${PUBLIC_SITE_URL}/t/qr_general`;
export const CAMPAIGN_OPTIONS: CampaignOption[] = [
  {
    label: "QR general",
    value: "qr_general",
    description: "Escaneos del QR impreso que redirige a /enlaces.",
  },
  {
    label: "Todas",
    value: "all",
    description: "Vista consolidada de todas las campañas.",
  },
  {
    label: "WhatsApp",
    value: "web_whatsapp",
    description: "Clicks que pasan por tracking antes de WhatsApp.",
  },
  {
    label: "Instagram",
    value: "web_instagram",
    description: "Clicks que pasan por tracking antes de Instagram.",
  },
];

function apiUrl(path: string): string {
  return API_URL ? `${API_URL}${path}` : path;
}

function getStoredAuth(): string | null {
  return sessionStorage.getItem(AUTH_KEY);
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_FLAG);
}

function authHeaders(): HeadersInit {
  const auth = getStoredAuth();
  return auth ? { Authorization: `Basic ${auth}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init.headers,
    },
  });

  if (response.status === 401) {
    clearSession();
    throw new Error("Sesion expirada");
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export async function login(password: string, username = "admin"): Promise<void> {
  if (password !== LOCAL_DASHBOARD_PASSWORD) {
    throw new Error("Clave incorrecta");
  }

  sessionStorage.setItem(AUTH_KEY, window.btoa(`${username}:${password}`));
  sessionStorage.setItem(AUTH_FLAG, "true");

  if (!API_URL) return;

  const response = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    clearSession();
    throw new Error(
      response.status === 401
        ? "Clave incorrecta"
        : "No se pudo iniciar sesion",
    );
  }
}

export async function validateSession(): Promise<boolean> {
  if (sessionStorage.getItem(AUTH_FLAG) !== "true" || !getStoredAuth()) return false;
  try {
    await request<{ success: boolean; username: string }>("/api/auth/session");
    return true;
  } catch {
    return getStoredAuth() === window.btoa(`admin:${LOCAL_DASHBOARD_PASSWORD}`);
  }
}

export async function fetchAnalytics(
  range: TimeRange,
  campaignId = DEFAULT_CAMPAIGN_ID,
): Promise<AnalyticsBundle> {
  const params = new URLSearchParams({ campaign_id: campaignId });
  const timelineParams = new URLSearchParams({ campaign_id: campaignId, range });

  const [kpis, distribution, geo, timeline] = await Promise.all([
    request<KpisResponse>(`/api/analytics/kpis?${params}`),
    request<DistributionResponse>(`/api/analytics/distribution?${params}`),
    request<GeoResponse>(`/api/analytics/geo?${params}`),
    request<TimelineResponse>(`/api/analytics/timeline?${timelineParams}`),
  ]);

  return { kpis, distribution, geo, timeline };
}
