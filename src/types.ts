export type AcademicYearId = 'year-prep' | 'year-2' | 'year-3' | 'year-4' | 'year-5' | 'year-6';
export type SemesterType = 'first' | 'second';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  lastName?: string; // اللقب أو النسبة
  studentId: string; // الرقم الجامعي أو الامتحاني
  examNumber?: string; // الرقم الامتحاني
  yearBadge?: '2' | '3' | '0'; // 2 لسنة ثانية، 3 لسنة ثالثة، 0 للآخرين
  academicYear: string;
  batch?: string; // e.g. "دفعة 30"
  role: 'student' | 'admin';
  photoURL?: string;
  blockedUsers?: string[]; // قائمة الأرقام الامتحانية أو المعرفات المحظورة
  createdAt?: string;
}

export interface AcademicYear {
  id: AcademicYearId;
  name: string;
  description: string;
}

export type ChapterCategory = 'section' | 'lecture' | 'comprehensive_partial';

export interface ChapterItem {
  id: string;
  name: string;
  category?: ChapterCategory; // أقسام | محاضرات | شامل وجزئي
  questionsCount?: number;
}

export interface SubjectItem {
  id: string;
  name: string;
  code?: string;
  yearId: AcademicYearId;
  semester: SemesterType;
  icon: string;
  color?: string; // color accent matching screenshot
  questionsCount: number;
  filesCount: number;
  totalVideosCount?: number; // إجمالي عدد الفيديوهات
  totalHoursDuration?: string; // إجمالي ساعات الشرح e.g. 23:12:03
  description?: string;
  department?: string;
  chapters?: ChapterItem[];
}

export interface QuestionItem {
  id: string;
  subjectId: string;
  chapterId: string;
  chapterName?: string;
  category?: ChapterCategory;
  sequenceNumber?: number; // الرقم التسلسلي للسؤال داخل القسم (مثلاً 8، 9، 10...)
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  optionF?: string;
  optionG?: string;
  optionH?: string;
  options?: string[]; // مصفوفة الخيارات الديناميكية (من 4 إلى 8 خيارات)
  correctOptionIndex: number; // 0 to 7 (A to H)
  explanation?: string;
  year?: string;
  createdBy?: string;
  createdAt?: string;
}

export const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export function getQuestionOptions(
  q: Pick<
    QuestionItem,
    | 'optionA'
    | 'optionB'
    | 'optionC'
    | 'optionD'
    | 'optionE'
    | 'optionF'
    | 'optionG'
    | 'optionH'
    | 'options'
  >
): { label: string; text: string; idx: number }[] {
  if (Array.isArray(q.options) && q.options.length > 0) {
    return q.options
      .map((text, idx) => ({
        label: OPTION_LABELS[idx] || String.fromCharCode(65 + idx),
        text: (text || '').trim(),
        idx,
      }))
      .filter((item) => item.text.length > 0);
  }

  const rawFields = [
    q.optionA,
    q.optionB,
    q.optionC,
    q.optionD,
    q.optionE,
    q.optionF,
    q.optionG,
    q.optionH,
  ];

  const result: { label: string; text: string; idx: number }[] = [];
  rawFields.forEach((val, idx) => {
    const trimmed = (val || '').trim();
    if (trimmed.length > 0 || idx < 4) {
      if (trimmed.length > 0) {
        result.push({
          label: OPTION_LABELS[idx] || String.fromCharCode(65 + idx),
          text: trimmed,
          idx,
        });
      }
    }
  });

  return result;
}


export interface QuestionNote {
  questionId: string;
  note: string;
  updatedAt: string;
}

export interface AutomationStats {
  totalQuestions: number;
  totalSolved: number;
  remainingCount: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
}

export interface QuestionCommentItem {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'admin';
  authorBatch?: string;
  content: string;
  createdAt: string;
  likesCount: number;
  likedBy: string[];
}

export type QuestionReportIssueType =
  | 'wrong_key'
  | 'typo'
  | 'missing_options'
  | 'other';

export interface QuestionReportItem {
  id: string;
  questionId: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterName?: string;
  questionTextSnapshot: string;
  reporterId: string;
  reporterName: string;
  reporterExamNumber?: string;
  issueType: QuestionReportIssueType;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolutionNote?: string;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface LibraryFolderItem {
  id: string;
  name: string;
  parentId: string | null; // null for root folders
  type: 'folder';
  yearId?: AcademicYearId;
  semester?: SemesterType;
  subjectId?: string;
}

export interface LibraryFileItem {
  id: string;
  folderId: string; // ID of the parent folder
  title: string;
  fileType: 'محاضرة' | 'تفريغ / نوطة' | 'سلايدات' | 'كتاب / مرجع' | 'دورة امتحانية' | 'أخرى';
  author: string;
  fileSize: string;
  downloadsCount: number;
  downloadUrl?: string;
  pages?: number;
  date?: string;
}

export interface VideoFolderItem {
  id: string;
  name: string;
  parentId: string | null;
  subjectId?: string;
  yearId?: AcademicYearId;
  semester?: SemesterType;
}

export interface VideoItem {
  id: string;
  folderId?: string;
  subjectId: string;
  chapterId?: string;
  chapterName?: string;
  title: string;
  doctorName: string;
  duration: string;
  videoUrl: string;
  thumbnail?: string;
  academicYear: string;
  yearId?: AcademicYearId;
  semester?: SemesterType;
  viewsCount: number;
  uploadedAt?: string;
  description?: string;
  requiresInternet?: boolean;
  downloadUrl?: string;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  category: 'جامعية' | 'غير جامعية';
  academicYear: string;
  dealType: 'بيع' | 'إعارة' | 'إيجار' | 'إهداء';
  price: string;
  status: 'متاح' | 'تم البيع';
  imageUrl?: string;
  telegramUsername?: string;
  whatsappNumber?: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  createdAt: string;
  views?: number;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: 'رسمي' | 'امتحانات' | 'الهيئة الطلابية' | 'فعاليات';
  date: string;
  isPinned: boolean;
  author: string;
}

export interface GradeItem {
  id: string;
  studentId?: string;
  subjectName: string;
  code?: string;
  mark: number; // النسبة المئوية للعلامة /100
  batchAverage?: number; // متوسط الدفعة في المادة
  semester: SemesterType;
  yearId: AcademicYearId;
  isSelfEntered?: boolean; // خاص بالسنة التحضيرية
}

export interface StudentLeaderboardEntry {
  id: string;
  examNumber: string;
  name: string;
  lastName?: string;
  batch: string; // مثال: "دفعة 30"
  academicYear: AcademicYearId;
  rank: number;
  average: number; // النسبة المئوية الدقيقة لسنوات الكلية (بدون تحضيري)
  averageWithPrep?: number; // النسبة المئوية الدقيقة التراكمية (مع التحضيري)
  semester1Average?: number;
  semester2Average?: number;
  grades: {
    subjectName: string;
    semester: SemesterType;
    mark: number;
    batchAverage: number;
  }[];
}

export interface GradeAppealMessage {
  id: string;
  sender: 'student' | 'admin';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface GradeAppealTicket {
  id: string;
  studentId: string;
  studentName: string;
  examNumber: string;
  subjectName: string;
  yearId: AcademicYearId;
  semester: SemesterType;
  currentMark: number;
  requestedMark?: number;
  description: string;
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: string;
  replyNote?: string;
  messages?: GradeAppealMessage[];
}

// Telegram-like Forum & Chat System
export type ChatMessageType = 'text' | 'voice' | 'image' | 'video' | 'file' | 'poll' | 'mcq';

export interface PollOption {
  text: string;
  votes: number;
  votedUserIds: string[];
}

export interface PollData {
  question: string;
  options: PollOption[];
  totalVotes: number;
}

export interface MCQData {
  question: string;
  options: string[];
  correctIndex: number;
  answeredUsers?: Record<string, number>; // userId -> chosen index
}

export interface CommunityMessage {
  id: string;
  channelId?: string; // 'general' | 'year-2' | 'year-3' | undefined (for direct message)
  receiverId?: string; // for direct messages
  senderId: string;
  senderName: string;
  senderLastName?: string;
  senderExamNumber?: string;
  senderYearBadge: '2' | '3' | '0'; // 2, 3, or 0
  senderRole?: 'student' | 'admin';
  type: ChatMessageType;
  content: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  voiceDuration?: number; // seconds
  poll?: PollData;
  mcq?: MCQData;
  createdAt: string;
  timestamp: number;
}

export interface ChannelInfo {
  id: string;
  name: string;
  badge: '2' | '3' | 'all' | 'admin' | string;
  description: string;
  isLocked: boolean; // locked unless student verified
  isSupervisorOnly?: boolean; // strictly for supervisors/admins
  requiredYear?: 'year-2' | 'year-3';
  membersCount: number;
  restrictions: {
    allowText: boolean;
    allowVoice: boolean;
    allowMedia: boolean;
    allowPolls: boolean;
  };
}

export interface ChannelJoinRequest {
  id: string;
  userId: string;
  userName: string;
  examNumber: string;
  targetChannelId: string;
  targetChannelName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface DiscussionComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'admin';
  content: string;
  createdAt: string;
}

export interface DiscussionPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'admin';
  academicYear: string;
  title: string;
  content: string;
  likesCount: number;
  comments: DiscussionComment[];
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

export type ActiveSection = 
  | 'home' 
  | 'automation' 
  | 'library' 
  | 'marketplace' 
  | 'videos' 
  | 'grades' 
  | 'announcements'
  | 'discussions'
  | 'guide'
  | 'about';


