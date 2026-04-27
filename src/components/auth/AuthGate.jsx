import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/CurrentUserContext.jsx";

// Routes that are always accessible without auth
const PUBLIC_PATHS = [
  "/", "/Landing", "/AgentIntake", "/ClientLookup",
  "/DeadlineResponse", "/ApprovalAction", "/agent-signin",
  "/TCSignIn", "/agent/submit-transaction",
];

function isPublicPath(path) {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

function getRedirectTarget(isLoading, currentUser, path) {
  if (isLoading) return null;

  const loggedIn = !!currentUser;
  const profileCompleted = currentUser?.profile_completed === true;

  if (!loggedIn) {
    // Unauthenticated: only public paths allowed
    if (!isPublicPath(path)) return "/";
    return null;
  }

  if (!profileCompleted) {
    // New user: only /onboarding allowed
    if (path !== "/onboarding") return "/onboarding";
    return null;
  }

  // Completed user: redirect away from landing/onboarding
  if (path === "/" || path === "/onboarding" || path === "/Landing") {
    return "/Dashboard";
  }

  return null;
}

export default function AuthGate({ children }) {
  const { currentUser, isLoading } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  useEffect(() => {
    // Wait until user state is fully resolved
    if (isLoading) return;

    const target = getRedirectTarget(isLoading, currentUser, path);

    // Only navigate if target is different from where we already are
    if (target && target !== path) {
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