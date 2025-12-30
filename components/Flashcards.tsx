
import React, { useState } from 'react';
import { NotebookItem } from '../types';
import AudioButton from './AudioButton';

interface FlashcardsProps {
  items: NotebookItem[];
  onClose: () => void;
}

const Flashcards: React.FC<FlashcardsProps> = ({ items, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">No words saved yet!</h2>
        <p className="text-gray-500 mb-6">Save some words to your notebook to start learning.</p>
        <button onClick={onClose} className="px-6 py-3 bg-blue-500 text-white rounded-xl">Go Back</button>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 200);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col p-4">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="font-bubble text-lg font-bold text-blue-500">
          Card {currentIndex + 1} of {items.length}
        </span>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div 
          className="relative w-full max-w-sm aspect-[3/4] perspective-1000 cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`relative w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front Side */}
            <div className="absolute inset-0 bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center backface-hidden border-4 border-blue-100">
              {currentItem.imageUrl && (
                <img src={currentItem.imageUrl} alt="Concept" className="w-48 h-48 object-cover rounded-2xl mb-8 shadow-inner" />
              )}
              <h2 className="text-4xl font-bubble font-bold text-center text-slate-800 break-words mb-4">
                {currentItem.query}
              </h2>
              <p className="text-gray-400 font-medium">Click to flip</p>
            </div>

            {/* Back Side */}
            <div className="absolute inset-0 bg-white rounded-3xl shadow-xl p-8 flex flex-col backface-hidden rotate-y-180 border-4 border-amber-100 overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-slate-800">{currentItem.query}</h3>
                <AudioButton text={currentItem.query} size="sm" />
              </div>
              
              <div className="space-y-6">
                <section>
                  <label className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-2">Meaning</label>
                  <p className="text-slate-700 leading-relaxed text-lg">{currentItem.nativeExplanation}</p>
                </section>

                <section>
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-2">Examples</label>
                  <div className="space-y-3">
                    {currentItem.examples.map((ex, i) => (
                      <div key={i} className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-slate-800 font-medium mb-1">{ex.original}</p>
                        <p className="text-slate-500 text-sm italic">{ex.translation}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

          </div>
        </div>
      </div>

      <footer className="flex justify-center gap-4 mt-8 pb-4">
        <button onClick={handlePrev} className="p-4 bg-white rounded-2xl shadow-md active:scale-95 transition-transform">
          <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={handleNext} className="p-4 bg-blue-500 rounded-2xl shadow-md active:scale-95 transition-transform">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </footer>
    </div>
  );
};

export default Flashcards;
