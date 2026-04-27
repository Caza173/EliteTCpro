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
  const redirectedTo = useRef(null);

  const path = location.pathname;
  const loggedIn = !!currentUser;
  const profileCompleted = currentUser?.profile_completed === true;

  useEffect(() => {
    if (isLoading) return;

    let target = null;

    if (!loggedIn) {
      if (!isPublicPath(path)) target = "/";
    } else if (!profileCompleted) {
      if (path !== "/onboarding") target = "/onboarding";
    } else {
      if (path === "/" || path === "/onboarding" || path === "/Landing") target = "/Dashboard";
    }

    // Only redirect if we have a target, it differs from current path,
    // AND we haven't already redirected to this exact target
    if (target && target !== path && redirectedTo.current !== target) {
      redirectedTo.current = target;
      navigate(target, { replace: true });
    } else if (!target) {
      // Clear the guard when no redirect is needed (user is on correct page)
      redirectedTo.current = null;
    }
  }, [isLoading, loggedIn, profileCompleted, path]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "#0F172A" }}>
        <div className="w-8 h-8 border-4 border-slate-600 border-t-slate-200 rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}