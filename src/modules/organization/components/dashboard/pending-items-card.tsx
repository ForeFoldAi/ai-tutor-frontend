import { AlertTriangle, Mail, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PendingItem } from "@/modules/organization/types/dashboard";

interface PendingItemsCardProps {
  items: PendingItem[];
}

const ICON_MAP = {
  assignments: UserCog,
  credentials: Mail,
  mapping: AlertTriangle,
};

const BADGE_STYLES = {
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-600",
};

const ICON_STYLES = {
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

export function PendingItemsCard({ items }: PendingItemsCardProps) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-100">
          Pending Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon];
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={`rounded-lg p-2 ${ICON_STYLES[item.severity]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-medium text-blue-900 dark:text-blue-100">{item.label}</p>
              </div>
              <Badge variant="outline" className={`shrink-0 ${BADGE_STYLES[item.severity]}`}>
                {item.count}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
