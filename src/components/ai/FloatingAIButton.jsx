import React from 'react';
import { useAIConversation } from '@/lib/AIConversationContext';

export default function FloatingAIButton() {
  const { isOpen, setIsOpen, isMinimized } = useAIConversation();

  // Only show button if modal is closed or minimized
  if (isOpen && !isMinimized) return null;

  return (
    <button
      onClick={() => {
        setIsOpen(true);
      }}
      title="Open AI Assistant"
      className="outer-cont fixed bottom-6 right-6 z-40"
      style={{
        background: 'linear-gradient(90deg, #5bfcc4, #f593e4, #71a4f0)',
        boxShadow: 'inset 0px 0px 5px #ffffffa9, inset 0px 35px 30px #000, 0px 5px 10px #000000cc',
      }}
      aria-label="Open AI Assistant"
    >
      <span className="flex">
        <span>Ask EliteAI</span>
      </span>
    </button>
  );
}