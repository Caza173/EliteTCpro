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
  const lastNavigated = useRef(null);

  const path = location.pathname;

  useEffect(() => {
    // Wait until auth is fully resolved
    if (isLoading) return;

    // Derive stable values — never undefined
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
      // Fully onboarded: don't let them sit on landing or onboarding
      if (path === "/" || path === "/onboarding" || path === "/Landing") {
        target = "/Dashboard";
      }
    }

    // Only navigate if target is different from current path AND we haven't just navigated there
    if (target && target !== path && lastNavigated.current !== target) {
      lastNavigated.current = target;
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