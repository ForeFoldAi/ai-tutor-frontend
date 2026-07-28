/**
 * Signup form field definitions (frontend-owned labels & API option keys).
 * Text/password fields render immediately; enum fields use GET /auth/signup/options.
 */

import type { SignupOptions } from "@/api/types";

export type SignupOptionsKey = keyof SignupOptions;

export type SignupFieldDef = {
  name: string;
  label: string;
  required?: boolean;
  /** When set, values come from GET /auth/signup/options */
  optionsKey?: SignupOptionsKey;
  type: "text" | "email" | "phone" | "password" | "textarea" | "userId" | "select" | "pills" | "checkboxes" | "methods" | "teachingModes";
};

export const STUDENT_SIGNUP_FIELDS = {
  fullName: { name: "full_name", label: "Full Name", required: true, type: "text" },
  grade: { name: "grade", label: "Grade / Class", required: true, type: "select", optionsKey: "student_grades" },
  parentPhone: { name: "parent_phone", label: "Parent Phone (Optional)", type: "phone" },
  parentEmail: { name: "parent_email", label: "Parent Email (Optional)", type: "email" },
  curricula: { name: "curricula", label: "Choose Curriculum", required: true, type: "pills", optionsKey: "curricula" },
  userId: { name: "user_id", label: "Choose User ID", required: true, type: "userId" },
  password: { name: "password", label: "Password", required: true, type: "password" },
  confirmPassword: { name: "confirm_password", label: "Confirm Password", required: true, type: "password" },
  subjects: { name: "favorite_subjects", label: "Favorite Subjects", type: "pills", optionsKey: "student_subjects" },
  goals: { name: "learning_goals", label: "Learning Goals", type: "checkboxes", optionsKey: "learning_goals" },
  method: { name: "preferred_learning_method", label: "Preferred Learning Method", type: "methods", optionsKey: "learning_methods" },
} as const satisfies Record<string, SignupFieldDef>;

export const TEACHER_SIGNUP_FIELDS = {
  fullName: { name: "full_name", label: "Full Name", required: true, type: "text" },
  experience: { name: "teaching_experience", label: "Teaching Experience", required: true, type: "select", optionsKey: "teaching_experience" },
  gradeRange: { name: "grades_teach", label: "Grades You Teach", required: true, type: "select", optionsKey: "tutor_grade_ranges" },
  classSize: { name: "class_size", label: "Class Size (Average)", required: true, type: "select", optionsKey: "class_sizes" },
  teachSubjects: { name: "teaching_subjects", label: "Teaching Subjects", required: true, type: "pills", optionsKey: "tutor_subjects" },
  email: { name: "email", label: "Email (for recovery)", required: true, type: "email" },
  mobile: { name: "mobile", label: "Mobile Number (for recovery)", required: true, type: "phone" },
  userId: { name: "user_id", label: "Choose Teacher User ID", required: true, type: "userId" },
  password: { name: "password", label: "Password", required: true, type: "password" },
  confirmPassword: { name: "confirm_password", label: "Confirm Password", required: true, type: "password" },
  teachingModes: { name: "teaching_modes", label: "Teaching Mode", required: true, type: "teachingModes", optionsKey: "teaching_modes" },
  bio: { name: "bio", label: "Short Bio / Introduction (Optional)", type: "textarea" },
} as const satisfies Record<string, SignupFieldDef>;

export const SCHOOL_SIGNUP_FIELDS = {
  schoolName: { name: "school_name", label: "School Name", required: true, type: "text" },
  schoolEmail: { name: "school_email", label: "Official School Email", required: true, type: "email" },
  schoolPhone: { name: "phone", label: "Phone Number", required: true, type: "phone" },
  website: { name: "website", label: "School Website (Optional)", type: "text" },
  address: { name: "address", label: "School Address", required: true, type: "textarea" },
  adminName: { name: "full_name", label: "Administrator Name", required: true, type: "text" },
  designation: { name: "designation", label: "Designation", required: true, type: "text" },
  recoveryEmail: { name: "recovery_email", label: "Recovery Email", required: true, type: "email" },
  adminMobile: { name: "mobile", label: "Mobile Number", required: true, type: "phone" },
  adminUserId: { name: "user_id", label: "Choose Admin User ID", required: true, type: "userId" },
  password: { name: "password", label: "Create Password", required: true, type: "password" },
  confirmPassword: { name: "confirm_password", label: "Confirm Password", required: true, type: "password" },
  gradesOffered: { name: "grades_offered", label: "Grades Offered", required: true, type: "select", optionsKey: "school_grade_ranges" },
  studentStrength: { name: "student_strength", label: "Student Strength", required: true, type: "select", optionsKey: "student_strength" },
  curricula: { name: "curricula", label: "Curriculum Offered", required: true, type: "pills", optionsKey: "curricula" },
} as const satisfies Record<string, SignupFieldDef>;

export function optionsForKey(options: SignupOptions, key: SignupOptionsKey): string[] {
  const value = options[key];
  return Array.isArray(value) ? value : [];
}
