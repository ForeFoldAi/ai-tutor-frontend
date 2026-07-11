import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SchoolStudentFilters } from "@/modules/organization/types/org-student-profile";

interface StudentsAdminFiltersProps {
  filters: SchoolStudentFilters;
  onChange: (patch: Partial<SchoolStudentFilters>) => void;
  onClear: () => void;
}

export function StudentsAdminFilters({ filters, onChange, onClear }: StudentsAdminFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
      <div className="relative min-w-[180px] flex-1 space-y-1.5 sm:min-w-[220px]">
        <Label className="text-xs text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            className="h-10 !border !border-slate-300 bg-background pl-9 hover:!border-slate-400 focus-visible:!border-primary"
          />
        </div>
      </div>

      <div className="min-w-[130px] space-y-1.5">
        <Label className="text-xs text-muted-foreground">Grade</Label>
        <Select value={filters.grade} onValueChange={(value) => onChange({ grade: value })}>
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            <SelectItem value="6">Grade 6</SelectItem>
            <SelectItem value="7">Grade 7</SelectItem>
            <SelectItem value="8">Grade 8</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[130px] space-y-1.5">
        <Label className="text-xs text-muted-foreground">Section</Label>
        <Select value={filters.section} onValueChange={(value) => onChange({ section: value })}>
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            <SelectItem value="A">Section A</SelectItem>
            <SelectItem value="B">Section B</SelectItem>
            <SelectItem value="C">Section C</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[140px] space-y-1.5">
        <Label className="text-xs text-muted-foreground">Curriculum</Label>
        <Select value={filters.curriculum} onValueChange={(value) => onChange({ curriculum: value })}>
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="All Curriculums" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Curriculums</SelectItem>
            <SelectItem value="CBSE">CBSE</SelectItem>
            <SelectItem value="ICSE">ICSE</SelectItem>
            <SelectItem value="State Board">State Board</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[150px] space-y-1.5">
        <Label className="text-xs text-muted-foreground">Learning Type</Label>
        <Select value={filters.learningType} onValueChange={(value) => onChange({ learningType: value })}>
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Teacher Guided">Teacher Guided</SelectItem>
            <SelectItem value="Self Learning">Self Learning</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <button
        type="button"
        className="h-10 shrink-0 text-sm font-medium text-primary hover:underline"
        onClick={onClear}
      >
        Clear Filters
      </button>
    </div>
  );
}
