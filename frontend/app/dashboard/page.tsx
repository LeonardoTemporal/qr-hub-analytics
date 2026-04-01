/**
 * Dashboard de Analíticas – 7Fitment
 *
 * Panel profesional premium con animaciones Framer Motion
 * - Pantalla de login segura con contraseña
 * - KPIs con micro-interacciones y stagger animations
 * - Gráfica principal de tendencias con scroll-triggered
 * - Distribuciones por device/os/browser
 * - Top ubicaciones geográficas
 * - Header personalizado con gradient text animado
 */

"use client";

import { useEffect, useState, useRef } from "react";
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
import {
  motion,
  useInView,
  AnimatePresence,
  Variants as MotionVariants,
  Transition,
} from "framer-motion";

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
// Colores para gráficas - Paleta Premium 7Fitment
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
// Animations - Framer Motion Variants
// ─────────────────────────────────────────────────────────────────────────────
const containerVariants: MotionVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: MotionVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

const fadeInUp: MotionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Componentes de Tarjetas Mejoradas
// ─────────────────────────────────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: string;
  index: number;
}

function KPICard({ title, value, icon: Icon, trend, color, index }: KPICardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{
        scale: 1.02,
        y: -4,
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">
            {title}
          </p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
            className="text-3xl font-bold text-white"
          >
            {value}
          </motion.p>
          {trend && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="text-xs text-emerald-400 mt-2 flex items-center gap-1"
            >
              <ArrowUpRight size={14} />
              {trend}
            </motion.p>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className={`p-3 rounded-xl ${color}`}
        >
          <Icon size={24} className="text-white" />
        </motion.div>
      </div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-zinc-400" />
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      </div>
      <div className="space-y-3">
        {locations.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay datos disponibles</p>
        ) : (
          locations.map((location, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-zinc-300">{location.name}</span>
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 + 0.1, type: "spring" }}
                    className="text-sm font-medium text-white"
                  >
                    {location.value}
                  </motion.span>
                </div>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: index * 0.05 + 0.15, duration: 0.6 }}
                  className="h-1.5 bg-white/10 rounded-full overflow-hidden"
                  style={{ transformOrigin: "left" }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    style={{ width: `${(location.value / maxValue) * 100}%` }}
                  />
                </motion.div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de Login Mejorado
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-full max-w-md"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 mb-4 shadow-2xl"
          >
            <span className="text-4xl font-bold text-white">7F</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="gradient-text">7Fitment Analytics</span>
          </h1>
          <p className="text-zinc-400">Dashboard de Analíticas Premium</p>
        </div>

        {/* Login Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl hover:bg-white/10 transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="p-3 bg-indigo-500/10 rounded-xl"
            >
              <Lock size={24} className="text-indigo-400" />
            </motion.div>
            <div>
              <h2 className="text-xl font-semibold text-white">Acceso Seguro</h2>
              <p className="text-sm text-zinc-400">Ingresa tu contraseña para continuar</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all hover:bg-white/10"
                autoFocus
              />
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                >
                  <p className="text-sm text-red-400 text-center">
                    Contraseña incorrecta. Por favor, intenta nuevamente.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || !password}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                loading ? "animate-pulse" : ""
              }`}
            >
              {loading ? "Verificando..." : "Ingresar"}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-zinc-500">
              Powered by{" "}
              <span className="text-zinc-400">QR-Hub Analytics</span>
              {" | "}
              <span className="gradient-text">by HellSpawn</span>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header del Dashboard Mejorado
// ─────────────────────────────────────────────────────────────────────────────
interface DashboardHeaderProps {
  ownerName: string;
  onLogout: () => void;
}

function DashboardHeader({ ownerName, onLogout }: DashboardHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-slate-900/80 backdrop-blur-xl border-b border-white/10 shadow-xl"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo & Title */}
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-lg"
            >
              <span className="text-lg font-bold text-white">7F</span>
            </motion.div>
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-lg font-semibold text-white"
              >
                ¡Hola, <span className="gradient-text">{ownerName}</span>!
              </motion.h1>
              <p className="text-sm text-zinc-400">
                Bienvenida a tu panel de analíticas premium
              </p>
            </div>
          </div>

          {/* Right Side - Logout */}
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.05, x: 2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 hover:text-white transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </motion.button>
        </div>
      </div>
    </motion.header>
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
        const url = `${apiUrl}/api/analytics/7fitment`;
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
        setError(
          `Error cargando analíticas: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
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
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="relative"
          >
            <Activity className="mx-auto mb-4 text-indigo-500" size={32} />
            <motion.div
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-indigo-500/20"
            />
          </motion.div>
          <p className="text-zinc-400">Cargando analíticas...</p>
        </motion.div>
      </div>
    );
  }

  // Show error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <BarChart3 className="mx-auto mb-4 text-red-400" size={48} />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-semibold text-white mb-2"
          >
            Error
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400"
          >
            {error || "No se pudieron cargar los datos"}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 transition-all"
          >
            Volver al inicio
          </motion.button>
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              <span className="gradient-text">7Fitment Analytics</span>
            </h1>
            <p className="text-zinc-400">
              Métricas en tiempo real de tus escaneos QR
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 text-xs text-zinc-500 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-all cursor-default"
          >
            <Calendar size={14} />
            <span>Últimos 30 días</span>
          </motion.div>
        </motion.div>

        {/* KPIs Grid con Stagger Animation */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <KPICard
            title="Total Escaneos"
            value={data.kpis.total_scans}
            icon={TrendingUp}
            color="bg-gradient-to-br from-indigo-500 to-purple-600"
            index={0}
          />
          <KPICard
            title="Últimos 7 días"
            value={data.kpis.recent_scans_7d}
            icon={Activity}
            trend="+12.5%"
            color="bg-gradient-to-br from-emerald-500 to-teal-600"
            index={1}
          />
          <KPICard
            title="Dispositivos"
            value={data.device_distribution.length}
            icon={Smartphone}
            color="bg-gradient-to-br from-blue-500 to-cyan-600"
            index={2}
          />
          <KPICard
            title="Países"
            value={data.top_countries.length}
            icon={Globe}
            color="bg-gradient-to-br from-purple-500 to-pink-600"
            index={3}
          />
        </motion.div>

        {/* Main Chart - Time Series */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
        >
          <div className="flex items-center gap-2 mb-6">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <BarChart3 size={20} className="text-indigo-400" />
            </motion.div>
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
        </motion.div>

        {/* Distribution Charts */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* Device Distribution */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
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
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
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
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    horizontal={false}
                  />
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
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 0, 0]}
                    fill={COLORS.primary}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Browser Distribution */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
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
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
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
        </motion.div>

        {/* Location Lists */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <LocationList
            title="Top Países"
            icon={Globe}
            locations={data.top_countries}
          />
          <LocationList title="Top Ciudades" icon={MapPin} locations={data.top_cities} />
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center py-8"
        >
          <p className="text-xs text-zinc-600">
            Powered by{" "}
            <span className="text-zinc-500 font-medium">QR-Hub Analytics</span>
            {" | "}
            <span className="gradient-text font-medium">by HellSpawn</span>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
