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
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
