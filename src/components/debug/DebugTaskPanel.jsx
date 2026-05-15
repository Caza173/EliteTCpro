import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function DebugTaskPanel({ transactionId }) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [deduping, setDeduping] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [txBrokerageId, setTxBrokerageId] = useState(null);
  const [dedupResult, setDedupResult] = useState(null);

  const getSeedKeys = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`seeded_${transactionId}`)) keys.push(k);
    }
    return keys;
  };

  const [seedKeys, setSeedKeys] = useState(() => getSeedKeys());

  const clearSeedFlags = () => {
    getSeedKeys().forEach(k => localStorage.removeItem(k));
    setSeedKeys([]);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setTasks(null);
    setTxBrokerageId(null);

    const payload = { transaction_id: transactionId, title: title.trim(), phase: 1, status: "open" };
    console.log("[DEBUG] transactionId:", transactionId);
    console.log("[DEBUG] payload:", JSON.stringify(payload));

    try {
      const res = await base44.functions.invoke("debugCreateTask", payload);
      console.log("[DEBUG] response.data:", JSON.stringify(res.data));
      if (res.data?.error) {
        setError(res.data.error + (res.data.details ? "\n" + res.data.details : ""));
      } else {
        setResult(res.data?.inserted);
        setTasks(res.data?.tasks || []);
        setTxBrokerageId(res.data?.transaction_brokerage_id);
      }
    } catch (err) {
      console.error("[DEBUG] invoke error:", err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeduplicate = async (dryRun = false) => {
    setDeduping(true);
    setDedupResult(null);
    try {
      const res = await base44.functions.invoke("deduplicateTasks", { transaction_id: transactionId, dry_run: dryRun });
      console.log("[DEBUG] dedup result:", JSON.stringify(res.data));
      setDedupResult({ ...res.data, dryRun });
    } catch (err) {
      setDedupResult({ error: err?.message || String(err) });
    } finally {
      setDeduping(false);
    }
  };

  const cell = (content, extra = {}) => ({
    padding: "3px 8px", fontSize: "11px", ...extra
  });

  return (
    <div style={{ border: "2px solid #f59e0b", borderRadius: "12px", padding: "16px", background: "#fffbeb", marginBottom: "16px", fontFamily: "monospace" }}>
      <div style={{ fontWeight: "bold", fontSize: "13px", color: "#92400e", marginBottom: "10px" }}>
        🐛 TASK DEBUG PANEL — tx: <code style={{ background: "#fde68a", padding: "2px 6px", borderRadius: "4px" }}>{transactionId || "MISSING!"}</code>
      </div>

      {/* Seed flags */}
      <div style={{ fontSize: "11px", color: "#78350f", marginBottom: "10px", padding: "6px 10px", background: "#fef3c7", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <strong>Seed flags:</strong>
        {seedKeys.length === 0
          ? <span style={{ color: "#dc2626" }}>None — seeding triggers on next load</span>
          : <span style={{ color: "#16a34a" }}>{seedKeys.join(", ")}</span>}
        <button onClick={clearSeedFlags} style={{ padding: "2px 8px", background: "#dc2626", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "10px" }}>
          Clear (force re-seed)
        </button>
        <button onClick={() => setSeedKeys(getSeedKeys())} style={{ padding: "2px 8px", background: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "10px" }}>
          Refresh
        </button>
      </div>

      {/* Deduplicate */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => handleDeduplicate(true)} disabled={deduping}
          style={{ padding: "6px 12px", background: "#6366f1", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}>
          {deduping ? "⏳..." : "🔍 Preview Duplicates (dry run)"}
        </button>
        <button onClick={() => handleDeduplicate(false)} disabled={deduping}
          style={{ padding: "6px 12px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}>
          {deduping ? "⏳..." : "🗑 DELETE Duplicates"}
        </button>
      </div>

      {dedupResult && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "8px", fontSize: "12px",
          background: dedupResult.error ? "#fee2e2" : "#f0fdf4",
          border: `1px solid ${dedupResult.error ? "#ef4444" : "#16a34a"}`,
          color: dedupResult.error ? "#991b1b" : "#14532d" }}>
          {dedupResult.error ? (
            <span>❌ {dedupResult.error}</span>
          ) : (
            <>
              <strong>{dedupResult.dryRun ? "DRY RUN" : "DELETED"}</strong> — Before: {dedupResult.total_before} tasks · Kept: {dedupResult.kept} · {dedupResult.dryRun ? "Would delete" : "Deleted"}: {dedupResult.deleted}
              {dedupResult.deleted > 0 && !dedupResult.dryRun && (
                <div style={{ marginTop: "4px", color: "#16a34a", fontWeight: "bold" }}>✅ Reload the page to see cleaned task list.</div>
              )}
              {dedupResult.deleted_tasks?.length > 0 && (
                <details style={{ marginTop: "6px" }}>
                  <summary style={{ cursor: "pointer" }}>View duplicate titles ({dedupResult.deleted_tasks.length})</summary>
                  <div style={{ marginTop: "4px", maxHeight: "120px", overflowY: "auto" }}>
                    {dedupResult.deleted_tasks.map((t, i) => (
                      <div key={i} style={{ fontSize: "10px" }}>ph{t.phase}: {t.title}</div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}

      {/* Create task */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          placeholder="Enter debug task title"
          style={{ flex: 1, padding: "8px 12px", border: "1px solid #d97706", borderRadius: "8px", fontSize: "14px", background: "white" }}
        />
        <button onClick={handleCreate} disabled={loading || !title.trim()}
          style={{ padding: "8px 16px", background: loading ? "#9ca3af" : "#d97706", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {loading ? "⏳ CREATING..." : "DEBUG CREATE TASK"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "8px", padding: "10px 14px", marginBottom: "10px", color: "#991b1b", fontSize: "12px", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          ❌ ERROR: {error}
        </div>
      )}

      {result && (
        <div style={{ background: "#dcfce7", border: "1px solid #16a34a", borderRadius: "8px", padding: "10px 14px", marginBottom: "10px", color: "#14532d", fontSize: "12px" }}>
          ✅ INSERT SUCCESS — id: <strong>{result.id?.slice(0, 12)}</strong> · brokerage_id: <strong style={{ color: txBrokerageId ? "#16a34a" : "#dc2626" }}>{String(result.brokerage_id)}</strong>
          {txBrokerageId === null && (
            <div style={{ marginTop: "6px", color: "#dc2626", fontWeight: "bold" }}>
              ⚠️ Transaction has NO brokerage_id — tasks will have brokerage_id=null.
            </div>
          )}
        </div>
      )}

      {tasks !== null && (() => {
        const dupes = {};
        tasks.forEach(t => { dupes[t.title] = (dupes[t.title] || 0) + 1; });
        const dupeList = Object.entries(dupes).filter(([, c]) => c > 1);
        return (
          <div style={{ background: "#eff6ff", border: "1px solid #3b82f6", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#1e3a8a" }}>
            <strong>📋 ALL TASKS ({tasks.length} total)</strong>
            {dupeList.length > 0 && (
              <div style={{ marginTop: "4px", color: "#dc2626", fontWeight: "bold" }}>
                ⚠️ {dupeList.length} DUPLICATE TITLES: {dupeList.map(([t, c]) => `"${t}" ×${c}`).join(", ")}
              </div>
            )}
            <table style={{ marginTop: "8px", width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["title","phase","brokerage_id","id"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #bfdbfe", fontSize: "11px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id} style={{ background: t.brokerage_id ? undefined : "#fff7ed" }}>
                    <td style={cell()}>{t.title}</td>
                    <td style={cell()}>{t.phase}</td>
                    <td style={cell({ color: t.brokerage_id ? "#16a34a" : "#dc2626" })}>{String(t.brokerage_id)}</td>
                    <td style={cell({ color: "#6b7280" })}>{t.id?.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}