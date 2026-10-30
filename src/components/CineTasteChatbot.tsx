"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useScreenContext } from "@/lib/screenContext";
import { useAppStore } from "@/lib/appStore";
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Maximize2,
  Minimize2,
  Bot,
  User,
  Compass,
  Film,
  RotateCcw,
  Globe,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

/**
 * Lightweight, safe markdown formatter for assistant responses.
 * Formats **bold**, *italic*, bullet points, numbered lists, and quotes.
 */
function MarkdownContent({ content }: { content: string }) {
  const rendered = useMemo(() => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading 3 or 4
      if (trimmed.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-semibold text-emerald-300 text-sm mt-2 mb-1">
            {trimmed.replace(/^###\s+/, "")}
          </h4>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h3 key={idx} className="font-bold text-emerald-400 text-base mt-2 mb-1">
            {trimmed.replace(/^##\s+/, "")}
          </h3>
        );
      }

      // Bullet lists
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const text = trimmed.replace(/^[-*]\s+/, "");
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-foreground/90 my-0.5 leading-relaxed">
            <FormattedSpan text={text} />
          </li>
        );
      }

      // Numbered lists
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-4 list-decimal text-sm text-foreground/90 my-0.5 leading-relaxed">
            <FormattedSpan text={numMatch[2]} />
          </li>
        );
      }

      // Blockquotes
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={idx} className="border-l-2 border-emerald-500/50 pl-2 my-1 italic text-xs text-muted-foreground">
            <FormattedSpan text={trimmed.replace(/^>\s+/, "")} />
          </blockquote>
        );
      }

      // Blank line
      if (trimmed === "") {
        return <div key={idx} className="h-2" />;
      }

      // Normal paragraph
      return (
        <p key={idx} className="text-sm text-foreground/90 leading-relaxed my-0.5">
          <FormattedSpan text={line} />
        </p>
      );
    });
  }, [content]);

  return <div className="space-y-0.5">{rendered}</div>;
}

/**
 * Format inline **bold**, *italic*, and `code` spans
 */
function FormattedSpan({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={i} className="italic text-foreground/90">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="px-1 py-0.5 rounded bg-muted/60 text-xs font-mono text-emerald-300">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function CineTasteChatbot() {
  const pathname = usePathname() || "/";
  const { screenContext } = useScreenContext();
  const { state: appStoreState, getUser } = useAppStore();
  const user = appStoreState.user;
  const username = user?.username || "";

  // Check auth state if not yet fetched
  useEffect(() => {
    if (!appStoreState.userFetched) {
      getUser();
    }
  }, [appStoreState.userFetched, getUser]);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Completely hide on login, register, and unauthenticated pages
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage) return null;
  if (appStoreState.userFetched && !user) return null;
  if (!user) return null;

  // Storage key segmented by username
  const storageKey = useMemo(() => {
    return username ? `cinetaste_chat_history_${username}` : "cinetaste_chat_history_guest";
  }, [username]);

  // Load chat history from localStorage on mount and when username changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  }, [storageKey]);

  // Persist messages to localStorage
  const saveMessages = useCallback(
    (newMessages: ChatMessage[]) => {
      setMessages(newMessages);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newMessages));
        } catch {
          // ignore storage quota errors
        }
      }
    },
    [storageKey]
  );

  // Auto-scroll to bottom of message list
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Clear conversation history
  const handleClearHistory = () => {
    if (messages.length === 0) return;
    if (confirm("Reset CineTaste AI conversation history?")) {
      saveMessages([]);
      setErrorMessage(null);
    }
  };

  // Submit user message
  const handleSendMessage = async (textToSend?: string) => {
    const rawContent = (textToSend || input).trim();
    if (!rawContent || isLoading) return;

    setInput("");
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: rawContent,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    saveMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          screenContext,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reach CineTaste AI.");
      }

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: data.reply || "I couldn't generate a response. Please try again.",
        timestamp: Date.now(),
      };

      saveMessages([...updatedMessages, assistantMessage]);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Derive human-readable screen context label
  const screenLabel = useMemo(() => {
    if (screenContext.currentMovie) {
      return `Viewing: "${screenContext.currentMovie.title}"`;
    }
    const pn = screenContext.pathname || pathname || "/";
    if (pn === "/" || pn === "/dashboard") {
      return "Home";
    }
    if (screenContext.category) {
      const cat = screenContext.category.charAt(0).toUpperCase() + screenContext.category.slice(1);
      const filters = screenContext.appliedFilters?.genres?.length
        ? ` • ${screenContext.appliedFilters.genres.slice(0, 2).join(", ")}`
        : "";
      return `${cat} Catalogue${filters}`;
    }
    if (pn.startsWith("/library")) return "My Library";
    if (pn.startsWith("/recommendations")) return "Up Next Queue";
    if (pn.startsWith("/discover")) return "Discover";
    if (pn.startsWith("/profile")) return "Account & Taste DNA";
    if (pn.startsWith("/about")) return "About CineTaste";
    if (pn.startsWith("/admin")) return "Admin Dashboard";
    return "CineTaste Hub";
  }, [screenContext, pathname]);

  return (
    <>
      {/* ── Round Floating Chatbot Trigger Button ── */}
      <div className="fixed bottom-6 right-6 z-[9998]">
        <button
          id="cinetaste-chat-toggle-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "relative group flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300",
            "bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white",
            "border border-white/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/50",
            isOpen && "rotate-90 bg-zinc-800 text-zinc-300 border-zinc-700"
          )}
          aria-label={isOpen ? "Close CineTaste AI Chat" : "Open CineTaste AI Chat"}
          title={isOpen ? "Close Chat" : "Ask CineTaste AI"}
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform duration-200" />
          ) : (
            <>
              <Sparkles className="w-6 h-6 animate-pulse" />
              {/* Online pulse indicator */}
              <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-background" />
              </span>
            </>
          )}
        </button>
      </div>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          id="cinetaste-chat-panel"
          className={cn(
            "fixed z-[9999] flex flex-col overflow-hidden shadow-2xl transition-all duration-200",
            // Directly above floating button with right edges aligned
            "bottom-24 right-6 left-auto top-auto",
            // Responsive width and height ensuring panel stays fully inside viewport
            "w-[calc(100vw-3rem)] sm:w-[420px] max-w-[420px]",
            "h-[580px] max-h-[calc(100dvh-7.5rem)] rounded-2xl",
            "bg-[#0d121d]/95 backdrop-blur-2xl border border-white/10"
          )}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
                <Bot className="w-4 h-4" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-background" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-foreground tracking-tight">
                    CineTaste AI
                  </h3>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Globe className="w-3 h-3 text-cyan-400/80" />
                  <span>Online Browsing</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  title="Clear conversation"
                  className="p-1.5 rounded-lg hover:bg-white/10 hover:text-foreground transition-colors"
                  aria-label="Clear chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-foreground transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Screen Context Awareness Banner ── */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-500/[0.06] border-b border-emerald-500/10 text-[11px] text-emerald-300/90">
            <div className="flex items-center gap-1.5 truncate">
              <Radio className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
              <span className="font-medium text-emerald-400/80">Aware of:</span>
              <span className="truncate text-foreground/80 font-normal">{screenLabel}</span>
            </div>
          </div>

          {/* ── Messages List ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center px-4 py-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  Your CineTaste Companion
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px] mb-5">
                  I know your watch history, ratings, and personal reviews. Ask me anything about what’s on your screen or cinema worldwide.
                </p>

                {/* Quick Prompts */}
                <div className="flex flex-col gap-2 w-full max-w-[320px]">
                  <button
                    onClick={() => handleSendMessage("Show all movies in my library.")}
                    className="text-left px-3 py-2 rounded-xl text-xs bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 text-foreground/90 transition-all flex items-center justify-between group"
                  >
                    <span>Show all movies in my library</span>
                    <Film className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </button>
                  <button
                    onClick={() => handleSendMessage("What should I watch next according to my watch order?")}
                    className="text-left px-3 py-2 rounded-xl text-xs bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 text-foreground/90 transition-all flex items-center justify-between group"
                  >
                    <span>What to watch next (watch order)?</span>
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </button>
                  <button
                    onClick={() => handleSendMessage("Which movies have I rated 10/10?")}
                    className="text-left px-3 py-2 rounded-xl text-xs bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 text-foreground/90 transition-all flex items-center justify-between group"
                  >
                    <span>Which movies did I rate 10/10?</span>
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </button>
                  <button
                    onClick={() => handleSendMessage("What is my highest-rated genre?")}
                    className="text-left px-3 py-2 rounded-xl text-xs bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 text-foreground/90 transition-all flex items-center justify-between group"
                  >
                    <span>What is my highest-rated genre?</span>
                    <Compass className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </button>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-start gap-2.5",
                      isUser ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 mt-1">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 max-w-[85%] text-xs md:text-sm break-words shadow-sm",
                        isUser
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm"
                          : "bg-white/[0.05] border border-white/10 text-foreground rounded-tl-sm"
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      ) : (
                        <MarkdownContent content={m.content} />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 mt-1">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white/[0.05] border border-white/10 text-muted-foreground text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  <span className="ml-2 text-[11px] text-muted-foreground/80">Browsing & thinking...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                <span>{errorMessage}</span>
                <button
                  onClick={() => handleSendMessage()}
                  className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[11px] flex items-center gap-1 shrink-0 ml-2"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Bar ── */}
          <div className="p-3 border-t border-white/10 bg-white/[0.02]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 bg-white/[0.04] border border-white/10 focus-within:border-emerald-500/50 rounded-xl px-3 py-1.5 transition-colors"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about movies, watchlist, or this screen..."
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-xs md:text-sm text-foreground placeholder:text-muted-foreground max-h-24 min-h-[24px] py-1 leading-normal"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  input.trim() && !isLoading
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "text-muted-foreground/40 cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between px-1 mt-1.5 text-[10px] text-muted-foreground/60">
              <span>Shift+Enter for newline</span>
              <span>CineTaste AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
