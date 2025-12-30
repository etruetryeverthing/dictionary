
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { LANGUAGES } from './constants';
import { Language, DictionaryEntry, NotebookItem, ChatMessage } from './types';
import { dictionaryService } from './services/geminiService';
import AudioButton from './components/AudioButton';
import Flashcards from './components/Flashcards';

const App: React.FC = () => {
  // Setup State
  const [nativeLang, setNativeLang] = useState<string>(() => localStorage.getItem('nativeLang') || 'en');
  const [targetLang, setTargetLang] = useState<string>(() => localStorage.getItem('targetLang') || 'ja');
  const [isSetupDone, setIsSetupDone] = useState<boolean>(() => !!localStorage.getItem('isSetupDone'));

  // Main UI State
  const [view, setView] = useState<'search' | 'notebook' | 'flashcards' | 'story'>('search');
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<DictionaryEntry | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Notebook State
  const [notebook, setNotebook] = useState<NotebookItem[]>(() => {
    const saved = localStorage.getItem('notebook');
    return saved ? JSON.parse(saved) : [];
  });

  // Story State
  const [story, setStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  useEffect(() => {
    localStorage.setItem('nativeLang', nativeLang);
    localStorage.setItem('targetLang', targetLang);
    localStorage.setItem('isSetupDone', isSetupDone ? 'true' : '');
  }, [nativeLang, targetLang, isSetupDone]);

  useEffect(() => {
    localStorage.setItem('notebook', JSON.stringify(notebook));
  }, [notebook]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setResult(null);
    setChatMessages([]);
    
    try {
      const definition = await dictionaryService.getDefinition(query, nativeLang, targetLang);
      
      const entry: DictionaryEntry = {
        id: Date.now().toString(),
        query,
        ...definition,
        targetLang,
        nativeLang
      };
      
      setResult(entry);
      setIsSearching(false);

      dictionaryService.generateConceptImage(entry.targetWord, targetLang).then(imageUrl => {
        if (imageUrl) {
          setResult(prev => prev ? { ...prev, imageUrl } : null);
        }
      });

    } catch (err) {
      console.error("Search error", err);
      setIsSearching(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !result) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          systemInstruction: `You are chatting with a student who just learned the word "${result.targetWord}". 
          The target language is ${targetLang}. 
          Keep your tone friendly, helpful, and concise. 
          The user's native language is ${nativeLang}, so explain concepts in that language if needed.`
        }
      });
      const response = await chat.sendMessage({ message: chatInput });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (err) {
      console.error("Chat error", err);
    }
  };

  const toggleSave = () => {
    if (!result) return;
    const isSaved = notebook.find(item => item.targetWord === result.targetWord);
    if (isSaved) {
      setNotebook(prev => prev.filter(item => item.targetWord !== result.targetWord));
    } else {
      setNotebook(prev => [{ ...result, savedAt: Date.now() }, ...prev]);
    }
  };

  const swapLanguages = () => {
    const temp = nativeLang;
    setNativeLang(targetLang);
    setTargetLang(temp);
  };

  const generateStory = async () => {
    if (notebook.length < 2) return;
    setIsGeneratingStory(true);
    setView('story');
    try {
      const words = notebook.map(item => item.targetWord);
      const generated = await dictionaryService.generateStory(words, nativeLang, targetLang);
      setStory(generated || "Could not generate story.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  if (!isSetupDone) {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6 items-center justify-center">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl font-bubble font-bold text-blue-500 mb-2">LingoVibe</h1>
          <p className="text-slate-400 mb-12">Your colorful AI language companion</p>
          
          <div className="flex flex-col gap-2 text-left relative">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">My Native Language</label>
              <select 
                value={nativeLang}
                onChange={(e) => setNativeLang(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all text-black font-semibold"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.nativeName}</option>)}
              </select>
            </div>
            
            <div className="flex justify-center -my-3 z-10">
              <button 
                onClick={swapLanguages}
                className="p-3 bg-white border-2 border-slate-100 rounded-full shadow-md text-blue-500 hover:bg-blue-50 hover:border-blue-200 transition-all transform active:scale-90"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Target Language</label>
              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all text-black font-semibold"
              >
                {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.nativeName}</option>)}
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSetupDone(true)}
            className="w-full mt-12 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg transform transition active:scale-95"
          >
            Start Learning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-50 relative">
      
      {/* Search Header */}
      {view === 'search' && (
        <header className="p-4 bg-white sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="font-bubble text-2xl font-bold text-blue-500">LingoVibe</h1>
            <div className="ml-auto flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
              <span>{nativeLang}</span>
              <button onClick={swapLanguages} className="p-1 hover:text-blue-500 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M8 7l4-4m0 0l4 4m-4-4v18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              </button>
              <span>{targetLang}</span>
            </div>
          </div>
          <form onSubmit={handleSearch} className="relative">
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search word or phrase..."
              className="w-full p-4 pr-12 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black font-medium"
            />
            <button 
              type="submit"
              disabled={isSearching}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-500 disabled:text-slate-300"
            >
              {isSearching ? (
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </form>
        </header>
      )}

      {/* Results View */}
      {view === 'search' && result && (
        <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          
          {/* Main Card: Optimized for visual hierarchy */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1 pr-4">
                {/* 1. Target Language word on TOP - Highlighted and Bold */}
                <h2 className="text-4xl font-bubble font-extrabold text-blue-600 break-words mb-1">
                  {result.targetWord}
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Target Language</p>
                
                {/* 2. Native Language explanation BELOW - Smaller font */}
                <div className="p-3 bg-slate-50 rounded-2xl border-l-4 border-slate-200">
                  <p className="text-base text-black leading-relaxed font-semibold">
                    {result.nativeExplanation}
                  </p>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tighter mt-1">Native Explanation</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                {/* Audio plays target language */}
                <AudioButton text={result.targetWord} size="lg" className="shadow-lg" />
                <button 
                  onClick={toggleSave}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-md ${notebook.some(item => item.targetWord === result.targetWord) ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-400'}`}
                >
                  <svg className="w-6 h-6" fill={notebook.some(item => item.targetWord === result.targetWord) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            </div>

            {result.imageUrl ? (
              <div className="rounded-2xl overflow-hidden shadow-inner bg-slate-50 min-h-[200px] flex items-center justify-center border border-slate-50">
                <img src={result.imageUrl} alt="Concept Illustration" className="w-full object-cover max-h-72" />
              </div>
            ) : (
              <div className="rounded-2xl h-48 bg-slate-50 flex flex-col items-center justify-center animate-pulse text-slate-300">
                 <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
                 <span className="text-xs uppercase font-bold tracking-widest">Visualizing...</span>
              </div>
            )}
          </div>

          {/* Examples */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pl-2">Contextual Examples</h3>
            <div className="space-y-4">
              {result.examples.map((ex, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-blue-400 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-black font-bold mb-1">{ex.original}</p>
                    <p className="text-slate-500 text-sm italic">{ex.translation}</p>
                  </div>
                  <AudioButton text={ex.original} size="sm" className="bg-blue-100 text-blue-500" />
                </div>
              ))}
            </div>
          </section>

          {/* Casual Guide */}
          <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-6 relative overflow-hidden">
            <h3 className="text-amber-600 font-bold mb-2 flex items-center gap-2">
              <span className="text-xl">💡</span> Cultural Context
            </h3>
            <p className="text-amber-900 leading-snug font-medium text-sm">
              {result.casualGuide}
            </p>
          </div>

          {/* Chat Interface */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-black mb-4 px-2">AI Tutoring</h3>
            <div ref={chatScrollRef} className="max-h-60 overflow-y-auto space-y-4 mb-4 p-2 custom-scrollbar">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-slate-100 text-black rounded-tl-none font-medium'}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="relative">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a question..."
                className="w-full p-3 bg-slate-50 rounded-xl pr-12 focus:outline-none text-black font-medium"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </main>
      )}

      {/* Notebook View */}
      {view === 'notebook' && (
        <main className="flex-1 overflow-y-auto p-4 pb-24">
          <header className="mb-6">
            <h2 className="text-3xl font-bubble font-bold text-black">My Notebook</h2>
            <p className="text-slate-400">{notebook.length} words collected</p>
          </header>

          {notebook.length === 0 ? (
            <div className="text-center py-20 opacity-50">
              <svg className="w-20 h-20 mx-auto text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p>Your notebook is empty.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button onClick={() => setView('flashcards')} className="bg-blue-500 p-4 rounded-3xl text-white font-bold flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                  <span className="text-2xl">⚡</span>Learning Mode
                </button>
                <button onClick={generateStory} className="bg-emerald-500 p-4 rounded-3xl text-white font-bold flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                  <span className="text-2xl">📖</span>Story Mode
                </button>
              </div>

              <div className="space-y-3">
                {notebook.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm group active:bg-slate-50 transition-colors"
                    onClick={() => {
                      setResult(item);
                      setView('search');
                    }}
                  >
                    {item.imageUrl && (
                      <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
                    )}
                    <div className="flex-1">
                      <p className="font-bold text-black">{item.targetWord}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[150px]">{item.nativeExplanation}</p>
                    </div>
                    <AudioButton text={item.targetWord} size="sm" className="opacity-40 group-hover:opacity-100" />
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      )}

      {/* Story & Flashcard Overlays */}
      {view === 'story' && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col p-6 overflow-y-auto">
          <header className="flex items-center justify-between mb-8">
             <h2 className="text-3xl font-bubble font-bold text-emerald-500">Magic Story</h2>
             <button onClick={() => setView('notebook')} className="p-2 bg-white rounded-full">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path d="M6 18L18 6M6 6l12 12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
               </svg>
             </button>
          </header>
          {isGeneratingStory ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="font-medium text-slate-500">Weaving your words...</p>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-[40px] shadow-xl border-t-8 border-emerald-400">
              <p className="text-lg leading-relaxed text-black font-medium whitespace-pre-wrap">{story}</p>
            </div>
          )}
        </div>
      )}

      {view === 'flashcards' && <Flashcards items={notebook} onClose={() => setView('notebook')} />}

      {/* Navigation Bar */}
      {view !== 'flashcards' && view !== 'story' && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-100 h-20 flex items-center justify-around px-8 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <button onClick={() => setView('search')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'search' ? 'text-blue-500' : 'text-slate-400'}`}>
            <svg className="w-6 h-6" fill={view === 'search' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Discover</span>
          </button>
          <button onClick={() => setView('notebook')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'notebook' ? 'text-blue-500' : 'text-slate-400'}`}>
            <svg className="w-6 h-6" fill={view === 'notebook' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Notebook</span>
          </button>
          <button onClick={() => setIsSetupDone(false)} className="flex flex-col items-center gap-1 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
          </button>
        </nav>
      )}

      {/* Loading Overlay */}
      {isSearching && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-ping opacity-25"></div>
            <div className="absolute inset-2 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-bubble text-2xl font-bold text-blue-500">?</div>
          </div>
          <p className="font-bubble text-xl font-bold text-blue-500 animate-pulse">Summoning Knowledge...</p>
        </div>
      )}
    </div>
  );
};

export default App;
