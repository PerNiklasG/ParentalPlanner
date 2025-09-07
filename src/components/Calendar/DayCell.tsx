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
  return (
    <button type="button" onMouseDown={(ev)=>onMouseDown(ev, iso)} onContextMenu={(e)=>e.preventDefault()}
      className={[
        "relative h-24 rounded-xl border p-2 text-left overflow-hidden",
        inMonth ? "bg-white" : "bg-slate-100 text-slate-400",
        weekend ? "border-rose-200" : "border-slate-200",
        isSelected?"ring-2 ring-indigo-500":"",
      ].join(' ')}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{date.getDate()}</div>
        <div className="text-[10px] px-1 rounded bg-slate-100 border text-slate-500">{isDob?"DOB":(weekend?"Weekend":"Weekday")}</div>
      </div>
      <div className="absolute right-1 top-6 flex flex-col gap-1 items-end">
        {e?.doubleDay && <span className="text-[10px] bg-amber-100 border border-amber-300 px-1 rounded">Double</span>}
        {invalidDouble && <span className="text-[10px] bg-rose-100 border border-rose-300 px-1 rounded">&gt;15m</span>}
        {min180 && <span className="text-[10px] bg-rose-100 border border-rose-300 px-1 rounded">MIN&lt;180</span>}
      </div>
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
  );
}