import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAIConversation } from '@/lib/AIConversationContext';
import "@/styles/elite-button.css";

export default function SidebarAIButton({ sidebarCollapsed }) {
  const { setIsOpen } = useAIConversation();

  return (
    <button
      onClick={() => setIsOpen(true)}
      title="Open AI Assistant"
      className="elite-btn elite-btn-gold elite-btn-sm w-full"
      style={{
        marginTop: '8px',
      }}
    >
      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
      {!sidebarCollapsed && <span>Ask EliteAI</span>}
    </button>
  );
}