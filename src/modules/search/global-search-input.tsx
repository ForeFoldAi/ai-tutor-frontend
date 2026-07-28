import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGlobalSearch } from "@/modules/search/use-contextual-search";
import { cn } from "@/lib/utils";

const ENTITY_LABEL: Record<string, string> = {
  students: "Students",
  teachers: "Teachers",
  classes: "Classes",
  credentials: "Credentials",
  sessions: "Sessions",
  subjects: "Subjects",
  lessons: "Lessons",
  users: "Users",
  schools: "Schools",
};

interface GlobalSearchInputProps {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  "data-testid"?: string;
}

export function GlobalSearchInput({
  placeholder = "Search...",
  className,
  inputClassName,
  "data-testid": testId,
}: GlobalSearchInputProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { hits, isLoading, open } = useGlobalSearch(query);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  const showMenu = menuOpen && open;

  return (
    <div ref={rootRef} className={cn("relative min-w-[180px] flex-1 sm:min-w-[220px] sm:max-w-xs xl:w-64 xl:flex-none", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setMenuOpen(true);
        }}
        onFocus={() => setMenuOpen(true)}
        className={cn(
          "h-10 rounded-full border border-border bg-background pl-9 shadow-sm",
          inputClassName,
        )}
        data-testid={testId}
        autoComplete="off"
      />
      {showMenu ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-80 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
          role="listbox"
        >
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No matches</p>
          ) : (
            hits.map((hit) => (
              <button
                key={`${hit.entity}-${hit.id}`}
                type="button"
                role="option"
                className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-muted/70"
                onClick={() => {
                  setMenuOpen(false);
                  setQuery("");
                  setLocation(hit.href);
                }}
              >
                <span className="text-sm font-medium leading-tight">{hit.title}</span>
                <span className="text-xs text-muted-foreground">
                  {ENTITY_LABEL[hit.entity] ?? hit.entity}
                  {hit.subtitle ? ` · ${hit.subtitle}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
