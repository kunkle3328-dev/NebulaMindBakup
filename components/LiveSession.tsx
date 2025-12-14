
import React, { useEffect, useRef, useState } from 'react';
import { Notebook } from '../types';
import { getLiveClient, LIVE_MODEL_NAME, getDebateSystemInstruction } from '../services/ai';
import { Modality } from '@google/genai';
import { Mic, MicOff, PhoneOff, Activity, Swords, Users, Shield, Info, X, MessageSquare, Scale, AlertTriangle, HelpCircle } from 'lucide-react';
import { base64ToUint8Array, arrayBufferToBase64, convertFloat32ToInt16 } from '../services/audioUtils';
import { useTheme, useAudio } from '../contexts';

interface Props {
  notebook: Notebook;
}

// Simple linear downsampling to ensure 24kHz output
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number) {
    if (outputRate === inputRate) {
        return buffer;
    }
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        let accum = 0, count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

// Helper to map tailwind color names to rough hex values for canvas
const getThemeColorHex = (colorName: string): string => {
    const colors: Record<string, string> = {
        blue: '#3b82f6',
        indigo: '#6366f1',
        violet: '#8b5cf6',
        purple: '#a855f7',
        fuchsia: '#d946ef',
        pink: '#ec4899',
        rose: '#f43f5e',
        red: '#ef4444',
        orange: '#f97316',
        amber: '#f59e0b',
        yellow: '#eab308',
        lime: '#84cc16',
        green: '#22c55e',
        emerald: '#10b981',
        teal: '#14b8a6',
        cyan: '#06b6d4',
        sky: '#0ea5e9',
        slate: '#64748b',
        gray: '#6b7280',
        zinc: '#71717a',
        neutral: '#737373',
        stone: '#78716c',
    };
    return colors[colorName] || '#3b82f6';
};

const LiveSession: React.FC<Props> = ({ notebook }) => {
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<'setup' | 'connecting' | 'live' | 'error'>('setup');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Arena Configuration
  const [sessionMode, setSessionMode] = useState<'Standard' | 'Arena'>('Standard');
  const [debateRole, setDebateRole] = useState<'Moderator' | 'Pro' | 'Con'>('Pro');
  const [userName, setUserName] = useState('');
  
  // Explicit Tooltip State for Click Action
  const [activeTooltip, setActiveTooltip] = useState<'guest' | 'debate' | null>(null);

  const { theme } = useTheme();
  const { isPlaying, togglePlayPause } = useAudio();

  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSessionRef = useRef<any>(null); // Direct reference to active session
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleTooltip = (mode: 'guest' | 'debate', e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveTooltip(activeTooltip === mode ? null : mode);
  };

  const connect = async () => {
    // Pause background music/podcast if playing
    if (isPlaying) {
        togglePlayPause();
    }

    setStatus('connecting');
    setErrorMsg('');

    try {
        const client = getLiveClient();
        
        // 1. Setup Audio Context
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx(); 
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        audioContextRef.current = ctx;

        // 2. Setup Analyser for Visualizer
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        
        // 3. Get Microphone Stream with Echo Cancellation
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 24000,
                channelCount: 1,
                echoCancellation: true,
                autoGainControl: true,
                noiseSuppression: true
            } 
        });
        
        // 4. Connect to Gemini Live
        const sourceContext = notebook.sources.map(s => `Title: ${s.title}\nContent: ${s.content.substring(0, 1000)}...`).join('\n\n');
        const TARGET_RATE = 24000; // Gemini Live preferred rate
        const userIdentifier = userName.trim() ? userName.trim() : "Guest";
        
        let sysInstruction = "";
        if (sessionMode === 'Arena') {
            const roleInstruction = debateRole === 'Pro' 
                ? 'Challenge the user. Act as the OPPOSITION (Con). Force them to defend their points.'
                : debateRole === 'Con' 
                    ? 'Challenge the user. Act as the PROPONENT (Pro). Force them to justify their skepticism.'
                    : 'Act as a NEUTRAL MODERATOR. Ask probing questions to both sides (simulate the other side if needed).';
            
            sysInstruction = `You are hosting a Debate Arena on Nebula Mind.
            CONTEXT: ${sourceContext}
            USER NAME: ${userIdentifier}
            USER ROLE: ${debateRole}
            YOUR ROLE: ${roleInstruction}
            
            Keep it high energy, intellectual, and professional. 
            Address the user by their name (${userIdentifier}) occasionally to make it personal.
            Don't be rude, but be firm in your counter-arguments.`;
        } else {
            sysInstruction = `You are a podcast host (Host A). You are knowledgeable, enthusiastic, and articulate. 
                You are discussing the following material with the user (who is acting as a guest or co-host).
                
                USER NAME: ${userIdentifier}
                
                MATERIAL:
                ${sourceContext}

                IMPORTANT INSTRUCTIONS:
                1. Use the provided MATERIAL as a foundation for your knowledge.
                2. If the user asks a question NOT in the material, answer politely based on general knowledge.
                3. Keep responses concise and conversational.
                4. Refer to the user as "${userIdentifier}" naturally during the conversation to build rapport.`;
        }

        const sessionPromise = client.connect({
            model: LIVE_MODEL_NAME,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } 
                },
                systemInstruction: sysInstruction
            },
            callbacks: {
                onopen: () => {
                    console.log("Live Session Connected");
                    setStatus('live');
                    setConnected(true);
                    
                    // Store session for direct access in audio loop
                    sessionPromise.then(sess => { activeSessionRef.current = sess; });
                    
                    if (!audioContextRef.current) return;
                    
                    const ctx = audioContextRef.current;
                    const source = ctx.createMediaStreamSource(stream);
                    const processor = ctx.createScriptProcessor(4096, 1, 1);
                    
                    processor.onaudioprocess = (e) => {
                        if (muted || !activeSessionRef.current) return;
                        
                        const inputData = e.inputBuffer.getChannelData(0);
                        
                        // RESAMPLE: Ensure we send exactly 24kHz to avoid VAD disconnects
                        const resampledData = downsampleBuffer(inputData, ctx.sampleRate, TARGET_RATE);
                        
                        const pcmInt16 = convertFloat32ToInt16(resampledData);
                        const base64 = arrayBufferToBase64(pcmInt16.buffer);
                        
                        try {
                            activeSessionRef.current.sendRealtimeInput({
                                media: {
                                    mimeType: `audio/pcm;rate=${TARGET_RATE}`,
                                    data: base64
                                }
                            });
                        } catch (err) {
                            console.error("Audio Send Error", err);
                        }
                    };

                    source.connect(processor);
                    processor.connect(ctx.destination);
                    
                    inputSourceRef.current = source;
                    processorRef.current = processor;
                },
                onmessage: async (msg) => {
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && audioContextRef.current) {
                        const ctx = audioContextRef.current;
                        const rawBytes = base64ToUint8Array(audioData);
                        
                        // Create audio buffer (raw PCM 24kHz 1 channel)
                        const buffer = ctx.createBuffer(1, Math.floor(rawBytes.length / 2), 24000);
                        const channelData = buffer.getChannelData(0);
                        const view = new DataView(rawBytes.buffer);
                        
                        for(let i=0; i<channelData.length; i++) {
                            channelData[i] = view.getInt16(i * 2, true) / 32768.0;
                        }

                        const source = ctx.createBufferSource();
                        source.buffer = buffer;
                        
                        if (analyserRef.current) {
                             source.connect(analyserRef.current);
                        }
                        source.connect(ctx.destination);
                        
                        const now = ctx.currentTime;
                        const startTime = Math.max(now, nextStartTimeRef.current);
                        source.start(startTime);
                        nextStartTimeRef.current = startTime + buffer.duration;
                        
                        sourcesRef.current.add(source);
                        source.onended = () => sourcesRef.current.delete(source);
                    }
                    
                    if (msg.serverContent?.interrupted) {
                        sourcesRef.current.forEach(s => s.stop());
                        sourcesRef.current.clear();
                        if (audioContextRef.current) {
                            nextStartTimeRef.current = audioContextRef.current.currentTime;
                        }
                    }
                },
                onclose: () => {
                    console.log("Session Closed");
                    setStatus('setup');
                    setConnected(false);
                    activeSessionRef.current = null;
                },
                onerror: (err) => {
                    console.error("Session Error", err);
                    setErrorMsg("Connection error. Please try again.");
                    // Check for network connectivity
                    if (!navigator.onLine) {
                        setErrorMsg("No internet connection.");
                    }
                }
            }
        });

    } catch (e) {
        console.error(e);
        setErrorMsg("Failed to access microphone or API.");
        setStatus('error');
    }
  };

  const disconnect = () => {
    if (activeSessionRef.current) {
        activeSessionRef.current.close();
        activeSessionRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    
    setStatus('setup');
    setConnected(false);
  };

  useEffect(() => {
    return () => {
        disconnect();
    };
  }, []);

  // Visualizer Logic (Unchanged but using updated refs)
  useEffect(() => {
    let animationFrameId: number;
    let rotation = 0;
    
    const draw = () => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) {
             animationFrameId = requestAnimationFrame(draw);
             return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        // Responsive radius based on canvas width
        const radius = Math.min(centerX, centerY) * 0.45; 
        const bars = 64;
        const step = (Math.PI * 2) / bars;
        
        rotation += 0.005;

        // Get dynamic theme colors
        const primaryHex = getThemeColorHex(theme.colors.primary);
        const secondaryHex = getThemeColorHex(theme.colors.secondary);
        const accentHex = getThemeColorHex(theme.colors.accent);

        if (status === 'live') {
            for (let i = 0; i < bars; i++) {
                const value = dataArray[i * 2] || 0;
                const barHeight = (value / 255) * (radius * 1.2) + 5; 
                const angle = i * step + rotation;
                const x1 = centerX + Math.cos(angle) * radius;
                const y1 = centerY + Math.sin(angle) * radius;
                const x2 = centerX + Math.cos(angle) * (radius + barHeight);
                const y2 = centerY + Math.sin(angle) * (radius + barHeight);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                
                const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                gradient.addColorStop(0, accentHex); 
                gradient.addColorStop(0.5, primaryHex);
                gradient.addColorStop(1, secondaryHex); 
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            // Pulse effect
            const avg = dataArray.reduce((a, b) => a + b) / bufferLength;
            if (avg > 10) {
                 ctx.beginPath();
                 ctx.arc(centerX, centerY, radius + (avg / 2), 0, Math.PI * 2);
                 ctx.strokeStyle = `${primaryHex}4D`; // 4D is approx 30% alpha
                 ctx.lineWidth = 1;
                 ctx.stroke();
            }

        } else {
             ctx.beginPath();
             ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
             ctx.strokeStyle = '#334155';
             ctx.lineWidth = 2;
             ctx.setLineDash([5, 5]);
             ctx.stroke();
             ctx.setLineDash([]);
        }

        animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, theme]);

  if (status === 'setup') {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-3xl mx-auto glass-panel rounded-2xl p-6 md:p-8 relative bg-slate-950 overflow-y-auto custom-scrollbar">
                <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col gap-6" onClick={() => setActiveTooltip(null)}>
                    <h2 className="text-xl md:text-2xl font-bold text-white text-center">Configure Live Session</h2>
                    
                    {/* Mode Selection */}
                    <div className="grid grid-cols-2 gap-3 relative">
                        {/* GUEST CHAT BUTTON */}
                        <div className="relative">
                            <button 
                                onClick={() => setSessionMode('Standard')}
                                className={`w-full group p-4 rounded-xl border transition-all flex flex-col items-center gap-2 relative ${sessionMode === 'Standard' ? `bg-${theme.colors.primary}-600/20 border-${theme.colors.primary}-500 text-white shadow-lg shadow-${theme.colors.primary}-900/20` : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                            >
                                <Users size={24} className={sessionMode === 'Standard' ? `text-${theme.colors.primary}-400` : ''} />
                                <span className="font-bold text-sm">Guest Chat</span>
                            </button>
                            <button onClick={(e) => toggleTooltip('guest', e)} className="absolute top-2 right-2 text-slate-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <HelpCircle size={14} />
                            </button>
                        </div>

                        {/* DEBATE ARENA BUTTON */}
                        <div className="relative">
                            <button 
                                onClick={() => setSessionMode('Arena')}
                                className={`w-full group p-4 rounded-xl border transition-all flex flex-col items-center gap-2 relative ${sessionMode === 'Arena' ? 'bg-orange-600/20 border-orange-500 text-white shadow-lg shadow-orange-900/20' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                            >
                                <Swords size={24} className={sessionMode === 'Arena' ? 'text-orange-400' : ''} />
                                <span className="font-bold text-sm">Debate Arena</span>
                            </button>
                            <button onClick={(e) => toggleTooltip('debate', e)} className="absolute top-2 right-2 text-slate-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                                <HelpCircle size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Tooltip Information Area */}
                    {activeTooltip && (
                        <div className="p-4 bg-slate-900 border border-white/10 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 text-left relative">
                            <button onClick={() => setActiveTooltip(null)} className="absolute top-2 right-2 text-slate-500 hover:text-white"><X size={14} /></button>
                            {activeTooltip === 'guest' && (
                                <>
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2"><Users size={12}/> Standard Interview</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        The AI acts as a friendly podcast host. You are the guest expert. The host will ask you questions based on your source material, guiding a natural, exploratory conversation.
                                    </p>
                                </>
                            )}
                            {activeTooltip === 'debate' && (
                                <>
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2"><Swords size={12}/> Adversarial Challenge</h4>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        The AI acts as a skilled opponent. Choose your stance (Pro/Con), and the AI will rigorously challenge your logic, find gaps in your arguments, and force you to defend your position.
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Arena Specific Options */}
                    {sessionMode === 'Arena' && (
                        <div className="animate-in fade-in slide-in-from-top-4 space-y-3">
                            <div className="p-3 bg-slate-900/80 border border-white/5 rounded-xl text-center shadow-inner">
                                <p className="text-[10px] text-slate-500 mb-2 font-bold uppercase tracking-widest">Select Your Stance</p>
                                {/* Compact grid for mobile */}
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={() => setDebateRole('Pro')} 
                                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${debateRole === 'Pro' ? 'bg-green-500/20 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        <span className="font-black text-sm md:text-lg">PRO</span>
                                        <span className="text-[9px] opacity-80 uppercase font-bold">Agree</span>
                                    </button>
                                    <button 
                                        onClick={() => setDebateRole('Con')} 
                                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${debateRole === 'Con' ? 'bg-red-500/20 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        <span className="font-black text-sm md:text-lg">CON</span>
                                        <span className="text-[9px] opacity-80 uppercase font-bold">Disagree</span>
                                    </button>
                                    <button 
                                        onClick={() => setDebateRole('Moderator')} 
                                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${debateRole === 'Moderator' ? 'bg-blue-500/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'}`}
                                    >
                                        <Scale size={18} className="mb-0.5" />
                                        <span className="text-[9px] opacity-80 uppercase font-bold">Neutral</span>
                                    </button>
                                </div>
                            </div>

                            <div className={`p-3 rounded-lg border text-xs leading-relaxed flex gap-3 items-start ${
                                debateRole === 'Pro' ? 'bg-red-950/30 border-red-500/20 text-red-200' :
                                debateRole === 'Con' ? 'bg-green-950/30 border-green-500/20 text-green-200' :
                                'bg-blue-950/30 border-blue-500/20 text-blue-200'
                            }`}>
                                <div className="mt-0.5 shrink-0 opacity-70">
                                    {debateRole === 'Moderator' ? <Info size={14}/> : <AlertTriangle size={14}/>}
                                </div>
                                <p>
                                    {debateRole === 'Pro' && "The AI will act as the OPPOSITION. It will attack your arguments and try to find flaws in your logic."}
                                    {debateRole === 'Con' && "The AI will act as the PROPONENT. It will defend the source material aggressively against your skepticism."}
                                    {debateRole === 'Moderator' && "The AI will play both sides or answer neutrally, letting you guide the flow of the conversation."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Name Input */}
                    <input 
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Your Name (Optional)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-white/30 text-sm transition-all"
                    />

                    <button 
                        onClick={connect}
                        className={`w-full py-3.5 mt-2 bg-gradient-to-r ${sessionMode === 'Arena' ? 'from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 shadow-orange-900/20' : `from-${theme.colors.primary}-600 to-${theme.colors.secondary}-600 hover:from-${theme.colors.primary}-500 hover:to-${theme.colors.secondary}-500 shadow-${theme.colors.primary}-900/20`} text-white rounded-xl font-bold text-base shadow-lg hover:scale-[1.02] transition-all`}
                    >
                        {sessionMode === 'Arena' ? 'Enter the Arena' : 'Start Conversation'}
                    </button>
                </div>
          </div>
      );
  }

  return (
    // Updated container layout: auto height to prevent clipping, min-height for structure
    <div ref={containerRef} className="flex flex-col items-center min-h-[500px] h-auto w-full glass-panel rounded-2xl relative overflow-hidden bg-slate-950 mx-4 md:mx-0 py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 ${sessionMode === 'Arena' ? 'bg-orange-900/20' : `bg-${theme.colors.primary}-900/20`} blur-[80px] rounded-full animate-pulse`}></div>
        
        <div className="relative z-10 flex flex-col items-center justify-between w-full h-full gap-4">
            {/* Reduced visualizer height on mobile */}
            <div className="relative w-full h-[220px] md:h-[320px] flex items-center justify-center shrink-0">
                 {/* Responsive Canvas */}
                 <canvas ref={canvasRef} width={400} height={320} className="z-10 w-full h-full object-contain" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
                      <div className={`p-4 rounded-full transition-all duration-500 ${status === 'live' ? `bg-slate-900/80 shadow-[0_0_30px_rgba(var(--color-${theme.colors.primary}),0.3)] backdrop-blur-md border border-${theme.colors.primary}-500/30` : 'bg-slate-800'}`}>
                          {status === 'live' ? <Activity className={sessionMode === 'Arena' ? "text-orange-400 w-8 h-8 animate-pulse" : `text-${theme.colors.primary}-400 w-8 h-8 animate-pulse`} /> : <MicOff className="text-slate-500 w-8 h-8" />}
                      </div>
                 </div>
            </div>

            <div className="text-center z-20 px-4 mt-[-1rem] md:mt-[-2rem]">
                <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                    {sessionMode === 'Arena' ? <Swords size={12} className="text-orange-400"/> : <MessageSquare size={12} className={`text-${theme.colors.primary}-400`}/>}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {sessionMode === 'Arena' ? `Arena Mode • ${debateRole}` : 'Standard Mode'}
                    </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-white drop-shadow-[0_0_10px_rgba(var(--color-${theme.colors.primary}),0.5)]">
                    {status === 'connecting' ? 'Establishing Uplink...' : sessionMode === 'Arena' ? 'DEBATE IN SESSION' : 'Live on Air'}
                </h2>
                <p className="text-slate-400 max-w-sm mx-auto text-sm font-medium">
                    {status === 'live' ? (sessionMode === 'Arena' ? `The AI is listening to your argument${userName ? ', ' + userName : ''}...` : `Listening to you${userName ? ', ' + userName : ''}... (Speak naturally)`) : errorMsg || 'Calibrating neural audio stream...'}
                </p>
            </div>

            <div className="flex gap-4 z-20 mt-4">
                {status === 'error' ? (
                    <button 
                        onClick={() => setStatus('setup')}
                        className="px-6 md:px-8 py-3 bg-slate-800 text-white rounded-full font-bold border border-white/10"
                    >
                        Retry Setup
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={() => setMuted(!muted)}
                            className={`p-4 rounded-full transition-colors border border-white/10 shadow-lg ${muted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                        >
                            {muted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        <button 
                            onClick={disconnect}
                            className="p-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-all border border-red-500/50 shadow-lg"
                        >
                            <PhoneOff size={24} />
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};

export default LiveSession;
