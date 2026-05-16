import React, { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useAIConversation } from '@/lib/AIConversationContext';

const styles = `
  .elite-ai-btn {
    padding: 10px 18px;
    border: 1px solid rgba(210, 163, 95, 0.35);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: grab;
    position: fixed;
    background: #0b0c0f;
    border-radius: 10px;
    color: #d2a35f;
    transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: 'Inter', sans-serif;
    user-select: none;
    touch-action: none;
  }

  .elite-ai-btn:hover {
    background: #101114;
    border-color: rgba(210, 163, 95, 0.6);
    box-shadow: 0 6px 24px rgba(210, 163, 95, 0.12);
    color: #e0b874;
  }

  .elite-ai-btn.dragging {
    cursor: grabbing;
    opacity: 0.85;
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