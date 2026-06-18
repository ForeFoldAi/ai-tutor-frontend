import type { StudentSubjectApi } from "@/api/types";

export const studentSubjects: StudentSubjectApi[] = [
  {
    id: "subj-1",
    board: "CBSE",
    class_level: "CLASS_9",
    subject_name: "Mathematics",
    chapters: [
      { id: "ch-1", chapter: "Number Systems", file_name: "ncert-math-class9-ch1.pdf" },
      { id: "ch-2", chapter: "Polynomials", file_name: "ncert-math-class9-ch2.pdf" },
      { id: "ch-3", chapter: "Coordinate Geometry", file_name: "ncert-math-class9-ch3.pdf" },
    ],
  },
  {
    id: "subj-2",
    board: "CBSE",
    class_level: "CLASS_9",
    subject_name: "Science",
    chapters: [
      { id: "ch-4", chapter: "Matter in Our Surroundings", file_name: "ncert-science-class9-ch1.pdf" },
      { id: "ch-5", chapter: "Atoms and Molecules", file_name: "ncert-science-class9-ch3.pdf" },
    ],
  },
  {
    id: "subj-3",
    board: "CBSE",
    class_level: "CLASS_9",
    subject_name: "English",
    chapters: [
      { id: "ch-6", chapter: "The Fun They Had", file_name: "ncert-english-class9-ch1.pdf" },
      { id: "ch-7", chapter: "The Sound of Music", file_name: "ncert-english-class9-ch2.pdf" },
    ],
  },
];
