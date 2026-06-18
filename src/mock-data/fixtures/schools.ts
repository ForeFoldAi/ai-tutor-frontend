import type { OrganizationSchoolSummary } from "@/api/types";
import { MOCK_ORG_ID, MOCK_SCHOOL_ID, MOCK_SCHOOL_ID_2 } from "./users";

export const initialSchools: OrganizationSchoolSummary[] = [
  {
    id: MOCK_SCHOOL_ID,
    organization_id: MOCK_ORG_ID,
    organization_name: "Greenwood Academy Group",
    name: "Greenwood Academy - North Campus",
    branch: "North",
    board: "CBSE",
    created_at: "2026-03-01T06:50:00.000Z",
    school_admins: [
      {
        id: "user-school-admin-1",
        full_name: "Demo School Admin",
        email: "admin@demo.com",
        is_active: true,
      },
    ],
    tutor_count: 1,
    student_count: 2,
  },
  {
    id: MOCK_SCHOOL_ID_2,
    organization_id: MOCK_ORG_ID,
    organization_name: "Greenwood Academy Group",
    name: "Greenwood Academy - East Campus",
    branch: "East",
    board: "CBSE",
    created_at: "2025-12-12T07:20:00.000Z",
    school_admins: [],
    tutor_count: 1,
    student_count: 1,
  },
];
