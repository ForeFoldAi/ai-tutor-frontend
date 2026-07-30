import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "../components/status-pill";
import { useToast } from "@/hooks/use-toast";
import { Database, RefreshCcw, RotateCcw, Trash2, Play, Loader2 } from "lucide-react";
import {
  deleteTextbookUpload,
  getEmbeddingStats,
  getTextbookUploads,
  patchTextbookUploadStatus,
  processTextbookUpload,
} from "@/api/masterAdmin";
import type { EmbeddingStatsApi, TextbookUploadApi } from "@/api/types";

const classLabel = (cls: string) => cls.replace("CLASS_", "Class ");
const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export default function MasterAdminAIEmbeddingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TextbookUploadApi[]>([]);
  const [stats, setStats] = useState<EmbeddingStatsApi | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const refresh = async () => {
    const [uploads, embeddingStats] = await Promise.all([
      getTextbookUploads(),
      getEmbeddingStats(),
    ]);
    setRows(uploads);
    setStats(embeddingStats);
  };

  useEffect(() => {
    refresh()
      .catch(() => toast({ title: "Failed to load embedding data", variant: "destructive" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasPending = rows.some(
      (r) => r.embedding_status === "PROCESSING" || r.chunk_status === "PROCESSING",
    );
    if (!hasPending) return;
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const metrics = useMemo(() => {
    if (stats) {
      return {
        total: stats.total_documents,
        embedded: stats.embedded_count,
        failed: stats.failed_count,
        pending: stats.pending_count,
        vectorCount: stats.total_chunks,
      };
    }
    const total = rows.length;
    const embedded = rows.filter((r) => r.embedding_status === "EMBEDDED").length;
    const failed = rows.filter((r) => r.embedding_status === "FAILED").length;
    const pending = total - embedded - failed;
    const vectorCount = rows.reduce((sum, r) => sum + (r.chunk_count || 0), 0);
    return { total, embedded, failed, pending, vectorCount };
  }, [rows, stats]);

  const handleProcess = async (uploadId: string) => {
    setProcessingIds((prev) => new Set(prev).add(uploadId));
    try {
      await processTextbookUpload(uploadId);
      toast({ title: "Processing started" });
      setTimeout(refresh, 2000);
    } catch {
      toast({ title: "Failed to start processing", variant: "destructive" });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(uploadId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-7 w-[240px]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">AI Embeddings</h1>
          <p className="text-sm text-muted-foreground">
            Monitor document embedding pipelines and retry failed records.
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh().then(() => toast({ title: "Refreshed" }))}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Documents</p>
            <p className="text-2xl font-bold mt-1">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Embedded</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{metrics.embedded}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Failed</p>
            <p className="text-2xl font-bold mt-1 text-destructive">{metrics.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Queue</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{metrics.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Chunks</p>
            <p className="text-2xl font-bold mt-1">{metrics.vectorCount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>Embedding model: <strong>{stats.embedding_model}</strong></span>
          <span className="mx-2">|</span>
          <span>Storage: <strong>Local ChromaDB</strong></span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Embedding Records
          </CardTitle>
          <CardDescription>Pipeline: Uploaded → OCR → Chunked → Embedded</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Content Type</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>OCR</TableHead>
                  <TableHead>Chunking</TableHead>
                  <TableHead>Embedding</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11}>
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        No embedding records. Upload textbooks to get started.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium max-w-[180px] truncate" title={r.file_name}>
                        {r.file_name}
                      </TableCell>
                      <TableCell>{r.board}</TableCell>
                      <TableCell>{classLabel(r.class_level)}</TableCell>
                      <TableCell>{r.subject_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {r.content_type ?? "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{(r.chunk_count || 0).toLocaleString()}</TableCell>
                      <TableCell><StatusPill status={statusLabel(r.ocr_status) as "Queued"} /></TableCell>
                      <TableCell><StatusPill status={statusLabel(r.chunk_status) as "Queued"} /></TableCell>
                      <TableCell><StatusPill status={statusLabel(r.embedding_status) as "Queued"} /></TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(r.upload_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.file_path && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Process (chunk + embed)"
                              disabled={processingIds.has(r.id)}
                              onClick={() => handleProcess(r.id)}
                            >
                              {processingIds.has(r.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset to queued"
                            onClick={async () => {
                              await patchTextbookUploadStatus(r.id, {
                                ocr_status: "QUEUED",
                                chunk_status: "QUEUED",
                                embedding_status: "QUEUED",
                              });
                              await refresh();
                              toast({ title: "Reset to queued", description: r.file_name });
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={async () => {
                              await deleteTextbookUpload(r.id);
                              await refresh();
                              toast({ title: "Deleted", description: r.file_name });
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
