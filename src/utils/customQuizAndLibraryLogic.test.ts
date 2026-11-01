import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompleteLibraryFolders,
  buildStudentCustomQuiz,
  resolveCustomQuizQuestions,
} from './customQuizAndLibraryLogic';
import { INITIAL_SUBJECTS } from '../initialData';
import { QuestionItem } from '../types';

test('buildCompleteLibraryFolders creates semester 1 & 2 folders with badges 1 and 2 for all years and populates subject folders with icons', () => {
  const folders = buildCompleteLibraryFolders(INITIAL_SUBJECTS, []);

  // Root academic years exist and do NOT have semesterBadge
  const yearRootIds = [
    'fld-year-prep',
    'fld-year-2',
    'fld-year-3',
    'fld-year-4',
    'fld-year-5',
    'fld-year-6',
  ];
  for (const yrId of yearRootIds) {
    const yrFolder = folders.find((f) => f.id === yrId);
    assert.ok(yrFolder, `Expected root year folder ${yrId}`);
    assert.equal(yrFolder.parentId, null);
    assert.equal(yrFolder.semesterBadge, undefined);

    // Inside each year folder, Semester 1 (badge '1') and Semester 2 (badge '2') must exist
    const semFolders = folders.filter((f) => f.parentId === yrId);
    assert.equal(semFolders.length, 2, `Expected 2 semester folders in ${yrId}`);
    const sem1 = semFolders.find((f) => f.semester === 'first');
    const sem2 = semFolders.find((f) => f.semester === 'second');
    assert.ok(sem1);
    assert.ok(sem2);
    assert.equal(sem1.semesterBadge, '1');
    assert.equal(sem2.semesterBadge, '2');
  }

  // Subject folders exist inside semesters with isSubject=true and matching icon/color
  const y2Sem1 = folders.find(
    (f) => f.parentId === 'fld-year-2' && f.semester === 'first'
  );
  assert.ok(y2Sem1);
  const y2Sem1Subjects = folders.filter((f) => f.parentId === y2Sem1.id);
  assert.ok(y2Sem1Subjects.length >= 5);
  const anat1Folder = y2Sem1Subjects.find((f) => f.subjectId === 'sub-y2-anat-1');
  assert.ok(anat1Folder);
  assert.equal(anat1Folder.isSubject, true);
  assert.equal(anat1Folder.icon, 'Brain');
});

test('buildStudentCustomQuiz and resolveCustomQuizQuestions filter by subjects, chapters, and question limit', () => {
  const sampleQuestions: QuestionItem[] = [
    {
      id: 'q1',
      subjectId: 'sub-y3-anat-3',
      chapterId: 'ch-1',
      chapterName: 'القسم الأول',
      questionText: 'سؤال 1',
      optionA: 'أ',
      optionB: 'ب',
      optionC: 'ج',
      optionD: 'د',
      correctOptionIndex: 0,
    },
    {
      id: 'q2',
      subjectId: 'sub-y3-anat-3',
      chapterId: 'ch-2',
      chapterName: 'القسم الثاني',
      questionText: 'سؤال 2',
      optionA: 'أ',
      optionB: 'ب',
      optionC: 'ج',
      optionD: 'د',
      correctOptionIndex: 1,
    },
    {
      id: 'q3',
      subjectId: 'sub-y3-physio-2',
      chapterId: 'ch-3',
      chapterName: 'قسم الفيزيولوجيا',
      questionText: 'سؤال 3',
      optionA: 'أ',
      optionB: 'ب',
      optionC: 'ج',
      optionD: 'د',
      correctOptionIndex: 2,
    },
  ];

  const quiz = buildStudentCustomQuiz(
    {
      title: 'اختبار تشريح مخصص',
      subjectIds: ['sub-y3-anat-3'],
      chapterIds: ['ch-1'],
      questionLimit: 10,
      sourceFilter: 'all',
      shuffleQuestions: false,
      timeLimitMinutes: 15,
    },
    sampleQuestions,
    INITIAL_SUBJECTS
  );

  assert.equal(quiz.title, 'اختبار تشريح مخصص');
  assert.deepEqual(quiz.questionIds, ['q1']);
  assert.equal(quiz.timeLimitMinutes, 15);

  const resolved = resolveCustomQuizQuestions(quiz, sampleQuestions, INITIAL_SUBJECTS);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].id, 'q1');
});

test('subject-scoped custom quiz filters by categories (section, lecture, comprehensive_partial) within a single subject', () => {
  const sampleQuestions: QuestionItem[] = [
    {
      id: 'q-sec',
      subjectId: 'sub-y3-anat-3',
      chapterId: 'ch-sec-1',
      chapterName: 'القسم الأول',
      category: 'section',
      questionText: 'سؤال قسم',
      optionA: 'أ',
      optionB: 'ب',
      optionC: 'ج',
      optionD: 'د',
      correctOptionIndex: 0,
    },
    {
      id: 'q-lec',
      subjectId: 'sub-y3-anat-3',
      chapterId: 'ch-lec-1',
      chapterName: 'المحاضرة الأولى',
      category: 'lecture',
      questionText: 'سؤال محاضرة',
      optionA: 'أ',
      optionB: 'ب',
      optionC: 'ج',
      optionD: 'د',
      correctOptionIndex: 1,
    },
    {
      id: 'q-comp',
      subjectId: 'sub-y3-anat-3',
      chapterId: 'ch-comp-1',
      chapterName: 'شامل تشريح',
      category: 'comprehensive_partial',
      questionText: 'سؤال شامل',
      optionA: 'أ',
      optionB: 'ب',
      optionC: 'ج',
      optionD: 'د',
      correctOptionIndex: 2,
    },
  ];

  // Mix lectures + comprehensive_partial only (excluding sections)
  const mixedQuiz = buildStudentCustomQuiz(
    {
      title: 'اختبار محاضرات وشامل تشريح 3',
      subjectIds: ['sub-y3-anat-3'],
      categories: ['lecture', 'comprehensive_partial'],
      chapterIds: [],
      questionLimit: 'all',
      sourceFilter: 'all',
      shuffleQuestions: false,
    },
    sampleQuestions,
    INITIAL_SUBJECTS
  );

  assert.deepEqual(mixedQuiz.questionIds, ['q-lec', 'q-comp']);
  const resolved = resolveCustomQuizQuestions(mixedQuiz, sampleQuestions, INITIAL_SUBJECTS);
  assert.equal(resolved.length, 2);
});
