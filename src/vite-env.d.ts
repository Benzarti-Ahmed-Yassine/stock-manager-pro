/// <reference types="vite/client" />

interface StorageInfo {
  filePath: string;
  backupDir: string;
  exists: boolean;
  size: number;
  lastModified: string | null;
  config: {
    dataPath: string;
    backupPath: string;
    backupCount: number;
  };
}

interface ElectronAPI {
  platform: string;
  getStorageInfo?: () => Promise<StorageInfo>;
  loadFileData?: () => Promise<{ success: boolean; data?: any; error?: string }>;
  saveFileData?: (data: any) => Promise<{ success: boolean; filePath?: string; backupFile?: string; error?: string }>;
  setStorageConfig?: (config: any) => Promise<{ success: boolean; config?: any; error?: string }>;
  showNotification?: (payload: { title: string; body: string }) => Promise<boolean>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
