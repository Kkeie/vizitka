import React from "react";
import { createPortal } from "react-dom";
import { getImageUrl, type Block, type BlockSizes, type Layout, type Profile } from "../api";
import BlockCard from "./BlockCard";
import Avatar from "./Avatar";
import { useBentoGridMetrics } from "../hooks/useBentoGridMetrics";
import {
  BENTO_ROW_UNIT,
  GRID_COLUMNS,
  assignSparseAnchorsForBreakpoint,
  flattenLayoutIds,
  getGridRowSpan,
  getResolvedGridSize,
  sortBlockIdsByDesktopVisualOrder,
} from "../lib/block-grid";

type Props = {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  blocks: Block[];
  layout: Layout | null;
  blockSizes: BlockSizes;
};

const MODAL_CHROME_PX = 100;

export default function MobileVisitPreviewModal({
  open,
  onClose,
  profile,
  blocks,
  layout,
  blockSizes,
}: Props) {
  const orderedIdsRaw = React.useMemo(
    () => (layout?.mobile ? flattenLayoutIds(layout.mobile) : blocks.map((b) => b.id)),
    [layout, blocks],
  );

  const orderedIds = React.useMemo(
    () => sortBlockIdsByDesktopVisualOrder(orderedIdsRaw, blockSizes),
    [orderedIdsRaw.join(","), blockSizes],
  );

  const gridColumns = GRID_COLUMNS.mobile;
  const gridGap = 12;
  const { gridRef, cellSize } = useBentoGridMetrics(gridColumns, gridGap, {
    maxCellSize: 100,
  });

  const previewSizes = React.useMemo(
    () =>
      assignSparseAnchorsForBreakpoint(
        orderedIds,
        blocks,
        blockSizes,
        "mobile",
        gridColumns,
        cellSize,
        gridGap,
      ),
    [orderedIds.join(","), blocks, blockSizes, gridColumns, cellSize, gridGap],
  );

  if (!open) {
    return null;
  }

  const bgUrl = profile.backgroundUrl ? getImageUrl(profile.backgroundUrl) : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Превью визитки на телефоне"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 12000,
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:
          "max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <button
        type="button"
        className="btn btn-ghost"
        aria-label="Закрыть превью"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: "fixed",
          top: "max(12px, env(safe-area-inset-top))",
          right: "max(12px, env(safe-area-inset-right))",
          zIndex: 12001,
          fontSize: 14,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        Закрыть
      </button>

      <div
        className="card"
        style={{
          width: "min(440px, 100%)",
          maxWidth: "100%",
          margin: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          boxShadow: "var(--shadow-xl)",
          flexShrink: 0,
          maxHeight: "min(calc(100dvh - 24px), 900px)",
          minHeight: 0,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            alignSelf: "center",
            width: `min(375px, calc(100vw - 32px), calc((100dvh - ${MODAL_CHROME_PX}px) * 9 / 20))`,
            aspectRatio: "9 / 20",
            height: "auto",
            maxHeight: `calc(100dvh - ${MODAL_CHROME_PX}px)`,
            borderRadius: 36,
            border: "10px solid #1a1a1a",
            boxShadow: "inset 0 0 0 2px #333, 0 12px 40px rgba(0,0,0,0.35)",
            overflow: "hidden",
            background: "#1a1a1a",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <div
            className="editor-mobile-preview-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              touchAction: "pan-y",
              position: "relative",
              background: "var(--bg)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {bgUrl && (
              <>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${bgUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.45,
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(250, 250, 250, 0.55)",
                    backdropFilter: "blur(2px)",
                    pointerEvents: "none",
                    zIndex: 0,
                  }}
                />
              </>
            )}

            <div
              className="public-mobile-bento-bar"
              style={{
                position: "relative",
                zIndex: 1,
                flexShrink: 0,
                textAlign: "left",
                padding: "12px 12px 14px",
                borderBottom: "1px solid var(--border)",
                background: "rgba(255,255,255,0.98)",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: "-0.02em",
                  color: "var(--text)",
                }}
              >
                Визитка
              </span>
            </div>

            <div
              style={{
                position: "relative",
                zIndex: 1,
                padding: "20px 12px 40px",
                boxSizing: "border-box",
                flex: 1,
                minHeight: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  alignItems: "stretch",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start", width: "100%" }}>
                  {profile.avatarUrl && (
                    <Avatar src={profile.avatarUrl} size={120} editable={false} />
                  )}
                  <h1 style={{
                    fontSize: 32,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    margin: 0,
                    padding: 0,
                    color: "var(--text)",
                  }}>
                    {profile.name || profile.username}
                  </h1>
                  {profile.bio && (
                    <p style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      margin: 0,
                      padding: 0,
                      color: "var(--muted)",
                      whiteSpace: "pre-wrap",
                    }}>
                      {profile.bio}
                    </p>
                  )}
                  {/* {(profile.phone || profile.email || profile.telegram) && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      {profile.phone && (
                        <div style={{ fontSize: 13, color: "var(--text)" }}>📞 {profile.phone}</div>
                      )}
                      {profile.email && (
                        <div style={{ fontSize: 13, color: "var(--text)" }}>✉️ {profile.email}</div>
                      )}
                      {profile.telegram && (
                        <div style={{ fontSize: 13, color: "var(--text)" }}>✈️ {profile.telegram}</div>
                      )}
                    </div>
                  )} */}
                </div>

                <div style={{ minWidth: 0, width: "100%" }}>
                  {blocks.length === 0 ? (
                    <div
                      style={{
                        padding: 16,
                        textAlign: "center",
                        color: "var(--muted)",
                        fontSize: 12,
                        borderRadius: "var(--radius-md)",
                        border: "1px dashed var(--border)",
                        background: "rgba(255,255,255,0.6)",
                      }}
                    >
                      Добавьте блоки — здесь появится сетка
                    </div>
                  ) : (
                    <div
                      ref={gridRef}
                      className="bento-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
                        ["--grid-columns" as string]: String(gridColumns),
                        ["--grid-gap" as string]: `${gridGap}px`,
                        ["--bento-cell-size" as string]: cellSize ? `${cellSize}px` : undefined,
                        ["--bento-row-unit" as string]: `${BENTO_ROW_UNIT}px`,
                        gap: `${gridGap}px`,
                        gridAutoRows: `${BENTO_ROW_UNIT}px`,
                        gridAutoFlow: "row",
                        width: "100%",
                      }}
                    >
                      {orderedIds.map((blockId) => {
                        const block = blocks.find((b) => b.id === blockId);
                        if (!block) return null;
                        const gridSize = getResolvedGridSize(block, previewSizes[block.id], gridColumns);
                        const resolvedRowSpan = getGridRowSpan(block, gridSize, cellSize, gridGap);
                        const anchor = previewSizes[block.id]?.anchorsByBreakpoint?.mobile;
                        return (
                          <div
                            key={block.id}
                            className="bento-grid-item"
                            style={{
                              gridColumn: anchor
                                ? `${anchor.gridColumnStart} / span ${gridSize.colSpan}`
                                : `span ${gridSize.colSpan}`,
                              gridRow: anchor
                                ? `${anchor.gridRowStart} / span ${resolvedRowSpan}`
                                : `span ${resolvedRowSpan}`,
                              minWidth: 0,
                              minHeight: 0,
                            }}
                          >
                            <BlockCard b={block} colSpan={gridSize.colSpan} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}