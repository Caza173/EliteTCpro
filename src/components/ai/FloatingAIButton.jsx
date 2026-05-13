import React from 'react';
import { Sparkles } from 'lucide-react';
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
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
        boxShadow: '0 8px 32px rgba(30, 64, 175, 0.3), 0 4px 16px rgba(0, 0, 0, 0.15)',
        '--tw-ring-color': 'rgba(30, 64, 175, 0.5)',
      }}
      aria-label="Open AI Assistant"
    >
      <Sparkles className="w-5 h-5 text-white" />
    </button>
  );
}