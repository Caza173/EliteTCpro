import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Agent sign-in is no longer needed — the intake form is fully public.
// Redirect straight to the Deal Intake page.
export default function AgentSignIn() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/AgentIntake", { replace: true }); }, [navigate]);
  return null;
}