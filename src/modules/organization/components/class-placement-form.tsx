import { useFieldArray, useFormState, type Control } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ApiUser } from "@/api/types";

export const classPlacementRowsSchema = z.array(
  z.object({
    grade: z.string(),
    sections: z.array(z.object({ value: z.string() })),
  }),
);

export function refineClassPlacementRows(
  data: { classes: z.infer<typeof classPlacementRowsSchema> },
  ctx: z.RefinementCtx,
) {
  if (data.classes.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add at least one class.",
      path: ["classes", 0, "grade"],
    });
    return;
  }
  data.classes.forEach((c, ci) => {
    if (!c.grade.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Class / grade is required.",
        path: ["classes", ci, "grade"],
      });
    }
    const secs = c.sections.map((s) => s.value.trim()).filter(Boolean);
    if (secs.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one section (e.g. A).",
        path: ["classes", ci, "sections", 0, "value"],
      });
    }
  });
}

export type ClassRowsFormPart = {
  classes: z.infer<typeof classPlacementRowsSchema>;
};

export function schoolDisplayName(s: { name: string; branch: string | null }) {
  return s.branch ? `${s.name} · ${s.branch}` : s.name;
}

/** One row: grade (narrow) + horizontal section inputs + remove class. */
export function ClassSectionsBlock({
  nestIndex,
  control,
  canRemoveClass,
  onRemoveClass,
}: {
  nestIndex: number;
  control: Control<ClassRowsFormPart>;
  canRemoveClass: boolean;
  onRemoveClass: () => void;
}) {
  const { errors } = useFormState({ control });
  const { fields, append, remove } = useFieldArray({
    control,
    name: `classes.${nestIndex}.sections`,
  });

  const classRowErrors = errors.classes?.[nestIndex];
  const sectionErrorMsg =
    classRowErrors &&
    typeof classRowErrors === "object" &&
    "sections" in classRowErrors &&
    Array.isArray(classRowErrors.sections) &&
    classRowErrors.sections[0] &&
    typeof classRowErrors.sections[0] === "object" &&
    "value" in classRowErrors.sections[0]
      ? (classRowErrors.sections[0] as { value?: { message?: string } }).value?.message
      : undefined;

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
        <FormField
          control={control}
          name={`classes.${nestIndex}.grade`}
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormControl>
                <Input
                  className="h-9 px-2 text-center text-sm tabular-nums"
                  placeholder="9"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {fields.map((f, sectionIndex) => (
            <div key={f.id} className="flex items-center gap-0">
              <FormField
                control={control}
                name={`classes.${nestIndex}.sections.${sectionIndex}.value`}
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input
                        className="h-9 w-11 px-1 text-center text-sm uppercase tabular-nums"
                        placeholder="A"
                        maxLength={20}
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {fields.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => remove(sectionIndex)}
                  aria-label={`Remove section ${sectionIndex + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1 px-2 text-xs"
            onClick={() => append({ value: "" })}
          >
            <Plus className="h-3.5 w-3.5" />
            Section
          </Button>
        </div>
        <div className="flex justify-end pt-0.5">
          {canRemoveClass ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground"
              onClick={onRemoveClass}
              aria-label="Remove this class row"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <span className="inline-block w-9" aria-hidden />
          )}
        </div>
      </div>
      {sectionErrorMsg ? <p className="text-xs text-destructive">{sectionErrorMsg}</p> : null}
    </div>
  );
}

export function classesFromApiUser(user: ApiUser): z.infer<typeof classPlacementRowsSchema> {
  if (user.teaching_classes?.length) {
    return user.teaching_classes.map((c) => ({
      grade: c.grade,
      sections: (c.sections ?? []).map((s) => ({ value: s })),
    }));
  }
  return [{ grade: "", sections: [{ value: "" }] }];
}
