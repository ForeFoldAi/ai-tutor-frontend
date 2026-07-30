import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, MoreVertical, Users, GraduationCap, Shield, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
}

const allUsers: User[] = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", role: "student", status: "active", createdAt: "2024-01-15" },
  { id: "2", name: "Dr. Smith", email: "smith@example.com", role: "tutor", status: "active", createdAt: "2024-01-10" },
  { id: "3", name: "Bob Admin", email: "bob@example.com", role: "school_admin", status: "active", createdAt: "2024-01-05" },
  { id: "4", name: "Carol Master", email: "carol@example.com", role: "master_admin", status: "active", createdAt: "2024-01-01" },
  { id: "5", name: "David Student", email: "david@example.com", role: "student", status: "inactive", createdAt: "2024-01-12" },
];

const roleConfig = {
  student: { label: "Student", color: "bg-primary", icon: GraduationCap },
  tutor: { label: "Tutor", color: "bg-accent", icon: Users },
  school_admin: { label: "School Admin", color: "bg-muted-foreground", icon: UserCog },
  master_admin: { label: "Master Admin", color: "bg-destructive", icon: Shield },
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === "all") return matchesSearch;
    return matchesSearch && u.role === activeTab;
  });

  return (
    <PageShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">User Management</h1>
          <p className="text-muted-foreground">Manage all platform users.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:w-64"
              data-testid="input-search-users"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button>Add User</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(roleConfig).map(([key, config]) => {
          const count = allUsers.filter((u) => u.role === key).length;
          const Icon = config.icon;
          return (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-lg", config.color + "/10")}>
                    <Icon className={cn("h-6 w-6", config.color.replace("bg-", "text-"))} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">{config.label}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="student">Students</TabsTrigger>
              <TabsTrigger value="tutor">Tutors</TabsTrigger>
              <TabsTrigger value="school_admin">School Admins</TabsTrigger>
              <TabsTrigger value="master_admin">Master Admins</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const config = roleConfig[user.role as keyof typeof roleConfig];
                  return (
                    <div
                      key={user.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg border bg-card hover-elevate transition-all"
                      data-testid={`user-row-${user.id}`}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className={cn(config.color, "text-white")}>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium">{user.name}</h3>
                            <Badge className={config.color}>{config.label}</Badge>
                            <Badge
                              variant={user.status === "active" ? "outline" : "secondary"}
                              className={user.status === "active" ? "border-green-500 text-green-600" : ""}
                            >
                              {user.status}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="text-sm text-muted-foreground hidden sm:block">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Edit User</DropdownMenuItem>
                            <DropdownMenuItem>Change Role</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageShell>
  );
}
