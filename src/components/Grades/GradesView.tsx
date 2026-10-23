import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Award, 
  TrendingUp, 
  Search, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  ShieldCheck, 
  Send, 
  X, 
  Crosshair, 
  Users, 
  BookOpen, 
  Save, 
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  Edit3,
  Plus,
  Trash2
} from 'lucide-react';
import { AcademicYearId, SemesterType, GradeItem, StudentLeaderboardEntry, GradeAppealTicket, SubjectItem } from '../../types';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { InAppSelect } from '../Common/InAppSelect';

export const GradesView: React.FC = () => {
  const { 
    user, 
    isAdmin, 
    subjects,
    grades, 
    leaderboard, 
    gradeAppeals, 
    savePreparatoryGrade, 
    savePreparatoryGradesBatch,
    updateStudentGrade, 
    submitGradeAppeal, 
    resolveGradeAppeal, 
    addAppealMessage,
    adminUpdateStudentGrades,
    addSubject,
    updateSubject,
    deleteSubject
  } = useApp();

  // Main Tabs: 1. علاماتي | 2. ترتيبي على الدفعة
  const [activeTab, setActiveTab] = useState<'my_grades' | 'leaderboard'>('my_grades');

  // --- Sub-State for 1. علاماتي ---
  const [selectedYear, setSelectedYear] = useState<AcademicYearId>('year-3');
  const [selectedSemester, setSelectedSemester] = useState<SemesterType>('first');
  const [showCumulativeModal, setShowCumulativeModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [viewingAppealTicket, setViewingAppealTicket] = useState<GradeAppealTicket | null>(null);

  // Cumulative Mode for Student: 'without_prep' (Years 2-5) vs 'with_prep'
  const [cumulativeMode, setCumulativeMode] = useState<'without_prep' | 'with_prep'>('without_prep');

  // Appeal Modal Form State
  const [appealSubjectName, setAppealSubjectName] = useState('');
  const [appealCurrentMark, setAppealCurrentMark] = useState<number>(0);
  const [appealRequestedMark, setAppealRequestedMark] = useState<number | ''>('');
  const [appealDescription, setAppealDescription] = useState('');
  const [appealSuccessToast, setAppealSuccessToast] = useState<string | null>(null);

  // Chat message input state
  const [chatInputText, setChatInputText] = useState('');
  const [adminActiveChatTicketId, setAdminActiveChatTicketId] = useState<string | null>(null);

  // Admin Curriculum Subjects Management State
  const [showAdminSubjectsModal, setShowAdminSubjectsModal] = useState(false);
  const [adminSubjectYear, setAdminSubjectYear] = useState<AcademicYearId>('year-prep');
  const [adminSubjectSemester, setAdminSubjectSemester] = useState<SemesterType>('first');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState('');
  const [editingSubjectDept, setEditingSubjectDept] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDept, setNewSubjectDept] = useState('');
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<SubjectItem | null>(null);

  // Preparatory Curriculum Default Definition
  const PREP_SUBJECTS: Record<SemesterType, { name: string }[]> = {
    first: [
      { name: 'بيولوجيا الخلية' },
      { name: 'فيزياء طبية' },
      { name: 'كيمياء طبية' },
      { name: 'إنكليزي 1' },
      { name: 'تاريخ الطب' },
    ],
    second: [
      { name: 'وراثة' },
      { name: 'تشريح عام' },
      { name: 'فيزيولوجيا عام' },
      { name: 'الإحصاء' },
      { name: 'إنكليزي 2' },
    ]
  };

  // Dynamic Preparatory Subjects derived from active subjects (allows supervisor editing)
  const prepSubjectsList = useMemo(() => {
    const list = subjects.filter(s => s.yearId === 'year-prep' && s.semester === selectedSemester);
    if (list.length > 0) {
      return list.map(s => ({ name: s.name }));
    }
    return PREP_SUBJECTS[selectedSemester];
  }, [subjects, selectedSemester]);

  // Preparatory input marks map: subjectName -> mark
  const [prepMarksInput, setPrepMarksInput] = useState<Record<string, number | ''>>({});

  // Populate preparatory inputs from existing grades
  useEffect(() => {
    const map: Record<string, number | ''> = {};
    grades.filter(g => g.yearId === 'year-prep').forEach(g => {
      map[g.subjectName] = g.mark;
    });
    setPrepMarksInput(prev => ({ ...map, ...prev }));
  }, [grades]);

  // --- Sub-State for 2. ترتيبي على الدفعة ---
  const [leaderboardBatch, setLeaderboardBatch] = useState<string>('دفعة 30');
  const [leaderboardScope, setLeaderboardScope] = useState<'full' | 'first' | 'second'>('full');
  const [leaderboardPrepMode, setLeaderboardPrepMode] = useState<'without_prep' | 'with_prep'>('without_prep');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const [leaderboardSearchQuery, setLeaderboardSearchQuery] = useState('');

  // --- Admin Panels State ---
  const [showAdminGradesModal, setShowAdminGradesModal] = useState(false);
  const [showAdminAppealsModal, setShowAdminAppealsModal] = useState(false);
  const [adminSearchStudent, setAdminSearchStudent] = useState('30045');
  const [adminSelectedYear, setAdminSelectedYear] = useState<AcademicYearId>('year-3');
  const [adminSelectedSemester, setAdminSelectedSemester] = useState<SemesterType>('first');
  const [adminEditingMarks, setAdminEditingMarks] = useState<{ subjectName: string; mark: number; semester: SemesterType }[]>([]);
  const [adminReplyNotes, setAdminReplyNotes] = useState<Record<string, string>>({});

  // Determine available years for the current student
  // Medical progression: Preparatory -> Year 2 -> Year 3 -> Year 4 -> Year 5 (Year 1 removed)
  const studentAvailableYears = useMemo<{ id: AcademicYearId; name: string }[]>(() => {
    if (isAdmin) {
      return [
        { id: 'year-prep', name: 'السنة التحضيرية' },
        { id: 'year-2', name: 'السنة الثانية' },
        { id: 'year-3', name: 'السنة الثالثة' },
        { id: 'year-4', name: 'السنة الرابعة' },
        { id: 'year-5', name: 'السنة الخامسة' },
      ];
    }

    const currentYr = user?.academicYear || 'السنة الثالثة';
    if (currentYr.includes('خامسة')) {
      return [
        { id: 'year-prep', name: 'السنة التحضيرية' },
        { id: 'year-2', name: 'السنة الثانية' },
        { id: 'year-3', name: 'السنة الثالثة' },
        { id: 'year-4', name: 'السنة الرابعة' },
        { id: 'year-5', name: 'السنة الخامسة' },
      ];
    } else if (currentYr.includes('رابعة')) {
      return [
        { id: 'year-prep', name: 'السنة التحضيرية' },
        { id: 'year-2', name: 'السنة الثانية' },
        { id: 'year-3', name: 'السنة الثالثة' },
        { id: 'year-4', name: 'السنة الرابعة' },
      ];
    } else if (currentYr.includes('ثالثة')) {
      return [
        { id: 'year-prep', name: 'السنة التحضيرية' },
        { id: 'year-2', name: 'السنة الثانية' },
        { id: 'year-3', name: 'السنة الثالثة' },
      ];
    } else if (currentYr.includes('ثانية')) {
      return [
        { id: 'year-prep', name: 'السنة التحضيرية' },
        { id: 'year-2', name: 'السنة الثانية' },
      ];
    } else {
      return [
        { id: 'year-prep', name: 'السنة التحضيرية' },
        { id: 'year-2', name: 'السنة الثانية' },
        { id: 'year-3', name: 'السنة الثالثة' },
      ];
    }
  }, [user, isAdmin]);

  // Set default selected year to first available or year-3
  useEffect(() => {
    if (studentAvailableYears.length > 0 && !studentAvailableYears.some(y => y.id === selectedYear)) {
      setSelectedYear(studentAvailableYears[studentAvailableYears.length - 1].id);
    }
  }, [studentAvailableYears, selectedYear]);

  // Filtered grades for active year and semester
  const currentSemesterGrades = useMemo(() => {
    return grades.filter(g => g.yearId === selectedYear && g.semester === selectedSemester);
  }, [grades, selectedYear, selectedSemester]);

  // Calculate Semester Average (%)
  const semesterAverage = useMemo(() => {
    if (currentSemesterGrades.length === 0) return 0;
    const sum = currentSemesterGrades.reduce((acc, curr) => acc + curr.mark, 0);
    return parseFloat((sum / currentSemesterGrades.length).toFixed(2));
  }, [currentSemesterGrades]);

  // Semester Rank Estimation
  const semesterRank = useMemo(() => {
    if (semesterAverage >= 95) return '#03';
    if (semesterAverage >= 90) return '#08';
    if (semesterAverage >= 85) return '#24';
    if (semesterAverage >= 80) return '#118';
    if (semesterAverage >= 75) return '#340';
    return '#810';
  }, [semesterAverage]);

  // Cumulative Averages (Percentage Only - Strict Medical Rules)
  // College average is calculated from Year 2 to Year 5
  const cumulativeStats = useMemo(() => {
    // All grades including Prep
    const allGrades = grades;
    const sumAll = allGrades.reduce((acc, curr) => acc + curr.mark, 0);
    const avgWithPrep = allGrades.length > 0 ? parseFloat((sumAll / allGrades.length).toFixed(3)) : 0;

    // College Years Only (Year 2, 3, 4, 5) - Excluding Prep
    const collegeGrades = grades.filter(g => g.yearId !== 'year-prep');
    const sumCollege = collegeGrades.reduce((acc, curr) => acc + curr.mark, 0);
    const avgWithoutPrep = collegeGrades.length > 0 ? parseFloat((sumCollege / collegeGrades.length).toFixed(3)) : 0;

    return {
      avgWithPrep,
      avgWithoutPrep,
      totalSubjects: allGrades.length,
      collegeSubjects: collegeGrades.length
    };
  }, [grades]);

  // Color helper for marks
  const getMarkColor = (mark: number) => {
    if (mark >= 90) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (mark >= 80) return 'text-sky-500 bg-sky-500/10 border-sky-500/30';
    if (mark >= 70) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    if (mark >= 60) return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
  };

  const getMarkLabel = (mark: number) => {
    if (mark >= 90) return 'ممتاز (شرف)';
    if (mark >= 80) return 'جيد جداً';
    if (mark >= 70) return 'جيد';
    if (mark >= 60) return 'مقبول';
    return 'راسب / إعادة';
  };

  // Find appeal for a subject for current student
  const getSubjectAppeal = (subjectName: string) => {
    return gradeAppeals.find(
      a => a.subjectName === subjectName && 
      (a.studentId === user?.uid || a.examNumber === user?.examNumber || a.examNumber === '30421')
    );
  };

  // Open Appeal Modal for a specific subject
  const handleOpenAppeal = (grade: GradeItem) => {
    setAppealSubjectName(grade.subjectName);
    setAppealCurrentMark(grade.mark);
    setAppealRequestedMark('');
    setAppealDescription('');
    setShowAppealModal(true);
  };

  // Submit Appeal
  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealSubjectName) return;

    await submitGradeAppeal({
      studentId: user?.uid || 'std-current',
      studentName: user?.displayName || 'محمد الكيصوم',
      examNumber: user?.examNumber || '30421',
      subjectName: appealSubjectName,
      yearId: selectedYear,
      semester: selectedSemester,
      currentMark: appealCurrentMark,
      requestedMark: typeof appealRequestedMark === 'number' ? appealRequestedMark : undefined,
      description: appealDescription.trim() || 'اعتراض وتدقيق علامة مسجلة في كشف الدرجات',
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'student',
          senderName: user?.displayName || 'محمد الكيصوم',
          text: appealDescription.trim() || 'أرجو تدقيق علامتي في هذا المقرر لوجود خلل في الرصد.',
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        }
      ]
    });

    setShowAppealModal(false);
    setAppealSuccessToast('تم إرسال بطاقة الاعتراض إلى المشرف بنجاح. ستظهر لك شارة مؤكدة لمتابعة رد المشرف.');
    setTimeout(() => setAppealSuccessToast(null), 5000);
  };

  // Student sends follow-up chat message in appeal
  const handleSendStudentChatMessage = async (ticketId: string) => {
    if (!chatInputText.trim()) return;
    await addAppealMessage(ticketId, chatInputText.trim(), 'student', user?.displayName || 'محمد الكيصوم');
    setChatInputText('');
    // Also update current viewing ticket state
    setViewingAppealTicket(prev => {
      if (!prev || prev.id !== ticketId) return prev;
      return {
        ...prev,
        messages: [
          ...(prev.messages || []),
          {
            id: `msg-${Date.now()}`,
            sender: 'student',
            senderName: user?.displayName || 'محمد الكيصوم',
            text: chatInputText.trim(),
            timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };
    });
  };

  // Admin sends reply chat message in appeal
  const handleSendAdminChatMessage = async (ticketId: string) => {
    if (!chatInputText.trim()) return;
    await addAppealMessage(ticketId, chatInputText.trim(), 'admin', 'المشرف الأكاديمي');
    setChatInputText('');
  };

  // Save all preparatory marks for current semester
  const handleSavePrepCurriculum = async () => {
    const list = prepSubjectsList;
    const batch = list.map(sub => {
      const val = prepMarksInput[sub.name];
      const markNum = typeof val === 'number' ? Math.max(0, Math.min(100, val)) : 85;
      return {
        subjectName: sub.name,
        mark: markNum,
        semester: selectedSemester
      };
    });

    await savePreparatoryGradesBatch(batch);
    setAppealSuccessToast('تم حفظ وتحديث علامات السنة التحضيرية واحتساب المعدل بنجاح!');
    setTimeout(() => setAppealSuccessToast(null), 4000);
  };

  // --- Leaderboard Data Calculation ---
  const sortedLeaderboard = useMemo(() => {
    let list = [...leaderboard];
    if (leaderboardBatch) {
      list = list.filter(s => s.batch === leaderboardBatch);
    }

    if (leaderboardSearchQuery.trim()) {
      const q = leaderboardSearchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.examNumber.includes(q)
      );
    }

    // Sort based on scope and prep mode
    return list.sort((a, b) => {
      if (leaderboardScope === 'first' && a.semester1Average && b.semester1Average) {
        return b.semester1Average - a.semester1Average;
      } else if (leaderboardScope === 'second' && a.semester2Average && b.semester2Average) {
        return b.semester2Average - a.semester2Average;
      }
      
      const valA = leaderboardPrepMode === 'with_prep' ? (a.averageWithPrep || a.average) : a.average;
      const valB = leaderboardPrepMode === 'with_prep' ? (b.averageWithPrep || b.average) : b.average;
      return valB - valA;
    }).map((student, idx) => ({
      ...student,
      displayRank: idx + 1
    }));
  }, [leaderboard, leaderboardBatch, leaderboardScope, leaderboardSearchQuery, leaderboardPrepMode]);

  // "أين ترتيبي؟" function - smooth scroll to user
  const handleScrollToMyRank = () => {
    const myExamNum = user?.examNumber || '30421';
    const myEntry = sortedLeaderboard.find(s => s.examNumber === myExamNum || s.name.includes(user?.displayName || 'الكيصوم'));
    
    if (myEntry) {
      setHighlightedStudentId(myEntry.id);
      setExpandedStudentId(myEntry.id);

      setTimeout(() => {
        const el = document.getElementById(`student-row-${myEntry.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      setTimeout(() => {
        setHighlightedStudentId(null);
      }, 5000);
    } else {
      setAppealSuccessToast(`رقمك الامتحاني (${myExamNum}) لم يُعثر عليه في هذه القائمة المفلترة حالياً.`);
      setTimeout(() => setAppealSuccessToast(null), 4000);
    }
  };

  // Open Admin Student Grades Editor
  const handleLoadAdminStudent = () => {
    const student = leaderboard.find(s => s.examNumber === adminSearchStudent.trim());
    if (student) {
      setAdminEditingMarks(student.grades.map(g => ({ ...g })));
    } else {
      // Default template from subjects
      const currentSubjects = subjects.filter(s => s.yearId === adminSelectedYear && s.semester === adminSelectedSemester);
      setAdminEditingMarks(currentSubjects.map(s => ({
        subjectName: s.name,
        mark: 85,
        semester: adminSelectedSemester
      })));
    }
  };

  const handleSaveAdminStudentGrades = async () => {
    if (!adminSearchStudent.trim() || adminEditingMarks.length === 0) return;
    await adminUpdateStudentGrades(adminSearchStudent.trim(), adminEditingMarks);
    setAppealSuccessToast('تم حفظ وتحديث علامات الطالب رسمياً بنجاح!');
    setTimeout(() => setAppealSuccessToast(null), 4000);
    setShowAdminGradesModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-right selection:bg-indigo-500 selection:text-white">
      
      {/* Success Notification Toast */}
      {appealSuccessToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 border border-emerald-500/50 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{appealSuccessToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-sky-700 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold text-sky-100">
            <Award className="w-3.5 h-3.5" />
            <span>نظام العلامات والترتيب المئوي الأكاديمي</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            كشف الدرجات والترتيب العام على الدفعة
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-xl leading-relaxed">
            نظام مئوي دقيق خالص (/100) دون نظام الساعات أو نقاط GPA 4.0، مع جدول إدخال التحضيرية ونظام الترتيب المزدوج (مع وبدون تحضيري).
          </p>
        </div>

        {/* Supervisor Actions */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
            <button
              onClick={() => {
                setAdminSubjectYear(selectedYear);
                setAdminSubjectSemester(selectedSemester);
                setShowAdminSubjectsModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-indigo-900/80 hover:bg-indigo-950 border border-indigo-400/40 text-sky-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <BookOpen className="w-4 h-4 text-sky-300" />
              <span>إدارة وتعديل المقررات (مشرف)</span>
            </button>

            <button
              onClick={() => {
                handleLoadAdminStudent();
                setShowAdminGradesModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>إدخال وتعديل علامات الطلاب (مشرف)</span>
            </button>

            <button
              onClick={() => setShowAdminAppealsModal(true)}
              className="relative px-4 py-2.5 rounded-2xl bg-indigo-950/80 hover:bg-indigo-950 border border-indigo-400/40 text-indigo-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>صندوق بلاغات الطلاب ({gradeAppeals.filter(a => a.status === 'pending').length})</span>
              {gradeAppeals.filter(a => a.status === 'pending').length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Two Main Tabs: 1. علاماتي | 2. ترتيبي على الدفعة */}
      <div className="p-1.5 bg-slate-200 dark:bg-slate-900 rounded-3xl border border-slate-300 dark:border-slate-800 flex items-center gap-2 max-w-md mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab('my_grades')}
          className={`flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'my_grades'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>1. علاماتي</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>2. ترتيبي على الدفعة</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: علاماتي (My Grades)                               */}
      {/* ======================================================== */}
      {activeTab === 'my_grades' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Sub-Header: Academic Years Available + Semesters + Cumulative Button */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Year Selector (No year-1: only prep, year-2, year-3...) */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 block">السنوات الدراسية المتاحة:</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {studentAvailableYears.map((yr) => (
                  <button
                    key={yr.id}
                    onClick={() => setSelectedYear(yr.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      selectedYear === yr.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {yr.id === 'year-prep' ? (
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{yr.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Semester Toggles + Cumulative Modal Button */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <button
                  onClick={() => setSelectedSemester('first')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSemester === 'first'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  الفصل الأول
                </button>
                <button
                  onClick={() => setSelectedSemester('second')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSemester === 'second'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  الفصل الثاني
                </button>
              </div>

              {/* زر جانبي يستعرض المعدل التراكمي (مع وبدون تحضيرية) */}
              <button
                onClick={() => setShowCumulativeModal(true)}
                className="px-4 py-2 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-xs font-bold hover:bg-sky-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Calculator className="w-4 h-4" />
                <span>المعدل التراكمي المئوي</span>
              </button>
            </div>
          </div>

          {/* Header Card: اسم الطالب، المعدل الفصلي، الترتيب الفصلي، والمعدل التراكمي */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 text-white p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="text-xs text-emerald-100 font-bold block">
                كشف نتائج: {studentAvailableYears.find(y => y.id === selectedYear)?.name} • {selectedSemester === 'first' ? 'الفصل الأول' : 'الفصل الثاني'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">
                {user?.displayName || 'محمد الكيصوم'} {user?.lastName || ''}
              </h2>
              <p className="text-xs text-emerald-100 font-mono">
                الرقم الامتحاني: {user?.examNumber || user?.studentId || '30421'} • {user?.batch || 'دفعة 30'}
              </p>
            </div>

            {/* Score Pill / Card with Dual Cumulative Switcher */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/10 backdrop-blur-md p-4 px-5 rounded-2xl border border-white/20 shrink-0 font-mono text-center">
              
              {/* Semester Average */}
              <div className="border-l border-white/20 pl-4">
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {semesterAverage.toFixed(2)}%
                </div>
                <div className="text-[11px] text-emerald-100 font-sans">المعدل الفصلي</div>
              </div>

              {/* Semester Rank */}
              <div className="border-l border-white/20 pl-4">
                <div className="text-2xl sm:text-3xl font-black text-amber-300">
                  {semesterRank}
                </div>
                <div className="text-[11px] text-emerald-100 font-sans">الترتيب الفصلي</div>
              </div>

              {/* Cumulative Score with Toggle */}
              <div className="pr-1 text-center space-y-1">
                <div className="text-xl sm:text-2xl font-black text-white">
                  {cumulativeMode === 'without_prep' 
                    ? `${cumulativeStats.avgWithoutPrep.toFixed(3)}%` 
                    : `${cumulativeStats.avgWithPrep.toFixed(3)}%`}
                </div>
                
                {/* Toggle Buttons: بدون تحضير مع تحضيري */}
                <div className="flex items-center gap-1 bg-black/25 p-0.5 rounded-xl text-[10px] font-sans">
                  <button
                    onClick={() => setCumulativeMode('without_prep')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      cumulativeMode === 'without_prep'
                        ? 'bg-white text-emerald-950 font-black shadow-xs'
                        : 'text-emerald-100 hover:text-white'
                    }`}
                  >
                    بدون تحضيري
                  </button>
                  <button
                    onClick={() => setCumulativeMode('with_prep')}
                    className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      cumulativeMode === 'with_prep'
                        ? 'bg-white text-emerald-950 font-black shadow-xs'
                        : 'text-emerald-100 hover:text-white'
                    }`}
                  >
                    مع تحضيري
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION A: PREPARATORY YEAR (السنة التحضيرية)             */}
          {/* ======================================================== */}
          {selectedYear === 'year-prep' ? (
            <div className="space-y-4">
              
              {/* Requirement Banner: أدخل علاماتك يدوياً لحساب المعدل */}
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-500/30 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                    <h3 className="text-base font-black text-amber-500">
                      أدخل علاماتك يدوياً لحساب المعدل
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                    السنة التحضيرية هي السنة الوحيدة التي يقوم الطالب بإدخال علاماتها يدوياً لحساب المعدل الفصلي والتراكمي بدقة، بينما يتم إدخال وتعديل سنوات الكلية حصراً من المشرف.
                  </p>
                </div>

                <button
                  onClick={handleSavePrepCurriculum}
                  className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start md:self-auto"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ درجات الفصل المحددة</span>
                </button>
              </div>

              {/* Ready Table for Preparatory Subjects */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span>جدول مقررات السنة التحضيرية ({selectedSemester === 'first' ? 'الفصل الأول' : 'الفصل الثاني'})</span>
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    {prepSubjectsList.length} مقررات رسمية
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {prepSubjectsList.map((sub, idx) => {
                    const currentVal = prepMarksInput[sub.name];
                    const numVal = typeof currentVal === 'number' ? currentVal : 0;
                    const markColor = getMarkColor(numVal);
                    const markLabel = getMarkLabel(numVal);

                    return (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Subject Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                              {sub.name}
                            </h5>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span>التقدير الحالي: <strong className="font-bold text-slate-700 dark:text-slate-200">{markLabel}</strong></span>
                            <span>•</span>
                            <span>إدخال يدوي مباشر</span>
                          </p>
                        </div>

                        {/* Input & Evaluation */}
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          
                          {/* Live Grade Tag */}
                          <div className={`px-3 py-1.5 rounded-xl border font-mono font-bold text-xs ${markColor}`}>
                            {numVal}%
                          </div>

                          {/* Numeric Mark Input */}
                          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 px-3 rounded-2xl border border-slate-300 dark:border-slate-700">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="العلامة"
                              value={currentVal !== undefined ? currentVal : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                setPrepMarksInput(prev => ({
                                  ...prev,
                                  [sub.name]: val
                                }));
                              }}
                              className="w-16 py-1 bg-transparent text-center font-mono font-black text-base text-slate-900 dark:text-white focus:outline-hidden"
                            />
                            <span className="text-xs font-bold text-slate-400">/ 100</span>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    * يتم حفظ الدرجات تلقائياً وتحديث المعدل التراكمي المئوي ومعدل الدفعة.
                  </span>
                  <button
                    onClick={handleSavePrepCurriculum}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ العلامات الآن</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* ======================================================== */
            /* SECTION B: COLLEGE YEARS (السنوات الثانية، الثالثة...)   */
            /* ======================================================== */
            <div className="space-y-4">
              
              {/* Security & Access Notice */}
              <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 px-5 rounded-2xl flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  <strong>سنوات كلية الطب (الثانية، الثالثة، الرابعة...):</strong> يتم إدخالها وحفظها وتعديلها حصراً بواسطة المشرف الأكاديمي (Admin) لضمان الدقة والسرية.
                </span>
              </div>

              {/* Subjects Table & Grades List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span>قائمة المواد والعلامات المسجلة</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    {currentSemesterGrades.length} مواد مسجلة
                  </span>
                </div>

                {currentSemesterGrades.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <p className="text-sm font-bold">لا توجد علامات مسجلة لهذا الفصل حتى الآن</p>
                    <p className="text-xs">
                      سيقوم المشرف الأكاديمي برفع كشف الدرجات الرسمي المعتمد قريباً.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentSemesterGrades.map((grade) => {
                      const markColor = getMarkColor(grade.mark);
                      const markLabel = getMarkLabel(grade.mark);
                      const appeal = getSubjectAppeal(grade.subjectName);

                      return (
                        <div 
                          key={grade.id}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Subject Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                                {grade.subjectName}
                              </h4>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                              <span>متوسط الدفعة: <strong>{grade.batchAverage || 78.5}%</strong></span>
                              <span>•</span>
                              <span>التقدير: <strong>{markLabel}</strong></span>
                            </p>
                          </div>

                          {/* Grade Badge & Appeal System */}
                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            
                            {/* Colored Grade Badge */}
                            <div className={`px-4 py-2 rounded-2xl border font-mono font-black text-lg sm:text-xl ${markColor} shadow-xs`}>
                              {grade.mark}%
                            </div>

                            {/* Appeal Button & Status Badges */}
                            {!appeal ? (
                              <button
                                onClick={() => handleOpenAppeal(grade)}
                                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 text-slate-600 dark:text-slate-300 hover:text-rose-500 border border-slate-200 dark:border-slate-700 hover:border-rose-400/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                                title="إرسال بلاغ أو اعتراض فوري للمشرف"
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                <span>إبلاغ / اعتراض</span>
                              </button>
                            ) : appeal.status === 'pending' ? (
                              <button
                                onClick={() => setViewingAppealTicket(appeal)}
                                className="px-3.5 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:bg-amber-500/25"
                                title="انقر لمعاينة تفاصيل البلاغ"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                <span>تم الإبلاغ (قيد المراجعة)</span>
                              </button>
                            ) : appeal.status === 'resolved' ? (
                              <button
                                onClick={() => setViewingAppealTicket(appeal)}
                                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:bg-emerald-500/25"
                                title="تم قبول الاعتراض - انقر لرؤية رد المشرف"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>تم قبول الاعتراض وتصحيح العلامة</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setViewingAppealTicket(appeal)}
                                className="px-3.5 py-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:bg-rose-500/25"
                                title="تمت المراجعة وتأكيد العلامة - انقر لرؤية المبرر"
                              >
                                <X className="w-3.5 h-3.5 text-rose-400" />
                                <span>تمت المراجعة وتأكيد العلامة</span>
                              </button>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ترتيبي على الدفعة (Batch Leaderboard)              */}
      {/* ======================================================== */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Controls Bar: Batch Dropdown + Scope + Cumulative Mode + "أين ترتيبي؟" */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Batch Selector */}
            <div className="flex items-center gap-3 w-full lg:w-72">
              <span className="text-xs font-black text-slate-500 shrink-0">اختر الدفعة:</span>
              <InAppSelect
                className="flex-1"
                value={leaderboardBatch}
                onChange={(val) => setLeaderboardBatch(val)}
                size="sm"
                variant="adaptive"
                options={[
                  { value: 'دفعة 30', label: 'دفعة 30 (السنة الثالثة)' },
                  { value: 'دفعة 31', label: 'دفعة 31 (السنة الثانية)' },
                ]}
              />
            </div>

            {/* Scope: Full Year / First Semester / Second Semester */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 shrink-0 hidden sm:inline">النطاق:</span>
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <button
                  onClick={() => setLeaderboardScope('full')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    leaderboardScope === 'full'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  سنة كاملة
                </button>
                <button
                  onClick={() => setLeaderboardScope('first')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    leaderboardScope === 'first'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  فصل أول
                </button>
                <button
                  onClick={() => setLeaderboardScope('second')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    leaderboardScope === 'second'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  فصل ثاني
                </button>
              </div>
            </div>

            {/* Cumulative Toggle: بدون تحضيري (معتمد الكلية) vs مع تحضيري */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500 shrink-0 hidden sm:inline">الاحتساب:</span>
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <button
                  onClick={() => setLeaderboardPrepMode('without_prep')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    leaderboardPrepMode === 'without_prep'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-white'
                  }`}
                  title="المعدل التراكمي المئوي الرسمي لسنوات الكلية فقط"
                >
                  بدون تحضيري (معتمد الكلية)
                </button>
                <button
                  onClick={() => setLeaderboardPrepMode('with_prep')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    leaderboardPrepMode === 'with_prep'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-white'
                  }`}
                  title="المعدل التراكمي المئوي شاملاً السنة التحضيرية"
                >
                  مع تحضيري
                </button>
              </div>
            </div>

            {/* "أين ترتيبي؟" Button */}
            <button
              onClick={handleScrollToMyRank}
              className="w-full lg:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 shrink-0"
            >
              <Crosshair className="w-4 h-4 text-emerald-200" />
              <span>أين ترتيبي؟</span>
            </button>
          </div>

          {/* Search in Leaderboard */}
          <div className="relative max-w-md mr-auto">
            <input
              type="text"
              placeholder="البحث باسم الطالب أو الرقم الامتحاني..."
              value={leaderboardSearchQuery}
              onChange={(e) => setLeaderboardSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 text-right shadow-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          {/* Leaderboard Table with Accordion Expandable Click */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>قائمة ترتيب طلاب {leaderboardBatch} ({leaderboardPrepMode === 'without_prep' ? 'بدون تحضيري' : 'مع تحضيري'})</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                انقر على اسم أي طالب لمعاينة كافة درجات مواده فورياً
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedLeaderboard.map((student) => {
                const isExpanded = expandedStudentId === student.id;
                const isHighlighted = highlightedStudentId === student.id;
                
                // Displayed average according to scope & prep mode
                let currentAvg = leaderboardPrepMode === 'with_prep' ? (student.averageWithPrep || student.average) : student.average;
                if (leaderboardScope === 'first' && student.semester1Average) currentAvg = student.semester1Average;
                if (leaderboardScope === 'second' && student.semester2Average) currentAvg = student.semester2Average;

                return (
                  <div
                    key={student.id}
                    id={`student-row-${student.id}`}
                    className={`transition-colors ${
                      isHighlighted 
                        ? 'bg-emerald-500/15 ring-2 ring-emerald-500/50' 
                        : isExpanded 
                        ? 'bg-slate-50 dark:bg-slate-800/40' 
                        : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    {/* Main Row */}
                    <div
                      onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                    >
                      {/* Left: Score & Expand Toggle */}
                      <div className="flex items-center gap-3">
                        <div className="text-left font-mono">
                          <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                            {currentAvg.toFixed(3)}%
                          </span>
                          <span className="text-[10px] text-slate-400 block font-sans">
                            {leaderboardPrepMode === 'with_prep' ? 'معدل مع تحضيري' : 'معدل الكلية'}
                          </span>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center transition-transform">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Right: Rank + Student Info */}
                      <div className="flex items-center gap-3.5">
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                              {student.name} {student.lastName || ''}
                            </h4>
                            {student.displayRank === 1 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold">
                                🥇 الأول
                              </span>
                            )}
                            {student.displayRank === 2 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-300/30 text-slate-300 font-bold">
                                🥈 الثاني
                              </span>
                            )}
                            {student.displayRank === 3 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-700/20 text-amber-600 font-bold">
                                🥉 الثالث
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            الرقم الامتحاني: {student.examNumber} • {student.batch}
                          </p>
                        </div>

                        {/* Rank Badge */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-black text-sm shrink-0 shadow-xs ${
                          student.displayRank <= 3
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : student.displayRank <= 10
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          #{student.displayRank}
                        </div>
                      </div>
                    </div>

                    {/* Accordion Expandable Content (المعاينة السريعة في مكانه) */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 bg-slate-100/50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-200 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                          <span>كشف درجات الطالب {student.name}:</span>
                          <span className="font-mono">مجموع المواد: {student.grades.length}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {student.grades.map((gr, idx) => (
                            <div 
                              key={idx}
                              className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/70 flex items-center justify-between shadow-xs"
                            >
                              <span className={`px-2.5 py-1 rounded-xl font-mono font-black text-sm ${getMarkColor(gr.mark)}`}>
                                {gr.mark}%
                              </span>
                              <div className="text-right">
                                <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                  {gr.subjectName}
                                </h5>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  متوسط الدفعة: {gr.batchAverage}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CUMULATIVE AVERAGE (المعدلات الفصلية والتراكمية)  */}
      {/* ======================================================== */}
      {showCumulativeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121B2F] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <button 
                onClick={() => setShowCumulativeModal(false)}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-sky-500" />
                <span>المعدل التراكمي المئوي (نظام مئوي دقيق)</span>
              </h3>
            </div>

            <div className="space-y-4">
              {/* Option A: Without Preparatory Year (College Years 2-5) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {cumulativeStats.avgWithoutPrep.toFixed(3)}%
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    المعدل التراكمي (بدون التحضيرية):
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  يقتصر حصراً على سنوات كلية الطب المعتمدة رسمياً من السنة الثانية إلى الخامسة ({cumulativeStats.collegeSubjects} مادة).
                </p>
              </div>

              {/* Option B: With Preparatory Year */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {cumulativeStats.avgWithPrep.toFixed(3)}%
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    المعدل التراكمي (مع التحضيرية):
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  يشمل درجات السنة التحضيرية المدخلة يدوياً + كافة مواد سنوات الكلية ({cumulativeStats.totalSubjects} مادة).
                </p>
              </div>

              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-[11px] text-sky-600 dark:text-sky-300 leading-relaxed">
                * جميع المعدلات تحتسب حسابياً كمتوسط مئوي حقيقي لمجموع علامات المواد مقسوماً على عددها وفق اللائحة المئوية المعتمدة دون نظام النقاط 4.0 أو الساعات.
              </div>
            </div>

            <button
              onClick={() => setShowCumulativeModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer hover:bg-slate-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: GRADE APPEAL TICKET (بطاقة الاعتراض للمشرف)      */}
      {/* ======================================================== */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121B2F] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <button 
                onClick={() => setShowAppealModal(false)}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                <span>إرسال بطاقة إبلاغ / طلب تعديل علامة</span>
              </h3>
            </div>

            <form onSubmit={handleSubmitAppeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المادة المراد تدقيقها:</label>
                <input
                  type="text"
                  readOnly
                  value={appealSubjectName}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white text-right cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">العلامة الحالية المسجلة:</label>
                  <input
                    type="number"
                    readOnly
                    value={appealCurrentMark}
                    className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-rose-500 text-right cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">العلامة المتوقعة / الصحيحة:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="مثال: 94"
                    value={appealRequestedMark}
                    onChange={(e) => setAppealRequestedMark(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">تفاصيل الخلل أو سبب الاعتراض:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="يرجى كتابة سبب الاعتراض بدقة (مثلاً: تم تصحيح ورقة العملي مع الدكتور أو وجود خطأ في جمع درجات النظري)..."
                  value={appealDescription}
                  onChange={(e) => setAppealDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 text-right resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال البلاغ إلى المشرف</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* MODAL 3: VIEW APPEAL STATUS & CHAT WITH SUPERVISOR       */}
      {/* ======================================================== */}
      {viewingAppealTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121B2F] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl text-right max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <button 
                onClick={() => setViewingAppealTicket(null)}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                  viewingAppealTicket.status === 'resolved'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : viewingAppealTicket.status === 'rejected'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {viewingAppealTicket.status === 'resolved' ? 'تم قبول الاعتراض وتصحيح العلامة ✓' : viewingAppealTicket.status === 'rejected' ? 'تمت المراجعة وتأكيد العلامة ✕' : 'تم الإبلاغ • قيد المراجعة ⏳'}
                </span>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  <span>محادثة الاعتراض الأكاديمي</span>
                </h3>
              </div>
            </div>

            {/* Subject & Mark Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="font-mono">
                <span>العلامة المسجلة: <strong className="text-rose-500">{viewingAppealTicket.currentMark}%</strong></span>
                {viewingAppealTicket.requestedMark && (
                  <span className="mr-3">المطلوبة: <strong className="text-emerald-500">{viewingAppealTicket.requestedMark}%</strong></span>
                )}
              </div>
              <div className="font-bold text-slate-800 dark:text-white">
                مقرر: {viewingAppealTicket.subjectName}
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-100/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-72">
              {(!viewingAppealTicket.messages || viewingAppealTicket.messages.length === 0) ? (
                <>
                  {/* Student initial bubble */}
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold px-1">
                      {viewingAppealTicket.studentName} (أنت) • {viewingAppealTicket.createdAt}
                    </span>
                    <div className="bg-indigo-600 text-white p-3 rounded-2xl rounded-tr-xs text-xs max-w-[85%] leading-relaxed shadow-xs">
                      {viewingAppealTicket.description}
                    </div>
                  </div>

                  {/* Supervisor reply bubble */}
                  {viewingAppealTicket.replyNote ? (
                    <div className="flex flex-col items-start space-y-1">
                      <span className="text-[10px] text-indigo-400 font-bold px-1 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-indigo-400" />
                        <span>المشرف الأكاديمي</span>
                      </span>
                      <div className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-3 rounded-2xl rounded-tl-xs text-xs max-w-[85%] leading-relaxed border border-slate-300 dark:border-slate-700 shadow-xs">
                        {viewingAppealTicket.replyNote}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">
                      بانتظار رد ومراجعة المشرف الأكاديمي...
                    </div>
                  )}
                </>
              ) : (
                viewingAppealTicket.messages.map((msg) => {
                  const isMe = msg.sender === 'student';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col space-y-1 ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-slate-400 font-bold px-1 flex items-center gap-1">
                        {!isMe && <ShieldCheck className="w-3 h-3 text-indigo-400" />}
                        <span>{isMe ? `${msg.senderName} (أنت)` : msg.senderName}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </span>
                      <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed shadow-xs ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-xs' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-300 dark:border-slate-700'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Input for Student */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="أرسل توضيحاً أو رداً إضافياً للمشرف..."
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendStudentChatMessage(viewingAppealTicket.id);
                  }
                }}
                className="flex-1 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 text-right"
              />
              <button
                onClick={() => handleSendStudentChatMessage(viewingAppealTicket.id)}
                className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                title="إرسال"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </div>

            <button
              onClick={() => setViewingAppealTicket(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer hover:bg-slate-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: SUPERVISOR EDIT GRADES PANEL (لوحة تحكم المشرف) */}
      {/* ======================================================== */}
      {showAdminGradesModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121B2F] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-right max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <button 
                onClick={() => setShowAdminGradesModal(false)}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>لوحة المشرف لإدخال وتعديل علامات الطلاب رسمياً</span>
              </h3>
            </div>

            {/* Student Search & Year Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الرقم الامتحاني للطالب:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={adminSearchStudent}
                    onChange={(e) => setAdminSearchStudent(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white text-right"
                  />
                  <button
                    onClick={handleLoadAdminStudent}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                  >
                    بحث
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">السنة الدراسية:</label>
                <InAppSelect<AcademicYearId>
                  value={adminSelectedYear}
                  onChange={(val) => setAdminSelectedYear(val)}
                  size="sm"
                  variant="adaptive"
                  options={[
                    { value: 'year-prep', label: 'السنة التحضيرية' },
                    { value: 'year-2', label: 'السنة الثانية' },
                    { value: 'year-3', label: 'السنة الثالثة' },
                    { value: 'year-4', label: 'السنة الرابعة' },
                    { value: 'year-5', label: 'السنة الخامسة' },
                  ]}
                />
              </div>
            </div>

            {/* List of Subjects to edit marks */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500">العلامات المسجلة لهذا الطالب:</span>
              <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                {adminEditingMarks.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.mark}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setAdminEditingMarks(prev => {
                            const copy = [...prev];
                            copy[idx].mark = val;
                            return copy;
                          });
                        }}
                        className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-center font-mono font-bold text-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-400">%</span>
                    </div>

                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.subjectName}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleSaveAdminStudentGrades}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتحديث العلامات رسمياً</span>
              </button>
              <button
                onClick={() => setShowAdminGradesModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* MODAL 5: SUPERVISOR APPEALS INBOX (صندوق بلاغات الطلاب)   */}
      {/* ======================================================== */}
      {showAdminAppealsModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121B2F] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-right max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <button 
                onClick={() => {
                  setShowAdminAppealsModal(false);
                  setAdminActiveChatTicketId(null);
                }}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span>صندوق اعتراضات وبلاغات الطلاب الأكاديمية</span>
              </h3>
            </div>

            {/* If Admin is viewing a specific student chat ticket */}
            {adminActiveChatTicketId ? (() => {
              const activeTicket = gradeAppeals.find(a => a.id === adminActiveChatTicketId);
              if (!activeTicket) return null;
              const msgs = activeTicket.messages || [
                {
                  id: 'init',
                  sender: 'student',
                  senderName: activeTicket.studentName,
                  text: activeTicket.description,
                  timestamp: activeTicket.createdAt
                },
                ...(activeTicket.replyNote ? [{
                  id: 'reply',
                  sender: 'admin',
                  senderName: 'المشرف الأكاديمي',
                  text: activeTicket.replyNote,
                  timestamp: 'رد معتمد'
                }] : [])
              ];

              return (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setAdminActiveChatTicketId(null)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-white cursor-pointer flex items-center gap-1"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>رجوع لكافة البلاغات</span>
                    </button>
                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        دردشة مع الطالب: {activeTicket.studentName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        مقرر {activeTicket.subjectName} • الرقم: {activeTicket.examNumber}
                      </span>
                    </div>
                  </div>

                  {/* Chat Message Stream */}
                  <div className="space-y-3 p-3 bg-slate-100/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-64 overflow-y-auto">
                    {msgs.map((msg) => {
                      const isStudent = msg.sender === 'student';
                      return (
                        <div key={msg.id} className={`flex flex-col space-y-1 ${isStudent ? 'items-start' : 'items-end'}`}>
                          <span className="text-[10px] text-slate-400 font-bold px-1 flex items-center gap-1">
                            {!isStudent && <ShieldCheck className="w-3 h-3 text-indigo-400" />}
                            <span>{msg.senderName}</span>
                            <span>•</span>
                            <span>{msg.timestamp}</span>
                          </span>
                          <div className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed shadow-xs ${
                            isStudent
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-300 dark:border-slate-700'
                              : 'bg-indigo-600 text-white rounded-tr-xs'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Admin Direct Chat Reply */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="اكتب رداً للطالب في المحادثة..."
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendAdminChatMessage(activeTicket.id);
                        }
                      }}
                      className="flex-1 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden text-right"
                    />
                    <button
                      onClick={() => handleSendAdminChatMessage(activeTicket.id)}
                      className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4 rotate-180" />
                    </button>
                  </div>

                  {/* Actions to Resolve / Reject */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400">
                      العلامة الحالية: {activeTicket.currentMark}% {activeTicket.requestedMark && `⟵ المطلوبة: ${activeTicket.requestedMark}%`}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          resolveGradeAppeal(activeTicket.id, 'resolved', 'تم التدقيق وقبول الاعتراض وتصحيح العلامة.', activeTicket.requestedMark);
                          setAppealSuccessToast('تم قبول الاعتراض وتصحيح علامة الطالب!');
                          setTimeout(() => setAppealSuccessToast(null), 4000);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                      >
                        قبول وتصحيح العلامة
                      </button>
                      <button
                        onClick={() => {
                          resolveGradeAppeal(activeTicket.id, 'rejected', 'تمت المراجعة وتأكيد دقة العلامة المسجلة.');
                          setAppealSuccessToast('تم تثبيت العلامة المسجلة.');
                          setTimeout(() => setAppealSuccessToast(null), 4000);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                      >
                        تثبيت العلامة (رفض)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })() : (
              /* All Tickets List */
              gradeAppeals.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  لا توجد طلبات اعتراض مقدمة حالياً.
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto p-1">
                  {gradeAppeals.map((appeal) => (
                    <div
                      key={appeal.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                          appeal.status === 'resolved' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : appeal.status === 'rejected' 
                            ? 'bg-rose-500/20 text-rose-400' 
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {appeal.status === 'resolved' ? 'تمت المعالجة وتعديل العلامة ✓' : appeal.status === 'rejected' ? 'مرفوض ✕' : 'قيد المراجعة ⏳'}
                        </span>
                        <div className="font-bold text-slate-800 dark:text-white">
                          {appeal.studentName} (الرقم: {appeal.examNumber})
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span>العلامة الحالية: <strong>{appeal.currentMark}%</strong> {appeal.requestedMark && `⟵ المطلوبة: ${appeal.requestedMark}%`}</span>
                          <span className="font-bold text-indigo-400">{appeal.subjectName}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
                          "{appeal.description}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          onClick={() => setAdminActiveChatTicketId(appeal.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>فتح محادثة الدردشة والرد</span>
                        </button>

                        {appeal.status === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => resolveGradeAppeal(appeal.id, 'resolved', 'تم التدقيق وتعديل العلامة.', appeal.requestedMark)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer text-[11px]"
                            >
                              قبول فوري
                            </button>
                            <button
                              onClick={() => resolveGradeAppeal(appeal.id, 'rejected', 'تمت المراجعة وتأكيد دقة العلامة المسجلة.')}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer text-[11px]"
                            >
                              رفض
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            <button
              onClick={() => {
                setShowAdminAppealsModal(false);
                setAdminActiveChatTicketId(null);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer hover:bg-slate-700"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: SUPERVISOR CURRICULUM SUBJECTS MANAGEMENT       */}
      {/* ======================================================== */}
      {showAdminSubjectsModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121B2F] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-right max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <button 
                onClick={() => setShowAdminSubjectsModal(false)}
                className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span>لوحة المشرف لإدارة وتعديل مقررات المنهاج الأكاديمي</span>
              </h3>
            </div>

            {/* Select Year and Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">السنة الدراسية:</label>
                <InAppSelect<AcademicYearId>
                  value={adminSubjectYear}
                  onChange={(val) => setAdminSubjectYear(val)}
                  size="sm"
                  variant="adaptive"
                  options={[
                    { value: 'year-prep', label: 'السنة التحضيرية' },
                    { value: 'year-2', label: 'السنة الثانية' },
                    { value: 'year-3', label: 'السنة الثالثة' },
                    { value: 'year-4', label: 'السنة الرابعة' },
                    { value: 'year-5', label: 'السنة الخامسة' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الفصل الدراسي:</label>
                <InAppSelect<SemesterType>
                  value={adminSubjectSemester}
                  onChange={(val) => setAdminSubjectSemester(val)}
                  size="sm"
                  variant="adaptive"
                  options={[
                    { value: 'first', label: 'الفصل الأول' },
                    { value: 'second', label: 'الفصل الثاني' },
                  ]}
                />
              </div>
            </div>

            {/* Add New Subject Section */}
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>إضافة مقرر جديد لهذا الفصل:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="اسم المقرر (مثلاً: قلبية)"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white text-right"
                />
                <input
                  type="text"
                  placeholder="القسم الأكاديمي"
                  value={newSubjectDept}
                  onChange={(e) => setNewSubjectDept(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white text-right"
                />
              </div>
              <button
                onClick={async () => {
                  if (!newSubjectName.trim()) return;
                  await addSubject({
                    name: newSubjectName.trim(),
                    department: newSubjectDept.trim() || 'قسم الكلية',
                    yearId: adminSubjectYear,
                    semester: adminSubjectSemester,
                    color: '#4F46E5',
                    questionsCount: 0,
                    filesCount: 0,
                    totalVideosCount: 0,
                    totalHoursDuration: '00:00:00'
                  });
                  setNewSubjectName('');
                  setNewSubjectDept('');
                  setAppealSuccessToast('تمت إضافة المقرر الجديد بنجاح!');
                  setTimeout(() => setAppealSuccessToast(null), 4000);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة المقرر للمنهاج</span>
              </button>
            </div>

            {/* List of existing subjects in selected year & semester */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 block">المقررات الحالية في هذا الفصل:</span>
              <div className="space-y-2 max-h-60 overflow-y-auto p-1">
                {subjects
                  .filter(s => s.yearId === adminSubjectYear && s.semester === adminSubjectSemester)
                  .map((sub) => {
                    const isEditing = editingSubjectId === sub.id;
                    return (
                      <div 
                        key={sub.id}
                        className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        {isEditing ? (
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={editingSubjectName}
                              onChange={(e) => setEditingSubjectName(e.target.value)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                            />
                            <input
                              type="text"
                              value={editingSubjectDept}
                              onChange={(e) => setEditingSubjectDept(e.target.value)}
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                            />
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {sub.name}
                              </h5>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {sub.department || 'قسم الكلية'}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEditing ? (
                            <>
                              <button
                                onClick={async () => {
                                  if (!editingSubjectName.trim()) return;
                                  await updateSubject(sub.id, {
                                    name: editingSubjectName.trim(),
                                    department: editingSubjectDept.trim() || undefined
                                  });
                                  setEditingSubjectId(null);
                                  setAppealSuccessToast('تم حفظ تعديل المقرر بنجاح!');
                                  setTimeout(() => setAppealSuccessToast(null), 4000);
                                }}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                              >
                                حفظ
                              </button>
                              <button
                                onClick={() => setEditingSubjectId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingSubjectId(sub.id);
                                  setEditingSubjectName(sub.name);
                                  setEditingSubjectDept(sub.department || '');
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-400 cursor-pointer"
                                title="تعديل اسم وبيانات المقرر"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSub(sub)}
                                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer"
                                title="حذف المقرر"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <button
              onClick={() => setShowAdminSubjectsModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer hover:bg-slate-700 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for deleting curriculum subject */}
      <ConfirmationDialog
        isOpen={Boolean(confirmDeleteSub)}
        title="تأكيد حذف المقرر"
        message={confirmDeleteSub ? `هل أنت متأكد من حذف مقرر "${confirmDeleteSub.name}"؟` : ''}
        onConfirm={() => {
          if (confirmDeleteSub) {
            deleteSubject(confirmDeleteSub.id);
            setConfirmDeleteSub(null);
          }
        }}
        onCancel={() => setConfirmDeleteSub(null)}
      />

    </div>
  );
};
