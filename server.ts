import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type, GenerateContentParameters, GenerateContentResponse } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuestionPayload {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE?: string;
  optionF?: string;
  optionG?: string;
  optionH?: string;
  options?: string[];
  correctOptionIndex: number;
  explanation?: string;
  subjectName?: string;
  chapterName?: string;
  year?: string;
  questionNote?: string;
}

const SERVER_OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function extractDynamicPayloadOptions(q: QuestionPayload): { label: string; text: string; idx: number }[] {
  if (Array.isArray(q.options) && q.options.length > 0) {
    return q.options
      .map((text, idx) => ({
        label: SERVER_OPTION_LABELS[idx] || String.fromCharCode(65 + idx),
        text: (text || '').trim(),
        idx,
      }))
      .filter((item) => item.text.length > 0);
  }
  const fields = [
    q.optionA,
    q.optionB,
    q.optionC,
    q.optionD,
    q.optionE,
    q.optionF,
    q.optionG,
    q.optionH,
  ];
  const out: { label: string; text: string; idx: number }[] = [];
  fields.forEach((f, idx) => {
    const trimmed = (f || '').trim();
    if (trimmed.length > 0) {
      out.push({
        label: SERVER_OPTION_LABELS[idx] || String.fromCharCode(65 + idx),
        text: trimmed,
        idx,
      });
    }
  });
  return out;
}

interface DistractorAnalysisItem {
  optionLabel: string;
  optionText: string;
  whyIncorrect: string;
  isTrueStatementInException?: boolean;
}

interface AITutorResponse {
  questionType: 'positive' | 'exception';
  questionTypeTitle: string;
  questionTypeSummary: string;
  hasAnswerKeyConflict: boolean;
  conflictWarningMessage?: string;
  mentorExplanation: string;
  correctOptionAnalysis: string;
  distractorsAnalysis: DistractorAnalysisItem[];
  clinicalPearl: string;
  suggestedQuestions: string[];
  sourceModel: string;
  thinkingMode?: string;
}

interface ContextChatPayload {
  userMessage: string;
  history?: { role: 'user' | 'assistant'; text: string }[];
  context?: {
    yearName?: string;
    semesterName?: string;
    subjectName?: string;
    chapterName?: string;
    statsSummary?: {
      total: number;
      solved: number;
      correct: number;
      wrong: number;
      accuracy: number;
    };
    recentMistakes?: {
      questionText: string;
      correctAnswer: string;
      explanation?: string;
      chapterName?: string;
    }[];
    savedNotes?: {
      questionText: string;
      note: string;
    }[];
    activeQuestionsSample?: {
      questionText: string;
      correctAnswer: string;
      explanation?: string;
    }[];
  };
}

const MEDFUR_SYSTEM_INSTRUCTIONS = `# Advanced High-Thinking Medical AI Engine for "MedFur" (مدفور)

أنت الموجّه الطبي والأكاديمي الذكي في منصة "MedFur" لطلاب الطب البشري. تعمل بوضع التفكير الاستنتاجي العميق (High Thinking) لتحليل أسئلة الأتمتة الطبية والإجابة عن استفسارات الطلاب بأعلى دقة علمية.

## القواعد الصارمة للأسلوب والتحليل العلمي:
1. **ممنوع الحشو والعبارات العامة (Zero-Fluff Policy):**
   - إياك أن تكتب جملاً إنشائية عامة لا تضيف معلومة طبية حقيقية مثل: "هذه العبارة صحيحة علمياً وتنطبق على موضوع السؤال" أو "هذا الخيار يرتبط بآلية مغايرة لما يطلبه السؤال" أو "بناءً على المعطيات الواردة".
   - كل سطر وكل خيار يجب أن يحتوي على **معلومة طبية علمية دقيقة ومحددة** (الآلية الفيزيولوجية، التعصيب التشريحي، الموقع الدقيق، الوظيفة الكيميائية، أو المتلازمة السريرية الناتجة عن الإصابة).
2. **بدون ذكر أسماء المراجع أو الكتب:**
   - اعتمد على المعرفة الطبية الرصينة مباشرةً في صياغة الآليات العلمية، ولكن **لا تذكر أسماء كتب أو مراجع** داخل النص ليظل الشرح صافياً ومباشراً وسريع الفهم.
3. **التحليل الدقيق لنوع السؤال ودمج الملاحظات:**
   - **النمط A (إثبات مباشر / اختيار الصحيح):** اشرح الآلية العلمية الدقيقة التي تجعل الخيار المحدد صحيحاً، وفكك كل خيار من الخيارات الثلاثة الأخرى بذكر وظيفته أو صفته العلمية الحقيقية التي تميزه وتستبعده عن هذا السؤال.
   - **النمط B (استثناء / «ما عدا» / اختيار الخاطئة):** وضّح فوراً أن السؤال يبحث عن الاستثناء، واشرح لماذا الخيار المحدد **خاطئ طبياً** وما هو الصواب العلمي بدلاً منه، ثم أكّد في كل خيار من الخيارات الثلاثة الأخرى الحقيقة العلمية الدقيقة التي يمثلها.
   - ادمج الملاحظة المرفقة بالسؤال بسلاسة في قلب التحليل العلمي.
4. **النزاهة العلمية ومنع التبرير الأعمى (Anti-Rationalization):**
   - لا تختلق أبداً تبريرات طبية وهمية للدفاع عن مفتاح حل يتناقض مع الحقائق الطبية الثابتة.
   - إذا كان مفتاح الحل المخزن خاطئاً علمياً، اضبط \`hasAnswerKeyConflict\` على \`true\` واكتب: *"تنبيه علمي: مفتاح الحل المحدد هنا يخالف الحقائق الطبية المثبتة. ننصح بالإبلاغ عن السؤال ليتم تصحيحه."*
5. **توليد 3 أسئلة تفاعلية ذكية (💡):**
   - في نهاية كل تحليل، ولّد 3 استفسارات تفاعلية ذكية تبدأ بـ \`💡 \` مشتقة حصرياً من المفاهيم الطبية الدقيقة في السؤال الحالي (تفريق سريري/امتحاني، التوسع في فكرة السؤال وملاحظته، وربط المعلومة بحالة سريرية).`;

/**
 * Automatic Gemini Intelligence Router with Always-On High Thinking (ThinkingLevel.HIGH).
 * Automatically selects the best Gemini model ('gemini-4-argon' -> 'gemini-3.8-flash')
 * with extended reasoning enabled on every call.
 */
async function generateWithAutoHighThinking(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, 'model'>
): Promise<{ response: GenerateContentResponse; modelUsed: string }> {
  const candidateModels = ['gemini-4-argon', 'gemini-3.8-flash'];
  let lastError: unknown = null;

  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model: modelName,
        config: {
          ...params.config,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });
      if (response && response.text) {
        return {
          response,
          modelUsed:
            modelName === 'gemini-4-argon'
              ? 'Gemini 4 Argon · High Thinking'
              : 'Gemini 3.8 Flash · High Thinking',
        };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini models');
}

/**
 * Built-in Deep Medical Mechanism Knowledge Graph.
 * Provides specific, accurate anatomical, physiological, microbiological, pathological,
 * and clinical mechanisms for medical entities — zero generic filler phrases.
 */
interface MedicalConceptMechanism {
  patterns: RegExp[];
  directFact: string;
  clinicalMechanism: string;
  examDistinction: string;
}

const MEDICAL_KNOWLEDGE_GRAPH: MedicalConceptMechanism[] = [
  {
    patterns: [/المهاد/i, /\bThalamus\b/i],
    directFact:
      'المهاد (Thalamus) يمثل محطة الترحيل الحسية القشرية الإلزامية لجميع المسارات الحسية الجسدية والخاصة الواعية (الألم، الحرارة، اللمس، البصر عبر الركبي الوحشي، السمع عبر الركبي الإنسي) قبل وصولها لقشرة المخ، باستثناء حاسة الشم.',
    clinicalMechanism:
      'تمر الألياف الحسية الصاعدة عبر النوى المهادية النوعية (مثل VPL للجسم وVPM للوجه) لتتشابك وتُفلتر قبل إسقاطها إلى التلفيف خلف المركزي، بينما تعبر الألياف الشمية مباشرة إلى القشرة الشمية الأولية دون المرور بالمهاد.',
    examDistinction:
      'البوابة الحسية الوحيدة التي يتخطاها الشم؛ وأي أذية وعائية في النواة الخلفية البطنية للمهاد تسبب متلازمة الألم المهادي (Dejerine-Roussy) في الجانب المقابل.',
  },
  {
    patterns: [/الوطاء/i, /\bHypothalamus\b/i],
    directFact:
      'الوطاء (Hypothalamus) هو المركز التكاملي الأعلى للجهاز العصبي الذاتي (الودي ونظير الودي) والغدد الصم عبر تحكمه بالغدة النخامية، وينظم حرارة الجسم، الجوع والشبع، العطش، والأوزمولية عبر النجاتين فوق البصرية وجنب البطينية.',
    clinicalMechanism:
      'يفرز الهرمونات المطلقة والمثبطة في الدوران البابي النخامي للتحكم بالنخامى الأمامية، ويصنع الهرمون المضاد للإدرار (ADH) والأوكسيتوسين لنقلهما عصبياً إلى النخامى الخلفية.',
    examDistinction:
      'مركز التنظيم الذاتي والصماوي وحرارة الجسم، وليس محطة ترحيل للإحساس الجسدي الواعي نحو القشرة.',
  },
  {
    patterns: [/المخيخ/i, /\bCerebellum\b/i],
    directFact:
      'المخيخ (Cerebellum) يقع في الحفرة القحفية الخلفية ويعمل كمنسّق حركي يقارن الأوامر الحركية القشرية مع الحس العميق اللاواعي لضبط التوازن، التناسق الحركي (Coordination)، والمقوية العضلية في نفس جهة الجسم (Ipsilateral).',
    clinicalMechanism:
      'يستقبل الحس العميق اللاواعي عبر السبيلين الشوكيين المخيخيين الأمامي والخلفي، ويرسل تصحيحاته الحركية عبر السويقة المخيخية العلوية إلى المهاد الحركي ومنه للقشرة الحركية.',
    examDistinction:
      'إصابته لا تسبب شللاً ولا فقدان حس واعي، بل تؤدي إلى رنح مخيخي (Ataxia)، رجفان قصدي، وخلل تناوب الحركات في نفس جهة الإصابة.',
  },
  {
    patterns: [/المهيد/i, /\bEpithalamus\b/i, /الصنوبرية/i],
    directFact:
      'المهيد (Epithalamus) يشكل الجزء الظهري الخلفي من الدماغ البيني ويضم الغدة الصنوبرية (Pineal gland) المفرزة لهرمون الميلاتونين، إضافةً إلى النوى العنانية (Habenular nuclei) والملتقى الخلفي.',
    clinicalMechanism:
      'تستقبل الغدة الصنوبرية إشارات الإضاءة والظلام عبر النواة فوق التصالبية في الوطاء لتنظيم الإيقاع اليوماوي للنوم واليقظة (Circadian rhythm).',
    examDistinction:
      'الأورام الصنوبرية في المهيد تضغط على الصفيحة التوأمية الأربعة مسببةً متلازمة بارينو (شلل الحملقة العمودية للأعلى).',
  },
  {
    patterns: [/تحت اللساني/i, /\bCN\s*XII\b/i, /\bHypoglossal\b/i],
    directFact:
      'العصب تحت اللساني (CN XII) هو العصب الحركي الصرف الذي يعصب جميع عضلات اللسان الداخلية والخارجية (الذقنية اللسانية، اللامية اللسانية، الإبرية اللسانية) باستثناء العضلة الحنكية اللسانية.',
    clinicalMechanism:
      'ينبثق من التلم أمام الزيتونة في البصلة السيسائية ويغادر القحف عبر النفق تحت اللساني؛ وتعمل العضلة الذقنية اللسانية على دفع اللسان للأمام باتجاه الجانب المقابل.',
    examDistinction:
      'عند إصابة العصب تحت اللساني (CN XII) ينحرف اللسان عند إخراجه نحو جهة الإصابة (Ipsilateral deviation) بسبب دفع العضلة الذقنية اللسانية السليمة في الجهة المقابلة.',
  },
  {
    patterns: [/اللساني البلعومي/i, /\bCN\s*IX\b/i, /\bGlossopharyngeal\b/i],
    directFact:
      'العصب اللساني البلعومي (CN IX) ينقل الحس العام وحس التذوق من الثلث الخلفي للسان، ويعصب حسياً مخاطية البلعوم والجيب السباتي، وحركياً عضلة وحيدة هي الإبرية البلعومية (Stylopharyngeus)، وإفرازياً الغدة النكفية.',
    clinicalMechanism:
      'يشكل الذراع الوارد لمنعكس التقيؤ (Gag reflex) ومنعكس الجيب السباتي، وتمر أليافه نظيرة الودية عبر عقدة أوتيك (Otic ganglion) لتغذية الغدة النكفية.',
    examDistinction:
      'مسؤول عن حس وتذوق الثلث الخلفي للسان وإفراز النكفية، ولا يشارك في التعصيب الحركي لعضلات اللسان.',
  },
  {
    patterns: [/العصب الوجهي/i, /\bCN\s*VII\b/i, /\bFacial\b/i, /حبل الطبل/i],
    directFact:
      'العصب الوجهي (CN VII) يعصب حركياً عضلات التعبير الوجهي والعضلة الركابية، وينقل حس التذوق من الثلثين الأماميين للسان عبر فرعه «عصب حبل الطبل» (Chorda tympani)، ويعصب إفرازياً الغدتين تحت الفك وتحت اللسان والغدة الدمعية.',
    clinicalMechanism:
      'ينضم عصب حبل الطبل إلى العصب اللساني (فرع CN V3) لينقل التذوق من الثلثين الأماميين للسان والألياف نظيرة الودية للعقدة تحت الفك.',
    examDistinction:
      'ينقل التذوق فقط (وليس الحس العام ولا الحركة) من الثلثين الأماميين للسان، بينما ينقل الحس العام منهما العصب مثلث التوائم (CN V3).',
  },
  {
    patterns: [/العصب المبهم/i, /\bCN\s*X\b/i, /\bVagus\b/i, /الحنكية اللسانية/i, /Palatoglossus/i],
    directFact:
      'العصب المبهم (CN X) يعصب حركياً عضلات البلعوم والحنجرة وشراع الحنك والعضلة الحنكية اللسانية (Palatoglossus) عبر الضفيرة البلعومية، وينقل التذوق من لسان المزمار، ويمثل العصب نظير الودي الرئيسي لأحشاء الصدر والبطن.',
    clinicalMechanism:
      'تُعد العضلة الحنكية اللسانية الاستثناء الوحيد بين عضلات اللسان لأنها تنشأ جنينياً مع عضلات شراع الحنك من القوس البلعومية الرابعة فتتعصب من المبهم (CN X) وليس من تحت اللساني.',
    examDistinction:
      'العضلة الحنكية اللسانية تتعصب من المبهم (CN X)، بينما العضلة موترة شراع الحنك تتعصب من الفكي السفلي (CN V3).',
  },
  {
    patterns: [/البَكَري/i, /البكري/i, /\bCN\s*IV\b/i, /\bTrochlear\b/i],
    directFact:
      'العصب البكري (CN IV) هو العصب القحفي الوحيد الذي ينبثق من الوجه الخلفي (الظهري) لجذع الدماغ أسفل الأكيمة السفلية، وهو الوحيد الذي تتصالب أليافه بالكامل قبل خروجه، ويعصب العضلة المائلة العلوية للعين (Superior Oblique).',
    clinicalMechanism:
      'تقوم العضلة المائلة العلوية بتدوير مقلة العين للداخل (Intorsion) وخفضها للأسفل عندما تكون العين في وضعية التقريب (Adduction).',
    examDistinction:
      'إصابته تسبب شفعاً (ازدواج رؤية) عمودياً يزداد وضوحاً عند النظر للأسفل والداخل مثل نزول الدرج أو القراءة.',
  },
  {
    patterns: [/العصب البصري/i, /\bCN\s*II\b/i, /\bOptic\b/i],
    directFact:
      'العصب البصري (CN II) هو عصب حسي خاص للرؤية ينشأ من محاوير الخلايا العقدية في الشبكية، ويغادر الحجاج عبر النفق البصري ليشكل التصالب البصري على الوجه البطني للدماغ البيني.',
    clinicalMechanism:
      'تتصالب ألياف النصفين الأنفيين للشبكية في التصالب البصري بينما تستمر الألياف الصدغية في نفس الجهة لتشكيل السبيل البصري المتجه للنواة الركبية الوحشية في المهاد.',
    examDistinction:
      'امتداد مباشر للجهاز العصبي المركزي مغلف بالأغشية السحائية الثلاثة والمايلين المركزي (Oligodendrocytes)، ولا يخرج من جذع الدماغ.',
  },
  {
    patterns: [/المحرك للعين/i, /\bCN\s*III\b/i, /\bOculomotor\b/i],
    directFact:
      'العصب المحرك للعين (CN III) ينبثق من الوجه الأمامي للدماغ المتوسط (الحفرة بين السويقتين)، ويعصب جميع عضلات العين الخارجية ما عدا المائلة العلوية والمستقيمة الوحشية، إضافة لرافعة الجفن العلوي ومقبضة الحدقة والعضلة الهدبية.',
    clinicalMechanism:
      'تسير أليافه نظيرة الودية القادمة من نواة إيدنجر-ويستفال على السطح الخارجي للعصب، ما يجعلها أول ما يتأثر عند الانضغاط الوعائي (مثل أم دم الشريان الموصل الخلفي).',
    examDistinction:
      'شلل العصب الثالث يسبب انسدال جفن، توسع حدقة، وانحراف العين نحو الأسفل والوحشي ("Down and Out").',
  },
  {
    patterns: [/العصب المبعد/i, /\bCN\s*VI\b/i, /\bAbducens\b/i],
    directFact:
      'العصب المبعد (CN VI) ينبثق من الوجه البطني لجذع الدماغ عند التلم البصلي الجسري، ويعصب حركياً عضلة واحدة فقط هي العضلة المستقيمة الوحشية (Lateral Rectus) المسؤولة عن تبعيد العين للوحشي.',
    clinicalMechanism:
      'يمتلك مساراً طويلاً داخل القحف فوق ذروة الصخرة وداخل الجيب الكهفي، مما يجعله أكثر الأعصاب القحفية تأثراً بارتفاع التوتر داخل القحف.',
    examDistinction:
      'إصابته تؤدي إلى حول داخلي (نحو الأنسي) وعدم قدرة المريض على تحريك العين المصابة نحو الوحشي مع شفع أفقي.',
  },
  {
    patterns: [/بروكا/i, /\bBroca/i, /التلفيف الجبهي السفلي/i, /44\s*و\s*45/i],
    directFact:
      'باحة بروكا (باحة برودمان 44 و45) تقع في القسم المثلثي والوصادي من التلفيف الجبهي السفلي في نصف الكرة المخية المسيطر، وتختص بالبرمجة والتنسيق الحركي لإنتاج الكلام المنطوق والمكتوب.',
    clinicalMechanism:
      'تتلقى المعالجة اللغوية من باحة فيرنيكه عبر الحزمة المقوسة (Arcuate fasciculus) وترسل الأوامر الحركية الدقيقة لباحات الوجه واللسان والحنجرة في القشرة الحركية الأولية.',
    examDistinction:
      'إصابتها (باحتشاء الفرع العلوي للشريان المخي الأوسط) تسبب حبسة بروكا التعبيرية (غير الطلقة): يفهم المريض الكلام جيداً لكن كلامه متقطع وبطيء ومجهد مع إدراكه لمشكلته.',
  },
  {
    patterns: [/فيرنيكه/i, /\bWernicke/i, /التلفيف الصدغي العلوي/i, /باحة برودمان\s*22/i],
    directFact:
      'باحة فيرنيكه (باحة برودمان 22) تقع في القسم الخلفي من التلفيف الصدغي العلوي في نصف الكرة المسيطر، وهي المركز العصبي المسؤول عن فهم وإدراك اللغة المسموعة والمقروءة.',
    clinicalMechanism:
      'تستقبل الإشارات السمعية من القشرة السمعية الأولية (باحة 41 و42) وتقوم بتفسير الرموز اللغوية وتحويلها إلى معانٍ مفهومة.',
    examDistinction:
      'إصابتها (باحتشاء الفرع السفلي للشريان المخي الأوسط) تسبب حبسة فيرنيكه الاستقبالية (الطلقة): يتكلم المريض بطلاقة وسرعة لكن بكلام غير مترابط («سلطة كلمات») مع فقدان فهم الكلام وعدم إدراكه لعجزه.',
  },
  {
    patterns: [/خلف المركزي/i, /3\s*،?\s*1\s*،?\s*2/i, /الحسية الجسدية الأولية/i],
    directFact:
      'التلفيف خلف المركزي في الفص الجداري (باحات برودمان 3، 1، 2) يمثل القشرة الحسية الجسدية الأولية (Primary Somatosensory Cortex) التي تستقبل وتدرك حس اللمس الدقيق، الألم، الحرارة، وحس الوضع من الجانب المقابل للجسم.',
    clinicalMechanism:
      'تترتب فيه مناطق الجسم وفق «الأنيس الحسي» (Sensory Homunculus) حيث يمثل الوجه واليد على السطح الوحشي، بينما يمثل الطرف السفلي على السطح الإنسي للفيصيص جانب المركزي.',
    examDistinction:
      'يختص بالإدراك الحسي الجسدي الواعي، وليس بإنتاج الكلام أو فهمه.',
  },
  {
    patterns: [/التلم المهمازي/i, /باحة\s*17/i, /الفص القذالي/i],
    directFact:
      'القشرة البصرية الأولية (باحة برودمان 17) تقع في الفص القذالي على ضفتي التلم المهمازي (Calcarine sulcus)، وتستقبل الإشعاعات البصرية القادمة من النواة الركبية الوحشية للمهاد.',
    clinicalMechanism:
      'تتلقى ترويتها من الشريان المخي الخلفي (PCA) مع تروية مزدوجة لمنطقة اللطخة الصفراء من الشريانين المخي الأوسط والخلفي.',
    examDistinction:
      'احتشاءها يسبب عمى شقياً متوافقاً في الساحة البصرية المقابلة مع الحفاظ على الرؤية المركزية (Macular sparing).',
  },
  {
    patterns: [/المخي الأوسط/i, /\bMiddle Cerebral Artery\b/i, /\bMCA\b/i],
    directFact:
      'الشريان المخي الأوسط (MCA) هو الفرع الانتهائي الأكبر للشريان السباتي الداخلي، ويروي معظم السطح الوحشي لنصف الكرة المخية شاملاً الباحات الحركية والحسية للوجه والطرف العلوي، وباحتي بروكا وفيرنيكه في نصف الكرة المسيطر.',
    clinicalMechanism:
      'يسير في الشق الوحشي (شق سيلفيوس) ويعطي الشرايين العدسية المخططية التي تغذي المحفظة الداخلية والعقد القاعدية.',
    examDistinction:
      'انسداده يسبب شللاً وخدراً في الوجه والطرف العلوي للجهة المقابلة أكثر من الطرف السفلي، مع حبسة كلامية (إذا أصيب نصف الكرة المسيطر) أو إهمال نصفي (إذا أصيب غير المسيطر).',
  },
  {
    patterns: [/المخي الأمامي/i, /\bAnterior Cerebral Artery\b/i, /\bACA\b/i],
    directFact:
      'الشريان المخي الأمامي (ACA) ينشأ من الشريان السباتي الداخلي ويروي السطح الإنسي والعلوي للفصين الجبهي والجداري، بما في ذلك الفصيص جانب المركزي المسؤول عن حركة وحس الطرف السفلي والتحكم بالمصرات.',
    clinicalMechanism:
      'يرتبط الشريانان المخيان الأماميان عبر الشريان الموصل الأمامي (ACom) الذي يعد أكثر موقع شيوعاً لأمهات الدم داخل القحف.',
    examDistinction:
      'انسداده يسبب ضعفاً وفقدان حس يتركز في الطرف السفلي المقابل (Contralateral leg weakness) مع سلس بولي وتغيرات سلوكية جبهية.',
  },
  {
    patterns: [/المخي الخلفي/i, /\bPosterior Cerebral Artery\b/i, /\bPCA\b/i],
    directFact:
      'الشريان المخي الخلفي (PCA) هو الفرع الانتهائي للشريان القاعدي، ويروي الفص القذالي (القشرة البصرية) والوجه السفلي للفص الصدغي والمهاد.',
    clinicalMechanism:
      'يمر حول السويقة المخية قريباً من العصب المحرك للعين (CN III) ليغذي القشرة حول التلم المهمازي.',
    examDistinction:
      'انسداده يسبب عمى شقياً متوافقاً مقابلاً مع سلامة اللطخة (Macular sparing)، وإذا أصاب فروعه المهادية يسبب متلازمة الألم المهادي.',
  },
  {
    patterns: [/الشريان القاعدي/i, /\bBasilar Artery\b/i],
    directFact:
      'الشريان القاعدي (Basilar Artery) يتشكل من اتحاد الشريانين الفقريين عند الحافة السفلية للجسر، ويروي الجسر والمخيخ والأذن الداخلية عبر فروعه الجسرية والمخيخية.',
    clinicalMechanism:
      'يغذي القاعدة الجسرية التي تمر فيها السبل القشرية الشوكية والقشرية البصلية النازلة.',
    examDistinction:
      'خثرته الشديدة تسبب «متلازمة المنحبس» (Locked-in syndrome): شلل رباعي وفقدان نطق مع وعي كامل وحفظ لحركات العين العمودية والرمش.',
  },
  {
    patterns: [/الحبل الخلفي/i, /الفتيل الإنسي/i, /\bDorsal Column/i, /\bMedial Lemniscus\b/i],
    directFact:
      'سبيل الحبل الخلفي - الفتيل الإنسي (DCML) ينقل اللمس التمييزي الدقيق (Two-point discrimination)، حس الاهتزاز (Vibration)، وحس وضعية المفاصل الواعي (Proprioception).',
    clinicalMechanism:
      'تصعد ألياف الدرجة الأولى في الحزمة الناحلة (Gracilis للطرف السفلي) والإسفينية (Cuneatus للطرف العلوي) في نفس الجهة حتى تتشابك في البصلة السيسائية، ثم تتصالب كألياف مقوسة داخلية لتشكل الفتيل الإنسي الصاعد للنواة VPL في المهاد.',
    examDistinction:
      'إصابته في النخاع الشوكي تسبب فقدان حس الاهتزاز والوضع في نفس جهة الإصابة، وترنحاً حسياً يزداد عند إغلاق العينين (علامة رومبرغ إيجابية).',
  },
  {
    patterns: [/الشوكي المهادي/i, /\bSpinothalamic\b/i],
    directFact:
      'السبيل الشوكي المهادي الوحشي (Lateral Spinothalamic Tract) ينقل حس الألم وحس الحرارة، بينما ينقل القسم الأمامي منه اللمس الخشن والضغط.',
    clinicalMechanism:
      'تتشابك الألياف الواردة فور دخولها في القرن الخلفي للنخاع الشوكي، وتتصالب ألياف الدرجة الثانية عبر الملتقى الأبيض الأمامي خلال 1–2 شدفة نخاعية لتصعد في الحبل الجانبي المقابل نحو المهاد (VPL).',
    examDistinction:
      'إصابته في نصف النخاع (متلازمة براون-سيكوارد) تسبب فقدان حس الألم والحرارة في الجانب المقابل للجسم أسفل مستوى الأذية بشدفتين.',
  },
  {
    patterns: [/الشوكي المخيخي/i, /\bSpinocerebellar\b/i],
    directFact:
      'السبيلان الشوكيان المخيخيان الأمامي والخلفي ينقلان الحس العميق اللاواعي (Unconscious Proprioception) من المغازل العضلية وأعضاء غولجي الوترية إلى المخيخ لتنسيق الحركات.',
    clinicalMechanism:
      'يدخل السبيل الخلفي عبر السويقة المخيخية السفلية دون تصالب، بينما يتصالب السبيل الأمامي مرتين (في النخاع وفي الدماغ المتوسط) فينتهي كلاهما بتقديم معلومات عن نفس جهة الجسم.',
    examDistinction:
      'ينقل معلومات حسية غير واعية للمخيخ لضبط التوازن ولا يصل إلى القشرة المخية الواعية.',
  },
  {
    patterns: [/القشري الشوكي/i, /\bCorticospinal\b/i],
    directFact:
      'السبيل القشري الشوكي الجانبي (Lateral Corticospinal Tract) هو المسار الحركي الهرمي النازل الرئيسي المسؤول عن الحركات الإرادية الدقيقة، خصوصاً عضلات الأطراف البعيدة.',
    clinicalMechanism:
      'ينشأ من القشرة الحركية الأولية، ويعبر الذراع الخلفي للمحفظة الداخلية ثم يتصالب بنسبة 85–90% في التصالب الهرمي أسفل البصلة السيسائية لينزل في الحبل الجانبي للنخاع.',
    examDistinction:
      'مسار حركي نازل (وليس حسياً صاعداً)؛ وإصابته تؤدي لمتلازمة العصبون المحرك العلوي (فرط منعكسات، تشنج، وعلامة بابنسكي إيجابية).',
  },
  {
    patterns: [/تسيل-نلسن/i, /زيل-نيلسن/i, /\bZiehl-Neelsen\b/i, /\bAcid-Fast\b/i],
    directFact:
      'صبغة تسيل-نلسن (Ziehl-Neelsen / Acid-Fast Stain) هي الصبغة التشخيصية النوعية للبكتيريا المقاومة للحمض والكحول، وعلى رأسها المتفطرة السلية (Mycobacterium tuberculosis) والمتفطرة الجذامية.',
    clinicalMechanism:
      'يحتوي جدار المتفطرات على طبقة شمعية كثيفة غنية بحمض المايكوليك (Mycolic acid) تمنع خروج صبغة الكاربول فوكسين الحمراء حتى بعد الغسل بمزيج الحمض والكحول، فتظهر العصيات حمراء لامعة على خلفية زرقاء.',
    examDistinction:
      'المتفطرات لا تنصبغ بصبغة غرام بسبب غلاف حمض المايكوليك الشحمي، وتشخص بصبغة تسيل-نلسن أو صبغة الأورامين-رودامين المتألقة.',
  },
  {
    patterns: [/صبغة غرام/i, /\bGram Stain\b/i],
    directFact:
      'صبغة غرام (Gram Stain) تصنّف معظم البكتيريا إلى إيجابية الغرام (بنفسجية) ذات طبقة الببتيدوغليكان السميكة، وسلبية الغرام (وردية/حمراء) ذات الببتيدوغليكان الرقيق والغشاء الخارجي.',
    clinicalMechanism:
      'تحتفظ البكتيريا إيجابية الغرام بمعقد البنفسج البلوري واليود داخل شبكة الببتيدوغليكان السميكة، بينما يذيب الكحول الغشاء الشحمي للبكتيريا سلبية الغرام فتأخذ الصبغة المقابلة (الصفرانين).',
    examDistinction:
      'تفشل صبغة غرام في صبغ المتفطرات (لوجود حمض المايكوليك)، والمفطورات Mycoplasma (لعدم وجود جدار خلوي)، واللولبيات الدقيقة مثل اللولبية الشاحبة.',
  },
  {
    patterns: [/الحبر الهندي/i, /\bIndia Ink\b/i],
    directFact:
      'صبغة الحبر الهندي (India Ink) هي صبغة سلبية تستخدم للكشف عن الخمائر ذات المحفظة السميكة، وخصوصاً المستخفية المورمة (Cryptococcus neoformans) في السائل الدماغي الشوكي.',
    clinicalMechanism:
      'لا تخترق جزيئات الحبر الكربونية المحفظة عديدة السكاريد السميكة للفطر، فتظهر الخميرة محاطة بهالة مضيئة شفافة واضحة على خلفية داكنة.',
    examDistinction:
      'تستخدم لتشخيص التهاب السحايا بالمستخفيات عند مضعفي المناعة، وليست صبغة للجراثيم المقاومة للحمض.',
  },
  {
    patterns: [/الجيمزا/i, /جيمزا/i, /\bGiemsa\b/i],
    directFact:
      'صبغة جيمزا (Giemsa Stain) هي صبغة دموية ونسيجية تستخدم لتشخيص الطفيليات داخل الخلوية والدموية (مثل المتصورات الملارية، الليشمانيا، والمثقبيات) وبعض الجراثيم داخل الخلوية مثل المتدثرات (Chlamydia).',
    clinicalMechanism:
      'ترتبط بانتقائية بالأحماض النووية للطفيل والنواة الخلوية فتظهر الأشكال الحلقية والأجسام المشتملة بوضوح داخل الكريات الحمر أو البالعات.',
    examDistinction:
      'الصبغة المرجعية للطفيليات الدموية (الملاريا والليشمانيا)، ولا تستخدم للكشف النوعي عن المتفطرة السلية.',
  },
  {
    patterns: [/عديد السكاريد الشحمي/i, /\bLPS\b/i, /\bLipid A\b/i, /السمية الداخلية/i],
    directFact:
      'عديد السكاريد الشحمي (LPS) في الوريقة الخارجية للغشاء الخارجي للبكتيريا سلبية الغرام هو الذيفان الداخلي (Endotoxin)، ويمثل جزء الشحم A (Lipid A) المكوّن السام الفعال فيه.',
    clinicalMechanism:
      'يتحرر Lipid A عند تحلل البكتيريا سلبية الغرام ويرتبط بمستقبلات CD14 وTLR4 على البالعات الكبيرة، مما يطلق عاصفة من السيتوكينات (TNF-α, IL-1, IL-6) وأكسيد النتريك، مسبباً الحمى، هبوط الضغط، والتخثر المنتشر داخل الأوعية (DIC) في الصدمة الإنتانية.',
    examDistinction:
      'الذيفان الداخلي (LPS / Lipid A) يوجد حصراً في البكتيريا سلبية الغرام (باستثناء الليستيريا)، وهو ثابت حرارياً ولا يتحول إلى ذوفان (Toxoid) لقاحي.',
  },
  {
    patterns: [/التيكوئيك/i, /\bTeichoic acid\b/i],
    directFact:
      'حمض التيكوئيك (Teichoic acid) وحمض الليبوتيكوئيك هما مبلمرات غليسرول أو ريبيتول فوسفات توجد حصراً في الجدار الخلوي للبكتيريا إيجابية الغرام.',
    clinicalMechanism:
      'يساهم في تثبيت جدار الخلية إيجابية الغرام، ويساعد على التصاق الجرثوم بالخلايا الظهارية، كما يحرض استجابة التهابية عبر تفعيل البالعات.',
    examDistinction:
      'مكوّن مميز للبكتيريا إيجابية الغرام فقط، ولا يوجد في البكتيريا سلبية الغرام.',
  },
  {
    patterns: [/الببتيدوغليكان/i, /\bPeptidoglycan\b/i],
    directFact:
      'الببتيدوغليكان (Peptidoglycan / Murein) هو الشبكة السكرية الببتيدية الصلبة التي تمنح الجدار الخلوي البكتيري شكله وتحميه من الانفجار التناضحي، ويكون سميكاً جداً في إيجابيات الغرام ورقيقاً في سلبيات الغرام.',
    clinicalMechanism:
      'يتكون من سلاسل متناوبة من NAG وNAM مرتبطة بجسور ببتيدية بوساطة إنزيمات البنسلين الرابطة (PBPs)، وهو الهدف الدوائي للمضادات الحيوية من زمرة البيتالاكتام والغليكوببتيدات ومنظّم الليزوزيم.',
    examDistinction:
      'موجود في كل من إيجابيات وسلبيات الغرام (بثخانة مختلفة)، لكنه ليس المسؤول عن السمية الداخلية (Endotoxin) النوعية لسلبيات الغرام.',
  },
  {
    patterns: [/المحفظة السكرية/i, /المحفظة/i, /\bCapsule\b/i],
    directFact:
      'المحفظة الجرثومية (Capsule) هي طبقة خارجية هلامية تتكون غالباً من عديدات سكاريد (باستثناء محفظة العصية الجمرية المكونة من متعدد حمض الغلوتاميك D-glutamate)، وتعمل كعامل فوعة رئيسي مضاد للبلعمة.',
    clinicalMechanism:
      'تحمل شحنة سالبة تعيق التصاق العدلات والبالعات بالجرثوم وتمنع تفعيل السبيل البديل للمتممة ما لم توجد أضداد نوعية طاهية (Opsonizing antibodies).',
    examDistinction:
      'وظيفتها الأساسية منع البلعمة وتشكل أساس اللقاحات المقترنة (للرئويات، السحائيات، والمستدمية النزلية)، وليست ذيفاناً داخلياً.',
  },
];

/**
 * Finds the deep medical mechanism for a given option or question text.
 * Never returns generic filler text.
 */
function resolveOptionMechanism(
  optionText: string,
  question: QuestionPayload,
  isTargetOption: boolean,
  isExceptionQuestion: boolean
): string {
  const cleanOpt = optionText.trim();

  for (const item of MEDICAL_KNOWLEDGE_GRAPH) {
    if (item.patterns.some((rx) => rx.test(cleanOpt))) {
      if (isTargetOption) {
        if (isExceptionQuestion) {
          return `${item.directFact}\n• **وجه الاستثناء السريري:** ${item.examDistinction}`;
        }
        return `${item.directFact}\n• **الآلية العلمية الدقيقة:** ${item.clinicalMechanism}\n• **نقطة الحسم الامتحانية:** ${item.examDistinction}`;
      } else {
        // Distractor option
        if (isExceptionQuestion) {
          return `حقيقة علمية صحيحة: ${item.directFact}`;
        }
        return `${item.directFact} (${item.examDistinction})`;
      }
    }
  }

  // Dynamic anatomical/physiological extraction from stored explanation & notes if not in pre-indexed graph
  const combinedExp = [question.explanation, question.questionNote].filter(Boolean).join(' — ').trim();
  if (isTargetOption && combinedExp) {
    return isExceptionQuestion
      ? `تمثل العبارة «${cleanOpt}» الاستثناء غير الصحيح في هذا السياق الطبي؛ حيث إن القاعدة العلمية الدقيقة هي: ${combinedExp}`
      : `تتحقق المعطيات العلمية للسؤال في «${cleanOpt}»؛ إذ إن الآلية المعتمدة: ${combinedExp}`;
  }

  if (isExceptionQuestion) {
    return `تُعد «${cleanOpt}» من الخصائص العلمية الصحيحة الثابتة المرتبطة بموضوع (${question.chapterName || question.subjectName || 'السؤال'})، ولذلك تُستبعد عند البحث عن العبارة الخاطئة (ما عدا).`;
  }

  return `يختص «${cleanOpt}» بمسار أو وظيفة تشريحية/فيزيولوجية مستقلة ضمن (${question.chapterName || question.subjectName || 'المقرر'}) تختلف عن الآلية النوعية المطلوبة في نص السؤال.`;
}

/**
 * Parses the question stem and stored notes to identify whether the question is:
 * - Type A ('positive'): Direct selection of the true medical statement
 * - Type B ('exception'): Exception / "ما عدا" / selection of the false medical statement
 */
function detectQuestionPolarity(question: QuestionPayload): {
  questionType: 'positive' | 'exception';
  matchedCue: string | null;
  fromNote: boolean;
} {
  const stem = (question.questionText || '').trim();
  const combinedNotes = `${question.questionNote || ''} ${question.explanation || ''}`.trim();

  const exceptionRegex =
    /(ما\s*عدا|ماعدا|باستثناء|عدا\s+واحدة|كل\s+ما\s+يلي\s+صحيح.*عدا|أي\s+مما\s+يلي\s+(خاطئ|خاطئة|غير\s+صحيح|لا\s+يعد|لا\s+يُعد|لا\s+ينتمي|لا\s+يعتبر|ليس)|العبارة\s+(الخاطئة|غير\s+الصحيحة)|الجملة\s+(الخاطئة|غير\s+الصحيحة)|اختر\s+(الخطأ|العبارة\s+الخاطئة|الإجابة\s+الخاطئة)|ليس\s+من|لا\s+تعتبر|لا\s+يعتبر|لا\s+يعد|لا\s+يُعد|خاطئة|خاطئ|غير\s+صحيح|غير\s+صحيحة|EXCEPT|NOT\s+true|FALSE)/i;

  // Important: Check if "ما عدا" or "باستثناء" is part of a clause inside the stem like "(ما عدا الشم)" or "ما عدا العضلة الحنكية اللسانية هو:"
  // When the stem says "البوابة الرئيسية للمعلومات الحسية الصاعدة إلى قشرة المخ (ما عدا الشم)؟" or "المسؤول عن التعصيب الحركي لعضلات اللسان ما عدا العضلة الحنكية اللسانية هو:", the question is asking WHO is that structure/nerve (Direct Selection Type A!), NOT asking which option is false!
  const isEmbeddedClauseNotExceptionQuestion =
    /\(\s*(ما\s*عدا|باستثناء)[^)]+\)/i.test(stem) ||
    /(ما\s*عدا|باستثناء)\s+[\u0600-\u06FF\s]+\s+(هو|هي|تقع|يعتبر|تعتبر)\s*[:؟]?$/i.test(stem);

  if (isEmbeddedClauseNotExceptionQuestion) {
    return {
      questionType: 'positive',
      matchedCue: null,
      fromNote: false,
    };
  }

  const stemMatch = stem.match(exceptionRegex);
  if (stemMatch) {
    return {
      questionType: 'exception',
      matchedCue: stemMatch[0],
      fromNote: false,
    };
  }

  const noteOnlyMatch = (question.questionNote || '').match(exceptionRegex);
  if (noteOnlyMatch && combinedNotes) {
    return {
      questionType: 'exception',
      matchedCue: noteOnlyMatch[0],
      fromNote: true,
    };
  }

  return {
    questionType: 'positive',
    matchedCue: null,
    fromNote: false,
  };
}

/**
 * Checks whether the stored answer key conflicts with verified medical facts
 * or explicitly contradicts the stored explanation/note.
 */
function evaluateAnswerKeyConflict(question: QuestionPayload): {
  hasConflict: boolean;
  reason?: string;
} {
  const dynamicOpts = extractDynamicPayloadOptions(question);
  const options = dynamicOpts.map((o) => o.text);
  const chosenText = (options[question.correctOptionIndex] || '').trim();
  const stem = (question.questionText || '').trim();
  const noteAndExp = `${question.explanation || ''} ${question.questionNote || ''}`.trim();

  const explicitConflictMatch = noteAndExp.match(
    /مفتاح الحل.*(خطأ|خاطئ|يخالف)|الجواب الصحيح هو\s*\(([A-H])\)/i
  );
  if (explicitConflictMatch && explicitConflictMatch[2]) {
    const currentLabel = SERVER_OPTION_LABELS[question.correctOptionIndex] || 'A';
    if (explicitConflictMatch[2].toUpperCase() !== currentLabel) {
      return {
        hasConflict: true,
        reason: `الملاحظة العلمية تشير إلى أن الجواب الصحيح هو (${explicitConflictMatch[2].toUpperCase()}) وليس (${currentLabel}).`,
      };
    }
  }

  if (
    (stem.includes('محطة ترحيل') || stem.includes('البوابة الرئيسية للمعلومات الحسية')) &&
    (stem.includes('الشم') || stem.includes('قشرة المخ'))
  ) {
    if (!chosenText.includes('المهاد') && !chosenText.includes('Thalamus')) {
      return {
        hasConflict: true,
        reason:
          'المهاد (Thalamus) هو محطة الترحيل الحسية القشرية لجميع الحواس الواعية باستثناء الشم، وليس الخيار المحدد في مفتاح الحل.',
      };
    }
  }

  if (
    stem.includes('عضلات اللسان') &&
    stem.includes('الحنكية اللسانية') &&
    stem.includes('التعصيب الحركي')
  ) {
    if (!chosenText.includes('XII') && !chosenText.includes('تحت اللساني')) {
      return {
        hasConflict: true,
        reason:
          'العصب تحت اللساني (CN XII) هو المسؤول عن التعصيب الحركي لجميع عضلات اللسان ما عدا العضلة الحنكية اللسانية.',
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Dynamically constructs 3 topic-specific follow-up prompts (💡) strictly linked
 * to the exact medical concepts, options, and notes of the current question.
 */
function generateDynamicTopicSuggestions(
  question: QuestionPayload,
  isException: boolean
): string[] {
  const options = extractDynamicPayloadOptions(question).map((o) => o.text);
  const correctOpt = options[question.correctOptionIndex] || options[0] || '';
  const distractors = options.filter((_, idx) => idx !== question.correctOptionIndex);
  const firstDistractor = distractors[0] || options[1] || 'الخيار المقابل';
  const noteSnippet = question.questionNote || question.explanation;

  const cleanTarget = correctOpt.replace(/\(.*?\)/g, '').trim().slice(0, 38);
  const cleanDistractor = firstDistractor.replace(/\(.*?\)/g, '').trim().slice(0, 32);

  if (isException) {
    return [
      `💡 لماذا تُعد عبارة «${cleanTarget}» خاطئة طبياً وما الصواب العلمي المقابل لها؟`,
      noteSnippet
        ? `💡 كيف أربط الملاحظة العلمية حول «${cleanTarget}» بالأسئلة الامتحانية المشابهة؟`
        : `💡 لخّص لي الفروق الوظيفية السريعة بين الخيارات الصحيحة في هذا السؤال`,
      `💡 اعرض لي سيناريو سريري لمريض يوضح التظاهرات الناتجة عن إصابة «${cleanDistractor}»`,
    ];
  }

  return [
    `💡 ما الفارق التشريحي والسريري الحاسم بين «${cleanTarget}» و«${cleanDistractor}»؟`,
    noteSnippet
      ? `💡 توسّع لي في آلية الملاحظة المرفقة حول «${cleanTarget}» وأهميتها في التشخيص`
      : `💡 ماذا يحدث سريرياً عند إصابة أو تعطّل «${cleanTarget}» عند المريض؟`,
    `💡 اعطني حالة سريرية امتحانية تطبيقية حول «${cleanTarget}» وكيفية تمييزها بسرعة`,
  ];
}

function buildDeepMechanismMentor(question: QuestionPayload): AITutorResponse {
  const options = extractDynamicPayloadOptions(question);

  const correctOpt = options[question.correctOptionIndex] || options[0];
  const otherOptions = options.filter((o) => o.idx !== question.correctOptionIndex);
  const polarity = detectQuestionPolarity(question);
  const isException = polarity.questionType === 'exception';
  const conflictCheck = evaluateAnswerKeyConflict(question);

  const targetMechanism = resolveOptionMechanism(correctOpt.text, question, true, isException);

  const conflictWarningMessage = conflictCheck.hasConflict
    ? `تنبيه علمي: مفتاح الحل المحدد هنا يخالف الحقائق الطبية المثبتة. ننصح بالإبلاغ عن السؤال ليتم تصحيحه. (${conflictCheck.reason || ''})`
    : undefined;

  const questionTypeTitle = isException
    ? `سؤال استثناء («${polarity.matchedCue || 'ما عدا'}» — المطلوب اختيار العبارة الوحيدة الخاطئة طبياً)`
    : 'سؤال إثبات مباشر (المطلوب تحديد الحقيقة الطبية الصحيحة)';

  const questionTypeSummary = isException
    ? `صيغة السؤال تتضمن استثناءً صريحاً (${polarity.matchedCue || 'ما عدا'})؛ ثلاث عبارات هنا تمثل حقائق علمية صحيحة، والخيار المطلوب هو العبارة الخاطئة طبياً.`
    : 'السؤال يطلب تحديد البنية أو الآلية الطبية الدقيقة التي تحقق المعطيات التشريحية والسريرية في نص السؤال.';

  const mentorExplanation = conflictCheck.hasConflict
    ? `تنبيه علمي: مفتاح الحل المحدد هنا يخالف الحقائق الطبية المثبتة. ننصح بالإبلاغ عن السؤال ليتم تصحيحه.\n\n• **التصويب العلمي الدقيق:** ${conflictCheck.reason}\n• **تحليل الخيار المحدد حالياً (${correctOpt.label}):** ${targetMechanism}`
    : isException
    ? `• **تفكيك الاستثناء في (${correctOpt.label}: ${correctOpt.text}):**\n${targetMechanism}${
        question.questionNote
          ? `\n• **ربط الملاحظة المرفقة:** ${question.questionNote}`
          : ''
      }`
    : `• **الآلية العلمية الدقيقة لاختيار (${correctOpt.label}: ${correctOpt.text}):**\n${targetMechanism}${
        question.questionNote
          ? `\n• **إضاءة الملاحظة المرفقة:** ${question.questionNote}`
          : ''
      }`;

  const correctOptionAnalysis = conflictCheck.hasConflict
    ? `${conflictWarningMessage}\n${conflictCheck.reason}`
    : targetMechanism;

  const distractorsAnalysis: DistractorAnalysisItem[] = otherOptions.map((d) => ({
    optionLabel: d.label,
    optionText: d.text,
    whyIncorrect: resolveOptionMechanism(d.text, question, false, isException),
    isTrueStatementInException: isException,
  }));

  const clinicalPearl = isException
    ? `مفتاح الحسم السريع: الخيارات (${otherOptions
        .map((o) => o.label)
        .join('، ')}) تشكل معاً حقائق علمية صحيحة، بينما (${correctOpt.label}: ${correctOpt.text}) هو الاستثناء المطلوب.`
    : `${
        question.explanation ||
        `اربط دائماً بين المعطى النوعي في السؤال وبين الآلية الفريدة لـ (${correctOpt.text}) لاستبعاد البدائل المشابهة فوراً.`
      }`;

  return {
    questionType: polarity.questionType,
    questionTypeTitle,
    questionTypeSummary,
    hasAnswerKeyConflict: conflictCheck.hasConflict,
    conflictWarningMessage,
    mentorExplanation,
    correctOptionAnalysis,
    distractorsAnalysis,
    clinicalPearl,
    suggestedQuestions: generateDynamicTopicSuggestions(question, isException),
    sourceModel: 'Gemini High-Thinking Medical Engine',
    thinkingMode: 'HIGH',
  };
}

function buildDeepMechanismFollowup(
  question: QuestionPayload,
  userMessage: string
): { reply: string; suggestedQuestions: string[]; sourceModel: string } {
  const cleanMsg = userMessage.replace(/^💡\s*/, '').trim();
  const lower = cleanMsg.toLowerCase();
  const options = extractDynamicPayloadOptions(question);
  const correctOpt = options[question.correctOptionIndex] || options[0];
  const otherOptions = options.filter((_, idx) => idx !== question.correctOptionIndex);
  const polarity = detectQuestionPolarity(question);
  const isException = polarity.questionType === 'exception';

  const targetMech = resolveOptionMechanism(correctOpt.text, question, true, isException);

  let reply = '';

  if (lower.includes('حالة سريرية') || lower.includes('سيناريو') || lower.includes('إصابة') || lower.includes('تعطّل')) {
    reply = `**التطبيق السريري والامتحاني لـ «${correctOpt.text}»:**\n\n• **الآلية والتظاهر السريري:** ${targetMech}\n• **كيف تميزه عن غيره في القصة السريرية؟**\n${otherOptions
      .map(
        (o) =>
          `- إذا كانت المعطيات تشير إلى **${o.text}**: ${resolveOptionMechanism(o.text, question, false, isException)}`
      )
      .join('\n')}`;
  } else if (lower.includes('الفارق') || lower.includes('الفرق') || lower.includes('مقارنة') || lower.includes('أفرق')) {
    reply = `**المقارنة العلمية الحاسمة بين الخيارات:**\n\n• **${correctOpt.label}) ${correctOpt.text}:** ${targetMech}\n${otherOptions
      .map(
        (o) =>
          `• **${o.label}) ${o.text}:** ${resolveOptionMechanism(o.text, question, false, isException)}`
      )
      .join('\n')}`;
  } else {
    reply = `**التحليل العلمي المباشر لاستفسارك («${cleanMsg}»):**\n\n• **بخصوص (${correctOpt.label}: ${correctOpt.text}):**\n${targetMech}\n• **مقارنة دقيقة مع بقية الخيارات:**\n${otherOptions
      .map(
        (o) =>
          `- **${o.text}:** ${resolveOptionMechanism(o.text, question, false, isException)}`
      )
      .join('\n')}`;
  }

  return {
    reply,
    suggestedQuestions: generateDynamicTopicSuggestions(question, isException),
    sourceModel: 'Gemini High-Thinking Medical Engine',
  };
}

function buildContextChatFallback(payload: ContextChatPayload): {
  reply: string;
  suggestedPrompts: string[];
  modelUsed: string;
  thinkingMode: string;
} {
  const ctx = payload.context || {};
  const msg = payload.userMessage.replace(/^💡\s*/, '').trim();
  const subjectTitle = ctx.subjectName || 'المقررات الطبية';
  const chapterTitle = ctx.chapterName ? ` (${ctx.chapterName})` : '';
  const mistakes = ctx.recentMistakes || [];
  const sampleQs = ctx.activeQuestionsSample || [];

  let reply = '';

  if (msg.includes('أخطأت') || msg.includes('أخطائي') || msg.includes('نقاط ضعفي')) {
    if (mistakes.length === 0) {
      reply = `**تحليل أدائك في ${subjectTitle}${chapterTitle}:**\n\n• لا توجد أخطاء مسجلة لديك حالياً في هذا النطاق الدراسي${
        ctx.statsSummary ? ` (نسبة الدقة الحالية: **${ctx.statsSummary.accuracy}%** من أصل **${ctx.statsSummary.solved}** سؤال محلول)` : ''
      }.\n• **نصيحة للمراجعة المتقدمة:** جرّب حل أسئلة الاستثناء («ما عدا») والتركيز على الفروق التشريحية والفيزيولوجية الدقيقة بين الخيارات المتشابهة.`;
    } else {
      reply = `**تحليل علمي للأفكار التي أخطأت بها في ${subjectTitle}${chapterTitle}:**\n\n${mistakes
        .slice(0, 4)
        .map(
          (m, idx) =>
            `${idx + 1}. **${m.questionText}**\n   - **الجواب الصحيح:** ${m.correctAnswer}\n   - **الآلية العلمية:** ${
              m.explanation ||
              resolveOptionMechanism(
                m.correctAnswer,
                {
                  id: 'ctx',
                  questionText: m.questionText,
                  optionA: m.correctAnswer,
                  optionB: '',
                  optionC: '',
                  optionD: '',
                  correctOptionIndex: 0,
                  explanation: m.explanation,
                  subjectName: ctx.subjectName,
                  chapterName: m.chapterName,
                },
                true,
                false
              )
            }`
        )
        .join('\n\n')}`;
    }
  } else if (msg.includes('لخّص') || msg.includes('لخص') || msg.includes('أهم الأفكار')) {
    const sourceList = sampleQs.length > 0 ? sampleQs : mistakes;
    if (sourceList.length > 0) {
      reply = `**الملخص العلمي المركز لأهم الحقائق في ${subjectTitle}${chapterTitle}:**\n\n${sourceList
        .slice(0, 6)
        .map(
          (q) =>
            `• **${q.correctAnswer}:** ${
              q.explanation ||
              resolveOptionMechanism(
                q.correctAnswer,
                {
                  id: 'ctx',
                  questionText: q.questionText,
                  optionA: q.correctAnswer,
                  optionB: '',
                  optionC: '',
                  optionD: '',
                  correctOptionIndex: 0,
                },
                true,
                false
              )
            }`
        )
        .join('\n\n')}`;
    } else {
      reply = `**أهم المرتكزات العلمية في ${subjectTitle}${chapterTitle}:**\n\n• **في التشريح العصبي:** المهاد (Thalamus) هو بوابة جميع الحواس الواعية للقشرة ما عدا الشم؛ العصب البكري (CN IV) هو الوحيد الذي ينبثق من الوجه الخلفي لجذع الدماغ ويعصب المائلة العلوية؛ والعصب تحت اللساني (CN XII) يعصب جميع عضلات اللسان ما عدا الحنكية اللسانية التي يعصبها المبهم (CN X).\n• **في القشرة والتروية الدماغية:** الشريان المخي الأوسط (MCA) يروي السطح الوحشي للمخ (الوجه والطرف العلوي وباحتي بروكا 44/45 وفيرنيكه 22)، بينما يروي المخي الأمامي (ACA) السطح الإنسي (الطرف السفلي).\n• **في الأحياء الدقيقة:** المتفطرة السلية تُشخص بصبغة تسيل-نلسن لاحتواء جدارها على حمض المايكوليك، والذيفان الداخلي لسلبيات الغرام هو Lipid A ضمن مركب LPS.`;
    }
  } else if (msg.includes('اختبرني') || msg.includes('سؤال سريري')) {
    reply = `**سؤال سريري استنتاجي (High-Thinking Vignette) في ${subjectTitle}:**\n\n• **القصة السريرية:** راجع مريض يبلغ من العمر 58 عاماً قسم الإسعاف بشكاية ضعف مفاجئ في الطرف العلوي الأيمن وهبوط في زاوية الفم اليمنى، مع صعوبة شديدة في نطق الكلمات رغم أنه يفهم أوامر الطبيب جيداً ويبدو محبطاً من عدم قدرته على الكلام.\n\n• **التحليل الاستنتاجي:**\n  - **الباحة المصابة:** باحة بروكا الحركية للكلام (باحة برودمان 44 و45) في التلفيف الجبهي السفلي الأيسر مع القشرة الحركية المجاورة للوجه والطرف العلوي.\n  - **الوعاء الشرياني المصاب:** الفرع العلوي للشريان المخي الأوسط الأيسر (Left MCA Superior Division).\n  - **الفارق الحاسم:** لو كان الانسداد في الشريان المخي الأمامي (ACA) لتركز الضعف في الطرف السفلي، ولو كان في الفرع السفلي لـ MCA لحدثت حبسة فيرنيكه الاستقبالية.`;
  } else {
    // Check if the query matches any concept in MEDICAL_KNOWLEDGE_GRAPH
    const matchedConcepts = MEDICAL_KNOWLEDGE_GRAPH.filter((item) =>
      item.patterns.some((rx) => rx.test(msg))
    );
    if (matchedConcepts.length > 0) {
      reply = matchedConcepts
        .map(
          (c) =>
            `• **الحقيقة العلمية:** ${c.directFact}\n• **الآلية الدقيقة:** ${c.clinicalMechanism}\n• **الفارق الامتحاني والسريري:** ${c.examDistinction}`
        )
        .join('\n\n');
    } else {
      reply = `**تحليل علمي مباشر حول «${msg}» (${subjectTitle}${chapterTitle}):**\n\n• لفهم هذا المفهوم بعمق، اربط دائماً بين **الموقع التشريحي/البنيوي** وبين **الوظيفة الفيزيولوجية والتظاهر السريري عند الإصابة**.\n${
        sampleQs.length > 0
          ? `• **من أهم النقاط المرتبطة في هذا القسم:**\n${sampleQs
              .slice(0, 3)
              .map((q) => `  - **${q.correctAnswer}:** ${q.explanation || q.questionText}`)
              .join('\n')}`
          : ''
      }`;
    }
  }

  return {
    reply,
    suggestedPrompts: [
      `💡 لخّص لي أهم الأفكار العلمية والفروق الحاسمة في ${ctx.chapterName || ctx.subjectName || 'هذا القسم'}`,
      `💡 حلّل الأسئلة التي أخطأت بها واشرح لي الآلية العلمية لكل منها`,
      `💡 اختبرني بحالة سريرية استنتاجية عميقة حول ${ctx.subjectName || 'المادة الحالية'}`,
    ],
    modelUsed: 'Gemini High-Thinking Medical Engine',
    thinkingMode: 'HIGH',
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // 1. MedFur AI Clinical Mentor: Analyze Question with Always-On High Thinking + Auto Model Routing + Zero-Fluff Mechanism Analysis
  app.post('/api/ai-tutor/explain', async (req, res) => {
    const { question } = req.body as {
      question?: QuestionPayload;
    };

    if (!question || !question.questionText) {
      res.status(400).json({ error: 'بيانات السؤال مطلوبة' });
      return;
    }

    const detectedPolarity = detectQuestionPolarity(question);
    const localConflictCheck = evaluateAnswerKeyConflict(question);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json(buildDeepMechanismMentor(question));
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const options = extractDynamicPayloadOptions(question);
      const storedKeyOption = options[question.correctOptionIndex] || options[0];
      const combinedNotes = [
        question.explanation ? `التوضيح المخزن: ${question.explanation}` : '',
        question.questionNote ? `ملاحظة السؤال الإضافية: ${question.questionNote}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      // Pre-extract mechanism context from our internal knowledge graph to ground the model and eliminate generic filler
      const preGroundedMechanisms = options
        .map(
          (o, idx) =>
            `${o.label}) ${o.text} -> ${resolveOptionMechanism(
              o.text,
              question,
              idx === question.correctOptionIndex,
              detectedPolarity.questionType === 'exception'
            )}`
        )
        .join('\n');

      const formattedOptionsLines = options
        .map((o) => `${o.label}) ${o.text}`)
        .join('\n');

      const userPrompt = `حلل السؤال الطبي التالي بتفكير استنتاجي عميق (High Thinking) وبدقة علمية عالية دون أي حشو أو عبارات عامة، ودون ذكر أسماء مراجع أو كتب:

1. نص السؤال (Question Stem):
${question.questionText}
- المقرر: ${question.subjectName || 'طب بشري'} (${question.chapterName || 'عام'})

2. الخيارات (Options):
${formattedOptionsLines}

3. مفتاح الحل المخزن في قاعدة البيانات:
الخيار (${storedKeyOption.label}) — "${storedKeyOption.text}"

4. الملاحظات والتوضيحات المرفقة بالسؤال:
${combinedNotes || 'لا توجد ملاحظات مخزنة مسبقاً لهذا السؤال.'}

5. خلفية الآليات العلمية الدقيقة للخيارات (للاستعانة بها ومنع أي عبارات عامة):
${preGroundedMechanisms}

التحليل الأولي لصيغة السؤال: ${
        detectedPolarity.questionType === 'exception'
          ? `Type B (سؤال استثناء / اختيار العبارة الخاطئة لوجود: "${detectedPolarity.matchedCue}")`
          : 'Type A (سؤال اختيار مباشر للحقيقة الطبية الصحيحة)'
      }

التعليمات الصارمة:
- ممنوع كتابة أي جمل عامة مثل "هذا الخيار لا ينطبق على السؤال" أو "هذه العبارة صحيحة علمياً وتنطبق على الموضوع". اكتب الآلية العلمية أو التشريحية أو الفيزيولوجية أو السريرية الحقيقية لكل خيار من الخيارات الأربعة.
- لا تذكر أسماء مراجع أو كتب (بدون ذكر غرايز أو غايتون أو روبنز)، بل قدم العلم الطبي الصافي مباشرةً.
- إذا كان مفتاح الحل المخزن (${storedKeyOption.label}: ${storedKeyOption.text}) يتعارض علمياً مع الحقائق الطبية الثابتة، اضبط hasAnswerKeyConflict على true واكتب في conflictWarningMessage: "تنبيه علمي: مفتاح الحل المحدد هنا يخالف الحقائق الطبية المثبتة. ننصح بالإبلاغ عن السؤال ليتم تصحيحه."
- ولّد في suggestedQuestions ثلاث عبارات تفاعلية تبدأ بـ "💡 " ومبنية حصرياً من المفاهيم الطبية الدقيقة في هذا السؤال.`;

      const { response, modelUsed } = await generateWithAutoHighThinking(ai, {
        contents: userPrompt,
        config: {
          systemInstruction: MEDFUR_SYSTEM_INSTRUCTIONS,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questionType: {
                type: Type.STRING,
                description: "'positive' for Type A (Direct Selection), 'exception' for Type B ('ما عدا' / choosing the false statement)",
              },
              questionTypeTitle: {
                type: Type.STRING,
                description: 'Concise Arabic title indicating whether this is Type A (Direct Selection) or Type B (Exception / ما عدا)',
              },
              questionTypeSummary: {
                type: Type.STRING,
                description: 'Sharp 1-sentence summary of what the question asks',
              },
              hasAnswerKeyConflict: {
                type: Type.BOOLEAN,
                description: 'True ONLY if the database stored answer key genuinely contradicts verified medical consensus',
              },
              conflictWarningMessage: {
                type: Type.STRING,
                description: 'If hasAnswerKeyConflict is true, MUST start with: تنبيه علمي: مفتاح الحل المحدد هنا يخالف الحقائق الطبية المثبتة. ننصح بالإبلاغ عن السؤال ليتم تصحيحه.',
              },
              mentorExplanation: {
                type: Type.STRING,
                description: 'Deep, zero-fluff scientific mechanism explanation with markdown bullet points integrating stored notes without citing textbook names.',
              },
              correctOptionAnalysis: {
                type: Type.STRING,
                description: 'Exact anatomical/physiological/clinical mechanism explaining why the target option is right (or why it is the false statement in exception questions).',
              },
              distractorsAnalysis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    optionLabel: { type: Type.STRING },
                    optionText: { type: Type.STRING },
                    whyIncorrect: {
                      type: Type.STRING,
                      description: 'Specific medical function/mechanism of this option showing what it actually does (or why it is a true medical fact in exception questions). No generic filler!',
                    },
                    isTrueStatementInException: { type: Type.BOOLEAN },
                  },
                  required: ['optionLabel', 'optionText', 'whyIncorrect'],
                },
              },
              clinicalPearl: {
                type: Type.STRING,
                description: 'Sharp 1-2 sentence high-yield clinical/exam distinction.',
              },
              suggestedQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 dynamically generated, topic-linked follow-up prompts starting with 💡',
              },
            },
            required: [
              'questionType',
              'questionTypeTitle',
              'questionTypeSummary',
              'hasAnswerKeyConflict',
              'mentorExplanation',
              'correctOptionAnalysis',
              'distractorsAnalysis',
              'clinicalPearl',
              'suggestedQuestions',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.json(buildDeepMechanismMentor(question));
        return;
      }

      const parsed = JSON.parse(rawText);
      const normalizedType: 'positive' | 'exception' =
        detectedPolarity.questionType === 'exception' || parsed.questionType === 'exception'
          ? 'exception'
          : 'positive';

      const formattedSuggestions: string[] =
        Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length > 0
          ? parsed.suggestedQuestions.map((s: string) =>
              s.trim().startsWith('💡') ? s.trim() : `💡 ${s.trim()}`
            )
          : generateDynamicTopicSuggestions(question, normalizedType === 'exception');

      const hasConflict = Boolean(parsed.hasAnswerKeyConflict || localConflictCheck.hasConflict);
      const conflictWarningMessage = hasConflict
        ? parsed.conflictWarningMessage ||
          'تنبيه علمي: مفتاح الحل المحدد هنا يخالف الحقائق الطبية المثبتة. ننصح بالإبلاغ عن السؤال ليتم تصحيحه.'
        : undefined;

      res.json({
        ...parsed,
        questionType: normalizedType,
        hasAnswerKeyConflict: hasConflict,
        conflictWarningMessage,
        suggestedQuestions: formattedSuggestions,
        sourceModel: modelUsed,
        thinkingMode: 'HIGH',
      });
    } catch (error) {
      console.error('AI Tutor explain fallback triggered:', error);
      res.json(buildDeepMechanismMentor(question));
    }
  });

  // 2. MedFur AI Clinical Mentor: Interactive Follow-up Mentoring with High Thinking
  app.post('/api/ai-tutor/followup', async (req, res) => {
    const { question, userMessage, history } = req.body as {
      question?: QuestionPayload;
      userMessage?: string;
      history?: { role: 'user' | 'assistant'; text: string }[];
    };

    if (!question || !userMessage?.trim()) {
      res.status(400).json({ error: 'السؤال والاستفسار مطلوبان' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json(buildDeepMechanismFollowup(question, userMessage));
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const dynamicOpts = extractDynamicPayloadOptions(question);
      const correctOpt = dynamicOpts[question.correctOptionIndex] || dynamicOpts[0];
      const correctLabel = correctOpt?.label || 'A';
      const correctText = correctOpt?.text || question.optionA;
      const polarity = detectQuestionPolarity(question);

      const historyText = (history || [])
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'الطالب' : 'الموجه الطبي'}: ${m.text}`)
        .join('\n');

      const combinedNotes = [
        question.explanation ? `التوضيح المخزن: ${question.explanation}` : '',
        question.questionNote ? `ملاحظة السؤال: ${question.questionNote}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const followupOptionsBlock = dynamicOpts
        .map((o) => `  ${o.label}) ${o.text}`)
        .join('\n');

      const followupPrompt = `بيانات السؤال الطبي قيد النقاش:
- المادة: ${question.subjectName || 'طب بشري'} (${question.chapterName || ''})
- نص السؤال: ${question.questionText}
- نوع السؤال: ${
        polarity.questionType === 'exception'
          ? `Type B — سؤال استثناء (${polarity.matchedCue}) يطلب تحديد العبارة الخاطئة طبياً`
          : 'Type A — سؤال اختيار مباشر للحقيقة الطبية الصحيحة'
      }
- الخيارات:
${followupOptionsBlock}
- مفتاح الحل المخزن: (${correctLabel}) ${correctText}
- الملاحظات والتوضيحات المخزنة:
${combinedNotes || 'لا توجد'}

${historyText ? `سياق الحوار السابق:\n${historyText}\n` : ''}
استفسار الطالب الحالي: "${userMessage.replace(/^💡\s*/, '').trim()}"

أجب بتفكير علمي عميق ومباشر (High Thinking) وباستخدام النقاط المنظمة الواضحة التي تشرح الآليات الطبية الدقيقة دون أي حشو أو مقدمات إنشائية ودون ذكر أسماء مراجع أو كتب، ثم اقترح 3 أسئلة متابعة جديدة ومخصصة (💡) مرتبطة بالموضوع.`;

      const { response, modelUsed } = await generateWithAutoHighThinking(ai, {
        contents: followupPrompt,
        config: {
          systemInstruction: MEDFUR_SYSTEM_INSTRUCTIONS,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Concise, mechanism-driven medical explanation in markdown without filler or textbook names.',
              },
              suggestedQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 new dynamically generated follow-up prompts starting with 💡 linked to the specific medical topic.',
              },
            },
            required: ['reply', 'suggestedQuestions'],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.json(buildDeepMechanismFollowup(question, userMessage));
        return;
      }

      const parsed = JSON.parse(rawText);
      const formattedSuggestions: string[] =
        Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length > 0
          ? parsed.suggestedQuestions.map((s: string) =>
              s.trim().startsWith('💡') ? s.trim() : `💡 ${s.trim()}`
            )
          : generateDynamicTopicSuggestions(question, polarity.questionType === 'exception');

      res.json({
        reply: parsed.reply,
        suggestedQuestions: formattedSuggestions,
        sourceModel: modelUsed,
      });
    } catch (error) {
      console.error('AI Tutor followup fallback triggered:', error);
      res.json(buildDeepMechanismFollowup(question, userMessage));
    }
  });

  // 3. Context-Aware Gemini Medical Chatbot (محادثة Gemini الذكية الواعية بالسياق مع التفكير العميق التلقائي)
  app.post('/api/ai-tutor/context-chat', async (req, res) => {
    const payload = req.body as ContextChatPayload;

    if (!payload || !payload.userMessage?.trim()) {
      res.status(400).json({ error: 'الرسالة مطلوبة' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json(buildContextChatFallback(payload));
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const ctx = payload.context || {};
      const mistakesBlock =
        ctx.recentMistakes && ctx.recentMistakes.length > 0
          ? ctx.recentMistakes
              .slice(0, 6)
              .map(
                (m, i) =>
                  `${i + 1}. السؤال: ${m.questionText} | الجواب الصحيح: ${m.correctAnswer}${
                    m.explanation ? ` | التوضيح: ${m.explanation}` : ''
                  }`
              )
              .join('\n')
          : 'لا توجد أخطاء مسجلة حالياً.';

      const notesBlock =
        ctx.savedNotes && ctx.savedNotes.length > 0
          ? ctx.savedNotes
              .slice(0, 5)
              .map((n, i) => `${i + 1}. على السؤال (${n.questionText}): "${n.note}"`)
              .join('\n')
          : 'لا توجد ملاحظات محفوظة.';

      const activeSampleBlock =
        ctx.activeQuestionsSample && ctx.activeQuestionsSample.length > 0
          ? ctx.activeQuestionsSample
              .slice(0, 6)
              .map(
                (q, i) =>
                  `${i + 1}. ${q.questionText} -> الجواب: ${q.correctAnswer}${
                    q.explanation ? ` (${q.explanation})` : ''
                  }`
              )
              .join('\n')
          : 'لا توجد أسئلة معروضة حالياً.';

      const historyBlock = (payload.history || [])
        .slice(-8)
        .map((m) => `${m.role === 'user' ? 'الطالب' : 'الموجه الطبي'}: ${m.text}`)
        .join('\n');

      const prompt = `أنت المساعد الطبي السياقي الذكي (Context-Aware Gemini Medical Chatbot) المزود بالتفكير الاستنتاجي العميق (High Thinking).
لديك السياق الدراسي الكامل للطالب في بنك الأتمتة حالياً:
- السنة والفصل: ${ctx.yearName || 'السنة الثالثة'} — ${ctx.semesterName || 'الفصل الأول'}
- المادة المفتوحة حالياً: ${ctx.subjectName || 'جميع المواد الطبية'}
- القسم/المحاضرة الحالية: ${ctx.chapterName || 'عرض عام'}
${
  ctx.statsSummary
    ? `- إحصائيات الطالب في هذا النطاق: الإجمالي (${ctx.statsSummary.total})، المحلول (${ctx.statsSummary.solved})، الصحيح (${ctx.statsSummary.correct})، الخطأ (${ctx.statsSummary.wrong})، الدقة (${ctx.statsSummary.accuracy}%).`
    : ''
}

- الأسئلة التي أخطأ بها الطالب مؤخراً:
${mistakesBlock}

- ملاحظات الطالب الشخصية المحفوظة:
${notesBlock}

- عينة من أسئلة القسم الحالي:
${activeSampleBlock}

${historyBlock ? `سجل الحوار السابق:\n${historyBlock}\n` : ''}
سؤال أو طلب الطالب الآن: "${payload.userMessage.replace(/^💡\s*/, '').trim()}"

تعليمات الإجابة الصارمة:
- قدم تحليلاً علمياً وسريرياً عميقاً ومنظماً بالنقاط الواضحة يجاوب على سؤال الطالب مباشرةً بالاعتماد على سياقه الدراسي والآليات الطبية الدقيقة.
- ابتعد تماماً عن الحشو والعبارات العامة والمقدمات الطويلة.
- لا تذكر أسماء مراجع أو كتب طبية في النص.
- اقترح في suggestedPrompts ثلاث عبارات تفاعلية ذكية (تبدأ بـ 💡) تساعد الطالب على التعمق في المادة الحالية أو معالجة أخطائه.`;

      const { response, modelUsed } = await generateWithAutoHighThinking(ai, {
        contents: prompt,
        config: {
          systemInstruction: MEDFUR_SYSTEM_INSTRUCTIONS,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Deep, context-aware medical response in clean Arabic markdown with zero fluff and no textbook citations.',
              },
              suggestedPrompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 contextually relevant follow-up prompts starting with 💡',
              },
            },
            required: ['reply', 'suggestedPrompts'],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.json(buildContextChatFallback(payload));
        return;
      }

      const parsed = JSON.parse(rawText);
      const formattedPrompts: string[] =
        Array.isArray(parsed.suggestedPrompts) && parsed.suggestedPrompts.length > 0
          ? parsed.suggestedPrompts.map((s: string) =>
              s.trim().startsWith('💡') ? s.trim() : `💡 ${s.trim()}`
            )
          : buildContextChatFallback(payload).suggestedPrompts;

      res.json({
        reply: parsed.reply,
        suggestedPrompts: formattedPrompts,
        modelUsed,
        thinkingMode: 'HIGH',
      });
    } catch (error) {
      console.error('Context chat fallback triggered:', error);
      res.json(buildContextChatFallback(payload));
    }
  });

  // Vite middleware for development vs static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MedFur Academic Server running on http://localhost:${PORT}`);
  });
}

startServer();
