function normalizeHeader(header: string) {
  return header.replace(/\*$/, "").trim().toLowerCase();
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsv(text: string): string[][] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

export function csvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows
    .slice(1)
    .map((cells) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = (cells[index] ?? "").trim();
      });
      return record;
    })
    .filter((record) => Object.values(record).some(Boolean));
}

export function pickCsvColumns(
  records: Record<string, string>[],
  columns: string[],
): { rows: Record<string, string>[]; missingHeaders: string[] } {
  if (records.length === 0) return { rows: [], missingHeaders: columns };

  const available = new Set(Object.keys(records[0]));
  const missingHeaders = columns.filter((col) => !available.has(col));
  if (missingHeaders.length > 0) return { rows: [], missingHeaders };

  const rows = records.map((record) => {
    const row: Record<string, string> = {};
    columns.forEach((col) => {
      row[col] = record[col] ?? "";
    });
    return row;
  });

  return { rows, missingHeaders: [] };
}
