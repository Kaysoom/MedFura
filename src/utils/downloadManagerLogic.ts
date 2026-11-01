export interface DownloadMetrics {
  percent: number;
  speedBps: number;
  speedFormatted: string;
  etaSeconds: number;
  etaFormatted: string;
}

/**
 * Formats byte count into human-readable string (B, KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    sizes.length - 1,
    Math.max(0, Math.floor(Math.log(bytes) / Math.log(k)))
  );
  const value = bytes / Math.pow(k, i);
  return `${parseFloat(value.toFixed(i >= 2 ? 2 : 1))} ${sizes[i]}`;
}

/**
 * Calculates download percentage, transfer speed, and ETA from byte progress
 */
export function calculateDownloadMetrics(
  loadedBytes: number,
  totalBytes: number,
  elapsedMs: number
): DownloadMetrics {
  const safeLoaded = Math.max(0, loadedBytes);
  const safeTotal = Math.max(safeLoaded, totalBytes > 0 ? totalBytes : safeLoaded);
  const percent =
    safeTotal > 0 ? Math.min(100, Math.max(0, Math.round((safeLoaded / safeTotal) * 100))) : 0;

  const elapsedSeconds = Math.max(0.1, elapsedMs / 1000);
  const speedBps = Math.round(safeLoaded / elapsedSeconds);
  const speedFormatted = `${formatBytes(speedBps)}/ث`;

  const remainingBytes = Math.max(0, safeTotal - safeLoaded);
  const etaSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;

  let etaFormatted = 'أقل من ثانية';
  if (etaSeconds > 60) {
    const mins = Math.floor(etaSeconds / 60);
    const secs = etaSeconds % 60;
    etaFormatted = `${mins} د و ${secs} ث`;
  } else if (etaSeconds > 0) {
    etaFormatted = `${etaSeconds} ثانية`;
  }

  return {
    percent,
    speedBps,
    speedFormatted,
    etaSeconds,
    etaFormatted,
  };
}

/**
 * Formats video player time in seconds to MM:SS or HH:MM:SS
 */
export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Clamps seek target time within [0, duration]
 */
export function clampSeekTime(current: number, delta: number, duration: number): number {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const target = (Number.isFinite(current) ? current : 0) + delta;
  return Math.min(safeDuration, Math.max(0, target));
}
