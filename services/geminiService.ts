
import { GoogleGenAI, Type, Modality } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const dictionaryService = {
  async getDefinition(query: string, nativeLang: string, targetLang: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User is searching for "${query}" from ${targetLang} to ${nativeLang}. Provide a detailed explanation.`,
      config: {
        systemInstruction: `You are a helpful, casual, and fun AI dictionary. 
        Return a JSON object with:
        - nativeExplanation: A natural language explanation in ${nativeLang}.
        - examples: Array of 2 objects { original: string (in ${targetLang}), translation: string (in ${nativeLang}) }.
        - casualGuide: A short, concise, and fun (friend-like) usage guide covering culture, tone, and similar words in ${nativeLang}.
        Avoid textbook style. Be direct and punchy.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
          required: ["nativeExplanation", "examples", "casualGuide"]
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
        parts: [{ text: `A clean, vibrant, 3D style concept illustration representing the word or phrase "${query}" in the context of ${targetLang} language learning. Simple background, colorful and engaging.` }]
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
      contents: `Create a short, fun, and engaging story using these words: ${words.join(', ')}. Target language is ${targetLang}, explanation/translations in ${nativeLang}.`,
      config: {
        systemInstruction: "You are a creative writer. Write a very short story (max 150 words) that naturally uses the provided words. The story should be in the target language but provide translations for the keywords in parentheses.",
      }
    });
    return response.text;
  }
};

// Audio Utilities
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
