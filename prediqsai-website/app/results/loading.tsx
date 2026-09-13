export default function ResultsLoading() {
  return <main className="min-h-screen animate-pulse bg-night"><div className="border-b border-edge bg-grid px-5 py-24"><div className="mx-auto h-16 max-w-7xl rounded bg-panel-2" /></div><div className="border-b border-edge bg-panel"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-px lg:grid-cols-4">{[1,2,3,4].map((i) => <div key={i} className="h-32 bg-panel-2/60" />)}</div></div><div className="mx-auto max-w-7xl px-5 py-16"><div className="h-96 rounded-2xl border border-edge bg-panel" /></div></main>;
}
