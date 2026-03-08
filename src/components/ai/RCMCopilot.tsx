import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Minus, Send, Square, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRCMCopilot, CopilotMessage } from "@/hooks/useRCMCopilot";
import ReactMarkdown from "react-markdown";

const QUICK_PROMPTS = [
  "What are my top priorities today?",
  "Show me high-risk claims",
  "What's my revenue forecast?",
  "Any anomalies detected?",
];

function ChatMessage({ message }: { message: CopilotMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1.5 [&_p]:mt-0 [&_ul]:mb-1.5 [&_ul]:mt-0 [&_li]:mb-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export function RCMCopilot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isStreaming, send, stop, clear } = useRCMCopilot();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && !minimized) {
      inputRef.current?.focus();
    }
  }, [open, minimized]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
        aria-label="Open RCM Copilot"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    );
  }

  // Minimized bar
  if (minimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg cursor-pointer" onClick={() => setMinimized(false)}>
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">RCM Copilot</span>
        <button onClick={(e) => { e.stopPropagation(); setOpen(false); setMinimized(false); }} className="ml-1 hover:opacity-70">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col w-[400px] h-[560px] rounded-2xl border bg-background shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">RCM Copilot</span>
          <span className="text-[10px] opacity-70 bg-primary-foreground/20 rounded px-1.5 py-0.5">AI</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clear} className="p-1 hover:opacity-70 transition-opacity" title="Clear chat">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => setMinimized(true)} className="p-1 hover:opacity-70 transition-opacity">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setOpen(false); setMinimized(false); }} className="p-1 hover:opacity-70 transition-opacity">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">RCM Copilot</p>
              <p className="text-xs text-muted-foreground max-w-[260px]">
                Your AI assistant for revenue cycle management. Ask about claims, denials, forecasts, or anything RCM.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-[11px] px-2.5 py-1.5 rounded-full border bg-muted/50 text-foreground hover:bg-accent transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2 mb-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            </div>
            <div className="bg-muted rounded-xl px-3.5 py-2.5">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about claims, denials, revenue…"
            rows={1}
            className="flex-1 resize-none rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            style={{ maxHeight: 80 }}
          />
          {isStreaming ? (
            <button onClick={stop} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity">
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
