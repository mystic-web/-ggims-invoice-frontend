import { useState, useEffect, useRef, useCallback } from "react";

const fmt = (n) => n != null ? "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—";

export default function Dashboard({ token, user, onLogout, api }) {
  const [invoices,    setInvoices]    = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [uploadMsg,   setUploadMsg]   = useState("");
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [consultant,  setConsultant]  = useState("");
  const [process,     setProcess]     = useState("");
  const [branch,      setBranch]      = useState("");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [sort,        setSort]        = useState("invoice_date");
  const [order,       setOrder]       = useState("desc");
  const [editId,      setEditId]      = useState(null);
  const [editRefund,  setEditRefund]  = useState("");
  const [drag,        setDrag]        = useState(false);
  const [lastUploaded, setLastUploaded] = useState(null);
  const [syncing,     setSyncing]      = useState(false);
  const [syncMsg,     setSyncMsg]      = useState("");
  const fileRef = useRef();

  const headers = { Authorization: `Bearer ${token}` };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, consultant, process, branch, date_from: dateFrom, date_to: dateTo, sort, order });
      const res = await fetch(`${api}/invoices?${params}`, { headers });
      const data = await res.json();
      setInvoices(data);
    } catch { setError("Failed to load invoices"); }
    finally { setLoading(false); }
  }, [search, consultant, process, branch, dateFrom, dateTo, sort, order]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${api}/invoices/stats`, { headers });
      setStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { fetchStats(); }, []);

  const uploadFiles = async (files) => {
    const arr = Array.from(files).filter(f => f.type === "application/pdf");
    if (!arr.length) return;
    setUploading(true);
    let added = 0, skipped = 0, errors = 0;
    for (const file of arr) {
      setUploadMsg(`Uploading ${file.name}...`);
      const form = new FormData();
      form.append("pdf", file);
      try {
        const res = await fetch(`${api}/invoices/upload`, { method: "POST", headers, body: form });
        const data = await res.json();
        if (res.ok) { added++; setLastUploaded(data); }
        else if (res.status === 409) skipped++;
        else { errors++; console.error(data.error); }
      } catch { errors++; }
    }
    setUploading(false);
    setUploadMsg("");
    fetchInvoices();
    fetchStats();
    const msg = `${added} added${skipped ? `, ${skipped} duplicate` : ""}${errors ? `, ${errors} failed` : ""}`;
    showToast(msg, added > 0 ? "success" : "error");
  };

  const syncFromEmail = async () => {
    setSyncing(true);
    setSyncMsg("Checking Sent folder for new invoices...");
    try {
      const res = await fetch(`${api}/invoices/sync-email`, { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Email sync failed", "error");
      } else {
        const msg = `Email sync: ${data.added} added${data.skipped ? `, ${data.skipped} skipped` : ""}${data.failed ? `, ${data.failed} failed` : ""}`;
        showToast(msg, data.added > 0 ? "success" : "error");
        fetchInvoices();
        fetchStats();
      }
    } catch {
      showToast("Email sync failed — check backend logs", "error");
    }
    setSyncing(false);
    setSyncMsg("");
  };

  const deleteInvoice = async (id) => {
    if (!confirm("Delete this invoice?")) return;
    await fetch(`${api}/invoices/${id}`, { method: "DELETE", headers });
    fetchInvoices();
    fetchStats();
  };

  const saveRefund = async (id) => {
    await fetch(`${api}/invoices/${id}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ refund_invoice_no: editRefund }),
    });
    setEditId(null);
    fetchInvoices();
  };

  const doSort = (key) => {
    if (sort === key) setOrder(o => o === "asc" ? "desc" : "asc");
    else { setSort(key); setOrder("asc"); }
  };

  const exportCSV = () => {
    const params = new URLSearchParams({ search, consultant, process, branch, date_from: dateFrom, date_to: dateTo });
    window.open(`${api}/invoices/export?${params}&token=${token}`);
  };

  const consultants = [...new Set(invoices.map(i => i.consultant_name).filter(Boolean))].sort();
  const processes   = [...new Set(invoices.map(i => i.process).filter(Boolean))].sort();
  const branches    = [...new Set(invoices.map(i => i.branch_code).filter(Boolean))].sort();

  const [toast, setToastState] = useState(null);
  const showToast = (msg, type = "success") => {
    setToastState({ msg, type });
    setTimeout(() => setToastState(null), 3000);
  };

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: 4, opacity: sort === col ? 1 : 0.3, fontSize: 10 }}>
      {sort === col ? (order === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#1d4ed8", color: "#fff", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🧾</span>
          <span style={{ fontWeight: 600, fontSize: 16 }}>GGIMS Invoice Manager</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={syncFromEmail} disabled={syncing}
            style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 6, cursor: syncing ? "default" : "pointer", fontSize: 13, opacity: syncing ? 0.6 : 1 }}>
            {syncing ? (syncMsg || "Syncing...") : "📧 Sync from Email"}
          </button>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{user?.name}</span>
          <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
            Logout
          </button>
        </div>
      </div>

      {/* Last uploaded invoice — full parsed details banner */}
      {lastUploaded && (
        <div style={{ background: "#ecfdf5", borderBottom: "1px solid #a7f3d0", padding: "10px 1.5rem" }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 24px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", whiteSpace: "nowrap" }}>✅ Parsed:</span>
            {[
              ["Client", lastUploaded.client_name],
              ["Consultant", lastUploaded.consultant_name],
              ["Process", lastUploaded.process],
              ["Basic", fmt(lastUploaded.basic_amount)],
              ["GST", fmt(lastUploaded.gst_amount)],
              ["Total", fmt(lastUploaded.total_amount)],
              ["Invoice No.", lastUploaded.invoice_number],
              ["Date", lastUploaded.invoice_date],
              ["State", lastUploaded.state],
              ["Payment", lastUploaded.payment_mode],
            ].map(([label, value]) => (
              <span key={label} style={{ fontSize: 12.5, color: "#334155" }}>
                <span style={{ color: "#64748b" }}>{label}:</span>{" "}
                <strong>{value || "—"}</strong>
              </span>
            ))}
            <button onClick={() => setLastUploaded(null)}
              style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#16a34a", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem" }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total invoices", value: stats.total, color: "#1d4ed8" },
              { label: "Total amount",   value: fmt(stats.total_amount), color: "#16a34a" },
              { label: "Total GST",      value: fmt(stats.total_gst), color: "#9333ea" },
              { label: "Consultants",    value: stats.consultants, color: "#ea580c" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Branch-wise business breakdown */}
        {stats?.by_branch?.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 10 }}>Business by Branch</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              {stats.by_branch.map(b => (
                <button key={b.branch} onClick={() => setBranch(branch === b.branch ? "" : (b.branch === "Unassigned" ? "" : b.branch))}
                  style={{
                    textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    border: branch === b.branch ? "1.5px solid #1d4ed8" : "1px solid #e2e8f0",
                    background: branch === b.branch ? "#eff6ff" : "#f8fafc",
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginBottom: 2 }}>{b.branch}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#16a34a" }}>{fmt(b.total)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{b.count} invoice{b.count === 1 ? "" : "s"} · GST {fmt(b.gst)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); uploadFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${drag ? "#1d4ed8" : "#cbd5e1"}`,
            borderRadius: 10, padding: "1.5rem", textAlign: "center",
            cursor: "pointer", marginBottom: 16,
            background: drag ? "#eff6ff" : "#fff",
            transition: "all 0.15s"
          }}>
          <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={e => uploadFiles(e.target.files)} />
          {uploading ? (
            <div style={{ color: "#1d4ed8", fontSize: 14 }}>⏳ {uploadMsg}</div>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
              <div style={{ fontSize: 14, color: "#475569" }}>Drop invoice PDFs here or <strong style={{ color: "#1d4ed8" }}>click to upload</strong></div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Multiple files supported — GGIMS TAX INVOICE format</div>
            </>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, consultant, invoice..."
            style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
          <select value={consultant} onChange={e => setConsultant(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
            <option value="">All consultants</option>
            {consultants.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={process} onChange={e => setProcess(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
            <option value="">All processes</option>
            {processes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={branch} onChange={e => setBranch(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
            <option value="">All branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
          <button onClick={exportCSV}
            style={{ padding: "8px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            ⬇ Export CSV
          </button>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {[
                    ["client_name","Client Name",140],
                    ["consultant_name","Consultant",110],
                    ["process","Process",180],
                    ["basic_amount","Basic",90],
                    ["gst_amount","GST",80],
                    ["total_amount","Total",100],
                    ["invoice_number","Invoice No.",130],
                    ["invoice_date","Date",95],
                    ["state","State",90],
                    ["branch_code","Branch",90],
                    ["payment_mode","Payment",100],
                  ].map(([key, label, w]) => (
                    <th key={key} onClick={() => doSort(key)}
                      style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, color: "#64748b", cursor: "pointer", width: w, whiteSpace: "nowrap", userSelect: "none" }}>
                      {label} <SortIcon col={key} />
                    </th>
                  ))}
                  <th style={{ padding: "10px 12px", width: 80 }}>Refund</th>
                  <th style={{ padding: "10px 12px", width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>Loading...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={13} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No invoices found</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "9px 12px", fontWeight: 500 }} title={inv.client_name}>{inv.client_name || "—"}</td>
                    <td style={{ padding: "9px 12px", color: "#475569" }}>{inv.consultant_name || "—"}</td>
                    <td style={{ padding: "9px 12px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={inv.process}>
                      {inv.process || "—"}
                      {inv.process && (
                        <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 99, background: inv.process.toLowerCase().includes("technical") ? "#eff6ff" : "#f0fdf4", color: inv.process.toLowerCase().includes("technical") ? "#1d4ed8" : "#16a34a", fontWeight: 500 }}>
                          {inv.process.toLowerCase().includes("technical") ? "TE" : "Signup"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(inv.basic_amount)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(inv.gst_amount)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>{fmt(inv.total_amount)}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: "#64748b" }}>{inv.invoice_number || "—"}</td>
                    <td style={{ padding: "9px 12px", color: "#475569" }}>{inv.invoice_date || "—"}</td>
                    <td style={{ padding: "9px 12px", color: "#475569" }}>{inv.state || "—"}</td>
                    <td style={{ padding: "9px 12px", color: "#475569" }}>
                      {inv.branch_code
                        ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#fef3c7", color: "#92400e", fontWeight: 500 }}>{inv.branch_code}</span>
                        : "—"}
                    </td>
                    <td style={{ padding: "9px 12px", color: "#475569" }}>{inv.payment_mode || "—"}</td>
                    <td style={{ padding: "9px 12px" }}>
                      {editId === inv.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <input value={editRefund} onChange={e => setEditRefund(e.target.value)} placeholder="GGIMS/..."
                            style={{ width: 120, padding: "3px 6px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 12 }} autoFocus />
                          <button onClick={() => saveRefund(inv.id)} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}>✓</button>
                          <button onClick={() => setEditId(null)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}>✕</button>
                        </div>
                      ) : (
                        <span onClick={() => { setEditId(inv.id); setEditRefund(inv.refund_invoice_no || ""); }}
                          style={{ cursor: "pointer", color: inv.refund_invoice_no ? "#dc2626" : "#94a3b8", fontSize: 12, textDecoration: inv.refund_invoice_no ? "underline" : "none" }}>
                          {inv.refund_invoice_no || "+ Add"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <button onClick={() => deleteInvoice(inv.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, padding: "2px 4px", borderRadius: 4 }}
                        title="Delete" onMouseEnter={e => e.target.style.color = "#ef4444"}
                        onMouseLeave={e => e.target.style.color = "#94a3b8"}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer total */}
          {invoices.length > 0 && (
            <div style={{ padding: "10px 12px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 24, fontSize: 13, color: "#64748b" }}>
              <span><strong style={{ color: "#1e293b" }}>{invoices.length}</strong> invoices</span>
              <span>Total: <strong style={{ color: "#16a34a" }}>{fmt(invoices.reduce((s, i) => s + (i.total_amount || 0), 0))}</strong></span>
              <span>GST: <strong>{fmt(invoices.reduce((s, i) => s + (i.gst_amount || 0), 0))}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "1.5rem", right: "1.5rem",
          background: toast.type === "success" ? "#16a34a" : "#dc2626",
          color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
