import { DAY_TYPES, FRACTIONS } from "../../domain/types";
import type { DayEntry, ParentEntry } from "../../domain/types";
import { fromISO, isWeekend } from "../../lib/date";

export default function DayEditor({ selected, fifteenMonths, setParentField, toggleDouble, clearDay, close }: {
  selected: DayEntry | null;
  fifteenMonths: Date;
  setParentField: (parent: 'a'|'b', field: keyof ParentEntry, value: any) => void;
  toggleDouble: (next: boolean) => void;
  clearDay: (iso: string) => void;
  close: () => void;
}) {
  if (!selected) return (
    <div className="bg-white rounded-2xl shadow p-4"><div className="text-sm text-slate-500">Select a day in the calendar to edit.</div></div>
  );
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Day editor</div>
        <div className="text-sm text-slate-500">Double days allowed until {fifteenMonths.toLocaleDateString()}</div>
      </div>
      <div className="mt-3 space-y-3 text-sm">
        <div className="text-slate-700">Editing <span className="font-medium">{selected.dateISO}</span> ({isWeekend(fromISO(selected.dateISO))?"Weekend":"Weekday"})</div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Double day</label>
          <input type="checkbox" className="scale-110" checked={selected.doubleDay} onChange={e=>toggleDouble(e.target.checked)} />
        </div>

        {/* Parent A */}
        <div className="border rounded-xl p-3">
          <div className="font-semibold mb-2">Parent A</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs">Fraction</label>
              <select className="w-full border rounded px-2 py-1" value={selected.a.fraction}
                onChange={e=>setParentField('a','fraction', parseFloat(e.target.value))}>
                {FRACTIONS.map(f=> <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs">Type</label>
              <select className="w-full border rounded px-2 py-1" value={selected.a.type}
                onChange={e=>setParentField('a','type', e.target.value)}>
                {DAY_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input type="checkbox" className="scale-110" checked={selected.a.reserved}
              onChange={e=>setParentField('a','reserved', e.target.checked)} />
            <span>Reserved (not allowed on double days)</span>
          </div>
        </div>

        {/* Parent B */}
        <div className="border rounded-xl p-3">
          <div className="font-semibold mb-2">Parent B</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs">Fraction</label>
              <select className="w-full border rounded px-2 py-1" value={selected.b.fraction}
                onChange={e=>setParentField('b','fraction', parseFloat(e.target.value))}>
                {FRACTIONS.map(f=> <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs">Type</label>
              <select className="w-full border rounded px-2 py-1" value={selected.b.type}
                onChange={e=>setParentField('b','type', e.target.value)}>
                {DAY_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input type="checkbox" className="scale-110" checked={selected.b.reserved}
              onChange={e=>setParentField('b','reserved', e.target.checked)} />
            <span>Reserved (not allowed on double days)</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={()=>clearDay(selected.dateISO)}>Clear this day</button>
          <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}