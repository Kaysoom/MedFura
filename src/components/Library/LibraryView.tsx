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
  Upload
} from 'lucide-react';
import { LibraryFolderItem, LibraryFileItem } from '../../types';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { InAppSelect } from '../Common/InAppSelect';

export const LibraryView: React.FC = () => {
  const { 
    libraryFolders, 
    libraryFiles, 
    isAdmin, 
    addLibraryFolder, 
    renameLibraryFolder, 
    deleteLibraryFolder, 
    addLibraryFile, 
    updateLibraryFile,
    deleteLibraryFile,
    setActiveSection
  } = useApp();

  // Navigation State: current folder id in hierarchy (null = root level)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Modals & Inline Form States
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [fileToEdit, setFileToEdit] = useState<LibraryFileItem | null>(null);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileType, setNewFileType] = useState<LibraryFileItem['fileType']>('تفريغ / نوطة');
  const [newFileAuthor, setNewFileAuthor] = useState('');
  const [newFileSize, setNewFileSize] = useState('8.4 MB');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
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
      const f = libraryFolders.find(item => item.id === curId);
      if (!f) break;
      trail.unshift(f);
      curId = f.parentId;
    }
    return trail;
  }, [libraryFolders, currentFolderId]);

  // Current sub-folders
  const currentSubFolders = useMemo(() => {
    return libraryFolders.filter(f => f.parentId === currentFolderId);
  }, [libraryFolders, currentFolderId]);

  // Files in the current folder
  const currentFolderFiles = useMemo(() => {
    if (!currentFolderId) return [];
    return libraryFiles.filter(f => f.folderId === currentFolderId);
  }, [libraryFiles, currentFolderId]);

  // Search Results if search query is entered
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return libraryFiles.filter(f => 
      f.title.toLowerCase().includes(q) || 
      f.author.toLowerCase().includes(q) ||
      f.fileType.toLowerCase().includes(q)
    );
  }, [libraryFiles, searchQuery]);

  const handleDownload = (file: LibraryFileItem) => {
    if (file.downloadUrl) {
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = `${file.title}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setDownloadNotice(`جاري تنزيل ملف "${file.title}" (${file.fileSize})...`);
    setTimeout(() => {
      setDownloadNotice(null);
    }, 3500);
  };

  const handleOpenAddFileModal = () => {
    setFileToEdit(null);
    setNewFileTitle('');
    setNewFileType('تفريغ / نوطة');
    setNewFileAuthor('');
    setNewFileSize('8.4 MB');
    setUploadedFileUrl(null);
    setUploadedFileName(null);
    setIsAddFileModalOpen(true);
  };

  const handleOpenEditFileModal = (file: LibraryFileItem) => {
    setFileToEdit(file);
    setNewFileTitle(file.title);
    setNewFileType(file.fileType);
    setNewFileAuthor(file.author);
    setNewFileSize(file.fileSize);
    setUploadedFileUrl(file.downloadUrl || null);
    setUploadedFileName(null);
    setIsAddFileModalOpen(true);
  };

  const handleDeviceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    if (!newFileTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setNewFileTitle(cleanName);
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(file.size) / Math.log(k));
    const formatted = parseFloat((file.size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    setNewFileSize(formatted);

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedFileUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await addLibraryFolder({
      name: newFolderName.trim(),
      parentId: currentFolderId
    });
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

    if (fileToEdit) {
      await updateLibraryFile(fileToEdit.id, {
        title: newFileTitle.trim(),
        fileType: newFileType,
        author: newFileAuthor.trim() || 'فريق الطلاب الأكاديمي',
        fileSize: newFileSize.trim() || '5.2 MB',
        downloadUrl: uploadedFileUrl || fileToEdit.downloadUrl,
      });
    } else if (currentFolderId) {
      await addLibraryFile({
        folderId: currentFolderId,
        title: newFileTitle.trim(),
        fileType: newFileType,
        author: newFileAuthor.trim() || 'فريق الطلاب الأكاديمي',
        fileSize: newFileSize.trim() || '5.2 MB',
        downloadsCount: 0,
        pages: 45,
        downloadUrl: uploadedFileUrl || undefined
      });
    }

    setFileToEdit(null);
    setNewFileTitle('');
    setUploadedFileUrl(null);
    setUploadedFileName(null);
    setIsAddFileModalOpen(false);
  };

  const activeFolder = libraryFolders.find(f => f.id === currentFolderId);

  return (
    <div className="max-w-md mx-auto sm:max-w-3xl lg:max-w-4xl px-4 py-4 space-y-5">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          type="button"
          onClick={() => {
            if (currentFolderId) {
              const parent = libraryFolders.find(f => f.id === currentFolderId)?.parentId || null;
              setCurrentFolderId(parent);
            } else {
              setActiveSection('home');
            }
          }}
          className="p-1.5 rounded-xl text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          title="رجوع"
        >
          <ChevronRight className="w-5 h-5" />
          <span>{currentFolderId ? 'المجلد السابق' : 'الرئيسية'}</span>
        </button>

        <h1 className="text-lg sm:text-xl font-black text-emerald-400 text-center">
          المكتبة والأرشيف
        </h1>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddFolderModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="إضافة مجلد جديد"
              >
                <FolderPlus className="w-4 h-4" />
                <span className="hidden sm:inline">إضافة مجلد</span>
              </button>

              {currentFolderId && (
                <button
                  type="button"
                  onClick={handleOpenAddFileModal}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="إضافة ملف داخل هذا المجلد"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">إضافة ملف</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Global File Search */}
      <div className="relative">
        <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="ابحث عن نوطة، تفريغ، دورة امتحانية، أو اسم المادة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 bg-[#131D2E] border border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-hidden focus:border-purple-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute left-3.5 top-2.5 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            مسح
          </button>
        )}
      </div>

      {downloadNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Breadcrumbs Navigation Strip */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto pb-1 no-scrollbar text-right">
        <button
          type="button"
          onClick={() => setCurrentFolderId(null)}
          className={`hover:text-white font-bold whitespace-nowrap cursor-pointer ${
            currentFolderId === null ? 'text-purple-400 font-black' : ''
          }`}
        >
          المكتبة الأكاديمية
        </button>

        {breadcrumbTrail.map((crumb, idx) => {
          const isLast = idx === breadcrumbTrail.length - 1;
          return (
            <React.Fragment key={crumb.id}>
              <span className="text-slate-600">/</span>
              <button
                type="button"
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`hover:text-white whitespace-nowrap cursor-pointer ${
                  isLast ? 'text-purple-400 font-black' : 'text-slate-400 font-semibold'
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* SEARCH RESULTS VIEW */}
      {searchQuery.trim() !== '' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>نتائج البحث ({searchResults.length}):</span>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-12 bg-[#131D2E] rounded-3xl border border-slate-800 text-slate-400 text-xs">
              لم يتم العثور على أي ملفات تطابق &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="space-y-2.5">
              {searchResults.map((file) => (
                <div
                  key={file.id}
                  className="bg-[#131D2E] hover:bg-[#162238] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-right"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEditFileModal(file)}
                          className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/70 cursor-pointer"
                          title="تعديل الملف"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              isOpen: true,
                              title: 'حذف الملف الأكاديمي',
                              message: 'هل أنت متأكد من حذف هذا الملف نهائياً من المكتبة؟',
                              itemName: file.title,
                              onConfirm: () => deleteLibraryFile(file.id),
                            })
                          }
                          className="p-2 text-slate-400 hover:text-rose-400 rounded-xl bg-slate-800/70 cursor-pointer"
                          title="حذف الملف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                      className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل</span>
                    </button>
                  </div>

                  <div className="flex-1 pr-2">
                    <span className="text-purple-300 text-[10px] font-bold block mb-0.5">
                      {file.fileType}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-white">
                      {file.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {file.author} · {file.fileSize}
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* HIERARCHICAL FOLDERS & FILES VIEW */
        <div className="space-y-5">
          {/* Sub-Folders Grid */}
          {currentSubFolders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 text-right">
                {currentFolderId === null ? 'المجلدات والسنوات الدراسية:' : 'المجلدات الفرعية والمواد:'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentSubFolders.map((fld) => {
                  const childFolderCount = libraryFolders.filter(f => f.parentId === fld.id).length;
                  const childFileCount = libraryFiles.filter(f => f.folderId === fld.id).length;

                  return (
                    <div
                      key={fld.id}
                      onClick={() => setCurrentFolderId(fld.id)}
                      className="group bg-[#131D2E] hover:bg-[#162238] border border-slate-800 hover:border-purple-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex items-center justify-between shadow-md"
                    >
                      {/* Left: Admin options or Arrow */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingFolderId(fld.id);
                                setRenamedFolderName(fld.name);
                              }}
                              className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/60 cursor-pointer"
                              title="تعديل اسم المجلد"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'حذف المجلد ومحتوياته',
                                  message: 'هل أنت متأكد من حذف هذا المجلد وجميع المجلدات الفرعية والملفات الموجودة بداخله؟',
                                  itemName: fld.name,
                                  onConfirm: () => deleteLibraryFolder(fld.id),
                                })
                              }
                              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg bg-slate-800/60 cursor-pointer"
                              title="حذف المجلد"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
                      </div>

                      {/* Right: Folder Name & Count */}
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          {renamingFolderId === fld.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={renamedFolderName}
                                onChange={(e) => setRenamedFolderName(e.target.value)}
                                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameFolder(fld.id)}
                                className="px-2 py-1 bg-purple-600 text-white text-xs rounded-lg font-bold cursor-pointer"
                              >
                                حفظ
                              </button>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                                {fld.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 tabular-nums">
                                {childFolderCount > 0 ? `${childFolderCount} مجلد فرعي` : `${childFileCount} ملف متاح`}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                          <Folder className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Files List in Current Folder */}
          {currentFolderId !== null && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>الملفات والنوط المتاحة ({currentFolderFiles.length}):</span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleOpenAddFileModal}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة ملف</span>
                  </button>
                )}
              </div>

              {currentFolderFiles.length === 0 && currentSubFolders.length === 0 ? (
                <div className="text-center py-12 bg-[#131D2E] rounded-3xl border border-dashed border-slate-800 p-6 space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">هذا المجلد لا يحتوي على ملفات بعد.</p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleOpenAddFileModal}
                      className="mt-2 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      إضافة أول نوطة أو تفريغ
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentFolderFiles.map((file) => (
                    <div
                      key={file.id}
                      className="bg-[#131D2E] hover:bg-[#162238] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-right"
                    >
                      {/* Left: Download & Admin edit/delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditFileModal(file)}
                              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/70 transition-colors cursor-pointer"
                              title="تعديل الملف"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'حذف الملف الأكاديمي',
                                  message: 'هل أنت متأكد من حذف هذا الملف من المجلد الحالي؟',
                                  itemName: file.title,
                                  onConfirm: () => deleteLibraryFile(file.id),
                                })
                              }
                              className="p-2 text-slate-400 hover:text-rose-400 rounded-xl bg-slate-800/70 transition-colors cursor-pointer"
                              title="حذف الملف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <Download className="w-4 h-4" />
                          <span>تحميل</span>
                        </button>
                      </div>

                      {/* Right: File Information */}
                      <div className="flex items-center gap-3 text-right flex-1 pr-2">
                        <div className="flex-1">
                          <span className="text-purple-300 text-[10px] font-bold block mb-0.5">
                            {file.fileType}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-white">
                            {file.title}
                          </h4>
                          <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400 mt-1 tabular-nums">
                            <span>{file.author}</span>
                            <span aria-hidden="true">·</span>
                            <span>{file.fileSize}</span>
                            {file.pages && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{file.pages} صفحة</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Folder Modal (Admin) */}
      {isAddFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0E172A] border border-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm">
                إضافة مجلد جديد داخل: {activeFolder ? activeFolder.name : 'المكتبة الرئيسية'}
              </h3>
              <button type="button" onClick={() => setIsAddFolderModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  اسم المجلد:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: الفصل الأول، أو تشريح عصبية..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer"
              >
                إنشاء المجلد
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit File Modal (Admin) */}
      {isAddFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0E172A] border border-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm">
                {fileToEdit ? 'تعديل بيانات الملف / النوطة' : `إضافة ملف / نوطة داخل: ${activeFolder?.name || 'المجلد'}`}
              </h3>
              <button type="button" onClick={() => setIsAddFileModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveFileSubmit} className="space-y-3">
              <input
                type="file"
                ref={deviceFileInputRef}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                onChange={handleDeviceFileSelect}
                className="hidden"
              />

              <div
                onClick={() => deviceFileInputRef.current?.click()}
                className="p-3.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-900/60 text-center cursor-pointer transition-colors space-y-1"
              >
                <Upload className="w-5 h-5 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-slate-200">
                  {uploadedFileName ? `تم اختيار: ${uploadedFileName}` : 'انقر لرفع ملف PDF أو نوطة من جهازك'}
                </p>
                <p className="text-[10px] text-slate-400">سيتم استخراج العنوان والحجم تلقائياً من الملف</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  عنوان الملف / النوطة:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: تفريغ المحاضرة 1 و 2 تشريح عصبية"
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    نوع الملف:
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
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    حجم الملف:
                  </label>
                  <input
                    type="text"
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  إعداد / تأليف:
                </label>
                <input
                  type="text"
                  placeholder="د. سامر المصري / فريق النخبة"
                  value={newFileAuthor}
                  onChange={(e) => setNewFileAuthor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                {fileToEdit ? 'حفظ تعديلات الملف' : 'نشر الملف في المجلد'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        itemName={confirmDialog.itemName}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
