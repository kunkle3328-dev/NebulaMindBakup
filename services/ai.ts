
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Notebook, Source } from "../types";
import { base64ToUint8Array, createWavUrl } from "./audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_TEXT = 'gemini-2.5-flash'; 
const MODEL_REASONING = 'gemini-2.5-flash'; 
const MODEL_SCRIPT = 'gemini-3-pro-preview'; 
const MODEL_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_IMAGE = 'gemini-2.5-flash-image';

const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const cleanJsonString = (str: string) => {
    let cleaned = str.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    }
    return cleaned;
};

const formatContext = (sources: Source[]): string => {
  return sources.map(s => `SOURCE: ${s.title}\nCONTENT:\n${s.content}\n---`).join('\n');
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

const generateSlideDeckHtml = (deck: any): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${deck.deckTitle}</title>
    <style>
        :root { --primary: #38bdf8; --bg: #0f172a; --text: #f8fafc; }
        body { margin: 0; font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); overflow: hidden; }
        .slide-container { position: relative; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
        .slide { position: absolute; opacity: 0; transition: all 0.5s ease-in-out; transform: translateY(20px); width: 80%; max-width: 1000px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .slide.active { opacity: 1; transform: translateY(0); z-index: 10; }
        h1 { font-size: 3.5rem; color: var(--primary); margin-bottom: 0.5em; text-shadow: 0 0 20px rgba(56, 189, 248, 0.3); line-height: 1.1; }
        ul { text-align: left; display: inline-block; font-size: 1.8rem; line-height: 1.6; list-style-type: none; padding: 0; max-width: 100%; }
        li { margin-bottom: 15px; padding-left: 30px; position: relative; word-wrap: break-word; }
        li::before { content: "•"; color: var(--primary); position: absolute; left: 0; font-size: 2rem; line-height: 1.8rem; }
        .controls { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 20px; z-index: 20; }
        button { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 12px 24px; border-radius: 30px; cursor: pointer; transition: all 0.2s; backdrop-filter: blur(10px); }
        button:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        .progress { position: fixed; top: 0; left: 0; height: 4px; background: var(--primary); transition: width 0.3s; }
        .notes { position: fixed; bottom: 30px; right: 30px; font-size: 0.9rem; color: #94a3b8; max-width: 300px; text-align: right; font-style: italic; }
        @media (max-width: 768px) {
            body { overflow-y: auto; overflow-x: hidden; }
            .slide-container { display: block; height: auto; min-height: 100vh; padding: 20px 0 80px 0; }
            .slide { position: relative; width: 90%; margin: 0 auto; opacity: 0; display: none; transform: none; text-align: left; align-items: flex-start; min-height: 60vh; }
            .slide.active { opacity: 1; display: flex; }
            h1 { font-size: 2rem; margin-bottom: 1rem; width: 100%; word-wrap: break-word; }
            ul { font-size: 1.1rem; width: 100%; display: block; padding-left: 0; }
            li { margin-bottom: 12px; padding-left: 20px; line-height: 1.4; }
            li::before { font-size: 1.2rem; top: 0; left: 0; }
            .controls { bottom: 20px; gap: 10px; width: 90%; justify-content: space-between; }
            button { flex: 1; padding: 12px 0; font-size: 1rem; background: rgba(0,0,0,0.8); }
            .notes { display: none; }
        }
    </style>
</head>
<body>
    <div class="progress" id="progressBar"></div>
    <div class="slide-container" id="container"></div>
    <div class="controls">
        <button onclick="prev()">Previous</button>
        <button onclick="next()">Next</button>
    </div>
    <div class="notes" id="notes"></div>
    <script>
        const deck = ${JSON.stringify(deck)};
        let current = 0;
        const container = document.getElementById('container');
        const notes = document.getElementById('notes');
        const progressBar = document.getElementById('progressBar');
        function render() {
            container.innerHTML = '';
            deck.slides.forEach((slide, index) => {
                const div = document.createElement('div');
                div.className = \`slide \${index === current ? 'active' : ''}\`;
                div.innerHTML = \`<h1>\${slide.slideTitle}</h1><ul>\${slide.bulletPoints.map(p => \`<li>\${p}</li>\`).join('')}</ul>\`;
                container.appendChild(div);
            });
            if(notes) notes.innerText = deck.slides[current].speakerNotes;
            if(progressBar) progressBar.style.width = \`\${((current + 1) / deck.slides.length) * 100}%\`;
            window.scrollTo(0,0);
        }
        function next() { if(current < deck.slides.length - 1) { current++; render(); } }
        function prev() { if(current > 0) { current--; render(); } }
        document.addEventListener('keydown', (e) => { if(e.key === 'ArrowRight' || e.key === ' ') next(); if(e.key === 'ArrowLeft') prev(); });
        window.addEventListener('resize', render);
        render();
    </script>
</body>
</html>`;
};

export const processFileWithGemini = async (file: File, mimeType: string): Promise<string> => {
    try {
        const base64Data = await fileToBase64(file);
        let prompt = "Extract all text from this document. Preserve formatting where possible.";
        if (mimeType.startsWith('audio/')) {
            prompt = "Transcribe this audio file verbatim. Identify speakers if possible.";
        } else if (mimeType.startsWith('image/')) {
            prompt = "Extract all visible text from this image. Describe any charts or diagrams in detail.";
        }
        const response = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }
        });
        return response.text || "No text extracted.";
    } catch (error: any) {
        console.error("Gemini File Processing Error:", error);
        throw new Error(`Failed to process file: ${error.message || "Network error."}`);
    }
};

const parseHtmlContent = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const scripts = doc.querySelectorAll('script, style, noscript, iframe, svg, nav, footer, header');
    scripts.forEach(s => s.remove());
    return doc.body.innerText.replace(/\s+/g, ' ').trim().substring(0, 50000);
};

export const fetchWebsiteContent = async (url: string): Promise<string> => {
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    for (const proxyUrl of proxies) {
        try {
            const response = await fetch(proxyUrl);
            if (response.ok) {
                const html = await response.text();
                return parseHtmlContent(html);
            }
        } catch (e) { console.warn(`Proxy failed: ${proxyUrl}`, e); }
    }
    return `[System: Content inaccessible. The AI is aware of this source at ${url}.]`;
};

export const runNebulaScout = async (topic: string, onProgress: (msg: string) => void): Promise<Source[]> => {
    try {
        onProgress("Initializing Scout Agent...");
        const searchPrompt = `Perform a comprehensive search about: "${topic}". GOAL: Find exactly 5 distinct, high-quality sources. OUTPUT: JSON array [{"title": "...", "url": "..."}].`;
        const scoutResponse = await ai.models.generateContent({
            model: MODEL_TEXT,
            contents: searchPrompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        const targets: {url: string, title: string}[] = [];
        const uniqueUrls = new Set<string>();
        const chunks = scoutResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        for (const chunk of chunks) {
            if (chunk.web?.uri && !uniqueUrls.has(chunk.web.uri)) {
                uniqueUrls.add(chunk.web.uri);
                targets.push({ url: chunk.web.uri, title: chunk.web.title || "Scouted Source" });
            }
        }
        if (targets.length === 0 && scoutResponse.text) {
             try {
                const jsonStr = cleanJsonString(scoutResponse.text);
                const json = JSON.parse(jsonStr);
                if (Array.isArray(json)) json.forEach((item: any) => { if (item.url && !uniqueUrls.has(item.url)) targets.push(item); });
             } catch(e) {}
        }
        const finalTargets = targets.slice(0, 5);
        if (finalTargets.length === 0) throw new Error("Scout failed to identify valid targets.");
        const newSources: Source[] = [];
        for (const target of finalTargets) {
            onProgress(`Acquiring target: ${target.title}...`);
            let content = "";
            try { content = await fetchWebsiteContent(target.url); } catch (e) {}
            if (!content || content.includes("[System:")) content = `[Nebula Scout Summary]\nTitle: ${target.title}\nURL: ${target.url}`;
            newSources.push({ id: generateId(), type: 'website', title: target.title, content: content, createdAt: Date.now(), metadata: { originalUrl: target.url, scouted: true } });
        }
        return newSources;
    } catch (error: any) { throw new Error(error.message || "Scout mission aborted."); }
};

export const generateAnswer = async (query: string, sources: Source[], onUpdate: (text: string, grounding?: any) => void) => {
  if (sources.length === 0) { onUpdate("Please add sources first.", undefined); return; }
  const context = formatContext(sources);
  const prompt = `CONTEXT:\n${context}\n\nUSER: ${query}\n\nTask: Answer comprehensively. Ground in sources. Use Google Search if needed.`;
  try {
    const response = await ai.models.generateContentStream({
      model: MODEL_TEXT,
      contents: prompt,
      config: { systemInstruction: `You are Nebula. Ground answers.`, tools: [{ googleSearch: {} }] }
    });
    for await (const chunk of response) {
      if (chunk.text || chunk.candidates?.[0]?.groundingMetadata) onUpdate(chunk.text || '', chunk.candidates?.[0]?.groundingMetadata);
    }
  } catch (error) { onUpdate("Error generating response.", undefined); }
};

export const speakText = async (text: string): Promise<string> => {
  try {
      const response = await ai.models.generateContent({
        model: MODEL_TTS,
        contents: [{ parts: [{ text: text.substring(0, 4000) }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } } }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("Failed to generate speech");
      return createWavUrl(base64ToUint8Array(base64Audio), 24000);
  } catch (error) { throw new Error("Speech generation failed."); }
};

export const generateArtifact = async (
  type: 'flashcards' | 'quiz' | 'infographic' | 'slideDeck' | 'executiveBrief' | 'researchPaper' | 'debateDossier' | 'mindMap',
  sources: Source[]
) => {
  const context = formatContext(sources);
  
  try {
      if (type === 'infographic') {
          const designBriefResponse = await ai.models.generateContent({
              model: MODEL_TEXT,
              contents: `TASK: Create a highly detailed image prompt for an educational poster (vertical 3:4 aspect ratio).
              STYLE: Swiss Style, bold typography, minimal text, high contrast.
              CONTENT: Extract the single most important concept from context.
              OUTPUT FORMAT: "A professional educational poster about [TOPIC]. Central Visual: [DESCRIBE]. Typography: [DETAILS]. Style: [DETAILS]."`
          });
          const imagePrompt = designBriefResponse.text || "Educational poster, clean vector art.";
          const imageResponse = await ai.models.generateContent({
              model: MODEL_IMAGE, 
              contents: { parts: [{ text: imagePrompt }] },
          });
          let base64Image = null;
          if (imageResponse.candidates?.[0]?.content?.parts) {
              for (const part of imageResponse.candidates[0].content.parts) { if (part.inlineData) { base64Image = part.inlineData.data; break; } }
          }
          if (!base64Image) throw new Error("Failed to generate image");
          return { imageUrl: `data:image/png;base64,${base64Image}`, prompt: imagePrompt };
      }

      let prompt = "";
      let schema: any = {};

      switch (type) {
        case 'flashcards':
          prompt = `Generate 15-20 high-quality flashcards.`;
          schema = { type: Type.OBJECT, properties: { cards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } }, required: ['term', 'definition'] } } } };
          break;
        case 'quiz':
          prompt = "Generate a quiz with 3 multiple choice questions.";
          schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING }, questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswerIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING } }, required: ['question', 'options', 'correctAnswerIndex'] } } } };
          break;
        case 'slideDeck':
          prompt = "Create a comprehensive slide deck outline (6-10 slides).";
          schema = { type: Type.OBJECT, properties: { deckTitle: { type: Type.STRING }, slides: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { slideTitle: {type: Type.STRING}, bulletPoints: {type: Type.ARRAY, items: {type: Type.STRING}}, speakerNotes: {type: Type.STRING} } } } } };
          break;
        case 'executiveBrief':
          prompt = `Synthesize into a high-level Strategic Executive Briefing.`;
          schema = { type: Type.OBJECT, properties: { briefTitle: { type: Type.STRING }, executiveSummary: { type: Type.STRING }, keyFindings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { heading: { type: Type.STRING }, point: { type: Type.STRING } } } }, strategicImplications: { type: Type.STRING }, actionableItems: { type: Type.ARRAY, items: { type: Type.STRING } } } };
          break;
        case 'researchPaper':
          prompt = `Write a comprehensive, academic-standard research paper based on the provided sources. 
          Use formal language, deep analysis, and proper citations.
          Structure: Title, Abstract, 4-6 Detailed Sections (Introduction, Methodology/Analysis, Discussion, Conclusion), and a Reference list.`;
          schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING }, abstract: { type: Type.STRING }, sections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { heading: { type: Type.STRING }, content: { type: Type.STRING } } } }, references: { type: Type.ARRAY, items: { type: Type.STRING } } } };
          break;
        case 'debateDossier':
          prompt = `Create a strategic Debate Dossier. 
          1. Identify the most contentious issue in the sources.
          2. Provide 3 strong PRO arguments and 3 strong CON arguments.
          3. For each argument, provide specific evidence from sources and a pre-emptive counter-attack strategy.`;
          schema = { type: Type.OBJECT, properties: { topic: { type: Type.STRING }, centralControversy: { type: Type.STRING }, proArguments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { claim: { type: Type.STRING }, evidence: { type: Type.STRING }, counterAttack: { type: Type.STRING } } } }, conArguments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { claim: { type: Type.STRING }, evidence: { type: Type.STRING }, counterAttack: { type: Type.STRING } } } } } };
          break;
        case 'mindMap':
          prompt = `Analyze the context and generate a hierarchical Mind Map structure. 
          The Root Node is the main topic.
          Create 3-4 major branches (key themes).
          Each branch MUST have 2-3 sub-branches (specific details).
          Keep labels VERY SHORT (1-3 words max).`;
          schema = { type: Type.OBJECT, properties: { rootTopic: { type: Type.STRING }, branches: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, details: { type: Type.STRING }, subBranches: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, details: { type: Type.STRING } } } } } } } } };
          break;
      }

      const response = await ai.models.generateContent({
        model: MODEL_REASONING,
        contents: `${prompt}\n\nCONTEXT:\n${context}`,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });

      const rawText = response.text || "{}";
      const content = JSON.parse(cleanJsonString(rawText));
      if (type === 'slideDeck' && content) content.html = generateSlideDeckHtml(content);
      return content;
  } catch (error: any) {
      console.error("Artifact Generation Error:", error);
      throw new Error(`Failed to generate ${type}: ${error.message || "Unknown error"}`);
  }
};

export const generateAudioOverview = async (
    sources: Source[], 
    length: 'Short' | 'Medium' | 'Long' = 'Medium',
    style: 'Deep Dive' | 'Heated Debate' | 'Casual Chat' | 'News Brief' | 'Study Guide' = 'Deep Dive',
    voices: { joe: string; jane: string } = { joe: 'Puck', jane: 'Aoede' },
    onProgress?: (status: string) => void,
    learningIntent?: string
) => {
    const context = formatContext(sources);
    let durationInstruction = "roughly 8-10 minutes";
    if (length === 'Short') durationInstruction = "about 3-5 minutes";
    if (length === 'Long') durationInstruction = "about 12-15 minutes";

    try {
        if (onProgress) onProgress(`Synthesizing ${style} Script...`);
        const userPrompt = `Create a ${style} podcast script. Length: ${durationInstruction}. SOURCE MATERIAL: ${context}`;
        
        // ENHANCED SYSTEM INSTRUCTION FOR HUMAN-LIKE AUDIO
        const systemInstruction = `
        You are an expert podcast producer and scriptwriter for "Nebula Mind".
        
        GOAL: Write a script that sounds 100% human, spontaneous, and witty. 
        AVOID: "In conclusion", "As we can see", "Let's dive in", robotic transitions, or summarizing things like a textbook.

        CHARACTERS:
        1. JOE (The Skeptic/Host): Dry wit, grounds the conversation, asks the "dumb" questions the audience is thinking. Often interrupts to clarify.
        2. JANE (The Expert/Analyst): High energy, connects the dots, passionate, maybe speaks a bit fast when excited.

        FORMAT RULES:
        - Use "Joe:" and "Jane:" labels.
        - Use [LAUGH], [SIGH], [PAUSE] for pacing (the TTS will interpret these as best it can, or just helpful for structure).
        - INTERRUPTIONS: Use double dash "--" at the end of a line if someone gets cut off.
        - FILLERS: Occasional "um", "like", or "you know" is okay to sound natural, but don't overdo it.
        - STYLE: ${style} (Adjust tone accordingly).
        
        STRUCTURE:
        - Start COLD (No "Welcome to the podcast"). Start with a surprising fact or a joke.
        - Go deep into the "Why" and "How", not just the "What".
        - End with a lingering question or a funny observation, not a formal summary.
        `;

        const scriptResponse = await ai.models.generateContent({
            model: MODEL_SCRIPT,
            contents: userPrompt,
            config: { 
                systemInstruction: systemInstruction, 
                maxOutputTokens: 8192,
                temperature: 0.8 // Increase creativity for natural flow
            }
        });
        
        let scriptText = scriptResponse.text || "";
        let podcastTitle = `${style} Podcast`;
        let podcastTopic = "Research Overview";

        // Heuristic to extract title if generated in script
        if (scriptText.includes("TITLE:")) {
             const lines = scriptText.split('\n');
             const titleLine = lines.find(l => l.toUpperCase().startsWith("TITLE:"));
             if (titleLine) {
                 podcastTitle = titleLine.replace(/^TITLE:\s*/i, '').trim();
                 // Remove the title line from the script to avoid reading it
                 scriptText = scriptText.replace(titleLine, '').trim();
             }
        }
        
        // Remove SCRIPT_START markers if present
        scriptText = scriptText.replace("SCRIPT_START", "").trim();

        if (onProgress) onProgress("Designing Cover Art...");
        const imagePrompt = `Podcast cover art for "${podcastTitle}". Style: High-end 3D abstract digital art, 8k resolution, ${style} vibes.`;
        const imgResp = await ai.models.generateContent({ model: MODEL_IMAGE, contents: { parts: [{ text: imagePrompt }] } });
        let coverUrl = null;
        if (imgResp.candidates?.[0]?.content?.parts) {
            for (const part of imgResp.candidates[0].content.parts) { if (part.inlineData) { coverUrl = `data:image/png;base64,${part.inlineData.data}`; break; } }
        }

        if (onProgress) onProgress("Recording Audio Voices...");
        // Clean script for TTS but keep some flavor
        const safeScript = scriptText.replace(/\[.*?\]/g, "").substring(0, 40000); 
        
        const ttsResponse = await ai.models.generateContent({
            model: MODEL_TTS,
            contents: [{ parts: [{ text: safeScript }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [{ speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: voices.joe } } }, { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: voices.jane } } }] } }
            }
        });
        const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("Failed to generate audio bytes");
        
        if (onProgress) onProgress("Processing Audio Stream...");
        const audioUrl = createWavUrl(base64ToUint8Array(base64Audio), 24000);

        return { title: podcastTitle, topic: podcastTopic, script: scriptText, audioUrl, coverUrl };
    } catch (error: any) {
        console.error("Audio Overview Error:", error);
        throw new Error(`Audio generation failed: ${error.message}`);
    }
};

export const getLiveClient = () => ai.live;
export const LIVE_MODEL_NAME = MODEL_LIVE;
export const getDebateSystemInstruction = (context: string, role: string, stance: string) => `You are the Nebula Mind AI Podcast Team. Debate the user. User Role: ${role}. User Stance: ${stance}. CONTEXT: ${context}`;
