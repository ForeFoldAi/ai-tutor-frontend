import type {
  AddCredsCandidateFilters,
  CredentialCandidate,
  CredentialFilters,
  CredentialRecord,
} from "@/modules/organization/types/credentials";

export const DEFAULT_CREDENTIAL_FILTERS: CredentialFilters = {
  search: "",
  role: "all",
  firstLoginStatus: "all",
  deliveryStatus: "all",
  shared: "all",
};

export const DEFAULT_ADD_CREDS_FILTERS: AddCredsCandidateFilters = {
  search: "",
  grade: "all",
  section: "all",
  credentialStatus: "needs",
  sort: "name_asc",
};

export function filterCredentialRecords(records: CredentialRecord[], filters: CredentialFilters) {
  const q = filters.search.trim().toLowerCase();
  return records.filter((record) => {
    if (q && !record.name.toLowerCase().includes(q) && !record.userId.toLowerCase().includes(q)) {
      return false;
    }
    if (filters.role !== "all" && record.role !== filters.role) return false;
    if (filters.firstLoginStatus !== "all" && record.firstLoginStatus !== filters.firstLoginStatus) {
      return false;
    }
    if (filters.deliveryStatus !== "all" && record.deliveryStatus !== filters.deliveryStatus) {
      return false;
    }
    if (filters.shared === "shared" && !record.credentialShared) return false;
    if (filters.shared === "not_shared" && record.credentialShared) return false;
    return true;
  });
}

export function filterCredentialCandidates(
  candidates: CredentialCandidate[],
  role: CredentialCandidate["role"] | "",
  filters: AddCredsCandidateFilters,
) {
  if (!role) return [];
  const q = filters.search.trim().toLowerCase();

  const filtered = candidates.filter((user) => {
    if (user.role !== role) return false;
    if (q && !user.name.toLowerCase().includes(q) && !user.userId.toLowerCase().includes(q)) {
      return false;
    }
    if (user.role === "Student") {
      if (filters.grade !== "all" && user.grade !== filters.grade) return false;
      if (filters.section !== "all" && user.section !== filters.section) return false;
    }
    if (filters.credentialStatus === "needs" && user.hasCredentials) return false;
    if (filters.credentialStatus === "has" && !user.hasCredentials) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === "user_id_asc") return a.userId.localeCompare(b.userId);
    if (filters.sort === "name_desc") return b.name.localeCompare(a.name);
    return a.name.localeCompare(b.name);
  });
}
