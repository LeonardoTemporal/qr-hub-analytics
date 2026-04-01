/**
 * Dashboard de Analiticas - 7Fitment
 *
 * Panel profesional premium con estetica luxury automotive
 * Arquitectura modular con componentes separados
 * Totalmente responsive (mobile-first)
 */

"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import {
  LineChart,
  Line,
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

// Components
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardKPICard } from "@/components/DashboardKPICard";
import { DashboardChartCard } from "@/components/DashboardChartCard";
import { DashboardLocationList } from "@/components/DashboardLocationList";
import { DashboardLoginForm } from "@/components/DashboardLoginForm";
import { DashboardLoadingState } from "@/components/DashboardLoadingState";
import { DashboardErrorState } from "@/components/DashboardErrorState";
import { ScrollSection } from "@/components/ScrollSection";
import { Footer } from "@/components/Footer";
import { GradientBackground } from "@/components/GradientBackground";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  campaign_id: string;
  kpis: {
    total_scans: number;
    recent_scans_7d: number;
  };
  time_series: Array<{ date: string; scans: number }>;
  device_distribution: Array<{ name: string; value: number }>;
  os_distribution: Array<{ name: string; value: number }>;
  browser_distribution: Array<{ name: string; value: number }>;
  top_countries: Array<{ name: string; value: number }>;
  top_cities: Array<{ name: string; value: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = {
  devices: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a"],
  os: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b", "#3f3f46"],
  browsers: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b"],
};

const MASTER_PASSWORD = "7fitment2026";

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

// Animation variants
const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV Export Function
// ─────────────────────────────────────────────────────────────────────────────
function exportToCSV(data: AnalyticsData) {
  const rows = [
    ["7Fitment Analytics Report"],
    [`Generated: ${new Date().toLocaleDateString()}`],
    [""],
    ["KPIs"],
    ["Metrica", "Valor"],
    ["Total Escaneos", data.kpis.total_scans.toString()],
    ["Ultimos 7 dias", data.kpis.recent_scans_7d.toString()],
    [""],
    ["Serie de Tiempo"],
    ["Fecha", "Escaneos"],
    ...data.time_series.map((item) => [item.date, item.scans.toString()]),
    [""],
    ["Dispositivos"],
    ["Dispositivo", "Escaneos"],
    ...data.device_distribution.map((item) => [item.name, item.value.toString()]),
    [""],
    ["Sistemas Operativos"],
    ["OS", "Escaneos"],
    ...data.os_distribution.map((item) => [item.name, item.value.toString()]),
    [""],
    ["Navegadores"],
    ["Navegador", "Escaneos"],
    ...data.browser_distribution.map((item) => [item.name, item.value.toString()]),
    [""],
    ["Paises"],
    ["Pais", "Escaneos"],
    ...data.top_countries.map((item) => [item.name, item.value.toString()]),
    [""],
    ["Ciudades"],
    ["Ciudad", "Escaneos"],
    ...data.top_cities.map((item) => [item.name, item.value.toString()]),
  ];

  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `7fitment_reporte_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// Distribution Legend Component
// ─────────────────────────────────────────────────────────────────────────────
function DistributionLegend({ 
  items, 
  colors 
}: { 
  items: Array<{ name: string; value: number }>; 
  colors: string[];
}) {
  return (
    <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
      {items.slice(0, 3).map((item, index) => (
        <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-zinc-400 truncate">{item.name}</span>
          </div>
          <span className="text-white font-medium tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const auth = sessionStorage.getItem("dashboard_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem("dashboard_auth", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("dashboard_auth");
    setIsAuthenticated(false);
    setData(null);
  };

  // Fetch analytics data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchAnalytics() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const url = `${apiUrl}/api/analytics/7fitment`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const analyticsData = await response.json();
        setData(analyticsData);
      } catch (err) {
        setError(
          `Error cargando analiticas: ${err instanceof Error ? err.message : "Error desconocido"}`
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [isAuthenticated]);

  // Login state
  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <DashboardLoginForm key="login" onLogin={handleLogin} masterPassword={MASTER_PASSWORD} />
      </AnimatePresence>
    );
  }

  // Loading state
  if (loading) {
    return <DashboardLoadingState />;
  }

  // Error state
  if (error || !data) {
    return <DashboardErrorState error={error} onRetry={handleLogout} />;
  }

  // Main dashboard
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-black"
      >
        {/* Background gradient */}
        <GradientBackground variant="top" intensity="subtle" />

        {/* Fixed Header */}
        <DashboardHeader ownerName="Leslye" onLogout={handleLogout} />

        {/* Main Content */}
        <main className="pt-24 sm:pt-28 pb-16 sm:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Hero Section - Title and Actions */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12 sm:mb-16 lg:mb-20"
            >
              <div className="flex flex-col gap-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-3 tracking-tight">
                    <span className="gradient-text font-medium">7Fitment</span> Analytics
                  </h1>
                  <p className="text-sm sm:text-base text-zinc-500 max-w-xl">
                    Metricas en tiempo real de tus escaneos QR
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-500 bg-white/[0.03] px-4 py-2 rounded-full border border-white/[0.08]">
                    <Calendar size={14} strokeWidth={1.5} />
                    <span>Ultimos 30 dias</span>
                  </div>

                  <motion.button
                    onClick={() => exportToCSV(data)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 bg-white hover:bg-zinc-100 text-black text-xs sm:text-sm font-medium rounded-full transition-all duration-300 shadow-lg"
                  >
                    <Download size={14} strokeWidth={2} />
                    <span>Exportar CSV</span>
                  </motion.button>
                </div>
              </div>
            </motion.section>

            {/* KPIs Grid */}
            <motion.section
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="mb-12 sm:mb-16 lg:mb-20"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <DashboardKPICard
                  title="Total Escaneos"
                  value={data.kpis.total_scans}
                  icon={TrendingUp}
                  iconBgClass="bg-white"
                  index={0}
                />
                <DashboardKPICard
                  title="Ultimos 7 dias"
                  value={data.kpis.recent_scans_7d}
                  icon={Activity}
                  trend="+12.5%"
                  iconBgClass="bg-zinc-200"
                  index={1}
                />
                <DashboardKPICard
                  title="Dispositivos"
                  value={data.device_distribution.length}
                  icon={Smartphone}
                  iconBgClass="bg-zinc-400"
                  index={2}
                />
                <DashboardKPICard
                  title="Paises"
                  value={data.top_countries.length}
                  icon={Globe}
                  iconBgClass="bg-zinc-600"
                  index={3}
                />
              </div>
            </motion.section>

            {/* Time Series Chart */}
            <ScrollSection className="mb-12 sm:mb-16 lg:mb-20">
              <DashboardChartCard title="Tendencia de Escaneos" icon={BarChart3}>
                <div className="h-64 sm:h-72 lg:h-80 -mx-2 sm:mx-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={data.time_series} 
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#52525b"
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(dateStr) => {
                          const date = new Date(dateStr);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis 
                        stroke="#52525b" 
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                      />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        labelFormatter={(dateStr) => {
                          const date = new Date(dateStr);
                          return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="scans"
                        stroke="#ffffff"
                        strokeWidth={2}
                        dot={{ fill: "#ffffff", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#ffffff" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </DashboardChartCard>
            </ScrollSection>

            {/* Distribution Charts */}
            <ScrollSection delay={0.1} className="mb-12 sm:mb-16 lg:mb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                
                {/* Device Distribution */}
                <DashboardChartCard title="Dispositivos" icon={Monitor}>
                  <div className="h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={data.device_distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="80%"
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {data.device_distribution.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS.devices[index % COLORS.devices.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <DistributionLegend items={data.device_distribution} colors={COLORS.devices} />
                </DashboardChartCard>

                {/* OS Distribution */}
                <DashboardChartCard title="Sistemas Operativos" icon={Smartphone}>
                  <div className="h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={data.os_distribution.slice(0, 5)}
                        margin={{ top: 0, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis 
                          type="number" 
                          stroke="#52525b" 
                          tick={{ fill: '#71717a', fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          stroke="#52525b"
                          tick={{ fill: '#a1a1aa', fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={70}
                        />
                        <Tooltip {...TOOLTIP_STYLE} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#ffffff" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </DashboardChartCard>

                {/* Browser Distribution */}
                <DashboardChartCard title="Navegadores" icon={PieChart}>
                  <div className="h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={data.browser_distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius="55%"
                          outerRadius="80%"
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {data.browser_distribution.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS.browsers[index % COLORS.browsers.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <DistributionLegend items={data.browser_distribution} colors={COLORS.browsers} />
                </DashboardChartCard>
              </div>
            </ScrollSection>

            {/* Location Data */}
            <ScrollSection delay={0.2} className="mb-12 sm:mb-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <DashboardLocationList
                  title="Top Paises"
                  icon={Globe}
                  locations={data.top_countries}
                />
                <DashboardLocationList
                  title="Top Ciudades"
                  icon={MapPin}
                  locations={data.top_cities}
                />
              </div>
            </ScrollSection>

          </div>
        </main>

        {/* Footer */}
        <Footer />
      </motion.div>
    </AnimatePresence>
  );
}
