/**
 * NotificationRulesPanel — Settings → System → Notification Rules
 * Allows admin/owner to configure notification preferences stored on the Brokerage record.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Loader2, Radio, Zap, Clock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ToggleSwitch from "@/components/ui/ToggleSwitch";

const DEFAULT_RULES = {
  deadline_notice_enabled: true,     // 72h
  deadline_warning_enabled: true,    // 48h
  deadline_critical_enabled: true,   // 24h + overdue
  compliance_alerts_enabled: true,
  task_reminders_enabled: true,
  sns_enabled: true,
  email_alerts_enabled: true,
  // Future channels (placeholders only)
  sms_enabled: false,
  push_enabled: false,
  slack_enabled: false,
};

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

  const RULE_GROUPS = [
    {
      label: "Deadline Alerts",
      icon: Clock,
      iconColor: "text-blue-500",
      rules: [
        { key: "deadline_notice_enabled",   label: "72-Hour Notice",     desc: "Alert 3 days before deadline" },
        { key: "deadline_warning_enabled",  label: "48-Hour Warning",    desc: "Alert 2 days before deadline" },
        { key: "deadline_critical_enabled", label: "24-Hour Critical",   desc: "Alert 1 day before + overdue" },
      ],
    },
    {
      label: "Compliance & Documents",
      icon: Bell,
      iconColor: "text-red-500",
      rules: [
        { key: "compliance_alerts_enabled", label: "Compliance Blockers", desc: "Alert when documents have critical issues" },
        { key: "task_reminders_enabled",    label: "Task Reminders",      desc: "Alert on overdue required tasks" },
      ],
    },
    {
      label: "Delivery Channels",
      icon: Radio,
      iconColor: "text-emerald-500",
      rules: [
        { key: "sns_enabled",            label: "AWS SNS",          desc: "Publish alerts to AWS SNS topic", active: true },
        { key: "email_alerts_enabled",   label: "Email",            desc: "Send email notifications to agent", active: true },
        { key: "sms_enabled",            label: "SMS",              desc: "Coming soon", disabled: true },
        { key: "push_enabled",           label: "Push Notifications", desc: "Coming soon", disabled: true },
        { key: "slack_enabled",          label: "Slack / Webhook",  desc: "Coming soon", disabled: true },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Engine status + manual run */}
      <Card style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
        <CardHeader className="flex flex-row items-center gap-4 py-4 pb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(37,99,235,0.1)" }}>
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Notification Engine
            </CardTitle>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Runs automatically every hour. Evaluates all active transactions.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Hourly</Badge>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-xs"
              onClick={handleRunEngine}
              disabled={runningEngine}
              style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              {runningEngine ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {runningEngine ? "Running…" : "Run Now"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Rule groups */}
      {RULE_GROUPS.map((group) => {
        const Icon = group.icon;
        return (
          <Card key={group.label} style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <Icon className={`w-3.5 h-3.5 ${group.iconColor}`} />
                {group.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-3">
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {group.rules.map((rule) => (
                  <button
                    key={rule.key}
                    type="button"
                    onClick={() => !rule.disabled && toggle(rule.key)}
                    disabled={!!rule.disabled}
                    className="w-full flex items-center justify-between py-2.5 text-left"
                    style={{ background: "none", border: "none", cursor: rule.disabled ? "default" : "pointer" }}
                  >
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: rule.disabled ? "var(--text-muted)" : "var(--text-primary)" }}
                        >
                          {rule.label}
                        </span>
                        {rule.disabled && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
                            Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{rule.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={!!rules[rule.key]}
                      onChange={() => toggle(rule.key)}
                      disabled={!!rule.disabled}
                    />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Save */}
      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !brokerage}
        className="gap-2 bg-blue-600 hover:bg-blue-700"
        size="sm"
      >
        {saveMutation.isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : saved ? (
          <CheckCircle className="w-3.5 h-3.5" />
        ) : (
          <Bell className="w-3.5 h-3.5" />
        )}
        {saved ? "Saved!" : "Save Notification Rules"}
      </Button>
    </div>
  );
}