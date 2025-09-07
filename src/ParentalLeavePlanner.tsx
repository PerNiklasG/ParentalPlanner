import React, { useEffect, useMemo, useState } from "react";

// =========================
// Parental Leave Planner MVP
// - Calendar grid UI (month view)
// - Tag each day with: parent A/B fraction, day type (SBL/MIN/OFF), reserved, double day
// - Live summary panel with Swedish rules checks
// - LocalStorage persistence + JSON import/export
// =========================

// ---- Types ----
const FRACTIONS = [1, 0.75, 0.5, 0.25, 0.125, 0];
const DAY_TYPES = ["SBL", "MIN", "OFF"] as const;

type DayType = typeof DAY_TYPES[number];

type ParentEntry = {
  fraction: number; // 0..1 in allowed steps
  type: DayType; // SBL/MIN/OFF
  reserved: boolean; // one of the 90 reserved per parent
};

type DayEntry = {
  dateISO: string; // YYYY-MM-DD
  a: ParentEntry;
  b: ParentEntry;
  doubleDay: boolean; // both can take same fraction on same day
};

// ---- Date utils ----
function pad(n: number) { return n < 10 ? `0${n}` : String(n); }
function toISO(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function fromISO(iso: string) { const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d); }

function addMonths(d: Date, m: number) {
  const nd = new Date(d);
  nd.setMonth(nd.getMonth()+m);
  return nd;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function startOfWeekMon(d: Date) {
  const nd = new Date(d);
  const day = (nd.getDay()+6)%7; // Mon=0..Sun=6
  nd.setDate(nd.getDate()-day);
  nd.setHours(0,0,0,0);
  return nd;
}
function isWeekend(d: Date) { const dow = (d.getDay()+6)%7; return dow>=5; }

// ISO week number (YYYY-Www)
function isoWeekId(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((date as any) - (yearStart as any)) / 86400000 + 1)/7);
  return `${date.getUTCFullYear()}-W${weekNo.toString().padStart(2,'0')}`;
}

function eachDayOfInterval(start: Date, end: Date) {
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) { days.push(new Date(d)); d.setDate(d.getDate()+1); }
  return days;
}

// ---- Storage helpers ----
const STORAGE_KEY = "plp_v1_entries";
const STORAGE_CFG = "plp_v1_config";

function loadEntries(): Record<string, DayEntry> {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): {}; } catch { return {}; }
}
function saveEntries(dict: Record<string, DayEntry>) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dict)); } catch {}
}
function loadConfig() {
  try { const raw = localStorage.getItem(STORAGE_CFG); return raw? JSON.parse(raw): null; } catch { return null; }
}
function saveConfig(cfg: any) { try { localStorage.setItem(STORAGE_CFG, JSON.stringify(cfg)); } catch {}
}

// ---- Rule constants (can be exposed as settings) ----
const TOTAL_SBL = 390; // sickness benefit level
const TOTAL_MIN = 90;  // minimum level
const RESERVED_PER_PARENT = 90;
const MAX_DOUBLE_PER_PARENT = 60; // person-days (rows where that parent used on a double day)
const MAX_POST4_SAVED = 96; // total across both parents

// ---- Component ----
export default function ParentalLeavePlanner() {
  const defaultDob = "2024-12-20"; // user-provided default

  const [config, setConfig] = useState<{childDob: string; years: number}>(() => {
    const saved = loadConfig();
    return saved ?? { childDob: defaultDob, years: 5 };
  });

  const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [entries, setEntries] = useState<Record<string, DayEntry>>(() => loadEntries());
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
const [selectAnchor, setSelectAnchor] = useState<string | null>(null);
// Bulk edit state
const [bulkMode, setBulkMode] = useState<'a'|'b'|'double'>('a');
const [bulkAFraction, setBulkAFraction] = useState(1);
const [bulkAType, setBulkAType] = useState<DayType>('SBL');
const [bulkAReserved, setBulkAReserved] = useState(false);
const [bulkBFraction, setBulkBFraction] = useState(0);
const [bulkBType, setBulkBType] = useState<DayType>('OFF');
const [bulkBReserved, setBulkBReserved] = useState(false);
const [bulkDoubleFraction, setBulkDoubleFraction] = useState(1);
const [bulkDoubleType, setBulkDoubleType] = useState<DayType>('SBL');
const [bulkMakeDoubleIfAllowed, setBulkMakeDoubleIfAllowed] = useState(true);

  useEffect(() => { saveConfig(config); }, [config]);
  useEffect(() => { saveEntries(entries); }, [entries]);

  const childDobDate = useMemo(() => fromISO(config.childDob), [config.childDob]);
  const fifteenMonths = useMemo(() => addMonths(childDobDate, 15), [childDobDate]);
  const fourYears = useMemo(() => addMonths(childDobDate, 48), [childDobDate]);
  const afterOneYearDate = useMemo(() => addMonths(childDobDate, 12), [childDobDate]);

  // Month grid calculations
  const monthStart = startOfMonth(monthCursor);
  const monthEnd = endOfMonth(monthCursor);
  const gridStart = startOfWeekMon(monthStart);
  const gridEnd = startOfWeekMon(new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate()+7));
  const days = eachDayOfInterval(gridStart, new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate()-1));

  // Helpers for reading/writing an entry
  function getEntry(iso: string): DayEntry {
    const found = entries[iso];
    if (found) return found;
    return {
      dateISO: iso,
      a: { fraction: 0, type: "OFF", reserved: false },
      b: { fraction: 0, type: "OFF", reserved: false },
      doubleDay: false,
    };
  }
  function upsertEntry(next: DayEntry) {
    setEntries(prev => ({ ...prev, [next.dateISO]: next }));
  }

  // --- Multi-select helpers ---
  function isoRange(aISO: string, bISO: string) {
    const a = fromISO(aISO); const b = fromISO(bISO);
    const start = a <= b ? a : b; const end = a <= b ? b : a;
    return eachDayOfInterval(start, end).map(toISO);
  }

  function handleDayMouseDown(e: React.MouseEvent<HTMLButtonElement>, iso: string) {
    e.preventDefault();
    const isCtrl =
      e.ctrlKey ||
      e.metaKey ||
      (typeof e.getModifierState === 'function' &&
        (e.getModifierState('Control') || e.getModifierState('Meta')));
    const isShift = e.shiftKey;

    if (isShift && selectAnchor) {
      const range = isoRange(selectAnchor, iso);
      setSelectedSet(prev => new Set([...prev, ...range]));
      setSelectedISO(iso);
    } else if (isCtrl) {
      setSelectedSet(prev => {
        const next = new Set(prev);
        if (next.has(iso)) next.delete(iso);
        else next.add(iso);
        return next;
      });
      setSelectedISO(iso);
      setSelectAnchor(iso);
    } else {
      setSelectedSet(new Set([iso]));
      setSelectedISO(iso);
      setSelectAnchor(iso);
    }
  }

  function selectVisibleMonth() {
    const visible = days.filter(d => d.getMonth() === monthCursor.getMonth()).map(toISO);
    setSelectedSet(new Set(visible));
  }

  function bulkApply() {
    const targets = Array.from(selectedSet);
    const next: Record<string, DayEntry> = { ...entries };
    for (const iso of targets) {
      const d = fromISO(iso);
      let e = getEntry(iso);
      if (bulkMode === 'double') {
        if (d <= fifteenMonths) {
          e.doubleDay = true;
          e.a.fraction = bulkDoubleFraction; e.b.fraction = bulkDoubleFraction;
          e.a.type = bulkDoubleType; e.b.type = bulkDoubleType;
          e.a.reserved = false; e.b.reserved = false;
        } else {
          e.doubleDay = false; // fallback: apply to A only
          e.a.fraction = bulkDoubleFraction; e.a.type = bulkDoubleType; e.a.reserved = false;
          e.b.fraction = 0; e.b.type = 'OFF'; e.b.reserved = false;
        }
      } else if (bulkMode === 'a') {
        e.doubleDay = false;
        e.a.fraction = bulkAFraction; e.a.type = bulkAType; e.a.reserved = bulkAReserved;
        if (bulkMakeDoubleIfAllowed && e.b.fraction>0 && d <= fifteenMonths) {
          e.doubleDay = true;
          const f = Math.max(e.a.fraction, e.b.fraction);
          e.a.fraction = f; e.b.fraction = f;
          if (e.a.type === 'OFF') e.a.type = 'SBL';
          if (e.b.type === 'OFF') e.b.type = 'SBL';
          e.a.reserved = false; e.b.reserved = false;
        } else if (e.b.fraction>0) {
          e.b.fraction = 0; e.b.type = 'OFF'; e.b.reserved = false;
        }
      } else if (bulkMode === 'b') {
        e.doubleDay = false;
        e.b.fraction = bulkBFraction; e.b.type = bulkBType; e.b.reserved = bulkBReserved;
        if (bulkMakeDoubleIfAllowed && e.a.fraction>0 && d <= fifteenMonths) {
          e.doubleDay = true;
          const f = Math.max(e.a.fraction, e.b.fraction);
          e.a.fraction = f; e.b.fraction = f;
          if (e.a.type === 'OFF') e.a.type = 'SBL';
          if (e.b.type === 'OFF') e.b.type = 'SBL';
          e.a.reserved = false; e.b.reserved = false;
        } else if (e.a.fraction>0) {
          e.a.fraction = 0; e.a.type = 'OFF'; e.a.reserved = false;
        }
      }
      next[iso] = e;
    }
    setEntries(next);
  }

  function clearSelection() {
    setSelectedSet(new Set());
    setSelectedISO(null);
  }

  // --- Derived counters across ALL planned days (only entries that exist) ---
  const allEntries: DayEntry[] = useMemo(() => Object.values(entries).sort((x,y)=> x.dateISO.localeCompare(y.dateISO)), [entries]);

  function sumFractions(filter: (e: DayEntry)=>boolean, parent: 'a'|'b', type?: DayType) {
    return allEntries.filter(filter).reduce((acc, e) => {
      const p = e[parent];
      if (type && p.type !== type) return acc;
      if (p.type === "OFF" || p.fraction <=0) return acc;
      return acc + p.fraction;
    }, 0);
  }

  const totals = useMemo(() => {
    const A_SBL = sumFractions(()=>true, 'a', 'SBL');
    const A_MIN = sumFractions(()=>true, 'a', 'MIN');
    const B_SBL = sumFractions(()=>true, 'b', 'SBL');
    const B_MIN = sumFractions(()=>true, 'b', 'MIN');

    const doubleRows = allEntries.filter(e => e.doubleDay && (e.a.fraction>0 || e.b.fraction>0));
    const doubleA = doubleRows.filter(e => e.a.fraction>0).length;
    const doubleB = doubleRows.filter(e => e.b.fraction>0).length;

    const post4 = allEntries.filter(e => fromISO(e.dateISO) >= fourYears)
      .reduce((acc,e)=> acc + (e.a.type!=="OFF"?e.a.fraction:0) + (e.b.type!=="OFF"?e.b.fraction:0), 0);

    const resA = allEntries.reduce((acc,e)=> acc + (e.a.reserved? e.a.fraction:0), 0);
    const resB = allEntries.reduce((acc,e)=> acc + (e.b.reserved? e.b.fraction:0), 0);

    return { A_SBL, A_MIN, B_SBL, B_MIN, doubleA, doubleB, post4, resA, resB };
  }, [allEntries, fourYears]);

  // First 180 used days must be SBL -> flag any MIN scheduled before cumulative SBL reaches 180 days chronologically
  const minBefore180 = useMemo(() => {
    let sblCumulative = 0;
    const viol: string[] = [];
    for (const e of allEntries) {
      const aUsed = e.a.type!=="OFF" ? e.a.fraction : 0;
      const bUsed = e.b.type!=="OFF" ? e.b.fraction : 0;
      // If MIN is used and cumulative SBL < 180 -> violation on that date
      if ((e.a.type==="MIN" && e.a.fraction>0 && sblCumulative < 180) || (e.b.type==="MIN" && e.b.fraction>0 && sblCumulative < 180)) {
        viol.push(e.dateISO);
      }
      // then add SBL used that day
      if (e.a.type==="SBL") sblCumulative += e.a.fraction;
      if (e.b.type==="SBL") sblCumulative += e.b.fraction;
    }
    return new Set(viol);
  }, [allEntries]);

  // SGI: after age 1, need >=5 weekdays with leave each ISO week
  const sgiWeeksBelow5 = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of allEntries) {
      const d = fromISO(e.dateISO);
      if (d < afterOneYearDate) continue;
      if (isWeekend(d)) continue;
      const used = (e.a.fraction>0 && e.a.type!=="OFF") || (e.b.fraction>0 && e.b.type!=="OFF");
      if (!used) continue;
      const wk = isoWeekId(d);
      map[wk] = (map[wk] ?? 0) + 1;
    }
    return Object.entries(map).filter(([_,cnt]) => cnt < 5).map(([wk])=>wk);
  }, [allEntries, afterOneYearDate]);

  // Generic warnings
  const warnings = useMemo(() => {
    const list: string[] = [];
    if (totals.A_SBL + totals.B_SBL > TOTAL_SBL) list.push("Total SBL exceeds 390.");
    if (totals.A_MIN + totals.B_MIN > TOTAL_MIN) list.push("Total MIN exceeds 90.");
    if (totals.resA > RESERVED_PER_PARENT) list.push("Parent A reserved exceeds 90.");
    if (totals.resB > RESERVED_PER_PARENT) list.push("Parent B reserved exceeds 90.");
    if (totals.doubleA > MAX_DOUBLE_PER_PARENT) list.push("Parent A double days exceed 60.");
    if (totals.doubleB > MAX_DOUBLE_PER_PARENT) list.push("Parent B double days exceed 60.");
    if (totals.post4 > MAX_POST4_SAVED) list.push("Saved days after age 4 exceed 96.");
    if (sgiWeeksBelow5.length > 0) list.push(`SGI risk: weeks with <5 weekdays covered: ${sgiWeeksBelow5.join(", ")}`);
    return list;
  }, [totals, sgiWeeksBelow5]);

  // ---- Day Editor ----
  const selectedEntry = selectedISO ? getEntry(selectedISO) : null;

  function setParentField(parent: 'a'|'b', field: keyof ParentEntry, value: any) {
    if (!selectedEntry) return;
    const copy: DayEntry = JSON.parse(JSON.stringify(selectedEntry));
    // Enforce constraints live:
    if (field === 'reserved' && value && copy.doubleDay) {
      // cannot mark reserved on double day
      alert("Reserved days cannot be used on double days.");
      return;
    }
    (copy[parent] as any)[field] = value;

    // If marking any fraction while other parent already has >0 and not doubleDay => prevent overlap
    if (!copy.doubleDay) {
      if (copy.a.fraction>0 && copy.b.fraction>0) {
        // Prefer current parent; zero out the other
        const other: 'a'|'b' = parent==='a' ? 'b' : 'a';
        copy[other].fraction = 0; copy[other].type = "OFF"; copy[other].reserved = false;
      }
    }

    // If doubleDay, fractions must match and both types must not be OFF
    if (copy.doubleDay) {
      const target = copy[parent].fraction;
      copy.a.fraction = target; copy.b.fraction = target;
      if (copy.a.type === 'OFF') copy.a.type = 'SBL';
      if (copy.b.type === 'OFF') copy.b.type = 'SBL';
    }

    upsertEntry(copy);
  }

  function toggleDoubleDay(next: boolean) {
    if (!selectedEntry) return;
    const d = fromISO(selectedEntry.dateISO);
    if (next && d > fifteenMonths) {
      alert("Double days allowed only until 15 months from DOB.");
      return;
    }
    const copy: DayEntry = JSON.parse(JSON.stringify(selectedEntry));
    copy.doubleDay = next;
    if (next) {
      const f = Math.max(copy.a.fraction, copy.b.fraction, 0.25); // default to 0.25 if empty
      copy.a.fraction = f; copy.b.fraction = f;
      if (copy.a.type === 'OFF') copy.a.type = 'SBL';
      if (copy.b.type === 'OFF') copy.b.type = 'SBL';
      copy.a.reserved = false; copy.b.reserved = false; // reserved not allowed
    }
    upsertEntry(copy);
  }

  function clearDay(iso: string) {
    const next = { ...entries }; delete next[iso]; setEntries(next);
  }

  // ---- Import/Export ----
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
        if (data.config) setConfig(data.config);
        if (data.entries) setEntries(data.entries);
      } catch {
        alert('Invalid JSON');
      }
    };
    reader.readAsText(file);
  }

  // ---- UI ----
  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Left: Calendar */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={()=>setMonthCursor(addMonths(monthCursor,-1))}>← Prev</button>
              <div className="font-semibold text-lg">
                {monthCursor.toLocaleString(undefined,{ month:'long', year:'numeric'})}
              </div>
              <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={()=>setMonthCursor(addMonths(monthCursor,1))}>Next →</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Child DOB:</label>
              <input type="date" className="px-2 py-1 rounded border" value={config.childDob} onChange={e=>setConfig({...config, childDob:e.target.value})}/>
              <button className="px-3 py-1 rounded border" onClick={()=>setMonthCursor(startOfMonth(fromISO(config.childDob)))}>Jump to DOB month</button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 text-center mt-4 text-xs font-medium text-slate-500">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=> <div key={d} className="py-1">{d}</div>)}
          </div>

          {selectedSet.size > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <div className="px-2 py-1 rounded bg-indigo-50 border border-indigo-200">Selected: {selectedSet.size}</div>
              <button className="px-2 py-1 rounded border" onClick={()=> { setSelectedSet(new Set()); setSelectedISO(null); }}>Clear</button>
              <button className="px-2 py-1 rounded border" onClick={selectVisibleMonth}>Select current month</button>
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d)=>{
              const iso = toISO(d);
              const inMonth = d.getMonth() === monthCursor.getMonth();
              const e = entries[iso];
              const weekend = isWeekend(d);
              const after1 = d >= afterOneYearDate;
              const isDob = iso === config.childDob;
              const invalidDouble = e?.doubleDay && d > fifteenMonths;
              const min180 = e && (minBefore180.has(iso));

              return (
                <button key={iso} type="button" onPointerDown={(e)=> handleDayMouseDown(e, iso)} onContextMenu={(e) => e.preventDefault()}
                  className={[
                    "relative h-24 rounded-xl border p-2 text-left overflow-hidden",
                    inMonth ? "bg-white" : "bg-slate-100 text-slate-400",
                    weekend ? "border-rose-200" : "border-slate-200",
                    (selectedISO===iso || selectedSet.has(iso))?"ring-2 ring-indigo-500":"",
                  ].join(' ')}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{d.getDate()}</div>
                    <div className="text-[10px] px-1 rounded bg-slate-100 border text-slate-500">{isDob?"DOB":(weekend?"Weekend":"Weekday")}</div>
                  </div>

                  {/* Badges */}
                  <div className="absolute right-1 top-6 flex flex-col gap-1 items-end">
                    {e?.doubleDay && <span className="text-[10px] bg-amber-100 border border-amber-300 px-1 rounded">Double</span>}
                    {invalidDouble && <span className="text-[10px] bg-rose-100 border border-rose-300 px-1 rounded">&gt;15m</span>}
                    {min180 && <span className="text-[10px] bg-rose-100 border border-rose-300 px-1 rounded">MIN&lt;180</span>}
                  </div>

                  {/* Parent A/B rows */}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                    <div className="rounded bg-slate-50 border p-1">
                      <div className="font-semibold">A</div>
                      <div>{e?.a?.fraction ?? 0} × {e?.a?.type ?? 'OFF'}{e?.a?.reserved?" • R":''}</div>
                    </div>
                    <div className="rounded bg-slate-50 border p-1">
                      <div className="font-semibold">B</div>
                      <div>{e?.b?.fraction ?? 0} × {e?.b?.type ?? 'OFF'}{e?.b?.reserved?" • R":''}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Summary + Editor */}
        <div className="flex flex-col gap-4">
          {/* Summary Card */}
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="text-lg font-semibold mb-2">Summary</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="font-medium">A SBL</div><div>{totals.A_SBL.toFixed(3)} / 195 (soft per-parent)</div>
              <div className="font-medium">A MIN</div><div>{totals.A_MIN.toFixed(3)}</div>
              <div className="font-medium">B SBL</div><div>{totals.B_SBL.toFixed(3)} / 195 (soft per-parent)</div>
              <div className="font-medium">B MIN</div><div>{totals.B_MIN.toFixed(3)}</div>
              <div className="font-medium">Double days A</div><div>{totals.doubleA} / 60</div>
              <div className="font-medium">Double days B</div><div>{totals.doubleB} / 60</div>
              <div className="font-medium">Post-4 saved</div><div>{totals.post4.toFixed(3)} / 96</div>
              <div className="font-medium">Reserved A</div><div>{totals.resA.toFixed(3)} / 90</div>
              <div className="font-medium">Reserved B</div><div>{totals.resB.toFixed(3)} / 90</div>
            </div>
            {warnings.length>0 && (
              <div className="mt-3 text-sm">
                <div className="font-semibold mb-1">Warnings</div>
                <ul className="list-disc pl-5 space-y-1 text-rose-700">
                  {warnings.map((w,i)=>(<li key={i}>{w}</li>))}
                </ul>
              </div>
            )}
          </div>

          {/* SGI card */}
          <div className="bg-white rounded-2xl shadow p-4 text-sm">
            <div className="font-semibold mb-2">SGI weekly check (after 1 year)</div>
            {sgiWeeksBelow5.length===0? (
              <div className="text-emerald-700">All checked weeks have ≥5 weekdays covered.</div>
            ) : (
              <div>
                <div className="mb-1 text-rose-700">Weeks with &lt; 5 weekdays covered:</div>
                <div className="flex flex-wrap gap-2">{sgiWeeksBelow5.map(w=> <span key={w} className="text-xs bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">{w}</span>)}</div>
              </div>
            )}
          </div>

          {/* Bulk Editor */}
          {selectedSet.size > 1 && (
            <div className="bg-white rounded-2xl shadow p-4">
              <div className="text-lg font-semibold">Bulk edit ({selectedSet.size} days)</div>
              <div className="mt-3 grid gap-2 text-sm">
                <label className="font-medium">Mode</label>
                <select className="border rounded px-2 py-1 w-full" value={bulkMode} onChange={e=>setBulkMode(e.target.value as any)}>
                  <option value="a">Apply to Parent A</option>
                  <option value="b">Apply to Parent B</option>
                  <option value="double">Apply as Double Day</option>
                </select>
                {bulkMode==='double' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs">Fraction</label>
                      <select className="w-full border rounded px-2 py-1" value={bulkDoubleFraction} onChange={e=>setBulkDoubleFraction(parseFloat(e.target.value))}>
                        {FRACTIONS.filter(f=>f>0).map(f=> <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs">Type</label>
                      <select className="w-full border rounded px-2 py-1" value={bulkDoubleType} onChange={e=>setBulkDoubleType(e.target.value as DayType)}>
                        {['SBL','MIN'].map(t=> <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs">Fraction</label>
                      <select className="w-full border rounded px-2 py-1" value={bulkMode==='a'?bulkAFraction:bulkBFraction} onChange={e=> (bulkMode==='a'? setBulkAFraction : setBulkBFraction)(parseFloat(e.target.value)) }>
                        {FRACTIONS.map(f=> <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs">Type</label>
                      <select className="w-full border rounded px-2 py-1" value={bulkMode==='a'?bulkAType:bulkBType} onChange={e=> (bulkMode==='a'? setBulkAType : setBulkBType)(e.target.value as DayType) }>
                        {DAY_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" className="scale-110" checked={bulkMode==='a'?bulkAReserved:bulkBReserved} onChange={e=> (bulkMode==='a'? setBulkAReserved : setBulkBReserved)(e.target.checked)} />
                        Reserved
                      </label>
                    </div>
                  </div>
                )}
                {bulkMode!=='double' && (
                  <label className="inline-flex items-center gap-2 mt-1 text-xs">
                    <input type="checkbox" className="scale-110" checked={bulkMakeDoubleIfAllowed} onChange={e=> setBulkMakeDoubleIfAllowed(e.target.checked)} />
                    {'If both parents > 0, make double day when allowed (≤15 months); otherwise prefer A and zero B.'}
                  </label>
                )}
                <div className="flex gap-2 mt-3">
                  <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={bulkApply}>Apply to selected</button>
                  <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={()=> { setSelectedSet(new Set()); setSelectedISO(null); }}>Clear selection</button>
                </div>
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Day editor</div>
              <div className="text-sm text-slate-500">Double days allowed until {fifteenMonths.toLocaleDateString()}</div>
            </div>
            {!selectedEntry ? (
              <div className="text-sm text-slate-500 mt-2">Select a day in the calendar to edit.</div>
            ) : (
              <div className="mt-3 space-y-3 text-sm">
                <div className="text-slate-700">Editing <span className="font-medium">{selectedEntry.dateISO}</span> ({isWeekend(fromISO(selectedEntry.dateISO))?"Weekend":"Weekday"})</div>

                <div className="flex items-center gap-2">
                  <label className="text-sm">Double day</label>
                  <input type="checkbox" className="scale-110" checked={selectedEntry.doubleDay} onChange={e=>toggleDoubleDay(e.target.checked)} />
                </div>

                {/* Parent A */}
                <div className="border rounded-xl p-3">
                  <div className="font-semibold mb-2">Parent A</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs">Fraction</label>
                      <select className="w-full border rounded px-2 py-1" value={selectedEntry.a.fraction}
                        onChange={e=>setParentField('a','fraction', parseFloat(e.target.value))}>
                        {FRACTIONS.map(f=> <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs">Type</label>
                      <select className="w-full border rounded px-2 py-1" value={selectedEntry.a.type}
                        onChange={e=>setParentField('a','type', e.target.value)}>
                        {DAY_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="checkbox" className="scale-110" checked={selectedEntry.a.reserved}
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
                      <select className="w-full border rounded px-2 py-1" value={selectedEntry.b.fraction}
                        onChange={e=>setParentField('b','fraction', parseFloat(e.target.value))}>
                        {FRACTIONS.map(f=> <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs">Type</label>
                      <select className="w-full border rounded px-2 py-1" value={selectedEntry.b.type}
                        onChange={e=>setParentField('b','type', e.target.value)}>
                        {DAY_TYPES.map(t=> <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="checkbox" className="scale-110" checked={selectedEntry.b.reserved}
                      onChange={e=>setParentField('b','reserved', e.target.checked)} />
                    <span>Reserved (not allowed on double days)</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={()=>clearDay(selectedEntry.dateISO)}>Clear this day</button>
                  <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={()=>setSelectedISO(null)}>Close</button>
                </div>
              </div>
            )}
          </div>

          {/* Data actions */}
          <div className="bg-white rounded-2xl shadow p-4 text-sm">
            <div className="font-semibold mb-2">Data</div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={exportJSON}>Export JSON</button>
              <label className="px-3 py-2 rounded-xl border hover:bg-slate-100 cursor-pointer">
                Import JSON
                <input type="file" accept="application/json" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if (f) importJSON(f); }}/>
              </label>
              <button className="px-3 py-2 rounded-xl border hover:bg-rose-50 text-rose-700" onClick={()=>{ if (confirm('Clear all planned entries?')) setEntries({}); }}>Reset plan</button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer helper */}
      <div className="max-w-7xl mx-auto mt-4 text-xs text-slate-500">
        Tips: Click a day to edit • Double days auto-sync fractions • Warnings appear as you plan • Only edited days are stored, so it stays fast.
      </div>
    </div>
  );
}
