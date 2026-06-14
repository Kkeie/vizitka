import React from "react";

type PageBackgroundLayerProps = {
  imageUrl: string | null;
  /** viewport — на весь экран; contained — внутри родителя (рамка телефона) */
  variant?: "viewport" | "contained";
};

export default function PageBackgroundLayer({
  imageUrl,
  variant = "viewport",
}: PageBackgroundLayerProps) {
  if (!imageUrl) return null;

  const isViewport = variant === "viewport";

  return (
    <div
      aria-hidden
      style={{
        position: isViewport ? "fixed" : "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        ...(variant === "contained" ? { borderRadius: 36 } : {}),
      }}
    >
      <img
        src={imageUrl}
        alt=""
        decoding="async"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />
    </div>
  );
}
