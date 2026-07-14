import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, Plus, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import GlassPanel from "../../../ui/GlassPanel";
import { InlineError } from "../../../ui/RouteState";
import {
  createAdminServiceRecord,
  createAdminWarranty,
  createWarrantyClaim,
  fetchAdminMedia,
  fetchAdminServiceRecords,
  fetchAdminVehicles,
  fetchAdminWarranties,
  fetchWarrantyClaims,
  updateAdminWarranty,
  updateWarrantyClaim,
  type AdminWarrantyClaim,
  type ServiceType,
} from "../api";

interface ServiceFields {
  vehicle_id: string;
  service_type: ServiceType;
  title: string;
  installed_at: string;
  warranty_expires_at: string;
  washing_recommendations: string;
  care_instructions: string;
  internal_notes: string;
  is_public: boolean;
}

interface WarrantyFields {
  policy_number: string;
  service_record_id: string;
  effective_date: string;
  expiration_date: string;
  warranty_card_number: string;
  annual_inspection_required: boolean;
}

interface ClaimFields {
  warranty_policy_id: string;
  incident_at: string;
  description: string;
}

const today = new Date().toISOString().slice(0, 10);
const fiveYears = new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().slice(0, 10);
const claimTransitions: Record<AdminWarrantyClaim["status"], AdminWarrantyClaim["status"][]> = {
  submitted: ["under_review", "cancelled"],
  under_review: ["approved", "rejected", "cancelled"],
  approved: ["resolved", "cancelled"],
  rejected: ["under_review"],
  resolved: [],
  cancelled: [],
};

export default function WarrantiesPage() {
  const queryClient = useQueryClient();
  const [evidenceIds, setEvidenceIds] = useState<number[]>([]);
  const vehicles = useQuery({ queryKey: ["admin", "vehicles"], queryFn: fetchAdminVehicles });
  const services = useQuery({ queryKey: ["admin", "service-records"], queryFn: fetchAdminServiceRecords });
  const warranties = useQuery({ queryKey: ["admin", "warranties"], queryFn: fetchAdminWarranties });
  const claims = useQuery({ queryKey: ["admin", "warranty-claims"], queryFn: fetchWarrantyClaims });
  const media = useQuery({ queryKey: ["admin", "media"], queryFn: fetchAdminMedia });
  const serviceForm = useForm<ServiceFields>({ defaultValues: { vehicle_id: "", service_type: "PPF", title: "", installed_at: today, warranty_expires_at: "", washing_recommendations: "", care_instructions: "", internal_notes: "", is_public: true } });
  const warrantyForm = useForm<WarrantyFields>({ defaultValues: { policy_number: "", service_record_id: "", effective_date: today, expiration_date: fiveYears, warranty_card_number: "", annual_inspection_required: true } });
  const claimForm = useForm<ClaimFields>({ defaultValues: { warranty_policy_id: "", incident_at: today, description: "" } });
  const vehicleNames = useMemo(() => new Map((vehicles.data ?? []).map((vehicle) => [vehicle.id, `${vehicle.brand} ${vehicle.model}`])), [vehicles.data]);
  const selectedPolicy = (warranties.data ?? []).find(
    (policy) => policy.id === Number(claimForm.watch("warranty_policy_id")),
  );
  const privateMedia = (media.data ?? []).filter(
    (asset) =>
      asset.visibility === "private" &&
      asset.processing_status === "ready" &&
      selectedPolicy &&
      (asset.service_record_ids ?? []).includes(selectedPolicy.service_record_id),
  );

  const saveService = useMutation({
    mutationFn: createAdminServiceRecord,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "service-records"] });
      serviceForm.reset();
    },
  });
  const issueWarranty = useMutation({
    mutationFn: createAdminWarranty,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "warranties"] });
      warrantyForm.reset({ policy_number: "", service_record_id: "", effective_date: today, expiration_date: fiveYears, warranty_card_number: "", annual_inspection_required: true });
    },
  });
  const changeWarranty = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "expired" | "revoked" }) => updateAdminWarranty(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "warranties"] }),
  });
  const submitClaimMutation = useMutation({
    mutationFn: createWarrantyClaim,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "warranty-claims"] });
      claimForm.reset({ warranty_policy_id: "", incident_at: today, description: "" });
      setEvidenceIds([]);
    },
  });
  const changeClaim = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AdminWarrantyClaim["status"] }) => updateWarrantyClaim(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "warranty-claims"] }),
  });

  const submitService = serviceForm.handleSubmit((values) => saveService.mutateAsync({
    vehicle_id: Number(values.vehicle_id),
    service_type: values.service_type,
    title: values.title || null,
    installed_at: values.installed_at,
    warranty_expires_at: values.warranty_expires_at || null,
    washing_recommendations: values.washing_recommendations || null,
    care_instructions: values.care_instructions || null,
    internal_notes: values.internal_notes || null,
    is_public: values.is_public,
  }));
  const submitWarranty = warrantyForm.handleSubmit((values) => {
    const service = services.data?.find((item) => item.id === Number(values.service_record_id));
    if (!service) return Promise.resolve();
    return issueWarranty.mutateAsync({
      policy_number: values.policy_number,
      vehicle_id: service.vehicle_id,
      service_record_id: service.id,
      effective_date: values.effective_date,
      expiration_date: values.expiration_date,
      warranty_card_number: values.warranty_card_number || null,
      annual_inspection_required: values.annual_inspection_required,
    });
  });
  const submitClaim = claimForm.handleSubmit((values) => submitClaimMutation.mutateAsync({
    warranty_policy_id: Number(values.warranty_policy_id),
    incident_at: values.incident_at || null,
    description: values.description,
    evidence_media_asset_ids: evidenceIds,
  }));
  const error = saveService.error ?? issueWarranty.error ?? changeWarranty.error ?? submitClaimMutation.error ?? changeClaim.error ?? services.error ?? warranties.error ?? claims.error;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-7 md:px-7 md:py-10">
      <header className="mb-7"><p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#626262]">Polizas / Postventa</p><h1 className="mt-2 text-[30px] font-medium tracking-[-0.055em] md:text-[38px]">Garantias y reclamaciones</h1></header>
      {error ? <div className="mb-5"><InlineError message={error instanceof Error ? error.message : "No se pudo sincronizar"} /></div> : null}

      <section className="grid gap-5 xl:grid-cols-3">
        <GlassPanel eyebrow="Expediente" title="Registrar servicio">
          <form onSubmit={submitService} className="space-y-4 p-5">
            <label className="block"><span className="admin-label">Vehiculo</span><select className="admin-input" {...serviceForm.register("vehicle_id", { required: true })}><option value="">Seleccionar</option>{(vehicles.data ?? []).map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.brand} {vehicle.model}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><label><span className="admin-label">Tipo</span><select className="admin-input" {...serviceForm.register("service_type")}><option>PPF</option><option>Wrap</option><option>Ceramic</option><option>Detailing</option><option>Maintenance</option></select></label><label><span className="admin-label">Instalacion</span><input type="date" className="admin-input" {...serviceForm.register("installed_at", { required: true })} /></label></div>
            <label className="block"><span className="admin-label">Nombre del trabajo</span><input className="admin-input" {...serviceForm.register("title")} /></label>
            <label className="block"><span className="admin-label">Cuidados del cliente</span><textarea rows={3} className="admin-input resize-none" {...serviceForm.register("care_instructions")} /></label>
            <label className="flex items-center justify-between border border-white/[0.07] px-3 py-3"><span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#8a8a8a]">Visible en showcase</span><input type="checkbox" className="h-4 w-4 accent-white" {...serviceForm.register("is_public")} /></label>
            <button disabled={saveService.isPending} className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-white text-[9px] font-semibold uppercase tracking-[0.13em] text-black disabled:opacity-45"><Plus size={13} /> Registrar</button>
          </form>
        </GlassPanel>

        <GlassPanel eyebrow="Emision" title="Nueva poliza">
          <form onSubmit={submitWarranty} className="space-y-4 p-5">
            <label className="block"><span className="admin-label">Numero de poliza</span><input className="admin-input font-mono uppercase" autoComplete="off" {...warrantyForm.register("policy_number", { required: true, minLength: 1, maxLength: 64 })} /></label>
            <label className="block"><span className="admin-label">Servicio</span><select className="admin-input" {...warrantyForm.register("service_record_id", { required: true })}><option value="">Seleccionar</option>{(services.data ?? []).map((service) => <option key={service.id} value={service.id}>{vehicleNames.get(service.vehicle_id)} / {service.service_type}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><label><span className="admin-label">Inicio</span><input type="date" className="admin-input" {...warrantyForm.register("effective_date", { required: true })} /></label><label><span className="admin-label">Vencimiento</span><input type="date" className="admin-input" {...warrantyForm.register("expiration_date", { required: true })} /></label></div>
            <label className="block"><span className="admin-label">Tarjeta / folio opcional</span><input className="admin-input font-mono uppercase" {...warrantyForm.register("warranty_card_number")} /></label>
            <label className="flex items-center justify-between border border-white/[0.07] px-3 py-3"><span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#8a8a8a]">Inspeccion anual</span><input type="checkbox" className="h-4 w-4 accent-white" {...warrantyForm.register("annual_inspection_required")} /></label>
            <p className="text-[10px] leading-5 text-[#626262]">El numero lo captura la administradora y no se genera automaticamente. La poliza guarda un snapshot inmutable de terminos.</p>
            <button disabled={issueWarranty.isPending || !services.data?.length} className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-white text-[9px] font-semibold uppercase tracking-[0.13em] text-black disabled:opacity-45"><FileCheck2 size={14} /> Emitir poliza</button>
          </form>
        </GlassPanel>

        <GlassPanel eyebrow="Postventa" title="Abrir reclamacion">
          <form onSubmit={submitClaim} className="space-y-4 p-5">
            <label className="block"><span className="admin-label">Poliza</span><select className="admin-input" {...claimForm.register("warranty_policy_id", { required: true })}><option value="">Seleccionar</option>{(warranties.data ?? []).filter((policy) => ["active", "expired"].includes(policy.status)).map((policy) => <option key={policy.id} value={policy.id}>{policy.policy_number} / {vehicleNames.get(policy.vehicle_id)}</option>)}</select></label>
            <label className="block"><span className="admin-label">Fecha del incidente</span><input type="date" className="admin-input" {...claimForm.register("incident_at")} /></label>
            <label className="block"><span className="admin-label">Descripcion</span><textarea rows={4} className="admin-input resize-none" {...claimForm.register("description", { required: true, minLength: 10 })} /></label>
            {privateMedia.length ? <fieldset><legend className="admin-label">Evidencia privada</legend><div className="max-h-28 space-y-1 overflow-y-auto border border-white/[0.07] p-2">{privateMedia.map((asset) => <label key={asset.id} className="flex items-center gap-2 px-2 py-1 text-[10px] text-[#8a8a8a]"><input type="checkbox" checked={evidenceIds.includes(asset.id)} onChange={() => setEvidenceIds((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id])} className="accent-white" /><span className="truncate">{asset.original_filename}</span></label>)}</div></fieldset> : null}
            <button disabled={submitClaimMutation.isPending || !warranties.data?.length} className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-[4px] bg-white text-[9px] font-semibold uppercase tracking-[0.13em] text-black disabled:opacity-45"><ShieldCheck size={14} /> Crear expediente</button>
          </form>
        </GlassPanel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <GlassPanel eyebrow="Vigencia" title={`${warranties.data?.length ?? 0} polizas`}>
          <div className="divide-y divide-white/[0.055]">{(warranties.data ?? []).map((policy) => <article key={policy.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white">{policy.policy_number}</p><p className="mt-1 text-[11px] text-[#626262]">{vehicleNames.get(policy.vehicle_id)} / vence {new Date(`${policy.expiration_date}T00:00:00`).toLocaleDateString("es-MX")}</p></div><select value={policy.status} onChange={(event) => changeWarranty.mutate({ id: policy.id, status: event.target.value as "active" | "expired" | "revoked" })} className="admin-input h-9 min-w-[140px] py-0 font-mono text-[8px] uppercase"><option value="active">Activa</option><option value="expired">Vencida</option><option value="revoked">Revocada</option></select></article>)}</div>
        </GlassPanel>
        <GlassPanel eyebrow="Seguimiento" title={`${claims.data?.length ?? 0} reclamaciones`}>
          <div className="divide-y divide-white/[0.055]">{(claims.data ?? []).map((claim) => <article key={claim.id} className="px-5 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white">{claim.claim_number}</p><p className="mt-2 max-w-xl text-[12px] leading-5 text-[#8a8a8a]">{claim.description}</p><p className="mt-2 font-mono text-[8px] uppercase tracking-[0.13em] text-[#525252]">Vehiculo #{claim.vehicle_id} / {claim.evidence_media_asset_ids.length} evidencias</p></div>{claimTransitions[claim.status].length ? <select value="" onChange={(event) => { if (event.target.value) changeClaim.mutate({ id: claim.id, status: event.target.value as AdminWarrantyClaim["status"] }); }} className="admin-input h-9 min-w-[155px] py-0 font-mono text-[8px] uppercase"><option value="">{claim.status}</option>{claimTransitions[claim.status].map((status) => <option key={status} value={status}>{status}</option>)}</select> : <span className="border border-white/[0.08] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#707070]">{claim.status}</span>}</div></article>)}{!claims.data?.length ? <p className="px-5 py-12 text-center text-[12px] text-[#626262]">Sin reclamaciones abiertas.</p> : null}</div>
        </GlassPanel>
      </section>
    </main>
  );
}
