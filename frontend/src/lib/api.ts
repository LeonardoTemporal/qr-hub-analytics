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
  clusters: GeoCluster[];
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
  scans: ScanDetailResponse;
}

export interface GeoCluster {
  geo_hash_5: string;
  latitude: number;
  longitude: number;
  scan_count: number;
  unique_devices: number;
  top_device_type: string | null;
  top_os: string | null;
}

export interface ScanDetailItem {
  id: number;
  campaign_id: string;
  scan_token: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  location_display: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  geo_source: "ip" | "browser" | "gps" | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  scanned_at: string;
}

export interface ScanDetailResponse {
  items: ScanDetailItem[];
  total: number;
  page: number;
  page_size: number;
  sort_by: string;
  sort_order: "asc" | "desc";
}

export interface ScanQueryOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CampaignOption {
  label: string;
  value: string;
  description: string;
}

export interface BrowserLocationPayload {
  country?: string;
  state?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
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
  profile?: {
    title?: string | null;
    description?: string | null;
    hero_media_url?: string | null;
    instagram_build_url?: string | null;
    whatsapp_cta_url?: string | null;
    book_consultation_url?: string | null;
  } | null;
  social_proof?: {
    client_testimonial?: string | null;
    vehicle_story?: string | null;
    photographer_credit?: string | null;
  } | null;
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

export interface PortalWarrantyClaim {
  id: number;
  claim_number: string;
  warranty_policy_id: number;
  status: string;
  description: string;
  incident_at?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  evidence: Array<{
    media_asset_id: number;
    media_url: string;
    media_type: string;
    original_filename: string;
  }>;
}

export interface GarageWarrantyClaimInput {
  warranty_policy_id: number;
  description: string;
  incident_at?: string;
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
  warranties: Array<{
    id: number;
    policy_number: string;
    service_record_id: number;
    status: string;
    effective_date: string;
    expiration_date: string;
    terms_version: number;
    policy_snapshot: Record<string, unknown>;
  }>;
  warranty_claims: PortalWarrantyClaim[];
}

const GARAGE_TOKEN_KEY = "7fitment_garage_portal_token";
const GARAGE_VEHICLE_KEY = "7fitment_garage_vehicle_context";
export const PUBLIC_SITE_URL =
  (import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://7fitment.com").replace(/\/$/, "");
export const DEFAULT_CAMPAIGN_ID =
  import.meta.env.VITE_DEFAULT_CAMPAIGN_ID || "qr_general";
export const QR_GENERAL_TRACKING_URL = `${PUBLIC_SITE_URL}/t/qr_general`;
export const QR_GENERAL_ASSET_URL = "/assets/qr/7fitment-qr-general.svg";
export const CAMPAIGN_OPTIONS: CampaignOption[] = [
  {
    label: "QR general",
    value: "qr_general",
    description: "Escaneos del QR impreso que redirige a /enlaces.",
  },
];

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

export async function fetchAnalytics(
  range: TimeRange,
  campaignId = DEFAULT_CAMPAIGN_ID,
  scanOptions: ScanQueryOptions = {},
): Promise<AnalyticsBundle> {
  const params = new URLSearchParams({ campaign_id: campaignId });
  const rangeParams = new URLSearchParams({ campaign_id: campaignId, range });
  const timelineParams = new URLSearchParams({ campaign_id: campaignId, range });
  const scanParams = new URLSearchParams({
    campaign_id: campaignId,
    range,
    page: String(scanOptions.page ?? 1),
    page_size: String(scanOptions.pageSize ?? 25),
    sort_by: scanOptions.sortBy ?? "scanned_at",
    sort_order: scanOptions.sortOrder ?? "desc",
  });

  const [kpis, distribution, geo, timeline, scans] = await Promise.all([
    request<KpisResponse>(`/api/analytics/kpis?${params}`),
    request<DistributionResponse>(`/api/analytics/distribution?${params}`),
    request<GeoResponse>(`/api/analytics/geo?${rangeParams}`),
    request<TimelineResponse>(`/api/analytics/timeline?${timelineParams}`),
    request<ScanDetailResponse>(`/api/analytics/scans?${scanParams}`),
  ]);

  return { kpis, distribution, geo, timeline, scans };
}

export async function submitBrowserLocation(
  payload: BrowserLocationPayload,
): Promise<boolean> {
  const response = await fetch("/api/analytics/browser-location", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const result = (await response.json()) as { updated?: boolean };
  return result.updated === true;
}

async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init);
}

export async function trackQrEvent(input: {
  event_type:
    | "destination_view"
    | "cta_click"
    | "link_click"
    | "lead_submit"
    | "portal_open";
  path?: string;
  element_id?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const payload = {
    ...input,
    idempotency_key: input.idempotency_key ?? crypto.randomUUID(),
  };
  try {
    const response = await fetch("/api/tracking/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "include",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  } catch {
    return false;
  }
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

export async function createGarageWarrantyClaim(
  token: string,
  input: GarageWarrantyClaimInput,
): Promise<PortalWarrantyClaim> {
  return publicRequest<PortalWarrantyClaim>("/api/garage/portal/claims", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}
import { apiRequest } from "../app/api/client";
