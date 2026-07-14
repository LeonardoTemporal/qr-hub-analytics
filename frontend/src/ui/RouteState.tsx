import { Activity, TriangleAlert } from "lucide-react";

export function RouteLoading({ label = "Sincronizando" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#050505] text-[#707070]">
      <div className="text-center">
        <Activity className="mx-auto mb-4 animate-spin text-[#f2f2f2]" size={24} />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]">{label}</p>
      </div>
    </main>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[4px] border border-red-300/20 bg-red-500/10 p-4 text-[13px] text-red-100">
      <TriangleAlert className="mt-0.5 shrink-0" size={16} />
      <p>{message}</p>
    </div>
  );
}
