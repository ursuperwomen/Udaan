import React, { useEffect, useRef, useState } from 'react';
import { Send, HelpCircle, Loader2, X, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../types/visa';

interface RightRailGuideProps {
  messages: ChatMessage[];
  isSending: boolean;
  quickPrompts: string[];
  onSendMessage: (text: string) => void;
  mobileOpen: boolean;
  onToggleMobile: (open: boolean) => void;
}

export const RightRailGuide: React.FC<RightRailGuideProps> = ({
  messages,
  isSending,
  quickPrompts,
  onSendMessage,
  mobileOpen,
  onToggleMobile,
}) => {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    onSendMessage(trimmed);
    setDraft('');
  };

  const panelBody = (
    <div className="flex flex-col h-full bg-white rounded-2xl clearskies-ai-rail overflow-hidden">
      <div className="px-5 py-4 border-b border-indigo-100 flex items-center justify-between bg-[#F8FAFC]/60">
        <div>
          <h2 className="text-base font-bold text-[#1E293B]">UDAAN Guide</h2>
          <p className="text-xs text-[#475569]">Plain-English answers for every visa step</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleMobile(false)}
          aria-label="Close guide"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]/50">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[90%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-white border border-slate-200 text-[#1E293B] rounded-2xl rounded-br-[4px] shadow-xs'
                    : 'bg-[#F5F3FF] border border-[#E0E7FF] text-[#1E293B] rounded-2xl rounded-bl-[4px]'
                }`}
              >
                {msg.content}
              </div>
              <span className="mt-1 px-1 text-[11px] font-mono tabular-nums text-slate-400">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-start">
            <div className="bg-[#F5F3FF] border border-[#E0E7FF] text-[#4F46E5] px-4 py-3 rounded-2xl rounded-bl-[4px] text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Translating rules...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-4 pt-3 pb-2 border-t border-slate-100 bg-white">
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isSending}
              onClick={() => onSendMessage(prompt)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F3FF] hover:bg-[#EEF2FF] text-xs font-medium text-[#4F46E5] border border-[#E0E7FF] transition-colors text-left cursor-pointer disabled:opacity-50"
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask any visa question..."
          className="flex-1 h-12 px-3.5 rounded-lg border-[1.5px] border-[#CBD5E1] bg-white text-sm text-[#1E293B] placeholder:text-slate-400 focus:outline-none focus:border-[#1E3A8A] focus:ring-3 focus:ring-[#1E3A8A]/15"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSending}
          aria-label="Send message"
          className="w-12 h-12 shrink-0 flex items-center justify-center rounded-lg bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-45 text-white transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop persistent 4-column rail */}
      <aside className="hidden lg:block lg:col-span-4">
        <div className="sticky top-24 h-[calc(100vh-7.5rem)]">{panelBody}</div>
      </aside>

      {/* Mobile compact trigger (keeps well under 15% sticky height) */}
      {!mobileOpen && (
        <div className="fixed bottom-4 right-4 z-40 lg:hidden">
          <button
            type="button"
            onClick={() => onToggleMobile(true)}
            className="h-12 px-4 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Ask UDAAN Guide</span>
          </button>
        </div>
      )}

      {/* Mobile Slide-Up Sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/40 flex items-end p-2 sm:p-4">
          <div className="w-full h-[80vh]">{panelBody}</div>
        </div>
      )}
    </>
  );
};
