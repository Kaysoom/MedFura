import { OPTION_LABELS, QuestionItem, ChapterCategory } from '../types';

export interface ParsedOptionItem {
  letter: string; // 'A' .. 'H'
  rawTag: string; // e.g. '/a' or '/C'
  text: string;
  isMarkedCorrect: boolean; // true if the tag was uppercase (/A .. /H)
}

export type QuestionValidationIssue =
  | 'valid'
  | 'missing_correct'
  | 'multiple_correct'
  | 'too_few_options'
  | 'missing_question_text';

export interface ParsedBulkQuestion {
  tempId: string;
  blockIndex: number;
  sequenceNumber: number; // Auto-incremented number (e.g. 8, 9, 10...)
  questionText: string;
  options: ParsedOptionItem[];
  optionsCount: number;
  correctOptionIndex: number | null; // null if missing or ambiguous until fixed by supervisor
  note: string; // Extracted from /n
  validationStatus: QuestionValidationIssue;
  validationMessage?: string;
}

export interface BulkParseResult {
  questions: ParsedBulkQuestion[];
  detectedStartNumber: number | null;
  detectedSectionHint: string | null;
  validCount: number;
  needsAttentionCount: number;
}

const VALID_OPTION_LETTERS_LOWER = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/**
 * Extracts optional header directives such as:
 * "أضف للقسم الأول بدءاً من الرقم 8" or "بدءاً من الرقم 15"
 */
export function extractHeaderDirectives(rawInput: string): {
  cleanedInput: string;
  detectedStartNumber: number | null;
  detectedSectionHint: string | null;
} {
  if (!rawInput || !rawInput.trim()) {
    return { cleanedInput: '', detectedStartNumber: null, detectedSectionHint: null };
  }

  let detectedStartNumber: number | null = null;
  let detectedSectionHint: string | null = null;

  // Look at text before the first /q marker
  const firstQMatch = rawInput.match(/(?:^|\s)\/[qQ]\d*\b/);
  const headerSlice =
    firstQMatch && firstQMatch.index !== undefined
      ? rawInput.slice(0, firstQMatch.index).trim()
      : '';

  if (headerSlice) {
    // Match starting number e.g. "بدءاً من الرقم 8", "بدءا من 8", "من الرقم 12", "من رقم 5"
    const numMatch = headerSlice.match(
      /(?:بدءاً?\s+من|ابتداءً?\s+من|من)\s*(?:الرقم|رقم|السؤال)?\s*(\d+)/i
    );
    if (numMatch && numMatch[1]) {
      const parsed = parseInt(numMatch[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        detectedStartNumber = parsed;
      }
    }

    // Match section/chapter name hint e.g. "أضف للقسم الأول" or "للفصل الثاني"
    const secMatch = headerSlice.match(
      /(?:أضف|إضافة)?\s*(?:إلى|لـ|ل)\s*(?:قسم|القسم|فصل|الفصل|محاضرة|المحاضرة)\s+([^\n،,.]+?)(?=\s+(?:بدءاً|ابتداءً|من\s+الرقم)|$)/i
    );
    if (secMatch && secMatch[1]) {
      detectedSectionHint = secMatch[1].trim();
    }
  }

  const cleanedInput =
    firstQMatch && firstQMatch.index !== undefined && headerSlice.length > 0
      ? rawInput.slice(firstQMatch.index)
      : rawInput;

  return {
    cleanedInput,
    detectedStartNumber,
    detectedSectionHint,
  };
}

/**
 * Splits raw pasted text into individual question blocks using:
 * 1) Lines of underscores (_______________)
 * 2) Secondary fallback split if multiple /q tags exist inside a single block without underscores
 */
function splitIntoQuestionBlocks(cleanedText: string): string[] {
  if (!cleanedText.trim()) return [];

  // Primary split by 3 or more underscores
  const underscoreBlocks = cleanedText
    .split(/(?:^|\n)\s*_{3,}\s*(?:\n|$)/g)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const finalBlocks: string[] = [];

  for (const block of underscoreBlocks) {
    // Check if the block accidentally has multiple /q markers without underscore separator
    const qMatches = [...block.matchAll(/(?:^|\n)\s*\/[qQ]\d*(?=\s|:|-|$)/g)];
    if (qMatches.length <= 1) {
      finalBlocks.push(block);
    } else {
      for (let i = 0; i < qMatches.length; i++) {
        const startIdx = qMatches[i].index ?? 0;
        const endIdx = i + 1 < qMatches.length ? (qMatches[i + 1].index ?? block.length) : block.length;
        const subBlock = block.slice(startIdx, endIdx).trim();
        if (subBlock) finalBlocks.push(subBlock);
      }
    }
  }

  return finalBlocks;
}

/**
 * Cleans leading punctuation/whitespace from extracted tag content
 */
function cleanSegmentText(raw: string): string {
  return raw
    .replace(/^[\s:\-–—.)]+/, '')
    .replace(/_{3,}\s*$/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

/**
 * Parses a single question block using MedFur syntax markers:
 * - /q (or /q1, /q2...) -> Question stem
 * - /a .. /h -> Distractor options (lowercase)
 * - /A .. /H -> Correct Answer option (UPPERCASE)
 * - /n -> Question Note / Explanation
 */
function parseSingleBlock(
  blockText: string,
  blockIndex: number,
  sequenceNumber: number
): ParsedBulkQuestion {
  // Regex matching any MedFur syntax tag at start of string or preceded by whitespace/newline:
  // Group 1: Tag name (q, q1, a..h, A..H, n)
  const tagRegex = /(?:^|(?<=\s)|(?<=\n))\/([qQ]\d*|[a-hA-H]|[nN])(?=\s|:|-|\.|،|\)|$)/g;
  const matches = [...blockText.matchAll(tagRegex)];

  let questionText = '';
  let noteText = '';
  const options: ParsedOptionItem[] = [];

  if (matches.length === 0) {
    // Fallback if user pasted a line without /q
    questionText = cleanSegmentText(blockText);
  } else {
    // If there is text before the first tag and no /q tag exists at all, treat leading text as questionText
    const hasExplicitQTag = matches.some((m) => m[1].toLowerCase().startsWith('q'));
    const firstTagIndex = matches[0].index ?? 0;
    if (!hasExplicitQTag && firstTagIndex > 0) {
      questionText = cleanSegmentText(blockText.slice(0, firstTagIndex));
    }

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const tagRaw = currentMatch[1]; // e.g. 'q', 'q1', 'a', 'C', 'n'
      const fullTag = `/${tagRaw}`;
      const contentStart = (currentMatch.index ?? 0) + fullTag.length;
      const contentEnd =
        i + 1 < matches.length ? (matches[i + 1].index ?? blockText.length) : blockText.length;

      const segmentContent = cleanSegmentText(blockText.slice(contentStart, contentEnd));
      const lowerTag = tagRaw.toLowerCase();

      if (lowerTag.startsWith('q')) {
        // Also strip optional leading question number if user wrote "/q 1- ما هو..."
        const strippedStem = segmentContent.replace(/^\d+\s*[-.)]\s*/, '').trim();
        questionText = questionText
          ? `${questionText}\n${strippedStem || segmentContent}`
          : strippedStem || segmentContent;
      } else if (lowerTag === 'n') {
        noteText = noteText ? `${noteText}\n${segmentContent}` : segmentContent;
      } else if (VALID_OPTION_LETTERS_LOWER.includes(lowerTag)) {
        // Check exact case of the tag letter: UPPERCASE = Correct Answer, lowercase = distractor
        const isUppercase = tagRaw === tagRaw.toUpperCase() && tagRaw !== tagRaw.toLowerCase();
        const optionIndex = options.length;
        if (optionIndex < 8) {
          options.push({
            letter: OPTION_LABELS[optionIndex] || tagRaw.toUpperCase(),
            rawTag: fullTag,
            text: segmentContent,
            isMarkedCorrect: isUppercase,
          });
        }
      }
    }
  }

  // Determine correctOptionIndex and validation status
  const capitalIndices = options
    .map((opt, idx) => (opt.isMarkedCorrect ? idx : -1))
    .filter((idx) => idx !== -1);

  let correctOptionIndex: number | null = null;
  let validationStatus: QuestionValidationIssue = 'valid';
  let validationMessage: string | undefined;

  if (!questionText) {
    validationStatus = 'missing_question_text';
    validationMessage = 'نص السؤال (/q) مفقود في هذه الكتلة النصية.';
  } else if (options.length < 2) {
    validationStatus = 'too_few_options';
    validationMessage = 'يجب إدخال خيارين على الأقل (يفضل من 4 إلى 8 خيارات باستخدام /a حتى /h).';
  } else if (capitalIndices.length === 0) {
    validationStatus = 'missing_correct';
    validationMessage =
      'تنبيه: لم يتم تحديد الإجابة الصحيحة بالحرف الكبير (مثل /C) — اضغط على الخيار الصحيح أدناه لتحديده بضغطة زر قبل الحفظ.';
  } else if (capitalIndices.length > 1) {
    validationStatus = 'multiple_correct';
    correctOptionIndex = capitalIndices[0];
    validationMessage = `تنبيه: تم كتابة أكثر من حرف كبير (${capitalIndices
      .map((i) => options[i]?.rawTag)
      .join(' و ')}) — اضغط على الخيار الصحيح الوحيد لتأكيده قبل الحفظ.`;
  } else {
    correctOptionIndex = capitalIndices[0];
    validationStatus = 'valid';
  }

  return {
    tempId: `bulk-q-${blockIndex}-${sequenceNumber}`,
    blockIndex,
    sequenceNumber,
    questionText,
    options,
    optionsCount: options.length,
    correctOptionIndex,
    note: noteText,
    validationStatus,
    validationMessage,
  };
}

/**
 * Main parser function: parses raw pasted bulk text into structured MedFur preview & DB objects.
 */
export function parseBulkQuestionsText(
  rawInput: string,
  customStartNumber = 1
): BulkParseResult {
  const { cleanedInput, detectedStartNumber, detectedSectionHint } =
    extractHeaderDirectives(rawInput);

  const effectiveStartNumber =
    detectedStartNumber !== null ? detectedStartNumber : Math.max(1, customStartNumber);

  const blocks = splitIntoQuestionBlocks(cleanedInput);
  const questions = blocks.map((block, idx) =>
    parseSingleBlock(block, idx, effectiveStartNumber + idx)
  );

  const validCount = questions.filter((q) => q.validationStatus === 'valid').length;
  const needsAttentionCount = questions.length - validCount;

  return {
    questions,
    detectedStartNumber,
    detectedSectionHint,
    validCount,
    needsAttentionCount,
  };
}

/**
 * Converts validated ParsedBulkQuestion[] into MedFur database-ready QuestionItem payloads
 * (without 'id', ready for addQuestionsBatch or JSON export).
 */
export function convertParsedToMedFurSchema(
  parsedQuestions: ParsedBulkQuestion[],
  targetMeta: {
    subjectId: string;
    chapterId: string;
    chapterName: string;
    category?: ChapterCategory;
    year?: string;
    createdBy?: string;
  }
): Omit<QuestionItem, 'id'>[] {
  return parsedQuestions.map((pq) => {
    const cleanOptions = pq.options.map((o) => o.text.trim());
    const safeCorrectIdx =
      pq.correctOptionIndex !== null &&
      pq.correctOptionIndex >= 0 &&
      pq.correctOptionIndex < cleanOptions.length
        ? pq.correctOptionIndex
        : 0;

    const item: Omit<QuestionItem, 'id'> = {
      subjectId: targetMeta.subjectId,
      chapterId: targetMeta.chapterId,
      chapterName: targetMeta.chapterName,
      ...(targetMeta.category ? { category: targetMeta.category } : {}),
      ...(pq.sequenceNumber !== undefined ? { sequenceNumber: pq.sequenceNumber } : {}),
      questionText: pq.questionText,
      optionA: cleanOptions[0] || '',
      optionB: cleanOptions[1] || '',
      optionC: cleanOptions[2] || '',
      optionD: cleanOptions[3] || '',
      ...(cleanOptions[4] ? { optionE: cleanOptions[4] } : {}),
      ...(cleanOptions[5] ? { optionF: cleanOptions[5] } : {}),
      ...(cleanOptions[6] ? { optionG: cleanOptions[6] } : {}),
      ...(cleanOptions[7] ? { optionH: cleanOptions[7] } : {}),
      options: cleanOptions,
      correctOptionIndex: safeCorrectIdx,
      ...(pq.note && pq.note.trim() ? { explanation: pq.note.trim() } : {}),
      ...(targetMeta.year && targetMeta.year.trim() ? { year: targetMeta.year.trim() } : {}),
      createdBy: targetMeta.createdBy || 'المشرف الأكاديمي',
    };

    return item;
  });
}

/**
 * Sample template demonstrating MedFur Bulk Syntax:
 * - Auto-increment starting number directive
 * - 4-option question, 5-option question (/a to /e), and exception question
 * - Capital letter for correct answer (/B, /D, /C)
 * - /n for stored scientific notes
 * - _______________ separator
 */
export const SAMPLE_MEDFUR_BULK_TEXT = `أضف للقسم الحالي بدءاً من الرقم 8
/q أي من البنى العصبية التالية تُعد محطة الترحيل الحسية الرئيسية لجميع الإحساسات الواعية المتجهة إلى القشرة المخية ما عدا حاسة الشم؟
/a الوطاء (Hypothalamus)
/B المهاد (Thalamus)
/c المخيخ (Cerebellum)
/d المهيد (Epithalamus)
/n تمر جميع المسارات الحسية الجسدية والخاصة (البصر والسمع والتذوق واللمس والألم) عبر نوى المهاد النوعية قبل وصولها للقشرة، باستثناء حاسة الشم التي تعبر مباشرة للقشرة الشمية.
_______________
/q تتعصب جميع عضلات اللسان الداخلية والخارجية التالية حركياً من العصب تحت اللساني (CN XII) ما عدا عضلة وحيدة تتعصب من الضفيرة البلعومية (العصب المبهم CN X) هي:
/a العضلة الذقنية اللسانية (Genioglossus)
/b العضلة اللامية اللسانية (Hyoglossus)
/c العضلة الإبرية اللسانية (Styloglossus)
/D العضلة الحنكية اللسانية (Palatoglossus)
/e العضلة الطولانية العلوية للسان
/n ملاحظة هامة: سؤال بـ 5 خيارات ديناميكية؛ جميع عضلات اللسان يعصبها العصب القحفي الثاني عشر (CN XII) باستثناء الحنكية اللسانية التي يعصبها المبهم (CN X).
_______________
/q أي من الأعصاب القحفية التالية ينبثق من الوجه الخلفي (الظهري) لجذع الدماغ وتتصالب أليافه بالكامل قبل خروجه؟
/a العصب المحرك للعين (CN III)
/b العصب المبعد (CN VI)
/C العصب البكري (CN IV)
/d العصب مثلث التوائم (CN V)
/n العصب البكري (Trochlear nerve) هو العصب القحفي الوحيد الذي يخرج من السطح الظهري لجذع الدماغ ويعصب العضلة المائلة العلوية للعين.`;
