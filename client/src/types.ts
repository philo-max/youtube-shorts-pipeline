export interface StoryboardItem {
  id: string;
  text: string;
  image: string;
}

export interface ThemeConfig {
  channelName: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  subtitles: {
    fontSize: number;
    bottom: number;
    fontFamily: string;
  };
  animations: {
    kenBurns: {
      enabled: boolean;
      zoomFactor: number;
    };
  };
}

export interface LogEntry {
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface RenderProgress {
  status: 'idle' | 'rendering' | 'success' | 'failed';
  progress: number;
  message: string;
  outputPath?: string;
  duration?: number;
  error?: string;
}
