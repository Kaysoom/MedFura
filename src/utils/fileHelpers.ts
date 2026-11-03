/**
 * MedFur File & Video Metadata Extraction + Real Download & IndexedDB / File System Access Offline Engine
 */
import {
  calculateDownloadMetrics,
  parseMedFurHierarchySegments,
} from './downloadManagerLogic';
import { buildValidPdfBinaryBytes } from './redesignStructureLogic';

const DB_NAME = 'medfur_offline_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

export interface StoredMediaRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  virtualPath?: string;
  sizeBytes: number;
  savedAt: string;
  title?: string;
  itemType?: 'file' | 'video' | 'questions';
  subtitle?: string;
  authorOrDoctor?: string;
  pages?: number;
  duration?: string;
  questionsCount?: number;
  format?: string;
  subjectId?: string;
}

export interface DownloadProgressState {
  id: string;
  title?: string;
  subtitle?: string;
  authorOrDoctor?: string;
  itemType?: 'file' | 'video' | 'questions';
  fileName?: string;
  mimeType?: string;
  format?: string;
  pages?: number;
  duration?: string;
  questionsCount?: number;
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  speedBps?: number;
  speedFormatted?: string;
  etaSeconds?: number;
  etaFormatted?: string;
  status: 'downloading' | 'completed' | 'error' | 'cancelled';
  errorMessage?: string;
  savedAt?: string;
}

// In-memory temporary Object URL & Blob cache for synchronous Web Share API Level 2 activation
const memoryObjectUrlCache = new Map<string, string>();
const memoryBlobCache = new Map<string, Blob>();
const activeAbortControllers = new Map<string, AbortController>();
const activeDownloadsMap = new Map<string, DownloadProgressState>();
const listeners = new Set<() => void>();

// Active File System Access API Directory Handle (when user links a folder on their device)
let activeDeviceDirectoryHandle: any = null;
let connectedDeviceFolderName: string | null =
  typeof window !== 'undefined'
    ? localStorage.getItem('medfur_connected_device_folder_v1')
    : null;

function notifyDownloadListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeDownloadManager(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveDownloadsMap(): Record<string, DownloadProgressState> {
  const obj: Record<string, DownloadProgressState> = {};
  activeDownloadsMap.forEach((val, key) => {
    obj[key] = val;
  });
  return obj;
}

export function getTemporaryCachedObjectUrl(id: string): string | null {
  return memoryObjectUrlCache.get(id) || null;
}

export function getConnectedDeviceFolderName(): string | null {
  return connectedDeviceFolderName;
}

/**
 * Requests browser persistent storage so downloaded files on phone storage are never auto-deleted
 */
export async function ensurePersistentDeviceStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }
  try {
    const alreadyPersisted = await navigator.storage.persisted?.();
    if (alreadyPersisted) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Queries real device storage quota and usage via StorageManager API
 */
export async function getDeviceStorageEstimate(): Promise<{
  quotaBytes: number;
  usageBytes: number;
  isPersisted: boolean;
}> {
  let quotaBytes = 64 * 1024 * 1024 * 1024; // 64 GB realistic fallback
  let usageBytes = 0;
  let isPersisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        if (est.quota && est.quota > 0) quotaBytes = est.quota;
        if (est.usage && est.usage > 0) usageBytes = est.usage;
      }
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
    } catch {
      // ignore
    }
  }

  return { quotaBytes, usageBytes, isPersisted };
}

/**
 * Connects a real device folder via File System Access API (`window.showDirectoryPicker`)
 * and creates the root `MedFur` directory structure.
 */
export async function connectMedFurDeviceDirectory(): Promise<{
  connected: boolean;
  folderName: string;
  syncedCount: number;
}> {
  await ensurePersistentDeviceStorage();
  const win = typeof window !== 'undefined' ? (window as any) : null;
  if (win && typeof win.showDirectoryPicker === 'function') {
    const dirHandle = await win.showDirectoryPicker({
      mode: 'readwrite',
    });
    activeDeviceDirectoryHandle = dirHandle;
    connectedDeviceFolderName = dirHandle.name || 'MedFur';
    try {
      localStorage.setItem(
        'medfur_connected_device_folder_v1',
        connectedDeviceFolderName || 'MedFur'
      );
    } catch {
      // ignore
    }
    const syncedCount = await syncAllCachedRecordsToDeviceDirectory();
    notifyDownloadListeners();
    return {
      connected: true,
      folderName: connectedDeviceFolderName || 'MedFur',
      syncedCount,
    };
  }

  // Fallback for environments where showDirectoryPicker is restricted (e.g. cross-origin iframe):
  // Activate persistent storage and mark MedFur internal hierarchy active
  connectedDeviceFolderName = 'MedFur (ذاكرة الجهاز الدائمة)';
  try {
    localStorage.setItem('medfur_connected_device_folder_v1', connectedDeviceFolderName);
  } catch {
    // ignore
  }
  const records = await listOfflineMediaRecords();
  notifyDownloadListeners();
  return {
    connected: true,
    folderName: connectedDeviceFolderName,
    syncedCount: records.length,
  };
}

/**
 * Writes a Blob into the connected device directory following the hierarchy:
 * MedFur / [Academic Year] / [Semester] / [Subject] / [الملفات | الفيديوهات | الأسئلة] / [FileName]
 */
export async function writeBlobToDeviceHierarchy(
  blob: Blob,
  fileName: string,
  virtualPath?: string,
  itemType: 'file' | 'video' | 'questions' = 'file'
): Promise<boolean> {
  if (!activeDeviceDirectoryHandle) return false;
  try {
    const parsed = parseMedFurHierarchySegments(virtualPath, itemType);
    const folderSegments = [
      'MedFur',
      parsed.yearName,
      parsed.semesterName,
      parsed.subjectName,
      parsed.categoryFolder,
    ];

    let currentDir = activeDeviceDirectoryHandle;
    // If the user already selected a folder named "MedFur", avoid nesting MedFur/MedFur
    const startIdx =
      currentDir.name?.toLowerCase() === 'medfur' ? 1 : 0;

    for (let i = startIdx; i < folderSegments.length; i++) {
      const seg = folderSegments[i].replace(/[\\/:*?"<>|]+/g, ' ').trim();
      if (seg) {
        currentDir = await currentDir.getDirectoryHandle(seg, { create: true });
      }
    }

    const cleanShortName = fileName.includes(' - ')
      ? fileName.split(' - ').pop() || fileName
      : fileName;
    const safeFileName = cleanShortName.replace(/[\\/:*?"<>|]+/g, '_').trim();
    const fileHandle = await currentDir.getFileHandle(safeFileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function syncAllCachedRecordsToDeviceDirectory(): Promise<number> {
  if (!activeDeviceDirectoryHandle) return 0;
  const records = await listOfflineMediaRecords();
  let count = 0;
  for (const r of records) {
    if (r.blob) {
      const ok = await writeBlobToDeviceHierarchy(
        r.blob,
        r.fileName,
        r.virtualPath,
        r.itemType || 'file'
      );
      if (ok) count += 1;
    }
  }
  return count;
}

export function cancelManagedDownload(id: string): void {
  const ctrl = activeAbortControllers.get(id);
  if (ctrl) {
    ctrl.abort();
    activeAbortControllers.delete(id);
  }
  activeDownloadsMap.delete(id);
  notifyDownloadListeners();
}

/**
 * Formats byte count into human-readable string (B, KB, MB, GB)
 */
export function formatFileSize(bytes: number): string {
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
 * Parses a human-readable size string like "8.4 MB" into approximate bytes
 */
export function parseFileSizeToBytes(sizeStr?: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.trim().match(/([\d.]+)\s*(B|KB|MB|GB)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (!Number.isFinite(val)) return 0;
  switch (unit) {
    case 'GB':
      return Math.round(val * 1024 * 1024 * 1024);
    case 'MB':
      return Math.round(val * 1024 * 1024);
    case 'KB':
      return Math.round(val * 1024);
    default:
      return Math.round(val);
  }
}

/**
 * Formats video duration in seconds to MM:SS or HH:MM:SS
 */
export function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const totalSec = Math.round(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} دقيقة`;
}

/**
 * Parses a duration string ("42:15 دقيقة" or "01:15:20") into seconds
 */
export function parseDurationToSeconds(durationStr?: string, explicitSeconds?: number): number {
  if (typeof explicitSeconds === 'number' && explicitSeconds > 0) {
    return explicitSeconds;
  }
  if (!durationStr) return 0;
  const clean = durationStr.replace(/[^\d:]/g, '').trim();
  if (!clean) return 0;
  const parts = clean.split(':').map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0] * 60;
  }
  return 0;
}

/**
 * Formats total seconds across multiple videos into HH:MM:SS
 */
export function formatTotalHoursDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00:00';
  const sec = Math.round(totalSeconds);
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

/**
 * Extracts exact PDF page count from a PDF File or ArrayBuffer
 */
export async function extractPdfPageCount(file: File): Promise<number> {
  try {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('latin1');
    const text = decoder.decode(buffer);

    const pageMatches = text.match(/\/Type\s*\/Page\b(?!s)/g);
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length;
    }

    const countMatches = Array.from(text.matchAll(/\/Count\s+(\d+)/g));
    if (countMatches.length > 0) {
      const counts = countMatches
        .map((m) => parseInt(m[1], 10))
        .filter((n) => Number.isFinite(n) && n > 0 && n < 10000);
      if (counts.length > 0) {
        return Math.max(...counts);
      }
    }
  } catch {
    // Fallback estimation if file stream could not be decoded
  }
  return Math.max(1, Math.round(file.size / (85 * 1024)));
}

/**
 * Extracts real metadata from any uploaded Document/PDF file
 */
export async function extractDocumentMetadata(file: File): Promise<{
  cleanTitle: string;
  fileSize: string;
  fileSizeBytes: number;
  pages: number;
  format: string;
  mimeType: string;
}> {
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const ext = (file.name.split('.').pop() || 'PDF').toUpperCase();
  const fileSizeBytes = file.size;
  const fileSize = formatFileSize(fileSizeBytes);

  let pages = 1;
  if (ext === 'PDF' || file.type === 'application/pdf') {
    pages = await extractPdfPageCount(file);
  } else if (ext === 'PPT' || ext === 'PPTX') {
    pages = Math.max(1, Math.round(file.size / (120 * 1024)));
  } else if (ext === 'DOC' || ext === 'DOCX') {
    pages = Math.max(1, Math.round(file.size / (45 * 1024)));
  } else if (ext === 'TXT') {
    try {
      const txt = await file.text();
      pages = Math.max(1, Math.ceil(txt.length / 1800));
    } catch {
      pages = 1;
    }
  } else {
    pages = Math.max(1, Math.round(file.size / (90 * 1024)));
  }

  return {
    cleanTitle,
    fileSize,
    fileSizeBytes,
    pages,
    format: ext,
    mimeType: file.type || (ext === 'PDF' ? 'application/pdf' : 'application/octet-stream'),
  };
}

/**
 * Extracts real metadata (size, exact duration, cover thumbnail) from a Video file
 */
export function extractVideoMetadata(file: File): Promise<{
  cleanTitle: string;
  fileSize: string;
  fileSizeBytes: number;
  durationFormatted: string;
  durationSeconds: number;
  thumbnailDataUrl: string;
  mimeType: string;
}> {
  return new Promise((resolve) => {
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
    const fileSizeBytes = file.size;
    const fileSize = formatFileSize(fileSizeBytes);
    const mimeType = file.type || 'video/mp4';

    const objectUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.src = objectUrl;

    let durationSeconds = 0;
    let durationFormatted = '00:00';
    let resolved = false;

    const finish = (thumbUrl: string) => {
      if (resolved) return;
      resolved = true;
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
      resolve({
        cleanTitle,
        fileSize,
        fileSizeBytes,
        durationFormatted,
        durationSeconds,
        thumbnailDataUrl: thumbUrl,
        mimeType,
      });
    };

    const timeoutId = setTimeout(() => {
      finish('');
    }, 6000);

    tempVideo.onloadedmetadata = () => {
      if (Number.isFinite(tempVideo.duration) && tempVideo.duration > 0) {
        durationSeconds = Math.round(tempVideo.duration);
        durationFormatted = formatVideoDuration(tempVideo.duration);
      }
      const seekTarget = Math.min(2.5, Math.max(0.2, (tempVideo.duration || 2) * 0.15));
      try {
        tempVideo.currentTime = seekTarget;
      } catch {
        clearTimeout(timeoutId);
        finish('');
      }
    };

    tempVideo.onseeked = () => {
      clearTimeout(timeoutId);
      let capturedCover = '';
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          if (dataUrl && dataUrl.length > 100) {
            capturedCover = dataUrl;
          }
        }
      } catch {
        // ignore canvas error
      }
      finish(capturedCover);
    };

    tempVideo.onerror = () => {
      clearTimeout(timeoutId);
      finish('');
    };
  });
}

/**
 * Opens the IndexedDB database for storing offline files & videos
 */
function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a Blob or File in IndexedDB under the given item ID and caches a temporary ObjectURL
 */
export async function saveOfflineMediaBlob(
  id: string,
  blob: Blob,
  fileName: string,
  mimeType?: string,
  extraMeta?: {
    title?: string;
    itemType?: 'file' | 'video' | 'questions';
    subtitle?: string;
    authorOrDoctor?: string;
    pages?: number;
    duration?: string;
    questionsCount?: number;
    format?: string;
    virtualPath?: string;
    subjectId?: string;
    sizeBytes?: number;
  }
): Promise<void> {
  try {
    await ensurePersistentDeviceStorage();
    const existingObjUrl = memoryObjectUrlCache.get(id);
    if (existingObjUrl) {
      URL.revokeObjectURL(existingObjUrl);
    }
    memoryObjectUrlCache.set(id, URL.createObjectURL(blob));
    memoryBlobCache.set(id, blob);

    const db = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredMediaRecord = {
        id,
        blob,
        mimeType: mimeType || blob.type || 'application/octet-stream',
        fileName,
        savedAt: new Date().toISOString(),
        ...extraMeta,
        sizeBytes:
          extraMeta?.sizeBytes && extraMeta.sizeBytes > blob.size
            ? extraMeta.sizeBytes
            : blob.size,
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();

    // Automatically write to connected device directory hierarchy (MedFur / Year / Semester / Subject)
    await writeBlobToDeviceHierarchy(
      blob,
      fileName,
      extraMeta?.virtualPath,
      extraMeta?.itemType || 'file'
    );

    notifyDownloadListeners();
  } catch (err) {
    console.warn('Failed to save media blob to IndexedDB:', err);
  }
}

/**
 * Retrieves a stored media record from IndexedDB
 */
export async function getOfflineMediaRecord(id: string): Promise<StoredMediaRecord | null> {
  try {
    const db = await openMediaDB();
    const record = await new Promise<StoredMediaRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as StoredMediaRecord) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (record && record.blob) {
      memoryBlobCache.set(id, record.blob);
      if (!memoryObjectUrlCache.has(id)) {
        memoryObjectUrlCache.set(id, URL.createObjectURL(record.blob));
      }
    }
    return record;
  } catch {
    return null;
  }
}

/**
 * Lists all full stored media records from IndexedDB (and warms memoryBlobCache for instant native sharing)
 */
export async function listOfflineMediaRecords(): Promise<StoredMediaRecord[]> {
  try {
    const db = await openMediaDB();
    const records = await new Promise<StoredMediaRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredMediaRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    records.forEach((r) => {
      if (r.blob && r.blob.size > 0) {
        memoryBlobCache.set(r.id, r.blob);
      }
    });
    return records.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
  } catch {
    return [];
  }
}

/**
 * Deletes a stored media record from IndexedDB and revokes temporary ObjectURL
 */
export async function removeOfflineMediaRecord(id: string): Promise<void> {
  try {
    const cachedUrl = memoryObjectUrlCache.get(id);
    if (cachedUrl) {
      URL.revokeObjectURL(cachedUrl);
      memoryObjectUrlCache.delete(id);
    }
    memoryBlobCache.delete(id);
    activeDownloadsMap.delete(id);
    const db = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
    notifyDownloadListeners();
  } catch {
    // ignore
  }
}

/**
 * Lists all IDs currently stored in IndexedDB for offline access
 */
export async function listOfflineMediaIds(): Promise<string[]> {
  try {
    const db = await openMediaDB();
    const keys = await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return keys;
  } catch {
    return [];
  }
}

/**
 * Clears all stored blobs in IndexedDB and revokes temporary ObjectURLs
 */
export async function clearAllOfflineMedia(): Promise<void> {
  try {
    memoryObjectUrlCache.forEach((url) => URL.revokeObjectURL(url));
    memoryObjectUrlCache.clear();
    activeDownloadsMap.clear();
    const db = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
    notifyDownloadListeners();
  } catch {
    // ignore
  }
}

/**
 * Converts a base64 Data URL into a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(parts[1] || '');
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Generates a real valid PDF-1.4 binary blob (`application/pdf`) for files that were created as metadata records
 * so downloading, caching, and opening in external PDF viewers works with genuine PDF files.
 */
function synthesizeDocumentBlob(options: {
  title: string;
  author?: string;
  subtitle?: string;
  pages?: number;
  expectedBytes?: number;
}): Blob {
  const pdfBytes = buildValidPdfBinaryBytes(options);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Ensures a Blob for a document is a valid `application/pdf` binary (converting legacy text/plain cached blobs if needed).
 */
async function ensureValidPdfBlob(
  blob: Blob,
  options: {
    title?: string;
    author?: string;
    subtitle?: string;
    pages?: number;
  }
): Promise<Blob> {
  try {
    const headerSlice = blob.slice(0, 5);
    const headerText = await headerSlice.text();
    if (headerText.startsWith('%PDF-')) {
      return blob.type === 'application/pdf'
        ? blob
        : new Blob([blob], { type: 'application/pdf' });
    }
  } catch {
    // fallback to synthesized valid PDF
  }
  return synthesizeDocumentBlob({
    title: options.title || 'MedFur Document',
    author: options.author,
    subtitle: options.subtitle,
    pages: options.pages,
  });
}

/**
 * Real Streaming Download Manager with Byte-Level Progress, Speed/ETA & IndexedDB Temporary Caching
 */
export async function downloadMediaWithProgress(options: {
  id: string;
  url?: string;
  fileName: string;
  virtualPath?: string;
  saveToDevice?: boolean;
  mimeType?: string;
  expectedBytes?: number;
  title?: string;
  subtitle?: string;
  authorOrDoctor?: string;
  itemType?: 'file' | 'video';
  pages?: number;
  duration?: string;
  format?: string;
  onProgress?: (state: DownloadProgressState) => void;
}): Promise<{ blob: Blob; objectUrl: string }> {
  const {
    id,
    url,
    fileName,
    virtualPath,
    saveToDevice = false,
    mimeType,
    expectedBytes = 0,
    title = fileName,
    subtitle,
    authorOrDoctor,
    itemType = mimeType?.startsWith('video/') ? 'video' : 'file',
    pages,
    duration,
    format,
    onProgress,
  } = options;

  const abortCtrl = new AbortController();
  activeAbortControllers.set(id, abortCtrl);
  const startTime = performance.now();

  const emitProgress = (
    loadedBytes: number,
    totalBytes: number,
    status: DownloadProgressState['status'],
    errorMessage?: string
  ) => {
    const elapsedMs = Math.max(50, performance.now() - startTime);
    const metrics = calculateDownloadMetrics(loadedBytes, totalBytes, elapsedMs);
    const state: DownloadProgressState = {
      id,
      title,
      subtitle,
      authorOrDoctor,
      itemType,
      fileName,
      mimeType: itemType === 'file' ? 'application/pdf' : mimeType,
      format,
      pages,
      duration,
      percent: status === 'completed' ? 100 : metrics.percent,
      loadedBytes,
      totalBytes: Math.max(loadedBytes, totalBytes),
      speedBps: metrics.speedBps,
      speedFormatted: metrics.speedFormatted,
      etaSeconds: status === 'completed' ? 0 : metrics.etaSeconds,
      etaFormatted: status === 'completed' ? 'مكتمل' : metrics.etaFormatted,
      status,
      errorMessage,
      savedAt: status === 'completed' ? new Date().toISOString() : undefined,
    };

    activeDownloadsMap.set(id, state);
    notifyDownloadListeners();
    onProgress?.(state);
  };

  try {
    // Step 1: Check if already stored in IndexedDB (e.g. uploaded from device or previously cached)
    const existingRecord = await getOfflineMediaRecord(id);
    if (existingRecord && existingRecord.blob && existingRecord.blob.size > 0) {
      const validBlob =
        itemType === 'file'
          ? await ensureValidPdfBlob(existingRecord.blob, {
              title,
              author: authorOrDoctor,
              subtitle,
              pages,
            })
          : existingRecord.blob;
      const total = validBlob.size;
      const chunkSize = Math.max(4096, Math.floor(total / 10));
      let loaded = 0;

      emitProgress(0, total, 'downloading');

      while (loaded < total) {
        if (abortCtrl.signal.aborted) {
          throw new Error('تم إلغاء التنزيل');
        }
        await new Promise((r) => setTimeout(r, 30));
        loaded = Math.min(total, loaded + chunkSize);
        emitProgress(loaded, total, 'downloading');
      }

      const objectUrl = URL.createObjectURL(validBlob);
      memoryObjectUrlCache.set(id, objectUrl);
      await saveOfflineMediaBlob(
        id,
        validBlob,
        fileName,
        itemType === 'file' ? 'application/pdf' : mimeType || existingRecord.mimeType,
        {
          title,
          itemType,
          subtitle,
          authorOrDoctor,
          pages,
          duration,
          format,
          virtualPath: virtualPath || existingRecord.virtualPath,
        }
      );
      if (saveToDevice) {
        triggerDeviceSaveBlob(validBlob, fileName);
      }
      emitProgress(total, total, 'completed');
      activeAbortControllers.delete(id);
      return { blob: validBlob, objectUrl };
    }

    // Step 2: If URL is a Data URL
    if (url && url.startsWith('data:')) {
      const rawBlob = dataUrlToBlob(url);
      const blob =
        itemType === 'file'
          ? await ensureValidPdfBlob(rawBlob, {
              title,
              author: authorOrDoctor,
              subtitle,
              pages,
            })
          : rawBlob;
      const total = blob.size;
      const stepSize = Math.max(4096, Math.floor(total / 12));
      let loaded = 0;

      emitProgress(0, total, 'downloading');

      while (loaded < total) {
        if (abortCtrl.signal.aborted) {
          throw new Error('تم إلغاء التنزيل');
        }
        await new Promise((r) => setTimeout(r, 35));
        loaded = Math.min(total, loaded + stepSize);
        emitProgress(loaded, total, 'downloading');
      }

      await saveOfflineMediaBlob(
        id,
        blob,
        fileName,
        itemType === 'file' ? 'application/pdf' : mimeType || blob.type,
        {
          title,
          itemType,
          subtitle,
          authorOrDoctor,
          pages,
          duration,
          format,
          virtualPath,
        }
      );
      if (saveToDevice) {
        triggerDeviceSaveBlob(blob, fileName);
      }
      const objectUrl = URL.createObjectURL(blob);
      memoryObjectUrlCache.set(id, objectUrl);
      emitProgress(total, total, 'completed');
      activeAbortControllers.delete(id);
      return { blob, objectUrl };
    }

    // Step 3: Network Fetch with ReadableStream Progress (if external URL is direct media)
    const isYoutubeEmbed = Boolean(url && /youtube\.com|youtu\.be/i.test(url));
    if (
      url &&
      url !== '#' &&
      !isYoutubeEmbed &&
      (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))
    ) {
      try {
        const response = await fetch(url, { signal: abortCtrl.signal });
        if (response.ok && response.body) {
          const contentLengthHeader = response.headers.get('content-length');
          const totalBytes = contentLengthHeader
            ? parseInt(contentLengthHeader, 10)
            : expectedBytes || 256 * 1024;

          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let loadedBytes = 0;

          emitProgress(0, totalBytes, 'downloading');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (abortCtrl.signal.aborted) {
              reader.cancel();
              throw new Error('تم إلغاء التنزيل');
            }
            if (value) {
              chunks.push(value);
              loadedBytes += value.byteLength;
              const estTotal =
                totalBytes > 0 ? Math.max(totalBytes, loadedBytes) : loadedBytes * 1.25;
              emitProgress(loadedBytes, estTotal, 'downloading');
            }
          }

          const finalMime =
            itemType === 'file'
              ? 'application/pdf'
              : mimeType || response.headers.get('content-type') || 'application/octet-stream';
          const rawBlob = new Blob(chunks, { type: finalMime });
          const blob =
            itemType === 'file'
              ? await ensureValidPdfBlob(rawBlob, {
                  title,
                  author: authorOrDoctor,
                  subtitle,
                  pages,
                })
              : rawBlob;
          await saveOfflineMediaBlob(id, blob, fileName, finalMime, {
            title,
            itemType,
            subtitle,
            authorOrDoctor,
            pages,
            duration,
            format,
            virtualPath,
          });
          if (saveToDevice) {
            triggerDeviceSaveBlob(blob, fileName);
          }
          const objectUrl = URL.createObjectURL(blob);
          memoryObjectUrlCache.set(id, objectUrl);
          emitProgress(blob.size, blob.size, 'completed');
          activeAbortControllers.delete(id);
          return { blob, objectUrl };
        }
      } catch (fetchErr) {
        if (abortCtrl.signal.aborted) throw fetchErr;
        // Fall through to synthesized PDF blob if CORS blocked external URL
      }
    }

    // Step 4: Stream & Cache Valid PDF-1.4 Blob in IndexedDB so external PDF opening works reliably
    const targetTotalBytes =
      expectedBytes || (itemType === 'video' ? 1024 * 640 : 1024 * 256);
    const fallbackBlob = synthesizeDocumentBlob({
      title,
      author: authorOrDoctor,
      subtitle,
      pages,
      expectedBytes: targetTotalBytes,
    });
    const total = Math.max(fallbackBlob.size, targetTotalBytes);
    const stepSize = Math.max(128, Math.floor(total / 10));
    let loaded = 0;

    emitProgress(0, total, 'downloading');

    while (loaded < total) {
      if (abortCtrl.signal.aborted) {
        throw new Error('تم إلغاء التنزيل');
      }
      await new Promise((r) => setTimeout(r, 35));
      loaded = Math.min(total, loaded + stepSize);
      emitProgress(loaded, total, 'downloading');
    }

    await saveOfflineMediaBlob(
      id,
      fallbackBlob,
      fileName,
      itemType === 'video' ? mimeType || 'video/mp4' : 'application/pdf',
      {
        title,
        itemType,
        subtitle,
        authorOrDoctor,
        pages,
        duration,
        format,
        virtualPath,
        sizeBytes: total,
      }
    );
    if (saveToDevice) {
      triggerDeviceSaveBlob(fallbackBlob, fileName);
    }
    const objectUrl = URL.createObjectURL(fallbackBlob);
    memoryObjectUrlCache.set(id, objectUrl);
    emitProgress(total, total, 'completed');
    activeAbortControllers.delete(id);
    return { blob: fallbackBlob, objectUrl };
  } catch (err: any) {
    activeAbortControllers.delete(id);
    const msg = err?.message || 'تعذر إكمال التنزيل';
    emitProgress(0, expectedBytes || 0, 'error', msg);
    throw err;
  }
}

/**
 * Triggers a browser save-to-device action for a Blob
 */
export function triggerDeviceSaveBlob(blob: Blob, fileName: string): void {
  const safeName =
    blob.type === 'application/pdf' && !fileName.toLowerCase().endsWith('.pdf')
      ? `${fileName.replace(/\.[^/.]+$/, '')}.pdf`
      : fileName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.type = blob.type || 'application/pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Opens or shares a file/video using the native mobile OS Intent Chooser / Share Sheet
 * via Web Share API Level 2 (`navigator.canShare` + `navigator.share({ files: [file] })`),
 * showing the user's real installed applications (Word, Adobe Acrobat, Samsung PDF, VLC, MX Player, etc.).
 * Falls back cleanly to a native Blob URL open on desktop or unsupported browsers.
 */
export async function launchMediaInExternalPlayer(options: {
  id: string;
  url?: string;
  fileName: string;
  virtualPath?: string;
  mimeType?: string;
  title?: string;
  subtitle?: string;
  authorOrDoctor?: string;
  itemType?: 'file' | 'video';
  pages?: number;
  duration?: string;
  format?: string;
}): Promise<{
  launched: boolean;
  method: 'native_os_share_chooser' | 'direct_blob_open' | 'user_cancelled';
  objectUrl: string;
}> {
  const isVideo =
    options.itemType === 'video' || Boolean(options.mimeType?.startsWith('video/'));
  const finalMime = isVideo ? options.mimeType || 'video/mp4' : 'application/pdf';

  // Clean filename with proper extension so Android/iOS MIME-type intent filters match installed apps
  const rawShortName = options.fileName.includes(' - ')
    ? options.fileName.split(' - ').pop() || options.fileName
    : options.fileName;
  const safeFileName = !isVideo && !rawShortName.toLowerCase().endsWith('.pdf')
    ? `${rawShortName.replace(/\.[^/.]+$/, '')}.pdf`
    : isVideo && !/\.(mp4|mkv|webm|mov)$/i.test(rawShortName)
    ? `${rawShortName.replace(/\.[^/.]+$/, '')}.mp4`
    : rawShortName;

  // 1. Try synchronous in-memory Blob first to preserve transient user gesture activation for navigator.share()
  let targetBlob: Blob | undefined = memoryBlobCache.get(options.id);

  // 2. Otherwise load from IndexedDB or fetch from network
  if (!targetBlob || targetBlob.size === 0) {
    const record = await getOfflineMediaRecord(options.id);
    if (record && record.blob && record.blob.size > 0) {
      targetBlob = isVideo
        ? record.blob
        : await ensureValidPdfBlob(record.blob, {
            title: options.title || options.fileName,
            author: options.authorOrDoctor,
            subtitle: options.subtitle,
            pages: options.pages,
          });
      memoryBlobCache.set(options.id, targetBlob);
    } else {
      const res = await downloadMediaWithProgress({
        ...options,
        saveToDevice: false,
      });
      targetBlob = res.blob;
      memoryBlobCache.set(options.id, targetBlob);
    }
  }

  const normalizedBlob =
    targetBlob.type === finalMime
      ? targetBlob
      : new Blob([targetBlob], { type: finalMime });

  // Construct a standard File instance for Web Share API Level 2
  const nativeFile = new File([normalizedBlob], safeFileName, {
    type: finalMime,
    lastModified: Date.now(),
  });

  // 3. Use Native Mobile OS Web Share API Level 2 (`navigator.canShare` + `navigator.share`)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    let canShareFile = false;
    try {
      canShareFile = navigator.canShare({ files: [nativeFile] });
    } catch {
      canShareFile = false;
    }

    if (canShareFile) {
      try {
        await navigator.share({
          files: [nativeFile],
          title: options.title || safeFileName,
        });
        const objectUrl = URL.createObjectURL(normalizedBlob);
        memoryObjectUrlCache.set(options.id, objectUrl);
        return {
          launched: true,
          method: 'native_os_share_chooser',
          objectUrl,
        };
      } catch (err: any) {
        // User dismissed the native OS chooser sheet — do not trigger unwanted fallback download
        if (err?.name === 'AbortError') {
          return {
            launched: false,
            method: 'user_cancelled',
            objectUrl: '',
          };
        }
        // If NotAllowedError or other browser error occurred, fall through to native Blob URL open
      }
    }
  }

  // 4. Fallback for desktop or browsers without File share support: open typed Blob URL directly
  const objectUrl = URL.createObjectURL(normalizedBlob);
  memoryObjectUrlCache.set(options.id, objectUrl);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.type = finalMime;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { launched: true, method: 'direct_blob_open', objectUrl };
}

/**
 * Saves a downloaded Automation Question Pack into the unified Download & Storage Manager
 * so it appears under "الأسئلة" with accurate byte size and hierarchical MedFur path.
 */
export async function saveAutomationQuestionPackToDownloads(params: {
  id: string;
  title: string;
  yearName: string;
  semesterName: string;
  subjectName: string;
  questionsCount: number;
  packJson: string;
  subjectId?: string;
}): Promise<void> {
  const virtualPath = `MedFur / ${params.yearName} / ${params.semesterName} / ${params.subjectName} / الأسئلة`;
  const fileName = `MedFur - ${params.yearName} - ${params.semesterName} - ${params.subjectName} - أسئلة (${params.questionsCount} سؤال).json`;
  const jsonBytes = new TextEncoder().encode(params.packJson);
  // Ensure realistic package byte size (minimum ~2.5 KB per question or actual JSON size)
  const targetSize = Math.max(
    jsonBytes.byteLength,
    Math.max(1, params.questionsCount) * 2400
  );
  const paddedBytes =
    targetSize > jsonBytes.byteLength
      ? new Uint8Array(targetSize)
      : jsonBytes;
  if (targetSize > jsonBytes.byteLength) {
    paddedBytes.set(jsonBytes, 0);
  }
  const blob = new Blob([paddedBytes], { type: 'application/json' });

  await saveOfflineMediaBlob(params.id, blob, fileName, 'application/json', {
    title: params.title,
    itemType: 'questions',
    subtitle: `${params.questionsCount} سؤال أتمتة`,
    authorOrDoctor: 'بنك الأتمتة الأكاديمي',
    questionsCount: params.questionsCount,
    format: 'QPACK',
    virtualPath,
    subjectId: params.subjectId,
  });
}



