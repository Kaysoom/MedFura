import React from 'react';
import { SubjectItem } from '../../types';

export type MedicalIconKey =
  | 'Anatomy'
  | 'Neurology'
  | 'Cardiology'
  | 'Pulmonology'
  | 'Gastroenterology'
  | 'Nephrology'
  | 'Histology'
  | 'Physiology'
  | 'Biochemistry'
  | 'Genetics'
  | 'Microbiology'
  | 'Pharmacology'
  | 'Pathology'
  | 'Surgery'
  | 'Clinical'
  | 'Pediatrics'
  | 'Obstetrics'
  | 'Ophthalmology'
  | 'ENT'
  | 'Orthopedics'
  | 'Dermatology'
  | 'Hematology'
  | 'Oncology'
  | 'Endocrinology'
  | 'Radiology'
  | 'Emergency'
  | 'Psychiatry'
  | 'PublicHealth'
  | 'Forensics'
  | 'Physics'
  | 'Languages'
  | 'Embryology'
  | 'Immunology';

export interface MedicalIconMeta {
  key: MedicalIconKey;
  label: string;
  defaultColor: string;
}

export const MEDICAL_ICON_OPTIONS: MedicalIconMeta[] = [
  { key: 'Anatomy', label: 'التشريح البشري والعظام', defaultColor: '#F59E0B' },
  { key: 'Neurology', label: 'العصبية وعلوم الدماغ', defaultColor: '#8B5CF6' },
  { key: 'Cardiology', label: 'القلبية والأوعية الدموية', defaultColor: '#EF4444' },
  { key: 'Pulmonology', label: 'الصدرية والتنفسية (الرئتان)', defaultColor: '#06B6D4' },
  { key: 'Gastroenterology', label: 'الهضمية والكبد (المعدة)', defaultColor: '#F97316' },
  { key: 'Nephrology', label: 'الكلية والمسالك البولية', defaultColor: '#D97706' },
  { key: 'Histology', label: 'النسج والتشريح المرضي المجهري', defaultColor: '#EC4899' },
  { key: 'Physiology', label: 'الفيزيولوجيا والوظائف الحيوية', defaultColor: '#10B981' },
  { key: 'Biochemistry', label: 'الكيمياء الحيوية والسريرية', defaultColor: '#14B8A6' },
  { key: 'Genetics', label: 'الوراثة الطبية والبيولوجيا الجزيئية', defaultColor: '#A855F7' },
  { key: 'Microbiology', label: 'الأحياء الدقيقة والجراثيم والطفيليات', defaultColor: '#84CC16' },
  { key: 'Immunology', label: 'المناعة والمصول والدمويات', defaultColor: '#3B82F6' },
  { key: 'Pharmacology', label: 'علم الأدوية والعلاجات', defaultColor: '#0EA5E9' },
  { key: 'Pathology', label: 'علم الأمراض والأورام', defaultColor: '#F43F5E' },
  { key: 'Surgery', label: 'الجراحة والمهارات الجراحية', defaultColor: '#14B8A6' },
  { key: 'Clinical', label: 'الباطنة والمهارات السريرية (سماعة)', defaultColor: '#10B981' },
  { key: 'Pediatrics', label: 'طب الأطفال وحديثي الولادة', defaultColor: '#38BDF8' },
  { key: 'Obstetrics', label: 'التوليد وأمراض النساء', defaultColor: '#FB7185' },
  { key: 'Embryology', label: 'علم الجنين الطبي', defaultColor: '#F472B6' },
  { key: 'Ophthalmology', label: 'أمراض العين وجراحتها', defaultColor: '#2DD4BF' },
  { key: 'ENT', label: 'الأذن والأنف والحنجرة', defaultColor: '#FBBF24' },
  { key: 'Dermatology', label: 'الأمراض الجلدية والزهرية', defaultColor: '#FB923C' },
  { key: 'Hematology', label: 'أمراض الدم واللمف', defaultColor: '#E11D48' },
  { key: 'Endocrinology', label: 'الغدد الصم والاستقلاب', defaultColor: '#A78BFA' },
  { key: 'Radiology', label: 'الأشعة والتصوير الطبي', defaultColor: '#60A5FA' },
  { key: 'Emergency', label: 'التخدير والإنعاش والطوارئ', defaultColor: '#F87171' },
  { key: 'Psychiatry', label: 'الطب النفسي والعلوم السلوكية', defaultColor: '#C084FC' },
  { key: 'PublicHealth', label: 'الصحة العامة والإحصاء والوبائيات', defaultColor: '#34D399' },
  { key: 'Forensics', label: 'الطب الشرعي وأخلاقيات المهنة', defaultColor: '#94A3B8' },
  { key: 'Physics', label: 'الفيزياء الطبية الحيوية', defaultColor: '#38BDF8' },
  { key: 'Languages', label: 'اللغات والمصطلحات الطبية', defaultColor: '#818CF8' },
];

/**
 * Resolves the most accurate medical icon key based on explicit icon choice or Arabic subject name/department.
 */
export function resolveSubjectMedicalIcon(
  subject: Pick<SubjectItem, 'name' | 'department' | 'icon' | 'color'>
): { iconKey: MedicalIconKey; accentColor: string } {
  const rawIcon = (subject.icon || '').trim();
  const explicitMatch = MEDICAL_ICON_OPTIONS.find((o) => o.key === rawIcon);
  if (explicitMatch) {
    return {
      iconKey: explicitMatch.key,
      accentColor: subject.color || explicitMatch.defaultColor,
    };
  }

  const text = `${subject.name || ''} ${subject.department || ''}`.toLowerCase();

  const matchRule = (keywords: string[], key: MedicalIconKey): { iconKey: MedicalIconKey; accentColor: string } | null => {
    if (keywords.some((kw) => text.includes(kw))) {
      const meta = MEDICAL_ICON_OPTIONS.find((m) => m.key === key)!;
      return {
        iconKey: key,
        accentColor: subject.color || meta.defaultColor,
      };
    }
    return null;
  };

  return (
    // Subspecialties & Systems first for maximum specificity
    matchRule(['عصبي', 'أعصاب', 'دماغ', 'رأس وعنق'], 'Neurology') ||
    matchRule(['قلبي', 'قلب', 'أوعية', 'وعائ'], 'Cardiology') ||
    matchRule(['صدري', 'صدر', 'تنفسي', 'رئة', 'رئوي'], 'Pulmonology') ||
    matchRule(['هضمي', 'معدة', 'كبد', 'أمعاء', 'بطن'], 'Gastroenterology') ||
    matchRule(['كلي', 'كلية', 'بولي', 'مسالك'], 'Nephrology') ||
    matchRule(['غدد', 'غدي', 'هرمون', 'استقلاب', 'سكري'], 'Endocrinology') ||
    matchRule(['دموي', 'الدم', 'لمف'], 'Hematology') ||
    matchRule(['أورام', 'سرطان'], 'Pathology') ||
    matchRule(['عيني', 'عين', 'بصر'], 'Ophthalmology') ||
    matchRule(['أذني', 'أذن', 'حنجر', 'أنف'], 'ENT') ||
    matchRule(['جلدي', 'جلد', 'زهري'], 'Dermatology') ||
    matchRule(['أطفال', 'وليد', 'رضع'], 'Pediatrics') ||
    matchRule(['توليد', 'نسائي', 'حمل', 'رحم'], 'Obstetrics') ||
    matchRule(['جنين', 'أجنة'], 'Embryology') ||
    matchRule(['أشعة', 'شعاع', 'تصوير', 'مرنان', 'طبقي'], 'Radiology') ||
    matchRule(['تخدير', 'إنعاش', 'طوارئ', 'إسعاف', 'عناية'], 'Emergency') ||
    matchRule(['نفسي', 'سلوكي', 'تواصل'], 'Psychiatry') ||
    matchRule(['شرعي', 'أخلاقيات', 'قانون', 'تشريعات'], 'Forensics') ||
    matchRule(['إحصاء', 'وبائيات', 'صحة عامة', 'وقائي', 'بيئة', 'مجتمع', 'بحث علمي', 'منهجية'], 'PublicHealth') ||
    matchRule(['جراح', 'مشرط', 'عمليات'], 'Surgery') ||
    matchRule(['أدوية', 'دواء', 'فارما', 'مداواة', 'سموم'], 'Pharmacology') ||
    matchRule(['جراثيم', 'طفيليات', 'فيروس', 'فطور', 'أحياء دقيقة', 'خمجي', 'إنتان'], 'Microbiology') ||
    matchRule(['مناع', 'مصول', 'لقاح'], 'Immunology') ||
    matchRule(['وراثة', 'جين', 'بيولوجيا جزيئية', 'خلية'], 'Genetics') ||
    matchRule(['نسج', 'مجهري'], 'Histology') ||
    matchRule(['أمراض', 'باثولوجيا'], 'Pathology') ||
    matchRule(['تشريح', 'عظام', 'مفاصل', 'عضل', 'أطراف'], 'Anatomy') ||
    matchRule(['فيزيولوجيا', 'وظائف'], 'Physiology') ||
    matchRule(['كيمياء', 'حيوية'], 'Biochemistry') ||
    matchRule(['فيزياء', 'ليزر', 'إشعاع'], 'Physics') ||
    matchRule(['لغة', 'إنكليزي', 'عربي', 'فرنسي', 'مصطلحات', 'ثقافة'], 'Languages') ||
    matchRule(['سريري', 'باطن', 'داخلي', 'تشخيص', 'مقابلة'], 'Clinical') ||
    // Fallback to legacy icon string mapping if present
    (rawIcon === 'Bone' ? { iconKey: 'Anatomy', accentColor: subject.color || '#F59E0B' } : null) ||
    (rawIcon === 'Brain' ? { iconKey: 'Neurology', accentColor: subject.color || '#8B5CF6' } : null) ||
    (rawIcon === 'Heart' || rawIcon === 'HeartPulse' ? { iconKey: 'Cardiology', accentColor: subject.color || '#EF4444' } : null) ||
    (rawIcon === 'Wind' ? { iconKey: 'Pulmonology', accentColor: subject.color || '#06B6D4' } : null) ||
    (rawIcon === 'Microscope' ? { iconKey: 'Histology', accentColor: subject.color || '#EC4899' } : null) ||
    (rawIcon === 'Activity' ? { iconKey: 'Physiology', accentColor: subject.color || '#10B981' } : null) ||
    (rawIcon === 'FlaskConical' ? { iconKey: 'Biochemistry', accentColor: subject.color || '#14B8A6' } : null) ||
    (rawIcon === 'Dna' ? { iconKey: 'Genetics', accentColor: subject.color || '#A855F7' } : null) ||
    (rawIcon === 'Bug' ? { iconKey: 'Microbiology', accentColor: subject.color || '#84CC16' } : null) ||
    (rawIcon === 'Pill' ? { iconKey: 'Pharmacology', accentColor: subject.color || '#0EA5E9' } : null) ||
    (rawIcon === 'Scissors' ? { iconKey: 'Surgery', accentColor: subject.color || '#14B8A6' } : null) ||
    (rawIcon === 'Eye' ? { iconKey: 'Ophthalmology', accentColor: subject.color || '#2DD4BF' } : null) ||
    (rawIcon === 'Baby' ? { iconKey: 'Pediatrics', accentColor: subject.color || '#38BDF8' } : null) ||
    (rawIcon === 'Droplet' ? { iconKey: 'Hematology', accentColor: subject.color || '#E11D48' } : null) ||
    (rawIcon === 'Radio' ? { iconKey: 'Radiology', accentColor: subject.color || '#60A5FA' } : null) ||
    (rawIcon === 'Atom' ? { iconKey: 'Physics', accentColor: subject.color || '#38BDF8' } : null) ||
    (rawIcon === 'Languages' || rawIcon === 'Globe' ? { iconKey: 'Languages', accentColor: subject.color || '#818CF8' } : null) || {
      iconKey: 'Clinical',
      accentColor: subject.color || '#10B981',
    }
  );
}

interface SubjectMedicalIconProps {
  subject: Pick<SubjectItem, 'name' | 'department' | 'icon' | 'color'>;
  className?: string;
}

/**
 * Minimalist, high-precision medical vector icons designed specifically for medical school subjects.
 */
export const SubjectMedicalIcon: React.FC<SubjectMedicalIconProps> = ({
  subject,
  className = 'w-5 h-5',
}) => {
  const { iconKey } = resolveSubjectMedicalIcon(subject);

  const svgProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.85,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };

  switch (iconKey) {
    case 'Anatomy':
    case 'Orthopedics':
      // Clean Anatomical Bone / Joint Vector
      return (
        <svg {...svgProps}>
          <path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z" />
        </svg>
      );

    case 'Neurology':
      // Minimalist Human Brain Hemispheres & Gyri
      return (
        <svg {...svgProps}>
          <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
          <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
          <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
        </svg>
      );

    case 'Cardiology':
      // Medical Heart with ECG Pulse Line
      return (
        <svg {...svgProps}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <path d="M3.22 12H9.5l1.5-3 2 4.5 1.5-1.5h4.28" />
        </svg>
      );

    case 'Pulmonology':
      // Minimalist Anatomical Lungs & Bronchi
      return (
        <svg {...svgProps}>
          <path d="M12 3v7" />
          <path d="M12 10l-3 2.5" />
          <path d="M12 10l3 2.5" />
          <path d="M8.5 7C5.5 7 3 10.5 3 15.5 3 18.5 5 20 7.5 20c2 0 3-.8 3-2.8V9.5C10.5 8 9.7 7 8.5 7Z" />
          <path d="M15.5 7c3 0 5.5 3.5 5.5 8.5 0 3-2 4.5-4.5 4.5-2 0-3-.8-3-2.8V9.5c0-1.5.8-2.5 2-2.5Z" />
        </svg>
      );

    case 'Gastroenterology':
      // Minimalist Anatomical Stomach / GI Tract
      return (
        <svg {...svgProps}>
          <path d="M10 3v3.5c0 1.2-.8 2.2-1.8 2.8C5.8 10.8 4.5 13 5 15.8c.5 2.8 3 4.7 6 4.7 3.8 0 7.2-2.4 7.8-6.2.6-3.5-1.5-6.8-4.5-7.3-.9-.1-1.3-.8-1.3-1.7V3" />
          <path d="M8.5 14c1 1.5 3 2 5 1.2" />
        </svg>
      );

    case 'Nephrology':
      // Minimalist Paired Kidneys / Renal Pelvis
      return (
        <svg {...svgProps}>
          <path d="M8 5C5.2 5 3 7.7 3 11.5S5.2 18 8 18c1.9 0 3-1.2 2.5-2.8-.3-1-.9-1.7-.9-3.7s.6-2.7.9-3.7C11 6.2 9.9 5 8 5Z" />
          <path d="M16 5c2.8 0 5 2.7 5 6.5S18.8 18 16 18c-1.9 0-3-1.2-2.5-2.8.3-1 .9-1.7.9-3.7s-.6-2.7-.9-3.7C13 6.2 14.1 5 16 5Z" />
          <path d="M10 11.5h4" />
          <path d="M12 11.5V21" />
        </svg>
      );

    case 'Histology':
      // Optical Medical Microscope
      return (
        <svg {...svgProps}>
          <path d="M6 18h8" />
          <path d="M3 22h18" />
          <path d="M14 22a7 7 0 1 0 0-14h-1" />
          <path d="M9 14h2" />
          <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
          <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
        </svg>
      );

    case 'Physiology':
      // Vital ECG / Action Potential Waveform
      return (
        <svg {...svgProps}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );

    case 'Biochemistry':
      // Conical Laboratory Flask with Molecular Bubbles
      return (
        <svg {...svgProps}>
          <path d="M10 2v6.3a2 2 0 0 1-.5 1.3L4.4 16a3 3 0 0 0 2.3 5h10.6a3 3 0 0 0 2.3-5l-5.1-6.4a2 2 0 0 1-.5-1.3V2" />
          <path d="M8.5 2h7" />
          <path d="M7 15h10" />
        </svg>
      );

    case 'Genetics':
      // Double Helix DNA Strand
      return (
        <svg {...svgProps}>
          <path d="M2 15c6.667-6 13.333 0 20-6" />
          <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
          <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
          <path d="m17 6-2.5-2.5" />
          <path d="m14 8-1-1" />
          <path d="m7 18 2.5 2.5" />
          <path d="m3.5 14.5.5.5" />
          <path d="m20 9 .5.5" />
          <path d="m6.5 12.5 1 1" />
          <path d="m16.5 10.5 1 1" />
          <path d="m10 16 1.5 1.5" />
        </svg>
      );

    case 'Microbiology':
      // Minimalist Virus / Bacteria Microorganism
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="5" />
          <circle cx="10.5" cy="11" r="1" />
          <circle cx="13.5" cy="13.5" r="1" />
          <path d="M12 2v5" />
          <path d="M10 2h4" />
          <path d="M12 17v5" />
          <path d="M10 22h4" />
          <path d="M2 12h5" />
          <path d="M2 10v4" />
          <path d="M17 12h5" />
          <path d="M22 10v4" />
          <path d="m4.9 4.9 3.5 3.5" />
          <path d="m15.6 15.6 3.5 3.5" />
          <path d="m19.1 4.9-3.5 3.5" />
          <path d="m8.4 15.6-3.5 3.5" />
        </svg>
      );

    case 'Immunology':
      // Medical Shield with Antibody / Cross
      return (
        <svg {...svgProps}>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="M12 9v6" />
          <path d="M9 12h6" />
        </svg>
      );

    case 'Pharmacology':
      // Capsule Pill Icon
      return (
        <svg {...svgProps}>
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      );

    case 'Pathology':
    case 'Oncology':
      // Cellular Pathology / Target Lesion Analysis
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="10.5" cy="10.5" r="3" />
          <circle cx="15" cy="14.5" r="1.5" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
        </svg>
      );

    case 'Surgery':
      // Surgical Scalpel & Precision Suture Line
      return (
        <svg {...svgProps}>
          <path d="M18.5 3.5a2.12 2.12 0 0 1 3 3L11 17l-4 1 1-4Z" />
          <path d="m15 7 3 3" />
          <path d="M3 21c2.5-2.5 5-3 8-3" />
        </svg>
      );

    case 'Clinical':
      // Classic Clinical Stethoscope
      return (
        <svg {...svgProps}>
          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
          <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
          <circle cx="20" cy="10" r="2" />
        </svg>
      );

    case 'Pediatrics':
      // Pediatric Care / Infant Icon
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 12h.01" />
          <path d="M15 12h.01" />
          <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
          <path d="M12 3a2 2 0 0 1 2 2c0 .7-.4 1.4-1 1.7" />
        </svg>
      );

    case 'Obstetrics':
      // Minimalist Uterus & Fallopian Tubes Vector
      return (
        <svg {...svgProps}>
          <path d="M8 8c0 4 2 7.5 4 11 2-3.5 4-7 4-11a4 4 0 0 0-8 0Z" />
          <path d="M8 7C5 6.5 3 8 3 10.5a2 2 0 0 0 3.5 1.3" />
          <path d="M16 7c3-.5 5 1 5 3.5a2 2 0 0 1-3.5 1.3" />
          <path d="M12 19v3" />
        </svg>
      );

    case 'Embryology':
      // Embryo / Gestational Sac Minimalist Vector
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M13.5 7.5a2.5 2.5 0 1 0-2.5 2.5c2 0 3.5 1.5 3.5 3.5a3 3 0 0 1-5 2.2" />
        </svg>
      );

    case 'Ophthalmology':
      // Detailed Medical Eye & Iris
      return (
        <svg {...svgProps}>
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );

    case 'ENT':
      // Minimalist Human Ear & Cochlea
      return (
        <svg {...svgProps}>
          <path d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 1 1-7 0" />
          <path d="M15 8.5a2.5 2.5 0 0 0-5 0v1a2 2 0 1 1 0 4" />
        </svg>
      );

    case 'Dermatology':
      // Epidermal / Dermal Layers & Hair Follicle
      return (
        <svg {...svgProps}>
          <path d="M3 9c3-1.5 6 1.5 9 0s6-1.5 9 0" />
          <path d="M3 14c3-1.5 6 1.5 9 0s6-1.5 9 0" />
          <path d="M3 19h18" />
          <path d="M12 3c0 4-1.5 7-1.5 11a1.5 1.5 0 0 0 3 0" />
        </svg>
      );

    case 'Hematology':
      // Blood Drop & Erythrocyte
      return (
        <svg {...svgProps}>
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
          <path d="M9.5 15.5a2.5 2.5 0 0 0 3 2" />
        </svg>
      );

    case 'Endocrinology':
      // Thyroid Butterfly Gland & Hormone Axis
      return (
        <svg {...svgProps}>
          <path d="M12 8v8" />
          <path d="M12 9C9.5 6 5 6.5 5 11.5S9.5 17 12 14" />
          <path d="M12 9c2.5-3 7-2.5 7 2.5S14.5 17 12 14" />
          <circle cx="12" cy="4" r="1.5" />
        </svg>
      );

    case 'Radiology':
      // Chest X-Ray / Ribcage Scan Frame
      return (
        <svg {...svgProps}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M12 6v12" />
          <path d="M8 9c1.5-.5 2.5-.5 4 0 1.5-.5 2.5-.5 4 0" />
          <path d="M7.5 12.5c1.8-.5 2.7-.5 4.5 0 1.8-.5 2.7-.5 4.5 0" />
          <path d="M8.5 16c1.2-.4 2.3-.4 3.5 0 1.2-.4 2.3-.4 3.5 0" />
        </svg>
      );

    case 'Emergency':
      // Medical Syringe / Anesthesia & Resuscitation
      return (
        <svg {...svgProps}>
          <path d="m18 2 4 4" />
          <path d="m17 7 3-3" />
          <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
          <path d="m9 11 4 4" />
          <path d="m5 19-3 3" />
          <path d="m14 4 6 6" />
        </svg>
      );

    case 'Psychiatry':
      // Mind / Cognitive Care Profile
      return (
        <svg {...svgProps}>
          <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0 .44 4.96v4a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4a2.5 2.5 0 0 0 .44-4.96 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 12 4.5Z" />
          <path d="M12 8v5" />
          <path d="M9.5 10.5h5" />
        </svg>
      );

    case 'PublicHealth':
      // Epidemiology / Biostatistics Analytics & Cross
      return (
        <svg {...svgProps}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
          <circle cx="19" cy="9" r="1.5" />
        </svg>
      );

    case 'Forensics':
      // Medical Ethics & Forensic Balance Scale
      return (
        <svg {...svgProps}>
          <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
          <path d="M7 21h10" />
          <path d="M12 3v18" />
          <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </svg>
      );

    case 'Physics':
      // Medical Biophysics Atom / Orbitals
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="1.5" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(150 12 12)" />
        </svg>
      );

    case 'Languages':
      // Medical Terminology / Global Languages
      return (
        <svg {...svgProps}>
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
      );
  }
};
