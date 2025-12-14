
import React, { useState, useRef, useEffect } from 'react';
import { Notebook, Artifact } from '../types';
import { useTheme, useJobs, useAudio, AudioTrack } from '../contexts';
import { Play, Pause, Headphones, Wand2, Mic, FileText, Layout, Zap, Download, Trash2, RefreshCw, Check, Share2, Layers, Clock, GraduationCap, Flame, Coffee, Newspaper, Box, FileQuestion, Plus, ChevronDown, ChevronUp, Rewind, FastForward, Maximize2, BookOpen, Swords, Network, X, ArrowRight, RotateCw, AlertCircle, Radar, Target, Map } from 'lucide-react';
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
    case 'strategicRoadmap': return <Map size={20} />;
    case 'audioOverview': return <Headphones size={20} />;
    default: return <Wand2 size={20} />;
  }
};

// --- ARTIFACT RENDERERS ---

// 1. Strategic Roadmap Viewer
const StrategicRoadmapViewer: React.FC<{ data: any }> = ({ data }) => {
    const { theme } = useTheme();
    
    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">{data.title || "Strategic Roadmap"}</h1>
                <p className="text-lg text-slate-400 italic max-w-2xl mx-auto">"{data.mission || "Execution Plan"}"</p>
            </div>

            <div className="relative pl-8 md:pl-0">
                {/* Vertical Line */}
                <div className={`absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-${theme.colors.primary}-500/0 via-${theme.colors.primary}-500/50 to-${theme.colors.primary}-500/0 md:-translate-x-1/2`}></div>

                <div className="space-y-12">
                    {data.phases?.map((phase: any, index: number) => {
                        const isLeft = index % 2 === 0;
                        return (
                            <div key={index} className={`relative flex flex-col md:flex-row items-center w-full ${isLeft ? 'md:flex-row-reverse' : ''}`}>
                                
                                {/* Timeline Node */}
                                <div className={`absolute left-0 md:left-1/2 w-4 h-4 rounded-full bg-${theme.colors.primary}-500 border-4 border-slate-900 shadow-[0_0_15px_rgba(var(--color-${theme.colors.primary}),0.5)] md:-translate-x-1/2 mt-1.5 md:mt-0 z-10`}></div>

                                {/* Content Card Spacer */}
                                <div className="hidden md:block md:w-1/2"></div>

                                {/* Content Card */}
                                <div className={`w-full md:w-1/2 pl-8 md:pl-0 ${isLeft ? 'md:pr-12' : 'md:pl-12'}`}>
                                    <div className={`glass-panel p-6 rounded-2xl border border-white/10 hover:border-${theme.colors.primary}-500/30 transition-all group relative overflow-hidden`}>
                                        <div className={`absolute top-0 left-0 w-1 h-full bg-${theme.colors.primary}-500`}></div>
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className={`text-xl font-bold text-white group-hover:text-${theme.colors.primary}-300 transition-colors`}>{phase.phaseName}</h3>
                                            <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-800 text-slate-400 border border-white/5">{phase.timeline}</span>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <p className="text-sm text-slate-300 italic mb-2">Goal: {phase.goal}</p>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Check size={12}/> Milestones</h4>
                                                <ul className="space-y-1">
                                                    {phase.milestones?.map((m: string, i: number) => (
                                                        <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                                                            <span className="w-1 h-1 rounded-full bg-slate-500 mt-2 shrink-0"></span>
                                                            {m}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            
                                            {phase.risks && phase.risks.length > 0 && (
                                                <div className="pt-3 border-t border-white/5">
                                                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertCircle size={12}/> Risks</h4>
                                                    <ul className="space-y-1">
                                                        {phase.risks.map((r: string, i: number) => (
                                                            <li key={i} className="text-xs text-rose-200/70">{r}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// 2. Quiz Viewer
const QuizViewer: React.FC<{ data: any }> = ({ data }) => {
    const { theme } = useTheme();
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showResults, setShowResults] = useState(false);

    const handleSelect = (qIndex: number, oIndex: number) => {
        if (showResults) return;
        setAnswers(prev => ({ ...prev, [qIndex]: oIndex }));
    };

    const score = Object.keys(answers).reduce((acc, qIdx) => {
        const idx = parseInt(qIdx);
        return acc + (answers[idx] === data.questions[idx].correctAnswerIndex ? 1 : 0);
    }, 0);

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-white">{data.title || "Practice Quiz"}</h1>
                <p className="text-slate-400">Test your knowledge</p>
            </div>

            {data.questions?.map((q: any, i: number) => {
                const isCorrect = answers[i] === q.correctAnswerIndex;
                const isWrong = answers[i] !== undefined && !isCorrect;

                return (
                    <div key={i} className="glass-panel p-6 rounded-2xl border border-white/5">
                        <h3 className="text-lg font-semibold text-white mb-4 flex gap-3">
                            <span className={`flex-shrink-0 w-8 h-8 rounded-full bg-${theme.colors.primary}-500/20 text-${theme.colors.primary}-400 flex items-center justify-center text-sm font-bold`}>{i + 1}</span>
                            {q.question}
                        </h3>
                        <div className="space-y-2 ml-11">
                            {q.options.map((opt: string, j: number) => {
                                let stateClass = "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800";
                                if (showResults) {
                                    if (j === q.correctAnswerIndex) stateClass = "bg-green-500/20 border-green-500 text-green-300";
                                    else if (answers[i] === j) stateClass = "bg-red-500/20 border-red-500 text-red-300";
                                    else stateClass = "opacity-50 border-transparent";
                                } else if (answers[i] === j) {
                                    stateClass = `bg-${theme.colors.primary}-500/20 border-${theme.colors.primary}-500 text-white`;
                                }

                                return (
                                    <button
                                        key={j}
                                        onClick={() => handleSelect(i, j)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${stateClass}`}
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                        {showResults && (
                            <div className={`ml-11 mt-4 p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-500/10 text-green-300' : 'bg-slate-800 text-slate-400'}`}>
                                <strong>{isCorrect ? 'Correct!' : 'Explanation:'}</strong> {q.explanation}
                            </div>
                        )}
                    </div>
                );
            })}

            <div className="flex justify-center pt-6">
                {!showResults ? (
                    <button 
                        onClick={() => setShowResults(true)}
                        disabled={Object.keys(answers).length < (data.questions?.length || 0)}
                        className={`px-8 py-3 bg-${theme.colors.primary}-600 hover:bg-${theme.colors.primary}-500 text-white font-bold rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                    >
                        Reveal Results
                    </button>
                ) : (
                    <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                        <div className="text-2xl font-bold text-white mb-2">You scored {score} / {data.questions.length}</div>
                        <button onClick={() => { setShowResults(false); setAnswers({}); }} className="text-slate-400 hover:text-white flex items-center gap-2 mx-auto">
                            <RotateCw size={16} /> Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. Flashcard Viewer
const FlashcardViewer: React.FC<{ data: any }> = ({ data }) => {
    const { theme } = useTheme();
    const [flipped, setFlipped] = useState<Record<number, boolean>>({});

    return (
        <div className="max-w-5xl mx-auto p-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.cards?.map((card: any, i: number) => (
                    <div key={i} className="h-64 group perspective-1000 cursor-pointer" onClick={() => setFlipped(p => ({...p, [i]: !p[i]}))}>
                        <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${flipped[i] ? 'rotate-y-180' : ''}`}>
                            {/* Front */}
                            <div className="absolute inset-0 backface-hidden bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl group-hover:border-white/20">
                                <div className={`w-10 h-10 rounded-full bg-${theme.colors.primary}-500/10 flex items-center justify-center mb-4 text-${theme.colors.primary}-400`}>
                                    <RefreshCw size={18} />
                                </div>
                                <h3 className="text-xl font-bold text-white">{card.term}</h3>
                                <p className="text-xs text-slate-500 mt-4 uppercase tracking-wider font-semibold">Click to flip</p>
                            </div>
                            
                            {/* Back */}
                            <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-${theme.colors.primary}-900 to-slate-900 border border-${theme.colors.primary}-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl`}>
                                <span className={`text-xs text-${theme.colors.primary}-300 uppercase tracking-widest mb-2 font-bold`}>Definition</span>
                                <p className="text-sm text-slate-100 leading-relaxed overflow-y-auto max-h-full scrollbar-thin">{card.definition}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StudioTab: React.FC<Props> = ({ notebook, onUpdate }) => {
  const { theme } = useTheme();
  const { startJob, jobs } = useJobs();
  const { isPlaying, currentTrack, currentTime, duration, playTrack, togglePlayPause, seek, analyser } = useAudio();
  
  const [activeView, setActiveView] = useState<'audio' | 'live' | 'lab'>('audio');
  
  const audioArtifact = notebook.artifacts.find(a => a.type === 'audioOverview');
  const isGeneratingAudio = jobs.some(j => j.notebookId === notebook.id && j.type === 'audioOverview' && j.status === 'processing');
  const isGeneratingArtifact = jobs.some(j => j.notebookId === notebook.id && j.type !== 'audioOverview' && j.status === 'processing');
  const generationProgress = jobs.find(j => j.notebookId === notebook.id && j.type === 'audioOverview')?.progress;

  const [showTranscript, setShowTranscript] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
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
  
  const [forceUpdate, setForceUpdate] = useState(0); 

  useEffect(() => {
      const handleResize = () => setForceUpdate(prev => prev + 1);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };
  }, []);

  const drawVisualizer = () => {
      if (!canvasRef.current || !analyser) return;
      
      // Only draw if playing or paused (to keep current frame)
      // But typically we only animate when playing.
      if (!isPlaying) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Fixed Reference Dimensions
      // The image container is 60% of the canvas container's width/height in CSS.
      // Canvas is 320x320. 
      // Image is 60% of 320 = 192px diameter. Radius = 96px.
      // We start bars at 96px + gap (8px) = 104px.
      
      const innerRadius = 104; 
      const maxBarLength = 48; // Leaves room at edge (320/2 - 104 = 56px space)
      const bars = 64;
      const step = (Math.PI * 2) / bars;

      const primaryColor = getThemeColorHex(theme.colors.primary, 500);
      const secondaryColor = getThemeColorHex(theme.colors.secondary, 500);

      for (let i = 0; i < bars; i++) {
          const value = dataArray[i] || 0;
          // Scale value to bar length
          const barHeight = Math.max(2, (value / 255) * maxBarLength); 
          const angle = i * step - (Math.PI / 2); // Start from top
          
          const x1 = centerX + Math.cos(angle) * innerRadius;
          const y1 = centerY + Math.sin(angle) * innerRadius;
          const x2 = centerX + Math.cos(angle) * (innerRadius + barHeight);
          const y2 = centerY + Math.sin(angle) * (innerRadius + barHeight);

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

  useEffect(() => {
      if (isPlaying && activeView === 'audio') {
          drawVisualizer();
      } else {
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
      }
  }, [isPlaying, activeView, analyser]);

  const handlePlayPause = () => {
      if (!audioUrl) return;
      
      if (currentTrack?.url !== audioUrl) {
          playTrack({
              url: audioUrl,
              title: title || 'Audio Overview',
              topic: topic,
              coverUrl: coverUrl,
              duration: 0 
          });
      } else {
          togglePlayPause();
      }
  };

  const handleSeek = (seconds: number) => {
      if (currentTrack?.url === audioUrl) {
          seek(Math.min(Math.max(currentTime + seconds, 0), duration));
      }
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      if (currentTrack?.url === audioUrl) {
          seek(time);
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
          const cleanLine = line.replace(/[\*\_]/g, '').trim();
          if (!cleanLine) return null;
          const match = cleanLine.match(/^([A-Za-z0-9\s\(\)]+):\s*(.*)/);
          if (match) {
              let speaker = match[1].trim();
              const text = match[2].trim();
              if (speaker.toLowerCase().includes('joe')) speaker = 'Joe';
              else if (speaker.toLowerCase().includes('jane')) speaker = 'Jane';
              return { speaker, text, id: idx };
          }
          return { speaker: 'System', text: cleanLine, id: idx };
      }).filter(Boolean) as { speaker: string, text: string, id: number }[];
  };

  const transcriptLines = script ? parseScript(script) : [];

  const renderArtifactContent = (artifact: Artifact) => {
      const data = artifact.content;
      // ... (Rest of renderer logic is fine) ...
      if (artifact.type === 'strategicRoadmap') return <StrategicRoadmapViewer data={data} />;
      if (artifact.type === 'infographic') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
                {data.imageUrl ? (
                    <div className="relative group max-w-2xl w-full">
                        <img 
                            src={data.imageUrl} 
                            alt={artifact.title} 
                            className="w-full h-auto rounded-xl shadow-2xl border border-white/10"
                        />
                        <button 
                            onClick={() => openImageSafe(data.imageUrl, artifact.title)}
                            className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Maximize2 size={20} />
                        </button>
                    </div>
                ) : (
                    <div className="p-10 text-center">
                        <Layout size={48} className="text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">Infographic data not available.</p>
                    </div>
                )}
            </div>
        );
      }
      if (artifact.type === 'executiveBrief') {
          return (
            <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden my-4">
                {/* ... (Existing Exec Brief UI) ... */}
                <div className={`bg-gradient-to-r from-${theme.colors.primary}-900 to-slate-900 p-8 text-white`}>
                    <div className="uppercase tracking-widest text-xs font-bold opacity-70 mb-2">Executive Strategy Brief</div>
                    <h1 className="text-3xl font-bold leading-tight">{data.briefTitle || "Strategic Overview"}</h1>
                </div>
                <div className="p-8 space-y-8">
                    <section className="bg-slate-50 p-6 rounded-lg border-l-4 border-slate-900">
                        <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider mb-3 flex items-center gap-2"><Layout size={14}/> Executive Summary</h3>
                        <p className="text-slate-700 leading-relaxed text-lg">{data.executiveSummary}</p>
                    </section>
                    <section>
                        <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider mb-4 border-b pb-2">Key Findings</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            {data.keyFindings?.map((f: any, i: number) => (
                                <div key={i} className="group">
                                    <h4 className={`font-bold text-${theme.colors.primary}-700 mb-2 flex items-start gap-2`}>
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        {f.heading}
                                    </h4>
                                    <p className="text-sm text-slate-600 pl-3.5 border-l border-slate-200 group-hover:border-slate-400 transition-colors">{f.point}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                    <div className="grid md:grid-cols-2 gap-8">
                        <section className="bg-blue-50/50 p-6 rounded-xl">
                            <h3 className="font-bold text-blue-900 uppercase text-xs tracking-wider mb-3 flex items-center gap-2"><Radar size={14}/> Strategic Implications</h3>
                            <p className="text-sm text-slate-700 leading-relaxed">{data.strategicImplications}</p>
                        </section>
                        <section className="bg-emerald-50/50 p-6 rounded-xl">
                             <h3 className="font-bold text-emerald-900 uppercase text-xs tracking-wider mb-3 flex items-center gap-2"><Check size={14}/> Actionable Items</h3>
                             <ul className="space-y-3">
                                {data.actionableItems?.map((item: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                                        <div className="mt-0.5 min-w-[16px] h-4 border border-emerald-500 rounded flex items-center justify-center">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-sm"></div>
                                        </div>
                                        {item}
                                    </li>
                                ))}
                             </ul>
                        </section>
                    </div>
                </div>
            </div>
          );
      }
      if (artifact.type === 'slideDeck') {
          return (
             <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">
                 <div className="flex justify-between items-center">
                     <h2 className="text-2xl font-bold text-white">{data.deckTitle}</h2>
                     <button 
                        onClick={() => { const win = window.open('', '_blank'); win?.document.write(data.html); }} 
                        className={`px-4 py-2 bg-${theme.colors.primary}-600 hover:bg-${theme.colors.primary}-500 text-white rounded-lg text-sm font-bold flex items-center gap-2`}
                     >
                         <Play size={16} /> Present Slides
                     </button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pb-10">
                     {data.slides?.map((slide: any, i: number) => (
                         <div key={i} className="aspect-video bg-slate-900 border border-white/10 rounded-xl p-6 flex flex-col relative group hover:border-white/20 transition-colors">
                             <div className="absolute top-2 right-4 text-4xl font-black text-white/5 select-none">{i+1}</div>
                             <h3 className="text-lg font-bold text-${theme.colors.secondary}-400 mb-4 z-10">{slide.slideTitle}</h3>
                             <ul className="space-y-2 mb-4 z-10 flex-1">
                                 {slide.bulletPoints?.map((bp: string, j: number) => (
                                     <li key={j} className="text-xs text-slate-300 flex items-start gap-2">
                                         <span className={`mt-1 w-1 h-1 rounded-full bg-${theme.colors.primary}-500 shrink-0`}></span>
                                         {bp}
                                     </li>
                                 ))}
                             </ul>
                             <div className="pt-3 border-t border-white/5 text-[10px] text-slate-500 italic">
                                 Notes: {slide.speakerNotes?.substring(0, 100)}...
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
          );
      }
      if (artifact.type === 'researchPaper') {
          return (
              <div className="max-w-4xl mx-auto p-4 md:p-8">
                  <div className="bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden min-h-[80vh]">
                    <div className="p-10 md:p-14 space-y-8">
                        <div className="border-b-2 border-slate-900 pb-8 mb-8">
                            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">{data.title}</h1>
                            <div className="flex justify-between items-end">
                                <div className="text-sm font-mono text-slate-500 uppercase tracking-wider">
                                    Research Paper<br/>Generated by Nebula Mind
                                </div>
                                <div className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</div>
                            </div>
                        </div>
                        {data.abstract && (
                            <div className="bg-slate-50 p-8 rounded-lg border-l-4 border-slate-900 text-lg leading-relaxed italic text-slate-700 font-serif">
                                <strong>Abstract —</strong> {data.abstract}
                            </div>
                        )}
                        <div className="space-y-10">
                            {data.sections?.map((section: any, i: number) => (
                                <section key={i}>
                                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-baseline gap-3">
                                        <span className="text-slate-300 font-mono text-xl">0{i+1}</span> {section.heading}
                                    </h2>
                                    <div className="prose prose-slate max-w-none text-slate-700 leading-8 whitespace-pre-wrap font-serif text-lg">
                                        {section.content}
                                    </div>
                                </section>
                            ))}
                        </div>
                        {data.references && (
                            <div className="mt-16 pt-10 border-t border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900 mb-6 uppercase tracking-wider">References</h3>
                                <ul className="space-y-3 font-mono text-sm text-slate-600">
                                    {data.references.map((ref: string, i: number) => (
                                        <li key={i} className="pl-4 -indent-4 break-all">[ {i+1} ]  {ref}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                  </div>
              </div>
          );
      }
      if (artifact.type === 'debateDossier') {
          return (
              <div className="max-w-5xl mx-auto p-2 h-full flex flex-col">
                  <div className="text-center mb-8">
                      <div className="inline-block p-3 rounded-full bg-rose-500/10 text-rose-400 mb-4 border border-rose-500/20"><Swords size={32} /></div>
                      <h1 className="text-3xl font-bold text-white mb-2">{data.topic}</h1>
                      <p className="text-slate-400 max-w-2xl mx-auto text-lg">{data.centralControversy}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto pb-10">
                      <div className="space-y-4">
                          <div className="sticky top-0 bg-slate-950/90 backdrop-blur z-10 p-4 border-b border-green-500/30 text-green-400 font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg">
                              <Check size={18} /> Pro Arguments
                          </div>
                          {data.proArguments?.map((arg: any, i: number) => (
                              <div key={i} className="bg-slate-900/50 p-6 rounded-xl border border-green-900/30 hover:border-green-500/30 transition-colors group">
                                  <h3 className="font-bold text-green-100 mb-2 text-lg">{arg.claim}</h3>
                                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">{arg.evidence}</p>
                                  <div className="text-xs bg-black/40 p-3 rounded border-l-2 border-slate-600 text-slate-500 italic">
                                      <span className="font-bold text-slate-400 not-italic mr-1">Counter:</span> {arg.counterAttack}
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="space-y-4">
                          <div className="sticky top-0 bg-slate-950/90 backdrop-blur z-10 p-4 border-b border-red-500/30 text-red-400 font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg">
                              <X size={18} /> Con Arguments
                          </div>
                          {data.conArguments?.map((arg: any, i: number) => (
                              <div key={i} className="bg-slate-900/50 p-6 rounded-xl border border-red-900/30 hover:border-red-500/30 transition-colors group">
                                  <h3 className="font-bold text-red-100 mb-2 text-lg">{arg.claim}</h3>
                                  <p className="text-sm text-slate-400 mb-4 leading-relaxed">{arg.evidence}</p>
                                  <div className="text-xs bg-black/40 p-3 rounded border-l-2 border-slate-600 text-slate-500 italic">
                                      <span className="font-bold text-slate-400 not-italic mr-1">Counter:</span> {arg.counterAttack}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          );
      }
      if (artifact.type === 'quiz') return <QuizViewer data={data} />;
      if (artifact.type === 'flashcards') return <FlashcardViewer data={data} />;

      return (
          <pre className="bg-slate-950 p-6 rounded-xl overflow-auto max-h-[70vh] text-xs font-mono text-green-400 border border-white/10">
              {JSON.stringify(data, null, 2)}
          </pre>
      );
  };

  const isCurrentTrack = currentTrack?.url === audioUrl;
  const displayTime = isCurrentTrack ? currentTime : 0;
  const displayDuration = isCurrentTrack ? duration : 0;
  const displayPlaying = isCurrentTrack ? isPlaying : false;

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
                        <div className="flex flex-col items-center justify-center relative min-h-[500px] p-4 md:p-8 glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                            <div className="flex-1 w-full flex flex-col items-center justify-center relative p-6 overflow-hidden">
                                {coverUrl && (<div className="absolute inset-0 z-0 opacity-10 blur-3xl scale-125 pointer-events-none overflow-hidden"><img src={coverUrl} className="w-full h-full object-cover" alt="" /></div>)}
                                
                                {/* Refactored Visualizer Container */}
                                <div className="relative flex items-center justify-center shrink-0 mb-8 w-[320px] h-[320px] mx-auto">
                                    <canvas ref={canvasRef} width={320} height={320} className="absolute inset-0 z-10 pointer-events-none" />
                                    {/* Inner Cover Art Circle - Diameter 192px (60% of 320) */}
                                    <div className={`relative w-[192px] h-[192px] rounded-full overflow-hidden shadow-2xl border-4 border-slate-900/80 z-20 ${displayPlaying ? 'animate-spin-slow' : ''}`} style={{ animationDuration: '30s' }}>
                                        {coverUrl ? (<img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />) : (<div className={`w-full h-full bg-gradient-to-br from-${theme.colors.primary}-900 to-slate-900 flex items-center justify-center`}><Headphones size={48} className={`text-${theme.colors.primary}-400 opacity-50`} /></div>)}
                                        <div className="absolute inset-0 bg-black/10"></div>
                                    </div>
                                </div>
                                
                                <div className="text-center z-20 px-4 w-full max-w-md mx-auto flex flex-col gap-1.5 mb-6">
                                    <h2 className="text-xl md:text-3xl font-bold text-white leading-snug drop-shadow-xl line-clamp-2 text-balance">{title || "Audio Overview"}</h2>
                                    <p className="text-sm md:text-base text-slate-400 font-medium line-clamp-3 text-balance opacity-90">{topic || "Deep Dive Podcast"}</p>
                                </div>

                                {/* Controls Container */}
                                <div className="w-full max-w-md z-30 flex flex-col gap-6">
                                    {/* Scrubber */}
                                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                                        <span className="w-10 text-right">{formatTime(displayTime)}</span>
                                        <input type="range" min="0" max={displayDuration || 100} value={displayTime} onChange={handleScrubberChange} className={`flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700 accent-${theme.colors.primary}-500 hover:accent-${theme.colors.primary}-400`} />
                                        <span className="w-10">{formatTime(displayDuration)}</span>
                                    </div>
                                    
                                    {/* Buttons - Flex Wrap for Mobile Safety */}
                                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
                                        <button onClick={() => handleSeek(-10)} className="p-3 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors" title="Rewind 10s"><Rewind size={24} /></button>
                                        <button onClick={handlePlayPause} className={`w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/20 shrink-0`}>{displayPlaying ? (<Pause fill="black" size={28} className="text-black" />) : (<Play fill="black" size={28} className="ml-1 text-black" />)}</button>
                                        <button onClick={() => handleSeek(10)} className="p-3 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors" title="Forward 10s"><FastForward size={24} /></button>
                                    </div>

                                    {/* Join Live - Visible on Mobile */}
                                    <div className="flex justify-center mt-2">
                                        <button 
                                            onClick={() => setActiveView('live')}
                                            className="flex items-center gap-2 px-5 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 hover:text-rose-300 rounded-full text-sm font-bold uppercase tracking-wider border border-rose-500/30 transition-all shadow-lg hover:shadow-rose-900/20"
                                        >
                                            <Mic size={16} /> Discuss Live
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 flex flex-col items-center gap-4 relative z-20 w-full max-w-2xl mx-auto">
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
                             {/* ... Audio Generation UI ... */}
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
                                                {podcastStyle === 'Study Guide' && (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Learning Strategy</label>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {LEARNING_INTENTS.map(intent => (
                                                                <button 
                                                                    key={intent.id}
                                                                    onClick={() => setLearningIntent(intent.id)}
                                                                    className={`p-3 rounded-xl border text-left transition-all ${learningIntent === intent.id ? `bg-${theme.colors.primary}-600/20 border-${theme.colors.primary}-500 text-white` : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                                                >
                                                                    <div className="text-sm font-bold">{intent.label}</div>
                                                                    <div className="text-[10px] opacity-70">{intent.desc}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

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

            {/* ... Knowledge Lab ... */}
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
                            { id: 'strategicRoadmap', label: 'Strategic Roadmap', icon: Map }
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
