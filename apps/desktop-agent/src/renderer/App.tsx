import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  WifiOff, 
  Folder, 
  Play, 
  AlertCircle, 
  Settings, 
  RefreshCw, 
  Music, 
  Clock, 
  Sparkles,
  Layers,
  Search,
  Check
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { GlassCard } from '@singr/ui';
import { GlassButton } from '@singr/ui';
import { GlassInput } from '@singr/ui';

const electronAPI = (window as any).electronAPI;

interface RequestItem {
  request_id: number;
  artist: string;
  title: string;
  singer: string;
  request_time: number;
  key_change: number;
}

interface ScanProgress {
  status: 'scanning' | 'uploading' | 'completed' | 'failed';
  totalFiles: number;
  parsedSongs: number;
  processedSongs: number;
  errorMessage?: string;
}

export default function App() {
  // Config states
  const [apiKey, setApiKey] = useState('');
  const [systemNumber, setSystemNumber] = useState(1);
  const [apiUrl, setApiUrl] = useState('http://localhost:3001');
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // Status states
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Scanner states
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);

  // Active venue and requests
  const [activeShow, setActiveShow] = useState<{ uuid: string; venue_id: number; name: string; slug: string } | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);

  // Socket reference
  const socketRef = useRef<Socket | null>(null);

  // 1. Load config on mount
  useEffect(() => {
    electronAPI.loadConfig().then((config: any) => {
      setApiKey(config.apiKey);
      setSystemNumber(config.systemNumber);
      setApiUrl(config.apiUrl);
      setIsConfigLoaded(true);
      
      // Auto test connection if config exists
      if (config.apiKey) {
        testAndEstablishConnection(config.apiUrl, config.apiKey, config.systemNumber);
      }
    });

    // Listen for file scanning progress updates
    const cleanupProgress = electronAPI.onScanProgress((progress: any) => {
      setScanProgress(progress);
    });

    return () => {
      cleanupProgress();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // 2. Establish WebSocket & fetch active venue
  const testAndEstablishConnection = async (url: string, key: string, sysNum: number) => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    try {
      // Step A: Test API connection using legacy OKJ handler
      const testRes = await electronAPI.testApiConnection({
        apiUrl: url,
        apiKey: key,
        systemNumber: sysNum,
      });

      if (!testRes.success) {
        setConnectionStatus('error');
        setErrorMessage(testRes.error || 'Authentication failed. Please verify API key.');
        return;
      }

      setConnectionStatus('connected');
      
      // Step B: Set up Socket.io Client
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = io(url, {
        reconnectionDelay: 5000,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('🔌 WebSocket connected successfully! ID:', socket.id);
        fetchActiveVenueAndQueue(url, key, sysNum, socket);
      });

      socket.on('connect_error', (err) => {
        console.error('🔌 WebSocket connection error:', err);
      });

      socket.on('disconnect', () => {
        console.log('🔌 WebSocket disconnected');
      });

      // Socket dynamic triggers
      socket.on('new_request', (data) => {
        console.log('📢 WebSocket Event: [new_request]', data);
        // Re-fetch request list to ensure full synced accuracy including modern IDs
        fetchRequests(url, key, sysNum);
      });

      socket.on('request_cancelled', (data) => {
        console.log('📢 WebSocket Event: [request_cancelled]', data);
        setRequests((prev) => prev.filter((r) => r.request_id !== data.requestId));
      });

      socket.on('queue_reordered', (data) => {
        console.log('📢 WebSocket Event: [queue_reordered]', data);
        fetchRequests(url, key, sysNum);
      });

      socket.on('songs_synced', () => {
        console.log('📢 WebSocket Event: [songs_synced] — shadow database swapped!');
        // Flash a quick notice or sound if preferred
      });

    } catch (err: any) {
      setConnectionStatus('error');
      setErrorMessage(err.message || String(err));
    }
  };

  // 3. Query legacy endpoints to find active show and initial queue
  const fetchActiveVenueAndQueue = async (url: string, key: string, sysNum: number, socketInstance: Socket) => {
    try {
      const endpoint = `${url}/api/v1/legacy/okj/api.php`;
      
      // Call legacy getVenues to find which venue is routed to this active system
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'getVenues',
          api_key: key,
          system_id: sysNum,
        }),
      });

      const data = await res.json();
      if (data.error) {
        console.error('Failed to get venues:', data.errorString);
        return;
      }

      const activeVenue = data.venues?.find((v: any) => v.accepting === true);
      if (activeVenue) {
        console.log('🎤 Found Active Venue:', activeVenue);
        setActiveShow({
          uuid: activeVenue.uuid,
          venue_id: activeVenue.venue_id,
          name: activeVenue.name,
          slug: activeVenue.url_name,
        });

        // Join the active show websocket room
        socketInstance.emit('join_show', activeVenue.uuid);
        
        // Fetch current requests
        fetchRequests(url, key, sysNum, activeVenue.venue_id);
      } else {
        console.log('ℹ️ No active show is currently accepting requests on this System.');
        setActiveShow(null);
        setRequests([]);
      }
    } catch (err) {
      console.error('Error fetching venues:', err);
    }
  };

  const fetchRequests = async (url: string, key: string, sysNum: number, venueId?: number) => {
    const targetVenueId = venueId || activeShow?.venue_id;
    if (!targetVenueId) return;

    try {
      const endpoint = `${url}/api/v1/legacy/okj/api.php`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'getRequests',
          api_key: key,
          system_id: sysNum,
          venue_id: targetVenueId,
        }),
      });

      const data = await res.json();
      if (!data.error) {
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  // 4. Save and Test actions
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    const result = await electronAPI.saveConfig({ apiKey, systemNumber, apiUrl });
    if (result.success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
      testAndEstablishConnection(apiUrl, apiKey, systemNumber);
    } else {
      setSaveStatus('error');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    const result = await electronAPI.testApiConnection({ apiUrl, apiKey, systemNumber });
    if (result.success) {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
      testAndEstablishConnection(apiUrl, apiKey, systemNumber);
    } else {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 4000);
    }
  };

  // 5. Native directory selection
  const handleBrowseDir = async () => {
    const path = await electronAPI.selectDirectory();
    if (path) {
      setSelectedDir(path);
      setScanProgress(null);
    }
  };

  // 6. Trigger recursive song scan
  const handleSyncSongbook = async () => {
    if (!selectedDir) return;
    await electronAPI.startSongScan({
      directoryPath: selectedDir,
      apiUrl,
      apiKey,
      systemNumber,
    });
  };

  if (!isConfigLoaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#09090b' }}>
        <RefreshCw size={36} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  // Calculate scan percentage
  const getScanPercent = () => {
    if (!scanProgress || scanProgress.parsedSongs === 0) return 0;
    return Math.round((scanProgress.processedSongs / scanProgress.parsedSongs) * 100);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-zinc-100" style={{ background: 'radial-gradient(circle at top left, #181035 0%, #09090b 60%)' }}>
      
      {/* Sleek Custom Window Header */}
      <header className="flex items-center justify-between px-6 pt-10 pb-4 select-none border-b border-zinc-800/40 bg-zinc-950/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Singr Agent
            </h1>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Local Control Console</span>
          </div>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              System #{systemNumber} Connected
            </div>
          ) : connectionStatus === 'connecting' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <RefreshCw size={12} className="animate-spin" />
              Connecting...
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              <WifiOff size={12} />
              System Offline
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex flex-1 p-6 gap-6 overflow-hidden">
        
        {/* Left Column: Config Panel */}
        <section className="w-80 flex flex-col gap-6 select-none">
          
          <GlassCard className="p-5 flex flex-col gap-4 border border-zinc-800/50 bg-zinc-950/40 backdrop-blur-xl rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800/40 pb-3">
              <Settings size={16} className="text-indigo-400" />
              <h2 className="text-sm font-semibold tracking-wide text-zinc-200">Hardware Credentials</h2>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-400">API Gateway URL</label>
                <GlassInput 
                  type="text" 
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:3001"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-400">System API Key</label>
                <GlassInput 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sg_••••••••••••••••"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-400">System Number (ID)</label>
                <GlassInput 
                  type="number" 
                  value={systemNumber}
                  onChange={(e) => setSystemNumber(Number(e.target.value))}
                  placeholder="1"
                  min="1"
                  required
                />
              </div>

              {errorMessage && (
                <div className="flex gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <GlassButton type="submit" variant="primary" className="flex-1 py-2 text-xs font-semibold">
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved' : 'Save Config'}
                </GlassButton>
                
                <GlassButton 
                  type="button" 
                  variant="secondary" 
                  onClick={handleTestConnection}
                  className="py-2 px-3 text-xs font-semibold"
                  disabled={testStatus === 'testing'}
                >
                  {testStatus === 'testing' ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : testStatus === 'success' ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : testStatus === 'error' ? (
                    <AlertCircle size={14} className="text-rose-400" />
                  ) : (
                    'Test'
                  )}
                </GlassButton>
              </div>
            </form>
          </GlassCard>

          {/* Sync Songbook Card */}
          <GlassCard className="p-5 flex flex-col gap-4 border border-zinc-800/50 bg-zinc-950/40 backdrop-blur-xl rounded-2xl shadow-xl flex-1 justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-zinc-800/40 pb-3">
                <Database size={16} className="text-purple-400" />
                <h2 className="text-sm font-semibold tracking-wide text-zinc-200">Catalog Sync</h2>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Select your local karaoke directory containing `.zip` MP3+G files to synchronize tracks with the system.
                </p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/60 p-2.5 rounded-xl text-xs overflow-hidden">
                    <Folder size={14} className="text-zinc-500 shrink-0" />
                    <span className="truncate text-zinc-300 font-mono">
                      {selectedDir || 'No folder selected'}
                    </span>
                  </div>

                  <GlassButton type="button" variant="secondary" onClick={handleBrowseDir} className="py-2 text-xs font-semibold">
                    Browse Directory
                  </GlassButton>
                </div>
              </div>

              {scanProgress && (
                <div className="flex flex-col gap-2.5 bg-zinc-900/50 border border-zinc-800/40 p-3.5 rounded-2xl text-xs mt-1 animate-fade-in">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="capitalize text-indigo-300">
                      {scanProgress.status === 'scanning' ? '🔍 Scanning files' : 
                       scanProgress.status === 'uploading' ? '📤 Syncing DB' :
                       scanProgress.status === 'completed' ? '✅ Completed' : '❌ Failed'}
                    </span>
                    {scanProgress.status === 'uploading' && (
                      <span className="text-indigo-400">{getScanPercent()}%</span>
                    )}
                  </div>

                  {scanProgress.status === 'scanning' && (
                    <div className="flex flex-col gap-1 text-zinc-400 text-[11px]">
                      <span>Found files: {scanProgress.totalFiles}</span>
                    </div>
                  )}

                  {scanProgress.status === 'uploading' && (
                    <div className="flex flex-col gap-1.5">
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                          style={{ width: `${getScanPercent()}%` }}
                        ></div>
                      </div>
                      <span className="text-zinc-400 text-[10px]">
                        Processed {scanProgress.processedSongs.toLocaleString()} of {scanProgress.parsedSongs.toLocaleString()} tracks
                      </span>
                    </div>
                  )}

                  {scanProgress.status === 'completed' && (
                    <span className="text-emerald-400 text-[11px] font-medium">
                      Successfully synchronized {scanProgress.processedSongs.toLocaleString()} unique tracks!
                    </span>
                  )}

                  {scanProgress.status === 'failed' && (
                    <span className="text-rose-400 text-[11px] leading-relaxed break-all">
                      Error: {scanProgress.errorMessage}
                    </span>
                  )}
                </div>
              )}
            </div>

            <GlassButton 
              type="button" 
              variant="primary" 
              onClick={handleSyncSongbook}
              disabled={!selectedDir || connectionStatus !== 'connected' || !!(scanProgress && (scanProgress.status === 'scanning' || scanProgress.status === 'uploading'))}
              className="py-2.5 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 border-none shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
            >
              <div className="flex items-center justify-center gap-2">
                <Play size={14} />
                Synchronize Songbook
              </div>
            </GlassButton>
          </GlassCard>

        </section>

        {/* Right Column: Live Queue Panel */}
        <section className="flex-1 flex flex-col h-full bg-zinc-950/20 border border-zinc-800/40 backdrop-blur-lg rounded-3xl p-5 overflow-hidden shadow-2xl">
          
          {/* Queue Header */}
          <div className="flex justify-between items-center border-b border-zinc-800/40 pb-4 mb-4 select-none">
            <div className="flex items-center gap-2.5">
              <Layers size={18} className="text-purple-400" />
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-zinc-100">Live Request Queue</h2>
                {activeShow && (
                  <span className="text-[11px] text-zinc-400">
                    Active venue: <span className="text-indigo-300 font-semibold">{activeShow.name}</span>
                  </span>
                )}
              </div>
            </div>

            {activeShow && requests.length > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold">
                {requests.length} Requests Pending
              </span>
            )}
          </div>

          {/* Queue Request Stream */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
            {connectionStatus !== 'connected' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
                <div className="p-4 rounded-full bg-zinc-900/60 border border-zinc-800/60 text-zinc-500 mb-3.5 shadow-inner">
                  <WifiOff size={32} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-300">System Offline</h3>
                <p className="text-xs text-zinc-500 max-w-[240px] mt-1 leading-relaxed">
                  Establish a secure hardware API gateway connection to subscribe to the real-time request queue.
                </p>
              </div>
            ) : !activeShow ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
                <div className="p-4 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 mb-3.5 animate-pulse shadow-inner">
                  <Music size={32} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-300">Waiting for Venue Activation</h3>
                <p className="text-xs text-zinc-500 max-w-[240px] mt-1 leading-relaxed">
                  Activate this system (System #{systemNumber}) in the Host Console to route singer request feeds here.
                </p>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none">
                <div className="p-4 rounded-full bg-zinc-900/60 border border-zinc-800/60 text-zinc-500 mb-3.5">
                  <Search size={32} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-300">No Pending Requests</h3>
                <p className="text-xs text-zinc-500 max-w-[240px] mt-1 leading-relaxed">
                  The request queue is currently empty. Singers can submit requests via the mobile web portal.
                </p>
              </div>
            ) : (
              requests.map((req, idx) => (
                <div 
                  key={req.request_id}
                  className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl hover:border-zinc-700/60 hover:bg-zinc-900/60 transition-all duration-300 shadow-sm"
                  style={{ animation: `fade-in-slide 0.3s ease-out both ${idx * 0.05}s` }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Position circle */}
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-xs font-bold text-zinc-400 shrink-0">
                      {idx + 1}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-100 truncate">
                        {req.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        Artist: <span className="text-zinc-200 font-semibold">{req.artist}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500">
                        <span className="text-purple-400 font-bold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                          🎤 {req.singer}
                        </span>
                        {req.key_change !== 0 && (
                          <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                            Key: {req.key_change > 0 ? `+${req.key_change}` : req.key_change}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timestamp detail */}
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium select-none">
                    <Clock size={11} />
                    <span>
                      {new Date(req.request_time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

        </section>

      </main>

      {/* Subtle bottom micro-badge */}
      <footer className="text-center pb-6 text-[10px] text-zinc-600 select-none">
        Singr Platform © 2026. Premium High-Performance Desktop Synchronization Agent.
      </footer>
    </div>
  );
}
