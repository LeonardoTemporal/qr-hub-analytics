import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Download,
  Globe2,
  Lock,
  LogOut,
  MapPin,
  Monitor,
  PieChart as PieChartIcon,
  Smartphone,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  clearSession,
  CAMPAIGN_OPTIONS,
  DEFAULT_CAMPAIGN_ID,
  fetchAnalytics,
  login,
  QR_GENERAL_TRACKING_URL,
  validateSession,
  type AnalyticsBundle,
  type NameValue,
  type TimeRange,
} from "../lib/api";

const ranges: { label: string; value: TimeRange }[] = [
  { label: "Hoy", value: "hoy" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
];

const chartColors = ["#f2f2f2", "#cfcfcf", "#9a9a9a", "#6a6a6a", "#3f3f3f"];

const tooltipStyle = {
  background: "#0a0a0a",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "6px",
  color: "#f2f2f2",
};

function formatDateTick(value: string, range: TimeRange): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (range === "hoy") return `${String(date.getHours()).padStart(2, "0")}:00`;
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function AnimatedNumber({ value }: { value: number | string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    if (typeof value !== "number") {
      node.textContent = value;
      return;
    }

    const state = { value: 0 };
    const tween = gsap.to(state, {
      value,
      duration: 1.25,
      ease: "power4.out",
      onUpdate: () => {
        node.textContent = Math.round(state.value).toLocaleString("es-MX");
      },
    });

    return () => {
      tween.kill();
    };
  }, [value]);

  return <span ref={nodeRef}>{typeof value === "number" ? 0 : value}</span>;
}

function KpiCard({
  title,
  value,
  icon: Icon,
  index,
}: {
  title: string;
  value: number | string;
  icon: LucideIcon;
  index: number;
}) {
  return (
    <article className="dash-reveal group relative overflow-hidden rounded-[6px] border border-white/[0.07] bg-white/[0.03] p-5 transition-colors duration-500 hover:border-white/[0.14] hover:bg-white/[0.055] sm:p-6">
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),transparent_48%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.24em] text-[#707070]">
            {title}
          </p>
          <p className="text-[38px] font-light leading-none tracking-[-0.06em] text-[#f2f2f2] sm:text-[44px]">
            <AnimatedNumber value={value} />
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] bg-[#f2f2f2] text-black">
          <Icon size={20} strokeWidth={1.5} />
        </div>
      </div>
      <div className="relative mt-5 h-px w-full bg-white/[0.06]">
        <span
          className="block h-px bg-white/40"
          style={{ width: `${Math.min(100, (index + 1) * 22)}%` }}
        />
      </div>
    </article>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`dash-reveal rounded-[6px] border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl transition-colors duration-500 hover:border-white/[0.12] hover:bg-white/[0.05] sm:p-6 ${className}`}>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-[4px] border border-white/[0.07] bg-white/[0.03] text-[#b8b8b8]">
          <Icon size={17} strokeWidth={1.5} />
        </span>
        <h2 className="text-[15px] font-medium tracking-[-0.04em] text-[#f2f2f2]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-[4px] border border-dashed border-white/[0.08] px-6 text-center text-[13px] text-[#707070]">
      Sin datos registrados en PostgreSQL para este rango.
    </div>
  );
}

function DistributionLegend({ items, colors }: { items: NameValue[]; colors: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-5 space-y-3">
      {items.slice(0, 4).map((item, index) => (
        <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 text-[13px]">
          <span className="flex min-w-0 items-center gap-2 text-[#9a9a9a]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="truncate">{item.name}</span>
          </span>
          <span className="font-medium tabular-nums text-[#f2f2f2]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function LocationList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: NameValue[];
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <Panel title={title} icon={Icon}>
      {items.length ? (
        <div className="space-y-4">
          {items.slice(0, 8).map((item, index) => (
            <div key={`${item.name}-${index}`}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="truncate text-[13px] text-[#a8a8a8]">{item.name}</span>
                <span className="text-[13px] font-medium tabular-nums text-[#f2f2f2]">
                  {item.value}
                </span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#f2f2f2,#707070)]"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </Panel>
  );
}

function exportCsv(bundle: AnalyticsBundle, campaignId: string): void {
  const rows = [
    ["7Fitment Analytics"],
    ["Generado", new Date().toISOString()],
    ["Campana", campaignId],
    ["Total", String(bundle.kpis.total_scans)],
    ["Ultimos 7 dias", String(bundle.kpis.recent_scans_7d)],
    ["Promedio diario", String(bundle.kpis.daily_avg)],
    [""],
    ["Timeline"],
    ["Fecha", "Escaneos"],
    ...bundle.timeline.series.map((point) => [point.date, String(point.scans)]),
    [""],
    ["Estados"],
    ["Nombre", "Escaneos"],
    ...bundle.geo.states.map((item) => [item.name, String(item.value)]),
    [""],
    ["Municipios"],
    ["Nombre", "Escaneos"],
    ...bundle.geo.municipalities.map((item) => [item.name, String(item.value)]),
  ];

  const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `7fitment_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function LoginGate({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-5 py-10 text-[#f2f2f2]">
      <div className="dashboard-grid pointer-events-none absolute inset-0 opacity-60" />
      <a href="/" className="focus-ring absolute left-5 top-5 z-10 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[#707070] transition-colors hover:text-[#f2f2f2]">
        <ArrowLeft size={15} />
        Inicio
      </a>
      <section className="relative z-10 w-full max-w-[460px]">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[6px] border border-white/[0.08] bg-white/[0.03]">
            <span className="text-[22px] font-semibold tracking-[-0.06em]">7F</span>
          </div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.26em] text-[#707070]">
            Acceso seguro
          </p>
          <h1 className="text-[42px] font-light leading-none tracking-[-0.06em] sm:text-[54px]">
            Analytics
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[6px] border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-white/[0.08] bg-white/[0.03] text-[#b8b8b8]">
              <Lock size={18} strokeWidth={1.5} />
            </span>
            <div>
              <h2 className="text-[18px] font-medium tracking-[-0.04em]">Dashboard</h2>
              <p className="mt-1 text-[13px] text-[#707070]">Ingresa la clave de administracion</p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.22em] text-[#707070]">
              Clave
            </span>
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="focus-ring h-[54px] w-full rounded-[4px] border border-white/[0.08] bg-black/50 px-4 text-[#f2f2f2] outline-none transition-colors hover:border-white/[0.14]"
            />
          </label>

          {error ? <p className="mt-4 text-center text-[13px] text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={!password || submitting}
            className="focus-ring mt-6 inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[4px] bg-[#f2f2f2] text-[13px] font-semibold uppercase tracking-[0.12em] text-black transition-opacity disabled:opacity-45"
          >
            {submitting ? "Validando" : "Ingresar"}
            {!submitting ? <ArrowRight size={16} strokeWidth={1.8} /> : null}
          </button>
        </form>
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] text-[#707070]">
      <div className="text-center">
        <Activity className="mx-auto mb-4 animate-spin text-[#f2f2f2]" size={28} strokeWidth={1.5} />
        <p className="text-[11px] font-medium uppercase tracking-[0.24em]">Cargando analiticas</p>
      </div>
    </main>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-[#f2f2f2]">
      <section className="max-w-[460px] rounded-[6px] border border-white/[0.08] bg-white/[0.03] p-7 text-center">
        <BarChart3 className="mx-auto mb-5 text-[#707070]" size={30} strokeWidth={1.5} />
        <h1 className="text-[24px] font-medium tracking-[-0.04em]">Error al cargar datos</h1>
        <p className="mt-3 text-[14px] leading-6 text-[#8a8a8a]">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-6 rounded-[4px] border border-white/[0.1] px-5 py-3 text-[12px] font-medium uppercase tracking-[0.16em] text-[#d8d8d8]"
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [range, setRange] = useState<TimeRange>("30d");
  const [campaignId, setCampaignId] = useState(DEFAULT_CAMPAIGN_ID);
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    validateSession().then((valid) => {
      if (!cancelled) setAuthenticated(valid);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAnalytics(range, campaignId);
      setBundle(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando analiticas");
    } finally {
      setLoading(false);
    }
  }, [campaignId, range]);

  useEffect(() => {
    if (authenticated) void load();
  }, [authenticated, load]);

  useEffect(() => {
    if (!bundle || !dashboardRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(".dash-reveal", { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".dash-reveal",
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power4.out", stagger: 0.065 },
      );
    }, dashboardRef);

    return () => ctx.revert();
  }, [bundle, campaignId, range]);

  const topMunicipalities = useMemo(
    () => bundle?.geo.municipalities ?? bundle?.geo.cities ?? [],
    [bundle],
  );

  if (authenticated === null) return <LoadingState />;
  if (!authenticated) return <LoginGate onLogin={() => setAuthenticated(true)} />;
  if (loading && !bundle) return <LoadingState />;
  if (error && !bundle) return <ErrorState error={error} onRetry={load} />;

  return (
    <main ref={dashboardRef} className="dashboard-grid min-h-screen bg-[#050505] text-[#f2f2f2]">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-4">
            <a href="/" className="focus-ring hidden h-11 w-11 items-center justify-center rounded-[4px] bg-[#f2f2f2] text-[14px] font-semibold tracking-[-0.06em] text-black sm:flex">
              7F
            </a>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#707070]">
                QR Analytics
              </p>
              <h1 className="mt-1 text-[18px] font-medium tracking-[-0.04em]">
                7Fitment Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href="/" className="focus-ring hidden items-center gap-2 rounded-[4px] border border-white/[0.08] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9a9a] transition-colors hover:text-[#f2f2f2] md:inline-flex">
              <ArrowLeft size={14} />
              Sitio
            </a>
            <button
              type="button"
              onClick={() => {
                clearSession();
                setAuthenticated(false);
                setBundle(null);
              }}
              className="focus-ring inline-flex items-center gap-2 rounded-[4px] border border-white/[0.08] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9a9a] transition-colors hover:text-[#f2f2f2]"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-12">
        <section className="dash-reveal mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.26em] text-[#707070]">
              Metricas en tiempo real
            </p>
            <h2 className="max-w-3xl text-[clamp(2.5rem,7vw,5.7rem)] font-light leading-none tracking-[-0.07em]">
              Lectura clara de cada escaneo QR.
            </h2>
            <p className="mt-5 max-w-2xl text-[13px] leading-6 text-[#7f7f7f]">
              QR de prueba listo: <span className="font-medium text-[#d8d8d8]">{QR_GENERAL_TRACKING_URL}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[4px] border border-white/[0.08] bg-white/[0.03] p-1">
              {ranges.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRange(item.value)}
                  className={`focus-ring h-9 rounded-[3px] px-4 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
                    range === item.value
                      ? "bg-[#f2f2f2] text-black"
                      : "text-[#8a8a8a] hover:text-[#f2f2f2]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="inline-flex h-11 items-center gap-2 rounded-[4px] border border-white/[0.08] px-4 text-[12px] text-[#8a8a8a]">
              <Calendar size={14} strokeWidth={1.5} />
              {ranges.find((item) => item.value === range)?.label}
            </span>
            <button
              type="button"
              onClick={() => bundle && exportCsv(bundle, campaignId)}
              disabled={!bundle}
              className="focus-ring inline-flex h-11 items-center gap-2 rounded-[4px] bg-[#f2f2f2] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-black disabled:opacity-45"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </section>

        <section className="dash-reveal mb-8 rounded-[6px] border border-white/[0.07] bg-white/[0.03] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#707070]">
                Campana activa
              </p>
              <h3 className="mt-1 text-[18px] font-medium tracking-[-0.04em] text-[#f2f2f2]">
                {CAMPAIGN_OPTIONS.find((item) => item.value === campaignId)?.label ?? campaignId}
              </h3>
            </div>
            <p className="max-w-xl text-[12px] leading-5 text-[#707070]">
              {CAMPAIGN_OPTIONS.find((item) => item.value === campaignId)?.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCampaignId(item.value)}
                className={`focus-ring h-10 rounded-[4px] border px-4 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
                  campaignId === item.value
                    ? "border-[#f2f2f2] bg-[#f2f2f2] text-black"
                    : "border-white/[0.08] bg-black/20 text-[#8a8a8a] hover:border-white/[0.14] hover:text-[#f2f2f2]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="dash-reveal mb-6 rounded-[4px] border border-red-300/20 bg-red-500/10 p-4 text-[14px] text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Total escaneos" value={bundle?.kpis.total_scans ?? (loading ? "..." : 0)} icon={TrendingUp} index={0} />
          <KpiCard title="Ultimos 7 dias" value={bundle?.kpis.recent_scans_7d ?? (loading ? "..." : 0)} icon={Activity} index={1} />
          <KpiCard title="Promedio diario" value={bundle?.kpis.daily_avg ?? (loading ? "..." : 0)} icon={Smartphone} index={2} />
          <KpiCard title="Paises" value={bundle?.kpis.unique_countries ?? (loading ? "..." : 0)} icon={Globe2} index={3} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <Panel title="Tendencia de escaneos" icon={BarChart3}>
            <div className="h-[340px]">
              {bundle?.timeline.series.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bundle.timeline.series} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="scanFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f2f2f2" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#f2f2f2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.055)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#707070", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatDateTick(String(value), range)}
                    />
                    <YAxis tick={{ fill: "#707070", fontSize: 12 }} tickLine={false} axisLine={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "#f2f2f2" }} />
                    <Area
                      type="monotone"
                      dataKey="scans"
                      stroke="#f2f2f2"
                      strokeWidth={2}
                      fill="url(#scanFill)"
                      isAnimationActive
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </Panel>

          <Panel title="Dispositivos" icon={Monitor}>
            <div className="h-[260px]">
              {bundle?.distribution.devices.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bundle.distribution.devices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="54%"
                      outerRadius="78%"
                      paddingAngle={4}
                      isAnimationActive
                      animationDuration={850}
                    >
                      {bundle.distribution.devices.map((_, index) => (
                        <Cell key={index} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
            <DistributionLegend items={bundle?.distribution.devices ?? []} colors={chartColors} />
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel title="Sistemas operativos" icon={Smartphone}>
            <div className="h-[280px]">
              {bundle?.distribution.os.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bundle.distribution.os.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.055)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#707070", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" width={82} tick={{ fill: "#b8b8b8", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" fill="#f2f2f2" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={850} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </Panel>

          <Panel title="Navegadores" icon={PieChartIcon}>
            <div className="h-[240px]">
              {bundle?.distribution.browsers.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bundle.distribution.browsers}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="50%"
                      outerRadius="76%"
                      paddingAngle={4}
                      isAnimationActive
                      animationDuration={850}
                    >
                      {bundle.distribution.browsers.map((_, index) => (
                        <Cell key={index} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
            <DistributionLegend items={bundle?.distribution.browsers ?? []} colors={chartColors} />
          </Panel>

          <LocationList title="Top municipios" icon={MapPin} items={topMunicipalities} />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <LocationList title="Top estados" icon={Building2} items={bundle?.geo.states ?? []} />
          <LocationList title="Top paises" icon={Globe2} items={bundle?.geo.countries ?? []} />
        </div>

        <footer className="mt-12 border-t border-white/[0.06] py-7 text-center text-[10px] uppercase tracking-[0.22em] text-[#575757]">
          QR-Hub Analytics · 7Fitment
        </footer>
      </div>
    </main>
  );
}
