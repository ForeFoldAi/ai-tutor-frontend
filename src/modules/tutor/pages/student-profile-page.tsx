import { useMemo } from "react";
import { useRoute } from "wouter";
import { useTutorData } from "@/modules/tutor/hooks/use-tutor-data";
import { DataState } from "@/modules/shared/components/data-state";
import { StudentProfileView } from "@/modules/tutor/components/students/student-profile-view";
import { getStudentProfile, mergeTutorStudents } from "@/modules/tutor/utils/student-helpers";

export default function TutorStudentProfilePage() {
  const [, params] = useRoute("/tutor/students/:slug");
  const slug = params?.slug ?? "";
  const { studentsQuery } = useTutorData();

  const students = useMemo(
    () => mergeTutorStudents(studentsQuery.data ?? []),
    [studentsQuery.data],
  );

  const profile = useMemo(
    () => (slug ? getStudentProfile(students, slug) : null),
    [students, slug],
  );

  return (
    <DataState
      loading={studentsQuery.isLoading}
      error={studentsQuery.error ? String(studentsQuery.error) : null}
      empty={!profile}
      emptyText="Student profile not found."
      onRetry={() => void studentsQuery.refetch()}
    >
      {profile ? <StudentProfileView student={profile} /> : null}
    </DataState>
  );
}
