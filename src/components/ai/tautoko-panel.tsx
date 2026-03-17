"use client";

import { useState, useRef, useEffect } from "react";
import { useTautoko, getAgentLabel } from "./agent-context";
import { IconX, IconSparkles } from "@/components/ui/icons";

const QUICK_SUGGESTIONS = [
  "Who needs a visit this week?",
  "Check unclaimed modules",
  "Any clinical alerts?",
  "Draft a referral letter",
  "Income forecast this quarter",
  "Summarise recent visits",
];

export function TautokoPanel() {
  const { isOpen, close, messages, isThinking, activeAgent, sendMessage, clearChat } = useTautoko();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    await sendMessage(trimmed);
  }

  async function handleSuggestion(text: string) {
    setInput("");
    await sendMessage(text);
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50 backdrop-enter md:bg-black/20"
        onClick={close}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[380px] bg-white z-50 flex flex-col shadow-xl sheet-enter md:animate-none md:border-l md:border-warm-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200 safe-top">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-plum-50 flex items-center justify-center">
              <IconSparkles size={18} className="text-plum-600" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-sage-900">Tautoko</h2>
              {activeAgent && (
                <p className="text-[11px] text-plum-600 font-medium">{getAgentLabel(activeAgent)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="px-2.5 py-1.5 text-[11px] font-medium text-warm-400 rounded-full hover:bg-warm-50 active:bg-warm-100 transition-colors duration-150"
              >
                Clear
              </button>
            )}
            <button
              onClick={close}
              className="w-9 h-9 flex items-center justify-center rounded-full active:bg-warm-50 transition-colors duration-150"
            >
              <IconX size={20} className="text-warm-400" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-container">
          {messages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-14 h-14 rounded-full bg-plum-50 flex items-center justify-center mb-4">
                <IconSparkles size={28} className="text-plum-400" />
              </div>
              <h3 className="text-[15px] font-medium text-sage-900 mb-1">Kia ora! I&apos;m Tautoko</h3>
              <p className="text-sm text-warm-400 mb-6 max-w-[260px]">
                Your AI midwifery assistant. Ask me about clinical care, claims, scheduling, or anything else.
              </p>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestion(suggestion)}
                    className="px-3 py-2 text-xs font-medium text-plum-600 bg-plum-50 border border-plum-100 rounded-full active:bg-plum-100 transition-colors duration-150"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-sage-600 text-white rounded-br-md"
                    : "bg-plum-50 text-sage-900 border-l-2 border-plum-200 rounded-bl-md"
                }`}
              >
                {msg.agent && msg.role === "assistant" && (
                  <p className="text-[10px] font-medium text-plum-500 uppercase tracking-wider mb-1">
                    {getAgentLabel(msg.agent)}
                  </p>
                )}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-white/60" : "text-warm-300"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-plum-50 rounded-2xl rounded-bl-md px-4 py-3 border-l-2 border-plum-200">
                {activeAgent && (
                  <p className="text-[10px] font-medium text-plum-500 uppercase tracking-wider mb-1.5">
                    {getAgentLabel(activeAgent)}
                  </p>
                )}
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-plum-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-plum-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-plum-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions after conversation started */}
        {messages.length > 0 && !isThinking && (
          <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scroll-pills">
            {QUICK_SUGGESTIONS.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestion(suggestion)}
                className="flex-shrink-0 px-3 py-1.5 text-[11px] font-medium text-plum-600 bg-plum-50 rounded-full active:bg-plum-100 transition-colors duration-150"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 border-t border-warm-200 safe-bottom"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Tautoko..."
              disabled={isThinking}
              className="flex-1 px-4 py-3 md:py-2.5 text-sm border border-warm-200 rounded-full bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-plum-400 focus:ring-1 focus:ring-plum-400 disabled:opacity-50 transition-colors duration-150"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-plum-600 text-white active:bg-plum-700 disabled:opacity-40 transition-colors duration-150 flex-shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
