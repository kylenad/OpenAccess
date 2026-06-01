import { api } from "./api";
import type { ColumnInfo } from "./api";
import "./style.css";

// ── State ─────────────────────────────────────────────────────────────────────
let activeTable: string | null = null;
let columns: ColumnInfo[] = [];
let rows: Record<string, unknown>[] = [];
let pkCol: string = "";
let searchTerm = "";
let sortCol: string | null = null;
let sortDir: "asc" | "desc" = "asc";

let providerRows: Record<string, unknown>[] = [];
let providerColumns: ColumnInfo[] = [];
let currentView: "provider" | "table" = "provider";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tableList    = document.getElementById("table-list")!;
const tableTitle   = document.getElementById("table-title")!;
const searchBox    = document.getElementById("search-box") as HTMLInputElement;
const tableWrap    = document.getElementById("table-wrap")!;
const statusBar    = document.getElementById("status-bar")!;
const toast        = document.getElementById("toast")!;
const providerView = document.getElementById("provider-view")!;
const tableView    = document.getElementById("table-view")!;
const providerSearchInput = document.getElementById("provider-search-input") as HTMLInputElement;
const providerResults     = document.getElementById("provider-results")!;

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg: string, type: "success" | "error" = "success") {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove("show"), 2800);
}

// ── View toggle ───────────────────────────────────────────────────────────────
document.getElementById("btn-provider-view")?.addEventListener("click", () => {
  currentView = "provider";
  providerView.style.display = "flex";
  tableView.style.display = "none";
  document.getElementById("btn-provider-view")?.classList.add("active");
  document.getElementById("btn-table-view")?.classList.remove("active");
});

document.getElementById("btn-table-view")?.addEventListener("click", () => {
  currentView = "table";
  providerView.style.display = "none";
  tableView.style.display = "flex";
  document.getElementById("btn-table-view")?.classList.add("active");
  document.getElementById("btn-provider-view")?.classList.remove("active");
});

// ── Sidebar ───────────────────────────────────────────────────────────────────
async function loadTables() {
  try {
    const tables = await api.listTables();
    tableList.innerHTML = "";
    tables.forEach((name) => {
      const div = document.createElement("div");
      div.className = "table-item" + (name === activeTable ? " active" : "");
      div.innerHTML = `<i class="ti ti-table"></i> ${name}`;
      div.onclick = () => selectTable(name);
      tableList.appendChild(div);
    });
    if (!activeTable && tables.length > 0) selectTable(tables[0]);
  } catch (e) {
    showToast(`Could not connect to backend: ${e}`, "error");
  }
}

// ── Table load ────────────────────────────────────────────────────────────────
async function selectTable(name: string) {
  activeTable = name;
  sortCol = null;
  searchTerm = "";
  searchBox.value = "";
  tableTitle.textContent = name;
  tableWrap.innerHTML = `<div class="loading">Loading…</div>`;
  loadTables();
  try {
    [columns, rows] = await Promise.all([
      api.getColumns(name),
      api.getRows(name),
    ]);
    pkCol = columns[0]?.name ?? "id";

    // Also refresh provider data whenever tables reload
    await loadProviderData();

    renderTable();
    renderStatus();
    renderProviderResults(providerSearchInput.value.trim());
  } catch (e) {
    showToast(`Error loading table: ${e}`, "error");
  }
}

// ── Provider data ─────────────────────────────────────────────────────────────
async function loadProviderData() {
  try {
    [providerColumns, providerRows] = await Promise.all([
      api.getColumns("provider"),
      api.getRows("provider"),
    ]);
  } catch (e) {
    console.error("Could not load provider data", e);
  }
}

// ── Provider search ───────────────────────────────────────────────────────────
providerSearchInput.addEventListener("input", () => {
  renderProviderResults(providerSearchInput.value.trim());
});

function renderProviderResults(query: string) {
  const q = query.toLowerCase();
  const filtered = q
    ? providerRows.filter((r) =>
        String(r["npi"] ?? "").includes(q) ||
        String(r["last_name"] ?? "").toLowerCase().includes(q) ||
        String(r["first_name"] ?? "").toLowerCase().includes(q)
      )
    : providerRows;

  if (filtered.length === 0) {
    providerResults.innerHTML = `
      <div class="provider-empty">
        <i class="ti ti-user-search"></i>
        ${q ? `No providers found for "${query}"` : "No providers in database"}
      </div>`;
    return;
  }

  providerResults.innerHTML = "";
  filtered.forEach((provider) => renderProviderCard(provider));
}

// ── Provider card ─────────────────────────────────────────────────────────────
function renderProviderCard(provider: Record<string, unknown>) {
  const npi        = String(provider["npi"] ?? "");
  const firstName  = String(provider["first_name"] ?? "");
  const lastName   = String(provider["last_name"] ?? "");
  const creds      = String(provider["credentials"] ?? "");
  const specialty  = String(provider["specialty"] ?? "");
  const pcpSpec    = String(provider["pcp_specialist_ind"] ?? "");

  const card = document.createElement("div");
  card.className = "provider-card";
  card.dataset.npi = npi;

  card.innerHTML = `
    <div class="card-header">
      <div class="card-header-left">
        <div class="card-name">${lastName}, ${firstName} ${creds}</div>
        <div class="card-meta">
          <span><i class="ti ti-id-badge"></i> NPI: ${npi}</span>
          <span><i class="ti ti-stethoscope"></i> ${specialty || "—"}</span>
          <span><i class="ti ti-user"></i> ${pcpSpec || "—"}</span>
        </div>
      </div>
      <i class="ti ti-chevron-down card-chevron"></i>
    </div>
    <div class="card-body">
      <div>
        <div class="card-section-title">Provider details</div>
        <div class="card-fields" id="fields-${npi}"></div>
        <div class="card-save-row" style="margin-top:12px">
          <button class="btn" id="discard-${npi}">Discard</button>
          <button class="btn btn-primary" id="save-${npi}">
            <i class="ti ti-device-floppy"></i> Save changes
          </button>
        </div>
      </div>
      <div>
        <div class="card-section-title">Locations</div>
        <div class="chip-list" id="locations-${npi}">
          <span class="chip">Loading…</span>
        </div>
      </div>
      <div>
        <div class="card-section-title">Organizations</div>
        <div class="chip-list" id="orgs-${npi}">
          <span class="chip">Loading…</span>
        </div>
      </div>
    </div>
  `;

  providerResults.appendChild(card);

  // Toggle expand
  const header  = card.querySelector(".card-header")!;
  const body    = card.querySelector(".card-body")!;
  const chevron = card.querySelector(".card-chevron")!;
  let loaded = false;

  header.addEventListener("click", async () => {
    const isOpen = body.classList.contains("open");
    body.classList.toggle("open", !isOpen);
    chevron.classList.toggle("open", !isOpen);

    if (!isOpen && !loaded) {
      loaded = true;
      buildCardFields(npi, provider);
      await loadRelatedData(npi);
    }
  });
}

// ── Card fields ───────────────────────────────────────────────────────────────
function buildCardFields(npi: string, provider: Record<string, unknown>) {
  const container = document.getElementById(`fields-${npi}`)!;
  const original: Record<string, string> = {};

  // Skip npi (pk) and show all other columns
  const editableCols = providerColumns.filter(c => c.name !== "npi");

  editableCols.forEach((col) => {
    const val = String(provider[col.name] ?? "");
    original[col.name] = val;

    const field = document.createElement("div");
    field.className = "card-field";
    field.innerHTML = `
      <label>${col.name.replace(/_/g, " ")}</label>
      <input
        type="text"
        id="card-input-${npi}-${col.name}"
        value="${val.replace(/"/g, "&quot;")}"
        data-original="${val.replace(/"/g, "&quot;")}"
      />
    `;
    container.appendChild(field);

    const input = field.querySelector("input")!;
    input.addEventListener("input", () => {
      input.classList.toggle("changed", input.value !== input.dataset.original);
    });
  });

  // Discard
  document.getElementById(`discard-${npi}`)?.addEventListener("click", () => {
    editableCols.forEach((col) => {
      const input = document.getElementById(`card-input-${npi}-${col.name}`) as HTMLInputElement;
      if (input) {
        input.value = original[col.name];
        input.classList.remove("changed");
      }
    });
    showToast("Changes discarded");
  });

  // Save
  document.getElementById(`save-${npi}`)?.addEventListener("click", async () => {
    const changed = editableCols.filter((col) => {
      const input = document.getElementById(`card-input-${npi}-${col.name}`) as HTMLInputElement;
      return input && input.value !== original[col.name];
    });

    if (changed.length === 0) {
      showToast("No changes to save");
      return;
    }

    try {
      for (const col of changed) {
        const input = document.getElementById(`card-input-${npi}-${col.name}`) as HTMLInputElement;
        await api.updateCell("provider", "npi", npi, col.name, input.value);
        input.dataset.original = input.value;
        input.classList.remove("changed");
        // Update local state
        const row = providerRows.find(r => String(r["npi"]) === npi);
        if (row) row[col.name] = input.value;
      }
      showToast(`Saved ${changed.length} change${changed.length > 1 ? "s" : ""}`);
    } catch (e) {
      showToast(`Save failed: ${e}`, "error");
    }
  });
}

// ── Related data ──────────────────────────────────────────────────────────────
async function loadRelatedData(npi: string) {
  try {
    const [provLocRows, locRows, provOrgRows, orgRows] = await Promise.all([
      api.getRows("provider_location"),
      api.getRows("location"),
      api.getRows("provider_org"),
      api.getRows("organization"),
    ]);

    // Locations
    const locContainer = document.getElementById(`locations-${npi}`)!;
    const provLocs = provLocRows.filter(r => String(r["npi"]) === npi);
    if (provLocs.length === 0) {
      locContainer.innerHTML = `<span class="chip">No locations assigned</span>`;
    } else {
      locContainer.innerHTML = "";
      provLocs.forEach(pl => {
        const loc = locRows.find(l => String(l["loc_id"]) === String(pl["loc_id"]));
        if (!loc) return;
        const isPrimary = String(pl["loc_primary"]).toLowerCase() === "yes";
        const chip = document.createElement("span");
        chip.className = `chip${isPrimary ? " primary" : ""}`;
        chip.textContent = `${String(loc["location_name"])}${isPrimary ? " ★" : ""}`;
        chip.title = `${String(loc["location_address"])}, ${String(loc["location_city"])}, ${String(loc["location_state"])}`;
        locContainer.appendChild(chip);
      });
    }

    // Organizations
    const orgContainer = document.getElementById(`orgs-${npi}`)!;
    const provOrgs = provOrgRows.filter(r => String(r["npi"]) === npi);
    if (provOrgs.length === 0) {
      orgContainer.innerHTML = `<span class="chip">No organizations assigned</span>`;
    } else {
      orgContainer.innerHTML = "";
      provOrgs.forEach(po => {
        const org = orgRows.find(o => String(o["org_id"]) === String(po["org_id"]));
        if (!org) return;
        const isPrimary = String(po["org_primary"]).toLowerCase() === "yes";
        const chip = document.createElement("span");
        chip.className = `chip${isPrimary ? " primary" : ""}`;
        chip.textContent = `${String(org["legal_business_name"])}${isPrimary ? " ★" : ""}`;
        orgContainer.appendChild(chip);
      });
    }
  } catch (e) {
    showToast(`Could not load related data: ${e}`, "error");
  }
}

// ── Add provider button ───────────────────────────────────────────────────────
document.getElementById("btn-add-provider")?.addEventListener("click", () => {
  // Switch to table view on provider table and open add modal
  currentView = "table";
  providerView.style.display = "none";
  tableView.style.display = "flex";
  document.getElementById("btn-table-view")?.classList.add("active");
  document.getElementById("btn-provider-view")?.classList.remove("active");
  // Make sure provider table is selected then open modal
  selectTable("provider").then(() => addRow());
});

// ── Filtered + sorted rows (table view) ──────────────────────────────────────
function filteredRows(): Record<string, unknown>[] {
  let r = [...rows];
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    r = r.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }
  if (sortCol) {
    r.sort((a, b) => {
      const av = String(a[sortCol!] ?? "");
      const bv = String(b[sortCol!] ?? "");
      const na = parseFloat(av), nb = parseFloat(bv);
      const cmp = !isNaN(na) && !isNaN(nb) ? na - nb : av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }
  return r;
}

// ── Render table ──────────────────────────────────────────────────────────────
function renderTable() {
  if (!activeTable) return;
  const visible = filteredRows();

  let html = `<table><thead><tr><th class="row-num"></th>`;
  columns.forEach((col) => {
    const sorted = sortCol === col.name;
    const arrow = sorted ? (sortDir === "asc" ? " ▲" : " ▼") : "";
    html += `<th data-col="${col.name}">
      ${col.name}<span class="col-type">${col.type}</span>${arrow}
    </th>`;
  });
  html += `<th class="act-col"></th></tr></thead><tbody>`;

  visible.forEach((row, i) => {
    const pk = String(row[pkCol] ?? "");
    html += `<tr><td class="row-num">${i + 1}</td>`;
    columns.forEach((col) => {
      const val = String(row[col.name] ?? "");
      const ispk = col.name === pkCol;
      html += `<td><input class="cell-input"
        data-col="${col.name}"
        data-pk="${pk}"
        value="${val.replace(/"/g, "&quot;")}"
        ${ispk ? "readonly style=\"color:var(--hint);cursor:default\"" : ""}
      /></td>`;
    });
    html += `<td class="act-col">
      <button class="del-btn" data-pk="${pk}" title="Delete row">
        <i class="ti ti-x"></i>
      </button>
    </td></tr>`;
  });

  html += `<tr class="add-row-tr"><td colspan="${columns.length + 2}">
    <button id="add-row-inline"><i class="ti ti-plus"></i> Add row</button>
  </td></tr></tbody></table>`;

  tableWrap.innerHTML = html;
  bindTableEvents();
}

// ── Bind table events ─────────────────────────────────────────────────────────
function bindTableEvents() {
  tableWrap.querySelectorAll<HTMLElement>("th[data-col]").forEach((th) => {
    th.onclick = () => {
      const col = th.dataset.col!;
      if (sortCol === col) sortDir = sortDir === "asc" ? "desc" : "asc";
      else { sortCol = col; sortDir = "asc"; }
      renderTable();
      renderStatus();
    };
  });

  tableWrap.querySelectorAll<HTMLInputElement>(".cell-input").forEach((inp) => {
    if (inp.readOnly) return;
    const original = inp.value;
    inp.onblur = async () => {
      if (inp.value === original) return;
      try {
        await api.updateCell(activeTable!, pkCol, inp.dataset.pk, inp.dataset.col!, inp.value);
        const row = rows.find((r) => String(r[pkCol]) === inp.dataset.pk);
        if (row) row[inp.dataset.col!] = inp.value;
        showToast("Saved");
      } catch (e) {
        inp.value = original;
        showToast(`Save failed: ${e}`, "error");
      }
    };
    inp.onkeydown = (e) => { if (e.key === "Enter") inp.blur(); };
  });

  tableWrap.querySelectorAll<HTMLElement>(".del-btn").forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm("Delete this row?")) return;
      try {
        await api.deleteRow(activeTable!, pkCol, btn.dataset.pk);
        rows = rows.filter((r) => String(r[pkCol]) !== btn.dataset.pk);
        renderTable();
        renderStatus();
        showToast("Row deleted");
      } catch (e) {
        showToast(`Delete failed: ${e}`, "error");
      }
    };
  });

  document.getElementById("add-row-inline")?.addEventListener("click", addRow);
}

// ── Add row modal ─────────────────────────────────────────────────────────────
async function addRow() {
  const nonPkCols = columns.slice(1);

  const fields = nonPkCols.map(c => `
    <div class="form-row">
      <label>${c.name} <span class="col-type">${c.type}</span></label>
      <input type="text" id="field-${c.name}" placeholder="${c.nullable ? "optional" : "required"}" />
    </div>
  `).join("");

  const modal = document.createElement("div");
  modal.className = "modal-bg";
  modal.innerHTML = `
    <div class="modal">
      <h3>Add row to ${activeTable}</h3>
      ${fields}
      <div class="modal-btns">
        <button class="btn" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-confirm">Insert</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const firstInput = modal.querySelector("input") as HTMLInputElement | null;
  firstInput?.focus();

  document.getElementById("modal-cancel")?.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

  document.getElementById("modal-confirm")?.addEventListener("click", async () => {
    const values: Record<string, unknown> = {};
    for (const col of nonPkCols) {
      const input = document.getElementById(`field-${col.name}`) as HTMLInputElement;
      const val = input.value.trim();
      values[col.name] = val === "" ? null : val;
    }
    try {
      await api.insertRow(activeTable!, values);
      rows = await api.getRows(activeTable!);
      modal.remove();
      renderTable();
      renderStatus();
      // Refresh provider data if we just added a provider
      if (activeTable === "provider") await loadProviderData();
      showToast("Row added");
    } catch (e) {
      showToast(`Insert failed: ${e}`, "error");
    }
  });
}

// ── Toolbar ───────────────────────────────────────────────────────────────────
document.getElementById("btn-add-row")?.addEventListener("click", addRow);

document.getElementById("btn-refresh")?.addEventListener("click", async () => {
  if (!activeTable) return;
  rows = await api.getRows(activeTable);
  renderTable();
  renderStatus();
  showToast("Refreshed");
});

document.getElementById("btn-export")?.addEventListener("click", () => {
  if (!activeTable || !rows.length) return;
  const header = columns.map((c) => c.name).join(",");
  const body = rows.map((r) =>
    columns.map((c) => `"${String(r[c.name] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([[header, ...body].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${activeTable}.csv`;
  a.click();
  showToast("Exported");
});

searchBox.addEventListener("input", () => {
  searchTerm = searchBox.value;
  renderTable();
  renderStatus();
});

// ── Status bar ────────────────────────────────────────────────────────────────
function renderStatus() {
  if (!activeTable) { statusBar.textContent = ""; return; }
  const vis = filteredRows().length;
  statusBar.textContent =
    `${vis} of ${rows.length} rows  ·  ${columns.length} columns` +
    (searchTerm ? `  ·  filtered by "${searchTerm}"` : "");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadTables();
