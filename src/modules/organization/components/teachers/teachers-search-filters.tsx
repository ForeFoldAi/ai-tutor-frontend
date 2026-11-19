import { Filter, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeacherFilters } from "@/modules/organization/types/teacher-profile";

interface TeachersSearchFiltersProps {
  filters: TeacherFilters;
  subjects: string[];
  onChange: (patch: Partial<TeacherFilters>) => void;
  onClear: () => void;
}

export function TeachersSearchFilters({ filters, subjects, onChange, onClear }: TeachersSearchFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-1.5 rounded-xl border border-border/70 bg-muted/20 p-2 sm:gap-2 sm:p-3">
      <div className="relative min-w-0 flex-1 basis-full space-y-1 sm:basis-auto sm:min-w-[200px] md:min-w-[240px]">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:h-4 sm:w-4" />
          <Input
            placeholder="Search teachers..."
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            className="h-8 !border !border-slate-300 bg-background pl-8 text-sm hover:!border-slate-400 focus-visible:!border-primary sm:h-9 sm:pl-9"
          />
        </div>
      </div>

      <div className="min-w-[6.5rem] flex-1 space-y-1 sm:min-w-[120px] sm:flex-none">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Subject</Label>
        <Select value={filters.subject} onValueChange={(value) => onChange({ subject: value })}>
          <SelectTrigger className="h-8 bg-background text-xs sm:h-9 sm:text-sm">
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
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Status</Label>
        <Select value={filters.status} onValueChange={(value) => onChange({ status: value })}>
          <SelectTrigger className="h-8 bg-background text-xs sm:h-9 sm:text-sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" aria-label="Filter teachers">
        <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>

      <button
        type="button"
        className="h-8 shrink-0 text-xs font-medium text-primary hover:underline sm:h-9 sm:text-sm"
        onClick={onClear}
      >
        Clear
        <span className="hidden sm:inline"> Filters</span>
      </button>
    </div>
  );
}
