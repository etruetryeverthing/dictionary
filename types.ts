
export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface ExampleSentence {
  original: string;
  translation: string;
}

export interface DictionaryEntry {
  id: string;
  query: string;
  targetWord: string; // The translated/target language term
  nativeExplanation: string;
  examples: ExampleSentence[];
  casualGuide: string;
  imageUrl?: string;
  targetLang: string;
  nativeLang: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface NotebookItem extends DictionaryEntry {
  savedAt: number;
}
