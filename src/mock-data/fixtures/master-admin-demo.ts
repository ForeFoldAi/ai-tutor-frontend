export type SubscriptionPlanName = "Starter" | "Growth" | "Enterprise";
export type OrgStatus = "Active" | "Suspended" | "Pending";
export type UserStatus = "Active" | "Suspended" | "Invited";
export type RecordStatus = "Queued" | "Processing" | "Embedded" | "Failed";
export type EmbeddingPipelineStep = "Uploaded" | "OCR" | "Chunked" | "Embedded" | "Active";

export type Organization = {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  totalSchools: number;
  totalUsers: number;
  subscriptionPlan: SubscriptionPlanName;
  status: OrgStatus;
  maxSchoolsLimit: number;
  address: string;
  country: string;
  createdDate: string; // ISO
};

export type School = {
  id: string;
  name: string;
  organizationName: string;
  principalName: string;
  email: string;
  phone: string;
  students: number;
  tutors: number;
  city: string;
  state: string;
  country: string;
  address: string;
  schoolType: "Primary" | "Middle" | "Secondary" | "Higher Secondary";
  status: OrgStatus;
  createdDate: string; // ISO
};

export type MasterAdminRole =
  | "Master Admin"
  | "Organization Admin"
  | "School Admin"
  | "Tutor"
  | "Student"
  | "Parent";

export type MasterAdminUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: MasterAdminRole;
  organization: string;
  school: string;
  lastLogin: string; // ISO
  status: UserStatus;
};

export type Board = {
  id: string;
  name: string;
  country: string;
  classesCount: number;
  subjectsCount: number;
};

export type SyllabusTree = {
  board: string;
  classes: Array<{
    className: string;
    subjects: Array<{
      subjectName: string;
      units: Array<{
        unitName: string;
        chapters: Array<{
          chapterName: string;
          lessons: Array<{ lessonName: string; sequenceNumber: number }>;
        }>;
      }>;
    }>;
  }>;
};

export type TextbookUpload = {
  id: string;
  fileName: string;
  board: string;
  className: string;
  subject: string;
  unit: string;
  chapter: string;
  lesson: string;
  uploadedBy: string;
  uploadDate: string; // ISO
  ocrStatus: RecordStatus;
  chunkStatus: RecordStatus;
  embeddingStatus: RecordStatus;
  language: string;
  edition: string;
  publisher: string;
  academicYear: string;
};

export type EmbeddingRecord = {
  id: string;
  fileName: string;
  board: string;
  subject: string;
  chunksCount: number;
  embeddingModel: string;
  status: RecordStatus;
  lastUpdated: string; // ISO
};

export type SubscriptionPlan = {
  id: string;
  name: SubscriptionPlanName;
  monthlyPrice: number;
  yearlyPrice: number;
  schoolsLimit: number;
  usersLimit: number;
  aiUsageCredits: number;
  storageGb: number;
  supportLevel: "Standard" | "Priority" | "Dedicated";
  features: string[];
  active: boolean;
};

export const demoOrganizations: Organization[] = [
  {
    id: "org_1001",
    name: "Greenwood Academy Group",
    ownerName: "Nisha Verma",
    email: "nisha.verma@greenwood.edu",
    phone: "+91 98765 43210",
    totalSchools: 6,
    totalUsers: 2480,
    subscriptionPlan: "Enterprise",
    status: "Active",
    maxSchoolsLimit: 100,
    address: "14, Crescent Park Road",
    country: "India",
    createdDate: "2026-02-14T10:15:00.000Z",
  },
  {
    id: "org_1002",
    name: "Lincoln High School Network",
    ownerName: "Rahul Menon",
    email: "rahul.menon@lincolnhigh.org",
    phone: "+91 91234 56789",
    totalSchools: 4,
    totalUsers: 1632,
    subscriptionPlan: "Growth",
    status: "Active",
    maxSchoolsLimit: 25,
    address: "72, Lakeview Residency, Sector 9",
    country: "India",
    createdDate: "2025-11-09T08:20:00.000Z",
  },
  {
    id: "org_1003",
    name: "Riverside Institute",
    ownerName: "Asha Kulkarni",
    email: "asha.k@riverside.edu",
    phone: "+1 (415) 555-0142",
    totalSchools: 2,
    totalUsers: 810,
    subscriptionPlan: "Starter",
    status: "Pending",
    maxSchoolsLimit: 5,
    address: "400 University Ave, Suite 21",
    country: "United States",
    createdDate: "2026-04-03T12:00:00.000Z",
  },
  {
    id: "org_1004",
    name: "Summit Academy",
    ownerName: "James Clarke",
    email: "james.clarke@summit.edu",
    phone: "+44 20 7946 0018",
    totalSchools: 3,
    totalUsers: 1206,
    subscriptionPlan: "Growth",
    status: "Suspended",
    maxSchoolsLimit: 25,
    address: "18 Kingfisher Lane",
    country: "United Kingdom",
    createdDate: "2025-08-27T09:35:00.000Z",
  },
  {
    id: "org_1005",
    name: "Aurora Learning Consortium",
    ownerName: "Priya Iyer",
    email: "priya.iyer@auroraconsortium.com",
    phone: "+91 90123 45678",
    totalSchools: 5,
    totalUsers: 2044,
    subscriptionPlan: "Enterprise",
    status: "Active",
    maxSchoolsLimit: 100,
    address: "5, Skybridge Tower, Level 12",
    country: "India",
    createdDate: "2026-01-22T15:10:00.000Z",
  },
];

export const demoSchools: School[] = [
  {
    id: "sch_2001",
    name: "Greenwood Academy - North Campus",
    organizationName: "Greenwood Academy Group",
    principalName: "Dr. Anjali Rao",
    email: "principal.north@greenwood.edu",
    phone: "+91 90000 12001",
    students: 1840,
    tutors: 62,
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    address: "North Campus, S. No. 14/3",
    schoolType: "Higher Secondary",
    status: "Active",
    createdDate: "2026-03-01T06:50:00.000Z",
  },
  {
    id: "sch_2002",
    name: "Greenwood Academy - East Campus",
    organizationName: "Greenwood Academy Group",
    principalName: "Mr. Suresh Kumar",
    email: "principal.east@greenwood.edu",
    phone: "+91 90000 12002",
    students: 1422,
    tutors: 48,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    address: "East Campus, Marine Drive Extension",
    schoolType: "Secondary",
    status: "Active",
    createdDate: "2025-12-12T07:20:00.000Z",
  },
  {
    id: "sch_2003",
    name: "Lincoln High School - Riverside Branch",
    organizationName: "Lincoln High School Network",
    principalName: "Ms. Kavita Sharma",
    email: "principal.riverside@lincolnhigh.org",
    phone: "+91 90000 13003",
    students: 988,
    tutors: 34,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    address: "Riverside Branch, Tonk Road",
    schoolType: "Higher Secondary",
    status: "Active",
    createdDate: "2026-01-05T09:10:00.000Z",
  },
  {
    id: "sch_2004",
    name: "Riverside Institute - Central Campus",
    organizationName: "Riverside Institute",
    principalName: "Dr. Maria Fernandes",
    email: "principal.central@riverside.edu",
    phone: "+91 90000 14004",
    students: 560,
    tutors: 21,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    address: "Central Campus, Electronics City Phase 2",
    schoolType: "Middle",
    status: "Pending",
    createdDate: "2026-04-08T18:40:00.000Z",
  },
  {
    id: "sch_2005",
    name: "Summit Academy - Downtown",
    organizationName: "Summit Academy",
    principalName: "Mr. Henry Wilson",
    email: "principal.downtown@summit.edu",
    phone: "+91 90000 15005",
    students: 720,
    tutors: 26,
    city: "London",
    state: "Greater London",
    country: "United Kingdom",
    address: "Downtown Campus, 31 Thames Quay",
    schoolType: "Secondary",
    status: "Suspended",
    createdDate: "2025-09-16T10:00:00.000Z",
  },
];

export const demoUsers: MasterAdminUser[] = [
  {
    id: "usr_3001",
    fullName: "Ananya Patel",
    email: "ananya.patel@greenwood.edu",
    phone: "+91 98888 00101",
    role: "Organization Admin",
    organization: "Greenwood Academy Group",
    school: "All Schools",
    lastLogin: "2026-05-08T06:40:00.000Z",
    status: "Active",
  },
  {
    id: "usr_3002",
    fullName: "Karthik Nair",
    email: "karthik.nair@lincolnhigh.org",
    phone: "+91 98888 00102",
    role: "School Admin",
    organization: "Lincoln High School Network",
    school: "Lincoln High School - Riverside Branch",
    lastLogin: "2026-05-07T20:12:00.000Z",
    status: "Active",
  },
  {
    id: "usr_3003",
    fullName: "Sana Khan",
    email: "sana.khan@greenwood.edu",
    phone: "+91 98888 00103",
    role: "Tutor",
    organization: "Greenwood Academy Group",
    school: "Greenwood Academy - North Campus",
    lastLogin: "2026-05-08T02:15:00.000Z",
    status: "Active",
  },
  {
    id: "usr_3004",
    fullName: "Ibrahim Qureshi",
    email: "ibrahim.qureshi@riverside.edu",
    phone: "+91 98888 00104",
    role: "Tutor",
    organization: "Riverside Institute",
    school: "Riverside Institute - Central Campus",
    lastLogin: "2026-05-06T11:05:00.000Z",
    status: "Invited",
  },
  {
    id: "usr_3005",
    fullName: "Maya Singh",
    email: "maya.singh@student.riverside.edu",
    phone: "+91 98888 00105",
    role: "Student",
    organization: "Riverside Institute",
    school: "Riverside Institute - Central Campus",
    lastLogin: "2026-05-07T07:35:00.000Z",
    status: "Active",
  },
  {
    id: "usr_3006",
    fullName: "Arjun Mehta (Parent)",
    email: "arjun.mehta@parentmail.com",
    phone: "+91 98888 00106",
    role: "Parent",
    organization: "Greenwood Academy Group",
    school: "Greenwood Academy - East Campus",
    lastLogin: "2026-05-01T09:55:00.000Z",
    status: "Active",
  },
  {
    id: "usr_3007",
    fullName: "Sofia Rodrigues",
    email: "sofia.rodrigues@student.greenwood.edu",
    phone: "+91 98888 00107",
    role: "Student",
    organization: "Greenwood Academy Group",
    school: "Greenwood Academy - North Campus",
    lastLogin: "2026-05-08T06:05:00.000Z",
    status: "Active",
  },
  {
    id: "usr_3008",
    fullName: "Daniel Becker (Master Admin)",
    email: "admin@eduaimap.com",
    phone: "+1 (650) 555-0199",
    role: "Master Admin",
    organization: "Platform",
    school: "N/A",
    lastLogin: "2026-05-08T07:10:00.000Z",
    status: "Active",
  },
];

export const demoBoards: Board[] = [
  { id: "b_1", name: "CBSE", country: "India", classesCount: 18, subjectsCount: 42 },
  { id: "b_2", name: "ICSE", country: "India", classesCount: 15, subjectsCount: 38 },
  { id: "b_3", name: "State Board", country: "India", classesCount: 20, subjectsCount: 55 },
  { id: "b_4", name: "IB", country: "International", classesCount: 10, subjectsCount: 24 },
  { id: "b_5", name: "Cambridge", country: "UK", classesCount: 12, subjectsCount: 28 },
];

export const demoSyllabus: SyllabusTree[] = [
  {
    board: "CBSE",
    classes: [
      {
        className: "Class 8",
        subjects: [
          {
            subjectName: "Mathematics",
            units: [
              {
                unitName: "Algebra Basics",
                chapters: [
                  {
                    chapterName: "Linear Equations",
                    lessons: [
                      { lessonName: "Introduction to Variables", sequenceNumber: 1 },
                      { lessonName: "Solving Simple Equations", sequenceNumber: 2 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    board: "ICSE",
    classes: [
      {
        className: "Class 9",
        subjects: [
          {
            subjectName: "Science",
            units: [
              {
                unitName: "Physics Fundamentals",
                chapters: [
                  {
                    chapterName: "Motion and Forces",
                    lessons: [
                      { lessonName: "Speed and Velocity", sequenceNumber: 1 },
                      { lessonName: "Newton's Laws", sequenceNumber: 2 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const demoTextbookUploads: TextbookUpload[] = [
  {
    id: "up_4001",
    fileName: "CBSE_Math_Grade8_AlgebraBasics.pdf",
    board: "CBSE",
    className: "Class 8",
    subject: "Mathematics",
    unit: "Algebra",
    chapter: "Linear Equations",
    lesson: "Solving Simple Equations",
    uploadedBy: "Sana Khan",
    uploadDate: "2026-05-07T14:18:00.000Z",
    ocrStatus: "Embedded",
    chunkStatus: "Embedded",
    embeddingStatus: "Processing",
    language: "English",
    edition: "2025",
    publisher: "EduAI Press",
    academicYear: "2025-2026",
  },
  {
    id: "up_4002",
    fileName: "ICSE_Science_Grade9_Physics.pdf",
    board: "ICSE",
    className: "Class 9",
    subject: "Science",
    unit: "Physics Fundamentals",
    chapter: "Motion and Forces",
    lesson: "Newton's Laws",
    uploadedBy: "Ibrahim Qureshi",
    uploadDate: "2026-05-08T03:05:00.000Z",
    ocrStatus: "Processing",
    chunkStatus: "Queued",
    embeddingStatus: "Queued",
    language: "English",
    edition: "2024",
    publisher: "Cambridge EdTech",
    academicYear: "2024-2025",
  },
  {
    id: "up_4003",
    fileName: "CBSE_English_Grade10_ReadingSkills.pdf",
    board: "CBSE",
    className: "Class 10",
    subject: "English",
    unit: "Reading & Writing",
    chapter: "Reading Comprehension",
    lesson: "Inference & Context",
    uploadedBy: "Ananya Patel",
    uploadDate: "2026-05-06T11:30:00.000Z",
    ocrStatus: "Embedded",
    chunkStatus: "Embedded",
    embeddingStatus: "Embedded",
    language: "English",
    edition: "2025",
    publisher: "EduAI Press",
    academicYear: "2025-2026",
  },
];

export const demoEmbeddingRecords: EmbeddingRecord[] = [
  {
    id: "emb_5001",
    fileName: "CBSE_Math_Grade8_AlgebraBasics.pdf",
    board: "CBSE",
    subject: "Mathematics",
    chunksCount: 482,
    embeddingModel: "text-embedding-3-large",
    status: "Processing",
    lastUpdated: "2026-05-08T06:00:00.000Z",
  },
  {
    id: "emb_5002",
    fileName: "ICSE_Science_Grade9_Physics.pdf",
    board: "ICSE",
    subject: "Science",
    chunksCount: 610,
    embeddingModel: "text-embedding-3-large",
    status: "Queued",
    lastUpdated: "2026-05-08T04:15:00.000Z",
  },
  {
    id: "emb_5003",
    fileName: "CBSE_English_Grade10_ReadingSkills.pdf",
    board: "CBSE",
    subject: "English",
    chunksCount: 390,
    embeddingModel: "text-embedding-3-small",
    status: "Embedded",
    lastUpdated: "2026-05-06T12:20:00.000Z",
  },
  {
    id: "emb_5004",
    fileName: "StateBoard_Social_Grade9_Civics.pdf",
    board: "State Board",
    subject: "Social Science",
    chunksCount: 220,
    embeddingModel: "text-embedding-3-small",
    status: "Failed",
    lastUpdated: "2026-05-04T08:05:00.000Z",
  },
];

export const demoSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: "plan_1",
    name: "Starter",
    monthlyPrice: 199,
    yearlyPrice: 1990,
    schoolsLimit: 5,
    usersLimit: 500,
    aiUsageCredits: 120000,
    storageGb: 50,
    supportLevel: "Standard",
    features: [
      "OCR + chunking pipeline",
      "Embedding & semantic search",
      "Basic analytics dashboard",
      "Community support",
    ],
    active: true,
  },
  {
    id: "plan_2",
    name: "Growth",
    monthlyPrice: 499,
    yearlyPrice: 4890,
    schoolsLimit: 25,
    usersLimit: 2500,
    aiUsageCredits: 350000,
    storageGb: 200,
    supportLevel: "Priority",
    features: [
      "Advanced analytics + reports export",
      "Priority embedding queue",
      "School onboarding workflows",
      "Team collaboration views",
    ],
    active: true,
  },
  {
    id: "plan_3",
    name: "Enterprise",
    monthlyPrice: 999,
    yearlyPrice: 9890,
    schoolsLimit: 100,
    usersLimit: 10000,
    aiUsageCredits: 900000,
    storageGb: 800,
    supportLevel: "Dedicated",
    features: [
      "Dedicated embedding capacity",
      "SLA-backed support",
      "Custom token & model policies",
      "Security and compliance exports",
    ],
    active: false,
  },
];

export const userGrowthSeries = [
  { month: "Jan", users: 820 },
  { month: "Feb", users: 910 },
  { month: "Mar", users: 1050 },
  { month: "Apr", users: 1180 },
  { month: "May", users: 1340 },
  { month: "Jun", users: 1510 },
  { month: "Jul", users: 1685 },
];

export const revenueSeries = [
  { month: "Jan", revenue: 24800 },
  { month: "Feb", revenue: 26500 },
  { month: "Mar", revenue: 29850 },
  { month: "Apr", revenue: 33100 },
  { month: "May", revenue: 36250 },
  { month: "Jun", revenue: 40100 },
  { month: "Jul", revenue: 43900 },
];

export const organizationGrowthSeries = [
  { month: "Jan", orgs: 18 },
  { month: "Feb", orgs: 21 },
  { month: "Mar", orgs: 25 },
  { month: "Apr", orgs: 29 },
  { month: "May", orgs: 34 },
  { month: "Jun", orgs: 39 },
  { month: "Jul", orgs: 44 },
];

export const aiUsageSeries = [
  { label: "OCR", queries: 184000 },
  { label: "Chunking", queries: 238000 },
  { label: "Embedding", queries: 312000 },
  { label: "Chat", queries: 455000 },
];

export const masterAdminPipelineSteps: EmbeddingPipelineStep[] = [
  "Uploaded",
  "OCR",
  "Chunked",
  "Embedded",
  "Active",
];

export type SupportLogSeverity = "Info" | "Warning" | "Critical";
export type SupportLogEntry = {
  id: string;
  title: string;
  customer: string;
  severity: SupportLogSeverity;
  time: string; // relative
};

export const demoSupportLogs: SupportLogEntry[] = [
  {
    id: "log_1",
    title: "Embedding queue latency spike",
    customer: "Aurora Learning Consortium",
    severity: "Warning",
    time: "2 hours ago",
  },
  {
    id: "log_2",
    title: "OCR failed for one chapter PDF",
    customer: "Riverside Institute",
    severity: "Critical",
    time: "Yesterday",
  },
  {
    id: "log_3",
    title: "New tenant invited to enterprise plan",
    customer: "Lincoln High School Network",
    severity: "Info",
    time: "2 days ago",
  },
];

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string; // relative
};

export const demoNotifications: NotificationItem[] = [
  {
    id: "n_1",
    title: "Textbook OCR completed",
    description: "CBSE Mathematics - Linear Equations (Grade 8) is ready for chunking.",
    time: "18m ago",
  },
  {
    id: "n_2",
    title: "Subscription renewal due",
    description: "Greenwood Academy Group will renew on May 18.",
    time: "3h ago",
  },
  {
    id: "n_3",
    title: "New onboarding request",
    description: "Riverside Institute has requested onboarding for an additional campus.",
    time: "Yesterday",
  },
];

