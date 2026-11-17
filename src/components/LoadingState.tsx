export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 h-28 animate-pulse">
            <div className="h-3.5 w-24 bg-slate-200 rounded" />
            <div className="h-7 w-32 bg-slate-200 rounded mt-4" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
