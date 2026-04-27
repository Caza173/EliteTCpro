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

  const path = location.pathname;

  // Compute redirect target synchronously (no effect needed for simple redirects)
  const getTarget = (loggedIn, profileCompleted, currentPath) => {
    if (!loggedIn) {
      if (!isPublicPath(currentPath)) return "/";
    } else if (!profileCompleted) {
      if (currentPath !== "/onboarding") return "/onboarding";
    } else {
      if (currentPath === "/" || currentPath === "/onboarding" || currentPath === "/Landing") {
        return "/Dashboard";
      }
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "#0F172A" }}>
        <div className="w-8 h-8 border-4 border-slate-600 border-t-slate-200 rounded-full animate-spin" />
      </div>
    );
  }

  const loggedIn = !!currentUser;
  const profileCompleted = currentUser?.profile_completed === true;
  const target = getTarget(loggedIn, profileCompleted, path);

  if (target && target !== path) {
    navigate(target, { replace: true });
    return null;
  }

  return children;
}