import type {
  GeneratedLessonPlan,
  LessonPlanFormValues,
  SavedLessonPlan,
} from "@/modules/tutor/types/lesson-planner";

export const DEFAULT_LESSON_FORM: LessonPlanFormValues = {
  subject: "",
  grade: "",
  sections: [],
  chapter: "",
  topics: [],
  customTopics: "",
  pptTemplate: "clean_academic",
  pptSlideCount: "12",
  duration: "",
  learningObjectives: "",
  prepareOptions: {
    "complete-lesson-plan": false,
    "teaching-notes": false,
    "step-by-step": false,
    "real-life-examples": false,
    "practice-worksheet": false,
    "quiz-questions": false,
    homework: false,
    "ppt-outline": false,
    "student-doubt-questions": false,
    "remedial-plan": false,
  },
};

export const DEMO_GENERATED_PLAN: GeneratedLessonPlan = {
  phases: [
    {
      title: "Introduction",
      duration: "5 min",
      description: "Engage students with a quick real-life example of fractions.",
    },
    {
      title: "Concept Explanation",
      duration: "15 min",
      description: "Define fractions, numerator, denominator and equivalent fractions.",
    },
    {
      title: "Guided Examples",
      duration: "10 min",
      description: "Solve examples together with class participation.",
    },
    {
      title: "Practice Activity",
      duration: "10 min",
      description: "Students solve worksheet problems in class (pair/group).",
    },
    {
      title: "Quick Quiz",
      duration: "5 min",
      description: "Short quiz to check understanding.",
    },
  ],
  teachingNotes: {
    overview:
      "Use fraction strips and number lines. Emphasize that equivalent fractions represent the same value.",
    keyPoints: [
      "Define numerator and denominator using visual models",
      "Show equivalent fractions on a number line",
      "Compare fractions with the same denominator first, then unlike denominators",
    ],
    materials: ["Fraction strips", "Number line chart", "Whiteboard markers", "Practice handouts"],
    tips: [
      "Ask students to explain answers in their own words",
      "Use pair-share before whole-class discussion",
      "Pause after each example to check for understanding",
    ],
  },
  examples: [
    {
      title: "Pizza Slices",
      scenario: "A pizza is cut into 8 equal slices. You eat 3 slices.",
      explanation: "You ate 3/8 of the pizza. The denominator (8) is the total equal parts.",
    },
    {
      title: "Measuring Cups",
      scenario: "A recipe needs 1/2 cup of flour, but you only have a 1/4 cup measure.",
      explanation: "Pour twice to get 1/2 cup — two quarters equal one half (2/4 = 1/2).",
    },
    {
      title: "Sharing Chocolate",
      scenario: "4 friends share 1 chocolate bar equally.",
      explanation: "Each friend gets 1/4 of the bar. Four equal parts make a whole.",
    },
  ],
  worksheet: [
    {
      number: 1,
      question: "Shade 3/4 of the rectangle below.",
      type: "short",
    },
    {
      number: 2,
      question: "Which fraction is greater: 2/5 or 3/5?",
      type: "mcq",
      options: ["2/5", "3/5", "They are equal"],
    },
    {
      number: 3,
      question: "Write two equivalent fractions for 1/2.",
      type: "short",
    },
    {
      number: 4,
      question: "Add: 1/6 + 2/6 = ?",
      type: "mcq",
      options: ["2/6", "3/6", "3/12", "1/3"],
    },
    {
      number: 5,
      question: "Place 3/8 on the number line between 0 and 1.",
      type: "short",
    },
  ],
  quiz: [
    {
      number: 1,
      question: "What does the denominator tell us?",
      type: "mcq",
      options: ["Parts we have", "Total equal parts", "The whole number", "How to add"],
    },
    {
      number: 2,
      question: "Which is equivalent to 2/4?",
      type: "mcq",
      options: ["1/3", "1/2", "2/3", "3/4"],
    },
    {
      number: 3,
      question: "Compare: 5/8 ___ 3/8",
      type: "mcq",
      options: [">", "<", "="],
    },
    {
      number: 4,
      question: "Explain why 4/8 and 1/2 are the same value.",
      type: "short",
    },
  ],
  homework: [
    {
      title: "Worksheet Sections 1–3",
      description: "Complete problems on equivalent fractions and comparison.",
      estimatedMinutes: 20,
    },
    {
      title: "Real-life Fraction",
      description: "Write one real-life example where you used or saw fractions today.",
      estimatedMinutes: 10,
    },
    {
      title: "Review Notes",
      description: "Re-read today's teaching notes and highlight one key idea to discuss next class.",
      estimatedMinutes: 5,
    },
  ],
  pptOutline: [
    {
      number: 1,
      title: "Fractions — Basic Concepts",
      bullets: ["Grade 6 · Mathematics", "Chapter: Fractions", "45-minute lesson"],
    },
    {
      number: 2,
      title: "What is a Fraction?",
      bullets: ["Numerator and denominator", "Parts of a whole", "Visual models"],
    },
    {
      number: 3,
      title: "Real-life Examples",
      bullets: ["Pizza slices", "Measuring cups", "Sharing equally"],
    },
    {
      number: 4,
      title: "Guided Practice",
      bullets: ["Equivalent fractions", "Compare fractions", "Class activity"],
    },
    {
      number: 5,
      title: "Summary & Homework",
      bullets: ["Key takeaways", "Worksheet assignment", "Next lesson preview"],
    },
  ],
};

export const DEMO_SAVED_LESSON_PLANS: SavedLessonPlan[] = [
  {
    id: "1",
    title: "Fractions - Basic Concepts",
    subject: "Mathematics",
    grade: "Grade 6",
    chapter: "Fractions",
    lastUpdated: "May 11, 2024",
  },
  {
    id: "2",
    title: "Algebra - Linear Equations",
    subject: "Mathematics",
    grade: "Grade 7",
    chapter: "Algebra",
    lastUpdated: "May 8, 2024",
  },
  {
    id: "3",
    title: "Decimals - Operations",
    subject: "Mathematics",
    grade: "Grade 6",
    chapter: "Decimals",
    lastUpdated: "May 7, 2024",
  },
  {
    id: "4",
    title: "Geometry - Angles",
    subject: "Mathematics",
    grade: "Grade 7",
    chapter: "Geometry",
    lastUpdated: "May 5, 2024",
  },
  {
    id: "5",
    title: "Word Problems - Ratios",
    subject: "Mathematics",
    grade: "Grade 6",
    chapter: "Ratios",
    lastUpdated: "May 3, 2024",
  },
  {
    id: "6",
    title: "Fractions - Comparison",
    subject: "Mathematics",
    grade: "Grade 6",
    chapter: "Fractions",
    lastUpdated: "May 1, 2024",
  },
  {
    id: "7",
    title: "Algebra - Expressions",
    subject: "Mathematics",
    grade: "Grade 7",
    chapter: "Algebra",
    lastUpdated: "Apr 28, 2024",
  },
  {
    id: "8",
    title: "Decimals - Place Value",
    subject: "Mathematics",
    grade: "Grade 6",
    chapter: "Decimals",
    lastUpdated: "Apr 25, 2024",
  },
  {
    id: "9",
    title: "Fractions - Operations",
    subject: "Mathematics",
    grade: "Grade 6",
    chapter: "Fractions",
    lastUpdated: "Apr 22, 2024",
  },
  {
    id: "10",
    title: "Revision - Term 1",
    subject: "Mathematics",
    grade: "Grade 6",
    chapter: "Mixed",
    lastUpdated: "Apr 18, 2024",
  },
];
