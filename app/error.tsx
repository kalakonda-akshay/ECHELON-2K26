"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 font-mono font-bold text-xl mb-4">
        ERR
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Something Went Wrong</h2>
      <p className="text-sm text-slate-400 max-w-md mb-6 font-mono">
        {error.message || "An unexpected error occurred in the application."}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-semibold transition"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
