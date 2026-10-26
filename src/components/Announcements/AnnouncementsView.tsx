import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  Pin, 
  Plus, 
  Trash2, 
  X, 
  Edit3,
  Building,
  GraduationCap,
  BookOpen,
  Users,
  ChevronRight
} from 'lucide-react';
import { AnnouncementItem } from '../../types';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { InAppSelect } from '../Common/InAppSelect';

export const AnnouncementsView: React.FC = () => {
  const {
    announcements,
    isAdmin,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    activeSection,
    setActiveSection,
  } = useApp();

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
    <div className="w-full max-w-md mx-auto sm:max-w-3xl lg:max-w-4xl px-3.5 py-3.5 space-y-4 text-right overflow-x-hidden">
      
      {/* Compact Sub-page Top Navigation Row */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveSection('home')}
          className="px-2.5 py-1.5 rounded-xl bg-[#131D2E] border border-slate-800 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>

        <h1 className="text-sm sm:text-lg font-black text-emerald-400 truncate">
          {activeSection === 'about' ? 'من نحن ودليل الكلية' : 'دليل الكلية والإعلانات'}
        </h1>

        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setEditingAnnouncementId(null);
              setTitle('');
              setContent('');
              setIsAddModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>إعلان جديد</span>
          </button>
        ) : (
          <div className="w-14" />
        )}
      </div>

      {/* Compact Mobile-First Header Banner */}
      <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-800 text-white p-4 sm:p-5 rounded-2xl shadow-md space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold text-sky-100">
          <Building className="w-3.5 h-3.5" />
          <span>كلية الطب البشري — جامعة الفرات (MedFur)</span>
        </div>
        <h2 className="text-base sm:text-xl font-black leading-snug">
          لوحة الإعلانات الرسمية ودليل الكلية الأكاديمي
        </h2>
        <p className="text-[11px] sm:text-xs text-sky-100 leading-relaxed">
          متابعة فورية لبرامج الامتحانات، قرارات عمادة الكلية، توزيع المدرجات والمخابر، وأنشطة الهيئة الطلابية.
        </p>
      </div>

      {/* Compact College Quick Guide Cards (Fits Mobile Screen Grid) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <div className="bg-[#131D2E] border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 space-y-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm font-black text-white">6 سنوات</div>
          <div className="text-[10px] text-slate-400 font-semibold">المرحلة الطبية</div>
        </div>

        <div className="bg-[#131D2E] border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 space-y-1">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm font-black text-white">نظام فصلي</div>
          <div className="text-[10px] text-slate-400 font-semibold">أتمتة ومقابلات</div>
        </div>

        <div className="bg-[#131D2E] border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 space-y-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm font-black text-white">فريق MedFur</div>
          <div className="text-[10px] text-slate-400 font-semibold">الدفعات 30 - 31</div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {['all', 'رسمي', 'امتحانات', 'الهيئة الطلابية', 'فعاليات'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterCategory === cat
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-[#131D2E] border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {cat === 'all' ? 'جميع الإعلانات' : cat}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {filteredAnnouncements.map((ann) => (
          <div
            key={ann.id}
            className={`p-3.5 sm:p-5 bg-[#131D2E] rounded-2xl border transition-all ${
              ann.isPinned
                ? 'border-amber-500/50 shadow-md'
                : 'border-slate-800 hover:border-sky-500/40 shadow-xs'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                {ann.isPinned && (
                  <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-xs">
                    <Pin className="w-2.5 h-2.5" />
                    <span>مثبت</span>
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  ann.category === 'رسمي'
                    ? 'bg-rose-500/20 text-rose-300'
                    : ann.category === 'امتحانات'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-sky-500/20 text-sky-300'
                }`}>
                  {ann.category}
                </span>
                <span className="text-[11px] text-slate-400">
                  {ann.date}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 truncate max-w-[160px]">
                  {ann.author}
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditAnnouncement(ann)}
                      className="text-slate-400 hover:text-amber-400 p-1 rounded-lg bg-slate-800/60 transition-colors cursor-pointer"
                      title="تعديل الإعلان"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteAnn(ann)}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded-lg bg-slate-800/60 transition-colors cursor-pointer"
                      title="حذف الإعلان"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-sm sm:text-base font-black text-white mt-2.5 leading-snug break-words">
              {ann.title}
            </h3>

            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed whitespace-pre-line break-words">
              {ann.content}
            </p>
          </div>
        ))}
      </div>

      {/* Add Announcement Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#0E172A] rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-white">
            <div className="bg-sky-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingAnnouncementId ? 'تعديل الإعلان الرسمي' : 'نشر إعلان رسمي جديد'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingAnnouncementId(null);
                  setIsAddModalOpen(false);
                }}
                className="cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 sm:p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  عنوان الإعلان
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً: صدور جدول الامتحانات العملية للفصل الأول"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
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
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الجهة المصدرة
                  </label>
                  <input
                    type="text"
                    placeholder="شؤون الطلاب / الهيئة"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  نص الإعلان والتفاصيل
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب تفاصيل القرار أو الموعد والتعليمات..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>تثبيت هذا الإعلان في صدارة القائمة</span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md cursor-pointer"
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
