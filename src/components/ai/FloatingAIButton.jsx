import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useAIConversation } from '@/lib/AIConversationContext';

export default function FloatingAIButton() {
  const { isOpen, setIsOpen, isMinimized } = useAIConversation();

  // Only show if modal is closed or minimized
  if (isOpen && !isMinimized) return null;

  return (
    <button
      onClick={() => setIsOpen(true)}
      title="Open AI Assistant"
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
      aria-label="Open AI Assistant"
    >
      <MessageCircle className="w-5 h-5" />
    </button>
  );
}