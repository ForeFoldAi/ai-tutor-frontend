import type {
  AffectedStudent,
  QuickAction,
  SuggestedIntervention,
  WeakTopic,
} from "@/modules/tutor/types/ai-insights";

export const DEMO_WEAK_TOPICS: WeakTopic[] = [
  { topic: "Fractions", strugglePercent: 20 },
  { topic: "Word Problems", strugglePercent: 20 },
  { topic: "Algebra Equations", strugglePercent: 30 },
  { topic: "Decimals", strugglePercent: 30 },
  { topic: "Ratios", strugglePercent: 25 },
  { topic: "Percentages", strugglePercent: 28 },
  { topic: "Linear Graphs", strugglePercent: 35 },
  { topic: "Mixed Review", strugglePercent: 22 },
];

export const DEMO_WEAK_TOPICS_PREVIEW = DEMO_WEAK_TOPICS.slice(0, 4);

export const DEMO_AFFECTED_STUDENTS: AffectedStudent[] = [
  {
    id: "1",
    name: "Aarav Patel",
    grade: "7",
    topic: "Algebra",
    riskLevel: "High",
    avatarColor: "bg-sky-100 text-sky-700",
  },
  {
    id: "2",
    name: "Priya Reddy",
    grade: "8",
    topic: "Fractions",
    riskLevel: "High",
    avatarColor: "bg-violet-100 text-violet-700",
  },
  {
    id: "3",
    name: "Kiran Kumar",
    grade: "6",
    topic: "Word Problems",
    riskLevel: "Medium",
    avatarColor: "bg-amber-100 text-amber-700",
  },
  {
    id: "4",
    name: "Sneha Iyer",
    grade: "7",
    topic: "Word Problems",
    riskLevel: "Medium",
    avatarColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "5",
    name: "Meera Singh",
    grade: "8",
    topic: "Decimals",
    riskLevel: "Medium",
    avatarColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "6",
    name: "Rahul Sharma",
    grade: "7",
    topic: "Algebra",
    riskLevel: "High",
    avatarColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "7",
    name: "Ananya Desai",
    grade: "6",
    topic: "Fractions",
    riskLevel: "Medium",
    avatarColor: "bg-purple-100 text-purple-700",
  },
  {
    id: "8",
    name: "Vikram Nair",
    grade: "8",
    topic: "Word Problems",
    riskLevel: "Low",
    avatarColor: "bg-teal-100 text-teal-700",
  },
  {
    id: "9",
    name: "Isha Gupta",
    grade: "7",
    topic: "Decimals",
    riskLevel: "High",
    avatarColor: "bg-orange-100 text-orange-700",
  },
  {
    id: "10",
    name: "Arjun Mehta",
    grade: "6",
    topic: "Ratios",
    riskLevel: "Medium",
    avatarColor: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "11",
    name: "Neha Kapoor",
    grade: "8",
    topic: "Algebra",
    riskLevel: "Medium",
    avatarColor: "bg-pink-100 text-pink-700",
  },
  {
    id: "12",
    name: "Rohan Das",
    grade: "7",
    topic: "Fractions",
    riskLevel: "High",
    avatarColor: "bg-cyan-100 text-cyan-700",
  },
];

export const DEMO_AFFECTED_STUDENTS_PREVIEW = DEMO_AFFECTED_STUDENTS.slice(0, 5);

export const DEMO_SUGGESTED_INTERVENTIONS: SuggestedIntervention[] = [
  {
    id: "1",
    title: "Revision Session Needed",
    description: "Schedule a group session for Fractions",
    priority: "High",
    icon: "revision",
  },
  {
    id: "2",
    title: "Practice Quiz Recommended",
    description: "Create quiz on Fractions for 12 students",
    priority: "Medium",
    icon: "quiz",
  },
  {
    id: "3",
    title: "Personalized Worksheets",
    description: "Generate worksheets for Word Problems",
    priority: "Medium",
    icon: "worksheet",
  },
  {
    id: "4",
    title: "Concept Reinforcement",
    description: "Use real-life examples for Algebra",
    priority: "Low",
    icon: "concept",
  },
  {
    id: "5",
    title: "One-on-one Check-in",
    description: "Schedule follow-up with 3 high-risk students",
    priority: "High",
    icon: "revision",
  },
  {
    id: "6",
    title: "Homework Review",
    description: "Assign targeted homework for Decimals",
    priority: "Medium",
    icon: "worksheet",
  },
  {
    id: "7",
    title: "Peer Learning Groups",
    description: "Pair strong and struggling students for Word Problems",
    priority: "Low",
    icon: "concept",
  },
  {
    id: "8",
    title: "Diagnostic Quiz",
    description: "Run a short diagnostic on Algebra Equations",
    priority: "Medium",
    icon: "quiz",
  },
];

export const DEMO_SUGGESTED_INTERVENTIONS_PREVIEW = DEMO_SUGGESTED_INTERVENTIONS.slice(0, 4);

export const DEMO_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "1",
    title: "Generate Revision Lesson",
    description: "Create a complete lesson for weak topic",
    icon: "lesson",
    href: "/tutor/lesson-planner",
  },
  {
    id: "2",
    title: "Create Quiz",
    description: "Auto-generate quiz for weak topic",
    icon: "quiz",
  },
  {
    id: "3",
    title: "Generate Worksheet",
    description: "Create practice worksheet",
    icon: "worksheet",
  },
  {
    id: "4",
    title: "Schedule Group Session",
    description: "Plan a revision session for students",
    icon: "session",
    href: "/tutor/sessions",
  },
  {
    id: "5",
    title: "Send Practice Questions",
    description: "Share questions with students",
    icon: "questions",
  },
];

export const TOTAL_AFFECTED_STUDENTS = 12;
