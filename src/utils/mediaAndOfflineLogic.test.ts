import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStructuredMedFurFileName,
  buildOfflineAutomationPack,
  canUserModifyComment,
  applyCommentUpdate,
} from './mediaAndOfflineLogic';
import { QuestionCommentItem, QuestionItem, SubjectItem } from '../types';

test('buildStructuredMedFurFileName produces sorted MedFur filename with year, semester, subject, and media type', () => {
  const videoRes = buildStructuredMedFurFileName({
    itemType: 'video',
    title: 'تشريح الجذع الدماغي.mp4',
    yearId: 'year-3',
    semester: 'first',
    subjectOrFolderName: 'تشريح 3',
    extension: 'mp4',
  });

  assert.equal(
    videoRes.fileName,
    'MedFur - السنة الثالثة - فصل أول - تشريح 3 - فيديو - تشريح الجذع الدماغي.mp4'
  );
  assert.equal(
    videoRes.virtualPath,
    'MedFur / السنة الثالثة / فصل أول / تشريح 3 / فيديو'
  );

  const pdfRes = buildStructuredMedFurFileName({
    itemType: 'file',
    title: 'نوطة الأعصاب القحفية',
    yearId: 'year-3',
    semester: 'first',
    subjectOrFolderName: 'تشريح 3',
    extension: 'PDF',
  });

  assert.equal(
    pdfRes.fileName,
    'MedFur - السنة الثالثة - فصل أول - تشريح 3 - ملف - نوطة الأعصاب القحفية.pdf'
  );
});

test('buildOfflineAutomationPack builds all-automation and single-subject packs accurately', () => {
  const mockSubjects: SubjectItem[] = [
    {
      id: 'sub-1',
      name: 'تشريح 3',
      yearId: 'year-3',
      semester: 'first',
      icon: 'Brain',
      questionsCount: 2,
      filesCount: 0,
    },
    {
      id: 'sub-2',
      name: 'باطنة صدرية',
      yearId: 'year-4',
      semester: 'first',
      icon: 'Lungs',
      questionsCount: 1,
      filesCount: 0,
    },
  ];

  const mockQuestions: QuestionItem[] = [
    {
      id: 'q1',
      subjectId: 'sub-1',
      chapterId: 'ch1',
      questionText: 'سؤال 1',
      optionA: 'أ',
      optionB: 'ب',
      optionC: 'ج',
      optionD: 'د',
      correctOptionIndex: 0,
    },
    {
      id: 'q2',
      subjectId: 'sub-1',
      chapterId: 'ch1',
      questionText: 'سؤال 2',
      optionA: 'أ',
      optionB: 'ب',
      optionC: 'ج',
      optionD: 'د',
      correctOptionIndex: 1,
    },
    {
      id: 'q3',
      subjectId: 'sub-2',
      chapterId: 'ch2',
      questionText: 'سؤال 3',
      optionA: 'أ',
      optionB: 'ب',
      optionC: 'ج',
      optionD: 'د',
      correctOptionIndex: 2,
    },
  ];

  const allPack = buildOfflineAutomationPack({
    scope: 'all',
    subjects: mockSubjects,
    questions: mockQuestions,
  });
  assert.equal(allPack.questionsCount, 3);
  assert.equal(allPack.subjectsCount, 2);

  const subPack = buildOfflineAutomationPack({
    scope: 'subject',
    subjects: mockSubjects,
    questions: mockQuestions,
    targetSubjectId: 'sub-1',
  });
  assert.equal(subPack.questionsCount, 2);
  assert.equal(subPack.subjectName, 'تشريح 3');
});

test('canUserModifyComment and applyCommentUpdate allow comment owner or admin to edit and delete', () => {
  const comment: QuestionCommentItem = {
    id: 'c-1',
    questionId: 'q-1',
    authorId: 'student-uid-12',
    authorName: 'طالب طب',
    authorRole: 'student',
    content: 'تعليق أولي',
    createdAt: 'منذ دقيقة',
    likesCount: 0,
    likedBy: [],
  };

  assert.equal(canUserModifyComment(comment, 'student-uid-12', false), true);
  assert.equal(canUserModifyComment(comment, 'other-student', false), false);
  assert.equal(canUserModifyComment(comment, 'other-student', true), true);

  const updated = applyCommentUpdate(comment, '  تعليق معدل ومفصل  ');
  assert.equal(updated.content, 'تعليق معدل ومفصل');
  assert.equal(updated.isEdited, true);
  assert.equal(updated.updatedAt, 'معدّل الآن');
});
