import type { CredentialMetrics, CredentialRecord } from "@/modules/organization/types/credentials";

export const DEMO_CREDENTIAL_METRICS: CredentialMetrics = {
  generated: 1334,
  teachersPendingLogin: 12,
  studentsPendingLogin: 74,
  notShared: 86,
  generatedTrend: "120 this week",
  teachersPendingTrend: "3 this week",
  studentsPendingTrend: "18 this week",
  notSharedTrend: "6 this week",
  notSharedTrendUp: false,
};

const BASE_RECORDS: Omit<CredentialRecord, "id">[] = [
  {
    name: "Anita Verma",
    role: "Teacher",
    userId: "anita.verma",
    credentialShared: "May 5, 2026",
    firstLoginStatus: "Completed",
    lastLogin: "May 7, 2026",
    deliveryStatus: "Email Sent",
  },
  {
    name: "Rahul Sharma",
    role: "Student",
    userId: "rahul.6a",
    credentialShared: "May 4, 2026",
    firstLoginStatus: "Completed",
    lastLogin: "May 6, 2026",
    deliveryStatus: "SMS Sent",
  },
  {
    name: "Priya Reddy",
    role: "Student",
    userId: "priya.6b",
    credentialShared: "May 3, 2026",
    firstLoginStatus: "Pending",
    lastLogin: null,
    deliveryStatus: "Pending",
  },
  {
    name: "Neha Gupta",
    role: "Student",
    userId: "neha.7a",
    credentialShared: null,
    firstLoginStatus: "Not Started",
    lastLogin: null,
    deliveryStatus: "Not Sent",
  },
  {
    name: "Ravi Kumar",
    role: "Teacher",
    userId: "ravi.kumar",
    credentialShared: "May 2, 2026",
    firstLoginStatus: "Completed",
    lastLogin: "May 5, 2026",
    deliveryStatus: "Email Sent",
  },
  {
    name: "Sneha Iyer",
    role: "Student",
    userId: "sneha.6a",
    credentialShared: "May 1, 2026",
    firstLoginStatus: "Pending",
    lastLogin: null,
    deliveryStatus: "Pending",
  },
];

const FIRST_NAMES = ["Aarav", "Kiran", "Meera", "Arjun", "Divya", "Vikram", "Kavya", "Rohan"];
const LAST_NAMES = ["Patel", "Singh", "Iyer", "Nair", "Desai", "Sharma", "Reddy", "Gupta"];
const LOGIN_STATUSES: CredentialRecord["firstLoginStatus"][] = ["Completed", "Pending", "Not Started"];
const DELIVERY_STATUSES: CredentialRecord["deliveryStatus"][] = [
  "Email Sent",
  "SMS Sent",
  "Pending",
  "Not Sent",
];

function buildDemoRecords(count: number): CredentialRecord[] {
  const records: CredentialRecord[] = BASE_RECORDS.map((record, index) => ({
    ...record,
    id: `cred-${index + 1}`,
  }));

  while (records.length < count) {
    const index = records.length;
    const first = FIRST_NAMES[index % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    const role = index % 7 === 0 ? "Teacher" : "Student";
    const grade = 6 + (index % 3);
    const section = String.fromCharCode(97 + (index % 3));
    const loginStatus = LOGIN_STATUSES[index % LOGIN_STATUSES.length];
    const delivery = DELIVERY_STATUSES[index % DELIVERY_STATUSES.length];
    const day = Math.max(1, 28 - (index % 20));

    records.push({
      id: `cred-${index + 1}`,
      name: `${first} ${last}`,
      role,
      userId: role === "Teacher" ? `${first.toLowerCase()}.${last.toLowerCase()}` : `${first.toLowerCase()}.${grade}${section}`,
      credentialShared: loginStatus === "Not Started" ? null : `May ${day}, 2026`,
      firstLoginStatus: loginStatus,
      lastLogin: loginStatus === "Completed" ? `May ${Math.min(day + 2, 28)}, 2026` : null,
      deliveryStatus: delivery,
    });
  }

  return records;
}

export const DEMO_CREDENTIAL_RECORDS = buildDemoRecords(1334);
