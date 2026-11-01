import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  calculateDownloadMetrics,
  formatPlayerTime,
  clampSeekTime,
} from './downloadManagerLogic';

test('formatBytes formats byte sizes accurately', () => {
  assert.equal(formatBytes(0), '0 KB');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1048576 * 2.5), '2.5 MB');
});

test('calculateDownloadMetrics computes percent, speed and ETA', () => {
  const metrics = calculateDownloadMetrics(512 * 1024, 1024 * 1024, 1000);
  assert.equal(metrics.percent, 50);
  assert.equal(metrics.speedBps, 524288);
  assert.equal(metrics.etaSeconds, 1);
});

test('formatPlayerTime formats seconds into MM:SS and HH:MM:SS', () => {
  assert.equal(formatPlayerTime(0), '00:00');
  assert.equal(formatPlayerTime(65), '01:05');
  assert.equal(formatPlayerTime(3661), '01:01:01');
});

test('clampSeekTime clamps within valid video duration range', () => {
  assert.equal(clampSeekTime(5, -10, 120), 0);
  assert.equal(clampSeekTime(50, 10, 120), 60);
  assert.equal(clampSeekTime(115, 10, 120), 120);
});
