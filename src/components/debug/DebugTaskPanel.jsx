import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function DebugTaskPanel({ transactionId }) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [txBrokerageId, setTxBrokerageId] = useState(null);

  // Check localStorage seed flags
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

    const payload = {
      transaction_id: transactionId,
      title: title.trim(),
      phase: 1,
      status: "open",
    };

    console.log("[DEBUG] transactionId:", transactionId);
    console.log("[DEBUG] payload:", JSON.stringify(payload));

    try {
      const res = await base44.functions.invoke("debugCreateTask", payload);
      console.log("[DEBUG] raw response:", res);
      console.log("[DEBUG] response.data:", JSON.stringify(res.data));

      if (res.data?.error) {
        setError(res.data.error + (res.data.details ? "\n" + res.data.details : ""));
      } else {
        setResult(res.data?.inserted);
        setTasks(res.data?.tasks || []);
        setTxBrokerageId(res.data?.transaction_brokerage_id);
        console.log("[DEBUG] inserted task:", JSON.stringify(res.data?.inserted));
        console.log("[DEBUG] transaction brokerage_id:", res.data?.transaction_brokerage_id);
        console.log("[DEBUG] fetched tasks count:", res.data?.tasks?.length);
        const dupes = {};
        (res.data?.tasks || []).forEach(t => { dupes[t.title] = (dupes[t.title] || 0) + 1; });
        const dupeList = Object.entries(dupes).filter(([, c]) => c > 1);
        if (dupeList.length > 0) console.warn("[DEBUG] DUPLICATE TASKS:", dupeList);
      }
    } catch (err) {
      console.error("[DEBUG] invoke error:", err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: "2px solid #f59e0b",
      borderRadius: "12px",
      padding: "16px",
      background: "#fffbeb",
      marginBottom: "16px",
      fontFamily: "monospace",
    }}>
      <div style={{ fontWeight: "bold", fontSize: "13px", color: "#92400e", marginBottom: "10px" }}>
        🐛 TASK DEBUG PANEL — tx: <code style={{ background: "#fde68a", padding: "2px 6px", borderRadius: "4px" }}>{transactionId || "MISSING!"}</code>
      </div>

      {/* Seed flags status */}
      <div style={{ fontSize: "11px", color: "#78350f", marginBottom: "10px", padding: "6px 10px", background: "#fef3c7", borderRadius: "6px" }}>
        <strong>localStorage seed flags:</strong>{" "}
        {seedKeys.length === 0 ? (
          <span style={{ color: "#dc2626" }}>None set — seeding will trigger on next load</span>
        ) : (
          <span style={{ color: "#16a34a" }}>{seedKeys.join(", ")}</span>
        )}
        <button
          onClick={clearSeedFlags}
          style={{ marginLeft: "10px", padding: "2px 8px", background: "#dc2626", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "10px" }}
        >
          Clear Seed Flags (force re-seed)
        </button>
        <button
          onClick={() => setSeedKeys(getSeedKeys())}
          style={{ marginLeft: "6px", padding: "2px 8px", background: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "10px" }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          placeholder="Enter debug task title"
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #d97706",
            borderRadius: "8px",
            fontSize: "14px",
            background: "white",
          }}
        />
        <button
          onClick={handleCreate}
          disabled={loading || !title.trim()}
          style={{
            padding: "8px 16px",
            background: loading ? "#9ca3af" : "#d97706",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "13px",
            cursor: loading ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "⏳ CREATING..." : "DEBUG CREATE TASK"}
        </button>
      </div>

      {error && (
        <div style={{
          background: "#fee2e2", border: "1px solid #ef4444", borderRadius: "8px",
          padding: "10px 14px", marginBottom: "10px", color: "#991b1b",
          fontSize: "12px", whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}>
          ❌ ERROR: {error}
        </div>
      )}

      {result && (
        <div style={{
          background: "#dcfce7", border: "1px solid #16a34a", borderRadius: "8px",
          padding: "10px 14px", marginBottom: "10px", color: "#14532d", fontSize: "12px",
        }}>
          ✅ INSERT SUCCESS — id: <strong>{result.id?.slice(0, 12)}</strong> · brokerage_id on task: <strong style={{ color: txBrokerageId ? "#16a34a" : "#dc2626" }}>{String(result.brokerage_id)}</strong>
          {txBrokerageId === null && (
            <div style={{ marginTop: "6px", color: "#dc2626", fontWeight: "bold" }}>
              ⚠️ Transaction has NO brokerage_id — tasks will have brokerage_id=null. RLS reads may fail for non-admin users.
            </div>
          )}
        </div>
      )}

      {tasks !== null && (
        <div style={{
          background: "#eff6ff", border: "1px solid #3b82f6", borderRadius: "8px",
          padding: "10px 14px", fontSize: "12px", color: "#1e3a8a",
        }}>
          <strong>📋 ALL TASKS ({tasks.length} total)</strong>
          {(() => {
            const dupes = {};
            tasks.forEach(t => { dupes[t.title] = (dupes[t.title] || 0) + 1; });
            const dupeList = Object.entries(dupes).filter(([, c]) => c > 1);
            return dupeList.length > 0 ? (
              <div style={{ marginTop: "6px", color: "#dc2626", fontWeight: "bold" }}>
                ⚠️ {dupeList.length} DUPLICATE TITLES: {dupeList.map(([t, c]) => `"${t}" ×${c}`).join(", ")}
              </div>
            ) : null;
          })()}
          {tasks.length === 0 ? (
            <div style={{ marginTop: "6px", color: "#ef4444" }}>⚠️ NO TASKS RETURNED</div>
          ) : (
            <table style={{ marginTop: "8px", width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #bfdbfe", fontSize: "11px" }}>title</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #bfdbfe", fontSize: "11px" }}>phase</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #bfdbfe", fontSize: "11px" }}>brokerage_id</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #bfdbfe", fontSize: "11px" }}>id</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id} style={{ background: t.brokerage_id ? undefined : "#fff7ed" }}>
                    <td style={{ padding: "3px 8px", fontWeight: "500" }}>{t.title}</td>
                    <td style={{ padding: "3px 8px" }}>{t.phase}</td>
                    <td style={{ padding: "3px 8px", color: t.brokerage_id ? "#16a34a" : "#dc2626" }}>{String(t.brokerage_id)}</td>
                    <td style={{ padding: "3px 8px", fontSize: "10px", color: "#6b7280" }}>{t.id?.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}