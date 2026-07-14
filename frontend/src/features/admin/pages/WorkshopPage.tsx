import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CarFront, Pencil, UserRoundPlus, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import GlassPanel from "../../../ui/GlassPanel";
import { InlineError } from "../../../ui/RouteState";
import {
  createAdminClient,
  createAdminVehicle,
  fetchAdminClients,
  fetchAdminVehicles,
  updateAdminClient,
  updateAdminVehicle,
  type AdminClient,
  type AdminVehicle,
} from "../api";

interface ClientFields {
  full_name: string;
  phone: string;
  email: string;
  preferred_contact_channel: string;
  notes: string;
}

interface VehicleFields {
  client_id: string;
  brand: string;
  model: string;
  year: string;
  vin: string;
  plate: string;
  color: string;
  access_pin: string;
}

const emptyClient: ClientFields = {
  full_name: "",
  phone: "",
  email: "",
  preferred_contact_channel: "whatsapp",
  notes: "",
};

const emptyVehicle: VehicleFields = {
  client_id: "",
  brand: "",
  model: "",
  year: "",
  vin: "",
  plate: "",
  color: "",
  access_pin: "",
};

export default function WorkshopPage() {
  const queryClient = useQueryClient();
  const [editingClient, setEditingClient] = useState<AdminClient | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<AdminVehicle | null>(null);
  const clients = useQuery({ queryKey: ["admin", "clients"], queryFn: fetchAdminClients });
  const vehicles = useQuery({ queryKey: ["admin", "vehicles"], queryFn: fetchAdminVehicles });
  const clientForm = useForm<ClientFields>({ defaultValues: emptyClient });
  const vehicleForm = useForm<VehicleFields>({ defaultValues: emptyVehicle });

  const saveClient = useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Omit<AdminClient, "id" | "created_at"> }) =>
      id ? updateAdminClient(id, input) : createAdminClient(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
      setEditingClient(null);
      clientForm.reset(emptyClient);
    },
  });
  const saveVehicle = useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Parameters<typeof createAdminVehicle>[0] }) => {
      if (!id) return createAdminVehicle(input);
      const { access_pin, ...vehicle } = input;
      return updateAdminVehicle(id, access_pin ? { ...vehicle, access_pin } : vehicle);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "vehicles"] });
      setEditingVehicle(null);
      vehicleForm.reset(emptyVehicle);
    },
  });
  const toggleVehicle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateAdminVehicle(id, { is_active }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "vehicles"] }),
  });

  const submitClient = clientForm.handleSubmit((values) =>
    saveClient.mutateAsync({
      id: editingClient?.id,
      input: {
        full_name: values.full_name,
        phone: values.phone || null,
        email: values.email || null,
        preferred_contact_channel: values.preferred_contact_channel || null,
        notes: values.notes || null,
      },
    }),
  );
  const submitVehicle = vehicleForm.handleSubmit((values) =>
    saveVehicle.mutateAsync({
      id: editingVehicle?.id,
      input: {
        client_id: Number(values.client_id),
        brand: values.brand,
        model: values.model,
        year: values.year ? Number(values.year) : undefined,
        vin: values.vin || undefined,
        plate: values.plate || undefined,
        color: values.color || undefined,
        access_pin: values.access_pin,
      },
    }),
  );

  const beginClientEdit = (client: AdminClient) => {
    setEditingClient(client);
    clientForm.reset({
      full_name: client.full_name,
      phone: client.phone ?? "",
      email: client.email ?? "",
      preferred_contact_channel: client.preferred_contact_channel ?? "whatsapp",
      notes: client.notes ?? "",
    });
  };
  const beginVehicleEdit = (vehicle: AdminVehicle) => {
    setEditingVehicle(vehicle);
    vehicleForm.reset({
      client_id: String(vehicle.client_id),
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year ? String(vehicle.year) : "",
      vin: vehicle.vin ?? "",
      plate: vehicle.plate ?? "",
      color: vehicle.color ?? "",
      access_pin: "",
    });
  };
  const error = saveClient.error ?? saveVehicle.error ?? toggleVehicle.error ?? clients.error ?? vehicles.error;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-7 md:px-7 md:py-10">
      <header className="mb-7">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#626262]">CRM / Garage</p>
        <h1 className="mt-2 text-[30px] font-medium tracking-[-0.055em] md:text-[38px]">Clientes y vehiculos</h1>
      </header>
      {error ? <div className="mb-5"><InlineError message={error instanceof Error ? error.message : "No se pudo guardar"} /></div> : null}

      <section className="grid gap-5 xl:grid-cols-2">
        <GlassPanel eyebrow={editingClient ? "Edicion" : "Captura rapida"} title={editingClient ? `Cliente #${editingClient.id}` : "Nuevo cliente"}>
          <form onSubmit={submitClient} className="space-y-4 p-5">
            <label className="block"><span className="admin-label">Nombre completo</span><input className="admin-input" {...clientForm.register("full_name", { required: true, minLength: 2 })} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className="admin-label">Telefono</span><input type="tel" className="admin-input" {...clientForm.register("phone")} /></label>
              <label><span className="admin-label">Correo</span><input type="email" className="admin-input" {...clientForm.register("email")} /></label>
            </div>
            <label className="block"><span className="admin-label">Canal preferido</span><select className="admin-input" {...clientForm.register("preferred_contact_channel")}><option value="whatsapp">WhatsApp</option><option value="phone">Telefono</option><option value="email">Email</option></select></label>
            <label className="block"><span className="admin-label">Notas privadas</span><textarea rows={2} className="admin-input resize-none" {...clientForm.register("notes")} /></label>
            <div className="flex gap-2">
              {editingClient ? <button type="button" onClick={() => { setEditingClient(null); clientForm.reset(emptyClient); }} className="focus-ring grid h-11 w-11 place-items-center rounded-[4px] border border-white/[0.09]" aria-label="Cancelar edicion"><X size={15} /></button> : null}
              <button disabled={saveClient.isPending} className="focus-ring inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[4px] bg-[#f2f2f2] text-[10px] font-semibold uppercase tracking-[0.14em] text-black disabled:opacity-45"><UserRoundPlus size={15} /> {editingClient ? "Actualizar" : "Guardar cliente"}</button>
            </div>
          </form>
        </GlassPanel>

        <GlassPanel eyebrow={editingVehicle ? "Edicion" : "Alta de garage"} title={editingVehicle ? `Vehiculo #${editingVehicle.id}` : "Nuevo vehiculo"}>
          <form onSubmit={submitVehicle} className="space-y-4 p-5">
            <label className="block"><span className="admin-label">Cliente</span><select className="admin-input" {...vehicleForm.register("client_id", { required: true })}><option value="">Seleccionar</option>{(clients.data ?? []).map((client) => <option key={client.id} value={client.id}>{client.full_name}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="admin-label">Marca</span><input className="admin-input" {...vehicleForm.register("brand", { required: true })} /></label><label><span className="admin-label">Modelo</span><input className="admin-input" {...vehicleForm.register("model", { required: true })} /></label></div>
            <div className="grid gap-4 sm:grid-cols-3"><label><span className="admin-label">Ano</span><input type="number" min="1886" max="2100" className="admin-input" {...vehicleForm.register("year")} /></label><label><span className="admin-label">Color</span><input className="admin-input" {...vehicleForm.register("color")} /></label><label><span className="admin-label">Placa</span><input className="admin-input uppercase" {...vehicleForm.register("plate")} /></label></div>
            <div className="grid gap-4 sm:grid-cols-2"><label><span className="admin-label">VIN</span><input className="admin-input uppercase" {...vehicleForm.register("vin")} /></label><label><span className="admin-label">{editingVehicle ? "Nuevo PIN (opcional)" : "PIN privado"}</span><input type="password" autoComplete="new-password" className="admin-input font-mono tracking-[0.2em]" {...vehicleForm.register("access_pin", { required: !editingVehicle, minLength: editingVehicle ? undefined : 4 })} /></label></div>
            <div className="flex gap-2">
              {editingVehicle ? <button type="button" onClick={() => { setEditingVehicle(null); vehicleForm.reset(emptyVehicle); }} className="focus-ring grid h-11 w-11 place-items-center rounded-[4px] border border-white/[0.09]" aria-label="Cancelar edicion"><X size={15} /></button> : null}
              <button disabled={saveVehicle.isPending || !clients.data?.length} className="focus-ring inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[4px] bg-[#f2f2f2] text-[10px] font-semibold uppercase tracking-[0.14em] text-black disabled:opacity-45"><CarFront size={15} /> {editingVehicle ? "Actualizar" : "Guardar vehiculo"}</button>
            </div>
          </form>
        </GlassPanel>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <GlassPanel eyebrow="Directorio" title={`Clientes / ${clients.data?.length ?? 0}`}>
          <div className="divide-y divide-white/[0.055]">{(clients.data ?? []).map((client) => <article key={client.id} className="flex items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><p className="truncate text-[13px] font-medium">{client.full_name}</p><p className="mt-1 truncate text-[11px] text-[#626262]">{client.phone || client.email || "Sin contacto"}</p></div><button type="button" onClick={() => beginClientEdit(client)} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-[4px] border border-white/[0.08] text-[#707070] hover:text-white" aria-label={`Editar ${client.full_name}`}><Pencil size={13} /></button></article>)}</div>
        </GlassPanel>
        <GlassPanel eyebrow="Garage" title={`Vehiculos / ${vehicles.data?.length ?? 0}`}>
          <div className="divide-y divide-white/[0.055]">{(vehicles.data ?? []).map((vehicle) => <article key={vehicle.id} className="flex items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><p className="truncate text-[13px] font-medium">{vehicle.brand} {vehicle.model}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#626262]">{vehicle.year ?? "--"} / {vehicle.color ?? "Sin color"}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => toggleVehicle.mutate({ id: vehicle.id, is_active: !vehicle.is_active })} className={`focus-ring h-9 rounded-[4px] border px-3 font-mono text-[8px] uppercase tracking-[0.12em] ${vehicle.is_active ? "border-white/20 text-white" : "border-white/[0.06] text-[#626262]"}`}>{vehicle.is_active ? "Activo" : "Revocado"}</button><button type="button" onClick={() => beginVehicleEdit(vehicle)} className="focus-ring grid h-9 w-9 place-items-center rounded-[4px] border border-white/[0.08] text-[#707070] hover:text-white" aria-label={`Editar ${vehicle.brand} ${vehicle.model}`}><Pencil size={13} /></button></div></article>)}</div>
        </GlassPanel>
      </section>
    </main>
  );
}
