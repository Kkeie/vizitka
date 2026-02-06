import React from "react";
import { createBlock, type Block, type BlockType } from "../api";

export default function AddBlockGrid({ onCreated, nextSort }: { onCreated: (b: Block) => void; nextSort: number }) {
  const add = async (type: BlockType) => {
    if (type === "note") {
      const note = prompt("Текст заметки:");
      if (!note) return;
      onCreated(await createBlock({ type: "note", note, sort: nextSort }));
    } else if (type === "link") {
      const linkUrl = prompt("Ссылка:");
      if (!linkUrl) return;
      onCreated(await createBlock({ type: "link", linkUrl, sort: nextSort }));
    } else if (type === "video") {
      const videoUrl = prompt("YouTube URL:");
      if (!videoUrl) return;
      onCreated(await createBlock({ type: "video", videoUrl, sort: nextSort }));
    } else if (type === "music") {
      const musicEmbed = prompt("Вставьте embed-код/ссылку на трек:");
      if (!musicEmbed) return;
      onCreated(await createBlock({ type: "music", musicEmbed, sort: nextSort }));
    } else if (type === "map") {
      const lat = prompt("Широта:");
      const lng = prompt("Долгота:");
      if (!lat || !lng) return;
      onCreated(await createBlock({ type: "map", mapLat: Number(lat), mapLng: Number(lng), sort: nextSort }));
    } else if (type === "photo") {
      const photoUrl = prompt("URL картинки (пока без загрузки файла):");
      if (!photoUrl) return;
      onCreated(await createBlock({ type: "photo", photoUrl, sort: nextSort }));
    }
  };

  const Icon = ({ name }: { name: string }) => (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: "var(--muted)" }}>
      {name === "note" && <path d="M4 7a2 2 0 0 1 2-2h8l6 6v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/>}
      {name === "link" && <path d="M10 13a5 5 0 0 1 7 0l2 2a5 5 0 0 1-7 7l-1-1"/>}
      {name === "photo" && <path d="M4 5h16v14H4z M8 11l3 3 3-4 4 6H6z"/>}
      {name === "video" && <path d="M15 10l7-4v12l-7-4V6H3v12h12z"/>}
      {name === "music" && <path d="M9 18V6l10-2v12"/>}
      {name === "map" && <path d="M3 6l7-3 7 3 4-2v14l-7 3-7-3-4 2V4z"/>}
    </svg>
  );

  const Tile = ({ t, label, icon }: { t: BlockType; label: string; icon: string }) => (
    <button onClick={() => add(t)} className="tile" style={{ height: 140 }}>
      <Icon name={icon} />
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{label}</div>
    </button>
  );

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 className="muted" style={{ fontSize: 14, marginBottom: 10 }}>Добавить блок</h3>
      <div className="grid">
        <Tile t="note" label="Заметка" icon="note" />
        <Tile t="link" label="Ссылка" icon="link" />
        <Tile t="photo" label="Фото" icon="photo" />
        <Tile t="video" label="Видео" icon="video" />
        <Tile t="music" label="Музыка" icon="music" />
        <Tile t="map" label="Карта" icon="map" />
      </div>
    </div>
  );
}
