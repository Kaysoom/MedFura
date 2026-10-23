import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Brain,
  Sparkles,
  Send,
  Trash2,
  Stethoscope,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
} from 'lucide-react';
import { FormattedMedicalMarkdown } from './AITutorModal';

export interface GeminiContextData {
  yearName?: string;
  semesterName?: string;
  subjectName?: string;
  chapterName?: string;
  statsSummary?: {
    total: number;
    solved: number;
    correct: number;
    wrong: number;
    accuracy: number;
  };
  recentMistakes?: {
    questionText: string;
    correctAnswer: string;
    explanation?: string;
    chapterName?: string;
  }[];
  savedNotes?: {
    questionText: string;
    note: string;
  }[];
  activeQuestionsSample?: {
    questionText: string;
    correctAnswer: string;
    explanation?: string;
  }[];
}

interface GeminiContextChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: GeminiContextData;
}

export const GeminiContextChatModal: React.FC<GeminiContextChatModalProps> = ({
  isOpen,
  onClose,
  contextData,
}) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const scopeLabel = contextData.chapterName
    ? `${contextData.subjectName || 'المادة'} · ${contextData.chapterName}`
    : contextData.subjectName || `${contextData.yearName || 'الطب البشري'} · ${contextData.semesterName || ''}`;

  useEffect(() => {
    const targetName = contextData.chapterName || contextData.subjectName || 'هذا القسم';
    const hasMistakes = (contextData.recentMistakes?.length || 0) > 0;

    setSuggestedPrompts([
      `💡 لخّص لي أهم الأفكار العلمية والفروق الحاسمة في ${targetName}`,
      hasMistakes
        ? `💡 حلّل الأسئلة التي أخطأت بها (${contextData.recentMistakes?.length}) واشرح لي الآلية العلمية الصحيحة لكل منها`
        : `💡 ما هي أهم المقارنات العلمية والسريرية عالية الأهمية في ${targetName}؟`,
      `💡 اختبرني بسؤال سريري استنتاجي عميق (High-Thinking) حول ${targetName}`,
    ]);
  }, [contextData.subjectName, contextData.chapterName, contextData.recentMistakes?.length]);

  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (customText?: string) => {
    const rawText = (customText ?? input).trim();
    if (!rawText || isLoading) return;
    const cleanText = rawText.replace(/^💡\s*/, '').trim();

    const nextHistory: { role: 'user' | 'assistant'; text: string }[] = [
      ...messages,
      { role: 'user', text: cleanText },
    ];
    setMessages(nextHistory);
    if (!customText) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-tutor/context-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: cleanText,
          history: nextHistory,
          context: contextData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.reply },
        ]);
        if (Array.isArray(data.suggestedPrompts) && data.suggestedPrompts.length > 0) {
          setSuggestedPrompts(data.suggestedPrompts);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `**تحليل علمي مباشر (${scopeLabel}):**\n• يرجى تحديد المفهوم التشريحي أو الفيزيولوجي أو اختيار أحد الأسئلة المقترحة بالأسفل لتحليله بالتفصيل.`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `**تحليل علمي مباشر (${scopeLabel}):**\n• تعذر الاتصال المؤقت بالخادم، حاول إرسال سؤالك مرة أخرى.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="محادثة Gemini الطبية الواعية بالسياق"
    >
      <div className="bg-[#111A2E] border border-violet-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0E1628]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="إغلاق المحادثة الذكية"
            >
              <X className="w-5 h-5" />
            </button>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="مسح المحادثة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center justify-end gap-1.5">
                <span>مساعد Gemini الطبي السياقي · High Thinking</span>
              </h3>
              <p className="text-[11px] text-violet-300 font-semibold flex items-center justify-end gap-1">
                <span>واعي بسياق دراستك وأخطائك · اختيار ذكي تلقائي للنموذج</span>
                <Brain className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center shadow-lg shadow-violet-950/50 shrink-0">
              <Stethoscope className="w-5 h-5 text-pink-400" />
            </div>
          </div>
        </div>

        {/* Active Study Context Strip */}
        <div className="px-4 py-2.5 bg-[#0A101F] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-3 text-slate-300 font-bold">
            {contextData.statsSummary && (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>الدقة: {contextData.statsSummary.accuracy}%</span>
              </span>
            )}
            {(contextData.recentMistakes?.length || 0) > 0 && (
              <span className="flex items-center gap-1 text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>أخطاء مسجلة: {contextData.recentMistakes?.length}</span>
              </span>
            )}
            {(contextData.savedNotes?.length || 0) > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <Bookmark className="w-3.5 h-3.5" />
                <span>ملاحظاتك: {contextData.savedNotes?.length}</span>
              </span>
            )}
          </div>
          <div className="text-sky-400 font-black truncate max-w-full">
            السياق النشط: {scopeLabel}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="p-5 rounded-2xl bg-[#152036] border border-slate-800 space-y-3 text-right">
              <div className="flex items-center justify-end gap-2 text-violet-300 font-black text-xs sm:text-sm">
                <span>مرحباً بك في محادثة التفكير الطبي العميق (Gemini Context Chat)</span>
                <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                هذا المساعد مرتبط مباشرةً بسياقك الحالي في <strong>{scopeLabel}</strong>، ويعرف الأسئلة التي تتدرب عليها والأفكار التي أخطأت بها. يمكنك سؤاله عن أي آلية تشريحية أو فيزيولوجية أو سريرية، أو طلب مقارنة مركزة بدون حشو.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-sky-950/80 border border-sky-500/40 text-slate-100 ml-6'
                      : 'bg-[#16223A] border border-violet-500/40 text-slate-100 mr-4'
                  }`}
                >
                  <span className="block text-[10px] font-black mb-1.5 text-violet-300">
                    {m.role === 'user'
                      ? 'سؤالك:'
                      : 'الموجّه الطبي السياقي (Gemini High Thinking):'}
                  </span>
                  <FormattedMedicalMarkdown content={m.text} />
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="p-3.5 rounded-2xl bg-[#16223A] border border-violet-500/30 text-xs text-violet-300 font-bold animate-pulse flex items-center justify-end gap-2">
              <span>جاري التحليل والاستنتاج العميق (High Thinking) بناءً على سياقك الدراسي...</span>
              <Brain className="w-4 h-4 text-pink-400" />
            </div>
          )}

          {/* Contextual Smart Prompts */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-end gap-1.5 text-[11px] font-extrabold text-violet-300">
              <span>استفسارات سياقية ذكية مقترحة لك الآن:</span>
              <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
            </div>
            <div className="flex flex-col gap-2">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={`${i}-${prompt}`}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="w-full text-right px-3.5 py-2.5 rounded-xl bg-[#152036] hover:bg-violet-600/25 border border-violet-500/30 hover:border-violet-400/60 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer flex items-center justify-end gap-2"
                >
                  <span className="leading-relaxed">
                    {prompt.startsWith('💡') ? prompt : `💡 ${prompt}`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div ref={chatEndRef} />
        </div>

        {/* Input Footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3.5 sm:p-4 bg-[#0E1628] border-t border-slate-800 flex items-center gap-2"
        >
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>إرسال</span>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل المساعد السياقي عن أي مفهوم طبي أو اطلب تلخيصاً أو مقارنة..."
            className="flex-1 px-3.5 py-2.5 bg-[#152238] border border-slate-700 focus:border-violet-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden text-right"
          />
        </form>
      </div>
    </div>
  );
};
