const BASE = "/api";

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listTables: () =>
    request<{ tables: string[] }>("/tables").then(r => r.tables),

  getColumns: (table: string) =>
    request<{ columns: ColumnInfo[] }>(`/tables/${encodeURIComponent(table)}/columns`).then(r => r.columns),

  getRows: (table: string) =>
    request<{ rows: Record<string, unknown>[] }>(`/tables/${encodeURIComponent(table)}/rows`).then(r => r.rows),

  updateCell: (table: string, pkCol: string, pkVal: unknown, column: string, value: unknown) =>
    request<{ ok: boolean }>(`/tables/${encodeURIComponent(table)}/rows`, {
      method: "PATCH",
      body: JSON.stringify({ pk_col: pkCol, pk_val: pkVal, column, value }),
    }),

  insertRow: (table: string, values: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/tables/${encodeURIComponent(table)}/rows`, {
      method: "POST",
      body: JSON.stringify({ values }),
    }),

  deleteRow: (table: string, pkCol: string, pkVal: unknown) =>
    request<{ ok: boolean }>(`/tables/${encodeURIComponent(table)}/rows`, {
      method: "DELETE",
      body: JSON.stringify({ pk_col: pkCol, pk_val: pkVal }),
    }),
};
