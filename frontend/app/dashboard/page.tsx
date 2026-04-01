/**
 * Dashboard de Analíticas – 7Fitment
 *
 * Panel profesional premium con animaciones Framer Motion
 * Estética Negro/Blanco automotriz de lujo
 * - Scroll-triggered animations
 * - Number counter animations
 * - Header separado con espacio premium
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
import { motion, useInView, AnimatePresence } from "framer-motion";
import { animate } from "framer-motion";

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
// Colores Premium - Estética Negro/Blanco Automotriz
// ─────────────────────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#ffffff",
  secondary: "#a1a1aa",
  accent: "#ffffff",
  success: "#10b981",
  warning: "#f59e0b",
  devices: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a"],
  os: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b", "#3f3f46"],
  browsers: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b"],
  countries: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b"],
};

const MASTER_PASSWORD = "7fitment2026";

// ─────────────────────────────────────────────────────────────────────────────
// Animations - Framer Motion Variants
// ─────────────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
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

// ─────────────────────────────────────────────────────────────────────────────
// Number Counter Animation Component
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1.5,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate: (latest) => {
        node.textContent = Math.round(latest).toString();
      },
    });

    return controls.stop;
  }, [value]);

  return <span ref={nodeRef}>0</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scroll-Triggered Section Component
// ─────────────────────────────────────────────────────────────────────────────
function ScrollSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: "-100px",
  });

  return (
    <motion.section
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.section>
  );
}

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
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">
            {title}
          </p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
            className="text-4xl font-bold text-white"
          >
            {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
          </motion.p>
          {trend && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="text-xs text-emerald-400 mt-3 flex items-center gap-1"
            >
              <ArrowUpRight size={14} />
              {trend}
            </motion.p>
          )}
        </div>
        <motion.div
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className={`p-4 rounded-xl ${color} group-hover:scale-110 transition-transform`}
        >
          <Icon size={28} className="text-white" />
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
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-6">
        <Icon size={18} className="text-zinc-400" />
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
      </div>
      <div className="space-y-4">
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
                <div className="flex items-center justify-between mb-2">
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
                  className="h-2 bg-white/10 rounded-full overflow-hidden"
                  style={{ transformOrigin: "left" }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-white via-zinc-300 to-zinc-400 rounded-full"
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
      className="min-h-screen bg-black flex items-center justify-center p-4"
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
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white mb-4 shadow-2xl"
          >
            <span className="text-4xl font-bold text-black">7F</span>
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
              className="p-3 bg-white/10 rounded-xl"
            >
              <Lock size={24} className="text-white" />
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
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all hover:bg-white/10"
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
              className={`w-full py-3 bg-white hover:bg-zinc-200 text-black font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
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
          ? "bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-xl"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo & Title */}
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="hidden sm:flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-lg"
            >
              <span className="text-xl font-bold text-black">7F</span>
            </motion.div>
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl font-semibold text-white"
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
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-300 hover:text-white transition-all duration-200"
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
      <div className="min-h-screen bg-black flex items-center justify-center">
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
            <Activity className="mx-auto mb-4 text-white" size={32} />
            <motion.div
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-white/20"
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <BarChart3 className="mx-auto mb-4 text-white" size={48} />
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
    <main className="min-h-screen bg-black">
      {/* Header */}
      <DashboardHeader ownerName="Leslye" onLogout={handleLogout} />

      {/* Contenido con espacio extra y padding top para compensar header sticky */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-12 md:pt-12 md:pb-16 space-y-16">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="gradient-text">7Fitment Analytics</span>
            </h1>
            <p className="text-zinc-400 text-lg">
              Métricas en tiempo real de tus escaneos QR
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 text-sm text-zinc-500 bg-white/5 px-5 py-2.5 rounded-full border border-white/10 hover:bg-white/10 transition-all cursor-default"
          >
            <Calendar size={16} />
            <span>Últimos 30 días</span>
          </motion.div>
        </motion.div>

        {/* KPIs Grid con Stagger Animation - más espacio */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <KPICard
            title="Total Escaneos"
            value={data.kpis.total_scans}
            icon={TrendingUp}
            color="bg-white"
            index={0}
          />
          <KPICard
            title="Últimos 7 días"
            value={data.kpis.recent_scans_7d}
            icon={Activity}
            trend="+12.5%"
            color="bg-zinc-200"
            index={1}
          />
          <KPICard
            title="Dispositivos"
            value={data.device_distribution.length}
            icon={Smartphone}
            color="bg-zinc-400"
            index={2}
          />
          <KPICard
            title="Países"
            value={data.top_countries.length}
            icon={Globe}
            color="bg-zinc-600"
            index={3}
          />
        </motion.div>

        {/* Main Chart - Time Series con Scroll Trigger */}
        <ScrollSection delay={0.2}>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center gap-2 mb-8">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <BarChart3 size={20} className="text-white" />
              </motion.div>
              <h2 className="text-lg font-semibold text-white">Tendencia de Escaneos</h2>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.time_series} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    stroke="#71717a"
                    style={{ fontSize: "12px" }}
                    tickFormatter={(dateStr) => {
                      const date = new Date(dateStr);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis stroke="#71717a" style={{ fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelFormatter={(dateStr) => {
                      const date = new Date(dateStr);
                      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                    }}
                    itemStyle={{ color: "#a1a1aa" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="scans"
                    stroke="#ffffff"
                    strokeWidth={2}
                    dot={{ fill: "#ffffff", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ScrollSection>

        {/* Distribution Charts con Scroll Trigger */}
        <ScrollSection delay={0.4} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Device Distribution */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center gap-2 mb-6">
              <Monitor size={18} className="text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Dispositivos</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
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
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-3">
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
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center gap-2 mb-6">
              <Smartphone size={18} className="text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Sistemas Operativos</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={data.os_distribution.slice(0, 5)}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" style={{ fontSize: "11px" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#71717a"
                    style={{ fontSize: "11px" }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 0, 0]} fill="#ffffff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Browser Distribution */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center gap-2 mb-6">
              <PieChart size={18} className="text-zinc-400" />
              <h3 className="text-sm font-medium text-zinc-300">Navegadores</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
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
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-3">
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
        </ScrollSection>

        {/* Location Lists con Scroll Trigger */}
        <ScrollSection delay={0.6} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
        </ScrollSection>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center py-12"
        >
          <p className="text-sm text-zinc-600">
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
