import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useAdminSession } from "../auth/AdminSessionProvider";

interface LoginFields {
  username: string;
  password: string;
}

export default function AdminLoginPage() {
  const { session, login } = useAdminSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const routeState = location.state as { from?: string; notice?: string } | null;
  const notice = routeState?.notice ?? (
    searchParams.get("credentials") === "updated"
      ? "Credenciales actualizadas. Inicia sesion de nuevo para continuar."
      : null
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({ defaultValues: { username: "admin", password: "" } });

  if (session) return <Navigate to="/admin" replace />;

  const submit = handleSubmit(async (fields) => {
    setServerError(null);
    try {
      await login(fields);
      const destination = routeState?.from ?? "/admin";
      navigate(destination, { replace: true });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No se pudo iniciar sesion");
    }
  });

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050505] px-5 py-12 text-[#f2f2f2]">
      <div className="dashboard-grid pointer-events-none absolute inset-0 opacity-55" />
      <Link
        to="/"
        className="focus-ring absolute left-5 top-5 z-10 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#707070] hover:text-[#f2f2f2]"
      >
        <ArrowLeft size={14} /> Inicio
      </Link>
      <section className="relative z-10 w-full max-w-[430px]">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#626262]">
              7F / Admin
            </p>
            <h1 className="mt-2 text-[34px] font-medium tracking-[-0.055em]">Control de taller</h1>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-[4px] border border-white/[0.08] bg-white/[0.03]">
            <LockKeyhole size={18} strokeWidth={1.4} />
          </span>
        </div>
        <form
          onSubmit={submit}
          className="rounded-[6px] border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl"
        >
          {notice ? (
            <div className="mb-5 border-l border-white/40 bg-white/[0.035] px-4 py-3 text-[12px] leading-relaxed text-[#b8b8b8]">
              {notice}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-[#707070]">
              Usuario
            </span>
            <input
              autoComplete="username"
              className="focus-ring h-12 w-full rounded-[4px] border border-white/[0.08] bg-black/50 px-4 text-sm outline-none"
              {...register("username", { required: true })}
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.2em] text-[#707070]">
              Contrasena
            </span>
            <input
              type="password"
              autoComplete="current-password"
              className="focus-ring h-12 w-full rounded-[4px] border border-white/[0.08] bg-black/50 px-4 text-sm outline-none"
              {...register("password", { required: true, minLength: 8 })}
            />
          </label>
          {errors.password ? (
            <p className="mt-3 text-[12px] text-red-200">La credencial no es valida.</p>
          ) : null}
          {serverError ? <p className="mt-3 text-[12px] text-red-200">{serverError}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="focus-ring mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-[#f2f2f2] text-[11px] font-semibold uppercase tracking-[0.14em] text-black disabled:opacity-45"
          >
            {isSubmitting ? "Validando" : "Acceder"}
            {!isSubmitting ? <ArrowRight size={15} /> : null}
          </button>
        </form>
      </section>
    </main>
  );
}
