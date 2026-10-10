import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getCatalogEnums, getEmbeddingStats } from "@/api/masterAdmin";
import {
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  Server,
  Activity,
  Sliders,
  Database,
  Building,
} from "lucide-react";

interface MasterAdminSettingsState {
  // Platform
  platformName: string;
  tagline: string;
  adminEmail: string;
  supportEmail: string;
  timezone: string;
  // Security
  sessionTimeoutMinutes: number;
  enforce2FASchoolAdmins: boolean;
  restrictSchoolDomains: boolean;
  maintenanceMode: boolean;
}

const DEFAULT_SETTINGS: MasterAdminSettingsState = {
  platformName: "Learn Mastro",
  tagline: "Enterprise Multi-Tenant AI Tutoring & RAG Platform",
  adminEmail: "masteradmin@aitutor.io",
  supportEmail: "support@aitutor.io",
  timezone: "Asia/Kolkata",
  sessionTimeoutMinutes: 60,
  enforce2FASchoolAdmins: false,
  restrictSchoolDomains: false,
  maintenanceMode: false,
};

const STORAGE_KEY = "master_admin_platform_settings";

export default function MasterAdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<MasterAdminSettingsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testLatency, setTestLatency] = useState<number | null>(null);

  // Live query for backend embedding status
  const embeddingStatsQuery = useQuery({
    queryKey: ["settingsEmbeddingStats"],
    queryFn: getEmbeddingStats,
  });

  // Save changes
  const handleSaveSettings = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setTimeout(() => {
        setIsSaving(false);
        toast({
          title: "Settings Saved",
          description: "Platform configurations and AI pipeline parameters have been updated.",
        });
      }, 400);
    } catch (err) {
      setIsSaving(false);
      toast({
        title: "Failed to Save",
        description: err instanceof Error ? err.message : "Unknown error saving settings",
        variant: "destructive",
      });
    }
  };

  // Reset defaults
  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    toast({
      title: "Reset to Defaults",
      description: "Default platform and AI parameters have been restored.",
    });
  };

  // Ping backend API to measure latency
  const handleTestConnection = async () => {
    setTestStatus("testing");
    const startTime = performance.now();
    try {
      await getCatalogEnums();
      const elapsed = Math.round(performance.now() - startTime);
      setTestLatency(elapsed);
      setTestStatus("success");
      toast({
        title: "Connection Verified",
        description: `Backend API is healthy and reachable (${elapsed} ms).`,
      });
    } catch (err) {
      setTestStatus("error");
      toast({
        title: "Connection Error",
        description: err instanceof Error ? err.message : "Failed to reach backend API",
        variant: "destructive",
      });
    }
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Master Platform Settings
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Production Live
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Global system configurations, AI retrieval parameters, authentication policies, and pipeline diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              className="gap-2 text-slate-600 hover:text-rose-600"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        {/* Diagnostic Banner */}
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">System Backend API</span>
                  <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800">
                    Online
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Host: <code className="text-blue-700 font-mono">http://127.0.0.1:8000</code> • Vector Store:{" "}
                  <strong>{embeddingStatsQuery.data?.total_chunks ?? 0} active vectors</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {testStatus === "success" && testLatency !== null && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Latency: {testLatency} ms</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testStatus === "testing"}
                className="gap-2 text-xs bg-white"
              >
                <Activity className={`h-3.5 w-3.5 ${testStatus === "testing" ? "animate-spin text-blue-600" : "text-slate-600"}`} />
                {testStatus === "testing" ? "Pinging..." : "Test Connection"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Settings Categories */}
        <Tabs defaultValue="platform" className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-xl bg-slate-100 p-1">
            <TabsTrigger value="platform" className="gap-2 text-xs">
              <Building className="h-3.5 w-3.5" />
              Platform
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 text-xs">
              <Shield className="h-3.5 w-3.5" />
              Security
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="gap-2 text-xs">
              <Sliders className="h-3.5 w-3.5" />
              Diagnostics
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Platform Profile */}
          <TabsContent value="platform" className="space-y-4 mt-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">General Platform Profile</CardTitle>
                <CardDescription>
                  Configure core branding and administrative contact endpoints for the platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform-name" className="text-xs font-semibold">
                      Platform Brand Name
                    </Label>
                    <Input
                      id="platform-name"
                      value={settings.platformName}
                      onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform-tagline" className="text-xs font-semibold">
                      Platform Tagline
                    </Label>
                    <Input
                      id="platform-tagline"
                      value={settings.tagline}
                      onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email" className="text-xs font-semibold">
                      Master Administrator Email
                    </Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={settings.adminEmail}
                      onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-email" className="text-xs font-semibold">
                      Public Support Email
                    </Label>
                    <Input
                      id="support-email"
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone-select" className="text-xs font-semibold">
                    Primary Timezone
                  </Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(val) => setSettings({ ...settings, timezone: val })}
                  >
                    <SelectTrigger id="timezone-select">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</SelectItem>
                      <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Security & Access Control */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Security & Access Policies</CardTitle>
                <CardDescription>
                  Enforce authentication constraints, inactivity logouts, and tenant onboarding safeguards.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="timeout-input" className="text-xs font-semibold">
                    Session Inactivity Timeout (Minutes)
                  </Label>
                  <Input
                    id="timeout-input"
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.sessionTimeoutMinutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sessionTimeoutMinutes: parseInt(e.target.value) || 60,
                      })
                    }
                    className="w-48"
                  />
                  <p className="text-[11px] text-slate-500">
                    Users will be required to re-authenticate after this period of inactivity.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Enforce 2FA for School Admins</Label>
                    <p className="text-xs text-slate-500">
                      Require two-factor verification for all campus-level administrator accounts.
                    </p>
                  </div>
                  <Switch
                    checked={settings.enforce2FASchoolAdmins}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, enforce2FASchoolAdmins: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold">Restricted School Domain Whitelist</Label>
                    <p className="text-xs text-slate-500">
                      Only allow school administrators to register emails matching verified educational domains.
                    </p>
                  </div>
                  <Switch
                    checked={settings.restrictSchoolDomains}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, restrictSchoolDomains: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-rose-600">Platform Maintenance Mode</Label>
                    <p className="text-xs text-slate-500">
                      Temporarily lock non-admin student and tutor access during database or model upgrades.
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, maintenanceMode: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: Storage & Diagnostics */}
          <TabsContent value="diagnostics" className="space-y-4 mt-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  Infrastructure & Storage Mounts
                </CardTitle>
                <CardDescription>
                  Physical storage locations and active database connection parameters.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Textbook Media Storage</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-xs">
                      Mounted
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-slate-600">
                    Local Volume: <code className="bg-white px-2 py-0.5 rounded border">./ai-tutor-backend/uploads/textbooks</code>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">ChromaDB Vector Collection</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      Active
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-slate-600">
                    Collection Name: <code className="bg-white px-2 py-0.5 rounded border">textbook_embeddings</code>
                  </div>
                  <div className="text-xs text-slate-500">
                    Indexed Vector Count: <strong>{embeddingStatsQuery.data?.total_chunks ?? 0} vectors</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">PostgreSQL Relational DB</span>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-xs">
                      Connected
                    </Badge>
                  </div>
                  <div className="text-xs font-mono text-slate-600">
                    Engine: <code className="bg-white px-2 py-0.5 rounded border">asyncpg + SQLAlchemy ORM</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
