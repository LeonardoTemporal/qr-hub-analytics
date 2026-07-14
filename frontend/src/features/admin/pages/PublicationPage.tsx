import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Send } from "lucide-react";
import { useForm } from "react-hook-form";

import GlassPanel from "../../../ui/GlassPanel";
import { InlineError } from "../../../ui/RouteState";
import {
  createServiceCatalogItem,
  fetchAdminVehicles,
  fetchServiceCatalog,
  fetchWorkshopProfile,
  publishShowcase,
  updateServiceCatalogItem,
  updateWorkshopProfile,
} from "../api";

interface ProfileFields {
  name: string;
  tagline: string;
  description: string;
  phone: string;
  city: string;
  state: string;
  instagram_url: string;
  is_published: boolean;
}

interface ServiceFields {
  code: string;
  name: string;
  service_type: "PPF" | "Wrap" | "Ceramic" | "Detailing" | "Maintenance";
  description: string;
  base_price_mxn: string;
}

export default function PublicationPage() {
  const queryClient = useQueryClient();
  const vehicles = useQuery({ queryKey: ["admin", "vehicles"], queryFn: fetchAdminVehicles });
  const catalog = useQuery({ queryKey: ["admin", "service-catalog"], queryFn: fetchServiceCatalog });
  const profile = useQuery({ queryKey: ["admin", "workshop-profile"], queryFn: fetchWorkshopProfile });
  const profileForm = useForm<ProfileFields>({
    defaultValues: { name: "7Fitment", tagline: "", description: "", phone: "", city: "", state: "", instagram_url: "", is_published: false },
  });
  const serviceForm = useForm<ServiceFields>({
    defaultValues: { code: "", name: "", service_type: "PPF", description: "", base_price_mxn: "" },
  });

  useEffect(() => {
    if (!profile.data) return;
    profileForm.reset({
      name: profile.data.name,
      tagline: profile.data.tagline ?? "",
      description: profile.data.description ?? "",
      phone: profile.data.phone ?? "",
      city: profile.data.city ?? "",
      state: profile.data.state ?? "",
      instagram_url: profile.data.instagram_url ?? "",
      is_published: profile.data.is_published,
    });
  }, [profile.data, profileForm]);

  const publish = useMutation({
    mutationFn: publishShowcase,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "vehicles"] }),
  });
  const saveProfile = useMutation({
    mutationFn: updateWorkshopProfile,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "workshop-profile"] }),
  });
  const createService = useMutation({
    mutationFn: createServiceCatalogItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "service-catalog"] });
      serviceForm.reset();
    },
  });
  const toggleService = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => updateServiceCatalogItem(id, { is_active }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "service-catalog"] }),
  });

  const error = publish.error ?? saveProfile.error ?? createService.error ?? toggleService.error;
  const submitProfile = profileForm.handleSubmit((values) => saveProfile.mutateAsync({
    ...values,
    tagline: values.tagline || null,
    description: values.description || null,
    phone: values.phone || null,
    city: values.city || null,
    state: values.state || null,
    instagram_url: values.instagram_url || null,
  }));
  const submitService = serviceForm.handleSubmit((values) => createService.mutateAsync({
    code: values.code,
    name: values.name,
    service_type: values.service_type,
    description: values.description || null,
    default_warranty_months: null,
    base_price_mxn: values.base_price_mxn ? Number(values.base_price_mxn) : null,
    is_active: true,
  }));

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-7 md:px-7 md:py-10">
      <header className="mb-7">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#626262]">Showcase / Control editorial</p>
        <h1 className="mt-2 text-[30px] font-medium tracking-[-0.055em] md:text-[38px]">Publicacion</h1>
      </header>
      {error ? <div className="mb-5"><InlineError message={error.message} /></div> : null}

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassPanel eyebrow="Sitio publico" title="Perfil del taller">
          <form onSubmit={submitProfile} className="space-y-4 p-5">
            <label className="block"><span className="admin-label">Nombre</span><input className="admin-input" {...profileForm.register("name", { required: true })} /></label>
            <label className="block"><span className="admin-label">Tagline</span><input className="admin-input" {...profileForm.register("tagline")} /></label>
            <label className="block"><span className="admin-label">Descripcion</span><textarea rows={3} className="admin-input resize-none" {...profileForm.register("description")} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="admin-label">Ciudad</span><input className="admin-input" {...profileForm.register("city")} /></label><label><span className="admin-label">Estado</span><input className="admin-input" {...profileForm.register("state")} /></label></div>
            <label className="block"><span className="admin-label">Instagram</span><input type="url" className="admin-input" {...profileForm.register("instagram_url")} /></label>
            <label className="flex items-center justify-between border border-white/[0.07] px-3 py-3"><span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#8a8a8a]">Visible en landing</span><input type="checkbox" className="h-4 w-4 accent-white" {...profileForm.register("is_published")} /></label>
            <button disabled={saveProfile.isPending} className="focus-ring h-11 w-full rounded-[4px] bg-[#f2f2f2] text-[9px] font-semibold uppercase tracking-[0.14em] text-black disabled:opacity-45">Guardar perfil</button>
          </form>
        </GlassPanel>

        <GlassPanel eyebrow="Landing" title="Catalogo de servicios">
          <form onSubmit={submitService} className="grid gap-3 border-b border-white/[0.06] p-5 sm:grid-cols-2">
            <label><span className="admin-label">Codigo</span><input placeholder="ppf-complete" className="admin-input" {...serviceForm.register("code", { required: true, pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ })} /></label>
            <label><span className="admin-label">Nombre</span><input className="admin-input" {...serviceForm.register("name", { required: true })} /></label>
            <label><span className="admin-label">Tipo</span><select className="admin-input" {...serviceForm.register("service_type")}><option>PPF</option><option>Wrap</option><option>Ceramic</option><option>Detailing</option><option>Maintenance</option></select></label>
            <label><span className="admin-label">Precio base (MXN)</span><input type="number" min="0" max="10000000" className="admin-input" {...serviceForm.register("base_price_mxn")} /></label>
            <label className="sm:col-span-2"><span className="admin-label">Descripcion</span><textarea rows={2} className="admin-input resize-none" {...serviceForm.register("description")} /></label>
            <button disabled={createService.isPending} className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-[4px] bg-[#f2f2f2] text-[9px] font-semibold uppercase tracking-[0.13em] text-black sm:col-span-2 disabled:opacity-45"><Plus size={13} /> Agregar servicio</button>
          </form>
          <div className="divide-y divide-white/[0.055]">
            {(catalog.data ?? []).map((item) => (
              <article key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div><p className="text-[13px] font-medium">{item.name}</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.15em] text-[#626262]">{item.service_type} / {item.code}{item.base_price_mxn ? ` / $ ${item.base_price_mxn.toLocaleString("es-MX")} MXN` : ""}</p></div>
                <button type="button" onClick={() => toggleService.mutate({ id: item.id, is_active: !item.is_active })} className={`focus-ring h-8 border px-3 font-mono text-[8px] uppercase tracking-[0.12em] ${item.is_active ? "border-white/20 text-white" : "border-white/[0.06] text-[#626262]"}`}>{item.is_active ? "Activo" : "Oculto"}</button>
              </article>
            ))}
            {!catalog.data?.length ? <p className="px-5 py-8 text-center text-[11px] text-[#626262]">Sin servicios publicados.</p> : null}
          </div>
        </GlassPanel>
      </section>

      <div className="mt-5">
        <GlassPanel eyebrow="Vehiculos" title="Perfiles publicos">
          <div className="divide-y divide-white/[0.055]">
            {(vehicles.data ?? []).map((vehicle) => (
              <article key={vehicle.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-[15px] font-medium tracking-[-0.03em]">{vehicle.brand} {vehicle.model}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#626262]">{vehicle.year ?? "--"} / {vehicle.color ?? "Sin color"} / ID {vehicle.id}</p></div>
                <div className="flex gap-2"><a href={`/auto/${vehicle.id}`} target="_blank" rel="noreferrer" className="focus-ring grid h-10 w-10 place-items-center rounded-[4px] border border-white/[0.08] text-[#707070] hover:text-white" aria-label="Ver showcase"><ExternalLink size={14} /></a><button type="button" disabled={publish.isPending} onClick={() => publish.mutate(vehicle.id)} className="focus-ring inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#f2f2f2] px-4 text-[9px] font-semibold uppercase tracking-[0.13em] text-black disabled:opacity-45"><Send size={13} /> Publicar</button></div>
              </article>
            ))}
            {!vehicles.data?.length ? <p className="px-5 py-12 text-center text-[12px] text-[#626262]">No hay vehiculos disponibles.</p> : null}
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
