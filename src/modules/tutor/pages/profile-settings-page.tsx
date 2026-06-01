import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

export default function TutorProfileSettingsPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Profile Settings</h1>
      <Card>
        <CardHeader><CardTitle>Tutor Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" defaultValue={user?.fullName || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue={user?.email || ""} />
          </div>
          <Button>Save Profile</Button>
        </CardContent>
      </Card>
    </div>
  );
}
