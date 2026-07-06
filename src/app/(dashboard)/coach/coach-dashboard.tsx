'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain, Clock, ChevronRight } from 'lucide-react';
import { sendCoachMessage } from '@/app/actions/coach';

interface Message {
  id: string;
  sender: 'USER' | 'AI';
  content: string;
  createdAt: string;
}

interface CoachDashboardProps {
  initialMessages: Message[];
}

export default function CoachDashboard({ initialMessages }: CoachDashboardProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  // Autoscroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isPending) return;

    const userText = inputValue;
    setInputValue('');

    // 1. Optimistic append of User message
    const tempUserMsg: Message = {
      id: `temp-u-${Date.now()}`,
      sender: 'USER',
      content: userText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    // 2. Trigger Server Action
    startTransition(async () => {
      const res = await sendCoachMessage({ content: userText });
      if (!res.error) {
        // Reload fresh conversation logs containing AI reply
        window.location.reload();
      } else {
        alert(res.error);
        // Rollback message
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      }
    });
  };

  // Lightweight custom markdown compiler
  const parseInlineMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-extrabold text-foreground bg-primary/5 px-1 rounded text-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const parseMarkdownBlock = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Heading level 3
      if (line.startsWith('### ')) {
        return (
          <h3 key={i} className="text-sm font-extrabold text-primary flex items-center gap-1.5 mt-4 mb-2 select-none">
            <Sparkles className="h-4 w-4 fill-current text-primary animate-pulse" />
            {line.substring(4)}
          </h3>
        );
      }
      
      // Bullet list items
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return (
          <li key={i} className="text-xs text-muted-foreground list-disc ml-5 my-1.5 leading-relaxed">
            {parseInlineMarkdown(line.substring(2))}
          </li>
        );
      }

      // Empty line padding
      if (!line.trim()) {
        return <div key={i} className="h-2" />;
      }

      // Standard paragraphs
      return (
        <p key={i} className="text-xs text-foreground/90 leading-relaxed my-1">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-card/45 backdrop-blur-md flex flex-col h-[calc(100vh-230px)] overflow-hidden shadow-sm text-left">
      {/* Top Session bar */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
          <Brain className="h-5 w-5 fill-current text-primary animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">AI Coach session</h3>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            Online • Ready to optimize routines
          </span>
        </div>
      </div>

      {/* Messages Scrolling Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {messages.map((m) => {
          const isAI = m.sender === 'AI';
          
          return (
            <div
              key={m.id}
              className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-xs shadow-sm ${
                  isAI
                    ? 'bg-white/[0.01] border border-white/5 text-foreground'
                    : 'bg-primary text-primary-foreground font-medium border border-primary/10'
                }`}
              >
                {/* Message body */}
                <div className="space-y-1">
                  {isAI ? parseMarkdownBlock(m.content) : m.content}
                </div>

                {/* Timestamp */}
                <div className={`text-[8px] mt-2 text-right ${isAI ? 'text-muted-foreground/60' : 'text-primary-foreground/60'}`}>
                  {new Date(m.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator bubble */}
        {isPending && (
          <div className="flex w-full justify-start">
            <div className="rounded-2xl px-4 py-3 bg-white/[0.01] border border-white/5 text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-spin" />
              <span>Advisor is compiling stats feedback...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input panel block */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-white/5 p-4 bg-black/20 flex gap-3 items-end shrink-0"
      >
        <textarea
          value={inputValue}
          disabled={isPending}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          rows={1}
          placeholder="Ask about study planner blocks, streak freezes, or coding..."
          className="flex-1 px-4 py-3 rounded-xl glass-input text-xs text-foreground placeholder-muted-foreground/50 resize-none max-h-[80px] scrollbar-none focus:outline-none"
        />

        <button
          type="submit"
          disabled={!inputValue.trim() || isPending}
          className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/95 shadow-md shadow-primary/10 transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4 fill-current ml-0.5" />
        </button>
      </form>
    </div>
  );
}
