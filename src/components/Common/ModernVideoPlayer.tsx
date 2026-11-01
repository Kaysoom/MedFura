import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Gauge,
  Settings,
  Repeat,
  PictureInPicture2,
  Download,
  CheckCircle2,
  HardDriveDownload,
  Sparkles,
} from 'lucide-react';
import {
  formatPlayerTime,
  clampSeekTime,
} from '../../utils/downloadManagerLogic';
import {
  parseDurationToSeconds,
  DownloadProgressState,
} from '../../utils/fileHelpers';
import { InlineDownloadStatus } from './DownloadManager';

export interface ModernVideoPlayerProps {
  id: string;
  title: string;
  subtitle?: string;
  doctorName?: string;
  description?: string;
  videoUrl?: string | null;
  mimeType?: string;
  durationStr?: string;
  fileSize?: string;
  isOfflineCached: boolean;
  downloadProgress?: DownloadProgressState;
  onTriggerDownload: () => void;
  onSaveToDevice?: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITY_OPTIONS = ['1080p HD', '720p HD', '480p', 'تلقائي'];

export const ModernVideoPlayer: React.FC<ModernVideoPlayerProps> = ({
  id,
  title,
  subtitle,
  doctorName,
  description,
  videoUrl,
  mimeType,
  durationStr,
  fileSize,
  isOfflineCached,
  downloadProgress,
  onTriggerDownload,
  onSaveToDevice,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hideControlsTimerRef = useRef<number | null>(null);

  // Determine stream mode:
  // 1) 'native-video' if we have a real video file/blob/mp4 URL
  // 2) 'youtube' if it's a YouTube embed URL (with option to switch to interactive player)
  // 3) 'interactive-canvas' if it's a synthesized/archive lecture or has no direct mp4 stream
  const isYouTubeUrl = Boolean(
    videoUrl && /youtube\.com\/embed|youtu\.be/i.test(videoUrl)
  );
  const isRealVideoSource = Boolean(
    videoUrl &&
      !isYouTubeUrl &&
      (mimeType?.startsWith('video/') ||
        videoUrl.startsWith('blob:') ||
        videoUrl.startsWith('data:video') ||
        /\.(mp4|webm|ogg|mov)(\?|$)/i.test(videoUrl))
  );

  const [useInteractiveFallback, setUseInteractiveFallback] = useState(
    !isRealVideoSource && !isYouTubeUrl
  );

  useEffect(() => {
    setUseInteractiveFallback(!isRealVideoSource && !isYouTubeUrl);
  }, [isRealVideoSource, isYouTubeUrl, videoUrl]);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() =>
    Math.max(120, parseDurationToSeconds(durationStr) || 600)
  );
  const [bufferedPercent, setBufferedPercent] = useState(35);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState('1080p HD');
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeMenu, setActiveMenu] = useState<'none' | 'speed' | 'quality'>('none');
  const [seekRipple, setSeekRipple] = useState<'left' | 'right' | null>(null);
  const [hoverTime, setHoverTime] = useState<{ time: number; percent: number } | null>(null);

  // ResetControls auto-hide timer
  const revealControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        setShowControls(false);
        setActiveMenu('none');
      }, 3200);
    }
  }, [isPlaying]);

  useEffect(() => {
    revealControlsTemporarily();
    return () => {
      if (hideControlsTimerRef.current) {
        window.clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isPlaying, revealControlsTemporarily]);

  // Interactive Canvas Lecture Timeline Loop when playing without external MP4
  useEffect(() => {
    if (!useInteractiveFallback) return;
    const parsedDur = Math.max(90, parseDurationToSeconds(durationStr) || 600);
    setDuration(parsedDur);
    setBufferedPercent(100);
  }, [useInteractiveFallback, durationStr]);

  useEffect(() => {
    if (!useInteractiveFallback || !isPlaying) return;
    let lastTick = performance.now();
    let animId = 0;

    const step = (now: number) => {
      const dt = ((now - lastTick) / 1000) * playbackSpeed;
      lastTick = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= duration) {
          if (isLooping) return 0;
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [useInteractiveFallback, isPlaying, playbackSpeed, duration, isLooping]);

  // Render high-contrast Medical Lecture Slide Canvas when in interactive mode
  useEffect(() => {
    if (!useInteractiveFallback || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const progressRatio = duration > 0 ? currentTime / duration : 0;
    const slideIndex = Math.min(4, Math.floor(progressRatio * 5));

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#091122');
    grad.addColorStop(0.55, '#131F3A');
    grad.addColorStop(1, '#1E112A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle medical grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Animated ECG / Pulse wave across bottom third
    ctx.save();
    ctx.strokeStyle = isPlaying ? '#10B981' : '#F43F5E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const waveY = h * 0.76;
    const phase = currentTime * 4;
    for (let x = 60; x <= w - 60; x += 6) {
      const normX = (x - 60) / (w - 120);
      const pulse =
        Math.sin(normX * 18 - phase) * 14 +
        (Math.floor((normX * 10 - phase * 0.3) % 3) === 0
          ? Math.sin(normX * 60 - phase * 2) * 26
          : 0);
      const y = waveY + pulse;
      if (x === 60) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }, [
    useInteractiveFallback,
    currentTime,
    duration,
    isPlaying,
  ]);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (useInteractiveFallback) {
      setIsPlaying((prev) => {
        if (!prev && currentTime >= duration) {
          setCurrentTime(0);
        }
        return !prev;
      });
      return;
    }

    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().catch(() => {
        setUseInteractiveFallback(true);
        setIsPlaying(true);
      });
    } else {
      vid.pause();
    }
  }, [useInteractiveFallback, currentTime, duration]);

  // Seek by delta seconds (-10s / +10s)
  const seekByDelta = useCallback(
    (delta: number) => {
      setSeekRipple(delta < 0 ? 'left' : 'right');
      window.setTimeout(() => setSeekRipple(null), 550);

      if (useInteractiveFallback) {
        setCurrentTime((prev) => clampSeekTime(prev, delta, duration));
        return;
      }

      const vid = videoRef.current;
      if (!vid) return;
      const nextTime = clampSeekTime(
        vid.currentTime,
        delta,
        vid.duration || duration
      );
      vid.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [useInteractiveFallback, duration]
  );

  // Seek to exact time
  const handleSeekTo = (newTime: number) => {
    const clamped = clampSeekTime(newTime, 0, duration);
    setCurrentTime(clamped);
    if (!useInteractiveFallback && videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  // Volume & Mute
  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolume(clamped);
    setIsMuted(clamped === 0);
    if (videoRef.current) {
      videoRef.current.volume = clamped;
      videoRef.current.muted = clamped === 0;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  // Speed
  const handleSelectSpeed = (spd: number) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
    setActiveMenu('none');
  };

  // Picture-in-Picture
  const handleTogglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && 'requestPictureInPicture' in videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // ignore if PiP not supported on current source
    }
  };

  // Fullscreen
  const handleToggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekByDelta(10);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekByDelta(-10);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, seekByDelta]);

  const playedPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      dir="ltr"
      data-testid="modern-video-player"
      onMouseMove={revealControlsTemporarily}
      onTouchStart={revealControlsTemporarily}
      className="w-full flex flex-col bg-slate-950 select-none overflow-hidden"
    >
      {/* Top Bar inside Player for Switching YouTube vs Built-in Modern Player if YouTube link */}
      {isYouTubeUrl && (
        <div
          dir="rtl"
          className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 text-xs"
        >
          <span className="text-slate-300 font-bold truncate">
            وضع العرض: {useInteractiveFallback ? 'المشغل الحديث المدمج' : 'مشغل يوتيوب'}
          </span>
          <button
            type="button"
            onClick={() => setUseInteractiveFallback((p) => !p)}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
          >
            {useInteractiveFallback
              ? 'التبديل إلى تضمين يوتيوب'
              : 'التبديل إلى المشغل الحديث المدمج'}
          </button>
        </div>
      )}

      {/* Video Surface Container */}
      <div className="relative w-full aspect-video max-h-[68vh] bg-black flex items-center justify-center overflow-hidden group dark-surface-preserve">
        {isYouTubeUrl && !useInteractiveFallback ? (
          <iframe
            src={videoUrl!}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            {!useInteractiveFallback && videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                loop={isLooping}
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={(e) => {
                  const vid = e.currentTarget;
                  if (Number.isFinite(vid.duration) && vid.duration > 0) {
                    setDuration(vid.duration);
                  }
                }}
                onTimeUpdate={(e) => {
                  const vid = e.currentTarget;
                  setCurrentTime(vid.currentTime);
                  if (vid.buffered.length > 0 && vid.duration > 0) {
                    const bufEnd = vid.buffered.end(vid.buffered.length - 1);
                    setBufferedPercent(
                      Math.min(100, Math.round((bufEnd / vid.duration) * 100))
                    );
                  }
                }}
                onError={() => {
                  setUseInteractiveFallback(true);
                }}
                className="w-full h-full object-contain bg-black cursor-pointer"
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                onClick={togglePlay}
                className="w-full h-full object-contain bg-black cursor-pointer"
              />
            )}

            {/* Mobile Double-Tap Left (-10s) & Right (+10s) Touch Zones */}
            <div
              onDoubleClick={() => seekByDelta(-10)}
              className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer"
              title="انقر مرتين للرجوع 10 ثوانٍ"
            />
            <div
              onDoubleClick={() => seekByDelta(10)}
              className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer"
              title="انقر مرتين للتقديم 10 ثوانٍ"
            />

            {/* Visual Seek Ripple Feedback (-10s / +10s) */}
            {seekRipple === 'left' && (
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 px-4 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>-10s</span>
              </div>
            )}
            {seekRipple === 'right' && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 px-4 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 animate-in fade-in zoom-in-95">
                <span>+10s</span>
                <RotateCw className="w-4 h-4 text-emerald-400" />
              </div>
            )}

            {/* Center Play Button Overlay when Paused */}
            {!isPlaying && (
              <button
                type="button"
                onClick={togglePlay}
                aria-label="تشغيل الفيديو"
                className="absolute z-20 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600/95 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/20"
              >
                <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-white ml-1" />
              </button>
            )}

            {/* Speed & Quality Popover Menus */}
            {activeMenu === 'speed' && (
              <div
                dir="rtl"
                className="absolute bottom-16 right-4 z-30 w-44 rounded-2xl bg-black/90 backdrop-blur-md border border-white/20 p-2 text-white shadow-2xl space-y-1"
              >
                <div className="px-2.5 py-1 text-[11px] font-black text-slate-300 border-b border-white/10">
                  سرعة التشغيل
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1">
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => handleSelectSpeed(spd)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        playbackSpeed === spd
                          ? 'bg-rose-600 text-white'
                          : 'hover:bg-white/10 text-slate-200'
                      }`}
                    >
                      {spd === 1 ? '1x (عادي)' : `${spd}x`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeMenu === 'quality' && (
              <div
                dir="rtl"
                className="absolute bottom-16 right-14 z-30 w-40 rounded-2xl bg-black/90 backdrop-blur-md border border-white/20 p-2 text-white shadow-2xl space-y-1"
              >
                <div className="px-2.5 py-1 text-[11px] font-black text-slate-300 border-b border-white/10">
                  جودة العرض
                </div>
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuality(q);
                      setActiveMenu('none');
                    }}
                    className={`w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-between ${
                      quality === q
                        ? 'bg-emerald-600 text-white'
                        : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <span>{q}</span>
                    {quality === q && <Sparkles className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}

            {/* Modern Bottom Control Bar */}
            <div
              className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-8 pb-2.5 px-3 sm:px-5 transition-opacity duration-200 ${
                showControls || !isPlaying
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* 1. Interactive Timeline Seek Bar */}
              <div className="relative w-full py-2 group/scrub flex items-center">
                {hoverTime && (
                  <div
                    style={{ left: `${hoverTime.percent}%` }}
                    className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/20 text-[10px] font-mono font-bold text-white pointer-events-none shadow-md"
                  >
                    {formatPlayerTime(hoverTime.time)}
                  </div>
                )}

                <div
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(
                      0,
                      Math.min(1, (e.clientX - rect.left) / rect.width)
                    );
                    setHoverTime({
                      time: pct * duration,
                      percent: pct * 100,
                    });
                  }}
                  onMouseLeave={() => setHoverTime(null)}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = Math.max(
                      0,
                      Math.min(1, (e.clientX - rect.left) / rect.width)
                    );
                    handleSeekTo(pct * duration);
                  }}
                  className="relative w-full h-2 group-hover/scrub:h-2.5 bg-white/20 rounded-full cursor-pointer transition-all overflow-visible"
                >
                  {/* Buffered Bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                    style={{ width: `${bufferedPercent}%` }}
                  />

                  {/* Played Progress Bar */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500 to-emerald-400 rounded-full"
                    style={{ width: `${playedPercent}%` }}
                  />

                  {/* Scrubber Handle */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white shadow-lg border-2 border-rose-500 transition-transform group-hover/scrub:scale-125"
                    style={{ left: `${playedPercent}%` }}
                  />
                </div>
              </div>

              {/* 2. Control Buttons Row */}
              <div className="flex items-center justify-between gap-2 text-white mt-0.5">
                {/* Left Group: Play/Pause, -10s, +10s, Volume, Time */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                    className="p-2 rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-white" />
                    ) : (
                      <Play className="w-5 h-5 fill-white" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => seekByDelta(-10)}
                    aria-label="رجوع 10 ثوانٍ"
                    title="رجوع 10 ثوانٍ (سهم يسار)"
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5 text-[10px] font-bold"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden xs:inline">10</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => seekByDelta(10)}
                    aria-label="تقديم 10 ثوانٍ"
                    title="تقديم 10 ثوانٍ (سهم يمين)"
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5 text-[10px] font-bold"
                  >
                    <span className="hidden xs:inline">10</span>
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                      className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) =>
                        handleVolumeChange(parseFloat(e.target.value))
                      }
                      aria-label="مستوى الصوت"
                      className="hidden sm:block w-16 h-1 accent-emerald-400 bg-white/25 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Time Display */}
                  <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-200 tabular-nums whitespace-nowrap pl-1">
                    <span className="text-white">
                      {formatPlayerTime(currentTime)}
                    </span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span>{formatPlayerTime(duration)}</span>
                  </div>
                </div>

                {/* Right Group: Speed, Quality, Loop, PiP, Download, Fullscreen */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {/* Speed Toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMenu((m) => (m === 'speed' ? 'none' : 'speed'))
                    }
                    className={`px-2 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer flex items-center gap-1 ${
                      playbackSpeed !== 1
                        ? 'bg-rose-600 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200'
                    }`}
                    title="سرعة التشغيل"
                  >
                    <Gauge className="w-3.5 h-3.5 hidden sm:inline" />
                    <span>{playbackSpeed}x</span>
                  </button>

                  {/* Quality Toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMenu((m) =>
                        m === 'quality' ? 'none' : 'quality'
                      )
                    }
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] sm:text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="جودة الفيديو"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{quality}</span>
                  </button>

                  {/* Loop Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsLooping((l) => !l)}
                    aria-label="تكرار الفيديو"
                    title="تكرار تلقائي"
                    className={`p-1.5 sm:p-2 rounded-xl transition-colors cursor-pointer hidden sm:flex ${
                      isLooping
                        ? 'bg-emerald-500/25 text-emerald-300'
                        : 'hover:bg-white/15 text-slate-300'
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>

                  {/* Picture in Picture */}
                  {!useInteractiveFallback && (
                    <button
                      type="button"
                      onClick={handleTogglePiP}
                      aria-label="صورة داخل صورة"
                      title="تشغيل في نافذة عائمة (PiP)"
                      className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-slate-200 transition-colors cursor-pointer hidden sm:flex"
                    >
                      <PictureInPicture2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Quick Temporary Cache / Download inside Player */}
                  <button
                    type="button"
                    disabled={downloadProgress?.status === 'downloading'}
                    onClick={onTriggerDownload}
                    aria-label="تنزيل وحفظ الفيديو مؤقتاً"
                    title={
                      isOfflineCached
                        ? 'محفوظ مؤقتاً في ذاكرة التطبيق'
                        : 'تنزيل الفيديو مع شريط تقدم وحفظه مؤقتاً'
                    }
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      isOfflineCached
                        ? 'bg-emerald-500/25 border border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {downloadProgress?.status === 'downloading' ? (
                      <>
                        <HardDriveDownload className="w-3.5 h-3.5 animate-bounce" />
                        <span>{downloadProgress.percent}%</span>
                      </>
                    ) : isOfflineCached ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">محفوظ مؤقتاً</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">تنزيل مؤقت</span>
                      </>
                    )}
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    aria-label={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
                    className="p-1.5 sm:p-2 rounded-xl hover:bg-white/15 text-white transition-colors cursor-pointer"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Integrated Visual DownloadManager Status Bar below Video Surface */}
      <div
        dir="rtl"
        className="p-3 sm:p-3.5 bg-slate-900 border-t border-slate-800 space-y-2.5"
      >
        <InlineDownloadStatus
          itemId={id}
          itemType="video"
          progress={downloadProgress}
          isCached={isOfflineCached}
          cachedSize={fileSize}
          onStartDownload={onTriggerDownload}
        />

        {!isOfflineCached && downloadProgress?.status !== 'downloading' && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <HardDriveDownload className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-bold">
                يمكنك حفظ هذا الفيديو مؤقتاً داخل التطبيق لمشاهدته لاحقاً بدون اتصال بالإنترنت
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onTriggerDownload}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل وحفظ مؤقت الآن</span>
              </button>
              {onSaveToDevice && (
                <button
                  type="button"
                  onClick={onSaveToDevice}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer"
                >
                  حفظ ملف للجهاز
                </button>
              )}
            </div>
          </div>
        )}

        {description && (
          <p className="text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};
