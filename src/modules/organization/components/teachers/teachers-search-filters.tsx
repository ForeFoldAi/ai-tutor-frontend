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
  onChange: (patch: Partial<TeacherFilters>) => void;
  onClear: () => void;
}

export function TeachersSearchFilters({ filters, onChange, onClear }: TeachersSearchFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
      <div className="relative min-w-[180px] flex-1 space-y-1.5 sm:min-w-[260px]">
        <Label className="text-xs text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            className="h-10 !border !border-slate-300 bg-background pl-9 hover:!border-slate-400 focus-visible:!border-primary"
          />
        </div>
      </div>

      <div className="min-w-[130px] space-y-1.5">
        <Label className="text-xs text-muted-foreground">Subject</Label>
        <Select value={filters.subject} onValueChange={(value) => onChange({ subject: value })}>
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            <SelectItem value="Mathematics">Mathematics</SelectItem>
            <SelectItem value="Science">Science</SelectItem>
            <SelectItem value="English">English</SelectItem>
            <SelectItem value="Social Studies">Social Studies</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[130px] space-y-1.5">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={filters.status} onValueChange={(value) => onChange({ status: value })}>
          <SelectTrigger className="h-10 bg-background">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" aria-label="Filter teachers">
        <Filter className="h-4 w-4" />
      </Button>

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
