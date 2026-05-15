import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function DebugTaskPanel({ transactionId }) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState(null);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setTasks(null);

    const payload = {
      transaction_id: transactionId,
      title: title.trim(),
      phase: 1,
      status: "open",
      created_by: "debug",
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
        console.log("[DEBUG] inserted task:", JSON.stringify(res.data?.inserted));
        console.log("[DEBUG] fetched tasks count:", res.data?.tasks?.length);
        console.log("[DEBUG] fetched tasks:", JSON.stringify(res.data?.tasks?.map(t => ({ id: t.id, title: t.title, phase: t.phase }))));
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
        🐛 DEBUG TASK PANEL — transaction_id: <code style={{ background: "#fde68a", padding: "2px 6px", borderRadius: "4px" }}>{transactionId || "MISSING!"}</code>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          placeholder="Task title..."
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
          background: "#fee2e2",
          border: "1px solid #ef4444",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "10px",
          color: "#991b1b",
          fontSize: "12px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}>
          ❌ ERROR: {error}
        </div>
      )}

      {result && (
        <div style={{
          background: "#dcfce7",
          border: "1px solid #16a34a",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "10px",
          color: "#14532d",
          fontSize: "12px",
        }}>
          ✅ INSERT SUCCESS:
          <pre style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {tasks !== null && (
        <div style={{
          background: "#eff6ff",
          border: "1px solid #3b82f6",
          borderRadius: "8px",
          padding: "10px 14px",
          fontSize: "12px",
          color: "#1e3a8a",
        }}>
          <strong>📋 ALL TASKS for this transaction ({tasks.length} total):</strong>
          {tasks.length === 0 ? (
            <div style={{ marginTop: "6px", color: "#ef4444" }}>⚠️ NO TASKS RETURNED — insert may have failed silently or RLS is blocking reads</div>
          ) : (
            <table style={{ marginTop: "8px", width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #bfdbfe", fontSize: "11px" }}>id</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #bfdbfe", fontSize: "11px" }}>title</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #bfdbfe", fontSize: "11px" }}>phase</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ padding: "3px 8px", fontSize: "10px", color: "#6b7280" }}>{t.id?.slice(0, 8)}…</td>
                    <td style={{ padding: "3px 8px", fontWeight: "500" }}>{t.title}</td>
                    <td style={{ padding: "3px 8px" }}>{t.phase}</td>
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