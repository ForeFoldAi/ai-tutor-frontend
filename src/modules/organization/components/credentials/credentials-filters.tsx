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
import type { CredentialFilters } from "@/modules/organization/types/credentials";

interface CredentialsFiltersProps {
  filters: CredentialFilters;
  onChange: (patch: Partial<CredentialFilters>) => void;
  onClear: () => void;
  /** Individual tutors only manage students — hide Teacher role. */
  hideTeacherRole?: boolean;
}

export function CredentialsFilters({
  filters,
  onChange,
  onClear,
  hideTeacherRole = false,
}: CredentialsFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-1.5 rounded-xl border border-border/70 bg-muted/20 p-2 sm:gap-2 sm:p-3">
      <div className="relative min-w-0 flex-1 basis-full space-y-1 sm:basis-auto sm:min-w-[200px] md:min-w-[240px]">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:h-4 sm:w-4" />
          <Input
            placeholder="Search name or user ID..."
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            className="h-8 !border !border-slate-300 bg-background pl-8 text-sm hover:!border-slate-400 focus-visible:!border-primary sm:h-9 sm:pl-9"
          />
        </div>
      </div>

      <div className="min-w-[6.5rem] flex-1 space-y-1 sm:min-w-[120px] sm:flex-none">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Role</Label>
        <Select value={filters.role} onValueChange={(value) => onChange({ role: value as CredentialFilters["role"] })}>
          <SelectTrigger className="h-8 !border !border-slate-300 bg-background text-xs hover:!border-slate-400 sm:h-9 sm:text-sm">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {!hideTeacherRole ? <SelectItem value="Teacher">Teacher</SelectItem> : null}
            <SelectItem value="Student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[6.5rem] flex-1 space-y-1 sm:min-w-[130px] sm:flex-none">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">First Login</Label>
        <Select value={filters.firstLoginStatus} onValueChange={(value) => onChange({ firstLoginStatus: value as CredentialFilters["firstLoginStatus"] })}>
          <SelectTrigger className="h-8 !border !border-slate-300 bg-background text-xs hover:!border-slate-400 sm:h-9 sm:text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Not Started">Not Started</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[6.5rem] flex-1 space-y-1 sm:min-w-[130px] sm:flex-none">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Delivery</Label>
        <Select value={filters.deliveryStatus} onValueChange={(value) => onChange({ deliveryStatus: value as CredentialFilters["deliveryStatus"] })}>
          <SelectTrigger className="h-8 !border !border-slate-300 bg-background text-xs hover:!border-slate-400 sm:h-9 sm:text-sm">
            <SelectValue placeholder="All Delivery" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Delivery</SelectItem>
            <SelectItem value="Email Sent">Email Sent</SelectItem>
            <SelectItem value="In Process">In Process</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            <SelectItem value="Not Sent">Not Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[6.5rem] flex-1 space-y-1 sm:min-w-[120px] sm:flex-none">
        <Label className="text-[10px] text-muted-foreground sm:text-xs">Shared</Label>
        <Select value={filters.shared} onValueChange={(value) => onChange({ shared: value as CredentialFilters["shared"] })}>
          <SelectTrigger className="h-8 !border !border-slate-300 bg-background text-xs hover:!border-slate-400 sm:h-9 sm:text-sm">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="shared">Shared</SelectItem>
            <SelectItem value="not_shared">Not Shared</SelectItem>
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
    </div>
  );
}
