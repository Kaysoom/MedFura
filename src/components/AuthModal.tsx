import React, { useState } from 'react';
import { useApp, ADMIN_EMAIL } from '../context/AppContext';
import { 
  X, 
  GraduationCap, 
  ShieldCheck, 
  User, 
  Mail, 
  Lock, 
  Hash, 
  Calendar, 
  AlertCircle, 
  Eye,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { InAppSelect } from './Common/InAppSelect';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    loginWithGoogle, 
    loginWithEmail, 
    switchAccount,
    accountType
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [academicYear, setAcademicYear] = useState('السنة الثالثة');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!studentId.trim()) {
      setErrorMessage('يرجى إدخال الرقم الجامعي بشكل إجباري.');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email, password, studentId, academicYear, mode === 'register');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول. تحقق من البيانات أو اختر أحد الحسابات المؤقتة بالأسفل.';
      setErrorMessage(msg.includes('auth/invalid-credential') ? 'البريد أو كلمة المرور غير صحيحة.' : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    if (!studentId.trim()) {
      setErrorMessage('يرجى كتابة الرقم الجامعي قبل المتابعة بحساب Google.');
      return;
    }
    setLoading(true);
    try {
      await loginWithGoogle(studentId, academicYear);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ في Google Sign-In.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentEmailAdmin = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto bg-white dark:bg-[#0E172A] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Header bar */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-4 sm:p-5 text-white text-center">
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-3.5 left-3.5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-base sm:text-lg font-black">
            تسجيل الدخول — MedFur
          </h2>
        </div>

        {/* Content body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* 3 Isolated Temporary Accounts Section */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="text-right">
              <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                الحسابات المؤقتة المفصولة (للاختبار والتجربة الفورية)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                ما يرفعه المشرف من صور وملفات وأتمتات يظهر فوراً لدى الطالب والضيف، مع عزل إحصائيات وإجابات كل حساب بشكل مستقل:
              </p>
            </div>

            <div className="space-y-2">
              {/* 1. Admin Account with Role Toggle */}
              <button
                type="button"
                onClick={() => {
                  switchAccount('admin');
                  setIsAuthModalOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                  accountType === 'admin'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-200 shadow-xs'
                    : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center gap-1 shrink-0">
                  {accountType === 'admin' && (
                    <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300">
                    مشرف + تحويل
                  </span>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="text-right min-w-0">
                    <p className="text-xs font-black truncate">1. حساب المشرف الأكاديمي</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      يتضمن وضع المشرف وزر التحويل لمعاينة واجهة الطالب
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </button>

              {/* 2. Standalone Student Account (No Admin/Student Toggle Badge) */}
              <button
                type="button"
                onClick={() => {
                  switchAccount('student');
                  setIsAuthModalOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                  accountType === 'student'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                    : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center gap-1 shrink-0">
                  {accountType === 'student' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                    طالب فقط
                  </span>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="text-right min-w-0">
                    <p className="text-xs font-black truncate">2. حساب الطالب المستقل</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      واجهة طالب كاملة بدون ظهور زر وضع المشرف أو الطالب
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                </div>
              </button>

              {/* 3. Guest Mode */}
              <button
                type="button"
                onClick={() => {
                  switchAccount('guest');
                  setIsAuthModalOpen(false);
                }}
                className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                  accountType === 'guest'
                    ? 'bg-sky-500/15 border-sky-500 text-sky-800 dark:text-sky-200 shadow-xs'
                    : 'bg-white dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-sky-500/40'
                }`}
              >
                <div className="flex items-center gap-1 shrink-0">
                  {accountType === 'guest' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-300">
                    زائر / ضيف
                  </span>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="text-right min-w-0">
                    <p className="text-xs font-black truncate">3. وضع الضيف (بدون حساب)</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      تصفح الأقسام وتجربة حل الأتمتة دون صلاحية الرفع أو النشر
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-500 flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="px-2 bg-white dark:bg-[#0E172A] text-slate-500 dark:text-slate-400 font-bold">
                أو تسجيل الدخول عبر البريد / Google
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => { setMode('login'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setMode('register'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              طالب جديد
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Admin Detection Badge */}
          {isCurrentEmailAdmin && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-bold">تم التعرف على إيميل المشرف الرئيسي!</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">سيتم تفعيل وضع المشرف وصلاحيات الإدارة تلقائياً عند الدخول.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Student ID (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 text-right">
                الرقم الجامعي <span className="text-rose-500 font-extrabold">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="أدخل رقمك الجامعي..."
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 text-right"
                />
              </div>
            </div>

            {/* Academic Year (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 text-right">
                السنة الدراسية <span className="text-rose-500 font-extrabold">*</span>
              </label>
              <InAppSelect
                value={academicYear}
                onChange={(val) => setAcademicYear(val)}
                variant="adaptive"
                icon={<Calendar className="w-4 h-4 text-slate-400" />}
                options={[
                  { value: 'السنة الأولى (التحضيرية)', label: 'السنة الأولى (التحضيرية)' },
                  { value: 'السنة الثانية', label: 'السنة الثانية' },
                  { value: 'السنة الثالثة', label: 'السنة الثالثة' },
                  { value: 'السنة الرابعة', label: 'السنة الرابعة' },
                  { value: 'السنة الخامسة', label: 'السنة الخامسة' },
                  { value: 'السنة السادسة (الامتياز)', label: 'السنة السادسة (الامتياز)' },
                ]}
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 text-right">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="student@univ.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 text-right"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 text-right">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 text-right"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'دخول المنصة' : 'تسجيل حساب جامعي جديد'}</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>تسجيل الدخول بحساب Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};

