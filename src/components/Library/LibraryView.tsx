import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Folder,
  FolderPlus,
  Plus,
  Trash2,
  Edit3,
  ChevronLeft,
  Search,
  BookOpen,
  CheckCircle2,
  X,
  Upload,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Pin,
  Palette,
  Image as ImageIcon,
  Cloud,
  Heart,
  Home,
  LayoutGrid,
  List,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { LibraryFolderItem, LibraryFileItem } from '../../types';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { InAppSelect } from '../Common/InAppSelect';
import {
  SubjectMedicalIcon,
  MEDICAL_ICON_OPTIONS,
  resolveSubjectMedicalIcon,
} from '../Common/SubjectMedicalIcon';
import { FOLDER_COVER_PRESETS } from '../../utils/customQuizAndLibraryLogic';
import {
  extractDocumentMetadata,
  saveOfflineMediaBlob,
  downloadMediaWithProgress,
  parseFileSizeToBytes,
  removeOfflineMediaRecord,
  StoredMediaRecord,
  cancelManagedDownload,
  launchMediaInExternalPlayer,
} from '../../utils/fileHelpers';
import {
  InAppMediaViewerModal,
  InAppViewerItem,
} from '../Common/InAppMediaViewerModal';
import {
  MediaLaunchChoiceModal,
  MediaLaunchTarget,
} from '../Common/MediaLaunchChoiceModal';
import {
  DownloadManager,
  useDownloadManager,
} from '../Common/DownloadManager';
import { buildStructuredMedFurFileName } from '../../utils/mediaAndOfflineLogic';
import {
  MediaIconWithCircularProgress,
  MediaThreeDotsMenu,
} from '../Common/MediaCardControls';
import {
  LibraryMainTab,
  LibrarySortOption,
  filterAndSortLibraryFiles,
  sortRootLibraryFolders,
} from '../../utils/redesignStructureLogic';

const FAVORITE_FILES_STORAGE_KEY = 'medfur_favorite_files_v1';

export const LibraryView: React.FC = () => {
  const {
    subjects,
    libraryFolders,
    libraryFiles,
    isAdmin,
    addLibraryFolder,
    updateLibraryFolder,
    renameLibraryFolder,
    deleteLibraryFolder,
    moveLibraryFolder,
    addLibraryFile,
    updateLibraryFile,
    deleteLibraryFile,
    moveLibraryFile,
    togglePinLibraryFile,
    setActiveSection,
  } = useApp();

  const {
    activeDownloads,
    cachedIds,
    refreshState,
  } = useDownloadManager();

  // Navigation State: current folder id in hierarchy (null = root level)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [activeLibraryTab, setActiveLibraryTab] = useState<LibraryMainTab>('cloud');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [selectedFileTypeFilter, setSelectedFileTypeFilter] = useState<string>('الكل');
  const [sortBy, setSortBy] = useState<LibrarySortOption>('newest');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);

  // Favorite file IDs persisted in localStorage
  const [favoriteFileIds, setFavoriteFileIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITE_FILES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITE_FILES_STORAGE_KEY, JSON.stringify(favoriteFileIds));
    } catch {
      // ignore storage errors
    }
  }, [favoriteFileIds]);

  const toggleFavoriteFile = (fileId: string) => {
    setFavoriteFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  // Viewer Modal & Launch Choice Modal State
  const [viewerItem, setViewerItem] = useState<InAppViewerItem | null>(null);
  const [launchChoiceTarget, setLaunchChoiceTarget] =
    useState<MediaLaunchTarget | null>(null);

  // Modals & Inline Form States for Folder Creation & Customization
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<LibraryFolderItem | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIsSubject, setNewFolderIsSubject] = useState<boolean>(false);
  const [newFolderSubjectId, setNewFolderSubjectId] = useState<string>('');
  const [newFolderIcon, setNewFolderIcon] = useState<string>('Anatomy');
  const [newFolderDepartment, setNewFolderDepartment] = useState<string>('');
  const [newFolderSemesterBadge, setNewFolderSemesterBadge] = useState<'' | '1' | '2'>('');
  const [newFolderCoverColor, setNewFolderCoverColor] = useState<string>('');
  const [newFolderCoverLabel, setNewFolderCoverLabel] = useState<string>('');
  const [newFolderCoverImage, setNewFolderCoverImage] = useState<string>('');
  const folderCoverInputRef = React.useRef<HTMLInputElement | null>(null);

  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [fileToEdit, setFileToEdit] = useState<LibraryFileItem | null>(null);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileType, setNewFileType] =
    useState<LibraryFileItem['fileType']>('تفريغ / نوطة');
  const [newFileAuthor, setNewFileAuthor] = useState('');
  const [newFileSize, setNewFileSize] = useState('0 KB');
  const [newFileSizeBytes, setNewFileSizeBytes] = useState<number>(0);
  const [newFilePages, setNewFilePages] = useState<number>(0);
  const [detectedFormat, setDetectedFormat] = useState<string>('PDF');
  const [detectedMimeType, setDetectedMimeType] =
    useState<string>('application/pdf');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');
  const [selectedRawFile, setSelectedRawFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isExtractingMeta, setIsExtractingMeta] = useState(false);
  const deviceFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamedFolderName, setRenamedFolderName] = useState('');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Breadcrumbs calculation
  const breadcrumbTrail = useMemo(() => {
    const trail: LibraryFolderItem[] = [];
    let curId = currentFolderId;
    while (curId) {
      const f = libraryFolders.find((item) => item.id === curId);
      if (!f) break;
      trail.unshift(f);
      curId = f.parentId;
    }
    return trail;
  }, [libraryFolders, currentFolderId]);

  // Current sub-folders sorted per root priority or orderIndex
  const currentSubFolders = useMemo(() => {
    if (activeLibraryTab !== 'cloud' || searchQuery.trim() !== '') return [];
    const raw = libraryFolders.filter((f) => f.parentId === currentFolderId);
    if (currentFolderId === null) {
      return sortRootLibraryFolders(raw);
    }
    return [...raw].sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
  }, [libraryFolders, currentFolderId, activeLibraryTab, searchQuery]);

  // Displayed files filtered by tab, folder, searchQuery, fileType, and sortBy
  const displayedFiles = useMemo(() => {
    return filterAndSortLibraryFiles(libraryFiles, {
      activeTab: activeLibraryTab,
      currentFolderId,
      searchQuery,
      fileTypeFilter: selectedFileTypeFilter,
      sortBy,
      downloadedIds: new Set(cachedIds),
      favoriteIds: new Set(favoriteFileIds),
    });
  }, [
    libraryFiles,
    activeLibraryTab,
    currentFolderId,
    searchQuery,
    selectedFileTypeFilter,
    sortBy,
    cachedIds,
    favoriteFileIds,
  ]);

  // Resolve structured MedFur naming & virtual path from folder hierarchy
  const resolveFileMedFurMeta = (
    folderId: string | null,
    title: string,
    formatOrExt?: string
  ) => {
    const chain: LibraryFolderItem[] = [];
    let curId = folderId;
    while (curId) {
      const f = libraryFolders.find((item) => item.id === curId);
      if (!f) break;
      chain.unshift(f);
      curId = f.parentId;
    }
    const yearFolder = chain.find(
      (f) => f.yearId || f.name.includes('السنة')
    );
    const semFolder = chain.find(
      (f) => f.semester || f.semesterBadge || f.name.includes('فصل')
    );
    const subjectFolder =
      [...chain].reverse().find((f) => f.isSubject || f.subjectId) ||
      chain[chain.length - 1];

    return buildStructuredMedFurFileName({
      yearId: yearFolder?.yearId,
      yearLabel: yearFolder?.name,
      semester:
        semFolder?.semester ||
        (semFolder?.semesterBadge === '2'
          ? 'sem-2'
          : semFolder?.semesterBadge === '1'
            ? 'sem-1'
            : semFolder?.name),
      subjectOrFolderName: subjectFolder?.name || 'المكتبة الطبية',
      mediaType: 'file',
      title,
      extension: (formatOrExt || 'pdf').toLowerCase(),
    });
  };

  // Open file directly inside the In-App Viewer Modal
  const openFileDirectlyInApp = (file: LibraryFileItem) => {
    setViewerItem({
      id: file.id,
      type: 'file',
      title: file.title,
      subtitle: file.fileType,
      authorOrDoctor: file.author,
      fileSize: file.fileSize,
      pages: file.pages,
      format: file.format || 'PDF',
      url: file.downloadUrl,
      mimeType: file.mimeType || 'application/pdf',
    });
  };

  // Primary click on file card (Pages 2, 4, 5):
  // - If already downloaded offline -> open directly in In-App Viewer
  // - If not downloaded yet -> start inline circular download immediately
  const handlePrimaryFileClick = (file: LibraryFileItem) => {
    const progress = activeDownloads[file.id];
    if (progress?.status === 'downloading') {
      cancelManagedDownload(file.id);
      return;
    }
    const isOffline = cachedIds.includes(file.id);
    if (isOffline) {
      openFileDirectlyInApp(file);
    } else {
      handleDownloadFile(file);
    }
  };

  // Open from DownloadManager cached record
  const handleOpenFromDownloadManager = (record: StoredMediaRecord) => {
    setViewerItem({
      id: record.id,
      type:
        record.itemType ||
        (record.mimeType?.startsWith('video/') ? 'video' : 'file'),
      title: record.title || record.fileName.replace(/\.[^/.]+$/, ''),
      subtitle: record.subtitle,
      authorOrDoctor: record.authorOrDoctor,
      pages: record.pages,
      duration: record.duration,
      format: record.format,
      mimeType: record.mimeType,
    });
  };

  // Real Download with Circular Progress, IndexedDB Caching & External Device Save with MedFur Filename
  const handleDownloadFile = async (file: LibraryFileItem, saveToDevice = false) => {
    try {
      const expectedBytes =
        file.fileSizeBytes ||
        parseFileSizeToBytes(file.fileSize) ||
        1024 * 320;

      const medfurMeta = resolveFileMedFurMeta(
        file.folderId,
        file.title,
        file.format || 'pdf'
      );

      await downloadMediaWithProgress({
        id: file.id,
        url: file.downloadUrl,
        fileName: medfurMeta.fileName,
        mimeType: file.mimeType || 'application/pdf',
        expectedBytes,
        title: file.title,
        subtitle: file.fileType,
        authorOrDoctor: file.author,
        itemType: 'file',
        pages: file.pages,
        format: file.format || 'PDF',
        virtualPath: medfurMeta.virtualPath,
        saveToDevice,
      });

      refreshState();
      await updateLibraryFile(file.id, {
        downloadsCount: (file.downloadsCount || 0) + 1,
      });

      if (saveToDevice) {
        setDownloadNotice(`تم حفظ الملف وتنزيله للجهاز: ${medfurMeta.fileName}`);
        setTimeout(() => setDownloadNotice(null), 3500);
      }
    } catch {
      // Cancelled or handled inline
    }
  };

  const handleShareFile = async (file: LibraryFileItem) => {
    const shareText = `📄 ${file.title} — المكتبة والأرشيف (MedFur)`;
    const shareUrl = file.downloadUrl || window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: file.title, text: shareText, url: shareUrl });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setDownloadNotice('تم نسخ رابط ومعلومات الملف للمشاركة ✓');
      setTimeout(() => setDownloadNotice(null), 3000);
    } catch {
      // ignore
    }
  };

  const handleSendFileTelegram = (file: LibraryFileItem) => {
    const text = encodeURIComponent(`📄 ${file.title}\nحجم الملف: ${file.fileSize}\nعبر تطبيق MedFur`);
    const url = encodeURIComponent(file.downloadUrl || window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleOpenAddFileModal = () => {
    setFileToEdit(null);
    setNewFileTitle('');
    setNewFileType('تفريغ / نوطة');
    setNewFileAuthor('');
    setNewFileSize('يُقرأ تلقائياً من الملف');
    setNewFileSizeBytes(0);
    setNewFilePages(0);
    setDetectedFormat('PDF');
    setDetectedMimeType('application/pdf');
    setUploadedFileUrl('');
    setSelectedRawFile(null);
    setUploadedFileName(null);
    setIsAddFileModalOpen(true);
  };

  const handleOpenEditFileModal = (file: LibraryFileItem) => {
    setFileToEdit(file);
    setNewFileTitle(file.title);
    setNewFileType(file.fileType);
    setNewFileAuthor(file.author);
    setNewFileSize(file.fileSize);
    setNewFileSizeBytes(file.fileSizeBytes || 0);
    setNewFilePages(file.pages || 0);
    setDetectedFormat(file.format || 'PDF');
    setDetectedMimeType(file.mimeType || 'application/pdf');
    setUploadedFileUrl(file.downloadUrl || '');
    setSelectedRawFile(null);
    setUploadedFileName(null);
    setIsAddFileModalOpen(true);
  };

  const handleDeviceFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingMeta(true);
    setSelectedRawFile(file);
    setUploadedFileName(file.name);

    try {
      const meta = await extractDocumentMetadata(file);
      if (!newFileTitle.trim() || !fileToEdit) {
        setNewFileTitle(meta.cleanTitle);
      }
      setNewFileSize(meta.fileSize);
      setNewFileSizeBytes(meta.fileSizeBytes);
      setNewFilePages(meta.pages);
      setDetectedFormat(meta.format);
      setDetectedMimeType(meta.mimeType);

      if (file.size <= 2 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedFileUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setUploadedFileUrl('');
      }
    } finally {
      setIsExtractingMeta(false);
    }
  };

  const handleOpenAddFolderModal = () => {
    setFolderToEdit(null);
    setNewFolderName('');
    const currentFld = libraryFolders.find((f) => f.id === currentFolderId);
    const insideSemester = Boolean(
      currentFld && (currentFld.semesterBadge || currentFld.semester) && !currentFld.isSubject
    );
    setNewFolderIsSubject(insideSemester);
    setNewFolderSubjectId('');
    setNewFolderIcon('Anatomy');
    setNewFolderDepartment('');
    setNewFolderSemesterBadge('');
    setNewFolderCoverColor('');
    setNewFolderCoverLabel('');
    setNewFolderCoverImage('');
    setIsAddFolderModalOpen(true);
  };

  const handleOpenEditFolderModal = (fld: LibraryFolderItem) => {
    setFolderToEdit(fld);
    setNewFolderName(fld.name);
    setNewFolderIsSubject(Boolean(fld.isSubject || fld.subjectId));
    setNewFolderSubjectId(fld.subjectId || '');
    setNewFolderIcon(fld.icon || 'Anatomy');
    setNewFolderDepartment(fld.department || '');
    setNewFolderSemesterBadge(fld.semesterBadge || '');
    setNewFolderCoverColor(fld.coverColor || '');
    setNewFolderCoverLabel(fld.coverLabel || '');
    setNewFolderCoverImage(fld.coverImage || '');
    setIsAddFolderModalOpen(true);
  };

  const handleFolderCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewFolderCoverImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const payload = {
      name: newFolderName.trim(),
      isSubject: newFolderIsSubject,
      subjectId: newFolderIsSubject && newFolderSubjectId ? newFolderSubjectId : undefined,
      icon: newFolderIsSubject ? newFolderIcon : undefined,
      department: newFolderIsSubject && newFolderDepartment.trim() ? newFolderDepartment.trim() : undefined,
      semesterBadge: !newFolderIsSubject && newFolderSemesterBadge ? newFolderSemesterBadge : undefined,
      coverColor: newFolderCoverColor || undefined,
      coverLabel: newFolderCoverLabel.trim() || undefined,
      coverImage: newFolderCoverImage.trim() || undefined,
    };

    if (folderToEdit) {
      await updateLibraryFolder(folderToEdit.id, payload);
    } else {
      await addLibraryFolder({
        ...payload,
        parentId: currentFolderId,
      });
    }

    setFolderToEdit(null);
    setNewFolderName('');
    setIsAddFolderModalOpen(false);
  };

  const handleRenameFolder = async (folderId: string) => {
    if (!renamedFolderName.trim()) return;
    await renameLibraryFolder(folderId, renamedFolderName.trim());
    setRenamingFolderId(null);
    setRenamedFolderName('');
  };

  const handleSaveFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileTitle.trim()) return;

    const finalSize =
      newFileSize && newFileSize !== 'يُقرأ تلقائياً من الملف'
        ? newFileSize.trim()
        : '256 KB';

    if (fileToEdit) {
      if (selectedRawFile) {
        const medfurMeta = resolveFileMedFurMeta(
          fileToEdit.folderId,
          newFileTitle.trim(),
          detectedFormat
        );
        await saveOfflineMediaBlob(
          fileToEdit.id,
          selectedRawFile,
          medfurMeta.fileName,
          detectedMimeType,
          {
            title: newFileTitle.trim(),
            itemType: 'file',
            subtitle: newFileType,
            authorOrDoctor: newFileAuthor.trim() || 'الإشراف الأكاديمي',
            pages: newFilePages > 0 ? newFilePages : fileToEdit.pages,
            format: detectedFormat,
            virtualPath: medfurMeta.virtualPath,
          }
        );
        refreshState();
      }

      await updateLibraryFile(fileToEdit.id, {
        title: newFileTitle.trim(),
        fileType: newFileType,
        author: newFileAuthor.trim() || 'الإشراف الأكاديمي',
        fileSize: finalSize,
        fileSizeBytes: newFileSizeBytes || fileToEdit.fileSizeBytes,
        pages: newFilePages > 0 ? newFilePages : fileToEdit.pages,
        format: detectedFormat,
        mimeType: detectedMimeType,
        downloadUrl: uploadedFileUrl.trim() || fileToEdit.downloadUrl,
      });
    } else if (currentFolderId) {
      const createdId = await addLibraryFile({
        folderId: currentFolderId,
        title: newFileTitle.trim(),
        fileType: newFileType,
        author: newFileAuthor.trim() || 'الإشراف الأكاديمي',
        fileSize: finalSize,
        fileSizeBytes: newFileSizeBytes || undefined,
        pages: newFilePages > 0 ? newFilePages : undefined,
        format: detectedFormat,
        mimeType: detectedMimeType,
        downloadsCount: 0,
        downloadUrl: uploadedFileUrl.trim() || undefined,
      });

      if (selectedRawFile && createdId) {
        const medfurMeta = resolveFileMedFurMeta(
          currentFolderId,
          newFileTitle.trim(),
          detectedFormat
        );
        await saveOfflineMediaBlob(
          createdId,
          selectedRawFile,
          medfurMeta.fileName,
          detectedMimeType,
          {
            title: newFileTitle.trim(),
            itemType: 'file',
            subtitle: newFileType,
            authorOrDoctor: newFileAuthor.trim() || 'الإشراف الأكاديمي',
            pages: newFilePages > 0 ? newFilePages : undefined,
            format: detectedFormat,
            virtualPath: medfurMeta.virtualPath,
          }
        );
        refreshState();
      }
    }

    setFileToEdit(null);
    setNewFileTitle('');
    setUploadedFileUrl('');
    setSelectedRawFile(null);
    setUploadedFileName(null);
    setIsAddFileModalOpen(false);
  };

  const activeFolder = libraryFolders.find((f) => f.id === currentFolderId);

  const handleTopBackClick = () => {
    if (currentFolderId !== null) {
      const parent =
        libraryFolders.find((f) => f.id === currentFolderId)?.parentId || null;
      setCurrentFolderId(parent);
    } else {
      setActiveSection('home');
    }
  };

  const renderFileCard = (
    file: LibraryFileItem,
    index: number,
    totalCount: number
  ) => {
    const progress = activeDownloads[file.id];
    const isDownloading = progress?.status === 'downloading';
    const isOffline = cachedIds.includes(file.id);
    const isFavorite = favoriteFileIds.includes(file.id);
    const medfurMeta = resolveFileMedFurMeta(
      file.folderId,
      file.title,
      file.format || 'pdf'
    );

    return (
      <div
        key={file.id}
        dir="rtl"
        onClick={() => handlePrimaryFileClick(file)}
        className="group bg-[#161F30] hover:bg-[#1B263B] border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer flex items-center justify-between gap-3 text-right min-w-0 shadow-xs"
      >
        {/* Right: PDF Icon with Download Badge / Circular Progress Ring + Title */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <MediaIconWithCircularProgress
            type="pdf"
            formatLabel={file.format || 'PDF'}
            isDownloaded={isOffline}
            isDownloading={isDownloading}
            progressPercent={progress?.percent || 0}
            onStartOrOpen={() => handlePrimaryFileClick(file)}
            onCancelDownload={() => cancelManagedDownload(file.id)}
          />

          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="font-black text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors leading-snug break-words">
              {file.title}
            </h4>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-400 tabular-nums">
              <span>{file.fileSize}</span>
              <span>•</span>
              <span className="uppercase">{file.format || 'PDF'}</span>
              {file.pages && file.pages > 0 ? (
                <>
                  <span>•</span>
                  <span>{file.pages} صفحة</span>
                </>
              ) : null}
              {isDownloading && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400">
                    جاري التحميل {progress?.percent || 0}%
                  </span>
                </>
              )}
              {isFavorite && (
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline mr-1" />
              )}
            </div>
          </div>
        </div>

        {/* Left: 3-Dots Context Menu (Page 3) + Optional Admin Arrows */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {isAdmin && (
            <div className="hidden sm:flex items-center gap-0.5 mr-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveLibraryFile(file.id, 'up')}
                className="p-1.5 text-slate-400 hover:text-emerald-400 disabled:opacity-30 rounded-lg cursor-pointer"
                title="تحريك للأعلى"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={index === totalCount - 1}
                onClick={() => moveLibraryFile(file.id, 'down')}
                className="p-1.5 text-slate-400 hover:text-emerald-400 disabled:opacity-30 rounded-lg cursor-pointer"
                title="تحريك للأسفل"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => togglePinLibraryFile(file.id)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  file.isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'
                }`}
                title="تثبيت"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <MediaThreeDotsMenu
            title={file.title}
            isFavorite={isFavorite}
            isDownloaded={isOffline}
            isAdmin={isAdmin}
            onToggleFavorite={() => toggleFavoriteFile(file.id)}
            onDownloadOffline={() => handleDownloadFile(file, true)}
            onShare={() => handleShareFile(file)}
            onSendTelegram={() => handleSendFileTelegram(file)}
            onOpenExternal={() => {
              launchMediaInExternalPlayer({
                id: file.id,
                url: file.downloadUrl,
                fileName: medfurMeta.fileName,
                mimeType: file.mimeType || 'application/pdf',
                title: file.title,
              });
            }}
            onEdit={isAdmin ? () => handleOpenEditFileModal(file) : undefined}
            onDelete={
              isAdmin
                ? () =>
                    setConfirmDialog({
                      isOpen: true,
                      title: 'حذف الملف الأكاديمي',
                      message: 'هل أنت متأكد من حذف هذا الملف من المكتبة نهائياً؟',
                      itemName: file.title,
                      onConfirm: async () => {
                        await removeOfflineMediaRecord(file.id);
                        await deleteLibraryFile(file.id);
                        refreshState();
                      },
                    })
                : undefined
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div
      dir="rtl"
      className="w-full max-w-4xl mx-auto px-3 sm:px-5 py-3 sm:py-4 space-y-3.5 text-right overflow-x-hidden"
    >
      {/* 1. EMERALD HEADER CARD (Matching Pages 1, 2, 3, 4, 5) */}
      <div className="bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5 dark-surface-preserve">
        <div className="flex items-center justify-between gap-3">
          {/* Right: Circular Back Button + Title & Subtitle */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleTopBackClick}
              aria-label="رجوع"
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                المكتبة والأرشيف
              </h1>
              <p className="text-xs text-emerald-50/90 font-bold truncate mt-0.5">
                {activeFolder
                  ? `📁 ${activeFolder.name}`
                  : 'ملفات ومراجع الكلية بمكان واحد'}
              </p>
            </div>
          </div>

          {/* Left: Circular Search Button + Admin Upload Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleOpenAddFolderModal}
                  className="px-3 py-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                  title="إضافة مجلد"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">مجلد</span>
                </button>
                {currentFolderId && (
                  <button
                    type="button"
                    onClick={handleOpenAddFileModal}
                    className="px-3 py-2 rounded-2xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs"
                    title="رفع ملف"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">رفع ملف</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setShowSearchBar((prev) => !prev)}
              aria-label="بحث في المكتبة"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                showSearchBar || searchQuery
                  ? 'bg-white text-emerald-700'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional Collapsible Search Input */}
        {(showSearchBar || searchQuery.trim() !== '') && (
          <div className="relative animate-in fade-in duration-150">
            <Search className="w-4 h-4 text-white/70 absolute right-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث عن ملف أو محاضرة أو مرجع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-9 py-2.5 rounded-2xl bg-black/25 border border-white/20 text-xs sm:text-sm font-bold text-white placeholder:text-white/70 focus:outline-hidden focus:border-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Bottom Stat Pills inside Emerald Header */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums">
            <Folder className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>{currentSubFolders.length} مجلد</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums">
            <FileText className="w-3.5 h-3.5 text-emerald-200" />
            <span>{displayedFiles.length} ملف</span>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION CARD: 3 Tabs (السحابية | تنزيلاتي | مفضلتي) + Breadcrumb Bar */}
      <div className="bg-[#161F30] border border-slate-800/80 rounded-3xl p-2.5 sm:p-3 space-y-2.5 shadow-sm">
        {/* Row 1: 3 Main Tabs */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveLibraryTab('cloud')}
            className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeLibraryTab === 'cloud'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>السحابية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLibraryTab('downloads')}
            className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeLibraryTab === 'downloads'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تنزيلاتي</span>
            {cachedIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] tabular-nums">
                {cachedIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveLibraryTab('favorites')}
            className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeLibraryTab === 'favorites'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>مفضلتي</span>
            {favoriteFileIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] tabular-nums">
                {favoriteFileIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Breadcrumb Bar */}
        {activeLibraryTab === 'cloud' && (
          <div className="bg-[#0F1726] border border-slate-800/70 rounded-2xl px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            {currentFolderId !== null && (
              <button
                type="button"
                onClick={() => {
                  const parent =
                    libraryFolders.find((f) => f.id === currentFolderId)
                      ?.parentId || null;
                  setCurrentFolderId(parent);
                }}
                className="w-7 h-7 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 cursor-pointer ml-1"
                title="رجوع للمجلد السابق"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setCurrentFolderId(null)}
              className={`px-2.5 py-1 rounded-xl font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                currentFolderId === null
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>الرئيسية</span>
            </button>

            {breadcrumbTrail.map((crumb, idx) => {
              const isLast = idx === breadcrumbTrail.length - 1;
              return (
                <React.Fragment key={crumb.id}>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <button
                    type="button"
                    onClick={() => setCurrentFolderId(crumb.id)}
                    className={`px-2.5 py-1 rounded-xl whitespace-nowrap cursor-pointer transition-colors ${
                      isLast
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black'
                        : 'text-slate-400 hover:text-white font-bold'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. FILTER, SORT & VIEW MODE BAR */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* File Type Filter Select */}
          <select
            value={selectedFileTypeFilter}
            onChange={(e) => setSelectedFileTypeFilter(e.target.value)}
            aria-label="تصفية حسب نوع الملف"
            className="px-3.5 py-2 rounded-2xl bg-[#161F30] border border-slate-800/80 text-xs font-black text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
          >
            <option value="الكل">كل الملفات</option>
            <option value="محاضرة">محاضرات</option>
            <option value="تفريغ / نوطة">تفريغ / نوطة</option>
            <option value="سلايدات">سلايدات</option>
            <option value="كتاب / مرجع">كتاب / مرجع</option>
          </select>

          {/* Sort Select */}
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as LibrarySortOption)}
              aria-label="ترتيب الملفات"
              className="px-3.5 py-2 rounded-2xl bg-[#161F30] border border-slate-800/80 text-xs font-black text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="newest">ترتيب: الأحدث</option>
              <option value="alpha">ترتيب: أبجدياً</option>
              <option value="size">ترتيب: الحجم</option>
            </select>
          </div>
        </div>

        {/* Grid / List View Toggle */}
        <button
          type="button"
          onClick={() => setViewMode((prev) => (prev === 'list' ? 'grid' : 'list'))}
          aria-label="تغيير طريقة العرض"
          className="w-10 h-10 rounded-2xl bg-[#161F30] border border-slate-800/80 text-slate-300 hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
        >
          {viewMode === 'list' ? (
            <LayoutGrid className="w-4 h-4" />
          ) : (
            <List className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Toast Notice */}
      {downloadNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
        </div>
      )}

      {/* 4. FOLDERS & FILES CONTENT */}
      <div className="space-y-2.5">
        {/* Sub-Folders List (Clean dark cards matching Page 1) */}
        {currentSubFolders.length > 0 && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
                : 'space-y-2.5'
            }
          >
            {currentSubFolders.map((fld, idx) => {
              const isSubjectFolder = Boolean(fld.isSubject || fld.subjectId);
              const linkedSubject = fld.subjectId
                ? subjects.find((s) => s.id === fld.subjectId)
                : undefined;
              const resolvedMedical = isSubjectFolder
                ? resolveSubjectMedicalIcon({
                    name: fld.name,
                    icon: fld.icon || linkedSubject?.icon || '',
                    color: fld.coverColor || linkedSubject?.color,
                    department: fld.department || linkedSubject?.department,
                  })
                : null;

              return (
                <div
                  key={fld.id}
                  onClick={() => setCurrentFolderId(fld.id)}
                  className="group bg-[#161F30] hover:bg-[#1B263B] border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                      {isSubjectFolder && resolvedMedical ? (
                        <SubjectMedicalIcon
                          subject={{
                            name: fld.name,
                            icon: fld.icon || linkedSubject?.icon || '',
                            color: resolvedMedical.accentColor,
                            department: fld.department || linkedSubject?.department,
                          }}
                          className="w-6 h-6"
                        />
                      ) : (
                        <Folder className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {renamingFolderId === fld.id ? (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={renamedFolderName}
                            onChange={(e) => setRenamedFolderName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameFolder(fld.id)}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs rounded-xl font-bold cursor-pointer shrink-0"
                          >
                            حفظ
                          </button>
                        </div>
                      ) : (
                        <h4 className="font-black text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors break-words">
                          {fld.name}
                        </h4>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isAdmin && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 ml-1"
                      >
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveLibraryFolder(fld.id, 'up')}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 disabled:opacity-30 rounded-lg cursor-pointer"
                          title="تحريك للأعلى"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === currentSubFolders.length - 1}
                          onClick={() => moveLibraryFolder(fld.id, 'down')}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 disabled:opacity-30 rounded-lg cursor-pointer"
                          title="تحريك للأسفل"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditFolderModal(fld)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg cursor-pointer"
                          title="تعديل المجلد"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              isOpen: true,
                              title: 'حذف المجلد ومحتوياته',
                              message:
                                'هل أنت متأكد من حذف هذا المجلد وجميع المجلدات الفرعية والملفات الموجودة بداخله؟',
                              itemName: fld.name,
                              onConfirm: () => deleteLibraryFolder(fld.id),
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                          title="حذف المجلد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Files List */}
        {displayedFiles.length > 0 && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
                : 'space-y-2.5'
            }
          >
            {displayedFiles.map((file, idx) =>
              renderFileCard(file, idx, displayedFiles.length)
            )}
          </div>
        )}

        {/* Empty State */}
        {currentSubFolders.length === 0 && displayedFiles.length === 0 && (
          <div className="text-center py-14 bg-[#161F30] rounded-3xl border border-slate-800/80 p-6 space-y-2.5">
            <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="text-xs sm:text-sm font-black text-slate-300">
              {activeLibraryTab === 'downloads'
                ? 'لا توجد ملفات محملة أوفلاين بعد'
                : activeLibraryTab === 'favorites'
                  ? 'لا توجد ملفات مضافة للمفضلة بعد'
                  : 'لا توجد ملفات أو مجلدات في هذا المسار حالياً'}
            </p>
            {isAdmin && activeLibraryTab === 'cloud' && currentFolderId && (
              <button
                type="button"
                onClick={handleOpenAddFileModal}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                رفع أول ملف في هذا المجلد
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Folder Modal with Custom Cover & Subject Toggle */}
      {isAddFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0E172A] border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl text-right max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm">
                {folderToEdit
                  ? `تعديل وتخصيص المجلد: ${folderToEdit.name}`
                  : `إضافة مجلد جديد داخل: ${
                      activeFolder ? activeFolder.name : 'المكتبة الرئيسية'
                    }`}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFolderModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              {/* 1. Folder Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                  اسم المجلد:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: الفصل الأول، أو التشريح البشري..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              {/* 2. Specify whether this folder is a Subject or not (تحديد هل هذا مادة أو لا) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                  نوع المجلد (تحديد هل هذا المجلد مادة دراسية أو لا):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewFolderIsSubject(false)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      !newFolderIsSubject
                        ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Folder className="w-4 h-4" />
                    <span>مجلد عام / فصل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewFolderIsSubject(true)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newFolderIsSubject
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>نعم، مادة دراسية</span>
                  </button>
                </div>

                {/* If NOT a subject: optional semester 1 / 2 badge */}
                {!newFolderIsSubject ? (
                  <div className="pt-1 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      شارة الفصل الدراسي (اختياري):
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                      {(
                        [
                          { val: '', label: 'بدون رقم' },
                          { val: '1', label: '1 (فصل أول)' },
                          { val: '2', label: '2 (فصل ثاني)' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.val || 'none'}
                          type="button"
                          onClick={() => setNewFolderSemesterBadge(opt.val)}
                          className={`py-2 rounded-xl border cursor-pointer transition-all ${
                            newFolderSemesterBadge === opt.val
                              ? 'bg-purple-600/20 border-purple-500 text-purple-600 dark:text-purple-300'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* If IS a Subject: Link to Automation Subject OR pick Medical Icon */
                  <div className="pt-1 space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        ربط سريع بمادة من بنك الأتمتة (يرث الرمز واللون تلقائياً):
                      </label>
                      <select
                        value={newFolderSubjectId}
                        onChange={(e) => {
                          const subId = e.target.value;
                          setNewFolderSubjectId(subId);
                          const found = subjects.find((s) => s.id === subId);
                          if (found) {
                            if (!newFolderName.trim()) setNewFolderName(found.name);
                            setNewFolderIcon(found.icon);
                            setNewFolderCoverColor(found.color || '');
                            setNewFolderDepartment(found.department || '');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="">— اختيار مخصص للمادة والرمز —</option>
                        {subjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name} ({sub.department || 'مقرر طبي'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                        رمز المادة الطبية (نفس رموز بنك الأتمتة):
                      </label>
                      <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1">
                        {MEDICAL_ICON_OPTIONS.slice(0, 16).map((opt) => {
                          const isSelected = newFolderIcon === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                setNewFolderIcon(opt.key);
                                if (!newFolderCoverColor) {
                                  setNewFolderCoverColor(opt.defaultColor);
                                }
                              }}
                              className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 dark:text-emerald-300'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <SubjectMedicalIcon
                                subject={{
                                  name: opt.label,
                                  icon: opt.key,
                                  color: opt.defaultColor,
                                }}
                                className="w-4 h-4"
                              />
                              <span className="truncate w-full text-center">
                                {opt.label.split(' ')[0]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Customize Folder Cover (تخصيص غلاف المجلد) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-purple-500" />
                    <span>تخصيص غلاف المجلد (اختياري)</span>
                  </span>
                  {(newFolderCoverColor || newFolderCoverLabel || newFolderCoverImage) && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewFolderCoverColor('');
                        setNewFolderCoverLabel('');
                        setNewFolderCoverImage('');
                      }}
                      className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                    >
                      إزالة الغلاف
                    </button>
                  )}
                </div>

                {/* Preset Color / Gradient Covers */}
                <div className="grid grid-cols-5 gap-1.5">
                  {FOLDER_COVER_PRESETS.map((preset) => {
                    const active = newFolderCoverColor === preset.color;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setNewFolderCoverColor(preset.color);
                          if (!newFolderCoverLabel) {
                            setNewFolderCoverLabel(preset.badgeText);
                          }
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          active
                            ? 'bg-slate-800 border-white text-white scale-105'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <span
                          style={{ backgroundColor: preset.color }}
                          className="w-4 h-4 rounded-full"
                        />
                        <span className="text-[9px] font-bold truncate w-full text-center">
                          {preset.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Cover Badge Label & Cover Image */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      عنوان شارة الغلاف:
                    </label>
                    <input
                      type="text"
                      placeholder="مثلاً: مقرر وزاري، نوط..."
                      value={newFolderCoverLabel}
                      onChange={(e) => setNewFolderCoverLabel(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                      صورة غلاف مخصصة:
                    </label>
                    <input
                      type="file"
                      ref={folderCoverInputRef}
                      accept="image/*"
                      onChange={handleFolderCoverFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => folderCoverInputRef.current?.click()}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-purple-500/40 hover:border-purple-400 text-xs font-bold text-purple-600 dark:text-purple-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{newFolderCoverImage ? 'تم اختيار صورة غلاف ✓' : 'رفع صورة غلاف'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                {folderToEdit ? 'حفظ تعديلات المجلد والغلاف' : 'إنشاء المجلد الآن'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit File Modal (Responsive Mobile Bottom Sheet) */}
      {isAddFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#0E172A] border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl text-right max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm">
                {fileToEdit
                  ? 'تعديل بيانات الملف / النوطة'
                  : `رفع ملف داخل: ${activeFolder?.name || 'المجلد'}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFileModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFileSubmit} className="space-y-3.5">
              <input
                type="file"
                ref={deviceFileInputRef}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                onChange={handleDeviceFileSelect}
                className="hidden"
              />

              <div
                onClick={() => deviceFileInputRef.current?.click()}
                className="p-4 rounded-2xl border border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-50 dark:bg-slate-900/70 text-center cursor-pointer transition-colors space-y-1.5"
              >
                <Upload className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 break-words">
                  {uploadedFileName
                    ? `تم اختيار الملف: ${uploadedFileName}`
                    : 'انقر لاختيار ملف PDF أو وثيقة من جهازك'}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold">
                  {isExtractingMeta
                    ? 'جاري قراءة عدد الصفحات الفعلي وحجم الملف...'
                    : 'يتم أخذ عدد الصفحات الفعلي وحجم الملف الحقيقي من الملف مباشرةً'}
                </p>
              </div>

              {/* Automated Metadata Preview Card */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 tabular-nums flex-wrap font-bold">
                  <span className="text-purple-600 dark:text-purple-300">
                    {detectedFormat}
                  </span>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-300">
                    الحجم: {newFileSize}
                  </span>
                  <span>·</span>
                  <span className="text-sky-600 dark:text-sky-300">
                    الصفحات: {newFilePages > 0 ? `${newFilePages} صفحة` : 'تلقائي'}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>مستخرج تلقائياً</span>
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  عنوان الملف / النوطة:
                </label>
                <input
                  type="text"
                  required
                  placeholder="يُملأ تلقائياً عند اختيار الملف أو اكتبه هنا..."
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    تصنيف الملف:
                  </label>
                  <InAppSelect<LibraryFileItem['fileType']>
                    value={newFileType}
                    onChange={(val) => setNewFileType(val)}
                    size="sm"
                    options={[
                      { value: 'محاضرة', label: 'محاضرة' },
                      { value: 'تفريغ / نوطة', label: 'تفريغ / نوطة' },
                      { value: 'سلايدات', label: 'سلايدات (سلايد)' },
                      { value: 'كتاب / مرجع', label: 'كتاب / مرجع' },
                      { value: 'دورة امتحانية', label: 'دورة امتحانية' },
                      { value: 'أخرى', label: 'أخرى' },
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    إعداد / تأليف (اختياري):
                  </label>
                  <input
                    type="text"
                    placeholder="اسم الدكتور أو الفريق العلمي"
                    value={newFileAuthor}
                    onChange={(e) => setNewFileAuthor(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  أو رابط ملف خارجي مباشر (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/lecture.pdf"
                  value={
                    uploadedFileUrl.startsWith('data:') ? '' : uploadedFileUrl
                  }
                  onChange={(e) => setUploadedFileUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden text-left font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isExtractingMeta}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
              >
                {fileToEdit
                  ? 'حفظ تعديلات الملف'
                  : 'نشر الملف وحفظه في المجلد'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Contextual DownloadManager Modal */}
      <DownloadManager
        variant="modal-only"
        isOpen={isDownloadManagerOpen}
        onClose={() => setIsDownloadManagerOpen(false)}
        onOpenMediaItem={handleOpenFromDownloadManager}
      />

      {/* Fast Chooser Modal (In-App Reader vs External Player) */}
      <MediaLaunchChoiceModal
        target={launchChoiceTarget}
        onClose={() => setLaunchChoiceTarget(null)}
        onOpenInApp={(target) => {
          setLaunchChoiceTarget(null);
          const foundFile = libraryFiles.find((f) => f.id === target.id);
          if (foundFile) {
            openFileDirectlyInApp(foundFile);
          } else {
            setViewerItem({
              id: target.id,
              type: 'file',
              title: target.title,
              subtitle: target.subtitle,
              authorOrDoctor: target.authorOrDoctor,
              fileSize: target.fileSize,
              pages: target.pages,
              format: target.format,
              url: target.url,
              mimeType: target.mimeType,
            });
          }
        }}
        onDownloadBoth={(target) => {
          const foundFile = libraryFiles.find((f) => f.id === target.id);
          if (foundFile) {
            handleDownloadFile(foundFile);
          }
        }}
      />

      {/* In-App File & PDF Viewer Modal */}
      <InAppMediaViewerModal
        item={viewerItem}
        onClose={() => setViewerItem(null)}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};
