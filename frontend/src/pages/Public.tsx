import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { getPublic, getImageUrl, type Block, type BlockSizes, type Layout } from "../api";
import BlockCard from "../components/BlockCard";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useBentoGridMetrics } from "../hooks/useBentoGridMetrics";
import {
  BENTO_ROW_UNIT,
  GRID_COLUMNS,
  assignSparseAnchorsForBreakpoint,
  flattenLayoutIds,
  getGridRowSpan,
  getResolvedGridSize,
  resolveAnchorOverlaps,
  sortBlockIdsByDesktopVisualOrder,
} from "../lib/block-grid";

// Системные маршруты, которые не должны обрабатываться как username
// Примечание: "public" удален из списка, так как теперь мы используем маршрут /public/:username
const SYSTEM_ROUTES = ["login", "register", "editor", "u", "api", "index.html", "404.html", "index", "assets"];

export default function PublicPage() {
  const { username = "" } = useParams();
  const routerLocation = useLocation();
  const breakpoint = useBreakpoint();
  // ВСЕ хуки должны быть вызваны ДО любых условных возвратов

  const [state, setState] = React.useState<{
    loading: boolean;
    name?: string;
    bio?: string | null;
    avatarUrl?: string | null;
    backgroundUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    telegram?: string | null;
    blocks: Block[];
    layout: Layout | null;
    blockSizes: BlockSizes;
    error?: string;
  }>({ loading: true, blocks: [], layout: null, blockSizes: {} });

  // Принудительное обновление компонента при изменении пути
  const [pathKey, setPathKey] = React.useState(0);

  React.useEffect(() => {
    const checkPath = () => {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        // Если путь изменился на /public/... или /u/..., принудительно обновляем компонент
        if ((currentPath.startsWith("/public/") || currentPath.startsWith("/u/")) && (username === "index.html" || !username)) {
          setPathKey(prev => prev + 1);
        }
      }
    };
    
    // Проверяем путь сразу
    checkPath();
    
    // И периодически проверяем, если мы на /index.html
    const interval = setInterval(checkPath, 100);
    return () => clearInterval(interval);
  }, [username]);

  // Если username пустой или равен системному маршруту, пытаемся извлечь его из пути
  const extractedUsername = React.useMemo(() => {
    // Если username есть и это не системный маршрут, используем его
    if (username && username.trim() && !SYSTEM_ROUTES.includes(username.toLowerCase())) {
      return username;
    }
    // Иначе пытаемся извлечь из window.location.pathname
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      console.log('[Public] Extracting username from path:', path);
      if (path.startsWith("/public/")) {
        const match = path.match(/^\/public\/(.+)$/);
        if (match && match[1]) {
          const extracted = decodeURIComponent(match[1]);
          console.log('[Public] Extracted from /public/:', extracted);
          return extracted;
        }
      } else if (path.startsWith("/u/")) {
        const match = path.match(/^\/u\/(.+)$/);
        if (match && match[1]) {
          const extracted = decodeURIComponent(match[1]);
          console.log('[Public] Extracted from /u/:', extracted);
          return extracted;
        }
      } else if (path !== "/" && path !== "/index.html" && !path.startsWith("/api") && !path.startsWith("/assets") && !path.startsWith("/_")) {
        const match = path.match(/^\/(.+)$/);
        if (match && match[1] && !SYSTEM_ROUTES.includes(match[1].toLowerCase())) {
          const extracted = decodeURIComponent(match[1]);
          console.log('[Public] Extracted from root path:', extracted);
          return extracted;
        }
      }
    }
    return "";
  }, [username, routerLocation.pathname, pathKey]);

  // Проверяем, не является ли путь системным маршрутом
  const cleanUsername = extractedUsername.trim();
  const lowerUsername = cleanUsername.toLowerCase();

  // Если мы на /index.html и username пустой, ждем восстановления пути
  const [waitingForRestore, setWaitingForRestore] = React.useState(
    typeof window !== 'undefined' && (window.location.pathname === "/index.html" || window.location.pathname === "/index") && !cleanUsername
  );

  React.useEffect(() => {
    if (waitingForRestore || (typeof window !== 'undefined' && (window.location.pathname === "/index.html" || window.location.pathname === "/index") && !cleanUsername)) {
      // Ждем немного, чтобы дать время восстановить путь
      const timer = setTimeout(() => {
        const currentPath = window.location.pathname;
        if (currentPath !== "/index.html" && currentPath !== "/index") {
          setWaitingForRestore(false);
        } else {
          // Если путь все еще /index.html, проверяем sessionStorage
          const originalPath = sessionStorage.getItem("originalPath");
          if (originalPath && originalPath !== "/index.html" && originalPath !== "/index") {
            console.log('[Public] Restoring path from sessionStorage:', originalPath);
            window.history.replaceState(null, '', originalPath);
            sessionStorage.removeItem("originalPath");
            setWaitingForRestore(false);
            // Принудительно обновляем компонент
            setPathKey(prev => prev + 1);
          } else {
            setWaitingForRestore(false);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [waitingForRestore, cleanUsername]);

  // Проверяем системные маршруты ПОСЛЕ всех хуков
  const currentPath = routerLocation.pathname;
  const SYSTEM_PATHS = ["/", "/login", "/register", "/editor", "/index", "/index.html"];

  console.log('[Public] Component loaded with username:', cleanUsername, 'from useParams:', username, 'from extracted:', extractedUsername, 'lowerUsername:', lowerUsername, 'SYSTEM_ROUTES:', SYSTEM_ROUTES, 'window.location.pathname:', typeof window !== 'undefined' ? window.location.pathname : 'N/A', 'waitingForRestore:', waitingForRestore, 'currentPath:', currentPath);
  
  // Если это системный маршрут, не рендерим компонент (ПОСЛЕ всех хуков!)
  if (SYSTEM_PATHS.includes(currentPath)) {
    console.log('[Public] System path detected, returning null:', currentPath);
    return null;
  }

  // Если ждем восстановления пути, показываем загрузку
  if (waitingForRestore) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="muted" style={{ fontSize: 16 }}>Загрузка…</div>
      </div>
    );
  }

  // НЕ делаем редирект на "/" если username пустой или системный маршрут
  // Вместо этого просто показываем ошибку "Профиль не найден"
  // Это предотвращает бесконечные редиректы
  // Но проверяем extractedUsername, а не username из useParams, так как useParams может быть устаревшим
  if (!cleanUsername || SYSTEM_ROUTES.includes(lowerUsername)) {
    console.log('[Public] Invalid username or system route, showing error:', cleanUsername, 'extractedUsername:', extractedUsername, 'username from useParams:', username, 'window.location.pathname:', typeof window !== 'undefined' ? window.location.pathname : 'N/A');
    // Если путь правильный (/public/...), но username еще не обновился, ждем немного и перезагружаем компонент
    if (typeof window !== 'undefined') {
      const windowPath = window.location.pathname;
      if (windowPath.startsWith("/public/") || windowPath.startsWith("/u/")) {
        // Путь правильный, но username не извлечен - ждем и перезагружаем
        return (
          <div className="page-bg min-h-screen flex items-center justify-center">
            <div className="muted" style={{ fontSize: 16 }}>Загрузка…</div>
          </div>
        );
      }
    }
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="ribbon error">Профиль не найден</div>
      </div>
    );
  }

  React.useEffect(() => {
    if (!cleanUsername || cleanUsername.trim() === "") {
      setState({ loading: false, error: "not_found", blocks: [], layout: null, blockSizes: {} });
      return;
    }
    getPublic(cleanUsername)
      .then(data => {
        setState({
          loading: false,
          name: data.name,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
          backgroundUrl: data.backgroundUrl,
          phone: data.phone,
          email: data.email,
          telegram: data.telegram,
          blocks: data.blocks,
          layout: data.layout,
          blockSizes: data.blockSizes ?? {},
        });
      })
      .catch(() => {
        setState({ loading: false, error: "not_found", blocks: [], layout: null, blockSizes: {} });
      });
  }, [cleanUsername]);

  const orderedIdsRaw = state.layout?.[breakpoint]
    ? flattenLayoutIds(state.layout[breakpoint])
    : state.blocks.map((block) => block.id);

  const orderedIds = React.useMemo(() => {
    if (breakpoint === "mobile" || breakpoint === "tablet") {
      return sortBlockIdsByDesktopVisualOrder(orderedIdsRaw, state.blockSizes);
    }
    return orderedIdsRaw;
  }, [breakpoint, orderedIdsRaw.join(","), state.blockSizes]);

  const gridColumns = GRID_COLUMNS[breakpoint];
  const gridGap = breakpoint === "mobile" ? 12 : 16;
  const { gridRef, cellSize } = useBentoGridMetrics(gridColumns, gridGap, {
    maxCellSize: breakpoint === "mobile" ? 100 : undefined,
  });

  const effectiveSizes = React.useMemo(() => {
    const assigned = assignSparseAnchorsForBreakpoint(
      orderedIds,
      state.blocks,
      state.blockSizes,
      breakpoint,
      gridColumns,
      cellSize,
      gridGap,
    );
    return resolveAnchorOverlaps(
      assigned,
      orderedIds,
      state.blocks,
      breakpoint,
      gridColumns,
      cellSize,
      gridGap,
    );
  }, [orderedIds.join(","), state.blocks, state.blockSizes, breakpoint, gridColumns, cellSize, gridGap]);

  if (state.loading) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="muted" style={{ fontSize: 16 }}>Загрузка…</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="page-bg min-h-screen flex items-center justify-center">
        <div className="ribbon error">Профиль не найден</div>
      </div>
    );
  }

  return (
    <div
      className="page-bg min-h-screen public-page"
      style={{
        backgroundImage: state.backgroundUrl ? `url(${getImageUrl(state.backgroundUrl)})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        position: "relative",
        minHeight: "100dvh",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
        margin: 0,
        padding: 0,
      }}
    >
      {/* Overlay для читаемости текста */}
      {state.backgroundUrl && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(250, 250, 250, 0.55)",
          backdropFilter: "blur(2px)",
          zIndex: 0,
          pointerEvents: "none",
        }} />
      )}
      <div className="container" style={{ paddingTop: 60, paddingBottom: 80, position: "relative", zIndex: 1 }}>
        {/* Two Column Layout: Profile Left, Blocks Right */}
        <div className="two-column-layout" style={{ alignItems: "start" }}>
          {/* Left Column: Profile (fixed) + Placeholder for grid */}
          <div style={{ width: "100%", maxWidth: "100%" }}>
            {/* Profile that scrolls with page */}
            <div className="profile-column public-profile" style={{ maxWidth: "100%" }}>
              <div className="reveal reveal-in">
                <div className="public-profile-inner" style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "flex-start", textAlign: "left", width: "100%", maxWidth: "100%" }}>
                  {state.avatarUrl && (
                    <div className="public-profile-avatar" style={{
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      border: "3px solid rgba(255,255,255,0.9)",
                      boxShadow: state.backgroundUrl ? "0 4px 16px rgba(0,0,0,0.2), 0 0 32px rgba(255,255,255,0.5)" : "var(--shadow-md)",
                      padding: "3px",
                      background: state.backgroundUrl ? "rgba(255,255,255,0.9)" : "transparent"
                    }}>
                      <img
                        src={getImageUrl(state.avatarUrl)}
                        alt=""
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        borderRadius: "50%", 
                        objectFit: "cover", 
                        display: "block"
                      }}
                      onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div style={{ width: "100%", maxWidth: "100%" }}>
                    <h1 style={{
                      fontSize: 32,
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.2,
                      color: "var(--text)",
                      marginBottom: 8,
                      wordBreak: "break-word",
                      textAlign: "left",
                      textShadow: state.backgroundUrl ? "0 2px 8px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.5)" : undefined
                    }}>
                      {state.name}
                    </h1>
                    {state.bio && (
                      <p style={{
                        color: "var(--text)",
                        fontSize: 14,
                        lineHeight: 1.6,
                        textAlign: "left",
                        marginTop: 12,
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                        width: "100%",
                        maxWidth: "100%",
                        textShadow: state.backgroundUrl ? "0 1px 4px rgba(255,255,255,0.9)" : undefined
                      }}>
                        {state.bio}
                      </p>
                    )}
                    {(state.phone || state.email || state.telegram) && (
                      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                        {state.phone && <div style={{ fontSize: 14, color: "var(--text)" }}>📞 {state.phone}</div>}
                        {state.email && <div style={{ fontSize: 14, color: "var(--text)" }}>✉️ {state.email}</div>}
                        {state.telegram && <div style={{ fontSize: 14, color: "var(--text)" }}>✈️ {state.telegram}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="profile-placeholder" style={{ width: "100%", minHeight: "0px" }}></div>
          </div>

          {/* Right Column: Blocks */}
          <div style={{ minWidth: 0, width: "100%" }}>
            <div
              ref={gridRef}
              className="bento-grid bento-grid--public-fit"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
                ['--grid-columns' as string]: String(gridColumns),
                ['--grid-gap' as string]: `${gridGap}px`,
                ['--bento-cell-size' as string]: cellSize ? `${cellSize}px` : undefined,
                ['--bento-row-unit' as string]: `${BENTO_ROW_UNIT}px`,
                gap: `${gridGap}px`,
                gridAutoRows: `${BENTO_ROW_UNIT}px`,
                gridAutoFlow: 'row',
              }}
            >
              {orderedIds.map(blockId => {
                const block = state.blocks.find(b => b.id === blockId);
                if (!block) return null;

                const gridSize = getResolvedGridSize(block, effectiveSizes[block.id], gridColumns);
                const resolvedRowSpan = getGridRowSpan(block, gridSize, cellSize, gridGap);
                const anchor = effectiveSizes[block.id]?.anchorsByBreakpoint?.[breakpoint];

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
                    <BlockCard 
                    b={block} 
                    colSpan={gridSize.colSpan}
                  />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
