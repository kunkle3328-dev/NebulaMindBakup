
import React, { useState, useRef, useEffect } from 'react';
import { Notebook, Artifact } from '../types';
import { useTheme, useJobs } from '../contexts';
import { Play, Pause, Headphones, Wand2, Mic, FileText, Layout, Zap, Download, Trash2, RefreshCw, Check, Share2, Layers, Clock, GraduationCap, Flame, Coffee, Newspaper, Box, FileQuestion, Plus, ChevronDown, ChevronUp, Rewind, FastForward, Maximize2, BookOpen, Swords, Network, X } from 'lucide-react';
import LiveSession from './LiveSession';
import { PODCAST_STYLES, VOICES, LEARNING_INTENTS } from '../constants';

interface Props {
  notebook: Notebook;
  onUpdate: (nb: Notebook) => void;
}

// Helper to map tailwind color names to hex for Canvas API and inline styles
const getThemeColorHex = (colorName: string, shade: number = 500): string => {
    const palettes: Record<string, Record<number, string>> = {
        blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb' },
        indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5' },
        violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
        purple: { 400: '#c084fc', 500: '#a855f7', 600: '#9333ea' },
        fuchsia: { 400: '#e879f9', 500: '#d946ef', 600: '#c026d3' },
        pink: { 400: '#f472b6', 500: '#ec4899', 600: '#db2777' },
        rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48' },
        red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626' },
        orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c' },
        amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04' },
        lime: { 400: '#a3e635', 500: '#84cc16', 600: '#65a30d' },
        green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
        emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
        teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488' },
        cyan: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2' },
        sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7' },
        slate: { 400: '#94a3b8', 500: '#64748b', 600: '#475569' },
    };
    return palettes[colorName]?.[shade] || palettes.blue[500];
};

const getArtifactIcon = (type: Artifact['type']) => {
  switch (type) {
    case 'flashcards': return <RefreshCw size={20} />;
    case 'quiz': return <FileQuestion size={20} />;
    case 'infographic': return <Layout size={20} />;
    case 'slideDeck': return <Box size={20} />;
    case 'executiveBrief': return <FileText size={20} />;
    case 'researchPaper': return <BookOpen size={20} />;
    case 'debateDossier': return <Swords size={20} />;
    case 'mindMap': return <Network size={20} />;
    case 'audioOverview': return <Headphones size={20} />;
    default: return <Wand2 size={20} />;
  }
};

// --- NEW MIND MAP RENDERER ---
const TreeMindMap: React.FC<{ node: any }> = ({ node }) => {
    const { theme } = useTheme();

    if (!node) return null;
    
    // Recursive Tree Node
    const TreeNode: React.FC<{ data: any, isRoot?: boolean }> = ({ data, isRoot }) => {
        const children = data.branches || data.subBranches;
        const hasChildren = children && children.length > 0;
        
        return (
            <div className="flex flex-col items-center">
                {/* Node Card */}
                <div className={`
                    relative z-10 px-4 py-3 rounded-xl border shadow-lg transition-transform hover:scale-105
                    ${isRoot 
                        ? `bg-${theme.colors.primary}-600 text-white border-${theme.colors.primary}-400 font-bold text-lg min-w-[200px] text-center` 
                        : `bg-slate-900 border-slate-700 text-slate-200 hover:border-${theme.colors.primary}-500/50 min-w-[140px] text-center max-w-[200px]`}
                `}>
                    <div className={isRoot ? '' : 'text-sm font-semibold'}>{data.label || data.rootTopic}</div>
                    {data.details && !isRoot && <div className="text-[10px] text-slate-400 mt-1 leading-tight">{data.details}</div>}
                </div>

                {/* Connector to Children */}
                {hasChildren && (
                    <div className="flex flex-col items-center">
                        {/* Vertical Line Down from Parent */}
                        <div className="h-6 w-px bg-slate-600"></div>
                        
                        {/* Horizontal Bar for Children */}
                        <div className="relative flex justify-center gap-8">
                             {children.map((child: any, i: number) => (
                                <div key={i} className="flex flex-col items-center relative">
                                    {/* Top Horizontal Connector */}
                                    {children.length > 1 && (
                                        <div className={`absolute top-0 h-px bg-slate-600 
                                            ${i === 0 ? 'w-1/2 right-0' : i === children.length - 1 ? 'w-1/2 left-0' : 'w-full'}
                                        `}></div>
                                    )}
                                    {/* Vertical Line to Child */}
                                    <div className="h-6 w-px bg-slate-600"></div>
                                    <TreeNode data={child} />
                                </div>
                             ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-10 min-w-max">
            <TreeNode data={node} isRoot />
        </div>
    );
};

const StudioTab: React.FC<Props> = ({ notebook, onUpdate }) => {
  const { theme } = useTheme();
  const { startJob, jobs } = useJobs();
  
  const [activeView, setActiveView] = useState<'audio' | 'live' | 'lab'>('audio');
  
  const audioArtifact = notebook.artifacts.find(a => a.type === 'audioOverview');
  const isGeneratingAudio = jobs.some(j => j.notebookId === notebook.id && j.type === 'audioOverview' && j.status === 'processing');
  const isGeneratingArtifact = jobs.some(j => j.notebookId === notebook.id && j.type !== 'audioOverview' && j.status === 'processing');
  const generationProgress = jobs.find(j => j.notebookId === notebook.id && j.type === 'audioOverview')?.progress;

  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const [podcastStyle, setPodcastStyle] = useState('Deep Dive');
  const [podcastLength, setPodcastLength] = useState<'Short' | 'Medium' | 'Long'>('Medium');
  const [podcastVoices, setPodcastVoices] = useState({ joe: 'Puck', jane: 'Aoede' });
  const [learningIntent, setLearningIntent] = useState('Understand Basics');

  const [generatingType, setGeneratingType] = useState<Artifact['type'] | null>(null);
  const [viewingArtifact, setViewingArtifact] = useState<Artifact | null>(null);

  const coverUrl = audioArtifact?.content?.coverUrl;
  const audioUrl = audioArtifact?.content?.audioUrl;
  const title = audioArtifact?.content?.title;
  const topic = audioArtifact?.content?.topic;
  const script = audioArtifact?.content?.script;
  
  const dims = { canvasSize: 320, artSize: 220 };

  useEffect(() => {
    return () => {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };
  }, []);

  // --- MEDIA SESSION INTEGRATION ---
  useEffect(() => {
      if ('mediaSession' in navigator && audioArtifact) {
          navigator.mediaSession.metadata = new MediaMetadata({
              title: title || "Audio Overview",
              artist: "Nebula Mind AI",
              album: topic || "Research Project",
              artwork: coverUrl ? [{ src: coverUrl, sizes: '512x512', type: 'image/png' }] : []
          });

          navigator.mediaSession.setActionHandler('play', () => handlePlayPause());
          navigator.mediaSession.setActionHandler('pause', () => handlePlayPause());
          navigator.mediaSession.setActionHandler('seekto', (details) => {
              if (audioRef.current && details.seekTime) {
                  audioRef.current.currentTime = details.seekTime;
              }
          });
      }
  }, [audioArtifact, title, topic, coverUrl]);

  const initAudioContext = () => {
      if (!audioRef.current) return;
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioCtx();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;
      }
      if (!sourceNodeRef.current && audioContextRef.current && analyserRef.current) {
        try {
            sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            sourceNodeRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
        } catch (e) {
            console.warn("MediaElementSource creation failed (probably already connected)", e);
        }
      }
  };

  const drawVisualizer = () => {
      if (!canvasRef.current || !analyserRef.current || !audioRef.current) return;
      
      // Stop drawing if paused
      if (audioRef.current.paused) {
          setIsPlaying(false);
          return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = (dims.artSize / 2) + 4; 
      const bars = 64;
      const step = (Math.PI * 2) / bars;

      const primaryColor = getThemeColorHex(theme.colors.primary, 500);
      const secondaryColor = getThemeColorHex(theme.colors.secondary, 500);

      for (let i = 0; i < bars; i++) {
          const value = dataArray[i] || 0;
          const barHeight = Math.max(4, (value / 255) * 50); 
          const angle = i * step - (Math.PI / 2);
          
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barHeight);
          const y2 = centerY + Math.sin(angle) * (radius + barHeight);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          
          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          gradient.addColorStop(0, primaryColor);
          gradient.addColorStop(1, secondaryColor);
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(drawVisualizer);
  };

  const handlePlayPause = () => {
      if (!audioRef.current || !audioUrl) return;

      if (!audioContextRef.current) {
          initAudioContext();
      }
      if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
      }

      if (audioRef.current.paused) {
          audioRef.current.play();
          setIsPlaying(true);
          drawVisualizer(); 
      } else {
          audioRef.current.pause();
          setIsPlaying(false);
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
      }
  };

  const handleSeek = (seconds: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), duration);
      }
  };

  const handleTimeUpdate = () => {
      if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
      }
  };

  const handleLoadedMetadata = () => {
      if (audioRef.current) {
          setDuration(audioRef.current.duration);
      }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const formatTime = (time: number) => {
      if (isNaN(time)) return "0:00";
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGenerateAudio = async () => {
      if (notebook.sources.length === 0) {
          alert("Add sources first!");
          return;
      }
      await startJob(notebook.id, 'audioOverview', notebook.sources, {
          style: podcastStyle,
          length: podcastLength,
          voices: podcastVoices,
          learningIntent: podcastStyle === 'Study Guide' ? learningIntent : undefined
      });
  };

  const handleGenerateArtifact = async (type: Artifact['type']) => {
      if (notebook.sources.length === 0) return;
      setGeneratingType(type);
      await startJob(notebook.id, type, notebook.sources);
      setGeneratingType(null);
  };

  const handleDeleteArtifact = (id: string) => {
      const updated = {
          ...notebook,
          artifacts: notebook.artifacts.filter(a => a.id !== id)
      };
      onUpdate(updated);
      if (viewingArtifact?.id === id) setViewingArtifact(null);
  };

  const openImageSafe = (imageUrl: string, title: string) => {
      const win = window.open('', '_blank');
      if (win) {
          win.document.write(`<html><head><title>${title}</title><style>body{background:#0f172a;margin:0;display:flex;align-items:center;justify-content:center;height:100vh}img{max-width:95%;max-height:95%;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border-radius:8px}</style></head><body><img src="${imageUrl}" alt="${title}"/></body></html>`);
      }
  };

  const parseScript = (scriptText: string) => {
      if (!scriptText) return [];
      return scriptText.split('\n').map((line, idx) => {
          const match = line.match(/^(Joe|Jane):\s*(.*)/);
          if (match) {
              return { speaker: match[1], text: match[2], id: idx };
          }
          if (line.trim().startsWith('[') || !line.trim()) return null;
          return { speaker: 'System', text: line, id: idx };
      }).filter(Boolean) as { speaker: string, text: string, id: number }[];
  };

  const transcriptLines = script ? parseScript(script) : [];

  const renderArtifactContent = (artifact: Artifact) => {
      const data = artifact.content;

      if (artifact.type === 'researchPaper') {
          return (
              <div className="max-w-3xl mx-auto space-y-8 p-4 md:p-8 bg-white text-slate-900 rounded-xl shadow-2xl overflow-y-auto max-h-[85vh]">
                  <div className="border-b border-slate-200 pb-6 mb-6">
                      <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">{data.title}</h1>
                      <div className="text-sm font-mono text-slate-500 uppercase tracking-wider">Research Paper • Generated by Nebula Mind</div>
                  </div>
                  
                  {data.abstract && (
                      <div className="bg-slate-50 p-6 rounded-lg border-l-4 border-slate-900 italic text-slate-700 leading-relaxed">
                          <strong>Abstract:</strong> {data.abstract}
                      </div>
                  )}

                  <div className="space-y-6">
                      {data.sections?.map((section: any, i: number) => (
                          <section key={i}>
                              <h2 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                                  <span className="text-slate-300">0{i+1}</span> {section.heading}
                              </h2>
                              <div className="prose prose-slate max-w-none text-slate-700 leading-7 whitespace-pre-wrap">
                                  {section.content}
                              </div>
                          </section>
                      ))}
                  </div>

                  {data.references && (
                      <div className="mt-12 pt-8 border-t border-slate-200">
                          <h3 className="text-lg font-bold text-slate-900 mb-4">References</h3>
                          <ul className="space-y-2 list-disc list-inside text-sm text-slate-600">
                              {data.references.map((ref: string, i: number) => (
                                  <li key={i}>{ref}</li>
                              ))}
                          </ul>
                      </div>
                  )}
              </div>
          );
      }

      if (artifact.type === 'debateDossier') {
          return (
              <div className="max-w-5xl mx-auto p-2 h-full flex flex-col">
                  <div className="text-center mb-8">
                      <div className="inline-block p-3 rounded-full bg-rose-500/10 text-rose-400 mb-4"><Swords size={32} /></div>
                      <h1 className="text-3xl font-bold text-white mb-2">{data.topic}</h1>
                      <p className="text-slate-400 max-w-2xl mx-auto">{data.centralControversy}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto pb-10">
                      {/* PRO COLUMN */}
                      <div className="space-y-4">
                          <div className="sticky top-0 bg-slate-950/90 backdrop-blur z-10 p-3 border-b border-green-500/30 text-green-400 font-bold uppercase tracking-wider flex items-center gap-2">
                              <Check size={18} /> Pro Arguments
                          </div>
                          {data.proArguments?.map((arg: any, i: number) => (
                              <div key={i} className="bg-slate-900/50 p-5 rounded-xl border border-green-900/30 hover:border-green-500/30 transition-colors">
                                  <h3 className="font-bold text-green-100 mb-2">{arg.claim}</h3>
                                  <p className="text-sm text-slate-400 mb-3">{arg.evidence}</p>
                                  <div className="text-xs bg-slate-950 p-2 rounded text-slate-500 italic border-l-2 border-slate-700">
                                      Counter: {arg.counterAttack}
                                  </div>
                              </div>
                          ))}
                      </div>

                      {/* CON COLUMN */}
                      <div className="space-y-4">
                          <div className="sticky top-0 bg-slate-950/90 backdrop-blur z-10 p-3 border-b border-red-500/30 text-red-400 font-bold uppercase tracking-wider flex items-center gap-2">
                              <X size={18} /> Con Arguments
                          </div>
                          {data.conArguments?.map((arg: any, i: number) => (
                              <div key={i} className="bg-slate-900/50 p-5 rounded-xl border border-red-900/30 hover:border-red-500/30 transition-colors">
                                  <h3 className="font-bold text-red-100 mb-2">{arg.claim}</h3>
                                  <p className="text-sm text-slate-400 mb-3">{arg.evidence}</p>
                                  <div className="text-xs bg-slate-950 p-2 rounded text-slate-500 italic border-l-2 border-slate-700">
                                      Counter: {arg.counterAttack}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          );
      }

      if (artifact.type === 'mindMap') {
          return (
              <div className="w-full h-full overflow-auto p-10 flex items-center justify-center min-h-[500px] bg-slate-950/50 rounded-xl border border-white/5">
                  <TreeMindMap node={data} />
              </div>
          );
      }
      
      // Fallback JSON Viewer
      return (
          <pre className="bg-slate-950 p-6 rounded-xl overflow-auto max-h-[70vh] text-xs font-mono text-green-400 border border-white/10">
              {JSON.stringify(data, null, 2)}
          </pre>
      );
  };

  return (
    <div className="flex flex-col h-full gap-6">
        <div className="flex items-center justify-center p-1 bg-white/5 rounded-2xl self-center border border-white/5 shadow-inner shrink-0">
            <button onClick={() => setActiveView('audio')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'audio' ? `bg-${theme.colors.primary}-600 text-white shadow-lg` : 'text-slate-400 hover:text-white'}`}><Headphones size={16} /> Audio Overview</button>
            <button onClick={() => setActiveView('live')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'live' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><Mic size={16} /> Live Session</button>
            <button onClick={() => setActiveView('lab')} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'lab' ? `bg-${theme.colors.secondary}-600 text-white shadow-lg` : 'text-slate-400 hover:text-white'}`}><Wand2 size={16} /> Knowledge Lab</button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
            {activeView === 'live' && (<div className="max-w-3xl mx-auto h-full flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4"><LiveSession notebook={notebook} /></div>)}

            {activeView === 'audio' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
                    {audioArtifact && audioArtifact.status === 'completed' ? (
                        <div className="flex flex-col items-center justify-center relative min-h-[500px] p-8 glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                            <div className="flex-1 w-full flex flex-col items-center justify-center relative min-h-[320px] p-6 overflow-hidden">
                                {audioUrl && <audio ref={audioRef} src={audioUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} crossOrigin="anonymous" />}
                                {coverUrl && (<div className="absolute inset-0 z-0 opacity-20 blur-3xl scale-125 pointer-events-none overflow-hidden"><img src={coverUrl} className="w-full h-full object-cover" alt="" /></div>)}
                                
                                <div className="relative flex items-center justify-center shrink-0 mb-8 transition-all duration-500" style={{ width: dims.canvasSize, height: dims.canvasSize }}>
                                    <canvas ref={canvasRef} width={dims.canvasSize} height={dims.canvasSize} className="absolute inset-0 z-10 pointer-events-none" />
                                    <div className={`relative rounded-full overflow-hidden z-20 shadow-2xl border-4 border-slate-900/50 ${isPlaying ? 'animate-spin-slow' : ''}`} style={{ width: dims.artSize, height: dims.artSize, animationDuration: '30s' }}>
                                        {coverUrl ? (<img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />) : (<div className={`w-full h-full bg-gradient-to-br from-${theme.colors.primary}-900 to-slate-900 flex items-center justify-center`}><Headphones size={48} className={`text-${theme.colors.primary}-400 opacity-50`} /></div>)}
                                        <div className="absolute inset-0 bg-black/20"></div>
                                    </div>
                                </div>
                                
                                <div className="text-center z-20 px-4 w-full max-w-md mx-auto flex flex-col gap-1.5 mb-6">
                                    <h2 className="text-xl md:text-3xl font-bold text-white leading-snug drop-shadow-xl line-clamp-2 text-balance">{title || "Audio Overview"}</h2>
                                    <p className="text-sm md:text-base text-slate-400 font-medium line-clamp-3 text-balance opacity-90">{topic || "Deep Dive Podcast"}</p>
                                </div>

                                <div className="w-full max-w-md z-30 flex flex-col gap-4">
                                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                                        <span>{formatTime(currentTime)}</span>
                                        <input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleScrubberChange} className={`flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-${theme.colors.primary}-500 hover:accent-${theme.colors.primary}-400`} />
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-6">
                                        <button onClick={() => handleSeek(-10)} className="p-3 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors" title="Rewind 10s"><Rewind size={24} /></button>
                                        <button onClick={handlePlayPause} className={`w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/20`}>{isPlaying ? (<Pause fill="black" size={28} className="text-black" />) : (<Play fill="black" size={28} className="ml-1 text-black" />)}</button>
                                        <button onClick={() => handleSeek(10)} className="p-3 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors" title="Forward 10s"><FastForward size={24} /></button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 flex flex-col items-center gap-4 relative z-20 w-full max-w-2xl">
                                <div className="flex gap-4">
                                    <a href={audioUrl} download={`${title || 'podcast'}.wav`} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold text-white flex items-center gap-2 border border-white/10 transition-colors"><Download size={14} /> Download WAV</a>
                                    <button onClick={() => handleDeleteArtifact(audioArtifact.id)} className="px-4 py-2 bg-white/5 hover:bg-rose-500/20 rounded-full text-xs font-bold text-rose-400 flex items-center gap-2 border border-white/10 transition-colors"><Trash2 size={14} /> Delete</button>
                                </div>

                                {script && (
                                    <div className="w-full mt-4">
                                        <button onClick={() => setShowTranscript(!showTranscript)} className="mx-auto flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider mb-2">{showTranscript ? 'Hide Transcript' : 'Show Transcript'} {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                                        {showTranscript && (
                                            <div className="bg-slate-950/50 border border-white/10 rounded-xl p-6 text-left max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 custom-scrollbar">
                                                <div className="space-y-4">
                                                    {transcriptLines.map((line, idx) => {
                                                        const isJoe = line.speaker === 'Joe';
                                                        const isJane = line.speaker === 'Jane';
                                                        const joeColor = getThemeColorHex(theme.colors.primary, 400);
                                                        const janeColor = getThemeColorHex(theme.colors.secondary, 400);
                                                        return (
                                                            <div key={idx} className={`flex flex-col gap-1 pl-4 border-l-2`} style={{ borderColor: isJoe ? joeColor : isJane ? janeColor : '#334155' }}>
                                                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isJoe ? joeColor : isJane ? janeColor : '#64748b' }}>{line.speaker}</span>
                                                                <p className="text-sm leading-relaxed font-medium" style={{ color: isJoe ? '#e2e8f0' : isJane ? '#e2e8f0' : '#94a3b8' }}>{line.text}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden">
                             <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-black z-0"></div>
                             <div className="relative z-10 flex flex-col items-center">
                                 {isGeneratingAudio ? (
                                    <div className="py-20 flex flex-col items-center text-center">
                                        <div className={`w-20 h-20 rounded-full border-4 border-${theme.colors.primary}-500/30 border-t-${theme.colors.primary}-500 animate-spin mb-6`}></div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Producing Your Episode</h3>
                                        <p className="text-slate-400 max-w-sm animate-pulse">{generationProgress || "Writing script and synthesizing voices..."}</p>
                                    </div>
                                 ) : (
                                    <>
                                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${theme.colors.primary}-500 to-${theme.colors.secondary}-600 flex items-center justify-center shadow-lg shadow-${theme.colors.primary}-500/20 mb-6`}>
                                            <Headphones size={32} className="text-white" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-white mb-2 text-center">Generate Audio Overview</h2>
                                        <p className="text-slate-400 text-center max-w-lg mb-8">Turn your sources into a professional, two-host podcast episode. Select a style, length, and voice cast below.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Format Style</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {PODCAST_STYLES.map(s => {
                                                        let Icon = Mic;
                                                        if (s.id === 'Heated Debate') Icon = Flame;
                                                        if (s.id === 'Casual Chat') Icon = Coffee;
                                                        if (s.id === 'News Brief') Icon = Newspaper;
                                                        if (s.id === 'Study Guide') Icon = GraduationCap;
                                                        return (
                                                            <button key={s.id} onClick={() => setPodcastStyle(s.id)} className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${podcastStyle === s.id ? `bg-${theme.colors.primary}-600/20 border-${theme.colors.primary}-500 text-white` : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                                                                <div className={`p-2 rounded-lg ${podcastStyle === s.id ? `bg-${theme.colors.primary}-500 text-white` : 'bg-slate-900 text-slate-500'}`}><Icon size={16} /></div>
                                                                <div><div className="text-sm font-bold">{s.label}</div><div className="text-[10px] opacity-70">{s.desc}</div></div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <div className="space-y-3">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</label>
                                                    <div className="flex bg-slate-800 p-1 rounded-lg">
                                                        {['Short', 'Medium', 'Long'].map((l) => (
                                                            <button key={l} onClick={() => setPodcastLength(l as any)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${podcastLength === l ? `bg-${theme.colors.primary}-600 text-white shadow` : 'text-slate-400 hover:text-white'}`}>{l}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Host Voices</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div><span className="text-[10px] text-slate-400 mb-1 block">Host A (Joe)</span><select value={podcastVoices.joe} onChange={(e) => setPodcastVoices(prev => ({ ...prev, joe: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 outline-none focus:border-white/30">{VOICES.joe.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}</select></div>
                                                        <div><span className="text-[10px] text-slate-400 mb-1 block">Host B (Jane)</span><select value={podcastVoices.jane} onChange={(e) => setPodcastVoices(prev => ({ ...prev, jane: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg p-2.5 outline-none focus:border-white/30">{VOICES.jane.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}</select></div>
                                                    </div>
                                                </div>
                                                <button onClick={handleGenerateAudio} disabled={notebook.sources.length === 0} className={`w-full py-4 mt-auto bg-gradient-to-r from-${theme.colors.primary}-600 to-${theme.colors.secondary}-600 hover:from-${theme.colors.primary}-500 hover:to-${theme.colors.secondary}-500 text-white rounded-xl font-bold shadow-lg shadow-${theme.colors.primary}-900/20 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}>Generate Episode</button>
                                            </div>
                                        </div>
                                    </>
                                 )}
                             </div>
                        </div>
                    )}
                </div>
            )}

            {activeView === 'lab' && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { id: 'flashcards', label: 'Flashcards', icon: RefreshCw },
                            { id: 'quiz', label: 'Practice Quiz', icon: FileQuestion },
                            { id: 'infographic', label: 'Infographic', icon: Layout },
                            { id: 'slideDeck', label: 'Slide Deck', icon: Box },
                            { id: 'executiveBrief', label: 'Exec Brief', icon: FileText },
                            // FULL LIST OF 8 ARTIFACTS
                            { id: 'researchPaper', label: 'Deep Research', icon: BookOpen },
                            { id: 'debateDossier', label: 'Debate Dossier', icon: Swords },
                            { id: 'mindMap', label: 'Mind Map', icon: Network }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleGenerateArtifact(item.id as Artifact['type'])}
                                disabled={isGeneratingArtifact}
                                className={`p-4 glass-panel rounded-xl flex flex-col items-center gap-3 border border-white/5 hover:bg-white/5 transition-all group ${generatingType === item.id ? 'opacity-50' : ''}`}
                            >
                                <div className={`p-3 rounded-full bg-${theme.colors.primary}-500/10 text-${theme.colors.primary}-400 group-hover:scale-110 transition-transform`}>
                                    <item.icon size={24} />
                                </div>
                                <span className="text-sm font-bold text-slate-300">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Your Artifacts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {notebook.artifacts.filter(a => a.type !== 'audioOverview').map((artifact) => (
                            <div key={artifact.id} className="glass-panel p-5 rounded-xl border border-white/5 flex items-start gap-4 group">
                                <div className={`p-3 rounded-lg bg-slate-800 text-${theme.colors.primary}-400 shrink-0`}>
                                    {getArtifactIcon(artifact.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-200 truncate">{artifact.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 capitalize">{artifact.status} • {new Date(artifact.createdAt).toLocaleDateString()}</p>
                                    
                                    {artifact.status === 'completed' && (
                                        <div className="mt-4 flex gap-2">
                                            {/* Use View Button for Everything */}
                                            <button 
                                                onClick={() => setViewingArtifact(artifact)}
                                                className={`text-xs px-3 py-1.5 rounded-lg text-white transition-colors bg-${theme.colors.primary}-600 hover:bg-${theme.colors.primary}-500 font-bold`}
                                            >
                                                View
                                            </button>
                                            
                                            {artifact.type === 'slideDeck' && artifact.content.html && (
                                                <button onClick={() => { const win = window.open('', '_blank'); win?.document.write(artifact.content.html); }} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-white transition-colors border border-white/10">Present</button>
                                            )}
                                            {artifact.type === 'infographic' && artifact.content.imageUrl && (
                                                <button onClick={() => openImageSafe(artifact.content.imageUrl, artifact.title)} className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-white transition-colors border border-white/10">Full Screen</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => handleDeleteArtifact(artifact.id)} className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Artifact Viewer Overlay */}
        {viewingArtifact && (
            <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {getArtifactIcon(viewingArtifact.type)}
                        {viewingArtifact.title}
                    </h2>
                    <button onClick={() => setViewingArtifact(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {renderArtifactContent(viewingArtifact)}
                </div>
            </div>
        )}
    </div>
  );
};

export default StudioTab;
