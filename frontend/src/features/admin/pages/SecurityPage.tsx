import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";

import GlassPanel from "../../../ui/GlassPanel";
import { updateAdminCredentials } from "../api";
import { useAdminSession } from "../auth/AdminSessionProvider";

interface SecurityFields {
  new_username: string;
  current_password: string;
  new_password: string;
  confirm_password: string;
}

function PasswordField({
  id,
  label,
  autoComplete,
  error,
  registerProps,
}: {
  id: string;
  label: string;
  autoComplete: string;
  error?: string;
  registerProps: UseFormRegisterReturn;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-[#707070]">
        {label}
      </span>
      <span className="relative block">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className="focus-ring h-12 w-full rounded-[4px] border border-white/[0.08] bg-black/50 px-4 pr-12 text-sm outline-none"
          {...registerProps}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="focus-ring absolute inset-y-0 right-0 grid w-12 place-items-center text-[#626262] transition-colors hover:text-white"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          title={visible ? "Ocultar" : "Mostrar"}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
      {error ? <span className="mt-2 block text-[11px] text-red-200">{error}</span> : null}
    </label>
  );
}

export default function SecurityPage() {
  const { session } = useAdminSession();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SecurityFields>({
    defaultValues: {
      new_username: session?.username ?? "",
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });
  const newPassword = watch("new_password");
  const mutation = useMutation({ mutationFn: updateAdminCredentials });

  const submit = handleSubmit(async (fields) => {
    const username = fields.new_username.trim();
    const usernameChanged = username !== session?.username;
    if (!usernameChanged && !fields.new_password) {
      setError("root", { message: "Modifica el usuario o define una nueva contrasena." });
      return;
    }

    try {
      await mutation.mutateAsync({
        current_password: fields.current_password,
        new_username: usernameChanged ? username : undefined,
        new_password: fields.new_password || undefined,
      });
      window.location.assign("/admin/login?credentials=updated");
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "No se pudieron actualizar las credenciales.",
      });
    }
  });

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-7 md:px-7 md:py-10">
      <header className="mb-7 max-w-2xl">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#626262]">
          Administracion / Seguridad
        </p>
        <h1 className="mt-2 text-[30px] font-medium tracking-[-0.055em] md:text-[38px]">
          Acceso de la cuenta
        </h1>
        <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#707070]">
          Actualiza las credenciales propietarias. Al guardar, todas las sesiones abiertas se cerraran automaticamente.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
        <GlassPanel eyebrow="Credenciales" title="Usuario y contrasena">
          <form onSubmit={submit} className="space-y-5 p-5 md:p-6">
            <label className="block" htmlFor="new-username">
              <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-[#707070]">
                Nombre de usuario
              </span>
              <span className="relative block">
                <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[#626262]" size={15} />
                <input
                  id="new-username"
                  autoComplete="username"
                  className="focus-ring h-12 w-full rounded-[4px] border border-white/[0.08] bg-black/50 pl-11 pr-4 text-sm outline-none"
                  {...register("new_username", {
                    required: "El usuario es obligatorio.",
                    minLength: { value: 3, message: "Usa al menos 3 caracteres." },
                    maxLength: { value: 100, message: "Usa menos de 100 caracteres." },
                    pattern: {
                      value: /^[A-Za-z0-9._-]+$/,
                      message: "Usa letras, numeros, punto, guion o guion bajo.",
                    },
                  })}
                />
              </span>
              {errors.new_username ? (
                <span className="mt-2 block text-[11px] text-red-200">{errors.new_username.message}</span>
              ) : null}
            </label>

            <div className="border-t border-white/[0.06] pt-5">
              <PasswordField
                id="current-password"
                label="Contrasena actual"
                autoComplete="current-password"
                error={errors.current_password?.message}
                registerProps={register("current_password", {
                  required: "Confirma tu contrasena actual.",
                  minLength: { value: 8, message: "La credencial no es valida." },
                })}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <PasswordField
                id="new-password"
                label="Nueva contrasena"
                autoComplete="new-password"
                error={errors.new_password?.message}
                registerProps={register("new_password", {
                  validate: (value) => !value || value.length >= 12 || "Usa al menos 12 caracteres.",
                })}
              />
              <PasswordField
                id="confirm-password"
                label="Confirmar contrasena"
                autoComplete="new-password"
                error={errors.confirm_password?.message}
                registerProps={register("confirm_password", {
                  validate: (value) => !newPassword || value === newPassword || "Las contrasenas no coinciden.",
                })}
              />
            </div>

            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#626262]">
              Minimo 12 caracteres para una nueva contrasena
            </p>
            {errors.root?.message ? (
              <div role="alert" className="border-l border-red-200/50 bg-red-200/[0.04] px-4 py-3 text-[12px] text-red-100">
                {errors.root.message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-[#f2f2f2] text-[10px] font-semibold uppercase tracking-[0.14em] text-black transition-opacity disabled:opacity-45 sm:w-auto sm:px-6"
            >
              <KeyRound size={15} />
              {mutation.isPending ? "Actualizando" : "Guardar y cerrar sesiones"}
            </button>
          </form>
        </GlassPanel>

        <div className="space-y-5">
          <GlassPanel eyebrow="Cuenta activa" title={session?.username ?? "Administrador"} className="p-5">
            <div className="mt-5 flex items-start gap-4 border-t border-white/[0.06] pt-5">
              <ShieldCheck size={18} strokeWidth={1.4} className="mt-0.5 text-[#b8b8b8]" />
              <div>
                <p className="text-[13px] font-medium">Sesion protegida</p>
                <p className="mt-2 text-[12px] leading-5 text-[#707070]">
                  Cookie segura, validacion CSRF y credenciales almacenadas mediante hash.
                </p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="flex items-start gap-4">
              <LogOut size={18} strokeWidth={1.4} className="mt-0.5 text-[#b8b8b8]" />
              <div>
                <p className="text-[13px] font-medium">Cierre global inmediato</p>
                <p className="mt-2 text-[12px] leading-5 text-[#707070]">
                  El cambio invalida esta sesion y cualquier otra abierta. La recuperacion de acceso se mantiene fuera del portal por seguridad.
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>
      </section>
    </main>
  );
}
