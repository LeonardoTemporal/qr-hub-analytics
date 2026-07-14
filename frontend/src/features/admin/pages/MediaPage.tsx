import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileImage, Upload } from "lucide-react";
import { useRef, useState } from "react";

import GlassPanel from "../../../ui/GlassPanel";
import { InlineError } from "../../../ui/RouteState";
import { fetchAdminMedia, fetchAdminServiceRecords, uploadAdminMedia } from "../api";

function formatBytes(value: number): string {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [serviceRecordId, setServiceRecordId] = useState("");
  const media = useQuery({ queryKey: ["admin", "media"], queryFn: fetchAdminMedia });
  const services = useQuery({
    queryKey: ["admin", "service-records"],
    queryFn: fetchAdminServiceRecords,
  });
  const upload = useMutation({
    mutationFn: uploadAdminMedia,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "media"] }),
  });

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-7 md:px-7 md:py-10">
      <header className="mb-7"><p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#626262]">Assets / Derivados</p><h1 className="mt-2 text-[30px] font-medium tracking-[-0.055em] md:text-[38px]">Media</h1></header>
      {upload.error ? <div className="mb-5"><InlineError message={upload.error.message} /></div> : null}
      <GlassPanel className="mb-5 p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-[4px] border border-white/[0.08]"><Upload size={17} /></span><div><p className="text-[14px] font-medium">Cargar originales</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.13em] text-[#626262]">Imagen / Video / Documento</p></div></div>
          <div className="flex flex-wrap gap-2">
            <label className="min-w-[220px]">
              <span className="sr-only">Vincular a servicio</span>
              <select
                value={serviceRecordId}
                onChange={(event) => setServiceRecordId(event.target.value)}
                className="admin-input h-11 py-0 text-[10px]"
              >
                <option value="">Sin vincular a servicio</option>
                {(services.data ?? []).map((service) => (
                  <option key={service.id} value={service.id}>
                    #{service.id} / {service.service_type} / vehiculo #{service.vehicle_id}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline-flex rounded-[4px] border border-white/[0.08] p-1">{(["private", "public"] as const).map((value) => <button key={value} onClick={() => setVisibility(value)} className={`h-9 rounded-[3px] px-3 font-mono text-[9px] uppercase tracking-[0.12em] ${visibility === value ? "bg-white text-black" : "text-[#707070]"}`}>{value === "private" ? "Privado" : "Publico"}</button>)}</div>
            <button type="button" disabled={upload.isPending} onClick={() => fileRef.current?.click()} className="focus-ring h-11 rounded-[4px] bg-[#f2f2f2] px-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-black disabled:opacity-45">{upload.isPending ? "Procesando" : "Seleccionar"}</button>
            <input ref={fileRef} type="file" accept="image/*,video/*,.pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload.mutate({ file, visibility, serviceRecordId: serviceRecordId ? Number(serviceRecordId) : undefined }); event.target.value = ""; }} />
          </div>
        </div>
      </GlassPanel>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(media.data ?? []).map((asset) => (
          <GlassPanel key={asset.id} as="article" className="p-4">
            <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-[4px] bg-white/[0.04]"><FileImage size={18} strokeWidth={1.4} /></span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium">{asset.original_filename}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#626262]">{asset.media_type} / {formatBytes(asset.byte_size)}</p></div><span className={`mt-1 h-2 w-2 rounded-full ${asset.processing_status === "ready" ? "bg-emerald-300" : asset.processing_status === "failed" ? "bg-red-300" : "bg-amber-200"}`} /></div>
            <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3 font-mono text-[8px] uppercase tracking-[0.14em] text-[#626262]"><span>{asset.visibility}{asset.service_record_ids?.length ? ` / SRV #${asset.service_record_ids.join(", #")}` : " / sin vinculo"}</span><span className="inline-flex items-center gap-1"><CheckCircle2 size={11} /> {asset.processing_status}</span></div>
          </GlassPanel>
        ))}
      </section>
    </main>
  );
}
