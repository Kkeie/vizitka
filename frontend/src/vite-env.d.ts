/// <reference types="vite/client" />

interface Window {
  DragDropGrid?: {
    init: (config?: {
      containerSelector?: string | HTMLElement;
      itemSelector?: string;
      onUpdateOrder?: (orderData: Array<{ id: number; sort: number }>) => void;
    }) => void;
    cleanup?: () => void;
    state?: any;
    config?: any;
  };
  masonryGrid?: {
    resizeAllGridItems?: (container: string | HTMLElement) => void;
    updateMasonry?: (container?: string) => void;
    imagesLoadedPromise?: (container: HTMLElement) => Promise<void>;
  };
}

interface ImportMetaEnv {
  readonly VITE_BACKEND_API_URL?: string
  readonly VITE_BACKEND_URL?: string
  readonly VITE_BACKEND_BASE_URL?: string
  readonly VITE_BASE_PATH?: string
  readonly DOMAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "canvas-confetti" {
  interface Options {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: string[];
    zIndex?: number;
    disableForReducedMotion?: boolean;
    useWorker?: boolean;
    resize?: boolean;
  }
  function confetti(options?: Options): Promise<void>;
  export default confetti;
}