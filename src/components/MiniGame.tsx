import React, { useState, useEffect } from 'react';
import { Rocket, Brain, Star, Wand, GraduationCap, Lightbulb, Trophy, Target } from 'lucide-react';

const ICONS = [
  { id: '1', component: Rocket, color: 'text-red-500', name: 'Rocket' },
  { id: '2', component: Brain, color: 'text-blue-500', name: 'Brain' },
  { id: '3', component: Star, color: 'text-amber-500', name: 'Star' },
  { id: '4', component: Wand, color: 'text-purple-500', name: 'Wand' },
  { id: '5', component: GraduationCap, color: 'text-green-500', name: 'Cap' },
  { id: '6', component: Lightbulb, color: 'text-yellow-500', name: 'Bulb' },
];

// Duplicate to create pairs, but only use 6 pairs (12 cards) for a good modal size
const PAIRS = [...ICONS, ...ICONS];

export default function MiniGame() {
  const [cards, setCards] = useState<any[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [moves, setMoves] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(false);

  // Initialize game
  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const shuffled = [...PAIRS].sort(() => Math.random() - 0.5).map((item, index) => ({
      ...item,
      uid: index,
      isFlipped: false,
      isMatched: false
    }));
    setCards(shuffled);
    setFlippedIndices([]);
    setMatchedPairs(0);
    setMoves(0);
    setIsWon(false);
  };

  const handleCardClick = (index: number) => {
    // Prevent clicking if two cards are already flipped, or if clicking a matched/flipped card
    if (flippedIndices.length === 2) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const [firstIndex, secondIndex] = newFlipped;
      
      if (newCards[firstIndex].id === newCards[secondIndex].id) {
        // Match!
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstIndex].isMatched = true;
          matchedCards[secondIndex].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setMatchedPairs(prev => prev + 1);
          if (matchedPairs + 1 === PAIRS.length / 2) {
            setIsWon(true);
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIndex].isFlipped = false;
          resetCards[secondIndex].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex justify-between items-center w-full mb-3 px-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
          Memory Game
        </div>
        {!isWon && (
           <div className="text-xs font-semibold text-slate-400">
             Sambil Menunggu AI... (Moves: {moves})
           </div>
        )}
      </div>

      {isWon ? (
        <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl border border-green-100 w-full animate-in fade-in zoom-in duration-300">
          <Trophy className="w-16 h-16 text-amber-500 mb-3 animate-bounce" />
          <h3 className="text-xl font-bold text-green-700 mb-1">Hebat!</h3>
          <p className="text-green-600 font-medium mb-4 text-sm">Menyelesaikan dalam {moves} langkah.</p>
          <button 
            onClick={initializeGame}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors shadow-sm"
          >
            Main Lagi
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-[320px] mx-auto auto-rows-[60px] sm:auto-rows-[70px]">
          {cards.map((card, index) => {
            const Icon = card.component;
            const isOpen = card.isFlipped || card.isMatched;
            
            return (
              <button
                key={card.uid}
                onClick={() => handleCardClick(index)}
                disabled={isOpen}
                style={{ perspective: '1000px' }}
                className={`col-span-1 border-none bg-transparent p-0 m-0 w-full h-full cursor-pointer group rounded-xl`}
              >
                <div 
                  className={`relative w-full h-full transition-transform duration-500 rounded-xl shadow-sm ${card.isMatched ? 'opacity-60 saturate-50' : 'opacity-100'} ${isOpen ? 'group-hover:scale-100' : 'group-hover:scale-105 group-hover:shadow-md'}`}
                  style={{ transformStyle: 'preserve-3d', transform: isOpen ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                  {/* Back of Card (visible when closed) */}
                  <div 
                     className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#4A8DF4] to-[#3b7ae0] rounded-xl flex items-center justify-center border border-blue-400/50 shadow-inner"
                     style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Target className="w-4 h-4 text-white/90" />
                    </div>
                  </div>

                  {/* Front of Card (visible when flipped) */}
                  <div 
                     className="absolute inset-0 w-full h-full bg-white border border-slate-200 rounded-xl flex items-center justify-center"
                     style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                     <Icon className={`w-8 h-8 ${card.color} drop-shadow-sm ${card.isMatched ? 'animate-pulse' : ''}`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
