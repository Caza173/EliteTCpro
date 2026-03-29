import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap, BarChart3, Lock, CheckCircle2, Calendar, AlertCircle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();
  const [lookupEmail, setLookupEmail] = useState("");

  const handleEnterTransaction = () => navigate("/#/AgentIntake");
  const handleAgentLogin = () => navigate("/#/PortalSelect");
  const handleCheckStatus = () => {
    if (lookupEmail.trim()) {
      navigate(`/#/ClientLookup?email=${encodeURIComponent(lookupEmail)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* ─────────────────────────────────────────────────────────────────────────
          HERO SECTION
          ───────────────────────────────────────────────────────────────────────── */}
      <section className="relative px-4 py-24 sm:py-32 overflow-hidden">
        {/* Soft gold glow behind text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-96 h-96 bg-amber-200/20 rounded-full blur-3xl -top-20"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          <h1 className="text-5xl sm:text-7xl font-bold text-slate-900 leading-tight tracking-tight">
            Transaction Coordination
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 via-blue-600 to-slate-700">
              Without the Chaos
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-600 font-light leading-relaxed max-w-3xl mx-auto">
            Deadlines tracked. Documents verified. Clients informed. One system. No gaps.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              onClick={handleEnterTransaction}
              className="bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white px-8 py-6 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              Enter Your Transaction
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleAgentLogin}
              variant="outline"
              className="border-2 border-slate-900 text-slate-900 hover:bg-slate-50 px-8 py-6 text-lg font-semibold rounded-lg transition-all duration-300"
            >
              Agent Login
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          AUTHORITY STRIP
          ───────────────────────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 text-white py-6 text-center">
        <p className="text-lg font-light opacity-90 max-w-3xl mx-auto">
          Used by agents handling complex, high-volume transactions. Built for compliance, speed, and zero missed deadlines.
        </p>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          PRIMARY FEATURES
          ───────────────────────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 text-center mb-16">
            Real Problems. Real Solutions.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="group p-8 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">AI Contract Intelligence</h3>
              <p className="text-slate-600 font-light leading-relaxed">
                Automatic parsing of agreements. Zero manual data entry. Deadlines captured instantly.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group p-8 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-200 transition">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Timeline Engine</h3>
              <p className="text-slate-600 font-light leading-relaxed">
                Never miss a deadline. Deadlines sync to your calendar. Agents and clients stay aligned.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group p-8 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition">
                <AlertCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Compliance Guardrails</h3>
              <p className="text-slate-600 font-light leading-relaxed">
                Missing signatures flagged instantly. Required documents tracked. Zero compliance surprises.
              </p>
            </div>

            {/* Card 4 */}
            <div className="group p-8 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Controlled Access</h3>
              <p className="text-slate-600 font-light leading-relaxed">
                Clients check status without logging in. No chaos. No confusion. One secure code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          BUILT FOR REAL TRANSACTIONS
          ───────────────────────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 bg-gradient-to-b from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 text-center mb-16">
            Built for Real Transactions — Not Theory
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Multi-Inspection Tracking</h3>
                <p className="text-slate-600 font-light">
                  General building. Septic. Home warranty. Each tracked separately. No overlap. No confusion.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Smart Deadline Sync</h3>
                <p className="text-slate-600 font-light">
                  Sync to Google Calendar or your system. One source of truth. Automatic reminders.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Compliance Alerts</h3>
                <p className="text-slate-600 font-light">
                  Missing signatures. Incomplete documents. Blocked deadlines. You hear about it immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          HOW IT WORKS
          ───────────────────────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 text-center mb-16">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Upload</h3>
              <p className="text-slate-600 font-light">
                Drop your purchase agreement. Listing agreement. Any document.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <div className="w-12 h-1 bg-gradient-to-r from-blue-300 to-transparent"></div>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Parse</h3>
              <p className="text-slate-600 font-light">
                AI reads the document instantly. Extracts deadlines. Identifies parties.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <div className="w-12 h-1 bg-gradient-to-r from-blue-300 to-transparent"></div>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Generate</h3>
              <p className="text-slate-600 font-light">
                Build checklists. Generate addendums. Create timelines automatically.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <div className="w-12 h-1 bg-gradient-to-r from-blue-300 to-transparent"></div>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">
                4
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Monitor</h3>
              <p className="text-slate-600 font-light">
                Track progress. Catch issues. Never miss a deadline again.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          TRANSACTION STATUS SECTION (PREMIUM)
          ───────────────────────────────────────────────────────────────────────── */}
      <section className="px-4 py-24 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-80 h-80 bg-blue-500/10 rounded-full blur-3xl top-0 right-0"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-12">
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Track Your Transaction
            </h2>
            <p className="text-xl text-blue-100 font-light">
              Without calling your agent. Check status anytime, anywhere.
            </p>
          </div>

          {/* Status Lookup Card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
            <label className="block text-sm font-semibold text-blue-100 mb-4">
              Enter Your Email
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCheckStatus()}
                placeholder="your@email.com"
                className="flex-1 px-6 py-4 bg-white/90 text-slate-900 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
              />
              <Button
                onClick={handleCheckStatus}
                className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 px-8 py-4 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap"
              >
                Check Status
              </Button>
            </div>
            <p className="text-xs text-blue-200 mt-4">
              No login required. Just your email and your access code.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          FINAL CTA
          ───────────────────────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 bg-white text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900">
            Ready to eliminate transaction chaos?
          </h2>
          <p className="text-xl text-slate-600 font-light">
            Start managing transactions smarter. One system. Real results.
          </p>
          <Button
            onClick={handleEnterTransaction}
            className="bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white px-10 py-6 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-2"
          >
            Enter Your Transaction
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          FOOTER
          ───────────────────────────────────────────────────────────────────────── */}
      <section className="px-4 py-12 bg-slate-900 text-slate-300 text-center border-t border-slate-800">
        <p className="text-sm">
          © 2026 EliteTC. Transaction coordination for high-performing real estate teams.
        </p>
      </section>
    </div>
  );
}