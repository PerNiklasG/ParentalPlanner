import { startOfMonth } from "../../lib/date";

export default function MonthToolbar({ monthCursor, setPrev, setNext, childDob, setDob, jumpToDob, setToday, }: {
  monthCursor: Date;
  childDob: string;
  setPrev: () => void;
  setNext: () => void;
  setDob: (v: string) => void;
  jumpToDob: () => void;
  setToday?: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-2">
        <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={setPrev}>← Prev</button>
        <div className="font-semibold text-lg">{monthCursor.toLocaleString(undefined,{ month:'long', year:'numeric'})}</div>
        <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={setNext}>Next →</button>
        {setToday && (
          <button className="px-3 py-2 rounded-xl border hover:bg-slate-100" onClick={setToday}>Today</button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm">Child DOB:</label>
        <input type="date" className="px-2 py-1 rounded border" value={childDob} onChange={e=>setDob(e.target.value)}/>
        <button className="px-3 py-1 rounded border" onClick={jumpToDob}>Jump to DOB month</button>
      </div>
    </div>
  );
}