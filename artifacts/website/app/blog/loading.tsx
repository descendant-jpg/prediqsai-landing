export default function BlogLoading() {
  return <main className="min-h-screen bg-night">
    <div className="border-b border-edge bg-grid"><div className="mx-auto max-w-7xl animate-pulse px-5 py-24 sm:px-8"><div className="h-3 w-32 rounded bg-panel-2" /><div className="mt-6 h-14 max-w-2xl rounded bg-panel-2" /><div className="mt-5 h-5 max-w-xl rounded bg-panel-2" /></div></div>
    <div className="mx-auto grid max-w-7xl animate-pulse gap-5 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-3">{[0,1,2,3].map((item) => <div key={item} className={`h-72 rounded-2xl border border-edge bg-panel ${item === 0 ? "md:col-span-2 md:h-96" : ""}`} />)}</div>
  </main>;
}
