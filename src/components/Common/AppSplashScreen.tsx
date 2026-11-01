import React, { useEffect, useState } from 'react';

export const AppSplashScreen: React.FC = () => {
  const [phase, setPhase] = useState<'entering' | 'exiting' | 'hidden'>('entering');

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setPhase('exiting');
    }, 1650);

    const hideTimer = window.setTimeout(() => {
      setPhase('hidden');
    }, 2100);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === 'hidden') return null;

  const handleSkip = () => {
    if (phase === 'entering') {
      setPhase('exiting');
      window.setTimeout(() => {
        setPhase('hidden');
      }, 320);
    }
  };

  return (
    <div
      onClick={handleSkip}
      role="status"
      aria-label="جاري فتح تطبيق MedFur"
      className={`dark-surface-preserve fixed inset-0 z-[100] flex flex-col items-center justify-center select-none overflow-hidden transition-all duration-500 ease-out cursor-pointer ${
        phase === 'exiting'
          ? 'opacity-0 scale-105 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 42%, #073B2E 0%, #04221A 52%, #02120E 100%)',
      }}
    >
      {/* Subtle Ambient Emerald Glow Rings */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-emerald-500/15 blur-3xl animate-medfur-ambient"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-emerald-400/10 scale-110"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-80 h-80 sm:w-[26rem] sm:h-[26rem] rounded-full border border-emerald-500/5"
      />

      {/* Main Centered MF Graduation Cap Logo + Brand Wordmark */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Official MF Graduation Cap Emblem Container */}
        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] bg-[#052E24] border border-emerald-400/25 shadow-2xl flex items-center justify-center p-3.5 sm:p-4 animate-medfur-cap">
          {/* Inner subtle rim */}
          <div className="pointer-events-none absolute inset-1.5 rounded-[1.6rem] border border-emerald-300/10" />

          {/* Crisp Vector SVG of the MF Graduation Cap Symbol */}
          <svg
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <defs>
              <linearGradient
                id="splashCapEmerald"
                x1="60"
                y1="48"
                x2="460"
                y2="475"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#10E596" />
                <stop offset="50%" stopColor="#00B371" />
                <stop offset="100%" stopColor="#008F58" />
              </linearGradient>
            </defs>

            {/* Isometric Graduation Cap formed by M & F Monogram + Right Tassel */}
            <path
              d="M250 48 L26 205 L60 231 L250 97 L283 121 L151 215 L235 276 L354 191 L378 209 L235 312 L106 218 L73 242 L250 371 L433 240 L433 380 L477 380 L477 205 L250 48 Z"
              fill="url(#splashCapEmerald)"
              stroke="#34D399"
              strokeWidth="6"
              strokeLinejoin="round"
              className="animate-medfur-stroke"
            />

            {/* Inner F Crossbar */}
            <path
              d="M316 145 L197 230 L228 253 L347 168 L316 145 Z"
              fill="url(#splashCapEmerald)"
              stroke="#34D399"
              strokeWidth="5"
              strokeLinejoin="round"
              className="animate-medfur-stroke"
            />

            {/* Graduation Cap Skull Base Underneath */}
            <path
              d="M82 293 L82 387 L237 475 L391 387 L391 312 L237 401 L82 293 Z"
              fill="url(#splashCapEmerald)"
              stroke="#34D399"
              strokeWidth="6"
              strokeLinejoin="round"
              className="animate-medfur-stroke"
            />
          </svg>
        </div>

        {/* MedFur Brand Title */}
        <div className="mt-6 text-center animate-medfur-wordmark">
          <h1
            dir="ltr"
            className="text-3xl sm:text-4xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300"
          >
            MedFur
          </h1>
        </div>

        {/* Sleek Animated Progress Bar */}
        <div className="mt-6 w-36 sm:w-44 h-1 rounded-full bg-emerald-950/90 border border-emerald-500/20 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-l from-emerald-400 via-teal-300 to-sky-400 animate-medfur-progress" />
        </div>
      </div>
    </div>
  );
};
