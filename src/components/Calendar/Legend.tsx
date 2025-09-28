export default function Legend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
      <span className="inline-flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-blue-200 border border-blue-300 inline-block" />
        A
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-teal-200 border border-teal-300 inline-block" />
        B
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="px-1 rounded border bg-emerald-50 border-emerald-300 text-emerald-700">SBL</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="px-1 rounded border bg-amber-50 border-amber-300 text-amber-700">MIN</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="px-1 rounded border bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700">R</span>
        Reserved
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="px-1 rounded border bg-amber-100 border-amber-300 text-amber-800">Double</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded ring-1 ring-sky-400" />
        Today
      </span>
    </div>
  );
}
