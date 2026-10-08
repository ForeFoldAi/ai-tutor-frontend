import { Eye, Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getClassTextbookOptions, saveClassSubjects } from "@/api/classes";
import type { ClassTextbookOption } from "@/api/types";
import { useToast } from "@/hooks/use-toast";
import { invalidateManyAndBroadcast } from "@/lib/query-broadcast";
import type { ClassOverviewItem, SubjectItem } from "@/modules/organization/types/classes-admin";
import { classSubjectMappingKey, subjectTaggedPlacements } from "@/modules/organization/utils/classes-subject-helpers";

interface SubjectsAdminTableProps {
  subjects: SubjectItem[];
  classes: ClassOverviewItem[];
  subjectMappings: Record<string, Record<string, boolean>>;
  /** class mapping key -> subject id -> chosen non-default textbook id */
  textbookChoices?: Record<string, Record<string, number>>;
  onEdit: (subject: SubjectItem) => void;
  onDelete: (subject: SubjectItem) => void;
}

const headClass =
  "h-9 px-2 text-xs font-semibold text-foreground sm:h-12 sm:px-4 sm:text-sm";
const cellClass = "px-2 py-2 text-xs sm:p-4 sm:text-sm";
const DEFAULT_BOOK = "default";

function PlacementBadges({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">{emptyLabel}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge
          key={item}
          variant="outline"
          className="border-sky-200 bg-sky-50 px-1.5 py-0 text-[10px] font-normal text-sky-700 sm:px-2.5 sm:py-0.5 sm:text-xs"
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

const mappingKeyOf = (cls: ClassOverviewItem) => classSubjectMappingKey(cls.id, cls.curriculums[0] ?? "");

export function SubjectsAdminTable({
  subjects,
  classes,
  subjectMappings,
  textbookChoices = {},
  onEdit,
  onDelete,
}: SubjectsAdminTableProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Only classes with at least one tagged subject need publisher options.
  const taggedClasses = classes.filter((cls) => Object.values(subjectMappings[mappingKeyOf(cls)] ?? {}).some(Boolean));
  const optionQueries = useQueries({
    queries: taggedClasses.map((cls) => ({
      queryKey: ["classes", "textbook-options", cls.id],
      queryFn: () => getClassTextbookOptions(cls.id),
    })),
  });
  const optionsByClass: Record<string, Record<string, ClassTextbookOption[]>> = {};
  taggedClasses.forEach((cls, i) => {
    optionsByClass[cls.id] = optionQueries[i]?.data?.options ?? {};
  });

  const publisherMutation = useMutation({
    mutationFn: ({ cls, subjectId, bookId }: { cls: ClassOverviewItem; subjectId: string; bookId: number | null }) => {
      const mapped = Object.entries(subjectMappings[mappingKeyOf(cls)] ?? {})
        .filter(([, on]) => on)
        .map(([id]) => Number(id));
      return saveClassSubjects(cls.id, mapped, { [Number(subjectId)]: bookId });
    },
    onSuccess: async () => {
      await invalidateManyAndBroadcast(qc, ["classes"]);
      toast({ title: "Publisher updated", description: "Students in this class restart progress for the new book." });
    },
    onError: (err) =>
      toast({
        title: "Could not set publisher",
        description: err instanceof Error ? err.message : "Request failed.",
        variant: "destructive",
      }),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <Table className="min-w-[640px] text-xs sm:min-w-[760px] sm:text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>Subject ID</TableHead>
            <TableHead className={headClass}>Subject Name</TableHead>
            <TableHead className={headClass}>Code</TableHead>
            <TableHead className={headClass}>Tagged Classes</TableHead>
            <TableHead className={headClass}>Sections</TableHead>
            <TableHead className={headClass}>Publisher</TableHead>
            <TableHead className={`${headClass} text-right`}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className={`${cellClass} py-8 text-center text-muted-foreground`}>
                No subjects yet. Use &quot;Add Subject&quot; to create one.
              </TableCell>
            </TableRow>
          ) : (
            subjects.map((subject) => {
              const { grades, sections } = subjectTaggedPlacements(subject.id, classes, subjectMappings);
              const subjectClasses = taggedClasses.filter((cls) => subjectMappings[mappingKeyOf(cls)]?.[subject.id]);
              return (
                <TableRow key={subject.id}>
                  <TableCell className={`${cellClass} font-medium text-muted-foreground`}>
                    {subject.id}
                  </TableCell>
                  <TableCell className={`${cellClass} font-semibold text-blue-900 dark:text-blue-100`}>
                    {subject.name}
                  </TableCell>
                  <TableCell className={`${cellClass} text-muted-foreground`}>{subject.code}</TableCell>
                  <TableCell className={cellClass}>
                    <PlacementBadges items={grades.map((g) => `Grade ${g}`)} emptyLabel="—" />
                  </TableCell>
                  <TableCell className={cellClass}>
                    <PlacementBadges items={sections} emptyLabel="—" />
                  </TableCell>
                  <TableCell className={cellClass}>
                    {subjectClasses.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {subjectClasses.map((cls) => {
                          const publishers = (optionsByClass[cls.id]?.[subject.id] ?? []).filter((b) => !b.is_default);
                          const chosen = textbookChoices[mappingKeyOf(cls)]?.[subject.id];
                          return (
                            <div key={cls.id} className="flex items-center gap-2">
                              <span className="w-12 shrink-0 text-muted-foreground">
                                {cls.grade}-{cls.section}
                              </span>
                              <Select
                                value={chosen ? String(chosen) : DEFAULT_BOOK}
                                disabled={publisherMutation.isPending}
                                onValueChange={(v) =>
                                  v !== DEFAULT_BOOK || chosen
                                    ? publisherMutation.mutate({
                                        cls,
                                        subjectId: subject.id,
                                        bookId: v === DEFAULT_BOOK ? null : Number(v),
                                      })
                                    : undefined
                                }
                              >
                                <SelectTrigger className="h-7 w-36 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={DEFAULT_BOOK}>Default</SelectItem>
                                  {publishers.map((b) => (
                                    <SelectItem key={b.id} value={String(b.id)}>
                                      {b.publisher || b.title}
                                    </SelectItem>
                                  ))}
                                  {publishers.length === 0 && (
                                    <p className="px-2 py-1.5 text-[11px] text-muted-foreground max-w-[220px]">
                                      No publishers yet. The master admin adds them in Textbook Uploads.
                                    </p>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={`${cellClass} text-right`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8"
                          aria-label={`View ${subject.name}`}
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => onEdit(subject)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => {
                            // ponytail: open confirm after menu closes (Radix focus trap)
                            window.setTimeout(() => onDelete(subject), 0);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
