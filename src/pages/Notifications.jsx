import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, AlertCircle, Clock, FileText, Layers } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "../components/auth/useCurrentUser";

const TYPE_ICONS = {
  deadline: Clock,
  task: CheckCheck,
  document: FileText,
  phase: Layers,
  system: AlertCircle,
};

const TYPE_COLORS = {
  deadline: "bg-amber-50 text-amber-600",
  task: "bg-blue-50 text-blue-600",
  document: "bg-purple-50 text-purple-600",
  phase: "bg-emerald-50 text-emerald-600",
  system: "bg-gray-50 text-gray-500",
};

export default function Notifications() {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", currentUser?.email],
    queryFn: () =>
      base44.entities.InAppNotification.filter(
        { user_email: currentUser?.email },
        "-created_date",
        50
      ),
    enabled: !!currentUser?.email,
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) =>
      base44.entities.InAppNotification.update(id, { read_at: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.read_at);
      for (const n of unread) {
        await base44.entities.InAppNotification.update(n.id, { read_at: new Date().toISOString() });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-500" /> Notifications
            {unreadCount > 0 && (
              <Badge className="bg-blue-600 text-white text-xs ml-1">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">In-app alerts for your transactions.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
            <CheckCheck className="w-4 h-4 mr-1" /> Mark All Read
          </Button>
        )}
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-14">
              <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || AlertCircle;
                const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.system;
                const isUnread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${isUnread ? "bg-blue-50/40 hover:bg-blue-50" : "hover:bg-gray-50"}`}
                    onClick={() => isUnread && markReadMutation.mutate(n.id)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${isUnread ? "text-gray-900" : "text-gray-600"}`}>{n.title}</p>
                        {isUnread && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                      </div>
                      {n.body && <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {n.created_date ? format(new Date(n.created_date), "MMM d, h:mm a") : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}