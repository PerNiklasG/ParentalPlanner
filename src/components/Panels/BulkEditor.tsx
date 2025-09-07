import { DAY_TYPES, FRACTIONS } from "../../domain/types";
import type { DayType } from "../../domain/types";

export default function BulkEditor({ count, mode, setMode, values, onApply, onClear, showMakeDouble }: {
  count: number;
  mode: 'a'|'b'|'double';
  setMode: (m: 'a'|'b'|'double') => void;
  values: {
    aFraction: number; aType: DayType; aReserved: boolean;
    bFraction: number; bType: DayType; bReserved: boolean;
    doubleFraction: number; doubleType: Exclude<DayType,'OFF'>;
    makeDoubleIfAllowed: boolean;
  };
  onApply: () => void;
  onClear: () => void;
  showMakeDouble: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="text-lg font-semibold">Bulk edit ({count} days)</div>
      <div className="mt-3 grid gap-2 text-sm">
        <label className="font-medium">Mode</label>
        <select className="border rounded px-2 py-1 w-full" value={mode} onChange={e=>setMode(e.target.value as any)}>
          <option value="a">Apply to Parent A</option>
          <option value="b">Apply to Parent B</option>
          <option value="double">Apply as Double Day</option>
        </select>
        {mode==='double' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs">Fraction</label>
              <select className="w-full border rounded px-2 py-1" value={values.doubleFraction} onChange={e=>values.doubleFraction = parseFloat(e.target.value)}>
                {FRACTIONS.filter(f=>f>0).map(f=> <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs">Type</label>
              <select className="w-full border rounded px-2 py-1" value={values.doubleType} onChange={e=>values.doubleType = e.target.value as any}>
                {['SBL','MIN'].map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs">Fraction</label>
              <select className="w-full border rounded px-2 py-1" value={mode==='a'?values.aFraction:values.bFraction} onChange={e=> (mode==='a'? values.aFraction = parseFloat(e.target.value) : values.bFraction = parseFloat(e.target.value)) }>
                {FRACTIONS.map(f=> <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs">Type</label>
              <select className="w-full border rounded px-2 py-1" value={mode==='a'?values.aType:values.bType} onChange={e=> (mode==='a'? values.aType = e.target.value as any : values.bType = e.target.value as any) }>
                {DAY_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="scale-110" checked={mode==='a'?values.aReserved:values.bReserved} onChange={e=> (mode==='a'? values.aReserved = e.target.checked : values.bReserved = e.target.checked)} />
                Reserved
              </label>
            </div>
          </div>
        )}
        {showMakeDouble && (
          <label className="inline-flex items-center gap-2 mt-1 text-xs">
            <input type="checkbox" className="scale-110" checked={values.makeDoubleIfAllowed} onChange={e=> values.makeDoubleIfAllowed = e.target.checked} />
            If both parents &gt; 0, make double day when allowed (≤15 months); otherwise prefer chosen parent.
          </label>
        )}
        <div className="flex gap-2 mt-3">
          <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={onApply}>Apply to selected</button>
          <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={onClear}>Clear selection</button>
        </div>
      </div>
    </div>
  );
}