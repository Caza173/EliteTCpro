import React, { createContext, useContext, useState, useEffect } from 'react';

const AIConversationContext = createContext(null);

export function AIConversationProvider({ children }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your AI Transaction Command Center. I have full visibility into your transaction pipeline.\n\nAsk me anything — upcoming deadlines, compliance issues, deal summaries, drafting emails — or click a quick prompt below to get started.`,
    },
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Load persisted chat on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai_conversation_messages');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (err) {
        console.warn('Failed to restore AI chat:', err);
      }
    }
  }, []);

  // Save messages whenever they change
  useEffect(() => {
    localStorage.setItem('ai_conversation_messages', JSON.stringify(messages));
  }, [messages]);

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: `Chat cleared. I still have full visibility into your transaction pipeline. What do you need?`,
      },
    ]);
  };

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  return (
    <AIConversationContext.Provider
      value={{
        messages,
        setMessages,
        isOpen,
        setIsOpen,
        isMinimized,
        setIsMinimized,
        clearChat,
        addMessage,
      }}
    >
      {children}
    </AIConversationContext.Provider>
  );
}

export function useAIConversation() {
  const ctx = useContext(AIConversationContext);
  if (!ctx) {
    throw new Error('useAIConversation must be used within AIConversationProvider');
  }
  return ctx;
}