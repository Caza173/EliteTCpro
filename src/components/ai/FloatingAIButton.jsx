import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAIConversation } from '@/lib/AIConversationContext';

const styles = `
  .elite-ai-btn {
    padding: 12px 20px;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    position: fixed;
    background: linear-gradient(90deg, #5bfcc4, #f593e4, #71a4f0);
    border-radius: 12px;
    color: #fff;
    transition: all 0.3s ease;
    box-shadow:
      inset 0px 0px 5px #ffffffa9,
      inset 0px 35px 30px #000,
      0px 5px 10px #000000cc;
    text-shadow: 1px 1px 1px #000;
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 500;
  }

  .elite-ai-btn::before {
    content: "";
    position: absolute;
    inset: 0;
    margin: auto;
    border-radius: 12px;
    filter: blur(0);
    z-index: -1;
    box-shadow: none;
    background: conic-gradient(
      #00000000 80deg,
      #40baf7,
      #f34ad7,
      #5bfcc4,
      #00000000 280deg
    );
    transition: all 0.3s ease;
  }

  .elite-ai-btn:hover::before {
    filter: blur(15px);
  }

  .elite-ai-btn:active::before {
    filter: blur(5px);
    transform: translateY(1px);
  }

  .elite-ai-btn:active {
    box-shadow:
      inset 0px 0px 5px #ffffffa9,
      inset 0px 35px 30px #000;
    margin-top: 3px;
  }
`;

export default function FloatingAIButton() {
  const { isOpen, setIsOpen, isMinimized } = useAIConversation();

  // Only show if modal is closed or minimized
  if (isOpen && !isMinimized) return null;

  return (
    <>
      <style>{styles}</style>
      <button
        onClick={() => setIsOpen(true)}
        title="Open AI Assistant"
        className="elite-ai-btn"
        style={{ bottom: '24px', right: '24px', zIndex: 40 }}
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-4 h-4" />
        <span>Ask EliteAI</span>
      </button>
    </>
  );
}