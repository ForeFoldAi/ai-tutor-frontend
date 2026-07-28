import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StudentFilters } from "@/modules/tutor/types/student-profile";

interface StudentsFiltersProps {
  filters: StudentFilters;
  grades: string[];
  subjects: string[];
  riskLevels: string[];
  onChange: (patch: Partial<StudentFilters>) => void;
  onClear: () => void;
}

export function StudentsFilters({
  filters,
  grades,
  subjects,
  riskLevels,
  onChange,
  onClear,
}: StudentsFiltersProps) {
  return (
    <>
      <div className="min-w-[6.5rem] flex-1 space-y-1 sm:min-w-[120px] sm:flex-none">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Grade</Label>
        <Select value={filters.grade} onValueChange={(value) => onChange({ grade: value })}>
          <SelectTrigger className="h-8 !border !border-slate-300 bg-background text-xs hover:!border-slate-400 sm:h-9 sm:text-sm">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((grade) => (
              <SelectItem key={grade} value={grade}>
                Grade {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[6.5rem] flex-1 space-y-1 sm:min-w-[120px] sm:flex-none">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Subject</Label>
        <Select value={filters.subject} onValueChange={(value) => onChange({ subject: value })}>
          <SelectTrigger className="h-8 !border !border-slate-300 bg-background text-xs hover:!border-slate-400 sm:h-9 sm:text-sm">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[6.5rem] flex-1 space-y-1 sm:min-w-[120px] sm:flex-none">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Risk Level</Label>
        <Select value={filters.riskLevel} onValueChange={(value) => onChange({ riskLevel: value })}>
          <SelectTrigger className="h-8 !border !border-slate-300 bg-background text-xs hover:!border-slate-400 sm:h-9 sm:text-sm">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {riskLevels.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <button
        type="button"
        className="h-8 shrink-0 text-xs font-medium text-primary hover:underline sm:h-9 sm:text-sm"
        onClick={onClear}
      >
        Clear
        <span className="hidden sm:inline"> Filters</span>
      </button>
    </>
  );
}
