import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Zap, Mail, Calendar, Home, FileSignature, BarChart3, Workflow,
} from "lucide-react";

const INTEGRATIONS = [
  {
    id: "dotloop",
    name: "Dotloop",
    icon: Zap,
    status: "Coming Soon",
    description: "Integration will be available soon",
    color: "from-blue-50 to-blue-100",
    route: "DotloopIntegration",
  },
  {
    id: "skyslope",
    name: "SkySlope",
    icon: BarChart3,
    status: "Coming Soon",
    description: "Integration will be available soon",
    color: "from-purple-50 to-purple-100",
    route: null,
  },
  {
    id: "zapier",
    name: "Zapier",
    icon: Workflow,
    status: "Coming Soon",
    description: "Integration will be available soon",
    color: "from-orange-50 to-orange-100",
    route: null,
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: Mail,
    status: "Active",
    description: "Send transactional emails to clients and parties",
    color: "from-red-50 to-red-100",
    route: "GmailSetup",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    icon: Calendar,
    status: "Active",
    description: "Sync transaction deadlines to your calendar",
    color: "from-blue-50 to-blue-100",
    route: "GoogleCalendarSetup",
  },
  {
    id: "digital-signatures",
    name: "Digital Signatures",
    icon: FileSignature,
    status: "Coming Soon",
    description: "Integration will be available soon",
    color: "from-yellow-50 to-yellow-100",
    route: null,
  },
  {
    id: "mls-sync",
    name: "MLS Sync",
    icon: Home,
    status: "Coming Soon",
    description: "Integration will be available soon",
    color: "from-pink-50 to-pink-100",
    route: null,
  },
];

export default function Integrations() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Integrations
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Connect Atlas with external platforms to streamline your workflow.
        </p>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const isComingSoon = integration.status === "Coming Soon";
          
          const TileContent = (
            <div className={`rounded-xl border transition-all ${isComingSoon ? "opacity-60" : "hover:shadow-lg hover:-translate-y-0.5"} ${!isComingSoon ? "cursor-pointer" : "cursor-not-allowed"}`}
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
              }}>
              <div className="p-5 sm:p-6">
                {/* Icon + Status Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}
                    style={{
                      background: "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(37,99,235,0.05))"
                    }}>
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    integration.status === "Active" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : ""
                  }`}
                    style={integration.status !== "Active" ? {
                      background: "var(--bg-tertiary)",
                      borderColor: "var(--border)",
                      color: "var(--text-muted)"
                    } : {}}>
                    {integration.status}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
                  {integration.name}
                </h3>

                {/* Description */}
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {integration.description}
                </p>
              </div>
            </div>
          );

          // If there's a route, make it a Link, otherwise just a div
          if (integration.route && !isComingSoon) {
            return (
              <Link key={integration.id} to={createPageUrl(integration.route)}>
                {TileContent}
              </Link>
            );
          }

          return (
            <div key={integration.id}>
              {TileContent}
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-8 p-4 rounded-lg border" style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          More integrations coming soon. Check back regularly for updates. If you have integration requests, please contact our support team.
        </p>
      </div>
    </div>
  );
}