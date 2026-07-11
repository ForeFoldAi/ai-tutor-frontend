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
  onChange: (patch: Partial<StudentFilters>) => void;
  onClear: () => void;
}

export function StudentsFilters({ filters, onChange, onClear }: StudentsFiltersProps) {
  return (
    <>
      <div className="min-w-[130px] space-y-1.5">
        <Label className="text-xs text-muted-foreground">Grade</Label>
        <Select value={filters.grade} onValueChange={(value) => onChange({ grade: value })}>
          <SelectTrigger className="h-9 !border !border-slate-300 bg-background hover:!border-slate-400">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            <SelectItem value="6">Grade 6</SelectItem>
            <SelectItem value="7">Grade 7</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[130px] space-y-1.5">
        <Label className="text-xs text-muted-foreground">Subject</Label>
        <Select value={filters.subject} onValueChange={(value) => onChange({ subject: value })}>
          <SelectTrigger className="h-9 !border !border-slate-300 bg-background hover:!border-slate-400">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            <SelectItem value="Mathematics">Mathematics</SelectItem>
            <SelectItem value="Science">Science</SelectItem>
            <SelectItem value="English">English</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-[130px] space-y-1.5">
        <Label className="text-xs text-muted-foreground">Risk Level</Label>
        <Select value={filters.riskLevel} onValueChange={(value) => onChange({ riskLevel: value })}>
          <SelectTrigger className="h-9 !border !border-slate-300 bg-background hover:!border-slate-400">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="High">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <button
        type="button"
        className="h-9 shrink-0 text-sm font-medium text-primary hover:underline"
        onClick={onClear}
      >
        Clear Filters
      </button>
    </>
  );
}
