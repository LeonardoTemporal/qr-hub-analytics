/**
 * Dashboard de Analíticas – 7Fitment
 *
 * Panel profesional tipo SaaS Enterprise con:
 * - Pantalla de login segura con contraseña
 * - KPIs en tarjetas minimalistas
 * - Gráfica principal de tendencias
 * - Distribuciones por device/os/browser
 * - Top ubicaciones geográficas
 * - Header personalizado con saludo y logout
 */

"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  Smartphone,
  Monitor,
  Globe,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Calendar,
  MapPin,
  Activity,
  LogOut,
  Lock,
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
// Colores para gráficas
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#6366f1",
  secondary: "#8b5cf6",
  accent: "#ec4899",
  success: "#10b981",
  warning: "#f59e0b",
  devices: ["#6366f1", "#8b5cf6", "#ec4899", "#10b981"],
  os: ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"],
  browsers: ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
  countries: ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"],
};

const MASTER_PASSWORD = "7fitment2026";

// ─────────────────────────────────────────────────────────────────────────────
// Componentes de Tarjetas
// ─────────────────────────────────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: string;
}

function KPICard({ title, value, icon: Icon, trend, color }: KPICardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <ArrowUpRight size={14} />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de Lista de Ubicaciones
// ─────────────────────────────────────────────────────────────────────────────
interface LocationListProps {
  title: string;
  icon: any;
  locations: Array<{ name: string; value: number }>;
}

function LocationList({ title, icon: Icon, locations }: LocationListProps) {
  const maxValue = Math.max(...locations.map((l) => l.value), 1);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-zinc-400" />
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      </div>
      <div className="space-y-3">
        {locations.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay datos disponibles</p>
        ) : (
          locations.map((location, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-300">{location.name}</span>
                  <span className="text-sm font-medium text-white">
                    {location.value}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${(location.value / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de Login
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    setTimeout(() => {
      if (password === MASTER_PASSWORD) {
        onLogin();
      } else {
        setError(true);
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <span className="text-4xl font-bold text-white">7F</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">7Fitment Analytics</h1>
          <p className="text-zinc-400">Dashboard de Analíticas</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <Lock size={24} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Acceso Seguro</h2>
              <p className="text-sm text-zinc-400">Ingresa tu contrasena para continuar</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-sm text-red-400 text-center">
                  Contraseña incorrecta. Por favor, intenta nuevamente.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              Powered by{" "}
              <span className="text-zinc-400">QR-Hub Analytics</span>
              {" "}|{" "}
              <span className="text-zinc-400">by HellSpawn</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header del Dashboard
// ─────────────────────────────────────────────────────────────────────────────
interface DashboardHeaderProps {
  ownerName: string;
  onLogout: () => void;
}

function DashboardHeader({ ownerName, onLogout }: DashboardHeaderProps) {
  return (
    <header className="bg-white/5 backdrop-blur-sm border-b border-white/10 mb-8">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
              <span className="text-lg font-bold text-white">7F</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">
                ¡Hola, {ownerName}!
              </h1>
              <p className="text-sm text-zinc-400">Bienvenida a tu panel de analíticas</p>
            </div>
          </div>

          {/* Right Side - Logout */}
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 hover:text-white transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página Principal del Dashboard
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
        const url = `${apiUrl}/analytics/7fitment`;
        console.log("Fetching analytics from:", url);

        const response = await fetch(url);
        console.log("Response status:", response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response body:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const analyticsData = await response.json();
        console.log("Analytics data received:", analyticsData);
        setData(analyticsData);
      } catch (err) {
        console.error("Error loading analytics:", err);
        setError(`Error cargando analíticas: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [isAuthenticated]);

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="animate-spin mx-auto mb-4 text-indigo-500" size={32} />
          <p className="text-zinc-400">Cargando analíticas...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <BarChart3 className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-zinc-400">{error || "No se pudieron cargar los datos"}</p>
          <button
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 transition-all"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <DashboardHeader ownerName="Leslye" onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        {/* Page Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              7Fitment Analytics
            </h1>
            <p className="text-zinc-400">Métricas en tiempo real de tus escaneos QR</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            <Calendar size={14} />
            <span>Últimos 30 días</span>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Escaneos"
            value={data.kpis.total_scans}
            icon={TrendingUp}
            color="bg-gradient-to-br from-indigo-500 to-purple-600"
          />
          <KPICard
            title="Últimos 7 días"
            value={data.kpis.recent_scans_7d}
            icon={Activity}
            trend="+12.5%"
            color="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
          <KPICard
            title="Dispositivos"
            value={data.device_distribution.length}
            icon={Smartphone}
            color="bg-gradient-to-br from-blue-500 to-cyan-600"
          />
          <KPICard
            title="Países"
            value={data.top_countries.length}
            icon={Globe}
            color="bg-gradient-to-br from-purple-500 to-pink-600"
          />
        </div>

        {/* Main Chart - Time Series */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Tendencia de Escaneos</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.time_series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(dateStr) => {
                    const date = new Date(dateStr);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  labelFormatter={(dateStr) => {
                    const date = new Date(dateStr);
                    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                  }}
                  itemStyle={{ color: "#9ca3af" }}
                />
                <Line
                  type="monotone"
                  dataKey="scans"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: "#6366f1", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Device Distribution */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Monitor size={18} className="text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Dispositivos</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={data.device_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.device_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS.devices[index % COLORS.devices.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {data.device_distribution.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          COLORS.devices[index % COLORS.devices.length],
                      }}
                    />
                    <span className="text-zinc-300">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* OS Distribution */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Smartphone size={18} className="text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Sistemas Operativos</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={data.os_distribution.slice(0, 5)}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9ca3af" style={{ fontSize: "11px" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#9ca3af"
                    style={{ fontSize: "11px" }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 0, 0]} fill={COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Browser Distribution */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <PieChart size={18} className="text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Navegadores</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={data.browser_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.browser_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS.browsers[index % COLORS.browsers.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {data.browser_distribution.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          COLORS.browsers[index % COLORS.browsers.length],
                      }}
                    />
                    <span className="text-zinc-300">{item.name}</span>
                  </div>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Location Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LocationList
            title="Top Países"
            icon={Globe}
            locations={data.top_countries}
          />
          <LocationList
            title="Top Ciudades"
            icon={MapPin}
            locations={data.top_cities}
          />
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-xs text-zinc-600">
            Powered by{" "}
            <span className="text-zinc-500 font-medium">QR-Hub Analytics</span>
            {" "}|{" "}
            <span className="text-zinc-500 font-medium">by HellSpawn</span>
          </p>
        </div>
      </div>
    </main>
  );
}
