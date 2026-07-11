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
}

export function CredentialsFilters({ filters, onChange, onClear }: CredentialsFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border/70 bg-muted/20 p-2.5 sm:p-3">
      <div className="relative min-w-[160px] flex-1 space-y-1 sm:min-w-[200px]">
        <Label className="text-xs text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or user ID..."
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            className="h-10 !border !border-slate-300 bg-background pl-9 hover:!border-slate-400 focus-visible:!border-primary"
          />
        </div>
      </div>

      <div className="min-w-[120px] space-y-1">
        <Label className="text-xs text-muted-foreground">Role</Label>
        <Select value={filters.role} onValueChange={(value) => onChange({ role: value })}>
          <SelectTrigger className="h-10 !border !border-slate-300 bg-background hover:!border-slate-400">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Teacher">Teacher</SelectItem>
            <SelectItem value="Student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[130px] space-y-1">
        <Label className="text-xs text-muted-foreground">First Login</Label>
        <Select value={filters.firstLoginStatus} onValueChange={(value) => onChange({ firstLoginStatus: value })}>
          <SelectTrigger className="h-10 !border !border-slate-300 bg-background hover:!border-slate-400">
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

      <div className="min-w-[130px] space-y-1">
        <Label className="text-xs text-muted-foreground">Delivery</Label>
        <Select value={filters.deliveryStatus} onValueChange={(value) => onChange({ deliveryStatus: value })}>
          <SelectTrigger className="h-10 !border !border-slate-300 bg-background hover:!border-slate-400">
            <SelectValue placeholder="All Delivery" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Delivery</SelectItem>
            <SelectItem value="Email Sent">Email Sent</SelectItem>
            <SelectItem value="SMS Sent">SMS Sent</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Not Sent">Not Sent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[130px] space-y-1">
        <Label className="text-xs text-muted-foreground">Shared</Label>
        <Select value={filters.shared} onValueChange={(value) => onChange({ shared: value })}>
          <SelectTrigger className="h-10 !border !border-slate-300 bg-background hover:!border-slate-400">
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
        className="h-10 shrink-0 text-sm font-medium text-primary hover:underline"
        onClick={onClear}
      >
        Clear Filters
      </button>
    </div>
  );
}
