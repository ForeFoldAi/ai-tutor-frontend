import type {
  AtRiskStudent,
  ClassHealthMetrics,
  CompletionTrendPoint,
  TopicMasteryItem,
} from "@/modules/tutor/types/progress-analytics";

export const DEMO_CLASS_HEALTH: ClassHealthMetrics = {
  score: 78,
  status: "Good",
  trendPercent: 10,
  trendUp: true,
};

export const DEMO_TOPIC_MASTERY: TopicMasteryItem[] = [
  { topic: "Fractions", mastery: 72 },
  { topic: "Decimals", mastery: 65 },
  { topic: "Algebra", mastery: 40 },
  { topic: "Geometry", mastery: 85 },
  { topic: "Word Problems", mastery: 55 },
  { topic: "Ratios", mastery: 48 },
  { topic: "Percentages", mastery: 58 },
  { topic: "Statistics", mastery: 70 },
];

export const DEMO_TOPIC_MASTERY_PREVIEW = DEMO_TOPIC_MASTERY.slice(0, 4);

export const DEMO_COMPLETION_TREND: CompletionTrendPoint[] = [
  { date: "Apr 10", completion: 62 },
  { date: "Apr 17", completion: 68 },
  { date: "Apr 24", completion: 71 },
  { date: "May 1", completion: 75 },
  { date: "May 8", completion: 78 },
];

export const DEMO_AT_RISK_STUDENTS: AtRiskStudent[] = [
  {
    id: "1",
    name: "Aaron Patel",
    grade: "7",
    subject: "Algebra",
    riskLevel: "High",
    avatarColor: "bg-sky-100 text-sky-700",
  },
  {
    id: "2",
    name: "Priya Reddy",
    grade: "7",
    subject: "Algebra",
    riskLevel: "High",
    avatarColor: "bg-violet-100 text-violet-700",
  },
  {
    id: "3",
    name: "Kiran Kumar",
    grade: "6",
    subject: "Fractions",
    riskLevel: "Medium",
    avatarColor: "bg-amber-100 text-amber-700",
  },
  {
    id: "4",
    name: "Sneha Iyer",
    grade: "6",
    subject: "Decimals",
    riskLevel: "Medium",
    avatarColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "5",
    name: "Meera Singh",
    grade: "6",
    subject: "Fractions",
    riskLevel: "Medium",
    avatarColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "6",
    name: "Rahul Sharma",
    grade: "7",
    subject: "Word Problems",
    riskLevel: "High",
    avatarColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "7",
    name: "Ananya Desai",
    grade: "8",
    subject: "Decimals",
    riskLevel: "Medium",
    avatarColor: "bg-purple-100 text-purple-700",
  },
  {
    id: "8",
    name: "Vikram Nair",
    grade: "6",
    subject: "Geometry",
    riskLevel: "Low",
    avatarColor: "bg-teal-100 text-teal-700",
  },
  {
    id: "9",
    name: "Isha Gupta",
    grade: "7",
    subject: "Algebra",
    riskLevel: "High",
    avatarColor: "bg-orange-100 text-orange-700",
  },
  {
    id: "10",
    name: "Arjun Mehta",
    grade: "8",
    subject: "Ratios",
    riskLevel: "Medium",
    avatarColor: "bg-indigo-100 text-indigo-700",
  },
];

export const DEMO_AT_RISK_STUDENTS_PREVIEW = DEMO_AT_RISK_STUDENTS.slice(0, 4);
