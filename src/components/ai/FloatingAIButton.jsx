import React, { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useAIConversation } from '@/lib/AIConversationContext';

const styles = `
  .elite-ai-btn {
    padding: 12px 20px;
    border: none;
    font-size: 1rem;
    cursor: grab;
    position: fixed;
    background: linear-gradient(90deg, #5bfcc4, #f593e4, #71a4f0);
    border-radius: 12px;
    color: #fff;
    transition: box-shadow 0.3s ease, opacity 0.3s ease;
    box-shadow:
      inset 0px 0px 5px #ffffffa9,
      inset 0px 35px 30px #000,
      0px 5px 10px #000000cc;
    text-shadow: 1px 1px 1px #000;
    display: flex;
    align-items: center;
    gap: 5px;
    font-weight: 500;
    user-select: none;
    touch-action: none;
  }

  .elite-ai-btn.dragging {
    cursor: grabbing;
    opacity: 0.9;
    box-shadow:
      inset 0px 0px 5px #ffffffa9,
      inset 0px 35px 30px #000,
      0px 12px 30px #000000cc;
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

  .elite-ai-btn:active:not(.dragging)::before {
    filter: blur(5px);
  }
`;

const STORAGE_KEY = 'eliteai-btn-pos';

export default function FloatingAIButton() {
  const { isOpen, setIsOpen, isMinimized } = useAIConversation();

  const [pos, setPos] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: window.innerWidth - 160, y: window.innerHeight - 72 };
  });

  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const btnRef = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      dragMoved.current = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const btn = btnRef.current;
      const w = btn ? btn.offsetWidth : 130;
      const h = btn ? btn.offsetHeight : 44;
      const newX = Math.min(Math.max(clientX - offset.current.x, 0), window.innerWidth - w);
      const newY = Math.min(Math.max(clientY - offset.current.y, 0), window.innerHeight - h);
      setPos({ x: newX, y: newY });
      btn?.classList.add('dragging');
    };

    const onUp = () => {
      if (dragging.current) {
        btnRef.current?.classList.remove('dragging');
        dragging.current = false;
        setPos(prev => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
          return prev;
        });
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const onMouseDown = (e) => {
    dragMoved.current = false;
    dragging.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    offset.current = { x: clientX - pos.x, y: clientY - pos.y };
    e.preventDefault();
  };

  const handleClick = () => {
    if (!dragMoved.current) setIsOpen(true);
  };

  if (isOpen && !isMinimized) return null;

  return (
    <>
      <style>{styles}</style>
      <button
        ref={btnRef}
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
        onClick={handleClick}
        title="Drag to move · Click to open AI Assistant"
        className="elite-ai-btn"
        style={{ left: pos.x, top: pos.y, zIndex: 40 }}
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-4 h-4" />
        <span>Ask EliteAI</span>
      </button>
    </>
  );
}