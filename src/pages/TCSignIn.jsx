import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function TCSignIn() {
  useEffect(() => {
    base44.auth.redirectToLogin("/Dashboard");
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0D1B2A]">
      <div className="w-8 h-8 border-4 border-yellow-600/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  );
}