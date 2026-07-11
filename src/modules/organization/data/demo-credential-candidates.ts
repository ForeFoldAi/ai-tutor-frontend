import type { CredentialCandidate } from "@/modules/organization/types/credentials";

const TEACHERS: CredentialCandidate[] = [
  { id: "tc-1", name: "Anita Verma", role: "Teacher", userId: "anita.verma", detail: "Mathematics · Grades 6–8", hasCredentials: true },
  { id: "tc-2", name: "Ravi Kumar", role: "Teacher", userId: "ravi.kumar", detail: "Science · Grades 7–8", hasCredentials: true },
  { id: "tc-3", name: "Deepa Nair", role: "Teacher", userId: "deepa.nair", detail: "English · Grades 6–7", hasCredentials: false },
  { id: "tc-4", name: "Suresh Menon", role: "Teacher", userId: "suresh.menon", detail: "Social Studies · Grade 8", hasCredentials: false },
  { id: "tc-5", name: "Kavita Joshi", role: "Teacher", userId: "kavita.joshi", detail: "Computer Science · Grades 6–8", hasCredentials: false },
  { id: "tc-6", name: "Arun Pillai", role: "Teacher", userId: "arun.pillai", detail: "Physics · Grades 9–10", hasCredentials: false },
];

const STUDENTS: CredentialCandidate[] = [
  { id: "sc-1", name: "Rahul Sharma", role: "Student", userId: "rahul.6a", grade: "6", section: "A", detail: "Grade 6 · Section A · CBSE", hasCredentials: true },
  { id: "sc-2", name: "Priya Reddy", role: "Student", userId: "priya.6b", grade: "6", section: "B", detail: "Grade 6 · Section B · CBSE", hasCredentials: true },
  { id: "sc-3", name: "Neha Gupta", role: "Student", userId: "neha.7a", grade: "7", section: "A", detail: "Grade 7 · Section A · ICSE", hasCredentials: false },
  { id: "sc-4", name: "Sneha Iyer", role: "Student", userId: "sneha.6a", grade: "6", section: "A", detail: "Grade 6 · Section A · CBSE", hasCredentials: true },
  { id: "sc-5", name: "Aarav Patel", role: "Student", userId: "aarav.6b", grade: "6", section: "B", detail: "Grade 6 · Section B · CBSE", hasCredentials: false },
  { id: "sc-6", name: "Kiran Singh", role: "Student", userId: "kiran.7b", grade: "7", section: "B", detail: "Grade 7 · Section B · CBSE", hasCredentials: false },
  { id: "sc-7", name: "Meera Iyer", role: "Student", userId: "meera.8a", grade: "8", section: "A", detail: "Grade 8 · Section A · ICSE", hasCredentials: false },
  { id: "sc-8", name: "Arjun Nair", role: "Student", userId: "arjun.6a", grade: "6", section: "A", detail: "Grade 6 · Section A · CBSE", hasCredentials: false },
  { id: "sc-9", name: "Divya Desai", role: "Student", userId: "divya.7a", grade: "7", section: "A", detail: "Grade 7 · Section A · ICSE", hasCredentials: false },
  { id: "sc-10", name: "Vikram Sharma", role: "Student", userId: "vikram.8b", grade: "8", section: "B", detail: "Grade 8 · Section B · CBSE", hasCredentials: false },
];

export const DEMO_CREDENTIAL_CANDIDATES: CredentialCandidate[] = [...TEACHERS, ...STUDENTS];
