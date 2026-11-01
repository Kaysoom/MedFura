import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Folder,
  FolderPlus,
  FileText,
  Download,
  Plus,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronLeft,
  Search,
  BookOpen,
  CheckCircle2,
  X,
  Upload,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Pin,
  Eye,
  HardDriveDownload,
  Palette,
  Image as ImageIcon,
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
  InlineDownloadStatus,
  useDownloadManager,
} from '../Common/DownloadManager';
import { getDensityLayoutClasses } from '../../utils/settingsAndDensityLogic';
import { buildStructuredMedFurFileName } from '../../utils/mediaAndOfflineLogic';

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
    uiDensity,
  } = useApp();

  const density = getDensityLayoutClasses(uiDensity);

  const {
    activeDownloads,
    cachedIds,
    cachedRecords,
    isDownloadingCount,
    refreshState,
  } = useDownloadManager();

  // Navigation State: current folder id in hierarchy (null = root level)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileTypeFilter, setSelectedFileTypeFilter] = useState<string>('الكل');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);

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

  // Current sub-folders sorted by Admin orderIndex
  const currentSubFolders = useMemo(() => {
    return libraryFolders
      .filter((f) => f.parentId === currentFolderId)
      .sort((a, b) => (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999));
  }, [libraryFolders, currentFolderId]);

  // Files in the current folder sorted by Pinned first, then Admin orderIndex
  const currentFolderFiles = useMemo(() => {
    if (!currentFolderId) return [];
    let list = libraryFiles.filter((f) => f.folderId === currentFolderId);
    if (selectedFileTypeFilter !== 'الكل') {
      list = list.filter((f) => f.fileType === selectedFileTypeFilter);
    }
    return [...list].sort((a, b) => {
      if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
        return b.isPinned ? 1 : -1;
      }
      return (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999);
    });
  }, [libraryFiles, currentFolderId, selectedFileTypeFilter]);

  // Search Results if search query is entered
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return libraryFiles
      .filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.author.toLowerCase().includes(q) ||
          f.fileType.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
          return b.isPinned ? 1 : -1;
        }
        return (a.orderIndex ?? 9999) - (b.orderIndex ?? 9999);
      });
  }, [libraryFiles, searchQuery]);

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

  // Show fast chooser modal (In-App vs External Player) when clicking a file
  const handleOpenFileInApp = (file: LibraryFileItem) => {
    const medfurMeta = resolveFileMedFurMeta(
      file.folderId,
      file.title,
      file.format || 'pdf'
    );
    setLaunchChoiceTarget({
      id: file.id,
      type: 'file',
      title: file.title,
      subtitle: file.fileType,
      authorOrDoctor: file.author,
      fileName: medfurMeta.fileName,
      virtualPath: medfurMeta.virtualPath,
      url: file.downloadUrl,
      mimeType: file.mimeType || 'application/pdf',
      fileSize: file.fileSize,
      pages: file.pages,
      format: file.format || 'PDF',
      isCachedOffline: cachedIds.includes(file.id),
    });
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

  // Real Download with Byte Progress Bar, IndexedDB Caching & External Device Save with MedFur Filename
  const handleDownloadFile = async (file: LibraryFileItem) => {
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
        saveToDevice: true,
      });

      refreshState();
      await updateLibraryFile(file.id, {
        downloadsCount: (file.downloadsCount || 0) + 1,
      });

      setDownloadNotice(
        `تم حفظ الملف داخل التطبيق وتنزيله لجهازك بالاسم المنظم: ${medfurMeta.fileName}`
      );
      setTimeout(() => {
        setDownloadNotice(null);
      }, 4500);
    } catch {
      // Error state is displayed by InlineDownloadStatus
    }
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
    // Default to isSubject=true when inside a semester folder
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

  const renderFileCard = (
    file: LibraryFileItem,
    index: number,
    totalCount: number
  ) => {
    const progress = activeDownloads[file.id];
    const isOffline = cachedIds.includes(file.id);

    return (
      <div
        key={file.id}
        dir="rtl"
        className={`bg-white dark:bg-[#131D2E] hover:border-purple-500/50 border ${
          file.isPinned
            ? 'border-amber-500/60 shadow-amber-500/5'
            : 'border-slate-200 dark:border-slate-800'
        } rounded-2xl p-3.5 sm:p-4 space-y-3 text-right min-w-0 transition-all shadow-xs`}
      >
        {/* Top Row: Icon + File Info */}
        <div
          onClick={() => handleOpenFileInApp(file)}
          className="flex items-start gap-3 cursor-pointer group min-w-0"
        >
          <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold">
              <span className="text-purple-600 dark:text-purple-300">
                {file.fileType}
              </span>
              {file.isPinned && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-amber-500 flex items-center gap-0.5">
                    <Pin className="w-3 h-3" />
                    <span>مثبت</span>
                  </span>
                </>
              )}
              {isOffline && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>محفوظ مؤقتاً</span>
                  </span>
                </>
              )}
            </div>

            <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors break-words leading-snug">
              {file.title}
            </h4>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {file.author && (
                <>
                  <span className="truncate max-w-[180px]">{file.author}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {file.fileSize}
              </span>
              {file.pages && file.pages > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-sky-600 dark:text-sky-300 font-bold">
                    {file.pages} صفحة
                  </span>
                </>
              ) : null}
              {file.format && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase font-mono">{file.format}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Visual Download & Temporary Cache Status Bar inside Library Card */}
        <InlineDownloadStatus
          itemId={file.id}
          itemType="file"
          progress={progress}
          isCached={isOffline}
          cachedSize={file.fileSize}
          onStartDownload={() => handleDownloadFile(file)}
          onOpenInApp={() => handleOpenFileInApp(file)}
        />

        {/* Bottom Action Row: Responsive Full-Width Buttons on Mobile */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            {/* Open Chooser (In-App or External Player) Button */}
            <button
              type="button"
              onClick={() => handleOpenFileInApp(file)}
              className="flex-1 sm:flex-initial min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Eye className="w-4 h-4 shrink-0" />
              <span>فتح (بالتطبيق أو خارجي)</span>
            </button>

            {/* Real Download with Dual Save (App + Device MedFur Name) Button */}
            <button
              type="button"
              disabled={progress?.status === 'downloading'}
              onClick={() => handleDownloadFile(file)}
              className={`flex-1 sm:flex-initial min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                isOffline
                  ? 'bg-purple-500/15 border border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {progress?.status === 'downloading' ? (
                <>
                  <HardDriveDownload className="w-4 h-4 animate-bounce shrink-0" />
                  <span>{progress.percent}%</span>
                </>
              ) : isOffline ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>محفوظ · تنزيل نسخة للجهاز</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 shrink-0" />
                  <span>تنزيل (للتطبيق والجهاز)</span>
                </>
              )}
            </button>
          </div>

          {/* Admin Toolbar */}
          {isAdmin && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-1 mr-auto sm:mr-0">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveLibraryFile(file.id, 'up')}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-500 disabled:opacity-30 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="تحريك الملف للأعلى"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={index === totalCount - 1}
                onClick={() => moveLibraryFile(file.id, 'down')}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-500 disabled:opacity-30 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="تحريك الملف للأسفل"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => togglePinLibraryFile(file.id)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  file.isPinned
                    ? 'text-amber-500 bg-amber-500/15'
                    : 'text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-800'
                }`}
                title={
                  file.isPinned ? 'إلغاء تثبيت الملف' : 'تثبيت الملف في الأعلى'
                }
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditFileModal(file)}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="تعديل بيانات الملف"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
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
                }
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="حذف الملف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      dir="rtl"
      className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-3.5 sm:py-5 space-y-4 text-right overflow-x-hidden"
    >
      {/* Responsive Mobile & Desktop Top Header */}
      <div className="bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {currentFolderId && (
              <button
                type="button"
                onClick={() => {
                  const parent =
                    libraryFolders.find((f) => f.id === currentFolderId)
                      ?.parentId || null;
                  setCurrentFolderId(parent);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
                title="الرجوع للمجلد السابق"
              >
                <ChevronRight className="w-4 h-4" />
                <span>رجوع</span>
              </button>
            )}

            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-black text-slate-900 dark:text-white truncate">
                المكتبة والأرشيف الأكاديمي
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {activeFolder
                  ? `المجلد الحالي: ${activeFolder.name}`
                  : 'تصفح المحاضرات والنوط والدورات مع الحفظ المؤقت بدون إنترنت'}
              </p>
            </div>
          </div>

          {/* Action Buttons: Download Manager + Admin Controls */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsDownloadManagerOpen(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              title="إدارة التنزيلات والملفات المحفوظة مؤقتاً"
            >
              <HardDriveDownload
                className={`w-4 h-4 text-emerald-500 ${
                  isDownloadingCount > 0 ? 'animate-bounce' : ''
                }`}
              />
              <span>مدير التنزيلات</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-black tabular-nums">
                {cachedRecords.length}
              </span>
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleOpenAddFolderModal}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="إضافة مجلد جديد وتخصيص غلافه"
                >
                  <FolderPlus className="w-4 h-4 shrink-0" />
                  <span>إضافة مجلد</span>
                </button>

                {currentFolderId && (
                  <button
                    type="button"
                    onClick={handleOpenAddFileModal}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="إضافة ملف داخل هذا المجلد"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>رفع ملف</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* File Search Bar */}
        <div className="relative">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث عن نوطة، تفريغ، دورة امتحانية، أو اسم المادة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-12 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-purple-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 hover:text-rose-500 cursor-pointer"
            >
              مسح
            </button>
          )}
        </div>

        {/* Breadcrumbs Navigation Strip */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setCurrentFolderId(null)}
            className={`hover:text-purple-500 font-bold whitespace-nowrap cursor-pointer ${
              currentFolderId === null
                ? 'text-purple-600 dark:text-purple-400 font-black'
                : ''
            }`}
          >
            الرئيسية (المكتبة)
          </button>

          {breadcrumbTrail.map((crumb, idx) => {
            const isLast = idx === breadcrumbTrail.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                <span className="text-slate-400">/</span>
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={`hover:text-purple-500 whitespace-nowrap cursor-pointer ${
                    isLast
                      ? 'text-purple-600 dark:text-purple-400 font-black'
                      : 'font-semibold'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {downloadNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsDownloadManagerOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shrink-0 cursor-pointer"
          >
            عرض التنزيلات
          </button>
        </div>
      )}

      {/* SEARCH RESULTS VIEW */}
      {searchQuery.trim() !== '' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>نتائج البحث ({searchResults.length}):</span>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#131D2E] rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              لم يتم العثور على أي ملفات تطابق &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className={density.libraryFilesGrid}>
              {searchResults.map((file, idx) =>
                renderFileCard(file, idx, searchResults.length)
              )}
            </div>
          )}
        </div>
      ) : (
        /* HIERARCHICAL FOLDERS & FILES VIEW */
        <div className="space-y-5">
          {/* Sub-Folders Grid */}
          {currentSubFolders.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <h3 className="text-xs sm:text-sm font-black text-slate-600 dark:text-slate-300">
                  {currentFolderId === null
                    ? 'المجلدات والسنوات الدراسية:'
                    : 'المجلدات الفرعية والمقررات:'}
                </h3>
                {isAdmin && (
                  <span className="text-[11px] text-slate-400 font-bold">
                    ترتيب المجلدات متاح بأسهم (↑ ↓)
                  </span>
                )}
              </div>

              <div className={density.libraryFoldersGrid}>
                {currentSubFolders.map((fld, idx) => {
                  const childFolderCount = libraryFolders.filter(
                    (f) => f.parentId === fld.id
                  ).length;
                  const childFileCount = libraryFiles.filter(
                    (f) => f.folderId === fld.id
                  ).length;

                  const isRootYearFolder = fld.parentId === null;
                  const isSubjectFolder = Boolean(fld.isSubject || fld.subjectId);
                  const semBadge: '1' | '2' | null =
                    !isRootYearFolder && !isSubjectFolder
                      ? fld.semesterBadge ||
                        (fld.semester === 'first'
                          ? '1'
                          : fld.semester === 'second'
                          ? '2'
                          : null)
                      : null;

                  // Resolve medical icon & accent color for Subject folders (identical to Automation Bank)
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

                  const activeAccentColor =
                    fld.coverColor ||
                    resolvedMedical?.accentColor ||
                    (semBadge === '1'
                      ? '#10B981'
                      : semBadge === '2'
                      ? '#0EA5E9'
                      : undefined);

                  const hasCustomBanner = Boolean(fld.coverImage || fld.coverLabel);

                  return (
                    <div
                      key={fld.id}
                      onClick={() => setCurrentFolderId(fld.id)}
                      style={
                        activeAccentColor && !isRootYearFolder
                          ? { borderColor: `${activeAccentColor}35` }
                          : undefined
                      }
                      className="group bg-white dark:bg-[#131D2E] hover:border-purple-500/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs"
                    >
                      {/* Optional Custom Folder Cover Banner (when coverImage or coverLabel is customized) */}
                      {hasCustomBanner && (
                        <div
                          style={
                            fld.coverImage
                              ? {
                                  backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.35), rgba(15,23,42,0.85)), url(${fld.coverImage})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }
                              : activeAccentColor
                              ? {
                                  background: `linear-gradient(135deg, ${activeAccentColor}33 0%, rgba(15,23,42,0.9) 100%)`,
                                }
                              : undefined
                          }
                          className="h-14 px-3.5 py-2 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/80 bg-gradient-to-l from-purple-600/25 to-slate-900"
                        >
                          <span className="px-2 py-0.5 rounded-lg bg-black/45 backdrop-blur-xs text-[10px] font-black text-white border border-white/15">
                            {fld.coverLabel || (isSubjectFolder ? 'مادة دراسية' : 'مجلد مخصص')}
                          </span>
                          {isSubjectFolder && (
                            <span className="text-[10px] font-bold text-slate-200 truncate max-w-[140px]">
                              {fld.department || linkedSubject?.department || 'مقرر أكاديمي'}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="p-3.5 sm:p-4 flex flex-col justify-between gap-3 flex-1">
                        {/* Primary Folder Row: Icon + Name + Count + Chevron */}
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Folder Icon Box:
                                1. Root Year Folders -> Kept as standard Folder icon
                                2. Semester Folders -> Bold '1' or '2' badge + Folder
                                3. Subject Folders -> Exact Automation Bank SubjectMedicalIcon & Color */}
                            {isRootYearFolder && !isSubjectFolder ? (
                              <div
                                style={
                                  fld.coverColor
                                    ? {
                                        backgroundColor: `${fld.coverColor}20`,
                                        borderColor: `${fld.coverColor}45`,
                                        color: fld.coverColor,
                                      }
                                    : undefined
                                }
                                className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0"
                              >
                                <Folder className="w-5 h-5" />
                              </div>
                            ) : semBadge ? (
                              <div
                                className={`relative w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${
                                  semBadge === '1'
                                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500 dark:text-emerald-400'
                                    : 'bg-sky-500/15 border-sky-500/35 text-sky-500 dark:text-sky-400'
                                }`}
                              >
                                <Folder className="w-5 h-5 opacity-25" />
                                <span className="absolute inset-0 flex items-center justify-center font-black text-base tabular-nums">
                                  {semBadge}
                                </span>
                              </div>
                            ) : isSubjectFolder ? (
                              <div
                                style={
                                  activeAccentColor
                                    ? {
                                        backgroundColor: `${activeAccentColor}20`,
                                        borderColor: `${activeAccentColor}45`,
                                        color: activeAccentColor,
                                      }
                                    : undefined
                                }
                                className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0"
                              >
                                <SubjectMedicalIcon
                                  subject={{
                                    name: fld.name,
                                    icon: fld.icon || linkedSubject?.icon || '',
                                    color: activeAccentColor,
                                    department: fld.department || linkedSubject?.department,
                                  }}
                                  className="w-5 h-5"
                                />
                              </div>
                            ) : (
                              <div
                                style={
                                  activeAccentColor
                                    ? {
                                        backgroundColor: `${activeAccentColor}20`,
                                        borderColor: `${activeAccentColor}45`,
                                        color: activeAccentColor,
                                      }
                                    : undefined
                                }
                                className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0"
                              >
                                <Folder className="w-5 h-5" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              {renamingFolderId === fld.id ? (
                                <div
                                  className="flex items-center gap-1.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="text"
                                    value={renamedFolderName}
                                    onChange={(e) =>
                                      setRenamedFolderName(e.target.value)
                                    }
                                    className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRenameFolder(fld.id)}
                                    className="px-2.5 py-1.5 bg-purple-600 text-white text-xs rounded-xl font-bold cursor-pointer shrink-0"
                                  >
                                    حفظ
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors break-words leading-snug">
                                      {fld.name}
                                    </h4>
                                    {semBadge && (
                                      <span
                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black tabular-nums border ${
                                          semBadge === '1'
                                            ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-300'
                                            : 'bg-sky-500/15 border-sky-500/35 text-sky-600 dark:text-sky-300'
                                        }`}
                                      >
                                        فصل {semBadge}
                                      </span>
                                    )}
                                    {isSubjectFolder && (
                                      <span
                                        style={
                                          activeAccentColor
                                            ? {
                                                backgroundColor: `${activeAccentColor}18`,
                                                borderColor: `${activeAccentColor}40`,
                                                color: activeAccentColor,
                                              }
                                            : undefined
                                        }
                                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold border bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                      >
                                        مادة
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums block mt-0.5">
                                    {childFolderCount > 0 && childFileCount > 0
                                      ? `${childFolderCount} مجلد فرعي · ${childFileCount} ملف`
                                      : childFolderCount > 0
                                      ? `${childFolderCount} ${isRootYearFolder ? 'فصل دراسي' : 'مادة / مجلد فرعي'}`
                                      : `${childFileCount} ملف مرفوع`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors shrink-0" />
                        </div>

                        {/* Admin Controls Strip */}
                        {isAdmin && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1"
                          >
                            <span className="text-[10px] text-slate-400 font-bold">
                              إدارة وتخصيص:
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveLibraryFolder(fld.id, 'up')}
                                className="text-slate-500 dark:text-slate-400 hover:text-emerald-500 disabled:opacity-30 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 cursor-pointer"
                                title="تحريك المجلد للأعلى"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === currentSubFolders.length - 1}
                                onClick={() => moveLibraryFolder(fld.id, 'down')}
                                className="text-slate-500 dark:text-slate-400 hover:text-emerald-500 disabled:opacity-30 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 cursor-pointer"
                                title="تحريك المجلد للأسفل"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditFolderModal(fld)}
                                className="text-slate-500 dark:text-slate-400 hover:text-purple-500 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 cursor-pointer"
                                title="تعديل المجلد وتخصيص الغلاف أو الرمز"
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
                                className="text-slate-500 dark:text-slate-400 hover:text-rose-500 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 cursor-pointer"
                                title="حذف المجلد"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files List in Current Folder */}
          {currentFolderId !== null && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                  {(
                    [
                      'الكل',
                      'محاضرة',
                      'تفريغ / نوطة',
                      'سلايدات',
                      'كتاب / مرجع',
                      'دورة امتحانية',
                    ] as const
                  ).map((typeOpt) => (
                    <button
                      key={typeOpt}
                      type="button"
                      onClick={() => setSelectedFileTypeFilter(typeOpt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                        selectedFileTypeFilter === typeOpt
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#131D2E] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {typeOpt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 px-1">
                  <span>الملفات المتاحة ({currentFolderFiles.length})</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenAddFileModal}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-black"
                    >
                      <Plus className="w-4 h-4" />
                      <span>رفع ملف جديد</span>
                    </button>
                  )}
                </div>
              </div>

              {currentFolderFiles.length === 0 &&
              currentSubFolders.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-[#131D2E] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-2.5">
                  <BookOpen className="w-9 h-9 text-slate-400 mx-auto" />
                  <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                    لا توجد ملفات مرفوعة في هذا المجلد حالياً.
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenAddFileModal}
                      className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      رفع أول ملف أو نوطة من الجهاز
                    </button>
                  )}
                </div>
              ) : (
                <div className={density.libraryFilesGrid}>
                  {currentFolderFiles.map((file, idx) =>
                    renderFileCard(file, idx, currentFolderFiles.length)
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
