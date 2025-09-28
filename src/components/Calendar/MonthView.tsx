import DayCell from "./DayCell";
import type { DayEntry } from "../../domain/types";
import Legend from "./Legend";

type Props = {
  days: { iso: string; date: Date }[];
  monthCursor: Date;
  childDobISO: string;
  fifteenMonths: Date;
  entries: Record<string, DayEntry>;
  selectedISO: string | null;
  selection: Set<string>;
  minBefore180: Set<string>;
  onMouseDownDay: (e: React.MouseEvent<HTMLButtonElement>, iso: string) => void;
};

export default function MonthView({ days, monthCursor, childDobISO, fifteenMonths, entries, selectedISO, selection, minBefore180, onMouseDownDay }: Props) {
    return (
        <>
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 grid grid-cols-7 text-center mt-4 text-xs font-medium text-slate-500">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="py-1">{d}</div>
                ))}
            </div>

            <Legend />
            <div className="grid grid-cols-7 gap-1">
                {days.map(({ iso, date }) => {
                    const inMonth = date.getMonth() === monthCursor.getMonth();
                    const e = entries[iso];
                    const invalidDouble = !!(e?.doubleDay && date > fifteenMonths);
                    const isSelected = selectedISO === iso || selection.has(iso);
                    return (
                        <DayCell key={iso}
                            iso={iso}
                            date={date}
                            inMonth={inMonth}
                            entry={e}
                            isSelected={isSelected}
                            isDob={iso === childDobISO}
                            invalidDouble={invalidDouble}
                            min180={minBefore180.has(iso)}
                            onMouseDown={onMouseDownDay}
                        />
                    );
                })}
            </div>
        </>
  );
}