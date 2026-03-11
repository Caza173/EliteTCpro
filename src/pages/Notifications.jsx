import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCheck, AlertCircle, Clock, FileText, Layers, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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

  const [addendumForms, setAddendumForms] = React.useState({}); // { [notifId]: { note, verbiage, open } }

  const respondMutation = useMutation({
    mutationFn: ({ id, response, note, verbiage }) =>
      base44.entities.InAppNotification.update(id, {
        addendum_response: response,
        addendum_note: note || "",
        addendum_verbiage: verbiage || "",
        read_at: new Date().toISOString(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const toggleAddendumForm = (id) => {
    setAddendumForms(prev => ({
      ...prev,
      [id]: { note: "", verbiage: "", ...prev[id], open: !prev[id]?.open }
    }));
  };

  const updateAddendumField = (id, field, value) => {
    setAddendumForms(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-1" /> Mark All Read
          </Button>
        )}
      </div>

      <Card className="shadow-sm border-gray-100">
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-14">
              <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || AlertCircle;
                const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.system;
                const isUnread = !n.read_at;
                const isAddendumAlert = n.type === "deadline" && n.addendum_response !== undefined;
                const isPending = isAddendumAlert && n.addendum_response === "pending";
                const responded = isAddendumAlert && n.addendum_response !== "pending";

                return (
                  <div
                    key={n.id}
                    className={`rounded-lg border transition-colors ${
                      isUnread ? "bg-blue-50/40 border-blue-100" : "bg-white border-gray-100"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-3 p-3 ${!isPending && isUnread ? "cursor-pointer" : ""}`}
                      onClick={() => !isPending && isUnread && markReadMutation.mutate(n.id)}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${isUnread ? "text-gray-900" : "text-gray-600"}`}>
                            {n.title}
                          </p>
                          {isUnread && !isPending && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          {responded && (
                            <Badge
                              className={`text-xs px-2 py-0 ${
                                n.addendum_response === "yes"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {n.addendum_response === "yes" ? "Addendum needed" : "No addendum"}
                            </Badge>
                          )}
                        </div>
                        {n.body && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                        {n.created_date ? format(new Date(n.created_date), "MMM d, h:mm a") : ""}
                      </span>
                    </div>

                    {/* Action buttons for pending addendum alerts */}
                    {isPending && (
                      <div className="px-3 pb-3 flex items-center gap-2 border-t border-amber-100 pt-2 mt-0">
                        <p className="text-xs text-amber-700 font-medium mr-auto">
                          Do you need an addendum?
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
                          disabled={respondMutation.isPending}
                          onClick={() => respondMutation.mutate({ id: n.id, response: "no" })}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          No, we're good
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                          disabled={respondMutation.isPending}
                          onClick={() => respondMutation.mutate({ id: n.id, response: "yes" })}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Yes, prepare addendum
                        </Button>
                      </div>
                    )}
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