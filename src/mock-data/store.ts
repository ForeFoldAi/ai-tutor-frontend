import type {
  ApiUser,
  BoardResponse,
  OrganizationDetail,
  OrganizationSchoolSummary,
  SyllabusSubjectResponse,
  TextbookUploadApi,
} from "@/api/types";
import type { TutorSession } from "@/modules/tutor/types";
import { initialBoards, initialSyllabus, initialTextbookUploads } from "./fixtures/catalog";
import { initialOrganization } from "./fixtures/organizations";
import { initialSchools } from "./fixtures/schools";
import { initialTutorSessions } from "./fixtures/tutor-sessions";
import { initialUsers } from "./fixtures/users";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class MockStore {
  users: ApiUser[] = clone(initialUsers);
  organization: OrganizationDetail = clone(initialOrganization);
  schools: OrganizationSchoolSummary[] = clone(initialSchools);
  boards: BoardResponse[] = clone(initialBoards);
  syllabus: SyllabusSubjectResponse[] = clone(initialSyllabus);
  textbookUploads: TextbookUploadApi[] = clone(initialTextbookUploads);
  tutorSessions: TutorSession[] = clone(initialTutorSessions);

  reset() {
    this.users = clone(initialUsers);
    this.organization = clone(initialOrganization);
    this.schools = clone(initialSchools);
    this.boards = clone(initialBoards);
    this.syllabus = clone(initialSyllabus);
    this.textbookUploads = clone(initialTextbookUploads);
    this.tutorSessions = clone(initialTutorSessions);
  }
}

export const mockStore = new MockStore();
