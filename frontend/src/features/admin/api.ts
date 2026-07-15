import { apiRequest, setCsrfToken } from "../../app/api/client";
import type { components } from "../../app/api/schema";

export type AdminSession = components["schemas"]["AdminSessionResponse"];
export type AdminLoginInput = components["schemas"]["AdminLoginRequest"];

export type AdminCredentialUpdate = components["schemas"]["AdminCredentialUpdate"];

export interface AdminOverview {
  clients: number;
  vehicles: number;
  active_orders: number;
  published_showcases: number;
}

export type AdminClient = components["schemas"]["ClientRead"];
export type AdminVehicle = components["schemas"]["VehicleRead"];
export type AdminWorkOrder = components["schemas"]["WorkOrderRead"];
export type AdminMediaAsset = components["schemas"]["MediaAssetRead"];
export type ServiceType = "PPF" | "Wrap" | "Ceramic" | "Detailing" | "Maintenance";

export interface AdminWorkOrderItem {
  id: number;
  work_order_id: number;
  service_catalog_id: number | null;
  service_type: ServiceType;
  title: string;
  material_brand: string | null;
  material_product: string | null;
  finish_type: string | null;
  price_mxn: number | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  notes: string | null;
}

export interface AdminServiceRecord {
  id: number;
  vehicle_id: number;
  service_type: ServiceType;
  title: string | null;
  installed_at: string;
  warranty_expires_at: string | null;
  washing_recommendations: string | null;
  care_instructions: string | null;
  internal_notes: string | null;
  is_public: boolean;
}

export interface AdminWarranty {
  id: number;
  policy_number: string;
  vehicle_id: number;
  service_record_id: number;
  status: "draft" | "active" | "expired" | "revoked";
  effective_date: string;
  expiration_date: string;
  terms_version: number;
  policy_snapshot: Record<string, unknown>;
  warranty_card_number: string | null;
  annual_inspection_required: boolean;
}

export interface AdminWarrantyClaim {
  id: number;
  claim_number: string;
  warranty_policy_id: number;
  vehicle_id: number;
  status: "submitted" | "under_review" | "approved" | "rejected" | "resolved" | "cancelled";
  description: string;
  incident_at: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  evidence_media_asset_ids: number[];
}

export interface AdminAnalyticsSummary {
  scan_sessions: number;
  events: number;
  conversions: number;
}

export interface AdminServiceCatalogItem {
  id: number;
  code: string;
  name: string;
  service_type: "PPF" | "Wrap" | "Ceramic" | "Detailing" | "Maintenance";
  description: string | null;
  default_warranty_months: number | null;
  base_price_mxn: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminWorkshopProfile {
  id: number;
  name: string;
  tagline: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  business_hours: Record<string, unknown> | null;
  service_areas: unknown[] | null;
  instagram_url: string | null;
  is_published: boolean;
  updated_at: string;
}

export async function loginAdmin(input: AdminLoginInput): Promise<AdminSession> {
  const session = await apiRequest<AdminSession>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setCsrfToken(session.csrf_token);
  return session;
}

export async function fetchAdminSession(): Promise<AdminSession> {
  const session = await apiRequest<AdminSession>("/api/admin/auth/session");
  setCsrfToken(session.csrf_token);
  return session;
}

export async function logoutAdmin(): Promise<void> {
  await apiRequest<void>("/api/admin/auth/logout", { method: "POST" });
  setCsrfToken(null);
}

export async function updateAdminCredentials(input: AdminCredentialUpdate): Promise<void> {
  await apiRequest<void>("/api/admin/auth/credentials", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  setCsrfToken(null);
}

export function fetchAdminClients(): Promise<AdminClient[]> {
  return apiRequest("/api/admin/clients");
}

export function fetchAdminVehicles(): Promise<AdminVehicle[]> {
  return apiRequest("/api/admin/vehicles");
}

export function fetchAdminWorkOrders(): Promise<AdminWorkOrder[]> {
  return apiRequest("/api/admin/work-orders");
}

export function createAdminWorkOrder(input: {
  client_id: number;
  vehicle_id: number;
  scheduled_for?: string | null;
  odometer_km?: number | null;
  intake_notes?: string | null;
  referral_token?: string | null;
}): Promise<AdminWorkOrder> {
  return apiRequest("/api/admin/work-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminWorkOrder(
  id: number,
  input: Partial<Pick<AdminWorkOrder, "status" | "scheduled_for" | "odometer_km" | "intake_notes" | "quality_notes">>,
): Promise<AdminWorkOrder> {
  return apiRequest(`/api/admin/work-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchWorkOrderItems(workOrderId: number): Promise<AdminWorkOrderItem[]> {
  return apiRequest(`/api/admin/work-orders/${workOrderId}/items`);
}

export function createWorkOrderItem(
  workOrderId: number,
  input: Omit<AdminWorkOrderItem, "id" | "work_order_id" | "status">,
): Promise<AdminWorkOrderItem> {
  return apiRequest(`/api/admin/work-orders/${workOrderId}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWorkOrderItem(
  id: number,
  input: Partial<Omit<AdminWorkOrderItem, "id" | "work_order_id">>,
): Promise<AdminWorkOrderItem> {
  return apiRequest(`/api/admin/work-order-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchAdminSummary(range = "30d"): Promise<AdminAnalyticsSummary> {
  return apiRequest(`/api/admin/analytics/summary?range=${encodeURIComponent(range)}`);
}

export function createAdminClient(
  input: Omit<AdminClient, "id" | "created_at">,
): Promise<AdminClient> {
  return apiRequest("/api/admin/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminClient(
  id: number,
  input: Partial<Omit<AdminClient, "id" | "created_at">>,
): Promise<AdminClient> {
  return apiRequest(`/api/admin/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createAdminVehicle(input: {
  client_id: number;
  brand: string;
  model: string;
  year?: number;
  vin?: string;
  plate?: string;
  color?: string;
  access_pin: string;
}): Promise<AdminVehicle> {
  return apiRequest("/api/admin/vehicles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminVehicle(
  id: number,
  input: Partial<Omit<AdminVehicle, "id">> & { access_pin?: string },
): Promise<AdminVehicle> {
  return apiRequest(`/api/admin/vehicles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchAdminServiceRecords(): Promise<AdminServiceRecord[]> {
  return apiRequest("/api/admin/services");
}

export function createAdminServiceRecord(
  input: Omit<AdminServiceRecord, "id" | "title" | "warranty_expires_at" | "washing_recommendations" | "care_instructions" | "internal_notes"> &
    Partial<Pick<AdminServiceRecord, "title" | "warranty_expires_at" | "washing_recommendations" | "care_instructions" | "internal_notes">>,
): Promise<AdminServiceRecord> {
  return apiRequest("/api/admin/services", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminServiceRecord(
  id: number,
  input: Partial<Omit<AdminServiceRecord, "id" | "vehicle_id">>,
): Promise<AdminServiceRecord> {
  return apiRequest(`/api/admin/services/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchAdminWarranties(): Promise<AdminWarranty[]> {
  return apiRequest("/api/admin/warranties");
}

export function createAdminWarranty(input: {
  policy_number: string;
  vehicle_id: number;
  service_record_id: number;
  effective_date: string;
  expiration_date: string;
  coverage?: string[];
  exclusions?: string[];
  care_instructions?: string[];
  warranty_card_number?: string | null;
  annual_inspection_required?: boolean;
}): Promise<AdminWarranty> {
  return apiRequest("/api/admin/warranties", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminWarranty(
  id: number,
  input: Partial<Pick<AdminWarranty, "status" | "expiration_date" | "warranty_card_number" | "annual_inspection_required">>,
): Promise<AdminWarranty> {
  return apiRequest(`/api/admin/warranties/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchWarrantyClaims(): Promise<AdminWarrantyClaim[]> {
  return apiRequest("/api/admin/warranty-claims");
}

export function createWarrantyClaim(input: {
  warranty_policy_id: number;
  description: string;
  incident_at?: string | null;
  evidence_media_asset_ids?: number[];
}): Promise<AdminWarrantyClaim> {
  return apiRequest("/api/admin/warranty-claims", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWarrantyClaim(
  id: number,
  input: Partial<Pick<AdminWarrantyClaim, "status" | "description" | "incident_at" | "resolution_notes">>,
): Promise<AdminWarrantyClaim> {
  return apiRequest(`/api/admin/warranty-claims/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchAdminMedia(): Promise<AdminMediaAsset[]> {
  return apiRequest("/api/admin/media");
}

export function uploadAdminMedia(input: {
  file: File;
  visibility: "public" | "private";
  serviceRecordId?: number;
}): Promise<AdminMediaAsset> {
  const body = new FormData();
  body.append("file", input.file);
  body.append("visibility", input.visibility);
  if (input.serviceRecordId) {
    body.append("service_record_id", String(input.serviceRecordId));
  }
  return apiRequest("/api/admin/media", { method: "POST", body });
}

export function publishShowcase(vehicleId: number): Promise<{ status: string }> {
  return apiRequest(`/api/admin/showcases/${vehicleId}/publish`, { method: "POST" });
}

export function fetchServiceCatalog(): Promise<AdminServiceCatalogItem[]> {
  return apiRequest("/api/admin/service-catalog");
}

export function createServiceCatalogItem(
  input: Omit<AdminServiceCatalogItem, "id" | "created_at" | "updated_at">,
): Promise<AdminServiceCatalogItem> {
  return apiRequest("/api/admin/service-catalog", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateServiceCatalogItem(
  id: number,
  input: Partial<Omit<AdminServiceCatalogItem, "id" | "code" | "created_at" | "updated_at">>,
): Promise<AdminServiceCatalogItem> {
  return apiRequest(`/api/admin/service-catalog/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchWorkshopProfile(): Promise<AdminWorkshopProfile | null> {
  return apiRequest("/api/admin/workshop-profile");
}

export function updateWorkshopProfile(
  input: Partial<Omit<AdminWorkshopProfile, "id" | "updated_at">>,
): Promise<AdminWorkshopProfile> {
  return apiRequest("/api/admin/workshop-profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
