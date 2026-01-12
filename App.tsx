
import React, { useState, useEffect } from 'react';
import Game from './components/Game';
import { GameStatus } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>('START');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [transitioningTo, setTransitioningTo] = useState<number | null>(null);
  const MAX_LEVELS = 3;

  useEffect(() => {
    const saved = localStorage.getItem('robo_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const handleStart = () => {
    setCurrentLevel(1);
    setStatus('PLAYING');
  };

  const handleNextLevel = (score: number) => {
    if (currentLevel < MAX_LEVELS) {
      setLastScore(score);
      setTransitioningTo(currentLevel + 1);
      
      // Delay to show the transition animation
      setTimeout(() => {
        setCurrentLevel(prev => prev + 1);
        setTransitioningTo(null);
      }, 2000);
    } else {
      handleGameOver(score, true);
    }
  };
  
  const handleGameOver = (score: number, win: boolean = false) => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('robo_highscore', score.toString());
    }
    setLastScore(score);
    setStatus(win ? 'WIN' : 'GAMEOVER');
  };

  return (
    <div className="relative w-full h-full bg-[#050508] text-white font-sans overflow-hidden select-none">
      {status === 'START' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
          <div className="relative group cursor-pointer" onClick={handleStart}>
            <div className="w-48 h-48 mb-8 relative bg-white rounded-[2rem] p-2 shadow-[0_0_50px_rgba(59,130,246,0.3)] transition-transform group-hover:scale-105 duration-300">
              <div className="absolute -top-4 -left-4 -right-4 h-12 bg-black rounded-t-full -z-10" />
              <div className="w-full h-full bg-[#121212] rounded-[1.5rem] flex flex-col items-center justify-center border-4 border-gray-200 overflow-hidden">
                <div className="text-[10px] font-black italic text-white mb-2 tracking-widest animate-pulse uppercase">ЗАГРУЗКА...</div>
                <div className="w-24 h-3 border border-white p-0.5">
                  <div className="h-full bg-white animate-[loading_2s_infinite]" style={{width: '60%'}} />
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-7xl font-black italic tracking-tighter mb-2 drop-shadow-2xl">
            ШУМИ <span className="text-blue-500">DASH</span>
          </h1>
          <p className="text-blue-400/60 font-black italic tracking-[0.3em] text-xs mb-16 uppercase">Цифровой протокол 2026</p>
          
          <button 
            onClick={handleStart}
            className="group relative px-20 py-6 bg-white text-black font-black italic text-2xl rounded-full overflow-hidden transition-all hover:scale-110 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          >
            <span className="relative z-10">ЗАПУСТИТЬ</span>
            <div className="absolute inset-0 bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
          
          <div className="mt-16 space-y-3 opacity-50 font-black italic text-[10px] uppercase tracking-widest">
            <p>РЕКОРД: {highScore}</p>
            <div className="flex items-center justify-center gap-4 animate-pulse">
              <span>Стрелки - Ходьба</span>
              <span className="w-1 h-1 bg-white rounded-full opacity-30" />
              <span>Пробел - Рывок</span>
            </div>
          </div>
        </div>
      )}

      {status === 'PLAYING' && (
        <>
          <Game 
            key={currentLevel} 
            level={currentLevel} 
            initialScore={currentLevel === 1 ? 0 : lastScore}
            onGameOver={(score) => handleGameOver(score)} 
            onWin={(score) => handleNextLevel(score)} 
          />
          
          {/* Level Transition Overlay */}
          {transitioningTo !== null && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black animate-in fade-in zoom-in duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-blue-600/20 animate-pulse" />
              <div className="relative">
                <h2 className="text-8xl font-black italic tracking-tighter text-white animate-bounce">
                  УРОВЕНЬ {transitioningTo}
                </h2>
                <div className="h-1 w-full bg-blue-500 mt-4 animate-[stretch_2s_ease-in-out]" />
                <p className="text-center font-black italic text-blue-400 mt-6 tracking-widest uppercase animate-pulse">
                  СИНХРОНИЗАЦИЯ ДАННЫХ...
                </p>
              </div>
              
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute h-px bg-white animate-[warp_0.5s_infinite]"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      width: `${Math.random() * 200 + 100}px`,
                      animationDelay: `${Math.random() * 0.5}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {status === 'GAMEOVER' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl animate-in zoom-in duration-300">
          <div className="text-red-500 font-black italic text-9xl mb-4 opacity-10 absolute rotate-12 select-none uppercase">СБОЙ</div>
          <h2 className="text-5xl font-black italic mb-8 tracking-tighter uppercase">СИСТЕМА ПОВРЕЖДЕНА</h2>
          <div className="text-center mb-16">
            <p className="text-gray-500 text-[10px] font-black italic uppercase tracking-[0.4em] mb-4">Рейтинг эффективности</p>
            <p className="text-8xl font-black italic text-white tracking-tighter">{lastScore}</p>
          </div>
          <button 
            onClick={handleStart}
            className="px-16 py-5 border-4 border-white rounded-full font-black italic text-xl hover:bg-white hover:text-black transition-all shadow-xl active:scale-95"
          >
            ПЕРЕЗАГРУЗКА
          </button>
        </div>
      )}

      {status === 'WIN' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 via-black to-black backdrop-blur-3xl animate-in fade-in duration-1000">
          <div className="text-yellow-400 font-black italic text-[15rem] mb-4 opacity-5 absolute -rotate-6 select-none uppercase">ГОТОВО</div>
          <h2 className="text-7xl font-black italic mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-yellow-400 tracking-tighter text-center px-4 leading-tight">
            ПОЛНАЯ <br/> СИНХРОНИЗАЦИЯ
          </h2>
          <p className="text-lg font-black italic text-blue-400 mb-16 uppercase tracking-[0.5em] opacity-80">Все системы в норме</p>
          <div className="text-center mb-20 relative">
            <p className="text-gray-500 text-[10px] font-black italic uppercase tracking-[0.4em] mb-4">Итоговая эффективность</p>
            <p className="text-9xl font-black italic text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] tracking-tighter">{lastScore}</p>
          </div>
          <button 
            onClick={handleStart}
            className="px-24 py-8 bg-yellow-400 text-black rounded-full font-black italic text-3xl hover:scale-110 active:scale-95 transition-all shadow-[0_20px_50px_rgba(234,179,8,0.4)]"
          >
            ИГРАТЬ СНОВА
          </button>
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { width: 0%; }
          50% { width: 80%; }
          100% { width: 100%; }
        }
        @keyframes stretch {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @keyframes warp {
          0% { transform: translateX(100vw); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(-200vw); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default App;
