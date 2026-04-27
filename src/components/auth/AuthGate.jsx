import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/CurrentUserContext.jsx";

// Public paths that don't require auth
const PUBLIC_PATHS = [
  "/", "/Landing", "/AgentIntake", "/ClientLookup",
  "/DeadlineResponse", "/ApprovalAction", "/agent-signin",
  "/TCSignIn", "/agent/submit-transaction",
];

function isPublicPath(path) {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

export default function AuthGate({ children }) {
  const { currentUser, isLoading } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  const path = location.pathname;

  useEffect(() => {
    // Reset redirect flag when path changes
    hasRedirected.current = false;
  }, [path]);

  useEffect(() => {
    if (isLoading) return;
    if (hasRedirected.current) return;

    const loggedIn = !!currentUser;
    const profileCompleted = currentUser?.profile_completed === true;

    let target = null;

    if (!loggedIn) {
      // Not logged in: redirect protected pages to landing
      if (!isPublicPath(path)) {
        target = "/";
      }
    } else if (!profileCompleted) {
      // Logged in but profile incomplete: must finish onboarding
      if (path !== "/onboarding") {
        target = "/onboarding";
      }
    } else {
      // Fully onboarded: redirect away from landing/onboarding to Dashboard
      if (path === "/" || path === "/onboarding" || path === "/Landing") {
        target = "/Dashboard";
      }
    }

    if (target && target !== path) {
      hasRedirected.current = true;
      navigate(target, { replace: true });
    }
  }, [isLoading, currentUser?.id, currentUser?.profile_completed, path]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "#0F172A" }}>
        <div className="w-8 h-8 border-4 border-slate-600 border-t-slate-200 rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}