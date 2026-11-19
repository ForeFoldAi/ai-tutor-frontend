import type {
  ClassOverviewItem,
  CurriculumItem,
  SubjectItem,
  SubjectMappingOption,
  TextbookUploadRow,
} from "@/modules/organization/types/classes-admin";

export const DEMO_CLASS_OVERVIEW: ClassOverviewItem[] = [
  {
    id: "6-a",
    grade: "6",
    section: "A",
    students: 42,
    teachers: 3,
    curriculums: ["CBSE", "ICSE"],
    iconClassName: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "7-b",
    grade: "7",
    section: "B",
    students: 38,
    teachers: 4,
    curriculums: ["CBSE", "State Board", "IB"],
    iconClassName: "bg-violet-100 text-violet-600",
  },
  {
    id: "6-b",
    grade: "6",
    section: "B",
    students: 36,
    teachers: 2,
    curriculums: ["CBSE"],
    iconClassName: "bg-sky-100 text-sky-600",
  },
  {
    id: "8-a",
    grade: "8",
    section: "A",
    students: 40,
    teachers: 3,
    curriculums: ["ICSE", "IGCSE"],
    iconClassName: "bg-amber-100 text-amber-600",
  },
];

export const DEMO_CURRICULUMS: CurriculumItem[] = [
  { id: "cbse", name: "CBSE", grades: "1–12", subjectsCount: 8 },
  { id: "icse", name: "ICSE", grades: "1–10", subjectsCount: 7 },
  { id: "state", name: "State Board", grades: "1–12", subjectsCount: 6 },
  { id: "ib", name: "IB", grades: "6–12", subjectsCount: 5 },
  { id: "igcse", name: "IGCSE", grades: "6–10", subjectsCount: 5 },
];

export const DEMO_SUBJECTS: SubjectItem[] = [
  { id: "1", name: "Mathematics", code: "MATH", curriculums: ["CBSE", "ICSE", "IB", "IGCSE"], gradeRange: "1-10", active: true },
  { id: "2", name: "Science", code: "SCI", curriculums: ["CBSE", "ICSE", "State Board"], gradeRange: "3-10", active: true },
  { id: "3", name: "English", code: "ENG", curriculums: ["All Curriculums"], gradeRange: "1-10", active: true },
  { id: "4", name: "Social Studies", code: "SS", curriculums: ["CBSE", "ICSE"], gradeRange: "4-10", active: true },
  { id: "5", name: "Computer Science", code: "CS", curriculums: ["CBSE", "ICSE", "IB"], gradeRange: "6-12", active: true },
  { id: "6", name: "Physics", code: "PHY", curriculums: ["CBSE", "State Board"], gradeRange: "9-12", active: true },
  { id: "7", name: "Chemistry", code: "CHEM", curriculums: ["CBSE", "ICSE"], gradeRange: "9-12", active: true },
  { id: "8", name: "Biology", code: "BIO", curriculums: ["CBSE", "ICSE", "State Board"], gradeRange: "9-12", active: true },
];

export const DEMO_CBSE_SUBJECT_MAPPING: SubjectMappingOption[] = [
  { id: "math", name: "Mathematics", mapped: true },
  { id: "sci", name: "Science", mapped: true },
  { id: "eng", name: "English", mapped: true },
  { id: "ss", name: "Social Studies", mapped: true },
  { id: "cs", name: "Computer Science", mapped: true },
  { id: "hin", name: "Hindi", mapped: true },
  { id: "san", name: "Sanskrit", mapped: true },
  { id: "pe", name: "Physical Education", mapped: true },
];

export const DEMO_TEXTBOOK_UPLOADS: TextbookUploadRow[] = [
  {
    id: "tb-1",
    fileName: "cbse-grade6-math-ch1.pdf",
    classLabel: "Grade 6 · Section A · CBSE",
    subjectName: "Mathematics",
    curriculum: "CBSE",
    grade: "6",
    section: "A",
    contentType: "Chapter",
    chapter: "Chapter 1",
    chapterName: "Introduction to Whole Numbers",
    uploadedAt: "May 2, 2026",
    status: "Embedded",
  },
  {
    id: "tb-2",
    fileName: "cbse-grade6-science-unit2.docx",
    classLabel: "Grade 6 · Section B · CBSE",
    subjectName: "Science",
    curriculum: "CBSE",
    grade: "6",
    section: "B",
    contentType: "Unit",
    chapter: null,
    chapterName: null,
    uploadedAt: "May 4, 2026",
    status: "Processing",
  },
];
