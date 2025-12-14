
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { Notebook, Source } from "../types";
import { base64ToUint8Array, createWavUrl } from "./audioUtils";
import { RAG_SYSTEM_INSTRUCTION } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_TEXT = 'gemini-2.5-flash'; 
const MODEL_REASONING = 'gemini-3-pro-preview'; // Used for complex reasoning
const MODEL_SCRIPT = 'gemini-3-pro-preview'; 
const MODEL_LIVE = 'gemini-2.5-flash-native-audio-preview-09-2025';
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
const MODEL_IMAGE = 'gemini-2.5-flash-image';

// Helper: Retry Operation with Backoff
async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = 2,
    delay: number = 2000
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        // If we ran out of retries, or if it's a client error (4xx) that isn't a timeout/rate limit, throw.
        // Assuming 500/Unknown/XHR error are worth retrying.
        if (retries <= 0) throw error;
        
        console.warn(`Operation failed, retrying in ${delay}ms... (Retries left: ${retries})`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(operation, retries - 1, delay * 2);
    }
}

const generateId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const cleanJsonString = (str: string) => {
    let cleaned = str.trim();
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');
    
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1) {
        if (cleaned.endsWith('}')) {
             const lastBrace = cleaned.lastIndexOf('}');
             if (lastBrace > firstBrace) {
                 cleaned = cleaned.substring(firstBrace, lastBrace + 1);
             }
        } else {
             cleaned = cleaned.substring(firstBrace);
        }
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
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_TEXT,
            contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }
        }));
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
        const searchPrompt = `Research the topic: "${topic}".
        Find 5 distinct, high-quality web sources.
        For each source, write a brief summary and list its URL.`;

        const scoutResponse = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_TEXT,
            contents: searchPrompt,
            config: { 
                tools: [{ googleSearch: {} }],
            }
        }));

        const targets: {url: string, title: string}[] = [];
        const uniqueUrls = new Set<string>();
        
        const chunks = scoutResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        for (const chunk of chunks) {
            if (chunk.web?.uri && !uniqueUrls.has(chunk.web.uri)) {
                uniqueUrls.add(chunk.web.uri);
                let title = chunk.web.title;
                if (!title) {
                    try {
                         title = `Source: ${new URL(chunk.web.uri).hostname}`;
                    } catch(e) { title = "Web Result"; }
                }
                targets.push({ url: chunk.web.uri, title: title });
            }
        }
        
        if (targets.length < 2 && scoutResponse.text) {
             const urlRegex = /https?:\/\/[^\s"']+/g;
             const matches = scoutResponse.text.match(urlRegex) || [];
             for (const url of matches) {
                 if (!uniqueUrls.has(url)) {
                     uniqueUrls.add(url);
                     let title = "Web Result";
                     try { title = new URL(url).hostname; } catch(e) {}
                     targets.push({ url, title });
                 }
             }
        }

        const finalTargets = targets.slice(0, 5);
        if (finalTargets.length === 0) throw new Error("Scout failed to identify valid targets.");
        
        const newSources: Source[] = [];
        for (const target of finalTargets) {
            onProgress(`Acquiring target: ${target.title}...`);
            let content = "";
            try { 
                content = await fetchWebsiteContent(target.url); 
            } catch (e) {
                console.warn("Fetch failed for", target.url);
            }

            if (!content || content.includes("[System:")) {
                 content = `[Nebula Scout: Connection Failed]\nURL: ${target.url}\n\nThe system could not retrieve the full text of this page directly.`;
            }

            newSources.push({ 
                id: generateId(), 
                type: 'website', 
                title: target.title, 
                content: content, 
                createdAt: Date.now(), 
                metadata: { originalUrl: target.url, scouted: true } 
            });
        }
        
        return newSources;

    } catch (error: any) { 
        console.error("Scout Error", error);
        throw new Error(error.message || "Scout mission aborted."); 
    }
};

export const generateAnswer = async (query: string, sources: Source[], onUpdate: (text: string, grounding?: any) => void) => {
  if (sources.length === 0) { onUpdate("Please add sources first.", undefined); return; }
  const context = formatContext(sources).substring(0, 50000); // Truncate to avoid payload limits
  const prompt = `CONTEXT:\n${context}\n\nUSER: ${query}\n\nTask: Answer conversationaly as Joe (the host).`;
  try {
    const response = await ai.models.generateContentStream({
      model: MODEL_TEXT,
      contents: prompt,
      config: { systemInstruction: RAG_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    });
    for await (const chunk of response) {
      const c = chunk as GenerateContentResponse;
      if (c.text || c.candidates?.[0]?.groundingMetadata) onUpdate(c.text || '', c.candidates?.[0]?.groundingMetadata);
    }
  } catch (error) { onUpdate("Error generating response.", undefined); }
};

export const speakText = async (text: string): Promise<string> => {
  try {
      const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: MODEL_TTS,
        contents: [{ parts: [{ text: text.substring(0, 4000) }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } } }
      }));
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("Failed to generate speech");
      return createWavUrl(base64ToUint8Array(base64Audio), 24000);
  } catch (error) { throw new Error("Speech generation failed."); }
};

export const generateArtifact = async (
  type: 'flashcards' | 'quiz' | 'infographic' | 'slideDeck' | 'executiveBrief' | 'researchPaper' | 'debateDossier' | 'strategicRoadmap',
  sources: Source[]
) => {
  const context = formatContext(sources).substring(0, 80000); // Limit context size
  
  try {
      if (type === 'infographic') {
          const designBriefResponse = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
              model: MODEL_TEXT,
              contents: `TASK: Create a highly detailed image prompt for an educational poster (vertical 3:4 aspect ratio).
              STYLE: Modern minimalist, flat vector art, high contrast.
              CONTEXT: ${context.substring(0, 2000)}
              OUTPUT FORMAT: "A professional educational poster about [TOPIC]. Central Visual: [DESCRIBE]. Typography: [DETAILS]. Style: [DETAILS]."`
          }));
          const imagePrompt = designBriefResponse.text || "Educational poster, clean vector art.";
          const imageResponse = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
              model: MODEL_IMAGE, 
              contents: { parts: [{ text: imagePrompt }] },
          }));
          let base64Image = null;
          if (imageResponse.candidates?.[0]?.content?.parts) {
              for (const part of imageResponse.candidates[0].content.parts) { if (part.inlineData) { base64Image = part.inlineData.data; break; } }
          }
          if (!base64Image) throw new Error("Failed to generate image");
          return { imageUrl: `data:image/png;base64,${base64Image}`, prompt: imagePrompt };
      }

      let prompt = "";
      let schema: any = {};
      
      let selectedModel = MODEL_REASONING;

      switch (type) {
        case 'flashcards':
          prompt = `Generate 10-15 high-quality flashcards. concise definitions.`;
          schema = { type: Type.OBJECT, properties: { cards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } }, required: ['term', 'definition'] } } } };
          selectedModel = MODEL_TEXT;
          break;
        case 'quiz':
          prompt = "Generate a challenging quiz with 5 multiple choice questions. Include correct answer index (0-3) and explanation.";
          schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING }, questions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswerIndex: { type: Type.INTEGER }, explanation: { type: Type.STRING } }, required: ['question', 'options', 'correctAnswerIndex'] } } } };
          selectedModel = MODEL_TEXT;
          break;
        case 'slideDeck':
          prompt = "Create a comprehensive slide deck outline (5-8 slides). Keep bullet points very short (max 10 words).";
          schema = { type: Type.OBJECT, properties: { deckTitle: { type: Type.STRING }, slides: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { slideTitle: {type: Type.STRING}, bulletPoints: {type: Type.ARRAY, items: {type: Type.STRING}}, speakerNotes: {type: Type.STRING} } } } } };
          selectedModel = MODEL_REASONING;
          break;
        case 'executiveBrief':
          prompt = `Synthesize into a Strategic Executive Briefing. Bullet points only. Max 400 words total.`;
          schema = { type: Type.OBJECT, properties: { briefTitle: { type: Type.STRING }, executiveSummary: { type: Type.STRING }, keyFindings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { heading: { type: Type.STRING }, point: { type: Type.STRING } } } }, strategicImplications: { type: Type.STRING }, actionableItems: { type: Type.ARRAY, items: { type: Type.STRING } } } };
          selectedModel = MODEL_TEXT;
          break;
        case 'researchPaper':
          prompt = `Write a condensed research paper summary. 
          Structure: Title, Abstract, 3 Brief Sections, References.
          CRITICAL CONSTRAINT: Total output MUST be under 600 words.
          Sections must be high-level summaries (max 150 words each).
          Use concise academic language.`;
          schema = { type: Type.OBJECT, properties: { title: { type: Type.STRING }, abstract: { type: Type.STRING }, sections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { heading: { type: Type.STRING }, content: { type: Type.STRING } } } }, references: { type: Type.ARRAY, items: { type: Type.STRING } } } };
          selectedModel = MODEL_TEXT;
          break;
        case 'debateDossier':
          prompt = `Create a strategic Debate Dossier. 
          1. Identify central controversy.
          2. Provide 3 PRO and 3 CON arguments.
          CRITICAL CONSTRAINT: Each argument MUST be under 20 words (bullet-point style).
          Keep evidence and counter-attacks extremely brief.`;
          schema = { type: Type.OBJECT, properties: { topic: { type: Type.STRING }, centralControversy: { type: Type.STRING }, proArguments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { claim: { type: Type.STRING }, evidence: { type: Type.STRING }, counterAttack: { type: Type.STRING } } } }, conArguments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { claim: { type: Type.STRING }, evidence: { type: Type.STRING }, counterAttack: { type: Type.STRING } } } } } };
          selectedModel = MODEL_TEXT;
          break;
        case 'strategicRoadmap':
          prompt = `Create a high-level Strategic Roadmap based on the source material.
          1. Define 3 distinct Phases (e.g., Immediate, Mid-term, Long-term).
          2. For each phase, list 2-3 key Milestones and 1-2 major Risks.
          3. Provide a clear Goal for each phase.
          CRITICAL: Keep descriptions concise (max 15 words per item) to ensure JSON validity. Use professional project management terminology.`;
          schema = { 
              type: Type.OBJECT, 
              properties: { 
                  title: { type: Type.STRING },
                  mission: { type: Type.STRING },
                  phases: { 
                      type: Type.ARRAY, 
                      items: { 
                          type: Type.OBJECT, 
                          properties: { 
                              phaseName: { type: Type.STRING }, 
                              timeline: { type: Type.STRING }, 
                              goal: { type: Type.STRING }, 
                              milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
                              risks: { type: Type.ARRAY, items: { type: Type.STRING } } 
                          } 
                      } 
                  } 
              } 
          };
          selectedModel = MODEL_REASONING;
          break;
      }

      const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
        model: selectedModel,
        contents: `${prompt}\n\nCONTEXT:\n${context}`,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: schema,
            maxOutputTokens: 16384 // Increased limit to prevent truncation on large documents
        }
      }));

      const rawText = response.text || "{}";
      const cleanText = cleanJsonString(rawText);
      
      let content;
      try {
          content = JSON.parse(cleanText);
      } catch (e) {
          console.warn("JSON Parse Failed on first attempt. Text length:", cleanText.length);
          let repaired = cleanText.trim();
          if (!repaired.endsWith('"') && !repaired.endsWith('}') && !repaired.endsWith(']')) {
              repaired += '"'; 
          }
          const openBraces = (repaired.match(/{/g) || []).length;
          const closeBraces = (repaired.match(/}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;
          if (openBrackets > closeBrackets) repaired += ']';
          if (openBraces > closeBraces) repaired += '}';
          if (openBraces > closeBraces + 1) repaired += '}'; 

          try {
             content = JSON.parse(repaired);
          } catch (e2) {
             if (repaired.endsWith('}')) {
                 try { content = JSON.parse(repaired); } catch(e3) {}
             }
          }
          if (!content) throw new Error("Generated content was truncated. Please try reducing source material or generating smaller artifacts.");
      }

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
    // Truncate context to ~80k chars to prevent massive payloads that cause XHR errors
    const context = formatContext(sources).substring(0, 80000);
    
    let durationInstruction = "roughly 8-10 minutes";
    if (length === 'Short') durationInstruction = "about 3-5 minutes";
    if (length === 'Long') durationInstruction = "about 12-15 minutes";

    try {
        if (onProgress) onProgress(`Synthesizing ${style} Script...`);

        // CONSTRUCT STYLE PROMPT
        let styleInstruction = "";
        
        if (style === 'Heated Debate') {
            styleInstruction = `
            STYLE: HEATED DEBATE. 
            - Characters should actively DISAGREE on the interpretation of facts.
            - Joe is skeptical/cynical. Jane is optimistic/visionary.
            - Interruptions are frequent ("Wait, hold on--").
            - The tone is intense but intellectual.
            `;
        } else if (style === 'News Brief') {
            styleInstruction = `
            STYLE: NEWS BRIEF / NPR STYLE.
            - Tone: Professional, authoritative, journalistic.
            - Structure: Headline -> Analysis -> Expert Opinion -> Conclusion.
            - Use clear segues ("Turning now to...", "In other developments...").
            - Less banter, more reporting.
            `;
        } else if (style === 'Study Guide') {
            const intent = learningIntent || 'Understand Basics';
            let specificGuidance = "";
            if (intent === 'Exam Prep') specificGuidance = "Focus on high-yield facts, definitions, mnemonic devices, and potential multiple-choice questions. Test the listener periodically.";
            if (intent === 'Apply') specificGuidance = "Focus on practical application, case studies, real-world scenarios, and how to use this knowledge in a job or project.";
            if (intent === 'Teach') specificGuidance = "Simulate teaching a total novice (Feynman Technique). Use extreme simplification, analogies, and verify understanding constantly.";
            if (intent === 'Understand Basics') specificGuidance = "Focus on mental models, the 'big picture', and connecting fundamental concepts.";

            styleInstruction = `
            STYLE: STUDY GUIDE / EDUCATIONAL TUTORIAL.
            - **LEARNING INTENT:** ${intent}
            - **GUIDANCE:** ${specificGuidance}
            - **TEACHING METHOD:** Use the Feynman Technique (explain simply) and Socratic Method (ask questions).
            - **STRUCTURE:**
              1. **Hook:** State clearly what will be learned.
              2. **Core Concepts:** Break down complex topics using analogies.
              3. **Stop & Check:** Joe should occasionally ask, "Wait, so you mean [rephrase in simple terms]?" to clarify for the listener.
              4. **Recap:** End each segment with a 1-sentence takeaway.
            - **TONE:** Encouraging, clear, paced for taking notes.
            `;
        } else {
            // Default Deep Dive / Casual
            styleInstruction = `
            STYLE: ${style}.
            - Natural conversation.
            - Good mix of banter and information.
            `;
        }

        const userPrompt = `Create a ${style} podcast script. Length: ${durationInstruction}. SOURCE MATERIAL: ${context}`;
        
        const systemInstruction = `
        You are the scriptwriter for "Nebula Mind", a top-tier podcast known for its unscripted, raw, and highly engaging feel.
        
        **YOUR HOSTS:**
        
        1.  **JOE (The Everyman/Skeptic/Host A):** 
            *   **Voice:** Deep, raspy, grounded. 
            *   **Personality:** Cynical but curious. He hates jargon. He loves analogies (even bad ones). He interrupts when things get too abstract.
            *   **Role:** He represents the listener. He asks the "dumb" questions that everyone is thinking.
        
        2.  **JANE (The Futurist/Analyst/Host B):**
            *   **Voice:** Sharp, fast-paced, articulate.
            *   **Personality:** High-energy, connects disparate dots instantly. She gets frustrated when people don't see the "big picture."
            *   **Role:** The subject matter expert. She explains the complex ideas.
        
        **SPECIFIC STYLE INSTRUCTIONS:**
        ${styleInstruction}
        
        **GENERAL VIBE (Unless overridden by style):**
        *   **Hyper-Realistic:** This must NOT sound like a read script. It needs stammering, rephrasing mid-sentence, and genuine reactions.
        *   **No robotic transitions:** Never say "Let's move on to..." or "In conclusion." Just segue naturally or abruptly change the subject like real people do.
        
        **FORMATTING FOR AUDIO:**
        *   Use "--" for interruptions (e.g., "I think we need to--" "No, hold on.").
        *   Use "[LAUGH]", "[SIGH]", "[PAUSE]" to direct the TTS emotional delivery.
        *   Use "..." for trailing off or thinking.
        
        **CONTENT SOURCE:**
        The user has provided source material. Your job is to Synthesize it, not summarize it. Do not list facts. *Discuss* the implications of the facts.
        
        Script starts immediately. No intro music cues in text.
        `;

        const scriptResponse = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_SCRIPT,
            contents: userPrompt,
            config: { 
                systemInstruction: systemInstruction, 
                maxOutputTokens: 8192,
                temperature: 0.9
            }
        }));
        
        let scriptText = scriptResponse.text || "";
        let podcastTitle = `${style} Podcast`;
        let podcastTopic = "Research Overview";

        if (scriptText.includes("TITLE:")) {
             const lines = scriptText.split('\n');
             const titleLine = lines.find(l => l.toUpperCase().startsWith("TITLE:"));
             if (titleLine) {
                 podcastTitle = titleLine.replace(/^TITLE:\s*/i, '').trim();
                 scriptText = scriptText.replace(titleLine, '').trim();
             }
        }
        
        scriptText = scriptText.replace("SCRIPT_START", "").trim();

        if (onProgress) onProgress("Designing Cover Art...");
        const imagePrompt = `Podcast cover art for "${podcastTitle}". Style: High-end 3D abstract digital art, 8k resolution, ${style} vibes.`;
        const imgResp = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ model: MODEL_IMAGE, contents: { parts: [{ text: imagePrompt }] } }));
        let coverUrl = null;
        if (imgResp.candidates?.[0]?.content?.parts) {
            for (const part of imgResp.candidates[0].content.parts) { if (part.inlineData) { coverUrl = `data:image/png;base64,${part.inlineData.data}`; break; } }
        }

        if (onProgress) onProgress("Recording Audio Voices...");
        // Clean script for TTS and reduce length to ensure stability
        const safeScript = scriptText.replace(/\[.*?\]/g, "").substring(0, 25000); 
        
        const ttsResponse = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: MODEL_TTS,
            contents: [{ parts: [{ text: safeScript }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { multiSpeakerVoiceConfig: { speakerVoiceConfigs: [{ speaker: 'Joe', voiceConfig: { prebuiltVoiceConfig: { voiceName: voices.joe } } }, { speaker: 'Jane', voiceConfig: { prebuiltVoiceConfig: { voiceName: voices.jane } } }] } }
            }
        }));
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
