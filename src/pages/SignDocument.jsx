import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PenLine, Check, AlertCircle, FileText, Loader2, ChevronDown } from "lucide-react";

export default function SignDocument() {
  const hashSearch = window.location.hash.includes("?")
    ? window.location.hash.split("?")[1]
    : window.location.search;
  const params = new URLSearchParams(hashSearch);
  const token = params.get("token");
  const reqId = params.get("reqId");

  const [request, setRequest] = useState(null);
  const [signer, setSigner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [consent, setConsent] = useState(false);
  const [signatureMode, setSignatureMode] = useState("type"); // type | draw
  const [typedSig, setTypedSig] = useState("");
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!token || !reqId) {
      setError("Invalid signing link. Please check your email and try again.");
      setLoading(false);
      return;
    }
    base44.functions.invoke("signatureService", { action: "view", request_id: reqId, token })
      .then(res => {
        if (res.data?.success) {
          setRequest(res.data.request);
          const me = res.data.request.signers.find(s => s.token === token);
          setSigner(me);
        } else {
          setError("Could not load this signature request.");
        }
      })
      .catch(() => setError("Failed to load request. The link may have expired."))
      .finally(() => setLoading(false));
  }, [token, reqId]);

  // Canvas drawing
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    lastPos.current = getPos(e, canvas);
  };
  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
  };
  const stopDraw = () => { isDrawing.current = false; };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    if (!consent) return;
    const sigData = signatureMode === "type"
      ? { type: "typed", text: typedSig, font: "cursive" }
      : { type: "drawn", dataUrl: canvasRef.current?.toDataURL() };

    if (signatureMode === "type" && !typedSig.trim()) return;

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("signatureService", {
        action: "sign",
        request_id: reqId,
        token,
        signature_data: sigData,
      });
      if (res.data?.success) setSigned(true);
      else setError("Signing failed. Please try again.");
    } catch {
      setError("Signing failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F8FAFC" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Load</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F8FAFC" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Signed</h1>
          <p className="text-gray-500 text-sm mb-1">Thank you, <strong>{signer?.name}</strong>.</p>
          <p className="text-gray-400 text-xs">Your signature has been recorded. A confirmation will be sent once all parties have signed.</p>
        </div>
      </div>
    );
  }

  if (request?.status === "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F8FAFC" }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Already Completed</h1>
          <p className="text-gray-500 text-sm">This document has already been fully signed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <PenLine className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{request?.document_name}</p>
          <p className="text-xs text-gray-500">Signing as <strong>{signer?.name}</strong> ({signer?.role})</p>
        </div>
        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">EliteTC</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

        {/* Document preview */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{request?.document_name}</span>
          </div>
          {request?.document_url ? (
            <iframe
              src={request.document_url}
              className="w-full"
              style={{ height: "420px", border: "none" }}
              title="Document Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Document preview not available
            </div>
          )}
        </div>

        {/* Signature section */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Your Signature</h3>
            <p className="text-xs text-gray-500 mt-0.5">Choose how you'd like to sign below.</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              {["type", "draw"].map(mode => (
                <button
                  key={mode}
                  onClick={() => setSignatureMode(mode)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    signatureMode === mode
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {mode === "type" ? "Type Signature" : "Draw Signature"}
                </button>
              ))}
            </div>

            {/* Type mode */}
            {signatureMode === "type" && (
              <div>
                <input
                  type="text"
                  placeholder="Type your full name…"
                  value={typedSig}
                  onChange={e => setTypedSig(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
                {typedSig && (
                  <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 text-center">
                    <span style={{ fontFamily: "cursive", fontSize: "28px", color: "#1e293b" }}>{typedSig}</span>
                  </div>
                )}
              </div>
            )}

            {/* Draw mode */}
            {signatureMode === "draw" && (
              <div>
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={140}
                    className="w-full touch-none cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                </div>
                <button onClick={clearCanvas} className="mt-1.5 text-xs text-gray-400 hover:text-gray-600 underline">
                  Clear
                </button>
              </div>
            )}

            {/* Consent */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-colors" style={{ borderColor: consent ? "#2563EB" : "#e2e8f0", background: consent ? "#EFF6FF" : "#f8fafc" }}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${consent ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"}`}
                onClick={() => setConsent(c => !c)}>
                {consent && <Check className="w-3 h-3 text-white" />}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong>I agree to sign this document electronically.</strong> I understand and consent to use electronic signatures and records in accordance with the ESIGN Act. I intend to be bound by this electronic signature.
              </p>
            </label>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-11 text-base"
              disabled={!consent || submitting || (signatureMode === "type" && !typedSig.trim())}
              onClick={handleSign}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenLine className="w-5 h-5" />}
              {submitting ? "Signing…" : "Sign Document"}
            </Button>
          </div>
        </div>

        {/* Other signers status */}
        {request?.signers && request.signers.length > 1 && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">All Signers</p>
            <div className="space-y-2">
              {request.signers.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "signed" ? "bg-green-500" : s.status === "viewed" ? "bg-yellow-400" : "bg-gray-300"}`} />
                  <span className="text-sm text-gray-700 truncate">{s.name}</span>
                  <span className="text-xs text-gray-400 ml-auto capitalize">{s.status || "pending"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 pb-4">
          Powered by EliteTC · Secured via ESIGN Act compliance
        </p>
      </div>
    </div>
  );
}