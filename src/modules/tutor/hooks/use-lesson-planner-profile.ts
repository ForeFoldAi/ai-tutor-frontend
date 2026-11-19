import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/api/profile";
import { useAuthStore } from "@/lib/auth-store";
import type { LessonPlanFormValues } from "@/modules/tutor/types/lesson-planner";

/** Refresh tutor profile from API. Do not auto-select a class — keep Grade / Class placeholder. */
export function useLessonPlannerProfile(
  _formValues: LessonPlanFormValues,
  _onFormChange: (
    values: LessonPlanFormValues | ((prev: LessonPlanFormValues) => LessonPlanFormValues),
  ) => void,
) {
  const updateUser = useAuthStore((s) => s.updateUser);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["lesson-planner", "profile"] as const,
    queryFn: getMyProfile,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!profile) return;

    updateUser({
      teachingBoard: profile.teaching_board ?? null,
      teachingSubjects: profile.teaching_subjects ?? null,
      teachingClasses: profile.teaching_classes ?? null,
    });
  }, [profile, updateUser]);

  const needsProfileSetup = !isLoading && Boolean(profile && !profile.teaching_classes?.length);

  return { isLoadingProfile: isLoading, needsProfileSetup };
}
