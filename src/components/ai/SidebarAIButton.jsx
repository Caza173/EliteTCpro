import React from 'react';
import { useAIConversation } from '@/lib/AIConversationContext';
import "@/styles/elite-button.css";

export default function SidebarAIButton({ sidebarCollapsed }) {
  const { setIsOpen } = useAIConversation();

  return (
    <button
      onClick={() => setIsOpen(true)}
      title="Open AI Assistant"
      className="elite-btn elite-btn-outline elite-btn-sm w-full"
      style={{
        marginTop: '8px',
      }}
    >
      <span>Ask EliteAI</span>
    </button>
  );
}