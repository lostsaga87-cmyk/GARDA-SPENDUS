import React, { useState, useEffect } from 'react';
import { 
  Rocket, Brain, Star, Wand, GraduationCap, Lightbulb, 
  Trophy, Target, Atom, Microscope, Telescope, Compass, 
  BookOpen, Clock, Music, Palette 
} from 'lucide-react';

const ALL_ICONS = [
  { id: '1', component: Rocket, color: 'text-red-500' },
  { id: '2', component: Brain, color: 'text-blue-500' },
  { id: '3', component: Star, color: 'text-amber-500' },
  { id: '4', component: Wand, color: 'text-purple-500' },
  { id: '5', component: GraduationCap, color: 'text-green-500' },
  { id: '6', component: Lightbulb, color: 'text-yellow-500' },
  { id: '7', component: Atom, color: 'text-cyan-500' },
  { id: '8', component: Microscope, color: 'text-emerald-500' },
  { id: '9', component: Telescope, color: 'text-indigo-500' },
  { id: '10', component: Compass, color: 'text-orange-500' },
  { id: '11', component: BookOpen, color: 'text-pink-500' },
  { id: '12', component: Music, color: 'text-rose-500' },
];

const LEVEL_CONFIG = [
  { level: 1, pairs: 3, cols: 'grid-cols-3', cardSize: 'h-20 sm:h-24' },  // 6 cards
  { level: 2, pairs: 4, cols: 'grid-cols-4', cardSize: 'h-16 sm:h-20' },  // 8 cards
  { level: 3, pairs: 6, cols: 'grid-cols-4', cardSize: 'h-14 sm:h-16' },  // 12 cards
  { level: 4, pairs: 8, cols: 'grid-cols-4', cardSize: 'h-12 sm:h-14' },  // 16 cards
  { level: 5, pairs: 10, cols: 'grid-cols-5', cardSize: 'h-10 sm:h-12' }  // 20 cards
];

export default function MiniGame() {
  const [level, setLevel] = useState<number>(1);
  const [cards, setCards] = useState<any[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [moves, setMoves] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(false);

  // Initialize game
  useEffect(() => {
    initializeGame(level);
  }, []);

  const initializeGame = (targetLevel: number) => {
    const config = LEVEL_CONFIG[targetLevel - 1];
    
    // Select subset of icons based on required pairs
    const selectedIcons = [...ALL_ICONS].slice(0, config.pairs);
    const pairs = [...selectedIcons, ...selectedIcons];
    
    const shuffled = pairs.sort(() => Math.random() - 0.5).map((item, index) => ({
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
    setLevel(targetLevel);
  };

  const handleCardClick = (index: number) => {
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
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstIndex].isMatched = true;
          matchedCards[secondIndex].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setMatchedPairs(prev => prev + 1);
          
          const currentConfig = LEVEL_CONFIG[level - 1];
          if (matchedPairs + 1 === currentConfig.pairs) {
            setIsWon(true);
          }
        }, 500);
      } else {
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIndex].isFlipped = false;
          resetCards[secondIndex].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 800); // slightly faster hide to make it snappy
      }
    }
  };

  const activeConfig = LEVEL_CONFIG[level - 1];

  return (
    <div className="w-full flex flex-col items-center select-none bg-white p-4 rounded-xl">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 animate-pulse flex items-center justify-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          AI Sedang Bekerja...
        </h3>
        <p className="text-xs font-medium text-gray-500 mt-1 max-w-[280px]">
          Sambil menunggu AI membedah Modul/LKPD yang komprehensif, yuk selesaikan tes konsentrasi ini!
        </p>
      </div>

      <div className="flex justify-between items-center w-full mb-3 px-2">
        <div className="text-xs font-bold text-white bg-blue-500 shadow-sm px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-300" />
          Level {level}
        </div>
        {!isWon && (
           <div className="text-xs font-semibold text-slate-400">
             Moves: {moves}
           </div>
        )}
      </div>

      {isWon ? (
        <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl border border-green-100 w-full animate-in fade-in zoom-in duration-300 min-h-[200px]">
          <Trophy className="w-16 h-16 text-amber-500 mb-3 animate-bounce shadow-amber-200/50 drop-shadow-lg" />
          <h3 className="text-xl font-bold text-green-700 mb-1">Hebat! Level {level} Selesai</h3>
          <p className="text-green-600 font-medium mb-5 text-sm">Diselesaikan dalam {moves} langkah.</p>
          
          <div className="flex gap-2">
            {level < 5 ? (
              <button 
                onClick={() => initializeGame(level + 1)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Lanjut Level {level + 1}
              </button>
            ) : (
              <button 
                onClick={() => initializeGame(1)}
                className="px-5 py-2.5 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex gap-2 items-center"
              >
                <Target className="w-4 h-4" /> Main Ulang
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`grid ${activeConfig.cols} gap-2 sm:gap-2.5 w-full max-w-[340px] mx-auto`}>
          {cards.map((card, index) => {
            const Icon = card.component;
            const isOpen = card.isFlipped || card.isMatched;
            
            return (
              <button
                key={card.uid}
                onClick={() => handleCardClick(index)}
                disabled={isOpen}
                style={{ perspective: '1000px' }}
                className={`col-span-1 border-none bg-transparent p-0 m-0 w-full ${activeConfig.cardSize} cursor-pointer group rounded-xl`}
              >
                <div 
                  className={`relative w-full h-full transition-transform duration-500 rounded-xl shadow-sm ${card.isMatched ? 'opacity-50 saturate-0 scale-95' : 'opacity-100'} ${isOpen ? 'group-hover:scale-100' : 'group-hover:scale-105 group-hover:shadow-md'}`}
                  style={{ transformStyle: 'preserve-3d', transform: isOpen ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                >
                  {/* Back of Card */}
                  <div 
                     className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#4A8DF4] to-[#3b7ae0] rounded-xl flex items-center justify-center border border-blue-400/50 shadow-inner"
                     style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                  >
                    <div className="w-1/2 h-1/2 max-w-[28px] max-h-[28px] rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Target className="w-1/2 h-1/2 text-white/90" />
                    </div>
                  </div>

                  {/* Front of Card */}
                  <div 
                     className="absolute inset-0 w-full h-full bg-white border border-slate-200 rounded-xl flex items-center justify-center"
                     style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                     <Icon className={`w-1/2 h-1/2 min-w-[20px] min-h-[20px] ${card.color} drop-shadow-sm ${card.isMatched ? 'animate-pulse' : ''}`} />
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
