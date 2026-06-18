import type { OrganizationDetail } from "@/api/types";
import { MOCK_ORG_ID } from "./users";

export const initialOrganization: OrganizationDetail = {
  id: MOCK_ORG_ID,
  name: "Greenwood Academy Group",
  phone: "+91 98765 43210",
  address: "14, Crescent Park Road, Pune, Maharashtra",
  is_active: true,
  created_at: "2026-02-14T10:15:00.000Z",
};
