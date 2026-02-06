import React, { ReactNode } from "react";

export default function TwoPane({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-10">
        <aside className="lg:sticky lg:top-8 self-start">{left}</aside>
        <main>{right}</main>
      </div>
    </div>
  );
}



