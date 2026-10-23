import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeQuestionStats,
  processOptionClick,
  reconcileMistakesOnExit,
  getResumeQuestionIndex,
} from './automationLogic';

test('computeQuestionStats calculates total, solved, remaining, correct, wrong, and accuracy', () => {
  const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }];
  const solvedMap = {
    q1: { chosenOption: 0, isCorrect: true },
    q2: { chosenOption: 2, isCorrect: true },
    q3: { chosenOption: 1, isCorrect: false },
  };

  const stats = computeQuestionStats(questions, solvedMap);
  assert.equal(stats.totalQuestions, 5);
  assert.equal(stats.solvedCount, 3);
  assert.equal(stats.remainingCount, 2);
  assert.equal(stats.correctCount, 2);
  assert.equal(stats.wrongCount, 1);
  assert.equal(stats.accuracy, 67);
});

test('processOptionClick selects on first click and confirms on second click of same option', () => {
  // First click on option 2 -> selects in blue
  const first = processOptionClick(null, 2, false);
  assert.deepEqual(first, { action: 'select', nextTempChoice: 2 });

  // Clicking option 1 while option 2 is selected -> switches selection to 1
  const switchOpt = processOptionClick(2, 1, false);
  assert.deepEqual(switchOpt, { action: 'select', nextTempChoice: 1 });

  // Second click on option 1 -> confirms answer
  const second = processOptionClick(1, 1, false);
  assert.deepEqual(second, { action: 'confirm', chosenOption: 1, nextTempChoice: null });

  // Click when already solved -> noop
  const noop = processOptionClick(null, 1, true);
  assert.deepEqual(noop, { action: 'noop', nextTempChoice: null });
});

test('reconcileMistakesOnExit removes only questions solved correctly during the session', () => {
  const initialMistakes = ['q1', 'q2', 'q3'];
  const sessionAttempts = {
    q1: { chosenOption: 0, isCorrect: true },  // solved correctly -> should disappear on exit
    q2: { chosenOption: 1, isCorrect: false }, // solved wrong -> should stay
    // q3 was not attempted -> should stay
  };

  const remainingMistakes = reconcileMistakesOnExit(initialMistakes, sessionAttempts);
  assert.deepEqual(remainingMistakes, ['q2', 'q3']);
});

test('getResumeQuestionIndex restores last saved index within bounds', () => {
  const map = { 'ch-3': 39, 'ch-overflow': 99 };
  assert.equal(getResumeQuestionIndex('ch-3', 50, map), 39);
  assert.equal(getResumeQuestionIndex('ch-overflow', 50, map), 49);
  assert.equal(getResumeQuestionIndex('ch-unknown', 50, map), 0);
  assert.equal(getResumeQuestionIndex('ch-3', 0, map), 0);
});
