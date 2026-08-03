import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Download,
  ExternalLink,
  Globe2,
  MapPin,
  Monitor,
  PieChart as PieChartIcon,
  Smartphone,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import L, { type LayerGroup, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "../lib/motion";
import { useLenis } from "../hooks/useLenis";
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
  CAMPAIGN_OPTIONS,
  DEFAULT_CAMPAIGN_ID,
  fetchAnalytics,
  QR_GENERAL_ASSET_URL,
  QR_GENERAL_TRACKING_URL,
  type AnalyticsBundle,
  type GeoCluster,
  type NameValue,
  type ScanDetailItem,
  type ScanDetailResponse,
  type TimeRange,
} from "../lib/api";
import { serializeCsv } from "../lib/csv";

const ranges: { label: string; value: TimeRange }[] = [
  { label: "Hoy", value: "hoy" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "12 meses", value: "12m" },
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
  if (range === "12m") {
    return new Intl.DateTimeFormat("es-MX", {
      month: "short",
      year: "2-digit",
    }).format(date);
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatCoordinate(value: number | null): string {
  return typeof value === "number" ? value.toFixed(4) : "N/D";
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
    <article className="dash-reveal group relative overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-sm transition-colors duration-500 hover:border-white/[0.16] hover:bg-white/[0.055] sm:p-6">
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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#f2f2f2] text-black">
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
    <section className={`dash-reveal rounded-lg border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-xl transition-colors duration-500 hover:border-white/[0.14] hover:bg-white/[0.05] sm:p-6 ${className}`}>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.03] text-[#b8b8b8]">
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
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-white/[0.08] px-6 text-center text-[13px] text-[#707070]">
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

function GeoMapPanel({ clusters }: { clusters: GeoCluster[] }) {
  const mapNodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;

    const map = L.map(mapNodeRef.current, {
      center: [19.4326, -99.1332],
      zoom: 9,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    map.attributionControl.setPrefix("");
    L.control.zoom({ position: "bottomright" }).addTo(map);

    const tileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      },
    );
    tileLayer.on("load", () => requestAnimationFrame(() => ScrollTrigger.refresh()));
    tileLayer.addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markerLayerRef.current = markerLayer;
    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    clusters.forEach((cluster) => {
      const position: L.LatLngExpression = [cluster.latitude, cluster.longitude];
      bounds.push(position);
      const marker = L.marker(position, {
        icon: L.divIcon({
          className: "sevenf-map-marker",
          html: `<span>${cluster.scan_count}</span>`,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        }),
        keyboard: true,
        title: `${cluster.scan_count} escaneos`,
      });
      marker.bindTooltip(
        `${cluster.scan_count} escaneos · ${cluster.top_device_type ?? "Dispositivo N/D"}`,
        { direction: "top", opacity: 0.96 },
      );
      marker.addTo(markerLayer);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 11, { animate: !prefersReducedMotion() });
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), {
        padding: [42, 42],
        maxZoom: 12,
        animate: !prefersReducedMotion(),
      });
    }

    requestAnimationFrame(() => {
      map.invalidateSize();
      ScrollTrigger.refresh();
    });
  }, [clusters]);

  return (
    <Panel title="Mapa de origen" icon={MapPin} className="overflow-hidden">
      <div className="relative overflow-hidden rounded-lg border border-white/[0.08] bg-[#050505]">
        <div className="pointer-events-none absolute left-4 top-4 z-[500] flex items-center gap-2 rounded-md border border-white/[0.08] bg-[#050505]/80 px-3 py-2 backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-[#f2f2f2]" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#f2f2f2]">
            Tracking QR
          </span>
        </div>
        <div className="pointer-events-none absolute right-4 top-4 z-[500] rounded-md border border-white/[0.08] bg-[#050505]/80 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#707070] backdrop-blur-xl">
          {clusters.length} clusters
        </div>
        <div ref={mapNodeRef} data-lenis-prevent className="h-[480px] w-full" />
        {!clusters.length ? (
          <div className="pointer-events-none absolute inset-0 z-[501] flex items-center justify-center bg-[#050505]/72 px-6 text-center">
            <p className="max-w-sm font-mono text-[10px] uppercase tracking-[0.16em] text-[#707070]">
              Sin coordenadas registradas para este rango.
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

type ScanSortBy =
  | "scanned_at"
  | "city"
  | "state"
  | "device_type"
  | "os"
  | "browser"
  | "campaign_id";

function ScanTablePanel({
  scans,
  sortBy,
  sortOrder,
  onSort,
  onPage,
}: {
  scans: ScanDetailResponse | null;
  sortBy: ScanSortBy;
  sortOrder: "asc" | "desc";
  onSort: (sortBy: ScanSortBy) => void;
  onPage: (page: number) => void;
}) {
  const items = scans?.items ?? [];
  const page = scans?.page ?? 1;
  const pageSize = scans?.page_size ?? 25;
  const total = scans?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const headers: { label: string; value: ScanSortBy }[] = [
    { label: "Fecha", value: "scanned_at" },
    { label: "Ubicacion", value: "city" },
    { label: "Dispositivo", value: "device_type" },
    { label: "Sistema", value: "os" },
    { label: "Navegador", value: "browser" },
    { label: "QR", value: "campaign_id" },
  ];

  return (
    <Panel title="Tabla de escaneos" icon={BarChart3} className="mt-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#707070]">
            Registros
          </p>
          <p className="mt-1 text-[24px] font-light tracking-[-0.05em] text-[#f2f2f2]">
            {total.toLocaleString("es-MX")} escaneos
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#707070]">
          Pagina {page} / {totalPages}
        </p>
      </div>

      {items.length ? (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-white/[0.06] md:block">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-white/[0.025]">
                <tr>
                  {headers.map((header) => (
                    <th key={header.value} scope="col" className="border-b border-white/[0.06] px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onSort(header.value)}
                        className="focus-ring font-mono text-[10px] uppercase tracking-[0.16em] text-[#707070] transition-colors hover:text-[#f2f2f2]"
                        aria-sort={
                          sortBy === header.value
                            ? sortOrder === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        {header.label}
                        {sortBy === header.value ? ` ${sortOrder === "asc" ? "↑" : "↓"}` : ""}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="border-b border-white/[0.06] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#707070]">
                    Geo
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((scan) => (
                  <tr key={scan.id} tabIndex={0} className="focus-ring border-b border-white/[0.045] transition-colors hover:bg-white/[0.025] focus:bg-white/[0.035]">
                    <td className="px-4 py-4 font-mono text-[11px] text-[#b8b8b8]">{formatDateTime(scan.scanned_at)}</td>
                    <td className="px-4 py-4 text-[13px] text-[#f2f2f2]">{scan.location_display}</td>
                    <td className="px-4 py-4 text-[13px] text-[#b8b8b8]">{scan.device_type ?? "N/D"}</td>
                    <td className="px-4 py-4 text-[13px] text-[#b8b8b8]">{scan.os ?? "N/D"}</td>
                    <td className="px-4 py-4 text-[13px] text-[#b8b8b8]">{scan.browser ?? "N/D"}</td>
                    <td className="px-4 py-4 font-mono text-[11px] text-[#707070]">{scan.campaign_id}</td>
                    <td className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.08em] text-[#707070]">
                      {formatCoordinate(scan.latitude)}, {formatCoordinate(scan.longitude)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {items.map((scan: ScanDetailItem) => (
              <article key={scan.id} className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#707070]">
                      {scan.campaign_id}
                    </p>
                    <h3 className="mt-1 text-[15px] font-medium tracking-[-0.03em] text-[#f2f2f2]">
                      {scan.location_display}
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-[#707070]">{formatDateTime(scan.scanned_at)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#707070]">
                  <span>{scan.device_type ?? "N/D"}</span>
                  <span>{scan.os ?? "N/D"}</span>
                  <span>{scan.browser ?? "N/D"}</span>
                  <span>{scan.geo_source ?? "N/D"}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyState />
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-white/[0.08] px-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#b8b8b8] disabled:opacity-35"
        >
          <ArrowLeft size={14} />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-white/[0.08] px-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#b8b8b8] disabled:opacity-35"
        >
          Siguiente
          <ArrowRight size={14} />
        </button>
      </div>
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

  const blob = new Blob([serializeCsv(rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `7fitment_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
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
      <section className="max-w-[460px] rounded-lg border border-white/[0.08] bg-white/[0.03] p-7 text-center">
        <BarChart3 className="mx-auto mb-5 text-[#707070]" size={30} strokeWidth={1.5} />
        <h1 className="text-[24px] font-medium tracking-[-0.04em]">Error al cargar datos</h1>
        <p className="mt-3 text-[14px] leading-6 text-[#8a8a8a]">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-6 rounded-md border border-white/[0.1] px-5 py-3 text-[12px] font-medium uppercase tracking-[0.16em] text-[#d8d8d8]"
        >
          Reintentar
        </button>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<TimeRange>("30d");
  const [campaignId, setCampaignId] = useState(DEFAULT_CAMPAIGN_ID);
  const [scanPage, setScanPage] = useState(1);
  const [scanSortBy, setScanSortBy] = useState<ScanSortBy>("scanned_at");
  const [scanSortOrder, setScanSortOrder] = useState<"asc" | "desc">("desc");
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useLenis();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAnalytics(range, campaignId, {
        page: scanPage,
        pageSize: 25,
        sortBy: scanSortBy,
        sortOrder: scanSortOrder,
      });
      setBundle(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando analiticas");
    } finally {
      setLoading(false);
    }
  }, [campaignId, range, scanPage, scanSortBy, scanSortOrder]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!bundle || !dashboardRef.current) return;
    if (prefersReducedMotion()) {
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

    // charts render asynchronously and change page height; keep triggers honest
    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => ctx.revert();
  }, [bundle, campaignId, range]);

  const topMunicipalities = useMemo(
    () => bundle?.geo.municipalities ?? bundle?.geo.cities ?? [],
    [bundle],
  );
  const handleSort = useCallback(
    (nextSortBy: ScanSortBy) => {
      setScanPage(1);
      if (scanSortBy === nextSortBy) {
        setScanSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      } else {
        setScanSortBy(nextSortBy);
        setScanSortOrder("desc");
      }
    },
    [scanSortBy],
  );

  if (loading && !bundle) return <LoadingState />;
  if (error && !bundle) return <ErrorState error={error} onRetry={load} />;

  return (
    <main ref={dashboardRef} className="dashboard-grid min-h-screen bg-[#050505] text-[#f2f2f2]">
      <header className="sticky top-16 z-30 border-b border-white/[0.06] bg-black/80 backdrop-blur-xl md:bg-black/60">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-4">
            <a href="/" className="focus-ring hidden h-11 w-11 items-center justify-center rounded-md bg-[#f2f2f2] text-[14px] font-semibold tracking-[-0.06em] text-black sm:flex">
              7F
            </a>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#707070]">
                QR Analytics
              </p>
              <h1 className="mt-1 text-[18px] font-medium tracking-[-0.04em]">
                7Fitment Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href="/" className="focus-ring hidden items-center gap-2 rounded-md border border-white/[0.08] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a9a9a] transition-colors hover:text-[#f2f2f2] md:inline-flex">
              <ArrowLeft size={14} />
              Sitio
            </a>
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
              QR general listo: <span className="font-medium text-[#d8d8d8]">{QR_GENERAL_TRACKING_URL}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-white/[0.08] bg-white/[0.03] p-1">
              {ranges.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setRange(item.value);
                    setScanPage(1);
                  }}
                  className={`focus-ring h-9 rounded px-4 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
                    range === item.value
                      ? "bg-[#f2f2f2] text-black"
                      : "text-[#8a8a8a] hover:text-[#f2f2f2]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="inline-flex h-11 items-center gap-2 rounded-md border border-white/[0.08] px-4 text-[12px] text-[#8a8a8a]">
              <Calendar size={14} strokeWidth={1.5} />
              {ranges.find((item) => item.value === range)?.label}
            </span>
            <button
              type="button"
              onClick={() => bundle && exportCsv(bundle, campaignId)}
              disabled={!bundle}
              className="focus-ring inline-flex h-11 items-center gap-2 rounded-md bg-[#f2f2f2] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-black disabled:opacity-45"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </section>

        <section className="dash-reveal mb-8 grid gap-5 rounded-lg border border-white/[0.07] bg-white/[0.03] p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
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
            {CAMPAIGN_OPTIONS.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {CAMPAIGN_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setCampaignId(item.value);
                      setScanPage(1);
                    }}
                    className={`focus-ring h-10 rounded-md border px-4 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors ${
                      campaignId === item.value
                        ? "border-[#f2f2f2] bg-[#f2f2f2] text-black"
                        : "border-white/[0.08] bg-black/20 text-[#8a8a8a] hover:border-white/[0.14] hover:text-[#f2f2f2]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-4 border-t border-white/[0.07] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <a
              href={QR_GENERAL_ASSET_URL}
              target="_blank"
              rel="noreferrer"
              className="focus-ring grid h-[112px] w-[112px] shrink-0 place-items-center bg-white p-2"
              aria-label="Abrir QR general"
            >
              <img
                src={QR_GENERAL_ASSET_URL}
                alt="QR general de tracking 7Fitment"
                width={96}
                height={96}
              />
            </a>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#707070]">
                Arte final
              </p>
              <p className="mt-2 text-[13px] font-medium text-[#f2f2f2]">
                Listo para impresión
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={QR_GENERAL_TRACKING_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.08] px-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9a9a9a] hover:text-white"
                >
                  <ExternalLink size={12} />
                  Probar
                </a>
                <a
                  href={QR_GENERAL_ASSET_URL}
                  download="7fitment-qr-general.svg"
                  className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-[#f2f2f2] px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-black"
                >
                  <Download size={12} />
                  SVG
                </a>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="dash-reveal mb-6 rounded-md border border-red-300/20 bg-red-500/10 p-4 text-[14px] text-red-200">
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

        <div className="mt-5">
          <GeoMapPanel clusters={bundle?.geo.clusters ?? []} />
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

        <ScanTablePanel
          scans={bundle?.scans ?? null}
          sortBy={scanSortBy}
          sortOrder={scanSortOrder}
          onSort={handleSort}
          onPage={setScanPage}
        />

        <footer className="mt-12 border-t border-white/[0.06] py-7 text-center text-[10px] uppercase tracking-[0.22em] text-[#575757]">
          QR-Hub Analytics · 7Fitment
        </footer>
      </div>
    </main>
  );
}
