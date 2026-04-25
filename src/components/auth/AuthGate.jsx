import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/CurrentUserContext.jsx";

// Public paths that never redirect
const PUBLIC_PATHS = ["/", "/Landing", "/AgentIntake", "/ClientLookup", "/DeadlineResponse", "/ApprovalAction", "/agent-signin", "/TCSignIn", "/agent/submit-transaction"];

export default function AuthGate({ children }) {
  const { currentUser, isLoading } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;

  // Wait for auth to fully resolve — never act on undefined state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  // A: Not logged in — allow public paths, redirect everything else to /
  if (!currentUser) {
    const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "?") || path.startsWith(p + "/"));
    if (!isPublic && path !== "/") {
      navigate("/", { replace: true });
      return null;
    }
    return children;
  }

  // B: Logged in, profile NOT complete → force /onboarding
  const profileCompleted = currentUser.profile_completed === true;
  if (!profileCompleted) {
    if (path !== "/onboarding") {
      navigate("/onboarding", { replace: true });
      return null;
    }
    return children;
  }

  // C: Logged in + profile complete → block / and /onboarding
  if (path === "/" || path === "/onboarding") {
    navigate("/Dashboard", { replace: true });
    return null;
  }

  return children;
}