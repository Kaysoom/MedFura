import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, BookOpen, Layers } from 'lucide-react';
import { SubjectItem, AcademicYearId, SemesterType, ChapterItem } from '../../types';
import { INITIAL_YEARS } from '../../initialData';
import { InAppSelect } from '../Common/InAppSelect';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectToEdit?: SubjectItem | null;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({ isOpen, onClose, subjectToEdit }) => {
  const { addSubject, updateSubject, activeYear, activeSemester } = useApp();

  const [name, setName] = useState('');
  const [yearId, setYearId] = useState<AcademicYearId>(activeYear);
  const [semester, setSemester] = useState<SemesterType>(activeSemester);
  const [department, setDepartment] = useState('');
  const [chaptersInput, setChaptersInput] = useState('');

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setYearId(subjectToEdit.yearId);
      setSemester(subjectToEdit.semester);
      setDepartment(subjectToEdit.department || '');
      setChaptersInput(
        subjectToEdit.chapters
          ? subjectToEdit.chapters.map(c => (typeof c === 'string' ? c : c.name)).join('\n')
          : ''
      );
    } else {
      setName('');
      setYearId(activeYear);
      setSemester(activeSemester);
      setDepartment('القسم الأكاديمي');
      setChaptersInput('الفصل الأول: الجهاز العصبي المركزي\nالفصل الثاني: جذع الدماغ والأعصاب القحفية\nالفصل الثالث: المراجعة الشاملة');
    }
  }, [subjectToEdit, isOpen, activeYear, activeSemester]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const existingChapters = subjectToEdit?.chapters || [];
    const parsedChapters: ChapterItem[] = chaptersInput
      .split('\n')
      .map((line, i) => {
        const cleanName = line.trim();
        const existingMatch = existingChapters.find(ec => ec.name === cleanName) || existingChapters[i];
        return {
          id: existingMatch?.id || `ch-${Date.now()}-${i}`,
          name: cleanName,
          category: existingMatch?.category || 'section',
          questionsCount: existingMatch?.questionsCount || 0
        };
      })
      .filter(c => c.name.length > 0);

    if (subjectToEdit) {
      await updateSubject(subjectToEdit.id, {
        name: name.trim(),
        yearId,
        semester,
        department: department.trim(),
        chapters: parsedChapters.length > 0 ? parsedChapters : subjectToEdit.chapters,
      });
    } else {
      await addSubject({
        name: name.trim(),
        yearId,
        semester,
        department: department.trim(),
        chapters: parsedChapters.length > 0 ? parsedChapters : [{ id: `ch-${Date.now()}-0`, name: 'الفصل الأول', category: 'section', questionsCount: 0 }],
        questionsCount: 0,
        filesCount: 0,
        icon: 'BookOpen',
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#0E172A] rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-white">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                {subjectToEdit ? 'تعديل بيانات المادة' : 'إضافة مادة جامعية جديدة'}
              </h3>
              <p className="text-xs text-emerald-100">
                لوحة تحكم المشرف لإدارة المقررات والأقسام الأكاديمية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة المادة"
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-right">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              اسم المادة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: تشريح عصبية، فيزيولوجيا 3، كيمياء سريرية 2..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              القسم الأكاديمي
            </label>
            <input
              type="text"
              placeholder="قسم العلوم العصبية والسريرية"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                السنة الدراسية
              </label>
              <InAppSelect<AcademicYearId>
                value={yearId}
                onChange={(val) => setYearId(val)}
                size="sm"
                options={INITIAL_YEARS.map((y) => ({
                  value: y.id,
                  label: y.name,
                }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                الفصل الدراسي
              </label>
              <InAppSelect<SemesterType>
                value={semester}
                onChange={(val) => setSemester(val)}
                size="sm"
                options={[
                  { value: 'first', label: 'الفصل الأول' },
                  { value: 'second', label: 'الفصل الثاني' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span>فصول وأجزاء المادة (سطر لكل فصل):</span>
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <textarea
              rows={4}
              placeholder="الفصل الأول: قشرة المخ والأنوية القاعدية&#10;الفصل الثاني: جذع الدماغ والأعصاب القحفية&#10;الفصل الثالث: الحبل الشوكي"
              value={chaptersInput}
              onChange={(e) => setChaptersInput(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-emerald-500 leading-relaxed"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              سيتم إنشاء أو تحديث هذه الفصول والأجزاء داخل المادة لفرز أسئلة الأتمتة بداخلها.
            </span>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
            >
              {subjectToEdit ? 'حفظ التعديلات' : 'إضافة المادة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
