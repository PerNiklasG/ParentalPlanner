import type { DayEntry } from "../../domain/types";
import { isWeekend } from "../../lib/date";

type Props = {
  iso: string;
  date: Date;
  inMonth: boolean;
  entry?: DayEntry;
  isSelected: boolean;
  isDob: boolean;
  invalidDouble: boolean;
  min180: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>, iso: string) => void;
};

export default function DayCell({ iso, date, inMonth, entry: e, isSelected, isDob, invalidDouble, min180, onMouseDown }: Props) {
  const weekend = isWeekend(date);
  const aUsed = !!(e?.a && e.a.type !== "OFF" && (e.a.fraction ?? 0) > 0);
  const bUsed = !!(e?.b && e.b.type !== "OFF" && (e.b.fraction ?? 0) > 0);

  let ownerBar = "bg-transparent";
  if (e?.doubleDay) ownerBar = "bg-amber-300";
  else if (aUsed && !bUsed) ownerBar = "bg-blue-300";
  else if (bUsed && !aUsed) ownerBar = "bg-teal-300";

  return (
    <button type="button" onMouseDown={(ev)=>onMouseDown(ev, iso)} onContextMenu={(e)=>e.preventDefault()}
      className={[
        "relative h-24 rounded-xl border p-2 text-left overflow-hidden",
        inMonth ? "bg-white" : "bg-slate-100 text-slate-400",
        weekend ? "border-rose-200" : "border-slate-200",
        isSelected?"ring-2 ring-indigo-500":"",
      ].join(' ')}>

      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${ownerBar}`} />
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{date.getDate()}</div>
        <div className="text-[10px] px-1 rounded bg-slate-100 border text-slate-500">{isDob?"DOB":(weekend?"Weekend":"Weekday")}</div>
      </div>
      <div className="absolute right-1 top-6 flex flex-col gap-1 items-end">
        {e?.doubleDay && <span className="text-[10px] bg-amber-100 border border-amber-300 text-amber-800 px-1 rounded">Double</span>}
        {invalidDouble && <span className="text-[10px] bg-rose-100 border border-rose-300 text-rose-800 px-1 rounded">&gt;15m</span>}
        {min180 && <span className="text-[10px] bg-rose-100 border border-rose-300 text-rose-800 px-1 rounded">MIN&lt;180</span>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
        <div className={"rounded border p-1 " + ((e?.a && e.a.type!=='OFF' && e.a.fraction>0) ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200")}>
          <div className="font-semibold">A</div>
          <div className="flex items-center gap-1">
            <span>{e?.a?.fraction ?? 0}×</span>
            <span className={
              "px-1 rounded border text-[10px] " +
              ((e?.a?.type==='SBL')
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : (e?.a?.type==='MIN'
                    ? "bg-amber-50 border-amber-300 text-amber-700"
                    : "bg-slate-100 border-slate-300 text-slate-600"))
            }>{e?.a?.type ?? 'OFF'}</span>
            {e?.a?.reserved && <span className="px-1 rounded border bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700 text-[10px]">R</span>}
          </div>
        </div>
        <div className={"rounded border p-1 " + ((e?.b && e.b.type !== 'OFF' && e.b.fraction > 0) ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-slate-200")}>
          <div className="font-semibold">B</div>
          <div className="flex items-center gap-1">
            <span>{e?.b?.fraction ?? 0}×</span>
            <span className={
              "px-1 rounded border text-[10px] " +
              ((e?.b?.type === 'SBL')
                ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                : (e?.b?.type === 'MIN'
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-slate-100 border-slate-300 text-slate-600"))
            }>{e?.b?.type ?? 'OFF'}</span>
            {e?.b?.reserved && <span className="px-1 rounded border bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700 text-[10px]">R</span>}
          </div>
        </div>
      </div>
    </button>
  );
}