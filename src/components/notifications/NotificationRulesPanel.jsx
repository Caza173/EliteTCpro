/**
 * NotificationRulesPanel — Settings → System → Notification Rules
 * Controls internal alerts sent to assigned agents + TCs only
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Loader2, Radio, Zap, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ToggleSwitch from "@/components/ui/ToggleSwitch";

const DEFAULT_RULES = {
  deadline_notice_enabled: true,
  deadline_warning_enabled: true,
  deadline_critical_enabled: true,
  compliance_alerts_enabled: true,
  task_reminders_enabled: true,
  sns_enabled: true,
  email_alerts_enabled: true,
  sms_enabled: false,
  push_enabled: false,
  slack_enabled: false,
};

const RULE_GROUPS = [
  {
    label: "Agent & TC Deadline Alerts",
    icon: Clock,
    iconColor: "#3B82F6",
    rules: [
      { key: "deadline_notice_enabled",   label: "72-Hour Notice",   desc: "Notify assigned agents + TC 3 days before deadline" },
      { key: "deadline_warning_enabled",  label: "48-Hour Warning",  desc: "Notify assigned agents + TC 2 days before deadline" },
      { key: "deadline_critical_enabled", label: "24-Hour Critical", desc: "Notify assigned agents + TC 1 day before + overdue" },
    ],
  },
  {
    label: "Internal Compliance Alerts",
    icon: Bell,
    iconColor: "#EF4444",
    rules: [
      { key: "compliance_alerts_enabled", label: "Compliance Blockers", desc: "Alert assigned agents + TC when critical issues detected" },
    ],
  },
  {
    label: "Internal Task Reminders",
    icon: Bell,
    iconColor: "#F59E0B",
    rules: [
      { key: "task_reminders_enabled",    label: "Overdue Tasks",      desc: "Alert assigned agents + TC on overdue required tasks" },
    ],
  },
  {
    label: "Delivery Channels",
    icon: Radio,
    iconColor: "#10B981",
    rules: [
      { key: "sns_enabled",          label: "AWS SNS",           desc: "Publish alerts to AWS SNS topic" },
      { key: "email_alerts_enabled", label: "Email",             desc: "Send email notifications to agents + TC" },
      { key: "sms_enabled",          label: "SMS",               desc: "Coming soon", disabled: true },
      { key: "push_enabled",         label: "Push Notifications",desc: "Coming soon", disabled: true },
      { key: "slack_enabled",        label: "Slack / Webhook",   desc: "Coming soon", disabled: true },
    ],
  },
];

function SettingsRow({ label, desc, checked, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle()}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 0",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        gap: 16,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: disabled ? "var(--text-muted)" : "var(--text-primary)",
            lineHeight: 1.4,
          }}>
            {label}
          </span>
          {disabled && (
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "1px 5px",
              letterSpacing: "0.02em",
            }}>
              Soon
            </span>
          )}
        </div>
        <p style={{
          fontSize: 12,
          color: "var(--text-muted)",
          marginTop: 1,
          lineHeight: 1.4,
        }}>
          {desc}
        </p>
      </div>
      <ToggleSwitch checked={checked} onChange={onToggle} disabled={disabled} />
    </button>
  );
}

function SectionCard({ group, rules, toggle }) {
  const Icon = group.icon;
  return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--card-border)",
      borderRadius: 10,
      overflow: "hidden",
    }}>
      {/* Section header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px 8px",
        borderBottom: "1px solid var(--card-border)",
      }}>
        <Icon style={{ width: 13, height: 13, color: group.iconColor, flexShrink: 0 }} />
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}>
          {group.label}
        </span>
      </div>

      {/* Rows */}
      <div style={{ padding: "0 16px" }}>
        {group.rules.map((rule, i) => (
          <div
            key={rule.key}
            style={{
              borderBottom: i < group.rules.length - 1 ? "1px solid var(--card-border)" : "none",
            }}
          >
            <SettingsRow
              label={rule.label}
              desc={rule.desc}
              checked={!!rules[rule.key]}
              onToggle={() => toggle(rule.key)}
              disabled={!!rule.disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NotificationRulesPanel({ currentUser }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [saved, setSaved] = useState(false);
  const [runningEngine, setRunningEngine] = useState(false);

  const { data: brokerage } = useQuery({
    queryKey: ["brokerage", currentUser?.brokerage_id],
    queryFn: () => base44.entities.Brokerage.filter({ id: currentUser?.brokerage_id }),
    enabled: !!currentUser?.brokerage_id,
    select: (data) => data[0],
  });

  useEffect(() => {
    if (brokerage?.notification_rules) {
      setRules({ ...DEFAULT_RULES, ...brokerage.notification_rules });
    }
  }, [brokerage]);

  const saveMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke("updateBrokerage", {
        brokerage_id: brokerage.id,
        data: { notification_rules: rules },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brokerage", currentUser?.brokerage_id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: "Notification rules saved" });
    },
    onError: (err) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const handleRunEngine = async () => {
    setRunningEngine(true);
    try {
      const res = await base44.functions.invoke("notificationEngine", { dry_run: false });
      const d = res.data || {};
      toast({
        title: "Notification engine ran",
        description: `${d.notifications_created || 0} created, ${d.sns_published || 0} SNS published`,
      });
    } catch (err) {
      toast({ title: "Engine run failed", description: err.message, variant: "destructive" });
    } finally {
      setRunningEngine(false);
    }
  };

  const toggle = (key) => setRules((r) => ({ ...r, [key]: !r[key] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>

      {/* Engine status card */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "rgba(37,99,235,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Zap style={{ width: 15, height: 15, color: "#2563EB" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Internal Notification Engine
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>
            Automatically evaluates assigned agents + TCs on all active transactions.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 500,
            background: "#F0FDF4", color: "#16A34A",
            border: "1px solid #BBF7D0",
            borderRadius: 6, padding: "2px 8px",
          }}>
            Hourly
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunEngine}
            disabled={runningEngine}
            style={{ fontSize: 12, height: 30, gap: 6 }}
          >
            {runningEngine ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <Zap style={{ width: 12, height: 12 }} />}
            {runningEngine ? "Running…" : "Run Now"}
          </Button>
        </div>
      </div>

      {/* Rule group cards */}
      {RULE_GROUPS.map((group) => (
        <SectionCard key={group.label} group={group} rules={rules} toggle={toggle} />
      ))}

      {/* Save button */}
      <div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !brokerage}
          style={{
            background: "#2563EB",
            color: "#fff",
            fontSize: 13,
            height: 34,
            borderRadius: 7,
            gap: 6,
            paddingLeft: 14,
            paddingRight: 14,
            border: "none",
            cursor: "pointer",
          }}
        >
          {saveMutation.isPending ? (
            <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
          ) : saved ? (
            <CheckCircle style={{ width: 13, height: 13 }} />
          ) : (
            <Bell style={{ width: 13, height: 13 }} />
          )}
          {saved ? "Saved!" : "Save Notification Rules"}
        </Button>
      </div>
    </div>
  );
}