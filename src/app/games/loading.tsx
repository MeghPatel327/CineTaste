export default function GamesLoading() {
  return (
    <div className="min-h-screen bg-[#080511] text-[#F5F7F6] p-4 sm:p-6 lg:p-8 space-y-8 animate-pulse">
      {/* Hero skeleton */}
      <div className="max-w-7xl mx-auto w-full h-[60vh] min-h-[420px] rounded-3xl bg-[#130E24]/60 border border-purple-500/15 flex items-end p-6 md:p-12">
        <div className="space-y-4 max-w-xl w-full">
          <div className="h-6 w-32 rounded-full bg-purple-900/40" />
          <div className="h-12 w-3/4 rounded-xl bg-purple-900/30" />
          <div className="h-4 w-full rounded-md bg-purple-900/20" />
          <div className="h-10 w-44 rounded-xl bg-purple-600/40" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-[#130E24]/40 border border-purple-500/10" />
        ))}
      </div>
    </div>
  );
}
