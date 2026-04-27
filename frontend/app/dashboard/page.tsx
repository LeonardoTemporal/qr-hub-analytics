/**
 * Dashboard de Analiticas - 7Fitment
 *
 * Conectado a los 4 endpoints especializados del backend:
 *   GET /api/analytics/summary/{campaign_id}
 *   GET /api/analytics/distribution/{campaign_id}
 *   GET /api/analytics/location/{campaign_id}
 *   GET /api/analytics/timeline/{campaign_id}?range=hoy|7d|30d
 *
 * Auth: HTTP Basic guardado en sessionStorage tras POST /api/auth/login.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp,
  Smartphone,
  Monitor,
  Globe,
  BarChart3,
  PieChart,
  Calendar,
  MapPin,
  Activity,
  Download,
  Building2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardKPICard } from "@/components/DashboardKPICard";
import { DashboardChartCard } from "@/components/DashboardChartCard";
import { DashboardLocationList } from "@/components/DashboardLocationList";
import { DashboardLoginForm } from "@/components/DashboardLoginForm";
import { DashboardLoadingState } from "@/components/DashboardLoadingState";
import { DashboardErrorState } from "@/components/DashboardErrorState";
import { ScrollSection } from "@/components/ScrollSection";
import { GradientBackground } from "@/components/GradientBackground";
import { authFetch, clearStoredAuth, UnauthorizedError } from "@/lib/auth-fetch";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos backend
// ─────────────────────────────────────────────────────────────────────────────
interface NameValue {
  name: string;
  value: number;
}

interface SummaryResponse {
  campaign_id: string;
  total_scans: number;
  recent_scans_7d: number;
  scans_30d: number;
  daily_avg: number;
  unique_devices: number;
  unique_countries: number;
}

interface DistributionResponse {
  campaign_id: string;
  devices: NameValue[];
  os: NameValue[];
  browsers: NameValue[];
}

interface LocationResponse {
  campaign_id: string;
  countries: NameValue[];
  states: NameValue[];
  cities: NameValue[];
}

interface TimelinePoint {
  date: string;
  scans: number;
}

interface TimelineResponse {
  campaign_id: string;
  range: TimeRange;
  bucket: "day" | "hour";
  series: TimelinePoint[];
}

type TimeRange = "hoy" | "7d" | "30d";

const CAMPAIGN_ID = "7fitment";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes visuales
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = {
  devices: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a"],
  os: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b", "#3f3f46"],
  browsers: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b"],
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#0a0a0a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    color: "#fff",
    padding: "12px 16px",
  },
  itemStyle: { color: "#a1a1aa" },
};

const RANGE_LABEL: Record<TimeRange, string> = {
  hoy: "Hoy",
  "7d": "Ultimos 7 dias",
  "30d": "Ultimos 30 dias",
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────────────────────────────────────
function exportToCSV(
  summary: SummaryResponse,
  distribution: DistributionResponse,
  location: LocationResponse,
  timeline: TimelineResponse,
): void {
  const rows: string[][] = [
    ["7Fitment Analytics Report"],
    [`Generated: ${new Date().toLocaleDateString()}`],
    [""],
    ["KPIs"],
    ["Metrica", "Valor"],
    ["Total Escaneos", String(summary.total_scans)],
    ["Ultimos 7 dias", String(summary.recent_scans_7d)],
    ["Promedio diario", String(summary.daily_avg)],
    ["Dispositivos unicos", String(summary.unique_devices)],
    ["Paises unicos", String(summary.unique_countries)],
    [""],
    ["Serie de Tiempo"],
    ["Fecha", "Escaneos"],
    ...timeline.series.map((p) => [p.date, String(p.scans)]),
    [""],
    ["Dispositivos"],
    ["Dispositivo", "Escaneos"],
    ...distribution.devices.map((d) => [d.name, String(d.value)]),
    [""],
    ["Sistemas Operativos"],
    ["OS", "Escaneos"],
    ...distribution.os.map((d) => [d.name, String(d.value)]),
    [""],
    ["Navegadores"],
    ["Navegador", "Escaneos"],
    ...distribution.browsers.map((d) => [d.name, String(d.value)]),
    [""],
    ["Paises"],
    ["Pais", "Escaneos"],
    ...location.countries.map((d) => [d.name, String(d.value)]),
    [""],
    ["Estados / Subdivisiones"],
    ["Estado", "Escaneos"],
    ...location.states.map((d) => [d.name, String(d.value)]),
    [""],
    ["Ciudades / Municipios"],
    ["Ciudad", "Escaneos"],
    ...location.cities.map((d) => [d.name, String(d.value)]),
  ];

  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute(
    "download",
    `7fitment_reporte_${new Date().toISOString().split("T")[0]}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// Distribution Legend
// ─────────────────────────────────────────────────────────────────────────────
function DistributionLegend({
  items,
  colors,
}: {
  items: NameValue[];
  colors: string[];
}) {
  return (
    <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
      {items.slice(0, 3).map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="flex items-center justify-between text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-zinc-400 truncate">{item.name}</span>
          </div>
          <span className="text-white font-medium tabular-nums">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Time Range Selector
// ─────────────────────────────────────────────────────────────────────────────
function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
}) {
  const options: TimeRange[] = ["hoy", "7d", "30d"];
  return (
    <div className="inline-flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-full p-1">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 sm:px-5 py-1.5 text-xs sm:text-sm rounded-full transition-all ${
              active
                ? "bg-white text-black font-medium shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {RANGE_LABEL[opt]}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline tick formatter
// ─────────────────────────────────────────────────────────────────────────────
function formatTimelineTick(dateStr: string, range: TimeRange): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  if (range === "hoy") {
    return `${date.getHours().toString().padStart(2, "0")}:00`;
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [distribution, setDistribution] = useState<DistributionResponse | null>(null);
  const [location, setLocation] = useState<LocationResponse | null>(null);
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [range, setRange] = useState<TimeRange>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const auth = sessionStorage.getItem("dashboard_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    setLoading(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearStoredAuth();
    setIsAuthenticated(false);
    setSummary(null);
    setDistribution(null);
    setLocation(null);
    setTimeline(null);
    setError(null);
    setLoading(true);
  }, []);

  // Fetch initial bundle (summary + distribution + location + timeline) en paralelo.
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [sum, dist, loc, tl] = await Promise.all([
          authFetch<SummaryResponse>(`/api/analytics/summary/${CAMPAIGN_ID}`),
          authFetch<DistributionResponse>(
            `/api/analytics/distribution/${CAMPAIGN_ID}`,
          ),
          authFetch<LocationResponse>(`/api/analytics/location/${CAMPAIGN_ID}`),
          authFetch<TimelineResponse>(
            `/api/analytics/timeline/${CAMPAIGN_ID}?range=${range}`,
          ),
        ]);

        if (cancelled) return;
        setSummary(sum);
        setDistribution(dist);
        setLocation(loc);
        setTimeline(tl);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof UnauthorizedError) {
          setIsAuthenticated(false);
          setError(null);
        } else {
          const message =
            err instanceof Error ? err.message : "Error desconocido";
          setError(`Error cargando analiticas: ${message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, range]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render: Login / Loading / Error / Dashboard
  // ──────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <DashboardLoginForm key="login" onLogin={handleLogin} />
      </AnimatePresence>
    );
  }

  if (loading || !summary || !distribution || !location || !timeline) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return <DashboardErrorState error={error} onRetry={handleLogout} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-black flex flex-col"
      >
        <GradientBackground variant="top" intensity="subtle" />

        <DashboardHeader ownerName="Leslye" onLogout={handleLogout} />

        <main className="flex-grow flex flex-col">
          <div className="h-20 sm:h-24 flex-shrink-0" aria-hidden="true" />

          <div className="flex-grow px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-12 sm:gap-16 lg:gap-20">
              {/* Hero */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col gap-6 sm:gap-8"
              >
                <div className="space-y-2 sm:space-y-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white tracking-tight">
                    <span className="gradient-text font-medium">7Fitment</span>{" "}
                    Analytics
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-zinc-500 max-w-2xl">
                    Metricas en tiempo real de tus escaneos QR
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <TimeRangeSelector value={range} onChange={setRange} />

                  <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-500 bg-white/[0.03] px-4 sm:px-5 py-2.5 rounded-full border border-white/[0.08]">
                    <Calendar size={14} strokeWidth={1.5} />
                    <span>{RANGE_LABEL[range]}</span>
                  </div>

                  <motion.button
                    onClick={() =>
                      exportToCSV(summary, distribution, location, timeline)
                    }
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-white hover:bg-zinc-100 text-black text-xs sm:text-sm font-medium rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Download size={14} strokeWidth={2} />
                    <span>Exportar CSV</span>
                  </motion.button>
                </div>
              </motion.section>

              {/* KPIs */}
              <motion.section
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                  <DashboardKPICard
                    title="Total Escaneos"
                    value={summary.total_scans}
                    icon={TrendingUp}
                    iconBgClass="bg-white"
                    index={0}
                  />
                  <DashboardKPICard
                    title="Ultimos 7 dias"
                    value={summary.recent_scans_7d}
                    icon={Activity}
                    iconBgClass="bg-zinc-200"
                    index={1}
                  />
                  <DashboardKPICard
                    title="Promedio diario"
                    value={summary.daily_avg}
                    icon={Smartphone}
                    iconBgClass="bg-zinc-400"
                    index={2}
                  />
                  <DashboardKPICard
                    title="Paises"
                    value={summary.unique_countries}
                    icon={Globe}
                    iconBgClass="bg-zinc-600"
                    index={3}
                  />
                </div>
              </motion.section>

              {/* Timeline */}
              <ScrollSection>
                <DashboardChartCard
                  title="Tendencia de Escaneos"
                  icon={BarChart3}
                >
                  <div className="h-64 sm:h-72 lg:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={timeline.series}
                        margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
                      >
                        <defs>
                          <linearGradient
                            id="scansGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.05)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="#52525b"
                          tick={{ fill: "#71717a", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(d: string) =>
                            formatTimelineTick(d, range)
                          }
                        />
                        <YAxis
                          stroke="#52525b"
                          tick={{ fill: "#71717a", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                        />
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          labelFormatter={(label) =>
                            typeof label === "string"
                              ? formatTimelineTick(label, range)
                              : String(label ?? "")
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="scans"
                          stroke="#ffffff"
                          strokeWidth={2}
                          fill="url(#scansGradient)"
                          dot={{ fill: "#ffffff", r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: "#ffffff" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </DashboardChartCard>
              </ScrollSection>

              {/* Distributions */}
              <ScrollSection delay={0.1}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  <DashboardChartCard title="Dispositivos" icon={Monitor}>
                    <div className="h-52 sm:h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={distribution.devices}
                            cx="50%"
                            cy="50%"
                            innerRadius="50%"
                            outerRadius="75%"
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {distribution.devices.map((_, index) => (
                              <Cell
                                key={`cell-dev-${index}`}
                                fill={COLORS.devices[index % COLORS.devices.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip {...TOOLTIP_STYLE} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <DistributionLegend
                      items={distribution.devices}
                      colors={COLORS.devices}
                    />
                  </DashboardChartCard>

                  <DashboardChartCard
                    title="Sistemas Operativos"
                    icon={Smartphone}
                  >
                    <div className="h-52 sm:h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={distribution.os.slice(0, 5)}
                          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                            horizontal={false}
                          />
                          <XAxis
                            type="number"
                            stroke="#52525b"
                            tick={{ fill: "#71717a", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#52525b"
                            tick={{ fill: "#a1a1aa", fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={80}
                          />
                          <Tooltip {...TOOLTIP_STYLE} />
                          <Bar
                            dataKey="value"
                            radius={[0, 6, 6, 0]}
                            fill="#ffffff"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </DashboardChartCard>

                  <DashboardChartCard title="Navegadores" icon={PieChart}>
                    <div className="h-52 sm:h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={distribution.browsers}
                            cx="50%"
                            cy="50%"
                            innerRadius="50%"
                            outerRadius="75%"
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {distribution.browsers.map((_, index) => (
                              <Cell
                                key={`cell-br-${index}`}
                                fill={
                                  COLORS.browsers[index % COLORS.browsers.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip {...TOOLTIP_STYLE} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <DistributionLegend
                      items={distribution.browsers}
                      colors={COLORS.browsers}
                    />
                  </DashboardChartCard>
                </div>
              </ScrollSection>

              {/* Location: Países / Estados / Municipios */}
              <ScrollSection delay={0.2}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  <DashboardLocationList
                    title="Top Paises"
                    icon={Globe}
                    locations={location.countries}
                  />
                  <DashboardLocationList
                    title="Top Estados"
                    icon={Building2}
                    locations={location.states}
                  />
                  <DashboardLocationList
                    title="Top Municipios"
                    icon={MapPin}
                    locations={location.cities}
                  />
                </div>
              </ScrollSection>
            </div>
          </div>
        </main>

        <footer className="flex-shrink-0 py-8 sm:py-10 border-t border-white/[0.03]">
          <p className="text-center text-[10px] sm:text-xs text-zinc-600 select-none">
            Powered by{" "}
            <span className="text-zinc-500">QR-Hub Analytics</span>
            {" | "}
            <span className="gradient-text">by HellSpawn</span>
          </p>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
