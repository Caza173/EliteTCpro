import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Users, CheckCircle, AlertTriangle, TrendingUp, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser, canManageBilling } from "../components/auth/useCurrentUser";
import { PLAN_DETAILS } from "../components/utils/tenantUtils";

const planOrder = ["starter", "pro", "team"];

const statusBadge = {
  trial: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  past_due: "bg-red-50 text-red-700 border-red-200",
  canceled: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function Billing() {
  const { data: currentUser } = useCurrentUser();

  const { data: billingAccounts = [], isLoading } = useQuery({
    queryKey: ["billingAccount", currentUser?.brokerage_id],
    queryFn: () => base44.entities.BillingAccount.filter({ brokerage_id: currentUser?.brokerage_id }),
    enabled: !!currentUser?.brokerage_id,
  });

  const billing = billingAccounts[0];

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser?.brokerage_id,
  });

  const seatUsers = allUsers.filter((u) =>
    u.brokerage_id === currentUser?.brokerage_id &&
    ["tc", "agent"].includes(u.role) &&
    u.status !== "disabled"
  );

  if (!canManageBilling(currentUser)) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Billing management is restricted to Owner/Admin accounts.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const plan = billing?.plan || "starter";
  const planInfo = PLAN_DETAILS[plan];
  const seatLimit = billing?.seat_limit ?? planInfo?.seat_limit ?? 6;
  const seatsUsed = seatUsers.length;
  const seatPct = Math.min(100, (seatsUsed / seatLimit) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing & Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your subscription and seats.</p>
      </div>

      {/* Current Plan */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Current Plan
            </CardTitle>
            <Badge variant="outline" className={`capitalize ${statusBadge[billing?.status || "trial"]}`}>
              {billing?.status || "trial"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{planInfo?.label || plan} Plan</p>
              <p className="text-sm text-gray-500">{planInfo?.price} — {planInfo?.description}</p>
            </div>
          </div>
          {billing?.trial_ends_at && billing.status === "trial" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Trial ends {format(new Date(billing.trial_ends_at), "MMMM d, yyyy")}. Upgrade to keep access.
            </div>
          )}
          {billing?.current_period_end && billing.status === "active" && (
            <p className="text-xs text-gray-400">Next billing date: {format(new Date(billing.current_period_end), "MMMM d, yyyy")}</p>
          )}
        </CardContent>
      </Card>

      {/* Seat Usage */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" /> Seat Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{seatsUsed} of {seatLimit === 999 ? "∞" : seatLimit} seats used</span>
            {seatsUsed >= seatLimit && seatLimit < 999 && (
              <span className="text-red-600 font-medium text-xs">Seat limit reached</span>
            )}
          </div>
          {seatLimit < 999 && <Progress value={seatPct} className="h-2" />}
          <p className="text-xs text-gray-400">TC and Agent roles count toward seats. Owner, Admin, and Client do not.</p>
        </CardContent>
      </Card>

      {/* Plan Options */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {planOrder.map((p) => {
              const info = PLAN_DETAILS[p];
              const isCurrent = p === plan;
              const isUpgrade = planOrder.indexOf(p) > planOrder.indexOf(plan);
              return (
                <div
                  key={p}
                  className={`flex items-center justify-between p-4 rounded-xl border ${isCurrent ? "border-blue-300 bg-blue-50/50" : "border-gray-100 bg-white"}`}
                >
                  <div className="flex items-center gap-3">
                    {isCurrent && <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{info.label}</p>
                      <p className="text-xs text-gray-500">{info.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-sm">{info.price}</span>
                    {!isCurrent && (
                      <Button
                        size="sm"
                        variant={isUpgrade ? "default" : "outline"}
                        className={isUpgrade ? "bg-blue-600 hover:bg-blue-700" : ""}
                        onClick={() => alert(`Stripe integration: redirect to checkout for ${info.label} plan.\n\nTo enable Stripe billing, upgrade to Builder+ and connect the Stripe integration.`)}
                      >
                        {isUpgrade ? <><ArrowUpRight className="w-3 h-3 mr-1" />Upgrade</> : "Switch"}
                      </Button>
                    )}
                    {isCurrent && <Badge variant="outline" className="text-blue-600 border-blue-300">Current</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Stripe billing requires the Builder+ plan. Contact support to enable payment processing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}