import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Send,
  ThumbsUp,
  Trash2,
  ShieldCheck,
  User,
  CheckCircle2,
  Sparkles,
  Edit3,
  Check,
} from 'lucide-react';
import { QuestionItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { canUserModifyComment } from '../../utils/mediaAndOfflineLogic';

interface QuestionDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionItem | null;
  subjectName?: string;
  onRequestDeleteComment?: (commentId: string, commentPreview: string) => void;
}

export const QuestionDiscussionModal: React.FC<QuestionDiscussionModalProps> = ({
  isOpen,
  onClose,
  question,
  subjectName,
  onRequestDeleteComment,
}) => {
  const {
    user,
    isAdmin,
    isGuest,
    setIsAuthModalOpen,
    questionComments,
    addQuestionComment,
    updateQuestionComment,
    deleteQuestionComment,
    toggleLikeQuestionComment,
  } = useApp();

  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  if (!isOpen || !question) return null;

  const commentsForQuestion = questionComments.filter(
    (c) => c.questionId === question.id
  );

  const optionLabels = ['A', 'B', 'C', 'D'];
  const optionTexts = [
    question.optionA,
    question.optionB,
    question.optionC,
    question.optionD,
  ];
  const correctLabel = optionLabels[question.correctOptionIndex] || 'A';
  const correctText = optionTexts[question.correctOptionIndex] || question.optionA;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addQuestionComment(question.id, newCommentText.trim());
      setNewCommentText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    const trimmed = editingContent.trim();
    if (!trimmed) return;
    await updateQuestionComment(commentId, trimmed);
    setEditingCommentId(null);
    setEditingContent('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="مناقشة الطلاب السريرية حول السؤال"
    >
      <div className="bg-[#111A2E] border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden text-right">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0E1628]">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="إغلاق نافذة المناقشة"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center justify-end gap-2">
                <span>مناقشة الطلاب والتبريرات السريرية</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold tabular-nums">
                  {commentsForQuestion.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {subjectName ? `${subjectName} · ` : ''}
                {question.chapterName || 'بنك الأتمتة الطبية - مدفور'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Question Context Banner */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#152238] border-b border-slate-800/80 space-y-2">
          <p className="text-xs sm:text-sm font-bold text-slate-100 leading-relaxed">
            {question.questionText}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                الجواب المعتمد ({correctLabel}): {correctText}
              </span>
            </span>
            {question.year && (
              <span className="text-amber-400 font-bold">{question.year}</span>
            )}
          </div>
        </div>

        {/* Comments Thread Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {commentsForQuestion.length === 0 ? (
            <div className="text-center py-10 px-4 bg-[#0E1628]/70 rounded-2xl border border-dashed border-slate-800 space-y-2.5">
              <Sparkles className="w-9 h-9 text-sky-400 mx-auto opacity-80" />
              <h4 className="text-sm font-bold text-white">
                لا توجد مداخلات طلابية على هذا السؤال بعد
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                كن أول من يشارك تعليلاً سريرياً، أو قاعدة حفظ سريعة (Mnemonic)، أو استفساراً علمياً مع زملائك في كلية الطب البشري.
              </p>
            </div>
          ) : (
            commentsForQuestion.map((comment) => {
              const isSupervisor = comment.authorRole === 'admin';
              const currentUserId = user?.uid || 'student-guest';
              const canModify = canUserModifyComment(comment, currentUserId, isAdmin);
              const isMyComment = currentUserId === comment.authorId;
              const isLiked = comment.likedBy.includes(currentUserId);
              const isEditingThis = editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className={`p-4 rounded-2xl border transition-colors space-y-2.5 ${
                    isSupervisor
                      ? 'bg-emerald-950/25 border-emerald-500/40'
                      : 'bg-[#162238]/90 border-slate-800'
                  }`}
                >
                  {/* Comment Author & Timestamp Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400">
                        {comment.createdAt}
                      </span>
                      {comment.isEdited && (
                        <span className="text-[10px] font-bold text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                          (معدّل)
                        </span>
                      )}

                      {canModify && !isEditingThis && (
                        <div className="flex items-center gap-1">
                          {(isMyComment || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingContent(comment.content);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="تعديل التعليق"
                              aria-label="تعديل التعليق"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>تعديل</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (onRequestDeleteComment) {
                                onRequestDeleteComment(comment.id, comment.content);
                              } else {
                                deleteQuestionComment(comment.id);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="حذف التعليق"
                            aria-label="حذف التعليق"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>حذف</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isSupervisor ? (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>مشرف أكاديمي</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold">
                              {comment.authorBatch || 'طالب طب بشري'}
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-black text-white">
                            {comment.authorName}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSupervisor
                            ? 'bg-emerald-600 text-white'
                            : 'bg-sky-600/25 text-sky-300 border border-sky-500/30'
                        }`}
                      >
                        {isSupervisor ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comment Content or Inline Editor */}
                  {isEditingThis ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={3}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full p-2.5 bg-[#0E1628] border border-sky-500/60 rounded-xl text-xs sm:text-sm text-white focus:outline-hidden text-right leading-relaxed resize-none"
                        placeholder="عدّل نص تعليقك..."
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingContent('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          type="button"
                          disabled={!editingContent.trim()}
                          onClick={() => handleSaveEdit(comment.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>حفظ التعديل</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line pr-1">
                      {comment.content}
                    </p>
                  )}

                  {/* Helpful / Upvote Button */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => toggleLikeQuestionComment(comment.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer tabular-nums ${
                        isLiked
                          ? 'bg-sky-500/25 border border-sky-500/50 text-sky-300'
                          : 'bg-slate-800/80 border border-slate-700/70 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{comment.likesCount}</span>
                      <span>مفيد سريرياً</span>
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Comment Form Footer */}
        {isGuest ? (
          <div className="p-3.5 sm:p-4 bg-[#0E1628] border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                setIsAuthModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shrink-0"
            >
              تسجيل الدخول للمشاركة
            </button>
            <span className="text-xs font-bold text-slate-300 text-right">
              وضع الضيف يتيح قراءة التعليقات فقط — سجل الدخول كطالب أو مشرف لإضافة تعليق
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-3.5 sm:p-4 bg-[#0E1628] border-t border-slate-800 space-y-2.5"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                النشر باسم:{' '}
                <strong className="text-emerald-400">
                  {user?.displayName || 'طالب طب'}
                </strong>{' '}
                ({isAdmin ? 'مشرف أكاديمي' : user?.batch || 'كلية الطب البشري'})
              </span>
              <span>شارك تعليلاً علمياً أو ملاحظة للزملاء</span>
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmitting}
                className="px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-lg shadow-sky-950/50"
              >
                <Send className="w-4 h-4" />
                <span>إرسال التعليق</span>
              </button>

              <textarea
                rows={2}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="اكتب تعليقك السريري أو سؤالك لزملائك حول هذا السؤال..."
                className="flex-1 p-3 bg-[#152238] border border-slate-700 focus:border-sky-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-hidden text-right leading-relaxed resize-none"
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
