import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { getTutorStudentProfileByRef } from "@/api/tutor";
import { DataState } from "@/modules/shared/components/data-state";
import { StudentProfileView } from "@/modules/tutor/components/students/student-profile-view";
import { mapTutorStudentProfile } from "@/modules/tutor/utils/student-helpers";

export default function TutorStudentProfilePage() {
  const [, params] = useRoute("/tutor/students/:studentId");
  const studentId = params?.studentId ?? "";

  const profileQuery = useQuery({
    queryKey: ["tutor", "students", "profile", studentId],
    queryFn: () => getTutorStudentProfileByRef(studentId),
    enabled: Boolean(studentId),
  });

  const profile = profileQuery.data ? mapTutorStudentProfile(profileQuery.data) : null;

  return (
    <DataState
      loading={profileQuery.isLoading}
      error={profileQuery.error ? String(profileQuery.error) : null}
      empty={!profile && !profileQuery.isLoading}
      emptyText="Student profile not found."
      onRetry={() => void profileQuery.refetch()}
    >
      {profile ? <StudentProfileView student={profile} /> : null}
    </DataState>
  );
}
