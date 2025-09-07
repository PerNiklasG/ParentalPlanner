import type { Config, DayEntry } from "../../domain/types";

export default function DataActions({ config, entries, onReplaceAll, onReset }: {
  config: Config;
  entries: Record<string, DayEntry>;
  onReplaceAll: (cfg: Config, ent: Record<string, DayEntry>) => void;
  onReset: () => void;
}) {
  function exportJSON() {
    const blob = new Blob([JSON.stringify({config, entries}, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download = 'parental_leave_plan.json'; a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        onReplaceAll(data.config, data.entries);
      } catch { alert('Invalid JSON'); }
    };
    reader.readAsText(file);
  }
  return (
    <div className="bg-white rounded-2xl shadow p-4 text-sm">
      <div className="font-semibold mb-2">Data</div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={exportJSON}>Export JSON</button>
        <label className="px-3 py-2 rounded-xl border hover:bg-slate-100 cursor-pointer">
          Import JSON
          <input type="file" accept="application/json" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if (f) importJSON(f); }}/>
        </label>
        <button className="px-3 py-2 rounded-xl border hover:bg-rose-50 text-rose-700" onClick={onReset}>Reset plan</button>
      </div>
    </div>
  );
}