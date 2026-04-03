import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useCurrentUser } from "../auth/useCurrentUser";

export default function NotificationBell() {
  const { data: currentUser } = useCurrentUser();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", currentUser?.email],
    queryFn: async () => {
      const all = await base44.entities.InAppNotification.filter(
        { user_email: currentUser?.email },
        "-created_date",
        50
      );
      return all.filter(n => !n.dismissed);
    },
    enabled: !!currentUser?.email,
    refetchInterval: 30000,
  });

  const unread = notifications.filter((n) => !n.read_at && !n.dismissed).length;

  return (
    <Link to={createPageUrl("Notifications")} className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
      <Bell className="w-5 h-5 text-gray-500" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}