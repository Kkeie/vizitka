import React, { useEffect, useMemo, useState } from "react";
import BlockCard, { Block } from "./BlockCard";

type CreatePayload =
  | { type: "note"; note: string }
  | { type: "link"; linkUrl: string }
  | { type: "photo"; photoUrl: string }
  | { type: "video"; videoUrl: string }
  | { type: "music"; musicEmbed: string }
  | { type: "map"; mapLat: number; mapLng: number };

function getToken() {
  const t = sessionStorage.getItem("token");
  if (t) return t;
  const legacy = localStorage.getItem("token");
  if (legacy) {
    sessionStorage.setItem("token", legacy);
    localStorage.removeItem("token");
    return legacy;
  }
  return "";
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function safeJsonParse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text || text.trim().length === 0) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error('[Editor] Failed to parse JSON:', text.substring(0, 200));
    throw new Error('invalid_json_response');
  }
}

async function listBlocks(): Promise<Block[]> {
  const res = await fetch("/api/blocks", { headers: authHeaders() });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  }
  return safeJsonParse<Block[]>(res);
}

async function createBlock(payload: CreatePayload): Promise<Block> {
  const res = await fetch("/api/blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  }
  return safeJsonParse<Block>(res);
}

async function deleteBlock(id: number) {
  const res = await fetch(`/api/blocks/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${txt}`);
  }
}

export default function Editor() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const authed = useMemo(() => !!getToken(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await listBlocks();
        if (!cancelled) setBlocks(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addNote() {
    const text = prompt("Текст заметки:");
    if (!text) return;
    try {
      const b = await createBlock({ type: "note", note: text });
      setBlocks((prev) => [b, ...prev]);
    } catch (e: any) {
      alert(e?.message || e);
    }
  }

  async function addLink() {
    const url = prompt("URL ссылки (https://...):");
    if (!url) return;
    try {
      const b = await createBlock({ type: "link", linkUrl: url });
      setBlocks((prev) => [b, ...prev]);
    } catch (e: any) {
      alert(e?.message || e);
    }
  }

  async function addPhoto() {
    const url = prompt("URL изображения (https://... .jpg/.png и т.п.):");
    if (!url) return;
    try {
      const b = await createBlock({ type: "photo", photoUrl: url });
      setBlocks((prev) => [b, ...prev]);
    } catch (e: any) {
      alert(e?.message || e);
    }
  }

  async function addVideo() {
    const url = prompt("Ссылка на YouTube (watch?v=..., youtu.be/..., shorts/...):");
    if (!url) return;
    try {
      const b = await createBlock({ type: "video", videoUrl: url });
      setBlocks((prev) => [b, ...prev]);
    } catch (e: any) {
      alert(e?.message || e);
    }
  }

  async function addMusic() {
    const url = prompt(
      "Музыка: mp3/ogg/wav ИЛИ ссылка на Spotify/SoundCloud/YouTube (вставь любой URL или embed):"
    );
    if (!url) return;
    try {
      const b = await createBlock({ type: "music", musicEmbed: url });
      setBlocks((prev) => [b, ...prev]);
    } catch (e: any) {
      alert(e?.message || e);
    }
  }

  async function addMap() {
    const lat = prompt("Широта (lat), например 55.751244:");
    if (lat == null) return;
    const lng = prompt("Долгота (lng), например 37.618423:");
    if (lng == null) return;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      alert("Неверные координаты");
      return;
    }
    try {
      const b = await createBlock({ type: "map", mapLat: latNum, mapLng: lngNum });
      setBlocks((prev) => [b, ...prev]);
    } catch (e: any) {
      alert(e?.message || e);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить блок?")) return;
    try {
      await deleteBlock(id);
      setBlocks((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      alert(e?.message || e);
    }
  }

  const wrap: React.CSSProperties = { maxWidth: 900, margin: "0 auto", padding: 16 };
  const h1: React.CSSProperties = { fontSize: 24, fontWeight: 700, marginBottom: 12 };
  const bar: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 };
  const btn: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    cursor: "pointer",
  };
  const alertErr: React.CSSProperties = {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    whiteSpace: "pre-wrap",
  };
  const hint: React.CSSProperties = { color: "#6b7280", marginTop: 8 };

  return (
    <div style={wrap}>
      <h1 style={h1}>Конструктор блоков</h1>

      {!authed && (
        <div style={alertErr}>
          Вы не авторизованы. Войдите, чтобы редактировать блоки.
        </div>
      )}

      {err && <div style={alertErr}>{err}</div>}

      <div style={bar}>
        <button style={btn} onClick={addNote} disabled={!authed}>
          Заметка
        </button>
        <button style={btn} onClick={addLink} disabled={!authed}>
          Ссылка
        </button>
        <button style={btn} onClick={addPhoto} disabled={!authed}>
          Фото (URL)
        </button>
        <button style={btn} onClick={addVideo} disabled={!authed}>
          Видео (YouTube)
        </button>
        <button style={btn} onClick={addMusic} disabled={!authed}>
          Музыка
        </button>
        <button style={btn} onClick={addMap} disabled={!authed}>
          Карта
        </button>
      </div>

      {loading ? (
        <div>Загрузка…</div>
      ) : blocks.length === 0 ? (
        <div style={hint}>
          Пока нет блоков. Добавьте сверху «Заметка», «Ссылка», «Фото» и т.д.
        </div>
      ) : (
        blocks.map((b) => (
          <BlockCard key={b.id} b={b} onDelete={authed ? () => handleDelete(b.id) : undefined} />
        ))
      )}
    </div>
  );
}
