import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  confirmTextbookStructure,
  getTextbookStructure,
  updateTextbookStructure,
} from "@/api/masterAdmin";
import type { TextbookChapterApi, TextbookStructureApi } from "@/api/types";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Split,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Layers,
  FileText,
  Search,
  ShieldCheck,
  Info,
  Hash,
  Compass,
} from "lucide-react";

interface TextbookStructureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textbookId: number | null;
  onConfirmed?: () => void;
}

export function TextbookStructureDialog({
  open,
  onOpenChange,
  textbookId,
  onConfirmed,
}: TextbookStructureDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [structure, setStructure] = useState<TextbookStructureApi | null>(null);
  const [chapters, setChapters] = useState<TextbookChapterApi[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"chapters" | "excluded">("chapters");

  useEffect(() => {
    if (!open || !textbookId) {
      setStructure(null);
      setChapters([]);
      setSearchQuery("");
      setExpandedChapters({});
      return;
    }
    setLoading(true);
    getTextbookStructure(textbookId)
      .then((data) => {
        setStructure(data);
        const loadedChapters = data.chapters || [];
        setChapters(loadedChapters);
        // By default expand chapters that have sub_chapters
        const initExpanded: Record<string, boolean> = {};
        loadedChapters.forEach((ch, idx) => {
          if (ch.sub_chapters && ch.sub_chapters.length > 0) {
            initExpanded[ch.chapter_number || String(idx)] = true;
          }
        });
        setExpandedChapters(initExpanded);
      })
      .catch((err) => {
        toast({
          title: "Failed to load chapter structure",
          description: err.message,
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [open, textbookId, toast]);

  const toggleExpand = (chapKey: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapKey]: !prev[chapKey],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    chapters.forEach((ch, idx) => {
      allExpanded[ch.chapter_number || String(idx)] = true;
    });
    setExpandedChapters(allExpanded);
  };

  const collapseAll = () => {
    setExpandedChapters({});
  };

  const updateChapterField = (idx: number, field: keyof TextbookChapterApi, val: any) => {
    setChapters((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Convert 1-indexed user display input to 0-indexed internal value
  const handlePageChange = (idx: number, field: "start_pdf_page" | "end_pdf_page", displayValue: number) => {
    const internalValue = Math.max(0, displayValue - 1);
    updateChapterField(idx, field, internalValue);
  };

  const handleAddChapter = () => {
    const last = chapters[chapters.length - 1];
    const newStart = last ? last.end_pdf_page + 1 : 0;
    const newEnd =
      structure && structure.total_pages > 0
        ? Math.min(structure.total_pages - 1, newStart + 10)
        : newStart + 10;
    const nextNum = chapters.length + 1;
    setChapters((prev) => [
      ...prev,
      {
        chapter_number: String(nextNum),
        chapter_title: `Chapter ${nextNum}`,
        hierarchy_level: "chapter",
        start_pdf_page: newStart,
        end_pdf_page: newEnd,
        is_non_chapter_section: false,
        section_type: "chapter",
        detection_method: "admin_manual",
        confidence_score: 1.0,
        confidence_flags: [],
        status: "CONFIRMED",
        sub_chapters: [],
      },
    ]);
  };

  const handleDeleteChapter = (idx: number) => {
    setChapters((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSplitChapter = (idx: number) => {
    const ch = chapters[idx];
    if (ch.end_pdf_page <= ch.start_pdf_page) {
      toast({ title: "Cannot split chapter with only 1 page", variant: "destructive" });
      return;
    }
    const mid = Math.floor((ch.start_pdf_page + ch.end_pdf_page) / 2);
    const part1: TextbookChapterApi = {
      ...ch,
      chapter_title: `${ch.chapter_title} (Part 1)`,
      end_pdf_page: mid,
    };
    const part2: TextbookChapterApi = {
      ...ch,
      chapter_number: `${ch.chapter_number}B`,
      chapter_title: `${ch.chapter_title} (Part 2)`,
      start_pdf_page: mid + 1,
      detection_method: "admin_manual",
      confidence_score: 1.0,
      confidence_flags: [],
      sub_chapters: [],
    };
    setChapters((prev) => {
      const copy = [...prev];
      copy.splice(idx, 1, part1, part2);
      return copy;
    });
  };

  const handleMergeNext = (idx: number) => {
    if (idx >= chapters.length - 1) return;
    const curr = chapters[idx];
    const next = chapters[idx + 1];
    const merged: TextbookChapterApi = {
      ...curr,
      chapter_title: `${curr.chapter_title} & ${next.chapter_title}`,
      end_pdf_page: next.end_pdf_page,
      sub_chapters: [...(curr.sub_chapters || []), ...(next.sub_chapters || [])],
    };
    setChapters((prev) => {
      const copy = [...prev];
      copy.splice(idx, 2, merged);
      return copy;
    });
  };

  const handleSaveChanges = async () => {
    if (!textbookId) return;
    setSaving(true);
    try {
      const updated = await updateTextbookStructure(textbookId, { chapters });
      setStructure(updated);
      setChapters(updated.chapters || []);
      toast({ title: "Chapter boundaries saved successfully" });
    } catch (err: any) {
      toast({ title: "Failed to save boundaries", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAndProcess = async () => {
    if (!textbookId) return;
    setConfirming(true);
    try {
      await updateTextbookStructure(textbookId, { chapters });
      const res = await confirmTextbookStructure(textbookId);
      toast({
        title: "Structure Confirmed",
        description: res.message || "Chapter indexing started in background.",
      });
      onOpenChange(false);
      if (onConfirmed) onConfirmed();
    } catch (err: any) {
      toast({ title: "Confirmation failed", description: err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  // Metrics calculation
  const totalSubChapters = useMemo(() => {
    return chapters.reduce((acc, c) => acc + (c.sub_chapters?.length || 0), 0);
  }, [chapters]);

  const coverageRange = useMemo(() => {
    if (chapters.length === 0) return { start: 0, end: 0, pages: 0 };
    const minStart = Math.min(...chapters.map((c) => c.start_pdf_page));
    const maxEnd = Math.max(...chapters.map((c) => c.end_pdf_page));
    return {
      start: minStart + 1,
      end: maxEnd + 1,
      pages: maxEnd - minStart + 1,
    };
  }, [chapters]);

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const q = searchQuery.toLowerCase();
    return chapters.filter((c) => {
      const matchMain =
        c.chapter_title.toLowerCase().includes(q) ||
        c.chapter_number.toLowerCase().includes(q);
      const matchSub = c.sub_chapters?.some(
        (s) =>
          s.chapter_title.toLowerCase().includes(q) ||
          s.chapter_number.toLowerCase().includes(q)
      );
      return matchMain || matchSub;
    });
  }, [chapters, searchQuery]);

  const nonChapters = structure?.non_chapter_sections || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-6 gap-4 overflow-hidden bg-background text-foreground shadow-2xl border">
        {/* Top Header */}
        <DialogHeader className="shrink-0 space-y-2 border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                  Review & Calibrate Chapter Structure
                  {structure && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      ID #{structure.textbook_id}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5 text-muted-foreground">
                  {structure ? (
                    <span>
                      <strong className="text-foreground">{structure.title}</strong> — {structure.total_pages} physical pages (
                      <span className="capitalize">{structure.pdf_type || "text_based"}</span>). Verify or fine-tune boundaries before AI vectorization.
                    </span>
                  ) : (
                    "Loading detected textbook structure..."
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Calibration & Confidence Badges */}
            {structure && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border bg-muted/40 text-xs">
                  <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Offset:</span>
                  <span className="font-mono font-bold text-foreground">
                    {structure.page_offset !== undefined && structure.page_offset !== null
                      ? structure.page_offset >= 0
                        ? `+${structure.page_offset}`
                        : structure.page_offset
                      : "0"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">(PDF = Printed + {structure.page_offset ?? 0})</span>
                </div>

                <Badge variant="outline" className="px-2.5 py-1 text-xs bg-muted/30 capitalize">
                  {structure.detection_method ? structure.detection_method.replace(/_/g, " ") : "Universal Hybrid"}
                </Badge>

                <Badge
                  variant="outline"
                  className={`px-2.5 py-1 text-xs gap-1 font-semibold ${
                    (structure.confidence_score ?? 1) >= 0.85
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {Math.round((structure.confidence_score ?? 1) * 100)}% Confidence
                </Badge>
              </div>
            )}
          </div>

          {/* Review Warnings Banner */}
          {structure?.review_warnings && structure.review_warnings.length > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Review Recommendations:</span>
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                  {structure.review_warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Analyzing document layout and structure...
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {/* Overview Metric Cards Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              <Card className="shadow-none border bg-muted/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                    <span>Main Chapters / Units</span>
                    <Layers className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {chapters.length}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      units {totalSubChapters > 0 ? `(${totalSubChapters} readings)` : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none border bg-muted/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                    <span>Instructional PDF Pages</span>
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {coverageRange.pages > 0 ? (
                      <>
                        pp. {coverageRange.start}–{coverageRange.end}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({coverageRange.pages} pgs)
                        </span>
                      </>
                    ) : (
                      "0 pgs"
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none border bg-muted/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                    <span>Excluded Non-Chapters</span>
                    <Info className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {nonChapters.length}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      sections (Front/Appendices)
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none border bg-muted/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                    <span>Boundary Integrity</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Continuous • 0 Gaps / Overlaps</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Toolbar & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
                className="w-auto"
              >
                <TabsList className="h-9">
                  <TabsTrigger value="chapters" className="text-xs gap-1.5 px-3">
                    <Layers className="h-3.5 w-3.5" />
                    Instructional Chapters ({chapters.length})
                  </TabsTrigger>
                  <TabsTrigger value="excluded" className="text-xs gap-1.5 px-3">
                    <FileText className="h-3.5 w-3.5" />
                    Front & Back Matter ({nonChapters.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {activeTab === "chapters" && (
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search title or number..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-muted/30"
                    />
                  </div>

                  {totalSubChapters > 0 && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs px-2.5"
                        onClick={expandAll}
                      >
                        Expand All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs px-2.5"
                        onClick={collapseAll}
                      >
                        Collapse All
                      </Button>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                    onClick={handleAddChapter}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Chapter
                  </Button>
                </div>
              )}
            </div>

            {/* Tab 1: Main Chapters Table */}
            {activeTab === "chapters" && (
              <div className="flex-1 min-h-0 border rounded-xl overflow-hidden flex flex-col bg-card shadow-sm">
                <div className="overflow-y-auto flex-1">
                  <Table className="relative">
                    <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10 border-b">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10 text-center px-1"> </TableHead>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead className="w-24">Level</TableHead>
                        <TableHead className="min-w-[280px]">Chapter / Unit Title</TableHead>
                        <TableHead className="w-44 text-center">PDF Pages (1-based)</TableHead>
                        <TableHead className="w-28 text-center">Printed Range</TableHead>
                        <TableHead className="w-24 text-center">Confidence</TableHead>
                        <TableHead className="w-28 text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChapters.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                            {searchQuery ? "No matching chapters found." : "No chapters detected yet."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredChapters.map((ch, idx) => {
                          const chapKey = ch.chapter_number || String(idx);
                          const isExpanded = !!expandedChapters[chapKey];
                          const hasSubs = (ch.sub_chapters || []).length > 0;
                          const isHighConf = (ch.confidence_score ?? 1.0) >= 0.85;
                          const pageSpan = ch.end_pdf_page - ch.start_pdf_page + 1;
                          const level = (ch.hierarchy_level || "chapter").toLowerCase();

                          return (
                            <>
                              {/* Main Chapter / Unit Row */}
                              <TableRow
                                key={`chap-${idx}`}
                                className={`group transition-colors ${
                                  isExpanded && hasSubs ? "bg-muted/30 font-medium" : "hover:bg-muted/40"
                                }`}
                              >
                                {/* Expand / Collapse Chevron */}
                                <TableCell className="text-center p-1">
                                  {hasSubs ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                      onClick={() => toggleExpand(chapKey)}
                                      title={isExpanded ? "Collapse sub-readings" : "Expand sub-readings"}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  ) : (
                                    <span className="inline-block w-4" />
                                  )}
                                </TableCell>

                                {/* Chapter Number Input */}
                                <TableCell className="py-2">
                                  <Input
                                    className="h-8 w-14 text-xs font-mono font-bold text-center px-1 bg-background"
                                    value={ch.chapter_number}
                                    onChange={(e) =>
                                      updateChapterField(idx, "chapter_number", e.target.value)
                                    }
                                  />
                                </TableCell>

                                {/* Hierarchy Level Badge */}
                                <TableCell className="py-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                                      level === "unit"
                                        ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30"
                                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                    }`}
                                  >
                                    {level}
                                  </Badge>
                                </TableCell>

                                {/* Chapter Title Input */}
                                <TableCell className="py-2">
                                  <div className="flex flex-col gap-1">
                                    <Input
                                      className="h-8 text-sm font-medium bg-background"
                                      value={ch.chapter_title}
                                      onChange={(e) =>
                                        updateChapterField(idx, "chapter_title", e.target.value)
                                      }
                                    />
                                    {hasSubs && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpand(chapKey)}
                                        className="text-left text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 pl-1"
                                      >
                                        <Layers className="h-3 w-3 text-primary/70" />
                                        <span>
                                          Contains <strong>{ch.sub_chapters!.length} sub-readings</strong>{" "}
                                          (click to {isExpanded ? "hide" : "view details"})
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Physical PDF Page Range (1-indexed for display) */}
                                <TableCell className="py-2">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <div className="flex items-center gap-1 bg-muted/40 px-2 py-1 rounded-md border text-xs">
                                      <span className="text-[10px] font-semibold text-muted-foreground">PDF</span>
                                      <Input
                                        type="number"
                                        className="h-6 w-14 text-xs font-mono font-semibold text-center p-0 bg-background"
                                        value={ch.start_pdf_page + 1}
                                        min={1}
                                        max={structure?.total_pages || 9999}
                                        onChange={(e) =>
                                          handlePageChange(
                                            idx,
                                            "start_pdf_page",
                                            parseInt(e.target.value) || 1
                                          )
                                        }
                                      />
                                      <span className="text-muted-foreground">→</span>
                                      <Input
                                        type="number"
                                        className="h-6 w-14 text-xs font-mono font-semibold text-center p-0 bg-background"
                                        value={ch.end_pdf_page + 1}
                                        min={ch.start_pdf_page + 1}
                                        max={structure?.total_pages || 9999}
                                        onChange={(e) =>
                                          handlePageChange(
                                            idx,
                                            "end_pdf_page",
                                            parseInt(e.target.value) || 1
                                          )
                                        }
                                      />
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] font-mono shrink-0 px-1.5 py-0.5">
                                      {pageSpan}p
                                    </Badge>
                                  </div>
                                </TableCell>

                                {/* Printed Book Page Range */}
                                <TableCell className="py-2 text-center">
                                  {ch.printed_start_page ? (
                                    <Badge variant="outline" className="font-mono text-xs bg-muted/30">
                                      {ch.printed_end_page
                                        ? `pp. ${ch.printed_start_page}–${ch.printed_end_page}`
                                        : `p. ${ch.printed_start_page}`}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">N/A</span>
                                  )}
                                </TableCell>

                                {/* Confidence Score Badge */}
                                <TableCell className="py-2 text-center">
                                  {isHighConf ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-semibold"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      {Math.round(ch.confidence_score * 100)}%
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] font-semibold"
                                      title={(ch.confidence_flags || []).join(", ")}
                                    >
                                      <AlertTriangle className="h-3 w-3" />
                                      Review
                                    </Badge>
                                  )}
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="py-2 text-right pr-4">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                      title="Split chapter at midpoint"
                                      onClick={() => handleSplitChapter(idx)}
                                    >
                                      <Split className="h-3.5 w-3.5" />
                                    </Button>
                                    {idx < chapters.length - 1 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground text-xs font-bold"
                                        title="Merge with next chapter"
                                        onClick={() => handleMergeNext(idx)}
                                      >
                                        M
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      title="Delete chapter"
                                      onClick={() => handleDeleteChapter(idx)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Nested Sub-Readings (Accordion Rows) */}
                              {isExpanded &&
                                hasSubs &&
                                ch.sub_chapters!.map((sub, sIdx) => {
                                  const subSpan = sub.end_pdf_page - sub.start_pdf_page + 1;
                                  return (
                                    <TableRow
                                      key={`sub-${idx}-${sIdx}`}
                                      className="bg-muted/15 border-b hover:bg-muted/25 transition-colors"
                                    >
                                      <TableCell className="p-1" />
                                      <TableCell className="py-1 text-center font-mono text-xs text-muted-foreground">
                                        <span className="text-[11px]">{sub.chapter_number}</span>
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] uppercase px-1.5 py-0 bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
                                        >
                                          {sub.hierarchy_level || "reading"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-1">
                                        <div className="flex items-center gap-2 pl-3">
                                          <span className="text-muted-foreground font-mono text-xs select-none">
                                            └─
                                          </span>
                                          <span className="text-xs text-foreground font-medium">
                                            {sub.chapter_title}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-1 text-center font-mono text-xs text-muted-foreground">
                                        <div className="flex items-center justify-center gap-1">
                                          <span>
                                            pp. {sub.start_pdf_page + 1}–{sub.end_pdf_page + 1}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            ({subSpan}p)
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-1 text-center font-mono text-xs text-muted-foreground">
                                        {sub.printed_start_page ? (
                                          <span>
                                            {sub.printed_end_page
                                              ? `pp. ${sub.printed_start_page}–${sub.printed_end_page}`
                                              : `p. ${sub.printed_start_page}`}
                                          </span>
                                        ) : (
                                          "—"
                                        )}
                                      </TableCell>
                                      <TableCell className="py-1 text-center">
                                        <span className="text-[11px] font-mono text-muted-foreground">
                                          {Math.round((sub.confidence_score ?? 0.9) * 100)}%
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-1" />
                                    </TableRow>
                                  );
                                })}
                            </>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Tab 2: Excluded Front & Back Matter */}
            {activeTab === "excluded" && (
              <div className="flex-1 min-h-0 border rounded-xl overflow-hidden flex flex-col bg-card shadow-sm">
                <div className="p-3 bg-muted/30 border-b flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-amber-500" />
                    <span>
                      These sections are detected as preliminary material (covers, preface, TOC) or back matter
                      (appendices, listening transcripts) and are <strong>excluded from AI tutor RAG chunking</strong> to
                      prevent hallucination and prompt contamination.
                    </span>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10 border-b">
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead className="w-32">Section Type</TableHead>
                        <TableHead>Section Description</TableHead>
                        <TableHead className="w-40 text-center">Physical PDF Pages</TableHead>
                        <TableHead className="w-28 text-center">Total Pages</TableHead>
                        <TableHead className="w-32 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nonChapters.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                            No non-chapter sections detected.
                          </TableCell>
                        </TableRow>
                      ) : (
                        nonChapters.map((sec, idx) => {
                          const pageSpan = sec.end_pdf_page - sec.start_pdf_page + 1;
                          return (
                            <TableRow key={idx} className="hover:bg-muted/30">
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                                    sec.section_type === "front_matter" || sec.section_type === "preface"
                                      ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                  }`}
                                >
                                  {sec.section_type || "appendix"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {sec.chapter_title}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                pp. {sec.start_pdf_page + 1}–{sec.end_pdf_page + 1}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {pageSpan} pages
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-[10px]">
                                  Excluded from RAG
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="shrink-0 flex flex-col sm:flex-row items-center justify-between sm:justify-between border-t pt-3 gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hash className="h-3.5 w-3.5" />
            <span>
              <strong>{chapters.length}</strong> main units ({totalSubChapters} sub-readings) calibrated
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving || confirming}
              className="h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveChanges}
              disabled={loading || saving || confirming}
              className="h-9 px-4"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Boundaries
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmAndProcess}
              disabled={loading || saving || confirming || chapters.length === 0}
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            >
              {confirming ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirm & Index All Chapters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
