import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Send, Loader2, MessageSquare, Zap, Trash2 } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { api } from '@/lib/api';
import type { AIChatMessage } from '@/types';

const SUGGESTIONS = [
  "What is pending for today?",
  "Which relocations are delayed?",
  "Show customers moving this week",
  "What should I do today?",
  "Which vendor has the most delays?",
  "Summarize active relocations",
];

export default function AIChatPanel() {
  const { chatOpen, setChatOpen, chatMessages, addChatMessage, clearChat } = useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useMutation({
    mutationFn: (message: string) => api.ai.chat(message),
    onSuccess: (data) => {
      addChatMessage({
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      });
    },
    onError: () => {
      addChatMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [chatOpen]);

  const handleSend = (msg?: string) => {
    const text = msg || input.trim();
    if (!text || chatMutation.isPending) return;
    addChatMessage({ role: 'user', content: text, timestamp: new Date().toISOString() });
    chatMutation.mutate(text);
    setInput('');
  };

  if (!chatOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none"
        onClick={() => setChatOpen(false)} />

      <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[420px] flex flex-col animate-slide-in-right"
        style={{ backgroundColor: 'var(--bg-surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              <Zap size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary">AI Assistant</h3>
              <p className="text-[10px] text-tertiary">Ask about your operations</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={clearChat} className="btn-ghost btn-icon rounded-lg" title="Clear chat">
              <Trash2 size={15} className="text-tertiary" />
            </button>
            <button onClick={() => setChatOpen(false)} className="btn-ghost btn-icon rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <MessageSquare size={24} />
                </div>
                <h4 className="text-sm font-semibold text-primary mb-1">Operations Assistant</h4>
                <p className="text-xs text-tertiary">Ask questions about your relocations, tasks, vendors, and more.</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2 px-1">Try asking</p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg transition-colors text-secondary hover:text-primary"
                      style={{ backgroundColor: 'var(--bg-primary)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`chat-bubble ${msg.role}`}>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content}</pre>
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="chat-bubble assistant flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-subtle">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask about your operations..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="input flex-1"
              disabled={chatMutation.isPending}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || chatMutation.isPending}
              className="btn btn-primary btn-icon"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
