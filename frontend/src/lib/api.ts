export type TimeRange = "hoy" | "7d" | "30d" | "12m";

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
  bucket: "day" | "hour" | "month";
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

export interface BrowserLocationPayload {
  scan_token: string;
  country?: string;
  state?: string;
  city?: string;
}

export interface ShowcaseMedia {
  media_url: string;
  media_type: string;
  caption?: string | null;
  sort_order: number;
}

export interface ShowcaseService {
  service_type: string;
  media: ShowcaseMedia[];
}

export interface ShowcaseResponse {
  vehicle: {
    brand: string;
    model: string;
    year?: number | null;
  };
  services: ShowcaseService[];
}

export interface PortalAuthResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  vehicle_id: number;
}

export interface PortalMedia {
  id: number;
  media_url: string;
  media_type: string;
  caption?: string | null;
  sort_order: number;
  is_public: boolean;
}

export interface PortalServiceRecord {
  id: number;
  service_type: string;
  title?: string | null;
  installed_at: string;
  warranty_expires_at?: string | null;
  washing_recommendations?: string | null;
  care_instructions?: string | null;
  internal_notes?: string | null;
  is_public: boolean;
  media: PortalMedia[];
}

export interface PortalDataResponse {
  client: {
    id: number;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    preferred_contact_channel?: string | null;
    notes?: string | null;
  };
  vehicle: {
    id: number;
    brand: string;
    model: string;
    year?: number | null;
    vin?: string | null;
    plate?: string | null;
    color?: string | null;
    is_active: boolean;
  };
  services: PortalServiceRecord[];
}

const AUTH_KEY = "7fitment_dashboard_basic_auth";
const AUTH_FLAG = "7fitment_dashboard_session";
const GARAGE_TOKEN_KEY = "7fitment_garage_portal_token";
const GARAGE_VEHICLE_KEY = "7fitment_garage_vehicle_context";
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

export async function submitBrowserLocation(
  payload: BrowserLocationPayload,
): Promise<void> {
  const response = await fetch(apiUrl("/api/analytics/browser-location"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export function storeGarageVehicleContext(vehicleId: string): void {
  sessionStorage.setItem(GARAGE_VEHICLE_KEY, vehicleId);
}

export function getGarageVehicleContext(): string | null {
  return sessionStorage.getItem(GARAGE_VEHICLE_KEY);
}

export function storeGarageToken(token: string): void {
  sessionStorage.setItem(GARAGE_TOKEN_KEY, token);
}

export function getGarageToken(): string | null {
  return sessionStorage.getItem(GARAGE_TOKEN_KEY);
}

export function clearGarageSession(): void {
  sessionStorage.removeItem(GARAGE_TOKEN_KEY);
}

export async function fetchGarageShowcase(slug: string): Promise<ShowcaseResponse> {
  return publicRequest<ShowcaseResponse>(
    `/api/garage/showcase/${encodeURIComponent(slug)}`,
  );
}

export async function authenticateGaragePortal(
  pin: string,
  vehicleId?: string | null,
): Promise<PortalAuthResponse> {
  const payload = vehicleId ? { pin, vehicle_id: vehicleId } : { pin };
  return publicRequest<PortalAuthResponse>("/api/garage/portal/auth", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchGaragePortalData(token: string): Promise<PortalDataResponse> {
  return publicRequest<PortalDataResponse>("/api/garage/portal/data", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
