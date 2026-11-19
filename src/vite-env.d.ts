/// <reference types="vite/client" />

interface StorageInfo {
  filePath: string;
  excelPath: string;
  backupDir: string;
  exists: boolean;
  excelExists: boolean;
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
  saveFileData?: (payload: any) => Promise<{ success: boolean; filePath?: string; excelPath?: string; backupFile?: string; error?: string }>;
  setStorageConfig?: (config: any) => Promise<{ success: boolean; config?: any; error?: string }>;
  openDataFolder?: () => Promise<boolean>;
  openExcelFile?: () => Promise<boolean>;
  showNotification?: (payload: { title: string; body: string }) => Promise<boolean>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
