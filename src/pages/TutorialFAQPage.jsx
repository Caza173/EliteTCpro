import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { tutorialSections } from "@/lib/helpContent";
import TutorialSidebar from "@/components/help/TutorialSidebar";
import TutorialSectionCard from "@/components/help/TutorialSectionCard";
import FAQTab from "@/components/help/FAQTab";
import { Button } from "@/components/ui/button";
import { BookOpen, HelpCircle, Plus, Upload, Mail, Globe } from "lucide-react";

const TABS = [
  { id: "tutorial", label: "Tutorial", icon: BookOpen },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

export default function TutorialFAQPage() {
  const [activeTab, setActiveTab] = useState("tutorial");
  const [activeSectionId, setActiveSectionId] = useState(tutorialSections[0].id);
  const sectionRefs = useRef({});

  const scrollToSection = (id) => {
    setActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Help & Training</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Learn how to use EliteTC — step-by-step guides, FAQs, and best practices
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link to={createPageUrl("AddTransaction")}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> New Transaction
            </Button>
          </Link>
          <Link to={createPageUrl("Transactions")}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" /> Upload Docs
            </Button>
          </Link>
          <Link to={createPageUrl("Transactions")}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5" /> Send Email
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* TUTORIAL TAB */}
      {activeTab === "tutorial" && (
        <div className="flex gap-6 items-start">
          {/* Sidebar — hidden on mobile */}
          <div className="hidden lg:block">
            <TutorialSidebar
              sections={tutorialSections}
              activeId={activeSectionId}
              onSelect={scrollToSection}
            />
          </div>

          {/* Mobile section picker */}
          <div className="lg:hidden w-full">
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              value={activeSectionId}
              onChange={e => scrollToSection(e.target.value)}
            >
              {tutorialSections.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.title}</option>
              ))}
            </select>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-5">
            {tutorialSections.map(section => (
              <TutorialSectionCard key={section.id} section={section} />
            ))}

            {/* Bottom CTA */}
            <div className="rounded-xl border p-6 text-center space-y-3"
              style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Still Need Help?</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                The AI Assistant has full context on your transactions and can answer questions in real time.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link to={createPageUrl("Transactions")}>
                  <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                    <Globe className="w-4 h-4" /> Open AI Assistant
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => setActiveTab("faq")}>
                  <HelpCircle className="w-4 h-4" /> Browse FAQ
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQ TAB */}
      {activeTab === "faq" && (
        <div>
          <FAQTab />

          {/* Bottom CTA */}
          <div className="rounded-xl border p-6 text-center space-y-3 mt-5 max-w-3xl"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Can't find your answer?</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Try the Tutorial tab for step-by-step walkthroughs, or ask the AI Assistant directly.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button size="sm" variant="outline" className="gap-1.5"
                onClick={() => setActiveTab("tutorial")}>
                <BookOpen className="w-4 h-4" /> View Tutorial
              </Button>
              <Link to={createPageUrl("Transactions")}>
                <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Globe className="w-4 h-4" /> Ask AI Assistant
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}