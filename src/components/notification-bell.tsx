import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
  getUnreadNotificationCount,
  listNotifications,
  markNotificationsRead,
  sendMasterNotification,
  type AppNotification,
} from "@/api/notifications";
import { getMasterAdminSchools } from "@/api/masterAdmin";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/schema";
import { useToast } from "@/hooks/use-toast";

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = Math.max(0, now - d.getTime());
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

type NotificationBellProps = {
  className?: string;
  buttonClassName?: string;
  "data-testid"?: string;
};

export function NotificationBell({
  className,
  buttonClassName,
  "data-testid": testId = "notification-bell",
}: NotificationBellProps) {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const isMaster = role === UserRole.MASTER_ADMIN;
  const [open, setOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const listQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => listNotifications(50),
    enabled: open,
  });

  const schoolsQuery = useQuery({
    queryKey: ["master-admin", "schools"],
    queryFn: getMasterAdminSchools,
    enabled: open && isMaster && composeOpen,
  });

  const markMutation = useMutation({
    mutationFn: (ids?: number[]) => markNotificationsRead(ids),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: sendMasterNotification,
    onSuccess: async (res) => {
      toast({ title: "Sent", description: `Notified ${res.created} school admin(s).` });
      setTitle("");
      setBody("");
      setSelected(new Set());
      setComposeOpen(false);
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not send",
        description: err.message || "Try again.",
        variant: "destructive",
      });
    },
  });

  const unread = unreadQuery.data?.count ?? 0;
  const items = listQuery.data?.items ?? [];

  const adminOptions = useMemo(() => {
    const schools = schoolsQuery.data ?? [];
    return schools.flatMap((s) =>
      (s.school_admins ?? [])
        .filter((a) => a.is_active)
        .map((a) => ({
          id: a.id,
          label: `${a.full_name} · ${s.name}`,
          email: a.email,
        })),
    );
  }, [schoolsQuery.data]);

  const onItemClick = async (n: AppNotification) => {
    if (!n.read_at) {
      await markMutation.mutateAsync([n.id]);
    }
    setOpen(false);
    if (n.link) setLocation(n.link);
  };

  const toggleAdmin = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const sendCompose = () => {
    const recipient_ids = [...selected];
    if (!recipient_ids.length || !title.trim() || !body.trim()) {
      toast({
        title: "Missing fields",
        description: "Pick at least one school admin, and add a title and message.",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate({
      recipient_ids,
      title: title.trim(),
      body: body.trim(),
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn("relative", buttonClassName)}
          aria-label="Notifications"
          data-testid={testId}
        >
          <Bell className={cn("h-4 w-4 text-muted-foreground", className)} />
          {unread > 0 ? (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background"
              data-testid={`${testId}-unread-dot`}
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-1.5rem,22rem)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex items-center gap-1">
            {isMaster ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setComposeOpen((v) => !v)}
                data-testid={`${testId}-compose-toggle`}
              >
                {composeOpen ? "Inbox" : "Notify"}
              </Button>
            ) : null}
            {unread > 0 && !composeOpen ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={markMutation.isPending}
                onClick={() => markMutation.mutate(undefined)}
                data-testid={`${testId}-mark-all`}
              >
                Mark all read
              </Button>
            ) : null}
          </div>
        </div>

        {isMaster && composeOpen ? (
          <div className="space-y-2 p-3" data-testid={`${testId}-compose`}>
            <p className="text-xs text-muted-foreground">Send a message to school admin(s).</p>
            <ScrollArea className="h-28 rounded-md border border-border p-2">
              {schoolsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading admins…</p>
              ) : adminOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No school admins found.</p>
              ) : (
                <ul className="space-y-1.5">
                  {adminOptions.map((a) => (
                    <li key={a.id} className="flex items-start gap-2">
                      <Checkbox
                        id={`notify-admin-${a.id}`}
                        checked={selected.has(a.id)}
                        onCheckedChange={(v) => toggleAdmin(a.id, v === true)}
                      />
                      <label htmlFor={`notify-admin-${a.id}`} className="min-w-0 cursor-pointer text-xs leading-snug">
                        <span className="font-medium">{a.label}</span>
                        <span className="block truncate text-muted-foreground">{a.email}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              data-testid={`${testId}-compose-title`}
            />
            <Textarea
              placeholder="Message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={3}
              data-testid={`${testId}-compose-body`}
            />
            <Button
              size="sm"
              className="w-full"
              disabled={sendMutation.isPending}
              onClick={sendCompose}
              data-testid={`${testId}-compose-send`}
            >
              {sendMutation.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-72">
            {listQuery.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                        !n.read_at && "bg-muted/30",
                      )}
                      onClick={() => void onItemClick(n)}
                      data-testid={`${testId}-item-${n.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-snug">{n.title}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatWhen(n.created_at)}
                        </span>
                      </div>
                      {n.body ? (
                        <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
