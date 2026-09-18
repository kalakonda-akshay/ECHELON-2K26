import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-sky-950/80 border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-bold text-2xl mb-4">
        404
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-400 max-w-md mb-6 font-mono">
        The requested resource or endpoint could not be found.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-semibold transition"
      >
        Return to TraceRoute Dashboard
      </Link>
    </div>
  );
}
