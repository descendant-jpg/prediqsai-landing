export default function ArticleLoading() {
  return <main className="mx-auto min-h-screen max-w-3xl animate-pulse px-5 py-20 sm:px-8"><div className="h-4 w-28 rounded bg-panel-2" /><div className="mt-16 h-3 w-36 rounded bg-panel-2" /><div className="mt-6 h-14 w-full rounded bg-panel-2" /><div className="mt-3 h-14 w-4/5 rounded bg-panel-2" /><div className="mt-8 h-5 w-64 rounded bg-panel-2" /><div className="mt-12 space-y-4 border-t border-edge pt-10">{[1,2,3,4,5].map((item) => <div key={item} className="h-5 rounded bg-panel" />)}</div></main>;
}
