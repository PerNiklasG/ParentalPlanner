export default function SGICard({ list }: { list: string[] }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 text-sm">
      <div className="font-semibold mb-2">SGI weekly check (after 1 year)</div>
      {list.length===0 ? (
        <div className="text-emerald-700">All checked weeks have ≥5 weekdays covered.</div>
      ) : (
        <div>
          <div className="mb-1 text-rose-700">Weeks with &lt; 5 weekdays covered:</div>
          <div className="flex flex-wrap gap-2">{list.map(w => <span key={w} className="text-xs bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">{w}</span>)}</div>
        </div>
      )}
    </div>
  );
}