import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/CurrentUserContext.jsx";

// Public paths that don't require auth
const PUBLIC_PATHS = [
  "/", "/Landing", "/AgentIntake", "/ClientLookup",
  "/DeadlineResponse", "/ApprovalAction", "/agent-signin",
  "/TCSignIn", "/agent/submit-transaction",
];

export default function AuthGate({ children }) {
  const { currentUser, isLoading } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  const profileCompleted = currentUser?.profile_completed === true;

  console.log("AUTH STATE", {
    path,
    isLoading,
    user: !!currentUser,
    profile_completed: currentUser?.profile_completed,
  });

  useEffect(() => {
    if (isLoading) return;

    // A: Not logged in
    if (!currentUser) {
      const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
      if (!isPublic) {
        navigate("/", { replace: true });
      }
      return;
    }

    // B: Logged in, profile not complete
    if (!profileCompleted) {
      if (path !== "/onboarding") {
        navigate("/onboarding", { replace: true });
      }
      return;
    }

    // C: Logged in + complete — block landing and onboarding
    if (path === "/" || path === "/onboarding") {
      navigate("/Dashboard", { replace: true });
    }
  }, [currentUser, isLoading, path, profileCompleted]);

  // Block render until auth is resolved
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "#0F172A" }}>
        <div className="w-8 h-8 border-4 border-slate-600 border-t-slate-200 rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}