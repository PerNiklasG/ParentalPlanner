import { CAPS } from "../../domain/types";

export default function SummaryCard({ totals, warnings }: { totals: any; warnings: string[] }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="text-lg font-semibold mb-2">Summary</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="font-medium">A SBL</div><div>{totals.A_SBL.toFixed(3)} / 195 (soft per-parent)</div>
        <div className="font-medium">A MIN</div><div>{totals.A_MIN.toFixed(3)}</div>
        <div className="font-medium">B SBL</div><div>{totals.B_SBL.toFixed(3)} / 195 (soft per-parent)</div>
        <div className="font-medium">B MIN</div><div>{totals.B_MIN.toFixed(3)}</div>
        <div className="font-medium">Double days A</div><div>{totals.doubleA} / {CAPS.MAX_DOUBLE_PER_PARENT}</div>
        <div className="font-medium">Double days B</div><div>{totals.doubleB} / {CAPS.MAX_DOUBLE_PER_PARENT}</div>
        <div className="font-medium">Post-4 saved</div><div>{totals.post4.toFixed(3)} / {CAPS.MAX_POST4_SAVED}</div>
        <div className="font-medium">Reserved A</div><div>{totals.resA.toFixed(3)} / {CAPS.RESERVED_PER_PARENT}</div>
        <div className="font-medium">Reserved B</div><div>{totals.resB.toFixed(3)} / {CAPS.RESERVED_PER_PARENT}</div>
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
  );
}