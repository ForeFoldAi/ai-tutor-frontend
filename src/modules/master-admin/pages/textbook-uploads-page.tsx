import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { StatusPill } from "../components/status-pill";
import { exportCsv } from "@/modules/master-admin/utils/export-csv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import {
  UploadCloud,
  Trash2,
  RotateCcw,
  FileText,
  X,
  Loader2,
  Plus,
  CheckCircle2,
  ListTree,
  BookOpen,
  Search,
  ArrowLeft,
  ChevronRight,
  School,
  GraduationCap,
  AlertTriangle,
  BookMarked,
  Eye,
  Pencil,
  ExternalLink,
  Calendar,
  Layers,
  Image as ImageIcon,
  StopCircle,
} from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  confirmTextbookStructure,
  createPublisher,
  deleteTextbook,
  deleteTextbookUpload,
  getCatalogBoards,
  getCatalogEnums,
  getSyllabusSubjects,
  getTextbooks,
  getTextbookUploadFileUrl,
  getTextbookUploads,
  retryTextbookProcessing,
  stopTextbookProcessing,
  updateTextbookUpload,
  uploadFullTextbook,
  getStorageProgress,
  updateTextbookPublisher,
  uploadTextbookFiles,
} from "@/api/masterAdmin";
import type { BoardResponse, ClassEnumApi, ContentTypeApi, TextbookSummaryApi, TextbookUploadApi } from "@/api/types";
import { TextbookStructureDialog } from "../components/textbook-structure-dialog";
import { TextbookImagesGalleryDialog } from "../components/textbook-images-gallery-dialog";
import { API_BASE } from "@/api/index";
import { useAuthStore } from "@/lib/auth-store";

const CONTENT_TYPES: { value: ContentTypeApi; label: string }[] = [
  { value: "CHAPTER", label: "Chapter" },
  { value: "POEM", label: "Poem" },
  { value: "UNIT", label: "Unit" },
  { value: "LESSON", label: "Lesson" },
  { value: "MASTER", label: "Master (Full Book)" },
];

const ACCEPTED_TYPES = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const topSchema = z.object({
  board: z.string().min(1, "Select a board"),
  class_name: z.string().min(1, "Select a class"),
  subject: z.string().min(1, "Select a subject"),
});
type TopValues = z.infer<typeof topSchema>;

const classLabel = (cls: string) => cls.replace("CLASS_", "Class ");
const boardLabel = (b: string) => b.replace(/_/g, " ");
const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const DEFAULT_PUBLISHER = "default";
const NEW_PUBLISHER = "new";
/** Keep in sync with MAX_TEXTBOOK_BYTES in the backend textbook_router. */
const MAX_TEXTBOOK_MB = 500;
const normSubject = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

type PublisherOption = {
  key: string;
  label: string;
  subtitle: string;
  /** null = default pool */
  bookId: number | null;
  /** books that have a PDF (publisher-only books have none) */
  books: TextbookSummaryApi[];
  chapters: TextbookUploadApi[];
};

interface UploadEntry {
  id: number;
  contentType: ContentTypeApi | "";
  name: string;
  files: File[];
}

function namePlaceholder(ct: string) {
  switch (ct) {
    case "MASTER": return "e.g. Complete Textbook";
    case "POEM": return "e.g. The Road Not Taken";
    case "LESSON": return "e.g. Lesson 3: Photosynthesis";
    case "UNIT": return "e.g. Unit 2: Algebra";
    default: return "e.g. Chapter 1: Introduction";
  }
}

let nextEntryId = 1;

export default function MasterAdminTextbookUploadsPage() {
  const { toast } = useToast();
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [currentBoard, setCurrentBoard] = useState<string>("CBSE");
  const [currentClass, setCurrentClass] = useState<string>("CLASS_8");
  const [currentSubject, setCurrentSubject] = useState<string | null>(null);
  // "default" or a non-default textbook id
  const [currentPublisher, setCurrentPublisher] = useState<string | null>(null);
  // Upload dialog publisher: DEFAULT_PUBLISHER, NEW_PUBLISHER or a textbook id
  const [uploadPublisherKey, setUploadPublisherKey] = useState<string>(DEFAULT_PUBLISHER);
  const [publisherDialog, setPublisherDialog] = useState<{ bookId: number | null; name: string } | null>(null);
  const [savingPublisher, setSavingPublisher] = useState(false);
  const [deletingPublisher, setDeletingPublisher] = useState<PublisherOption | null>(null);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadMode, setUploadMode] = useState<"legacy" | "auto_segment">("legacy");
  const [uploads, setUploads] = useState<TextbookUploadApi[]>([]);
  const [fullTextbooks, setFullTextbooks] = useState<TextbookSummaryApi[]>([]);
  const [fullTextbookFile, setFullTextbookFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [storagePercent, setStoragePercent] = useState(0);
  const storageProgressId = useRef("");
  const [fullTextbookTitle, setFullTextbookTitle] = useState("");
  const [fullTextbookPublisher, setFullTextbookPublisher] = useState("");
  const [structureDialogOpen, setStructureDialogOpen] = useState(false);
  const [selectedTextbookId, setSelectedTextbookId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const [catalogBoards, setCatalogBoards] = useState<BoardResponse[]>([]);
  const [boards, setBoards] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassEnumApi[]>([]);
  const [syllabusSubjects, setSyllabusSubjects] = useState<
    Array<{ board: string; class_level: string; subject_name: string }>
  >([]);
  const [entries, setEntries] = useState<UploadEntry[]>([
    { id: nextEntryId++, contentType: "", name: "", files: [] },
  ]);

  // Preview modal state
  const [previewUpload, setPreviewUpload] = useState<TextbookUploadApi | null>(null);
  const [imagesGalleryUpload, setImagesGalleryUpload] = useState<TextbookUploadApi | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUpload) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }
      setPreviewError(null);
      return;
    }

    let active = true;
    setPreviewLoading(true);
    setPreviewError(null);

    const token = useAuthStore.getState().token;
    fetch(`${API_BASE}/auth/admin/catalog/textbook-uploads/${previewUpload.id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          try {
            const errJson = JSON.parse(errText);
            throw new Error(errJson.detail || `HTTP ${res.status}`);
          } catch {
            throw new Error(errText || `Failed to load preview (${res.status})`);
          }
        }
        return res.blob();
      })
      .then((blob) => {
        if (active) {
          const url = URL.createObjectURL(blob);
          setPreviewBlobUrl(url);
        }
      })
      .catch((err) => {
        if (active) {
          setPreviewError(err.message || "Failed to load document preview");
        }
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewUpload]);

  // Edit modal state
  const [editingUpload, setEditingUpload] = useState<TextbookUploadApi | null>(null);
  const [editChapter, setEditChapter] = useState("");
  const [editContentLabel, setEditContentLabel] = useState("");
  const [editContentType, setEditContentType] = useState<string>("CHAPTER");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete modal state
  const [deletingUpload, setDeletingUpload] = useState<TextbookUploadApi | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<TopValues>({
    resolver: zodResolver(topSchema),
    defaultValues: { board: "", class_name: "", subject: "" },
  });

  const refresh = async () => {
    const [catalogBoardsData, enumData, rows, syllabusRows, tbRows] = await Promise.all([
      getCatalogBoards().catch(() => []),
      getCatalogEnums(),
      getTextbookUploads(),
      getSyllabusSubjects(),
      getTextbooks().catch(() => []),
    ]);
    setCatalogBoards(catalogBoardsData);
    setBoards(enumData.boards);
    setClasses(enumData.classes);
    setUploads(rows);
    setFullTextbooks(tbRows);
    setSyllabusSubjects(
      syllabusRows.map((s) => ({
        board: s.board,
        class_level: s.class_level,
        subject_name: s.subject_name,
      })),
    );
  };

  useEffect(() => {
    refresh()
      .catch(() => toast({ title: "Failed to load uploads", variant: "destructive" }))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boards strictly configured in Boards & Syllabus:
  const configuredBoards = useMemo(() => {
    const set = new Set<string>();
    catalogBoards.forEach((b) => set.add(b.board));
    syllabusSubjects.forEach((s) => set.add(s.board));
    uploads.forEach((u) => set.add(u.board));
    fullTextbooks.forEach((tb) => set.add(tb.board));

    if (set.size === 0 && boards.length > 0) {
      return boards;
    }
    return Array.from(set).sort();
  }, [catalogBoards, syllabusSubjects, uploads, fullTextbooks, boards]);

  // Classes that belong to the selected board in syllabus / uploads:
  const availableClassesForBoard = useMemo(() => {
    if (!currentBoard) return [];
    const set = new Set<string>();
    syllabusSubjects
      .filter((s) => s.board === currentBoard)
      .forEach((s) => set.add(s.class_level));
    uploads
      .filter((u) => u.board === currentBoard)
      .forEach((u) => set.add(u.class_level));
    fullTextbooks
      .filter((tb) => tb.board === currentBoard)
      .forEach((tb) => set.add(tb.class_level));

    const classOrder: string[] = [
      "CLASS_1", "CLASS_2", "CLASS_3", "CLASS_4", "CLASS_5",
      "CLASS_6", "CLASS_7", "CLASS_8", "CLASS_9", "CLASS_10",
    ];

    if (set.size > 0) {
      return Array.from(set).sort((a, b) => {
        const ia = classOrder.indexOf(a);
        const ib = classOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.localeCompare(b);
      });
    }
    return classes;
  }, [currentBoard, syllabusSubjects, uploads, fullTextbooks, classes]);

  // Keep board in sync with configuredBoards
  useEffect(() => {
    if (configuredBoards.length > 0) {
      if (!currentBoard || !configuredBoards.includes(currentBoard)) {
        setCurrentBoard(configuredBoards[0]);
      }
    }
  }, [configuredBoards, currentBoard]);

  // Keep class in sync with availableClassesForBoard
  useEffect(() => {
    if (availableClassesForBoard.length > 0) {
      if (!currentClass || !availableClassesForBoard.includes(currentClass as ClassEnumApi)) {
        setCurrentClass(availableClassesForBoard[0]);
      }
    }
  }, [availableClassesForBoard, currentClass]);

  // Subjects strictly from syllabus and uploads for the selected board & class (NO MOCK DATA)
  const availableSubjects = useMemo(() => {
    if (!currentBoard || !currentClass) return [];
    const list = new Set<string>();
    syllabusSubjects
      .filter((s) => s.board === currentBoard && s.class_level === currentClass)
      .forEach((s) => list.add(s.subject_name));
    uploads
      .filter((u) => u.board === currentBoard && u.class_level === currentClass)
      .forEach((u) => list.add(u.subject_name));
    fullTextbooks
      .filter((tb) => tb.board === currentBoard && tb.class_level === currentClass)
      .forEach((tb) => list.add(tb.subject_name));

    return Array.from(list).sort();
  }, [currentBoard, currentClass, syllabusSubjects, uploads, fullTextbooks]);

  const subjectStats = useMemo(() => {
    const map: Record<
      string,
      {
        totalChapters: number;
        readyCount: number;
        inProgressCount: number;
        fullBooks: TextbookSummaryApi[];
        chapters: TextbookUploadApi[];
      }
    > = {};

    availableSubjects.forEach((subj) => {
      const sNorm = subj.toLowerCase();
      const sUploads = uploads.filter(
        (u) =>
          u.board === currentBoard &&
          u.class_level === currentClass &&
          u.subject_name.toLowerCase() === sNorm,
      );
      const sBooks = fullTextbooks.filter(
        (tb) =>
          tb.board === currentBoard &&
          tb.class_level === currentClass &&
          tb.subject_name.toLowerCase() === sNorm,
      );
      const ready = sUploads.filter((u) => u.embedding_status === "EMBEDDED").length;
      const inProgress = sUploads.filter(
        (u) => u.embedding_status === "PROCESSING" || u.embedding_status === "QUEUED",
      ).length;

      map[subj] = {
        totalChapters: sUploads.length,
        readyCount: ready,
        inProgressCount: inProgress,
        fullBooks: sBooks,
        chapters: sUploads,
      };
    });

    return map;
  }, [availableSubjects, currentBoard, currentClass, uploads, fullTextbooks]);

  const activeSubjectInfo = currentSubject ? subjectStats[currentSubject] : null;

  // Default pool = books marked default + standalone chapter uploads; every non-default book is its own publisher.
  const publisherOptions = useMemo((): PublisherOption[] => {
    const books = activeSubjectInfo?.fullBooks ?? [];
    const chapters = activeSubjectInfo?.chapters ?? [];
    const keyOfBook = new Map(fullTextbooks.map((tb) => [tb.id, tb.is_default === false ? String(tb.id) : DEFAULT_PUBLISHER]));
    const keyOfUpload = (u: TextbookUploadApi) =>
      (u.textbook_id != null && keyOfBook.get(u.textbook_id)) || DEFAULT_PUBLISHER;
    return [
      {
        key: DEFAULT_PUBLISHER,
        label: "Default",
        subtitle: "Used by every class that has not picked a publisher",
        bookId: null,
        books: books.filter((b) => b.is_default !== false && b.file_name),
        chapters: chapters.filter((u) => keyOfUpload(u) === DEFAULT_PUBLISHER),
      },
      ...books
        .filter((b) => b.is_default === false)
        .map((b) => ({
          key: String(b.id),
          label: b.publisher?.trim() || "Unnamed publisher",
          subtitle: b.file_name ? b.title : "No complete book yet",
          bookId: b.id,
          books: b.file_name ? [b] : [],
          chapters: chapters.filter((u) => keyOfUpload(u) === String(b.id)),
        })),
    ];
  }, [activeSubjectInfo, fullTextbooks]);

  const savePublisherDialog = async () => {
    if (!publisherDialog || !currentSubject) return;
    const name = publisherDialog.name.trim();
    if (!name) return;
    setSavingPublisher(true);
    try {
      if (publisherDialog.bookId === null) {
        const tb = await createPublisher({
          board: currentBoard,
          class_name: currentClass,
          subject: currentSubject,
          publisher: name,
        });
        await refresh();
        setCurrentPublisher(String(tb.id));
        toast({ title: "Publisher added", description: name });
      } else {
        await updateTextbookPublisher(publisherDialog.bookId, { publisher: name });
        await refresh();
        toast({ title: "Publisher renamed", description: name });
      }
      setPublisherDialog(null);
    } catch (err: any) {
      toast({ title: "Could not save publisher", description: err.message, variant: "destructive" });
    } finally {
      setSavingPublisher(false);
    }
  };

  const confirmDeletePublisher = async () => {
    if (!deletingPublisher?.bookId) return;
    setSavingPublisher(true);
    try {
      const res = await deleteTextbook(deletingPublisher.bookId);
      await refresh();
      if (currentPublisher === deletingPublisher.key) setCurrentPublisher(null);
      setDeletingPublisher(null);
      toast({ title: "Publisher deleted", description: res.message });
    } catch (err: any) {
      toast({ title: "Could not delete publisher", description: err.message, variant: "destructive" });
    } finally {
      setSavingPublisher(false);
    }
  };

  const activePublisher = publisherOptions.find((p) => p.key === currentPublisher) ?? null;
  const activeChapters = activePublisher ? activePublisher.chapters : [];
  const activeFullBooks = activePublisher ? activePublisher.books : [];

  const readyChaptersCount = useMemo(
    () => activeChapters.filter((u) => u.embedding_status === "EMBEDDED").length,
    [activeChapters],
  );
  const pendingChaptersCount = useMemo(
    () =>
      activeChapters.filter(
        (u) =>
          ["PROCESSING", "QUEUED"].includes(u.embedding_status) ||
          ["PROCESSING", "QUEUED"].includes(u.chunk_status) ||
          ["PROCESSING", "QUEUED"].includes(u.ocr_status),
      ).length,
    [activeChapters],
  );
  const totalChaptersCount = activeChapters.length;
  const isChaptersCompleted = totalChaptersCount > 0 && pendingChaptersCount === 0;

  const activeBook = activeFullBooks[0] || null;

  const knownPublishers = useMemo(
    () => [...new Set(fullTextbooks.map((tb) => tb.publisher?.trim()).filter((p): p is string => !!p))].sort(),
    [fullTextbooks],
  );

  const saveBookPublisher = async (textbookId: number, payload: { publisher?: string; is_default?: boolean }) => {
    try {
      await updateTextbookPublisher(textbookId, payload);
      setFullTextbooks((prev) => prev.map((tb) => (tb.id === textbookId ? { ...tb, ...payload } : tb)));
      // Follow the book into its new publisher group so it doesn't vanish from view.
      if (payload.is_default !== undefined) setCurrentPublisher(payload.is_default ? DEFAULT_PUBLISHER : String(textbookId));
    } catch (err: any) {
      toast({ title: "Could not update book", description: err.message, variant: "destructive" });
    }
  };
  const bookTotalChapters = activeBook ? activeBook.chapter_count || activeChapters.length || 0 : 0;
  const bookCompletedChapters = activeBook
    ? activeBook.status === "COMPLETED"
      ? bookTotalChapters
      : Math.min(
          bookTotalChapters,
          Math.max(
            activeBook.completed_chapters || 0,
            activeChapters.filter((c) => c.embedding_status === "EMBEDDED").length,
          ),
        )
    : 0;

  const isBookProcessing =
    activeBook &&
    (activeBook.status === "PROCESSING" ||
      activeBook.status === "CONFIRMED" ||
      (activeBook.status !== "FAILED" &&
        activeBook.status !== "AWAITING_REVIEW" &&
        activeBook.status !== "COMPLETED" &&
        bookTotalChapters > 0 &&
        bookCompletedChapters < bookTotalChapters));

  const isBookCompleted =
    activeBook &&
    (activeBook.status === "COMPLETED" ||
      (bookTotalChapters > 0 &&
        bookCompletedChapters >= bookTotalChapters &&
        activeBook.status !== "FAILED" &&
        activeBook.status !== "AWAITING_REVIEW"));

  const isBookAnalyzing = activeBook && activeBook.status === "ANALYZING";
  const isBookAwaitingReview = activeBook && activeBook.status === "AWAITING_REVIEW";
  const isBookFailed = activeBook && activeBook.status === "FAILED";

  // Auto-polling when background processing is active
  const hasPendingWork = useMemo(() => {
    const hasPendingBook = fullTextbooks.some((tb) =>
      ["ANALYZING", "CONFIRMED", "PROCESSING"].includes(tb.status),
    );
    const hasPendingUpload = uploads.some(
      (u) =>
        ["PROCESSING", "QUEUED"].includes(u.embedding_status) ||
        ["PROCESSING", "QUEUED"].includes(u.chunk_status) ||
        ["PROCESSING", "QUEUED"].includes(u.ocr_status),
    );
    return hasPendingBook || hasPendingUpload;
  }, [fullTextbooks, uploads]);

  // Boards, enums and syllabus don't change while a book processes — poll only the status rows.
  const refreshProgress = async () => {
    const [rows, tbRows] = await Promise.all([getTextbookUploads(), getTextbooks().catch(() => [])]);
    setUploads(rows);
    setFullTextbooks(tbRows);
  };

  // Browser -> server is done; follow the server's push to S3 until the upload request returns.
  useEffect(() => {
    if (!uploading || uploadPercent < 100) return;
    const timer = setInterval(() => {
      getStorageProgress(storageProgressId.current)
        .then((r) => r.percent != null && setStoragePercent(r.percent))
        .catch(() => {});
    }, 1000);
    return () => clearInterval(timer);
  }, [uploading, uploadPercent]);

  useEffect(() => {
    if (!hasPendingWork) return;
    const interval = setInterval(() => {
      refreshProgress().catch(() => {});
    }, 3500);
    return () => clearInterval(interval);
  }, [hasPendingWork]);

  const filteredActiveChapters = useMemo(() => {
    if (!subjectSearchQuery.trim()) return activeChapters;
    const q = subjectSearchQuery.toLowerCase();
    return activeChapters.filter(
      (c) =>
        c.file_name.toLowerCase().includes(q) ||
        (c.chapter && c.chapter.toLowerCase().includes(q)) ||
        (c.content_label && c.content_label.toLowerCase().includes(q)),
    );
  }, [activeChapters, subjectSearchQuery]);

  const filteredSubjectsList = useMemo(() => {
    if (!searchQuery.trim()) return availableSubjects;
    const q = searchQuery.toLowerCase();
    return availableSubjects.filter((s) => s.toLowerCase().includes(q));
  }, [availableSubjects, searchQuery]);

  const getSubjectColor = (subj: string) => {
    const s = subj.toLowerCase();
    if (s.includes("math"))
      return {
        bg: "from-blue-500/10 to-indigo-500/10 border-blue-500/25 hover:border-blue-500/50",
        iconBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      };
    if (s.includes("eng"))
      return {
        bg: "from-purple-500/10 to-pink-500/10 border-purple-500/25 hover:border-purple-500/50",
        iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
      };
    if (s.includes("sci") || s.includes("phys") || s.includes("chem") || s.includes("bio"))
      return {
        bg: "from-emerald-500/10 to-teal-500/10 border-emerald-500/25 hover:border-emerald-500/50",
        iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      };
    if (s.includes("soc") || s.includes("hist") || s.includes("geog"))
      return {
        bg: "from-amber-500/10 to-orange-500/10 border-amber-500/25 hover:border-amber-500/50",
        iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      };
    return {
      bg: "from-slate-500/10 to-gray-500/10 border-slate-500/25 hover:border-slate-500/50",
      iconBg: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
    };
  };

  const selectedBoard = form.watch("board");
  const selectedClass = form.watch("class_name");

  // Classes for the form's selected board from syllabus & uploads
  const formClassesForBoard = useMemo(() => {
    if (!selectedBoard) return classes;
    const set = new Set<string>();
    syllabusSubjects
      .filter((s) => s.board === selectedBoard)
      .forEach((s) => set.add(s.class_level));
    uploads
      .filter((u) => u.board === selectedBoard)
      .forEach((u) => set.add(u.class_level));
    if (set.size === 0) return classes;
    const classOrder = [
      "CLASS_1", "CLASS_2", "CLASS_3", "CLASS_4", "CLASS_5",
      "CLASS_6", "CLASS_7", "CLASS_8", "CLASS_9", "CLASS_10",
    ];
    return Array.from(set).sort((a, b) => classOrder.indexOf(a) - classOrder.indexOf(b));
  }, [selectedBoard, syllabusSubjects, uploads, classes]);

  const selectedFormSubject = form.watch("subject");
  const formPublishers = useMemo(
    () =>
      fullTextbooks.filter(
        (tb) =>
          tb.is_default === false &&
          tb.board === selectedBoard &&
          tb.class_level === selectedClass &&
          !!selectedFormSubject &&
          normSubject(tb.subject_name) === normSubject(selectedFormSubject),
      ),
    [fullTextbooks, selectedBoard, selectedClass, selectedFormSubject],
  );

  useEffect(() => {
    if (uploadPublisherKey === DEFAULT_PUBLISHER || uploadPublisherKey === NEW_PUBLISHER) return;
    const tb = formPublishers.find((b) => String(b.id) === uploadPublisherKey);
    if (!tb || (uploadMode === "auto_segment" && tb.file_name)) setUploadPublisherKey(DEFAULT_PUBLISHER);
  }, [formPublishers, uploadPublisherKey, uploadMode]);

  /** Book id for the chosen publisher (creating a new one if asked); undefined = default pool. */
  const resolveUploadPublisher = async (values: TopValues): Promise<number | undefined> => {
    if (uploadPublisherKey === DEFAULT_PUBLISHER) return undefined;
    if (uploadPublisherKey !== NEW_PUBLISHER) return Number(uploadPublisherKey);
    const name = fullTextbookPublisher.trim();
    if (!name) throw new Error("Enter the new publisher's name.");
    const tb = await createPublisher({
      board: values.board,
      class_name: values.class_name,
      subject: values.subject,
      publisher: name,
    });
    return tb.id;
  };

  const subjectOptions = useMemo(
    () =>
      Array.from(
        new Set(
          syllabusSubjects
            .filter((s) => s.board === selectedBoard && s.class_level === selectedClass)
            .map((s) => s.subject_name),
        ),
      ),
    [selectedBoard, selectedClass, syllabusSubjects],
  );

  useEffect(() => {
    if (subjectOptions.length === 0) return;
    const current = form.getValues("subject");
    if (!subjectOptions.includes(current)) {
      form.setValue("subject", subjectOptions[0], { shouldValidate: true });
    }
  }, [form, subjectOptions]);

  const updateEntry = (id: number, patch: Partial<UploadEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeEntry = (id: number) => {
    setEntries((prev) => (prev.length <= 1 ? prev : prev.filter((e) => e.id !== id)));
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, { id: nextEntryId++, contentType: "", name: "", files: [] }]);
  };

  const removeFileFromEntry = (entryId: number, fileIdx: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, files: e.files.filter((_, i) => i !== fileIdx) } : e,
      ),
    );
  };

  const totalFileCount = entries.reduce((sum, e) => sum + e.files.length, 0);

  const resetDialog = () => {
    setEntries([{ id: nextEntryId++, contentType: "", name: "", files: [] }]);
    setFullTextbookFile(null);
    setFullTextbookTitle("");
    setFullTextbookPublisher("");
    setUploadPublisherKey(DEFAULT_PUBLISHER);
    setUploadMode("legacy");
    form.reset();
  };

  const formatUploadDateTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const handleOpenEdit = (upload: TextbookUploadApi) => {
    setEditingUpload(upload);
    setEditChapter(upload.chapter || "");
    setEditContentLabel(upload.content_label || "");
    setEditContentType(upload.content_type || "CHAPTER");
  };

  const handleSaveEdit = async () => {
    if (!editingUpload) return;
    setIsSavingEdit(true);
    try {
      const updated = await updateTextbookUpload(editingUpload.id, {
        chapter: editChapter.trim(),
        content_label: editContentLabel.trim(),
        content_type: editContentType,
      });
      setUploads((prev) =>
        prev.map((item) => (String(item.id) === String(editingUpload.id) ? updated : item))
      );
      toast({
        title: "Chapter updated",
        description: `Updated "${editContentLabel || editChapter}" successfully.`,
      });
      setEditingUpload(null);
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message || "Failed to update chapter details.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteUpload = async () => {
    if (!deletingUpload) return;
    setIsDeleting(true);
    try {
      await deleteTextbookUpload(deletingUpload.id);
      setUploads((prev) => prev.filter((item) => String(item.id) !== String(deletingUpload.id)));
      toast({
        title: "Chapter deleted",
        description: "Upload and vector embeddings removed successfully.",
      });
      setDeletingUpload(null);
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Could not delete upload.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadSubmit = async (values: TopValues) => {
    if (uploadMode === "auto_segment") {
      if (!fullTextbookFile) {
        toast({ title: "Select a textbook PDF file", variant: "destructive" });
        return;
      }
      setUploading(true);
      setUploadPercent(0);
      setStoragePercent(0);
      storageProgressId.current = crypto.randomUUID();
      try {
        const publisherBookId = await resolveUploadPublisher(values);
        const tb = await uploadFullTextbook({
          onProgress: setUploadPercent,
          progressId: storageProgressId.current,
          file: fullTextbookFile,
          board: values.board,
          class_name: values.class_name,
          subject: values.subject,
          title: fullTextbookTitle.trim() || fullTextbookFile.name.replace(/\.[^/.]+$/, ""),
          is_default: publisherBookId === undefined,
          textbook_id: publisherBookId,
        });
        toast({
          title: "Full textbook uploaded",
          description: "Analyzing table of contents and chapter boundaries...",
        });
        setUploadOpen(false);
        resetDialog();
        await refresh();
        setCurrentBoard(values.board);
        setCurrentClass(values.class_name);
        setCurrentSubject(values.subject);
        setCurrentPublisher(publisherBookId === undefined ? DEFAULT_PUBLISHER : String(tb.id));
        setSelectedTextbookId(tb.id);
        setStructureDialogOpen(true);
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
      return;
    }

    const validEntries = entries.filter((e) => e.contentType && e.name.trim() && e.files.length > 0);
    if (validEntries.length === 0) {
      toast({ title: "Add at least one entry with content type, name, and file", variant: "destructive" });
      return;
    }
    const incomplete = entries.filter(
      (e) => (e.contentType || e.name.trim() || e.files.length > 0) && (!e.contentType || !e.name.trim() || e.files.length === 0),
    );
    if (incomplete.length > 0) {
      toast({ title: "Some entries are incomplete", description: "Fill in content type, name, and file for each row.", variant: "destructive" });
      return;
    }

    setUploading(true);
    let uploaded = 0;
    try {
      const publisherBookId = await resolveUploadPublisher(values);
      for (const entry of validEntries) {
        await uploadTextbookFiles({
          files: entry.files,
          board: values.board,
          class_name: values.class_name,
          subject: values.subject,
          content_type: entry.contentType as ContentTypeApi,
          content_labels: entry.files.map(() => entry.name.trim()).join(","),
          textbook_id: publisherBookId,
        });
        uploaded += entry.files.length;
      }
      await refresh();
      setCurrentBoard(values.board);
      setCurrentClass(values.class_name);
      setCurrentSubject(values.subject);
      setCurrentPublisher(publisherBookId === undefined ? DEFAULT_PUBLISHER : String(publisherBookId));
      setUploadOpen(false);
      resetDialog();
      toast({
        title: `${uploaded} file(s) uploaded`,
        description: "Chunking & embedding started automatically.",
      });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-80 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <datalist id="textbook-publishers">
        {knownPublishers.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Textbook Uploads</h1>
          <p className="text-sm text-muted-foreground">Upload textbook PDFs or Word docs. Chunking & embedding runs automatically.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportCsv({
                rows: uploads as unknown as Record<string, unknown>[],
                columns: [
                  { key: "file_name", header: "File Name" },
                  { key: "board", header: "Board" },
                  { key: "class_level", header: "Class" },
                  { key: "subject_name", header: "Subject" },
                  { key: "chapter", header: "Chapter" },
                  { key: "content_type", header: "Content Type" },
                  { key: "chunk_count", header: "Chunks" },
                  { key: "upload_date", header: "Upload Date" },
                  { key: "embedding_status", header: "Embedding" },
                ],
                fileName: `textbook_uploads_${new Date().toISOString().slice(0, 10)}.csv`,
              })
            }
          >
            Export CSV
          </Button>

          <Dialog
            open={uploadOpen}
            onOpenChange={(open) => {
              setUploadOpen(open);
              if (!open) resetDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="shrink-0">
                <DialogTitle>Upload Textbook Content</DialogTitle>
                <DialogDescription>
                  Choose between direct single chapter upload or full textbook automatic chapter detection.
                </DialogDescription>
              </DialogHeader>

              {/* Mode Selection Toggle */}
              <div className="flex rounded-md bg-muted p-1 gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant={uploadMode === "legacy" ? "default" : "ghost"}
                  className="flex-1 text-xs"
                  onClick={() => setUploadMode("legacy")}
                >
                  Direct / Single Chapter (Legacy)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={uploadMode === "auto_segment" ? "default" : "ghost"}
                  className="flex-1 text-xs"
                  onClick={() => setUploadMode("auto_segment")}
                >
                  Full Textbook (Auto Chapter Detection)
                </Button>
              </div>

              <Form {...form}>
                <form
                  className="flex flex-col flex-1 min-h-0 gap-4"
                  onSubmit={form.handleSubmit(handleUploadSubmit)}
                >
                  {/* Board / Class / Subject — fixed at top */}
                  <div className="shrink-0 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="board"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Board</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              form.setValue("class_name", "", { shouldValidate: false });
                              form.setValue("subject", "", { shouldValidate: false });
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Board" /></SelectTrigger>
                            <SelectContent>
                              {configuredBoards.map((b) => (
                                <SelectItem key={b} value={b}>{boardLabel(b)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="class_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              form.setValue("subject", "", { shouldValidate: false });
                            }}
                            disabled={!selectedBoard}
                          >
                            <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                            <SelectContent>
                              {formClassesForBoard.map((c) => (
                                <SelectItem key={c} value={c}>{classLabel(c)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!selectedBoard || !selectedClass || subjectOptions.length === 0}
                          >
                            <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                            <SelectContent>
                              {subjectOptions.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Publisher — applies to both upload modes */}
                  <div className="shrink-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Publisher</label>
                      <Select
                        value={uploadPublisherKey}
                        onValueChange={setUploadPublisherKey}
                        disabled={!selectedFormSubject}
                      >
                        <SelectTrigger aria-label="Publisher">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={DEFAULT_PUBLISHER}>Default</SelectItem>
                          {formPublishers.map((tb) => (
                            <SelectItem
                              key={tb.id}
                              value={String(tb.id)}
                              // A publisher holds at most one complete book.
                              disabled={uploadMode === "auto_segment" && !!tb.file_name}
                            >
                              {tb.publisher || "Unnamed publisher"}
                              {uploadMode === "auto_segment" && tb.file_name ? " (already has a book)" : ""}
                            </SelectItem>
                          ))}
                          <SelectItem value={NEW_PUBLISHER}>+ New publisher…</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {uploadPublisherKey === NEW_PUBLISHER && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">New publisher name</label>
                        <Input
                          placeholder="e.g. S. Chand, Oxford"
                          list="textbook-publishers"
                          maxLength={120}
                          value={fullTextbookPublisher}
                          onChange={(e) => setFullTextbookPublisher(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {uploadMode === "auto_segment" ? (
                    /* Full Textbook Upload View */
                    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-1">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Textbook Title</label>
                        <Input
                          placeholder="e.g. NCERT Grade 10 Science"
                          value={fullTextbookTitle}
                          onChange={(e) => setFullTextbookTitle(e.target.value)}
                        />
                      </div>

                      <div className="rounded-lg border-2 border-dashed p-6 text-center space-y-2">
                        <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                        <div className="text-sm">
                          <label className="cursor-pointer font-medium text-primary hover:underline">
                            Choose complete textbook PDF
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  const f = e.target.files[0];
                                  if (f.size > MAX_TEXTBOOK_MB * 1024 * 1024) {
                                    toast({
                                      title: `Textbook PDF must be ${MAX_TEXTBOOK_MB} MB or smaller`,
                                      variant: "destructive",
                                    });
                                    e.target.value = "";
                                    return;
                                  }
                                  setFullTextbookFile(f);
                                  if (!fullTextbookTitle) {
                                    setFullTextbookTitle(f.name.replace(/\.[^/.]+$/, ""));
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>
                        {fullTextbookFile ? (
                          <div className="text-xs font-semibold text-green-600">
                            Selected: {fullTextbookFile.name} ({(fullTextbookFile.size / (1024 * 1024)).toFixed(1)} MB)
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Single textbook PDF file with multiple chapters (up to {MAX_TEXTBOOK_MB} MB)
                          </p>
                        )}
                        {uploading && (
                          <div className="space-y-2 pt-2 text-left">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-medium">
                                <span>Uploading to server</span>
                                <span>{uploadPercent}%</span>
                              </div>
                              <Progress value={uploadPercent} className="h-2" />
                            </div>
                            {uploadPercent === 100 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                  <span>Saving to  storage</span>
                                  <span>{storagePercent}%</span>
                                </div>
                                <Progress value={storagePercent} className="h-2" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Existing Legacy Multi-entry View */
                    <>
                      {/* Entries header */}
                      <div className="shrink-0 flex items-center justify-between">
                        <p className="text-sm font-medium">
                          Content Entries
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({entries.length} {entries.length === 1 ? "entry" : "entries"}, {totalFileCount} file{totalFileCount !== 1 ? "s" : ""})
                          </span>
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Add
                        </Button>
                      </div>

                      {/* Scrollable entries list */}
                      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-2">
                        {entries.map((entry, idx) => (
                          <div key={entry.id} className="rounded-lg border p-3 space-y-2">
                            {/* Row: # | Content Type | Name | File btn | Remove */}
                            <div className="flex items-end gap-2">
                              <span className="shrink-0 text-xs font-bold text-muted-foreground w-5 text-right pb-2">
                                {idx + 1}.
                              </span>

                              <div className="w-[130px] shrink-0 space-y-1">
                                {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Type</label>}
                                <Select
                                  value={entry.contentType}
                                  onValueChange={(v) => updateEntry(entry.id, { contentType: v as ContentTypeApi })}
                                >
                                  <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CONTENT_TYPES.map((ct) => (
                                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex-1 min-w-0 space-y-1">
                                {idx === 0 && <label className="text-xs font-medium text-muted-foreground">Name</label>}
                                <Input
                                  className="h-9 text-sm"
                                  placeholder={namePlaceholder(entry.contentType)}
                                  value={entry.name}
                                  onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                                />
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 h-9 px-2.5"
                                onClick={() => fileInputRefs.current[entry.id]?.click()}
                              >
                                <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                                {entry.files.length > 0
                                  ? `${entry.files.length} file${entry.files.length > 1 ? "s" : ""}`
                                  : "File"}
                              </Button>
                              <input
                                ref={(el) => { fileInputRefs.current[entry.id] = el; }}
                                type="file"
                                accept={ACCEPTED_TYPES}
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    const newFiles = Array.from(e.target.files);
                                    updateEntry(entry.id, { files: [...entry.files, ...newFiles] });
                                  }
                                  e.target.value = "";
                                }}
                              />

                              {entries.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeEntry(entry.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>

                            {/* File chips */}
                            {entry.files.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-7">
                                {entry.files.map((file, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"
                                  >
                                    <FileText className="h-3 w-3 text-muted-foreground" />
                                    <span className="max-w-[140px] truncate">{file.name}</span>
                                    <button
                                      type="button"
                                      className="text-muted-foreground hover:text-destructive ml-0.5"
                                      onClick={() => removeFileFromEntry(entry.id, fIdx)}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Footer — fixed at bottom */}
                  <div className="shrink-0 flex items-center justify-between border-t pt-3">
                    {uploadMode === "legacy" ? (
                      <Button type="button" variant="outline" size="sm" onClick={addEntry}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add More
                      </Button>
                    ) : <div />}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setUploadOpen(false);
                          resetDialog();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          uploading ||
                          (uploadMode === "legacy" ? totalFileCount === 0 : !fullTextbookFile)
                        }
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {uploadMode !== "auto_segment"
                              ? "Uploading..."
                              : uploadPercent < 100
                                ? `Uploading ${uploadPercent}%`
                                : `Saving  ${storagePercent}%`}
                          </>
                        ) : (
                          <>
                            <UploadCloud className="mr-2 h-4 w-4" />
                            {uploadMode === "auto_segment"
                              ? "Upload & Detect Chapters"
                              : `Upload All (${totalFileCount})`}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Curriculum & Grade Selector Bar (Only displayed when browsing subjects) */}
      {!currentSubject && (
        <Card className="shadow-sm border bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Board:</span>
                  <Select
                    value={currentBoard}
                    onValueChange={(val) => {
                      setCurrentBoard(val);
                      setCurrentSubject(null);
                    }}
                  >
                    <SelectTrigger className="h-9 w-44 text-xs font-medium">
                      <SelectValue placeholder="Select Board" />
                    </SelectTrigger>
                    <SelectContent>
                      {configuredBoards.map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">
                          {boardLabel(b)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class:</span>
                  <Select
                    value={currentClass}
                    onValueChange={(val) => {
                      setCurrentClass(val);
                      setCurrentSubject(null);
                    }}
                    disabled={availableClassesForBoard.length === 0}
                  >
                    <SelectTrigger className="h-9 w-36 text-xs font-medium">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClassesForBoard.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {classLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-mono text-xs">
                  {availableSubjects.length} Subjects
                </Badge>
                <span>in</span>
                <span className="font-semibold text-foreground">
                  {boardLabel(currentBoard)} • {classLabel(currentClass)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VIEW 1: SUBJECT CARDS GRID (When no subject is currently selected) */}
      {!currentSubject && (
        <div className="space-y-4">
          {availableSubjects.length === 0 ? (
            <Card className="border-dashed p-10 text-center flex flex-col items-center justify-center gap-3 bg-muted/15">
              <div className="p-3 rounded-full bg-muted text-muted-foreground">
                <BookMarked className="h-8 w-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-foreground">
                  No Subjects Configured in Syllabus
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  There are currently no syllabus subjects configured for{" "}
                  <span className="font-semibold text-foreground">{boardLabel(currentBoard)} • {classLabel(currentClass)}</span>.
                  Configure subjects in Boards &amp; Syllabus or upload chapters directly.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => navigate("/master-admin/boards-syllabus")}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Manage Boards &amp; Syllabus
                </Button>
                <Button
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => {
                    form.setValue("board", currentBoard);
                    form.setValue("class_name", currentClass);
                    setUploadOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Upload Chapter / Book
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Select a Subject
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click any subject card to view all uploaded chapters and manage textbook structure.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9 bg-muted/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredSubjectsList.map((subj) => {
              const stats = subjectStats[subj] || {
                totalChapters: 0,
                readyCount: 0,
                inProgressCount: 0,
                fullBooks: [],
                chapters: [],
              };
              const color = getSubjectColor(subj);
              const pdfBooks = stats.fullBooks.filter((b) => b.file_name);
              const hasFullBook = pdfBooks.length > 0;
              const hasReview = stats.fullBooks.some((b) => b.status === "AWAITING_REVIEW");

              return (
                <Card
                  key={subj}
                  onClick={() => {
                    setCurrentSubject(subj);
                    setCurrentPublisher(null);
                    setSubjectSearchQuery("");
                  }}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-gradient-to-br ${color.bg} group flex flex-col justify-between`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`p-2.5 rounded-xl ${color.iconBg} shadow-sm shrink-0`}>
                        <BookMarked className="h-5 w-5" />
                      </div>
                      {hasReview && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 shrink-0"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Review Required
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors mt-2">
                      {subj}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {boardLabel(currentBoard)} • {classLabel(currentClass)}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-2 border-t border-border/40">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Chapters Status:</span>
                        {stats.inProgressCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[10px] gap-1 font-semibold"
                          >
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {stats.readyCount}/{stats.totalChapters} Pending
                          </Badge>
                        ) : stats.totalChapters > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-semibold"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">0 uploaded</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Publishers:</span>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {1 + stats.fullBooks.filter((b) => b.is_default === false).length}
                        </Badge>
                      </div>

                      {hasFullBook && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Complete Book:</span>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {pdfBooks[0].total_pages} pages
                          </Badge>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                        <span>Choose Publisher</span>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  )}

      {/* VIEW 1.5: PUBLISHER PICKER (subject selected, publisher not yet chosen) */}
      {currentSubject && !activePublisher && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-muted/20">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSubject(null)}
                className="h-8 gap-1.5 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                All Subjects
              </Button>
              <div className="h-4 w-px bg-border" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">{currentSubject}</h2>
                  <Badge variant="outline" className="text-xs uppercase font-mono">
                    {boardLabel(currentBoard)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {classLabel(currentClass)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Select a publisher to view its textbooks and chapters.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {publisherOptions.map((p) => (
              <Card
                key={p.key}
                role="button"
                tabIndex={0}
                onClick={() => setCurrentPublisher(p.key)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setCurrentPublisher(p.key)}
                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/50 group flex flex-col justify-between"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-sm shrink-0">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    {p.bookId === null ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Default
                      </Badge>
                    ) : (
                      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          aria-label={`Rename ${p.label}`}
                          title="Rename publisher"
                          onClick={() => setPublisherDialog({ bookId: p.bookId, name: p.label })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Delete ${p.label}`}
                          title="Delete publisher"
                          onClick={() => setDeletingPublisher(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-base font-bold tracking-tight group-hover:text-primary transition-colors mt-2">
                    {p.label}
                  </CardTitle>
                  <CardDescription className="text-xs truncate">{p.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 border-t border-border/40 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Textbooks:</span>
                    <span className="font-semibold">{p.books.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chapters:</span>
                    <span className="font-semibold">{p.chapters.length}</span>
                  </div>
                  <div className="pt-2 flex items-center justify-between font-semibold text-primary">
                    <span>View Textbooks</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => setPublisherDialog({ bookId: null, name: "" })}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPublisherDialog({ bookId: null, name: "" })}
              className="cursor-pointer border-dashed bg-muted/10 hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 p-6 text-center min-h-[180px]"
            >
              <div className="p-2.5 rounded-full bg-primary/10 text-primary">
                <Plus className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">Add Publisher</p>
              <p className="text-xs text-muted-foreground">Then upload chapters or a complete book for it</p>
            </Card>
          </div>
        </div>
      )}

      {/* Add / rename publisher */}
      <Dialog open={publisherDialog !== null} onOpenChange={(open) => !open && setPublisherDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{publisherDialog?.bookId ? "Rename Publisher" : "Add Publisher"}</DialogTitle>
            <DialogDescription className="text-xs">
              {currentSubject} · {boardLabel(currentBoard)} · {classLabel(currentClass)}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void savePublisherDialog();
            }}
          >
            <div className="space-y-1">
              <label htmlFor="publisher-name" className="text-xs font-medium text-muted-foreground">
                Publisher name
              </label>
              <Input
                id="publisher-name"
                autoFocus
                required
                maxLength={120}
                list="textbook-publishers"
                placeholder="e.g. S. Chand, Oxford"
                value={publisherDialog?.name ?? ""}
                onChange={(e) => setPublisherDialog((d) => (d ? { ...d, name: e.target.value } : d))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPublisherDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingPublisher || !publisherDialog?.name.trim()}>
                {savingPublisher ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete publisher */}
      <Dialog open={deletingPublisher !== null} onOpenChange={(open) => !open && setDeletingPublisher(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete publisher “{deletingPublisher?.label}”?</DialogTitle>
            <DialogDescription>
              This permanently deletes its {deletingPublisher?.books.length ? "complete book and " : ""}
              {deletingPublisher?.chapters.length ?? 0} chapter(s), including their AI embeddings. Classes that use
              this publisher will switch back to the Default books.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingPublisher(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" disabled={savingPublisher} onClick={() => void confirmDeletePublisher()}>
              {savingPublisher ? "Deleting…" : "Delete Publisher"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW 2: SUBJECT CHAPTERS TABLE (When a subject and publisher are selected) */}
      {currentSubject && activePublisher && (
        <div className="space-y-4">
          {/* Breadcrumb / Subject Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-muted/20">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPublisher(null)}
                className="h-8 gap-1.5 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Publishers
              </Button>

              <div className="h-4 w-px bg-border" />

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">{currentSubject}</h2>
                  <Badge variant="outline" className="text-xs uppercase font-mono">
                    {boardLabel(currentBoard)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {classLabel(currentClass)}
                  </Badge>
                  <Badge className="text-xs">{activePublisher.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing textbooks and chapters from {activePublisher.label === "Default" ? "the default pool" : activePublisher.label}.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                form.setValue("board", currentBoard);
                form.setValue("class_name", currentClass);
                form.setValue("subject", currentSubject);
                setUploadPublisherKey(activePublisher.key);
                setUploadOpen(true);
              }}
              className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Upload Chapter / Book
            </Button>
          </div>

          {/* Full Textbook Review Card (if uploaded for this subject) */}
          {activeFullBooks.length > 0 && (
            <Card className="shadow-sm border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        {activeFullBooks[0].title}
                        <Badge variant="outline" className="text-xs capitalize font-normal">
                          {activeFullBooks[0].pdf_type?.replace("_", " ") || "text based"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Complete Textbook • {activeFullBooks[0].total_pages} physical pages • {activeFullBooks[0].chapter_count} detected chapters
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isBookAnalyzing ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1.5 text-xs font-semibold"
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        0/{bookTotalChapters || 1} Pending
                      </Badge>
                    ) : isBookProcessing ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1.5 text-xs font-semibold"
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {bookCompletedChapters}/{bookTotalChapters} Pending
                      </Badge>
                    ) : isBookCompleted ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 text-xs font-semibold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed
                      </Badge>
                    ) : isBookAwaitingReview ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 text-xs font-semibold"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Awaiting Review
                      </Badge>
                    ) : isBookFailed ? (
                      <Badge
                        variant="outline"
                        className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1.5 text-xs font-semibold"
                      >
                        Failed
                      </Badge>
                    ) : (
                      <StatusPill status={statusLabel(activeFullBooks[0].status) as any} />
                    )}

                    {["PROCESSING", "CONFIRMED"].includes(activeFullBooks[0].status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-rose-600 border-rose-500/40 hover:bg-rose-500/10"
                        onClick={async () => {
                          if (!window.confirm("Stop processing? The chapter in progress finishes; the rest can be resumed with Retry.")) return;
                          try {
                            const res = await stopTextbookProcessing(activeFullBooks[0].id);
                            toast({ title: "Processing stopped", description: res.message });
                            refresh();
                          } catch (err: any) {
                            toast({ title: "Stop failed", description: err.message, variant: "destructive" });
                          }
                        }}
                      >
                        <StopCircle className="h-3.5 w-3.5" />
                        Stop
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => {
                        setSelectedTextbookId(activeFullBooks[0].id);
                        setStructureDialogOpen(true);
                      }}
                    >
                      <ListTree className="h-3.5 w-3.5" />
                      Review Chapters
                    </Button>

                    {activeFullBooks[0].status === "AWAITING_REVIEW" && (
                      <Button
                        variant="default"
                        size="sm"
                        className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={async () => {
                          try {
                            await confirmTextbookStructure(activeFullBooks[0].id);
                            toast({ title: "Confirmed", description: "Chapter processing started." });
                            refresh();
                          } catch (err: any) {
                            toast({
                              title: "Confirm failed",
                              description: err.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirm
                      </Button>
                    )}

                    {activeFullBooks[0].status === "FAILED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Retry"
                        onClick={async () => {
                          try {
                            await retryTextbookProcessing(activeFullBooks[0].id);
                            toast({ title: "Retry started" });
                            refresh();
                          } catch (err: any) {
                            toast({
                              title: "Retry failed",
                              description: err.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {activeFullBooks.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Books &amp; publishers</CardTitle>
                <CardDescription className="text-xs">
                  Classes without a book choice see default books. Schools pick another publisher per class in Map
                  Subjects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeFullBooks.map((book) => (
                  <div key={book.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1 truncate text-sm">{book.title}</span>
                    <Input
                      key={`${book.id}-${book.publisher ?? ""}`}
                      defaultValue={book.publisher ?? ""}
                      placeholder="Publisher"
                      aria-label={`Publisher for ${book.title}`}
                      list="textbook-publishers"
                      className="h-8 text-xs sm:w-56"
                      onBlur={(e) => {
                        if (e.target.value.trim() !== (book.publisher ?? "")) {
                          saveBookPublisher(book.id, { publisher: e.target.value.trim() });
                        }
                      }}
                    />
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={book.is_default ?? true}
                        onChange={(e) => saveBookPublisher(book.id, { is_default: e.target.checked })}
                      />
                      Default
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Chapters Table */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Uploaded Chapters ({totalChaptersCount})</span>
                  {pendingChaptersCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1.5 text-xs font-semibold"
                    >
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {readyChaptersCount}/{totalChaptersCount} Pending
                    </Badge>
                  ) : isChaptersCompleted ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 text-xs font-semibold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completed
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription className="text-xs">
                  All active learning chapters and readings available for tutoring.
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter chapters by title..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8 bg-muted/20"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-14 text-center">#</TableHead>
                    <TableHead className="min-w-[240px]">Chapter / Content Title</TableHead>
                    <TableHead className="w-48">Source File</TableHead>
                    <TableHead className="w-24 text-center">Type</TableHead>
                    <TableHead className="w-44">Uploaded At</TableHead>
                    <TableHead className="w-28 text-center">Status</TableHead>
                    <TableHead className="w-32 text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActiveChapters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <div className="py-14 text-center flex flex-col items-center justify-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground/60" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {subjectSearchQuery ? "No matching chapters found." : `No chapters uploaded for ${currentSubject} yet.`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Upload a complete textbook PDF or direct chapter files to get started.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 text-xs"
                            onClick={() => {
                              form.setValue("board", currentBoard);
                              form.setValue("class_name", currentClass);
                              form.setValue("subject", currentSubject);
                              setUploadOpen(true);
                            }}
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Upload First Chapter
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActiveChapters.map((u, idx) => {
                      const isFailed = [u.embedding_status, u.chunk_status, u.ocr_status].includes("FAILED");
                      const isReady = u.embedding_status === "EMBEDDED";
                      const isProcessing =
                        u.embedding_status === "PROCESSING" ||
                        u.chunk_status === "PROCESSING" ||
                        u.ocr_status === "PROCESSING";

                      return (
                        <TableRow key={u.id} className="hover:bg-muted/40 transition-colors group">
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-muted font-mono text-xs font-semibold text-muted-foreground">
                              {idx + 1}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-foreground text-sm leading-snug">
                                {u.content_label || u.chapter || u.file_name}
                              </span>
                              {u.content_label && u.chapter && u.chapter !== u.content_label && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {u.chapter}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-[190px]" title={u.file_name}>
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{u.file_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0.5 tracking-wider">
                              {u.content_type ?? "Chapter"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                              <span>{formatUploadDateTime(u.upload_date)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {isReady && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-semibold"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Completed
                              </Badge>
                            )}
                            {isProcessing && (
                              <Badge
                                variant="outline"
                                className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 text-[11px] font-semibold"
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Pending
                              </Badge>
                            )}
                            {!isReady && !isProcessing && !isFailed && (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] font-semibold"
                              >
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Pending
                              </Badge>
                            )}
                            {isFailed && (
                              <Badge
                                variant="outline"
                                className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 gap-1 text-[11px] font-semibold"
                              >
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-3">
                            <div className="flex items-center justify-end gap-1">
                              {/* Preview Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Preview Document / PDF"
                                onClick={() => setPreviewUpload(u)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* Extracted Images Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                title="View & Edit Extracted Figures"
                                onClick={() => setImagesGalleryUpload(u)}
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>

                              {/* Edit Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Edit Chapter Info"
                                onClick={() => handleOpenEdit(u)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Delete Chapter"
                                onClick={() => setDeletingUpload(u)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PREVIEW DIALOG */}
      <Dialog open={!!previewUpload} onOpenChange={(open) => !open && setPreviewUpload(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3.5 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold truncate">
                  {previewUpload?.content_label || previewUpload?.chapter || previewUpload?.file_name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  {previewUpload?.file_name} • Uploaded {formatUploadDateTime(previewUpload?.upload_date)}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pr-6">
              {previewUpload && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-background hover:bg-primary/10 hover:text-primary"
                    onClick={() => {
                      const target = previewUpload;
                      setPreviewUpload(null);
                      setImagesGalleryUpload(target);
                    }}
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-primary" />
                    Extracted Figures
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    asChild
                  >
                    <a
                      href={previewBlobUrl || (previewUpload ? getTextbookUploadFileUrl(previewUpload.id) : "#")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in New Tab
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-muted/10 relative">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Loading document preview...</span>
              </div>
            ) : previewError ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-rose-500" />
                <p className="text-sm font-semibold text-foreground">Could not preview document</p>
                <p className="text-xs max-w-sm">{previewError}</p>
                {previewUpload && (
                  <Button variant="outline" size="sm" className="mt-2 text-xs" asChild>
                    <a
                      href={getTextbookUploadFileUrl(previewUpload.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Try Opening Directly
                    </a>
                  </Button>
                )}
              </div>
            ) : previewBlobUrl ? (
              <iframe
                src={previewBlobUrl}
                title={previewUpload?.file_name}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT CHAPTER DIALOG */}
      <Dialog open={!!editingUpload} onOpenChange={(open) => !open && setEditingUpload(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Edit Chapter Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update the chapter title, display label, and content categorization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Content Title / Label</label>
              <Input
                placeholder="e.g. Reading B. The Treasure Within (Part II)"
                value={editContentLabel}
                onChange={(e) => setEditContentLabel(e.target.value)}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">The display title shown to students and teachers.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Chapter Reference / Code</label>
              <Input
                placeholder="e.g. Chapter 5.B or Unit 2"
                value={editChapter}
                onChange={(e) => setEditChapter(e.target.value)}
                className="text-sm font-mono"
              />
              <p className="text-[11px] text-muted-foreground">Short chapter identifier or unit code.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Content Type</label>
              <Select
                value={editContentType}
                onValueChange={(val) => setEditContentType(val)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editingUpload?.file_name && (
              <div className="p-2.5 rounded-lg bg-muted/40 border text-xs flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-foreground">Source: </span>
                  <span className="text-muted-foreground font-mono">{editingUpload.file_name}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingUpload(null)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="gap-1.5"
            >
              {isSavingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={!!deletingUpload} onOpenChange={(open) => !open && setDeletingUpload(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Uploaded Chapter?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1.5 text-muted-foreground">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">
                &ldquo;{deletingUpload?.content_label || deletingUpload?.chapter || deletingUpload?.file_name}&rdquo;
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="text-muted-foreground text-[11px]">
              The stored chapter file will be deleted, and all corresponding embeddings and chunks in the vector database will be immediately purged.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingUpload(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteUpload}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <TextbookStructureDialog
        open={structureDialogOpen}
        onOpenChange={setStructureDialogOpen}
        textbookId={selectedTextbookId}
        onConfirmed={refresh}
      />

      <TextbookImagesGalleryDialog
        open={!!imagesGalleryUpload}
        onOpenChange={(open) => !open && setImagesGalleryUpload(null)}
        upload={imagesGalleryUpload}
        onImagesChanged={refresh}
      />
    </PageShell>
  );
}
