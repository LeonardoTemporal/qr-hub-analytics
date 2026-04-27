/**
 * Design system constants - Luxury Automotive Theme
 * 
 * Black/White aesthetic inspired by Porsche and Apple design language
 */

// Color palette for charts
export const CHART_COLORS = {
  primary: "#ffffff",
  secondary: "#a1a1aa",
  accent: "#ffffff",
  success: "#10b981",
  warning: "#f59e0b",
  devices: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a"],
  os: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b", "#3f3f46"],
  browsers: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b"],
  countries: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#52525b"],
} as const;

// Tooltip styles for Recharts
export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "12px",
    color: "#fff",
    padding: "12px 16px",
  },
  itemStyle: { 
    color: "#a1a1aa" 
  },
} as const;

// Grid styles for Recharts
export const CHART_GRID_STYLE = {
  stroke: "#27272a",
  strokeDasharray: "3 3",
} as const;

// Axis styles for Recharts
export const CHART_AXIS_STYLE = {
  stroke: "#71717a",
  fontSize: "12px",
} as const;

// Authentication is handled via backend (POST /api/auth/login).
// Credentials live exclusively in the FastAPI service env (ADMIN_USERNAME / ADMIN_PASSWORD).

// Brand info
export const BRAND = {
  name: "7Fitment",
  tagline: "Premium Automotive Customization",
  analyticsName: "QR-Hub Analytics",
  author: "HellSpawn",
} as const;
