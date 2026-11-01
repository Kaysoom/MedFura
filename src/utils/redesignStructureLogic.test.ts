import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShowGlobalHeader,
  normalizeDealTypeLabel,
  normalizeMarketplaceStatusLabel,
  filterMarketplaceListings,
  filterAndSortLibraryFiles,
  getSubjectQuickTabQuestions,
  groupSubjectVideosIntoSections,
  sortRootLibraryFolders,
} from './redesignStructureLogic.ts';
import type { LibraryFileItem, LibraryFolderItem, MarketplaceItem, QuestionItem, VideoItem } from '../types.ts';

describe('redesignStructureLogic', () => {
  it('hides global header inside sub-sections and shows it only on home', () => {
    assert.equal(shouldShowGlobalHeader('home'), true);
    assert.equal(shouldShowGlobalHeader('library'), false);
    assert.equal(shouldShowGlobalHeader('automation'), false);
    assert.equal(shouldShowGlobalHeader('videos'), false);
    assert.equal(shouldShowGlobalHeader('marketplace'), false);
  });

  it('normalizes deal types and marketplace statuses accurately', () => {
    assert.equal(normalizeDealTypeLabel('إهداء'), 'هبة');
    assert.equal(normalizeDealTypeLabel('هبة'), 'هبة');
    assert.equal(normalizeDealTypeLabel('بيع'), 'بيع');
    assert.equal(normalizeMarketplaceStatusLabel('تم البيع'), 'مباع');
    assert.equal(normalizeMarketplaceStatusLabel('متاح'), 'متاح');
    assert.equal(normalizeMarketplaceStatusLabel('محجوز'), 'محجوز');
  });

  it('filters marketplace listings by dealType, status, category, and sellerId', () => {
    const sample: MarketplaceItem[] = [
      {
        id: 'm1',
        title: 'كتاب تشريح عصبية',
        description: 'نسخة نظيفة',
        price: 'مجاني',
        category: 'جامعية',
        dealType: 'إهداء',
        sellerName: 'أحمد',
        sellerId: 'u1',
        status: 'متاح',
        createdAt: '2026-09-22',
      },
      {
        id: 'm2',
        title: 'كتاب تشريح عصبية A4',
        description: 'مطبوع',
        price: '40 ألف',
        category: 'جامعية',
        dealType: 'بيع',
        sellerName: 'جويل ديوب',
        sellerId: 'u2',
        status: 'تم البيع',
        createdAt: '2026-09-22',
      },
    ];

    const freeOnes = filterMarketplaceListings(sample, {
      searchQuery: '',
      dealType: 'هبة',
      status: 'all',
      category: 'all',
      academicYear: 'all',
    });
    assert.equal(freeOnes.length, 1);
    assert.equal(freeOnes[0].id, 'm1');

    const soldOnes = filterMarketplaceListings(sample, {
      searchQuery: '',
      dealType: 'all',
      status: 'مباع',
      category: 'all',
      academicYear: 'all',
    });
    assert.equal(soldOnes.length, 1);
    assert.equal(soldOnes[0].id, 'm2');
  });

  it('filters library files across cloud, downloads, and favorites tabs', () => {
    const files: LibraryFileItem[] = [
      {
        id: 'f1',
        folderId: 'fld-1',
        title: 'الفصل الثاني مظاهر عيانية',
        fileType: 'تفريغ / نوطة',
        fileSize: '5.9 MB',
        uploadDate: '2026',
        author: 'قسم التشريح',
        downloadsCount: 0,
      },
      {
        id: 'f2',
        folderId: 'fld-2',
        title: 'مرجع الباطنة',
        fileType: 'مرجع / كتاب',
        fileSize: '12.4 MB',
        uploadDate: '2026',
        author: 'قسم الباطنة',
        downloadsCount: 0,
      },
    ];

    const cloudFld1 = filterAndSortLibraryFiles(files, {
      activeTab: 'cloud',
      currentFolderId: 'fld-1',
      searchQuery: '',
      fileTypeFilter: 'الكل',
      sortBy: 'newest',
      downloadedIds: new Set(['f2']),
      favoriteIds: new Set(['f1']),
    });
    assert.equal(cloudFld1.length, 1);
    assert.equal(cloudFld1[0].id, 'f1');

    const downloads = filterAndSortLibraryFiles(files, {
      activeTab: 'downloads',
      currentFolderId: null,
      searchQuery: '',
      fileTypeFilter: 'الكل',
      sortBy: 'newest',
      downloadedIds: new Set(['f2']),
      favoriteIds: new Set(['f1']),
    });
    assert.equal(downloads.length, 1);
    assert.equal(downloads[0].id, 'f2');
  });

  it('filters subject questions for the 3 quick personal tabs (mistakes, saved, notes)', () => {
    const qs: QuestionItem[] = [
      {
        id: 'q1',
        subjectId: 's1',
        chapterId: 'c1',
        questionText: 'سؤال 1',
        optionA: '1',
        optionB: '2',
        optionC: '3',
        optionD: '4',
        correctOptionIndex: 0,
      },
      {
        id: 'q2',
        subjectId: 's1',
        chapterId: 'c1',
        questionText: 'سؤال 2',
        optionA: '1',
        optionB: '2',
        optionC: '3',
        optionD: '4',
        correctOptionIndex: 1,
      },
    ];

    assert.equal(getSubjectQuickTabQuestions(qs, 'mistakes', ['q1'], [], {}).length, 1);
    assert.equal(getSubjectQuickTabQuestions(qs, 'saved', [], ['q2'], {}).length, 1);
    assert.equal(getSubjectQuickTabQuestions(qs, 'notes', [], [], { q1: 'ملاحظة هامة' }).length, 1);
  });

  it('groups subject videos into numbered doctor/section groups', () => {
    const videos: VideoItem[] = [
      {
        id: 'v1',
        subjectId: 's1',
        title: 'محاضرة 1',
        doctorName: 'الدكتور مازن زاده',
        duration: '15:00',
        uploadDate: '2026',
        viewsCount: 0,
        videoUrl: 'https://example.com/1.mp4',
      },
      {
        id: 'v2',
        subjectId: 's1',
        title: 'محاضرة 2',
        doctorName: 'الدكتور أمين سليمان',
        duration: '20:00',
        uploadDate: '2026',
        viewsCount: 0,
        videoUrl: 'https://example.com/2.mp4',
      },
    ];

    const groups = groupSubjectVideosIntoSections(videos);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].title, 'قسم الدكتور مازن زاده');
    assert.equal(groups[1].title, 'قسم الدكتور أمين سليمان');
  });

  it('sorts root library folders in descending academic year order', () => {
    const folders: LibraryFolderItem[] = [
      { id: '1', name: 'السنة الثانية', parentId: null, createdAt: '' },
      { id: '2', name: 'السنة الخامسة', parentId: null, createdAt: '' },
      { id: '3', name: 'مراجع طبية', parentId: null, createdAt: '' },
    ];
    const sorted = sortRootLibraryFolders(folders);
    assert.equal(sorted[0].name, 'السنة الخامسة');
    assert.equal(sorted[1].name, 'السنة الثانية');
    assert.equal(sorted[2].name, 'مراجع طبية');
  });
});
