import React from "react";
import Avatar from "./Avatar";

export default function ProfileCard({
  avatarUrl,
  name,
  username,
  bio,
  onShare,
}: {
  avatarUrl?: string | null;
  name: string;
  username: string;
  bio?: string | null;
  onShare?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <Avatar src={avatarUrl || undefined} size={96} editable={false} />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900 truncate">{name}</h1>
          <p className="text-slate-500">@{username}</p>
        </div>
      </div>
      {bio && <p className="mt-4 text-slate-700 leading-relaxed">{bio}</p>}

      <button
        type="button"
        onClick={onShare}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[.99] transition"
      >
        🔗 Поделиться ссылкой
      </button>
    </div>
  );
}



