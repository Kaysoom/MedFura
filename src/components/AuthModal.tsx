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
  Sparkles,
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
    quickSwitchPersona 
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('2024-10492');
  const [academicYear, setAcademicYear] = useState('السنة الخامسة');
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
      const msg = err instanceof Error ? err.message : 'فشل تسجيل الدخول. تحقق من البيانات أو جرّب الدخول السريع التجريبي.';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header bar */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white text-center">
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-xl font-black">
            بوابة الجامعة الإلكترونية
          </h2>
          <p className="text-xs text-indigo-100/90 mt-1">
            سجل دخولك للوصول لبنك الأتمتة والمكتبة وسوق المستلزمات
          </p>
        </div>

        {/* Content body */}
        <div className="p-6">
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-5">
            <button
              onClick={() => { setMode('login'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setMode('register'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              طالب جديد
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Admin Detection Badge */}
          {isCurrentEmailAdmin && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-bold">تم التعرف على إيميل المشرف الرئيسي!</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">سيتم تفعيل وضع المشرف (Admin Mode) وصلاحيات الإدارة تلقائياً عند الدخول.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Student ID (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الرقم الجامعي <span className="text-rose-500 font-extrabold">* (إجباري)</span>
              </label>
              <div className="relative">
                <Hash className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="مثال: 2024-10492"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Academic Year (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                السنة الدراسية <span className="text-rose-500 font-extrabold">* (إجباري)</span>
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="student@univ.edu أو إيميل المشرف"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
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
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium">
                أو المتابعة عبر
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>تسجيل الدخول بحساب Google (Firebase)</span>
          </button>

          {/* Quick Demo Logins for Instant Testing */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2 text-center">
              اختبار سريع وتجربة فورية (بدون إدخال بيانات):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  quickSwitchPersona('admin');
                  setIsAuthModalOpen(false);
                }}
                className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>دخول كـ مشرف (Admin)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  quickSwitchPersona('student');
                  setIsAuthModalOpen(false);
                }}
                className="p-2 rounded-xl bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 border border-indigo-100 dark:border-slate-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>دخول كـ طالب (Student)</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-600 dark:text-slate-400 mt-2">
              إيميل المشرف المعين: <span className="font-mono text-slate-600 dark:text-slate-300">{ADMIN_EMAIL}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
