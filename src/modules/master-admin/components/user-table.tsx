import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiUser } from "@/api/types";

interface UserTableProps {
  title: string;
  users: ApiUser[];
  onToggleStatus?: (user: ApiUser) => void;
}

export function UserTable({ title, users, onToggleStatus }: UserTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={user.is_active ? "default" : "secondary"}>{user.role}</Badge>
              {onToggleStatus ? (
                <Button variant="outline" size="sm" onClick={() => onToggleStatus(user)}>
                  {user.is_active ? "Deactivate" : "Activate"}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
