import { useState, useEffect, useRef } from 'react';
import { 
  Film, Settings, Tv, Plus, Trash2, Save, Play, CheckCircle2, 
  AlertTriangle, RefreshCw, Smartphone, Wifi, Copy, FileText, Check, Music, Layout
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StoryboardItem, ThemeConfig, LogEntry, RenderProgress } from './types';

// Extend window interface for Electron IPC
declare global {
  interface Window {
    electronAPI?: {
      loadStoryboard: () => Promise<StoryboardItem[]>;
      saveStoryboard: (items: StoryboardItem[]) => Promise<boolean>;
      loadTheme: () => Promise<ThemeConfig>;
      saveTheme: (config: ThemeConfig) => Promise<boolean>;
      startRender: (options: {
        useLocalTts: boolean;
        elevenlabsApiKey?: string;
        voiceId?: string;
        modelId?: string;
        outputName?: string;
      }) => Promise<boolean>;
      onRenderLog: (callback: (log: string) => void) => void;
      onRenderProgress: (callback: (data: { progress: number; message: string; phase: string }) => void) => void;
      onRenderSuccess: (callback: (data: { outputPath: string; duration: number }) => void) => void;
      onRenderError: (callback: (error: string) => void) => void;
      getIpAddress: () => Promise<string>;
      getServerStatus: () => Promise<{ running: boolean; port: number }>;
      toggleServer: (start: boolean) => Promise<{ running: boolean; port: number }>;
      openDirectory: (path: string) => Promise<string>;
    };
  }
}

const DEFAULT_THEME: ThemeConfig = {
  channelName: '真相馆',
  colors: {
    primary: '#ffcc00',
    secondary: '#8b5cf6',
    background: '#0b0f19',
    text: '#ffffff'
  },
  subtitles: {
    fontSize: 64,
    bottom: 120,
    fontFamily: 'Outfit'
  },
  animations: {
    kenBurns: {
      enabled: true,
      zoomFactor: 1.15
    }
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'theme' | 'render' | 'sync'>('editor');
  
  // Connection Mode State
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [serverIp, setServerIp] = useState<string>('localhost');
  const [serverPort, setServerPort] = useState<number>(4000);
  const [connected, setConnected] = useState<boolean>(false);
  const [pairingIp, setPairingIp] = useState<string>(''); // For mobile client to connect
  
  // App Core States
  const [storyboard, setStoryboard] = useState<StoryboardItem[]>([]);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(DEFAULT_THEME);
  
  // Render Tab States
  const [useLocalTts, setUseLocalTts] = useState<boolean>(true);
  const [elevenlabsKey, setElevenlabsKey] = useState<string>('');
  const [voiceId, setVoiceId] = useState<string>('21m00Tcm4TlvDq8ikWAM');
  const [modelId, setModelId] = useState<string>('eleven_multilingual_v2');
  const [outputName, setOutputName] = useState<string>('out/video.mp4');
  
  // Render Progress & Logs
  const [renderProgress, setRenderProgress] = useState<RenderProgress>({ status: 'idle', progress: 0, message: '' });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isServerRunning, setIsServerRunning] = useState<boolean>(false);
  
  // UI States
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Initialize environment detection & fetch base data
  useEffect(() => {
    const hasElectron = !!window.electronAPI;
    setIsElectron(hasElectron);

    if (hasElectron) {
      setConnected(true);
      // Load local config
      loadLocalData();
      
      // Hook up Electron Event Listeners
      window.electronAPI?.onRenderLog((msg) => {
        appendLog('info', msg);
      });

      window.electronAPI?.onRenderProgress((data) => {
        setRenderProgress({
          status: 'rendering',
          progress: Math.round(data.progress * 100),
          message: data.message
        });
        appendLog('info', `[Render] ${data.message} (${Math.round(data.progress * 100)}%)`);
      });

      window.electronAPI?.onRenderSuccess((data) => {
        setRenderProgress({
          status: 'success',
          progress: 100,
          message: '渲染圆满完成！',
          outputPath: data.outputPath,
          duration: data.duration
        });
        appendLog('success', `渲染成功！成片路径：${data.outputPath}，时长：${data.duration.toFixed(1)} 秒。`);
        triggerConfetti();
      });

      window.electronAPI?.onRenderError((err) => {
        setRenderProgress({
          status: 'failed',
          progress: 0,
          message: '任务异常中断',
          error: err
        });
        appendLog('error', `渲染失败: ${err}`);
      });
      
      // Get Sync Server details
      window.electronAPI?.getIpAddress().then((ip) => {
        setPairingIp(ip);
      });
      window.electronAPI?.getServerStatus().then((status) => {
        setIsServerRunning(status.running);
        setServerPort(status.port);
      });
    } else {
      // Check if we have a saved connection endpoint in LocalStorage (for APK/Web app)
      const savedIp = localStorage.getItem('sync_server_ip');
      const savedPort = localStorage.getItem('sync_server_port');
      if (savedIp) setServerIp(savedIp);
      if (savedPort) setServerPort(Number(savedPort));
    }
  }, []);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const loadLocalData = async () => {
    if (!window.electronAPI) return;
    try {
      setLoading(true);
      const sb = await window.electronAPI.loadStoryboard();
      setStoryboard(sb);
      const th = await window.electronAPI.loadTheme();
      setThemeConfig(th);
      appendLog('success', '已加载本地数据与配置');
    } catch (e: any) {
      appendLog('error', `加载本地数据失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Sync Server connection for Mobile client (HTTP Mode)
  const connectToRemoteServer = async () => {
    try {
      setLoading(true);
      const url = `http://${serverIp}:${serverPort}/api/status`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Remote status check passed:', data);
        setConnected(true);
        localStorage.setItem('sync_server_ip', serverIp);
        localStorage.setItem('sync_server_port', String(serverPort));
        
        // Fetch Storyboard & Theme from Server
        const sbRes = await fetch(`http://${serverIp}:${serverPort}/api/storyboard`);
        const thRes = await fetch(`http://${serverIp}:${serverPort}/api/theme`);
        if (sbRes.ok) setStoryboard(await sbRes.json());
        if (thRes.ok) setThemeConfig(await thRes.json());
        
        appendLog('success', `成功连接到服务端 http://${serverIp}:${serverPort}`);
        triggerConfetti();
      } else {
        throw new Error('Server returned error status');
      }
    } catch (e: any) {
      setConnected(false);
      alert(`连接服务端失败，请检查 IP 和 端口 是否正确，或电脑端是否开启了“同步服务器”模式。\n错误: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnectRemoteServer = () => {
    setConnected(false);
    setStoryboard([]);
    setThemeConfig(DEFAULT_THEME);
  };

  // Logs helper
  const appendLog = (type: 'info' | 'warn' | 'error' | 'success', message: string) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs(prev => [...prev.slice(-199), entry]); // Keep last 200 logs
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff8800', '#ffcc00', '#8b5cf6', '#3b82f6']
    });
  };

  // Storyboard editing actions
  const handleStoryboardChange = (index: number, key: keyof StoryboardItem, value: string) => {
    const updated = [...storyboard];
    updated[index] = { ...updated[index], [key]: value };
    setStoryboard(updated);
  };

  const addStoryboardRow = () => {
    const newId = storyboard.length > 0 ? String(Math.max(...storyboard.map(i => isNaN(Number(i.id)) ? 0 : Number(i.id))) + 1) : '1';
    setStoryboard([...storyboard, { id: newId, text: '', image: `${newId}.jpg` }]);
  };

  const removeStoryboardRow = (index: number) => {
    const updated = storyboard.filter((_, i) => i !== index);
    setStoryboard(updated);
  };

  const saveStoryboard = async () => {
    try {
      setLoading(true);
      if (isElectron && window.electronAPI) {
        const success = await window.electronAPI.saveStoryboard(storyboard);
        if (success) appendLog('success', '分镜脚本已成功保存到本地 storyboard.csv');
      } else {
        // Send to remote server
        const res = await fetch(`http://${serverIp}:${serverPort}/api/storyboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(storyboard)
        });
        if (res.ok) appendLog('success', '分镜脚本已成功同步到远程服务端');
        else throw new Error('Failed to save to server');
      }
    } catch (e: any) {
      appendLog('error', `保存分镜脚本失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Theme Editing Actions
  const handleThemeChange = (category: keyof ThemeConfig, key: string, value: any) => {
    setThemeConfig(prev => {
      const updated = { ...prev };
      if (category === 'colors' || category === 'subtitles') {
        (updated[category] as any)[key] = value;
      } else if (category === 'animations') {
        updated.animations.kenBurns = { ...updated.animations.kenBurns, [key]: value };
      } else {
        (updated as any)[category] = value;
      }
      return updated;
    });
  };

  const saveTheme = async () => {
    try {
      setLoading(true);
      if (isElectron && window.electronAPI) {
        const success = await window.electronAPI.saveTheme(themeConfig);
        if (success) appendLog('success', '全局样式配置已成功保存到本地 theme.json');
      } else {
        // Remote save
        const res = await fetch(`http://${serverIp}:${serverPort}/api/theme`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(themeConfig)
        });
        if (res.ok) appendLog('success', '全局样式配置已同步至服务端');
        else throw new Error('Server side error');
      }
    } catch (e: any) {
      appendLog('error', `保存全局配置失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render trigger
  const runRenderPipeline = async () => {
    setLogs([]);
    appendLog('info', '🎬 启动视频自动化生成流水线...');
    setRenderProgress({ status: 'rendering', progress: 5, message: '初始化目录结构与环境检测...' });
    
    try {
      if (isElectron && window.electronAPI) {
        await window.electronAPI.startRender({
          useLocalTts,
          elevenlabsApiKey: elevenlabsKey,
          voiceId,
          modelId,
          outputName
        });
      } else {
        // Send request to API server for remote rendering
        const res = await fetch(`http://${serverIp}:${serverPort}/api/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            useLocalTts,
            elevenlabsApiKey: elevenlabsKey,
            voiceId,
            modelId,
            outputName
          })
        });
        
        if (!res.ok) throw new Error('服务端拒绝了渲染请求或渲染异常');
        
        appendLog('info', '已向远程服务端提交渲染任务。轮询获取进度中...');
        // Start polling for progress
        pollRenderProgress();
      }
    } catch (e: any) {
      setRenderProgress({ status: 'failed', progress: 0, message: '启动任务失败', error: e.message });
      appendLog('error', `无法启动渲染 pipeline: ${e.message}`);
    }
  };

  // Polling helper for remote client
  const pollTimerRef = useRef<any>(null);
  const pollRenderProgress = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    
    pollTimerRef.current = setInterval(async () => {
      try {
        const response = await fetch(`http://${serverIp}:${serverPort}/api/render/status`);
        if (!response.ok) return;
        const data = await response.json();
        
        setRenderProgress({
          status: data.status,
          progress: data.progress,
          message: data.message
        });

        if (data.logs && data.logs.length > 0) {
          // Sync recent logs
          setLogs(data.logs);
        }

        if (data.status === 'success') {
          clearInterval(pollTimerRef.current);
          triggerConfetti();
          appendLog('success', `渲染任务已在服务端圆满完成！`);
        } else if (data.status === 'failed') {
          clearInterval(pollTimerRef.current);
          appendLog('error', `服务端渲染任务异常失败。`);
        }
      } catch (err) {
        console.error('Failed to poll status', err);
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Server management (Electron only)
  const toggleSyncServer = async () => {
    if (!window.electronAPI) return;
    try {
      const targetState = !isServerRunning;
      const status = await window.electronAPI.toggleServer(targetState);
      setIsServerRunning(status.running);
      setServerPort(status.port);
      if (status.running) {
        appendLog('success', `同步服务器已启动，监听端口: ${status.port}，外网/内网IP: ${pairingIp}`);
      } else {
        appendLog('warn', '同步服务器已关闭');
      }
    } catch (e: any) {
      appendLog('error', `操作同步服务器失败: ${e.message}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`http://${pairingIp}:${serverPort}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo-section">
          <div className="logo-icon">🎬</div>
          <div>
            <h1 className="logo-title">YouTube Shorts Studio</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>自动化短视频流水线</p>
          </div>
          <span className="logo-badge">V1.0.0</span>
        </div>

        {/* Global Connection Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isElectron ? (
            <span className="status-badge success">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              桌面本地模式
            </span>
          ) : connected ? (
            <span className="status-badge success">
              <Wifi size={14} />
              已连接远程端 ({serverIp})
            </span>
          ) : (
            <span className="status-badge failed">
              <AlertTriangle size={14} />
              未连接电脑端
            </span>
          )}
          
          <div className="tabs-navigation">
            <button 
              className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <Film size={16} />
              分镜编辑
            </button>
            <button 
              className={`tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
              onClick={() => setActiveTab('theme')}
            >
              <Settings size={16} />
              视觉样式
            </button>
            <button 
              className={`tab-btn ${activeTab === 'render' ? 'active' : ''}`}
              onClick={() => setActiveTab('render')}
            >
              <Tv size={16} />
              一键渲染
            </button>
            <button 
              className={`tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
              onClick={() => setActiveTab('sync')}
            >
              <Smartphone size={16} />
              手机同步
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel */}
      <main className="main-content">
        
        {/* Connection Setup Card for Mobile/Web if not connected */}
        {!connected && !isElectron && (
          <div className="glass-card" style={{ maxWidth: 500, margin: '4rem auto', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
              <Smartphone size={48} color="var(--primary)" />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>连接到电脑端 Studio</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                请打开电脑端程序中的“手机同步”选项卡，开启同步服务器，然后在此输入电脑的局域网 IP 与端口进行绑定。
              </p>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">电脑 IP 地址</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="例如: 192.168.1.100" 
                    value={serverIp}
                    onChange={(e) => setServerIp(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">端口号</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="4000" 
                    value={serverPort}
                    onChange={(e) => setServerPort(Number(e.target.value))}
                  />
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={connectToRemoteServer}
                  disabled={loading}
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : '连接电脑端'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Core Workspace Dashboard */}
        {(connected || isElectron) && (
          <div className="dashboard-grid">
            
            {/* Left Main View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Tab 1: Storyboard Editor */}
              {activeTab === 'editor' && (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Film size={20} color="var(--primary)" />
                        分镜脚本编辑器
                      </h2>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>可视化增删查改故事板分镜，直接同步生成本地 CSV 格式配置文件</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-secondary" onClick={addStoryboardRow}>
                        <Plus size={16} />
                        添加分镜
                      </button>
                      <button className="btn btn-primary" onClick={saveStoryboard} disabled={loading}>
                        <Save size={16} />
                        保存同步
                      </button>
                    </div>
                  </div>

                  <div className="storyboard-table-container">
                    <table className="storyboard-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>镜头编号</th>
                          <th>解说文案 (台词)</th>
                          <th style={{ width: '220px' }}>对应图片文件名</th>
                          <th style={{ width: '60px', textAlign: 'center' }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storyboard.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}
                                value={item.id}
                                onChange={(e) => handleStoryboardChange(index, 'id', e.target.value)}
                              />
                            </td>
                            <td>
                              <textarea 
                                className="form-input" 
                                style={{ padding: '0.5rem', height: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                                value={item.text}
                                onChange={(e) => handleStoryboardChange(index, 'text', e.target.value)}
                                placeholder="输入该镜头朗读的配音台词..."
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}
                                value={item.image}
                                onChange={(e) => handleStoryboardChange(index, 'image', e.target.value)}
                                placeholder="例如: 1.jpg"
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                className="btn btn-secondary btn-danger" 
                                style={{ padding: '0.5rem', minWidth: 'auto', borderRadius: '6px' }}
                                onClick={() => removeStoryboardRow(index)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {storyboard.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dark)' }}>
                              <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                              还没有分镜记录，点击右上角 “添加分镜” 开始吧！
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: Visual Style Settings */}
              {activeTab === 'theme' && (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layout size={20} color="var(--primary)" />
                        全局视觉主题 (`theme.json`)
                      </h2>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>配置频道专属配色、字幕字体、Ken Burns 特效强度</p>
                    </div>
                    <button className="btn btn-primary" onClick={saveTheme} disabled={loading}>
                      <Save size={16} />
                      保存并应用
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>频道基本信息</h3>
                      <div className="form-group">
                        <label className="form-label">频道名称 (显示于视频片尾)</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={themeConfig.channelName}
                          onChange={(e) => handleThemeChange('channelName', '', e.target.value)}
                        />
                      </div>

                      <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginTop: '1rem' }}>配色系统</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label">高亮强调色</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="color" 
                              className="form-input" 
                              style={{ width: '40px', padding: 0, height: '40px', cursor: 'pointer' }}
                              value={themeConfig.colors.primary}
                              onChange={(e) => handleThemeChange('colors', 'primary', e.target.value)}
                            />
                            <input 
                              type="text" 
                              className="form-input" 
                              value={themeConfig.colors.primary}
                              onChange={(e) => handleThemeChange('colors', 'primary', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">渐变辅助色</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="color" 
                              className="form-input" 
                              style={{ width: '40px', padding: 0, height: '40px', cursor: 'pointer' }}
                              value={themeConfig.colors.secondary}
                              onChange={(e) => handleThemeChange('colors', 'secondary', e.target.value)}
                            />
                            <input 
                              type="text" 
                              className="form-input" 
                              value={themeConfig.colors.secondary}
                              onChange={(e) => handleThemeChange('colors', 'secondary', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">底色背景</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="color" 
                              className="form-input" 
                              style={{ width: '40px', padding: 0, height: '40px', cursor: 'pointer' }}
                              value={themeConfig.colors.background}
                              onChange={(e) => handleThemeChange('colors', 'background', e.target.value)}
                            />
                            <input 
                              type="text" 
                              className="form-input" 
                              value={themeConfig.colors.background}
                              onChange={(e) => handleThemeChange('colors', 'background', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">文字默认色</label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input 
                              type="color" 
                              className="form-input" 
                              style={{ width: '40px', padding: 0, height: '40px', cursor: 'pointer' }}
                              value={themeConfig.colors.text}
                              onChange={(e) => handleThemeChange('colors', 'text', e.target.value)}
                            />
                            <input 
                              type="text" 
                              className="form-input" 
                              value={themeConfig.colors.text}
                              onChange={(e) => handleThemeChange('colors', 'text', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>字幕配置</h3>
                      <div className="form-group">
                        <label className="form-label">字体选择</label>
                        <select 
                          className="form-input"
                          value={themeConfig.subtitles.fontFamily}
                          onChange={(e) => handleThemeChange('subtitles', 'fontFamily', e.target.value)}
                        >
                          <option value="Outfit">Outfit (默认英文高级感)</option>
                          <option value="Inter">Inter (现代无衬线)</option>
                          <option value="System">System (系统黑体)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">字幕字号 (Size: {themeConfig.subtitles.fontSize}px)</label>
                        <input 
                          type="range" 
                          min="32" 
                          max="120"
                          className="form-range" 
                          value={themeConfig.subtitles.fontSize}
                          onChange={(e) => handleThemeChange('subtitles', 'fontSize', Number(e.target.value))}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">字幕离底边距 (Bottom: {themeConfig.subtitles.bottom}px)</label>
                        <input 
                          type="range" 
                          min="40" 
                          max="250"
                          className="form-range" 
                          value={themeConfig.subtitles.bottom}
                          onChange={(e) => handleThemeChange('subtitles', 'bottom', Number(e.target.value))}
                        />
                      </div>

                      <h3 style={{ fontSize: '1rem', fontWeight: 600, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginTop: '0.5rem' }}>镜头动画效果 (Ken Burns)</h3>
                      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', height: '40px' }}>
                        <input 
                          type="checkbox" 
                          id="kb-enabled"
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          checked={themeConfig.animations.kenBurns.enabled}
                          onChange={(e) => handleThemeChange('animations', 'enabled', e.target.checked)}
                        />
                        <label htmlFor="kb-enabled" style={{ cursor: 'pointer', fontWeight: 500 }}>启用图片平移缩放 (Ken Burns) 动画</label>
                      </div>

                      <div className="form-group" style={{ opacity: themeConfig.animations.kenBurns.enabled ? 1 : 0.5 }}>
                        <label className="form-label">镜头微聚焦缩放倍率 (Zoom: {themeConfig.animations.kenBurns.zoomFactor.toFixed(2)})</label>
                        <input 
                          type="range" 
                          min="1.05" 
                          max="1.50"
                          step="0.05"
                          disabled={!themeConfig.animations.kenBurns.enabled}
                          className="form-range" 
                          value={themeConfig.animations.kenBurns.zoomFactor}
                          onChange={(e) => handleThemeChange('animations', 'zoomFactor', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Render Center */}
              {activeTab === 'render' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  
                  {/* Pipeline Configurations */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Tv size={20} color="var(--primary)" />
                      视频编译渲染控制台
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                          <label className="form-label">配音引擎选择 (Voice synthesis)</label>
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: useLocalTts ? 'rgba(255, 170, 0, 0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${useLocalTts ? 'var(--primary)' : 'var(--glass-border)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name="tts-engine" 
                                checked={useLocalTts} 
                                onChange={() => setUseLocalTts(true)} 
                              />
                              <div>
                                <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>本地离线 SAPI</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Windows 本地人声，完全免费</p>
                              </div>
                            </label>

                            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: !useLocalTts ? 'rgba(255, 170, 0, 0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${!useLocalTts ? 'var(--primary)' : 'var(--glass-border)'}`, borderRadius: '8px', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name="tts-engine" 
                                checked={!useLocalTts} 
                                onChange={() => setUseLocalTts(false)} 
                              />
                              <div>
                                <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>ElevenLabs AI 顶级配音</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>电影质感极高拟真度 (需 API Key)</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">保存目标文件名/路径</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ fontFamily: 'var(--font-mono)' }}
                            value={outputName}
                            onChange={(e) => setOutputName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', opacity: useLocalTts ? 0.4 : 1, pointerEvents: useLocalTts ? 'none' : 'auto' }}>
                        <div className="form-group">
                          <label className="form-label">ElevenLabs API Key</label>
                          <input 
                            type="password" 
                            className="form-input" 
                            placeholder="输入 xi-api-key..."
                            value={elevenlabsKey}
                            onChange={(e) => setElevenlabsKey(e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">配音角色 Voice ID</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              value={voiceId}
                              onChange={(e) => setVoiceId(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">模型 Model ID</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              value={modelId}
                              onChange={(e) => setModelId(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ width: '250px', height: '48px', fontSize: '1.05rem' }}
                        onClick={runRenderPipeline}
                        disabled={renderProgress.status === 'rendering'}
                      >
                        {renderProgress.status === 'rendering' ? (
                          <>
                            <RefreshCw className="animate-spin" size={18} />
                            正在渲染视频...
                          </>
                        ) : (
                          <>
                            <Play size={18} fill="currentColor" />
                            开始一键生成视频
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Rendering Progress Card */}
                  {renderProgress.status !== 'idle' && (
                    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderLeft: `4px solid ${renderProgress.status === 'success' ? 'var(--accent-green)' : renderProgress.status === 'failed' ? 'var(--accent-red)' : 'var(--accent-blue)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>渲染任务状态</span>
                        <span className={`status-badge ${renderProgress.status}`}>
                          {renderProgress.status === 'rendering' && '进行中'}
                          {renderProgress.status === 'success' && '渲染成功'}
                          {renderProgress.status === 'failed' && '渲染失败'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{renderProgress.message}</span>
                          <span style={{ fontWeight: 'bold' }}>{renderProgress.progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${renderProgress.progress}%`, 
                              height: '100%', 
                              background: renderProgress.status === 'success' ? 'var(--accent-green)' : renderProgress.status === 'failed' ? 'var(--accent-red)' : 'var(--primary-gradient)', 
                              transition: 'width 0.4s ease' 
                            }} 
                          />
                        </div>
                      </div>

                      {renderProgress.status === 'success' && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>
                            <CheckCircle2 size={16} /> 视频生成成功！
                          </p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', wordBreak: 'break-all', marginTop: '0.25rem' }}>
                            保存路径: {renderProgress.outputPath}
                          </p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            视频时长: {renderProgress.duration?.toFixed(1)} 秒
                          </p>
                        </div>
                      )}

                      {renderProgress.status === 'failed' && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
                          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', fontWeight: 'bold' }}>
                            <AlertTriangle size={16} /> 视频渲染失败
                          </p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                            错误详情: {renderProgress.error}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Log Console Terminal */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>控制台日志输出 (Console Output)</span>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', minWidth: 'auto' }} onClick={() => setLogs([])}>清空日志</button>
                    </div>
                    <div className="console-container">
                      {logs.map((log, index) => (
                        <div key={index} className={`console-line ${log.type}`}>
                          [{log.timestamp}] {log.message}
                        </div>
                      ))}
                      {logs.length === 0 && (
                        <div style={{ color: 'var(--text-dark)', textAlign: 'center', padding: '4rem 0' }}>
                          暂无运行日志。点击上方的“开始一键生成视频”后，日志将在此处流式输出。
                        </div>
                      )}
                      <div ref={consoleEndRef} />
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 4: Mobile Sync */}
              {activeTab === 'sync' && (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Smartphone size={20} color="var(--primary)" />
                    手机客户端同步控制中心
                  </h2>

                  {isElectron ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'center' }}>
                      <div className="qr-container">
                        <div className="qr-box">
                          {/* Simulated elegant QR code visual */}
                          <div style={{ width: '100%', height: '100%', border: '4px solid #000', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px', background: 'white' }}>
                            <div style={{ background: 'black' }} /><div style={{ background: 'black' }} /><div style={{ background: 'black' }} /><div style={{ background: 'black' }} /><div style={{ background: 'black' }} />
                            <div style={{ background: 'black' }} /><div style={{ background: 'white' }} /><div style={{ background: 'white' }} /><div style={{ background: 'white' }} /><div style={{ background: 'black' }} />
                            <div style={{ background: 'black' }} /><div style={{ background: 'white' }} /><div style={{ background: 'black' }} /><div style={{ background: 'white' }} /><div style={{ background: 'black' }} />
                            <div style={{ background: 'black' }} /><div style={{ background: 'white' }} /><div style={{ background: 'white' }} /><div style={{ background: 'white' }} /><div style={{ background: 'black' }} />
                            <div style={{ background: 'black' }} /><div style={{ background: 'black' }} /><div style={{ background: 'black' }} /><div style={{ background: 'black' }} /><div style={{ background: 'black' }} />
                          </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>使用安卓手机客户端 APK 扫码或在连接中输入以下 IP 连接</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>同步服务端控制</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            开启后，本电脑将在局域网内广播一个 REST API。你可以使用手机 App 编辑该项目的分镜、触发视频渲染并自动同步生成。
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>服务状态：</span>
                          <span className={`status-badge ${isServerRunning ? 'success' : 'idle'}`}>
                            {isServerRunning ? '已开启 (Running)' : '未开启 (Stopped)'}
                          </span>
                          <button 
                            className={`btn ${isServerRunning ? 'btn-secondary btn-danger' : 'btn-primary'}`}
                            style={{ marginLeft: 'auto', padding: '0.5rem 1rem' }}
                            onClick={toggleSyncServer}
                          >
                            {isServerRunning ? '关闭同步服务' : '开启同步服务'}
                          </button>
                        </div>

                        {isServerRunning && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <span className="form-label">局域网连接地址</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <span className="ip-badge">http://{pairingIp}:{serverPort}</span>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.5rem', minWidth: 'auto' }}
                                onClick={handleCopyLink}
                              >
                                {copied ? <Check size={16} color="var(--accent-green)" /> : <Copy size={16} />}
                              </button>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>确保电脑与手机连接在同一个 Wi-Fi 路由器下</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <Smartphone size={24} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <p style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>当前为手机遥控器连接模式</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            你已成功配对到电脑主机 IP: <strong style={{ color: 'var(--primary)' }}>{serverIp}:{serverPort}</strong>。
                          </p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            您在分镜编辑器中保存的所有更改、样式调整都会直接实时推送到电脑主机的源目录中，并在电脑端发起视频云编译渲染任务。
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                        <button className="btn btn-secondary btn-danger" style={{ width: '200px' }} onClick={disconnectRemoteServer}>
                          断开电脑端连接
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Right Asset Sidebar (Constant Preview) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Logo / BGM Previewer */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                  <Music size={18} color="var(--primary)" />
                  固定媒体素材
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--bg-tertiary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img src="assets/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      <div style={{ fontSize: '0.8rem' }}>🖼️</div>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>频道水印 Logo</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>assets/logo.png</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--bg-tertiary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🎵
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>背景音乐 BGM</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>assets/bgm.mp3</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Mini Card Preview */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: themeConfig.colors.background, color: themeConfig.colors.text }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                  样式效果预览
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                  
                  {/* Floating Logo watermark */}
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(0,0,0,0.5)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: themeConfig.colors.primary }} />
                    {themeConfig.channelName}
                  </div>
                  
                  {/* Subtitle mock */}
                  <p style={{ 
                    fontFamily: themeConfig.subtitles.fontFamily === 'System' ? 'sans-serif' : themeConfig.subtitles.fontFamily, 
                    fontSize: `${Math.min(themeConfig.subtitles.fontSize * 0.45, 36)}px`,
                    fontWeight: 800,
                    textAlign: 'center',
                    padding: '0 1rem',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                  }}>
                    文案中<span style={{ color: themeConfig.colors.primary }}>高亮分词</span>同步显示
                  </p>
                  
                  <span style={{ position: 'absolute', bottom: 10, fontSize: '0.6rem', color: 'var(--text-muted)' }}>Ken Burns 动效: {themeConfig.animations.kenBurns.enabled ? '开启' : '关闭'}</span>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
