import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDensityLayoutClasses,
  resolveOptionClickWithPreferences,
  createStudyBackupPayload,
  parseAndValidateStudyBackup,
} from './settingsAndDensityLogic';

test('getDensityLayoutClasses returns tighter spacing and multi-column grids in compact mode', () => {
  const balanced = getDensityLayoutClasses('balanced');
  const compact = getDensityLayoutClasses('compact');

  assert.equal(balanced.isCompact, false);
  assert.equal(compact.isCompact, true);

  assert.ok(compact.subjectsGrid.includes('sm:grid-cols-2'));
  assert.ok(compact.chaptersGrid.includes('sm:grid-cols-2'));
  assert.ok(compact.libraryFoldersGrid.includes('grid-cols-2'));
  assert.ok(compact.homeServicesGrid.includes('lg:grid-cols-4'));
});

test('resolveOptionClickWithPreferences supports both single-click and double-click confirmation', () => {
  // Single-click mode confirms immediately on first click
  const singleRes = resolveOptionClickWithPreferences(null, 2, false, 'single');
  assert.deepEqual(singleRes, { action: 'confirm', nextTempChoice: null, chosenOption: 2 });

  // Double-click mode selects on first click and confirms on second click
  const doubleFirst = resolveOptionClickWithPreferences(null, 2, false, 'double');
  assert.deepEqual(doubleFirst, { action: 'select', nextTempChoice: 2 });

  const doubleSecond = resolveOptionClickWithPreferences(2, 2, false, 'double');
  assert.deepEqual(doubleSecond, { action: 'confirm', nextTempChoice: null, chosenOption: 2 });

  // Already solved always returns noop
  const solvedRes = resolveOptionClickWithPreferences(null, 1, true, 'single');
  assert.deepEqual(solvedRes, { action: 'noop', nextTempChoice: null });
});

test('createStudyBackupPayload and parseAndValidateStudyBackup round-trip study progress cleanly', () => {
  const payload = createStudyBackupPayload({
    accountType: 'student',
    solvedQuestions: { 'q-1': { chosenOption: 0, isCorrect: true } },
    savedQuestionIds: ['q-1', 'q-2'],
    wrongQuestionIds: ['q-3'],
    questionNotes: { 'q-1': 'ملاحظة تشريحية هامة' },
    studentCustomQuizzes: [],
  });

  const json = JSON.stringify(payload);
  const parsed = parseAndValidateStudyBackup(json);

  assert.equal(parsed.valid, true);
  assert.ok(parsed.payload);
  assert.deepEqual(parsed.payload.savedQuestionIds, ['q-1', 'q-2']);
  assert.deepEqual(parsed.payload.wrongQuestionIds, ['q-3']);
  assert.equal(parsed.payload.questionNotes['q-1'], 'ملاحظة تشريحية هامة');
  assert.equal(parsed.payload.solvedQuestions['q-1'].isCorrect, true);

  const invalid = parseAndValidateStudyBackup('{"bad": true}');
  assert.equal(invalid.valid, false);
  assert.ok(invalid.error);
});
