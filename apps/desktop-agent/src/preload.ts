import { contextBridge, ipcRenderer } from 'electron';

export interface ScanProgress {
  status: 'scanning' | 'uploading' | 'completed' | 'failed';
  totalFiles: number;
  parsedSongs: number;
  processedSongs: number;
  errorMessage?: string;
}

export interface SystemConfig {
  apiKey: string;
  systemNumber: number;
  apiUrl: string;
}

const electronAPI = {
  loadConfig: (): Promise<SystemConfig> => {
    return ipcRenderer.invoke('load-config');
  },
  saveConfig: (config: SystemConfig): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('save-config', config);
  },
  selectDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('select-directory');
  },
  startSongScan: (params: {
    directoryPath: string;
    apiUrl: string;
    apiKey: string;
    systemNumber: number;
  }): Promise<{ started: boolean }> => {
    return ipcRenderer.invoke('start-song-scan', params);
  },
  testApiConnection: (params: {
    apiUrl: string;
    apiKey: string;
    systemNumber: number;
  }): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('test-api-connection', params);
  },
  onScanProgress: (callback: (progress: ScanProgress) => void): (() => void) => {
    const subscription = (_event: any, progress: ScanProgress) => callback(progress);
    ipcRenderer.on('scan-progress', subscription);
    return () => {
      ipcRenderer.removeListener('scan-progress', subscription);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Extend Window interface for renderer typescript types
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
