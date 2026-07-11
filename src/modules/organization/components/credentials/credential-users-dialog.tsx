import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownAZ, ArrowUpAZ, KeyRound, Mail, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_CREDENTIAL_CANDIDATES } from "@/modules/organization/data/demo-credential-candidates";
import type { AddCredsCandidateFilters, CredentialCandidate, CredentialRole } from "@/modules/organization/types/credentials";
import {
  DEFAULT_ADD_CREDS_FILTERS,
  filterCredentialCandidates,
} from "@/modules/organization/utils/credentials-helpers";

const SELECT_CLASS = "h-10 w-full !border !border-slate-300 bg-background hover:!border-slate-400";

export type CredentialUsersDialogVariant = "add" | "send";

export interface CredentialUsersSubmitValues {
  role: CredentialRole;
  users: CredentialCandidate[];
}

const VARIANT_CONFIG: Record<
  CredentialUsersDialogVariant,
  { title: string; description: string; submitLabel: string; icon: LucideIcon }
> = {
  add: {
    title: "Add Credentials",
    description: "Select a role, filter the list, choose users, then generate credentials.",
    submitLabel: "Generate",
    icon: KeyRound,
  },
  send: {
    title: "Send Credentials",
    description: "Select a role, filter the list, choose users, then send their credentials.",
    submitLabel: "Send",
    icon: Mail,
  },
};

function defaultFiltersForVariant(variant: CredentialUsersDialogVariant): AddCredsCandidateFilters {
  return {
    ...DEFAULT_ADD_CREDS_FILTERS,
    credentialStatus: variant === "send" ? "has" : "needs",
  };
}

interface CredentialUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: CredentialUsersDialogVariant;
  onSubmit: (values: CredentialUsersSubmitValues) => void;
}

export function CredentialUsersDialog({ open, onOpenChange, variant, onSubmit }: CredentialUsersDialogProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const [role, setRole] = useState<CredentialRole>("Student");
  const [filters, setFilters] = useState<AddCredsCandidateFilters>(() => defaultFiltersForVariant(variant));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visibleUsers = useMemo(
    () => filterCredentialCandidates(DEMO_CREDENTIAL_CANDIDATES, role, filters),
    [role, filters],
  );

  const resetState = () => {
    setRole("Student");
    setFilters(defaultFiltersForVariant(variant));
    setSelectedIds(new Set());
  };

  useEffect(() => {
    if (open) resetState();
  }, [open, variant]);

  useEffect(() => {
    setSelectedIds(new Set());
    setFilters((prev) => ({ ...prev, grade: "all", section: "all" }));
  }, [role]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(visibleUsers.map((u) => u.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleClose = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  const handleSubmit = () => {
    const users = DEMO_CREDENTIAL_CANDIDATES.filter((u) => selectedIds.has(u.id));
    if (users.length === 0) return;
    onSubmit({ role, users });
    resetState();
    onOpenChange(false);
  };

  const patchFilters = (patch: Partial<AddCredsCandidateFilters>, resetSelection = true) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    if (resetSelection) setSelectedIds(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-3 border-b border-border p-4 md:border-b-0 md:border-r">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as CredentialRole)}>
                <SelectTrigger className={SELECT_CLASS}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Teacher">Teacher</SelectItem>
                  <SelectItem value="Student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "Student" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Grade</Label>
                  <Select value={filters.grade} onValueChange={(v) => patchFilters({ grade: v })}>
                    <SelectTrigger className={SELECT_CLASS}>
                      <SelectValue placeholder="All grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="6">Grade 6</SelectItem>
                      <SelectItem value="7">Grade 7</SelectItem>
                      <SelectItem value="8">Grade 8</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Section</Label>
                  <Select value={filters.section} onValueChange={(v) => patchFilters({ section: v })}>
                    <SelectTrigger className={SELECT_CLASS}>
                      <SelectValue placeholder="All sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      <SelectItem value="A">Section A</SelectItem>
                      <SelectItem value="B">Section B</SelectItem>
                      <SelectItem value="C">Section C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Credential Status</Label>
              <Select
                value={filters.credentialStatus}
                onValueChange={(v) =>
                  patchFilters({ credentialStatus: v as AddCredsCandidateFilters["credentialStatus"] })
                }
              >
                <SelectTrigger className={SELECT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="needs">Needs credentials</SelectItem>
                  <SelectItem value="has">Has credentials</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sort</Label>
              <Select
                value={filters.sort}
                onValueChange={(v) => patchFilters({ sort: v as AddCredsCandidateFilters["sort"] })}
              >
                <SelectTrigger className={SELECT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">
                    <span className="flex items-center gap-1.5">
                      <ArrowDownAZ className="h-3.5 w-3.5" />
                      Name A–Z
                    </span>
                  </SelectItem>
                  <SelectItem value="name_desc">
                    <span className="flex items-center gap-1.5">
                      <ArrowUpAZ className="h-3.5 w-3.5" />
                      Name Z–A
                    </span>
                  </SelectItem>
                  <SelectItem value="user_id_asc">User ID A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full text-primary"
              onClick={() => patchFilters(defaultFiltersForVariant(variant))}
            >
              Clear filters
            </Button>
          </aside>

          <section className="flex min-h-[320px] flex-col p-4">
            <div className="relative space-y-1.5">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={`Search ${role.toLowerCase()}s by name or user ID...`}
                  value={filters.search}
                  onChange={(e) => patchFilters({ search: e.target.value }, false)}
                  className="h-10 !border !border-slate-300 bg-background pl-9 hover:!border-slate-400 focus-visible:!border-primary"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {visibleUsers.length} {role.toLowerCase()}
                {visibleUsers.length === 1 ? "" : "s"} · {selectedIds.size} selected
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-primary"
                  disabled={visibleUsers.length === 0}
                  onClick={selectAllVisible}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground"
                  disabled={selectedIds.size === 0}
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-border/70 p-2">
              {visibleUsers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No {role.toLowerCase()}s match your filters.
                </p>
              ) : (
                visibleUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{user.name}</p>
                        {user.hasCredentials ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[10px] text-emerald-700"
                          >
                            Has credentials
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700"
                          >
                            Needs credentials
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {user.userId}
                        {user.detail ? ` · ${user.detail}` : ""}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={selectedIds.size === 0} onClick={handleSubmit}>
            {config.submitLabel} {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
