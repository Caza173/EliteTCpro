import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard, CheckCircle, AlertTriangle, TrendingUp, ArrowUpRight,
  ArrowDownRight, Loader2, Users, User,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser, canManageBilling } from "../components/auth/useCurrentUser";
import { PLAN_DETAILS } from "../components/utils/tenantUtils";

const PLAN_ORDER = ["individual_monthly", "team_monthly"];

const STATUS_BADGE = {
  trial:    "bg-amber-50 text-amber-700 border-amber-200",
  active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  past_due: "bg-red-50 text-red-700 border-red-200",
  canceled: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function Billing() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [changingPlan, setChangingPlan] = useState(null);
  const [message, setMessage] = useState(null);

  // Check for success/canceled query params from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      setMessage("Payment successful! Your plan is now active.");
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("canceled") === "1") {
      setMessage("Error: Checkout was canceled. No changes were made.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Derive current plan from user record (subscription_plan field)
  const currentPlanKey = currentUser?.subscription_plan === "team"
    ? "team_monthly"
    : "individual_monthly";

  const changePlanMutation = useMutation({
    mutationFn: (plan_id) => {
      const origin = window.location.origin;
      return base44.functions.invoke("changePlan", {
        plan_id,
        success_url: `${origin}/Billing?success=1`,
        cancel_url: `${origin}/Billing?canceled=1`,
      });
    },
    onMutate: (plan_id) => setChangingPlan(plan_id),
    onSuccess: (res, plan_id) => {
      setChangingPlan(null);
      const data = res.data;
      // If backend returned a Stripe Checkout URL, redirect there
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      // Otherwise it was an in-place update (existing active subscription)
      const isUpgrade = plan_id === "team_monthly";
      setMessage(isUpgrade
        ? "Plan upgraded successfully! Team features are now active."
        : "Downgrade scheduled — will take effect at the end of your billing cycle."
      );
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: (err) => {
      setChangingPlan(null);
      setMessage(`Error: ${err?.response?.data?.error || err.message}`);
    },
  });

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <Loader2 className="w-8 h-8 text-gray-300 mx-auto animate-spin" />
      </div>
    );
  }

  const currentPlanInfo = PLAN_DETAILS[currentPlanKey];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Billing & Plan
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Manage your subscription.
        </p>
      </div>

      {/* Message banner */}
      {message && (
        <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
          message.startsWith("Error")
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          {message.startsWith("Error")
            ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Current Plan */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Current Plan
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              {currentUser?.subscription_plan === "team"
                ? <Users className="w-6 h-6 text-blue-500" />
                : <User className="w-6 h-6 text-blue-500" />}
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {currentPlanInfo?.label} Plan
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {currentPlanInfo?.price} — {currentPlanInfo?.description}
              </p>
            </div>
            <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-700 border-emerald-200">
              Active
            </Badge>
          </div>

          {/* Team feature indicator */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            {currentUser?.can_create_team ? (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle className="w-4 h-4" /> Team creation & member invites enabled
              </span>
            ) : (
              <span className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                <Users className="w-4 h-4" /> Upgrade to Team to create teams and invite members
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Options */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {PLAN_ORDER.map((planKey) => {
              const info = PLAN_DETAILS[planKey];
              const isCurrent = planKey === currentPlanKey;
              const isUpgrade = PLAN_ORDER.indexOf(planKey) > PLAN_ORDER.indexOf(currentPlanKey);
              const isLoading = changingPlan === planKey;

              return (
                <div
                  key={planKey}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-gray-100"
                  }`}
                  style={!isCurrent ? { background: "var(--card-bg)" } : {}}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: isCurrent ? "rgba(37,99,235,0.12)" : "var(--bg-tertiary)" }}>
                      {info.can_create_team
                        ? <Users className="w-4 h-4" style={{ color: isCurrent ? "var(--accent)" : "var(--text-muted)" }} />
                        : <User className="w-4 h-4" style={{ color: isCurrent ? "var(--accent)" : "var(--text-muted)" }} />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{info.label}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{info.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{info.price}</span>
                    {isCurrent ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">Current</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={isUpgrade ? "default" : "outline"}
                        className={isUpgrade ? "gap-1 bg-blue-600 hover:bg-blue-700" : "gap-1"}
                        disabled={!!changingPlan}
                        onClick={() => changePlanMutation.mutate(planKey)}
                      >
                        {isLoading
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : isUpgrade
                            ? <ArrowUpRight className="w-3 h-3" />
                            : <ArrowDownRight className="w-3 h-3" />}
                        {isUpgrade ? "Upgrade" : "Downgrade"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
            <p>• Upgrades take effect immediately with prorated billing.</p>
            <p>• Downgrades take effect at the end of your current billing cycle.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}