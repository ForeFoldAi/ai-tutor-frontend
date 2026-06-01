function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function exportCsv<T extends Record<string, unknown>>(args: {
  rows: T[];
  columns: Array<{ key: keyof T; header: string }>;
  fileName: string;
}) {
  const { rows, columns, fileName } = args;
  const headerRow = columns.map((c) => toCsvCell(c.header)).join(",");
  const dataRows = rows
    .map((r) => columns.map((c) => toCsvCell(r[c.key])).join(","))
    .join("\n");

  const csv = [headerRow, dataRows].filter(Boolean).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

