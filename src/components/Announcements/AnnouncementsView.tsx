import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  Pin, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  CheckCircle2, 
  Sparkles, 
  X, 
  AlertTriangle,
  Edit3
} from 'lucide-react';
import { AnnouncementItem } from '../../types';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { InAppSelect } from '../Common/InAppSelect';

export const AnnouncementsView: React.FC = () => {
  const { announcements, isAdmin, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useApp();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [confirmDeleteAnn, setConfirmDeleteAnn] = useState<AnnouncementItem | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AnnouncementItem['category']>('رسمي');
  const [author, setAuthor] = useState('عمادة الكلية');
  const [isPinned, setIsPinned] = useState(false);

  const filteredAnnouncements = announcements.filter(a => {
    if (filterCategory === 'all') return true;
    return a.category === filterCategory;
  });

  const handleOpenEditAnnouncement = (ann: AnnouncementItem) => {
    setEditingAnnouncementId(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setCategory(ann.category);
    setAuthor(ann.author);
    setIsPinned(ann.isPinned ?? false);
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingAnnouncementId) {
      await updateAnnouncement(editingAnnouncementId, {
        title: title.trim(),
        content: content.trim(),
        category,
        author: author.trim() || 'الهيئة الطلابية',
        isPinned
      });
    } else {
      await addAnnouncement({
        title: title.trim(),
        content: content.trim(),
        category,
        author: author.trim() || 'الهيئة الطلابية',
        date: 'اليوم، ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        isPinned
      });
    }

    setEditingAnnouncementId(null);
    setTitle('');
    setContent('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold text-sky-100">
            <Bell className="w-3.5 h-3.5" />
            <span>الإعلانات والهيئة الطلابية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            لوحة الإعلانات الرسمية والقرارات الجامعية
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl leading-relaxed">
            متابعة فورية لبرامج الامتحانات، قرارات عمادة الكلية، معارض الكتب المجانية، وأنشطة الهيئة الإدارية للطلاب.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingAnnouncementId(null);
              setTitle('');
              setContent('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-sky-900 font-extrabold text-sm shadow-md hover:bg-sky-50 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>نشر إعلان جديد (+)</span>
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['all', 'رسمي', 'امتحانات', 'الهيئة الطلابية', 'فعاليات'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterCategory === cat
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {cat === 'all' ? 'جميع الإعلانات' : cat}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.map((ann) => (
          <div
            key={ann.id}
            className={`p-6 bg-white dark:bg-slate-900 rounded-3xl border transition-all ${
              ann.isPinned
                ? 'border-amber-400/60 dark:border-amber-600/60 bg-amber-50/20 dark:bg-amber-950/10 shadow-md'
                : 'border-slate-200 dark:border-slate-800 hover:border-sky-500/40 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                {ann.isPinned && (
                  <span className="flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                    <Pin className="w-3 h-3" />
                    <span>مثبت في الصدارة</span>
                  </span>
                )}
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                  ann.category === 'رسمي'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                    : ann.category === 'امتحانات'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                }`}>
                  {ann.category}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {ann.date}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  الجهة المصدرة: {ann.author}
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditAnnouncement(ann)}
                      className="text-slate-400 hover:text-amber-500 p-1 transition-colors cursor-pointer"
                      title="تعديل الإعلان"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteAnn(ann)}
                      className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                      title="حذف الإعلان"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-3 leading-snug">
              {ann.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
              {ann.content}
            </p>
          </div>
        ))}
      </div>

      {/* Add Announcement Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-sky-600 p-5 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingAnnouncementId ? 'تعديل الإعلان الرسمي' : 'نشر إعلان رسمي جديد'}
              </h3>
              <button onClick={() => {
                setEditingAnnouncementId(null);
                setIsAddModalOpen(false);
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان الإعلان
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: صدور جدول الامتحانات العملية للفصل الأول"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    التصنيف
                  </label>
                  <InAppSelect<AnnouncementItem['category']>
                    value={category}
                    onChange={(val) => setCategory(val)}
                    size="sm"
                    variant="adaptive"
                    options={[
                      { value: 'رسمي', label: 'رسمي' },
                      { value: 'امتحانات', label: 'امتحانات' },
                      { value: 'الهيئة الطلابية', label: 'الهيئة الطلابية' },
                      { value: 'فعاليات', label: 'فعاليات' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الجهة المصدرة
                  </label>
                  <input
                    type="text"
                    placeholder="شؤون الطلاب / الهيئة"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نص الإعلان والتفاصيل
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب تفاصيل القرار أو الموعد والتعليمات..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>تثبيت هذا الإعلان في صدارة الشاشة الرئيسية</span>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md"
              >
                {editingAnnouncementId ? 'حفظ تعديلات الإعلان' : 'نشر الإعلان فوراً'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for deleting announcement */}
      <ConfirmationDialog
        isOpen={Boolean(confirmDeleteAnn)}
        title="تأكيد حذف الإعلان"
        message={confirmDeleteAnn ? `هل تريد حذف إعلان "${confirmDeleteAnn.title}" نهائياً؟` : ''}
        onConfirm={() => {
          if (confirmDeleteAnn) {
            deleteAnnouncement(confirmDeleteAnn.id);
            setConfirmDeleteAnn(null);
          }
        }}
        onCancel={() => setConfirmDeleteAnn(null)}
      />
    </div>
  );
};
