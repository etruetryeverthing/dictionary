
import { GoogleGenAI, Type, Modality } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const dictionaryService = {
  async getDefinition(query: string, nativeLang: string, targetLang: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User is searching for "${query}" from ${targetLang} to ${nativeLang} (or vice versa). Provide a detailed dictionary entry.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: `You are a helpful AI dictionary. 
        Return a JSON object with:
        - targetWord: The main word or phrase in the ${targetLang} language that matches the user's intent.
        - nativeExplanation: A natural language explanation in ${nativeLang}.
        - examples: Array of 2 objects { original: string (in ${targetLang}), translation: string (in ${nativeLang}) }.
        - casualGuide: A short usage guide in ${nativeLang}.
        Focus on accuracy and clear distinction between languages.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetWord: { type: Type.STRING },
            nativeExplanation: { type: Type.STRING },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  translation: { type: Type.STRING }
                }
              }
            },
            casualGuide: { type: Type.STRING }
          },
          required: ["targetWord", "nativeExplanation", "examples", "casualGuide"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  async generateConceptImage(query: string, targetLang: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A clean, vibrant, 3D style concept illustration representing "${query}" in the context of ${targetLang} language. Simple white background, engaging.` }]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  },

  async generateTTS(text: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;
    return base64Audio;
  },

  async generateStory(words: string[], nativeLang: string, targetLang: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a short, fun story using: ${words.join(', ')}. Target: ${targetLang}, Explanations: ${nativeLang}.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        systemInstruction: "Write a 100-word story in the target language with translations in parentheses.",
      }
    });
    return response.text;
  }
};

export const audioUtils = {
  decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  },

  async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
};
