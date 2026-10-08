import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCsv } from "@/modules/master-admin/utils/export-csv";
import {
  getAdminUsers,
  getMasterAdminSchools,
  getTextbookUploads,
  getEmbeddingStats,
} from "@/api/masterAdmin";
import {
  Users,
  Building2,
  Cpu,
  GraduationCap,
  Sparkles,
  Download,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const isCompletedStatus = (status: unknown) => {
  const s = String(status || "").toUpperCase();
  return s === "EMBEDDED" || s === "COMPLETED";
};

const isFailedStatus = (status: unknown) => {
  const s = String(status || "").toUpperCase();
  return s === "FAILED" || s === "ERROR";
};

const isPendingStatus = (status: unknown) => {
  const s = String(status || "").toUpperCase();
  return s === "PENDING" || s === "QUEUED" || s === "PROCESSING";
};

export default function MasterAdminReportsPage() {
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const usersQuery = useQuery({
    queryKey: ["reportsAdminUsers"],
    queryFn: getAdminUsers,
  });

  const schoolsQuery = useQuery({
    queryKey: ["reportsAdminSchools"],
    queryFn: getMasterAdminSchools,
  });

  const uploadsQuery = useQuery({
    queryKey: ["reportsTextbookUploads"],
    queryFn: getTextbookUploads,
  });

  const embeddingStatsQuery = useQuery({
    queryKey: ["reportsEmbeddingStats"],
    queryFn: getEmbeddingStats,
  });

  const isRefreshing =
    usersQuery.isFetching ||
    schoolsQuery.isFetching ||
    uploadsQuery.isFetching ||
    embeddingStatsQuery.isFetching;

  const handleRefreshAll = () => {
    void usersQuery.refetch();
    void schoolsQuery.refetch();
    void uploadsQuery.refetch();
    void embeddingStatsQuery.refetch();
  };

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const schools = useMemo(() => schoolsQuery.data ?? [], [schoolsQuery.data]);
  const uploads = useMemo(() => uploadsQuery.data ?? [], [uploadsQuery.data]);
  const stats = embeddingStatsQuery.data;

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedSchoolFilter !== "ALL") {
        if (String(u.school_id) !== selectedSchoolFilter) return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const fullName = (u.full_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      return fullName.includes(term) || email.includes(term) || role.includes(term);
    });
  }, [users, selectedSchoolFilter, searchTerm]);

  // Aggregate user statistics
  const userMetrics = useMemo(() => {
    const total = filteredUsers.length;
    const active = filteredUsers.filter((u) => u.is_active).length;
    const students = filteredUsers.filter((u) => String(u.role).toUpperCase() === "STUDENT").length;
    const tutors = filteredUsers.filter((u) => String(u.role).toUpperCase() === "TUTOR").length;
    const schoolAdmins = filteredUsers.filter(
      (u) => String(u.role).toUpperCase() === "SCHOOL_ADMIN"
    ).length;
    const masterAdmins = filteredUsers.filter(
      (u) => String(u.role).toUpperCase() === "MASTER_ADMIN"
    ).length;

    return {
      total,
      active,
      inactive: total - active,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
      students,
      tutors,
      schoolAdmins,
      masterAdmins,
    };
  }, [filteredUsers]);

  // Aggregate school statistics
  const schoolAnalytics = useMemo(() => {
    return schools.map((school) => {
      const schoolUsers = users.filter((u) => u.school_id === school.id);
      const studentCount = schoolUsers.filter(
        (u) => String(u.role).toUpperCase() === "STUDENT"
      ).length;
      const tutorCount = schoolUsers.filter((u) => String(u.role).toUpperCase() === "TUTOR").length;
      const adminCount = schoolUsers.filter(
        (u) => String(u.role).toUpperCase() === "SCHOOL_ADMIN"
      ).length;
      const activeCount = schoolUsers.filter((u) => u.is_active).length;

      return {
        id: school.id,
        name: school.name,
        branch: school.branch || "Main Campus",
        board: school.board || "CBSE",
        totalUsers: schoolUsers.length,
        studentCount,
        tutorCount,
        adminCount,
        activeCount,
        activityRate:
          schoolUsers.length > 0 ? Math.round((activeCount / schoolUsers.length) * 100) : 0,
      };
    });
  }, [schools, users]);

  // Aggregate Ingestion / RAG statistics
  const ingestionMetrics = useMemo(() => {
    const total = uploads.length;
    const ocrCompleted = uploads.filter((u) => isCompletedStatus(u.ocr_status)).length;
    const ocrPending = uploads.filter((u) => isPendingStatus(u.ocr_status)).length;
    const ocrFailed = uploads.filter((u) => isFailedStatus(u.ocr_status)).length;

    const chunkCompleted = uploads.filter((u) => isCompletedStatus(u.chunk_status)).length;
    const chunkFailed = uploads.filter((u) => isFailedStatus(u.chunk_status)).length;

    const embeddingCompleted = uploads.filter((u) => isCompletedStatus(u.embedding_status)).length;
    const embeddingFailed = uploads.filter((u) => isFailedStatus(u.embedding_status)).length;

    const fullyCompleted = uploads.filter(
      (u) =>
        isCompletedStatus(u.ocr_status) &&
        isCompletedStatus(u.chunk_status) &&
        isCompletedStatus(u.embedding_status)
    ).length;

    const successRate = total > 0 ? Math.round((fullyCompleted / total) * 100) : 100;

    return {
      total,
      fullyCompleted,
      successRate,
      ocrCompleted,
      ocrPending,
      ocrFailed,
      chunkCompleted,
      chunkFailed,
      embeddingCompleted,
      embeddingFailed,
    };
  }, [uploads]);

  // CSV Export functions
  const handleExportUsers = () => {
    const schoolMap = new Map(schools.map((s) => [s.id, s.name]));
    const rows = filteredUsers.map((u) => ({
      id: u.id,
      name: u.full_name || "N/A",
      email: u.email,
      role: u.role,
      school: u.school_id ? (schoolMap.get(u.school_id) ?? `School #${u.school_id}`) : "Platform Wide",
      status: u.is_active ? "Active" : "Suspended",
      created_at: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "N/A",
    }));

    exportCsv({
      rows,
      columns: [
        { key: "id", header: "User ID" },
        { key: "name", header: "Full Name" },
        { key: "email", header: "Email Address" },
        { key: "role", header: "Assigned Role" },
        { key: "school", header: "Institutional Campus" },
        { key: "status", header: "Account Status" },
        { key: "created_at", header: "Registration Date" },
      ],
      fileName: `master_admin_users_report_${new Date().toISOString().split("T")[0]}.csv`,
    });
  };

  const handleExportIngestion = () => {
    const rows = uploads.map((u) => ({
      id: u.id,
      file_name: u.file_name,
      board: u.board,
      class_level: u.class_level,
      subject_name: u.subject_name,
      chapter: u.chapter || "N/A",
      ocr_status: u.ocr_status,
      chunk_status: u.chunk_status,
      embedding_status: u.embedding_status,
      upload_date: u.upload_date ? new Date(u.upload_date).toISOString().split("T")[0] : "N/A",
    }));

    exportCsv({
      rows,
      columns: [
        { key: "id", header: "Upload ID" },
        { key: "file_name", header: "Source File" },
        { key: "board", header: "Curriculum Board" },
        { key: "class_level", header: "Grade / Class" },
        { key: "subject_name", header: "Subject" },
        { key: "chapter", header: "Chapter Title" },
        { key: "ocr_status", header: "OCR Status" },
        { key: "chunk_status", header: "Chunking Status" },
        { key: "embedding_status", header: "Embedding Status" },
        { key: "upload_date", header: "Upload Date" },
      ],
      fileName: `master_admin_ingestion_audit_${new Date().toISOString().split("T")[0]}.csv`,
    });
  };

  const handleExportSchools = () => {
    const rows = schoolAnalytics.map((s) => ({
      id: s.id,
      name: s.name,
      branch: s.branch,
      board: s.board,
      students: s.studentCount,
      tutors: s.tutorCount,
      admins: s.adminCount,
      total_users: s.totalUsers,
      active_rate: `${s.activityRate}%`,
    }));

    exportCsv({
      rows,
      columns: [
        { key: "id", header: "School ID" },
        { key: "name", header: "Institution Name" },
        { key: "branch", header: "Campus / Branch" },
        { key: "board", header: "Affiliated Board" },
        { key: "students", header: "Enrolled Students" },
        { key: "tutors", header: "Active Tutors" },
        { key: "admins", header: "School Admins" },
        { key: "total_users", header: "Total Members" },
        { key: "active_rate", header: "Activity Rate" },
      ],
      fileName: `master_admin_schools_report_${new Date().toISOString().split("T")[0]}.csv`,
    });
  };

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Platform Reports & Intelligence
              </h1>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Live Analytics
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Cross-institution telemetry, member adoption, and AI vector pipeline performance metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              {isRefreshing ? "Syncing..." : "Sync Live Data"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportUsers}
              className="gap-2 text-slate-700 hover:text-blue-600"
            >
              <Download className="h-4 w-4" />
              Users CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportIngestion}
              className="gap-2 text-slate-700 hover:text-blue-600"
            >
              <Download className="h-4 w-4" />
              Ingestion Audit CSV
            </Button>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total Active Users
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900">{userMetrics.active}</span>
                    <span className="text-xs font-medium text-slate-400">
                      / {userMetrics.total} total
                    </span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1 text-slate-500">
                  <span>Engagement Rate</span>
                  <span className="font-semibold text-blue-600">{userMetrics.activePercentage}%</span>
                </div>
                <Progress value={userMetrics.activePercentage} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Vectorized Chunks
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900">
                      {stats?.total_chunks?.toLocaleString() ?? "0"}
                    </span>
                    <span className="text-xs font-medium text-emerald-600">Live</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Cpu className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  <span>
                    Indexed across <strong>{ingestionMetrics.total}</strong> uploaded chapters
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Pipeline Health
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900">
                      {ingestionMetrics.successRate}%
                    </span>
                    <span className="text-xs font-medium text-slate-500">pass rate</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1 text-slate-500">
                  <span>Completed Files</span>
                  <span className="font-semibold text-purple-600">
                    {ingestionMetrics.fullyCompleted} / {ingestionMetrics.total}
                  </span>
                </div>
                <Progress value={ingestionMetrics.successRate} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm hover:shadow transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Campuses Onboarded
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-900">{schools.length}</span>
                    <span className="text-xs font-medium text-indigo-600">Institutions</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                  <span>
                    Avg. <strong>{schools.length > 0 ? Math.round(users.length / schools.length) : 0}</strong> users per school
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 1: User Demographics & Role Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Role Distribution
              </CardTitle>
              <CardDescription>Breakdown of registered accounts across roles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Students
                    </span>
                    <span className="font-semibold text-slate-900">
                      {userMetrics.students} (
                      {userMetrics.total > 0
                        ? Math.round((userMetrics.students / userMetrics.total) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <Progress
                    value={userMetrics.total > 0 ? (userMetrics.students / userMetrics.total) * 100 : 0}
                    className="h-2 bg-slate-100"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" />
                      Tutors / Educators
                    </span>
                    <span className="font-semibold text-slate-900">
                      {userMetrics.tutors} (
                      {userMetrics.total > 0
                        ? Math.round((userMetrics.tutors / userMetrics.total) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <Progress
                    value={userMetrics.total > 0 ? (userMetrics.tutors / userMetrics.total) * 100 : 0}
                    className="h-2 bg-slate-100"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      School Administrators
                    </span>
                    <span className="font-semibold text-slate-900">
                      {userMetrics.schoolAdmins} (
                      {userMetrics.total > 0
                        ? Math.round((userMetrics.schoolAdmins / userMetrics.total) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <Progress
                    value={
                      userMetrics.total > 0
                        ? (userMetrics.schoolAdmins / userMetrics.total) * 100
                        : 0
                    }
                    className="h-2 bg-slate-100"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Master Admins
                    </span>
                    <span className="font-semibold text-slate-900">
                      {userMetrics.masterAdmins} (
                      {userMetrics.total > 0
                        ? Math.round((userMetrics.masterAdmins / userMetrics.total) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <Progress
                    value={
                      userMetrics.total > 0
                        ? (userMetrics.masterAdmins / userMetrics.total) * 100
                        : 0
                    }
                    className="h-2 bg-slate-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800">
                  <div className="text-xl font-bold">{userMetrics.active}</div>
                  <div className="text-xs font-medium">Active Accounts</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                  <div className="text-xl font-bold">{userMetrics.inactive}</div>
                  <div className="text-xs font-medium">Suspended / Inactive</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Pipeline Multi-Stage Telemetry */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-600" />
                  RAG Pipeline Processing Funnel
                </CardTitle>
                <CardDescription>
                  Throughput across OCR extraction, text chunking, and embedding stages
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {ingestionMetrics.total} Total Artifacts
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stage 1: OCR */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      1. OCR Extraction
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {ingestionMetrics.ocrCompleted}/{ingestionMetrics.total}
                    </Badge>
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {ingestionMetrics.total > 0
                      ? Math.round((ingestionMetrics.ocrCompleted / ingestionMetrics.total) * 100)
                      : 100}
                    %
                  </div>
                  <Progress
                    value={
                      ingestionMetrics.total > 0
                        ? (ingestionMetrics.ocrCompleted / ingestionMetrics.total) * 100
                        : 100
                    }
                    className="h-1.5"
                  />
                  <div className="flex justify-between text-xs text-slate-500 pt-1">
                    <span>Pending: {ingestionMetrics.ocrPending}</span>
                    <span className={ingestionMetrics.ocrFailed > 0 ? "text-rose-600 font-medium" : ""}>
                      Failed: {ingestionMetrics.ocrFailed}
                    </span>
                  </div>
                </div>

                {/* Stage 2: Chunking */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      2. Chunk Splitting
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {ingestionMetrics.chunkCompleted}/{ingestionMetrics.total}
                    </Badge>
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {ingestionMetrics.total > 0
                      ? Math.round((ingestionMetrics.chunkCompleted / ingestionMetrics.total) * 100)
                      : 100}
                    %
                  </div>
                  <Progress
                    value={
                      ingestionMetrics.total > 0
                        ? (ingestionMetrics.chunkCompleted / ingestionMetrics.total) * 100
                        : 100
                    }
                    className="h-1.5"
                  />
                  <div className="flex justify-between text-xs text-slate-500 pt-1">
                    <span>Success: {ingestionMetrics.chunkCompleted}</span>
                    <span className={ingestionMetrics.chunkFailed > 0 ? "text-rose-600 font-medium" : ""}>
                      Failed: {ingestionMetrics.chunkFailed}
                    </span>
                  </div>
                </div>

                {/* Stage 3: Vector Embeddings */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      3. Vector Embedding
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {ingestionMetrics.embeddingCompleted}/{ingestionMetrics.total}
                    </Badge>
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {ingestionMetrics.total > 0
                      ? Math.round((ingestionMetrics.embeddingCompleted / ingestionMetrics.total) * 100)
                      : 100}
                    %
                  </div>
                  <Progress
                    value={
                      ingestionMetrics.total > 0
                        ? (ingestionMetrics.embeddingCompleted / ingestionMetrics.total) * 100
                        : 100
                    }
                    className="h-1.5"
                  />
                  <div className="flex justify-between text-xs text-slate-500 pt-1">
                    <span>Success: {ingestionMetrics.embeddingCompleted}</span>
                    <span className={ingestionMetrics.embeddingFailed > 0 ? "text-rose-600 font-medium" : ""}>
                      Failed: {ingestionMetrics.embeddingFailed}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/60 border border-blue-100 text-xs text-blue-900">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  All chunk embeddings are indexed in the primary vector store. Total active vectors
                  indexed: <strong>{stats?.total_chunks ?? 0}</strong> with cosine similarity metric.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Campus Adoption & Staffing Directory Table */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                Institutional Campus Telemetry
              </CardTitle>
              <CardDescription>
                Live enrollment and staff capacity breakdown per affiliated school
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSchools}
              className="gap-2 self-start md:self-auto text-slate-700 hover:text-indigo-600"
            >
              <Download className="h-4 w-4" />
              Export Campuses CSV
            </Button>
          </CardHeader>
          <CardContent>
            {schoolAnalytics.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No school institutions registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-semibold">Institution Name</TableHead>
                      <TableHead className="font-semibold">Branch</TableHead>
                      <TableHead className="font-semibold">Board</TableHead>
                      <TableHead className="font-semibold text-center">Students</TableHead>
                      <TableHead className="font-semibold text-center">Tutors</TableHead>
                      <TableHead className="font-semibold text-center">Admins</TableHead>
                      <TableHead className="font-semibold text-center">Total Users</TableHead>
                      <TableHead className="font-semibold text-right">Active Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolAnalytics.map((s) => (
                      <TableRow key={s.id} className="hover:bg-slate-50/60">
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
                              {s.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span>{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{s.branch}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {s.board}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-700">
                          {s.studentCount}
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-700">
                          {s.tutorCount}
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-700">
                          {s.adminCount}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-slate-900">
                          {s.totalUsers}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              s.activityRate >= 80
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }
                          >
                            {s.activityRate}% Active
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Filtered User Roster Audit */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Cross-Platform User Audit Roster
              </CardTitle>
              <CardDescription>
                Auditable list of all registered identities with affiliation filters
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filter by name, email, role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select
                value={selectedSchoolFilter}
                onValueChange={(val) => setSelectedSchoolFilter(val)}
              >
                <SelectTrigger className="w-full sm:w-48 h-9 text-xs">
                  <SelectValue placeholder="All Institutions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Institutions</SelectItem>
                  {schools.map((sch) => (
                    <SelectItem key={sch.id} value={String(sch.id)}>
                      {sch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No users match the active filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50">
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">School Affiliation</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.slice(0, 15).map((u) => {
                      const userSchool = schools.find((s) => s.id === u.school_id);
                      const roleUpper = String(u.role).toUpperCase();
                      return (
                        <TableRow key={u.id} className="hover:bg-slate-50/60">
                          <TableCell className="font-medium text-slate-900">
                            {u.full_name || "Unnamed User"}
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">{u.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                roleUpper === "MASTER_ADMIN"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : roleUpper === "SCHOOL_ADMIN"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : roleUpper === "TUTOR"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }
                            >
                              {roleUpper.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs">
                            {userSchool ? userSchool.name : "Platform Wide"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                u.is_active
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }
                            >
                              {u.is_active ? "Active" : "Suspended"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-slate-500">
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filteredUsers.length > 15 && (
                  <div className="pt-3 text-center text-xs text-slate-500 border-t border-slate-100 mt-2">
                    Showing first 15 of {filteredUsers.length} matching accounts. Use "Export Users CSV" for the full roster.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
