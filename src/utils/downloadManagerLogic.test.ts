import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  calculateDownloadMetrics,
  formatPlayerTime,
  clampSeekTime,
  calculateStorageBreakdown,
  parseMedFurHierarchySegments,
  buildMedFurStorageTree,
  StorageItemSummary,
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

test('calculateStorageBreakdown calculates videos, files, and questions storage vs device quota', () => {
  const sampleItems: StorageItemSummary[] = [
    {
      id: 'v1',
      title: 'محاضرة تشريح الصدر',
      fileName: 'vid1.mp4',
      virtualPath: 'MedFur / السنة الثالثة / فصل أول / تشريح 3 / فيديو',
      itemType: 'video',
      sizeBytes: 10 * 1024 * 1024,
      formattedSize: '10 MB',
      savedAt: '2026-11-01',
    },
    {
      id: 'f1',
      title: 'تفريغ المحاضرة الأولى',
      fileName: 'file1.pdf',
      virtualPath: 'MedFur / السنة الثالثة / فصل أول / تشريح 3 / ملف',
      itemType: 'file',
      sizeBytes: 5 * 1024 * 1024,
      formattedSize: '5 MB',
      savedAt: '2026-11-01',
    },
    {
      id: 'q1',
      title: 'حزمة أسئلة تشريح 3',
      fileName: 'qpack1.json',
      virtualPath: 'MedFur / السنة الثالثة / فصل أول / تشريح 3 / أسئلة',
      itemType: 'questions',
      sizeBytes: 1 * 1024 * 1024,
      formattedSize: '1 MB',
      questionsCount: 150,
      savedAt: '2026-11-01',
    },
  ];

  const report = calculateStorageBreakdown(sampleItems, 200 * 1024 * 1024);
  assert.equal(report.videos.count, 1);
  assert.equal(report.files.count, 1);
  assert.equal(report.questions.count, 1);
  assert.equal(report.questions.questionsCount, 150);
  assert.equal(report.totalItemsCount, 3);
  assert.equal(report.totalUsedBytes, 16 * 1024 * 1024);
  assert.equal(report.usedPercentOfQuota, 8);
});

test('parseMedFurHierarchySegments and buildMedFurStorageTree organize items into MedFur -> Year -> Semester -> Subject', () => {
  const seg = parseMedFurHierarchySegments(
    'MedFur / السنة الثانية / فصل ثاني / كيمياء حيوية / ملف',
    'file'
  );
  assert.equal(seg.rootFolder, 'MedFur');
  assert.equal(seg.yearName, 'السنة الثانية');
  assert.equal(seg.semesterName, 'الفصل الثاني');
  assert.equal(seg.subjectName, 'كيمياء حيوية');
  assert.equal(seg.categoryFolder, 'الملفات');

  const tree = buildMedFurStorageTree([
    {
      id: 'f-y3',
      title: 'ملف تشريح 3',
      fileName: 'anat3.pdf',
      virtualPath: 'MedFur / السنة الثالثة / فصل أول / تشريح 3 / ملف',
      itemType: 'file',
      sizeBytes: 2048,
      formattedSize: '2 KB',
      savedAt: '2026-11-01',
    },
    {
      id: 'v-y2',
      title: 'فيديو كيمياء',
      fileName: 'chem.mp4',
      virtualPath: 'MedFur / السنة الثانية / فصل ثاني / كيمياء حيوية / فيديو',
      itemType: 'video',
      sizeBytes: 4096,
      formattedSize: '4 KB',
      savedAt: '2026-11-01',
    },
  ]);

  assert.equal(tree.length, 2);
  // Sorted in academic order: Year 2 before Year 3
  assert.equal(tree[0].yearName, 'السنة الثانية');
  assert.equal(tree[1].yearName, 'السنة الثالثة');
  assert.equal(tree[0].semesters[0].semesterName, 'الفصل الثاني');
  assert.equal(tree[0].semesters[0].subjects[0].subjectName, 'كيمياء حيوية');
  assert.equal(tree[0].semesters[0].subjects[0].videos.length, 1);
  assert.equal(tree[1].semesters[0].subjects[0].files.length, 1);
});
