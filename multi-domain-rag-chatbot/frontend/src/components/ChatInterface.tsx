import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Message } from "../types";
import "../styles.css";

const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

interface ChatInterfaceProps {
  domain: "education" | "medical";
  title: string;
  subtitle: string;
  placeholder: string;
  welcomeMessage: string;
  accentColor: string;
}

interface ChatMeta {
  sending: boolean;
  error: string | null;
}

function formatRequestError(err: unknown): string {
  if (err instanceof Error) {
    // Browser network errors from fetch are usually TypeError with generic messages.
    if (err.name === "TypeError" || /failed to fetch|load failed|networkerror/i.test(err.message)) {
      return [
        "Cannot reach the backend API.",
        "Make sure the FastAPI server is running on port 8000 and not blocked by firewall, then try again.",
      ].join(" ");
    }
    return err.message;
  }
  return "Unexpected error";
}

const TypingIndicator = () => (
  <div className="typing-indicator">
    <span /><span /><span />
  </div>
);

const ChatBubble = ({ message, accentColor }: { message: Message; accentColor: string }) => {
  const isUser = message.role === "user";
  return (
    <div className={`bubble-wrapper ${isUser ? "user" : "assistant"}`}>
      {!isUser && (
        <div className="avatar avatar-bot" style={{ background: accentColor }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      )}
      <div className={`bubble ${isUser ? "user" : "assistant"}`}>
        {message.mode && message.mode !== "system" && (
          <div className="meta">
            <span className="tag" style={{ borderColor: `${accentColor}44`, color: accentColor, background: `${accentColor}15` }}>
              {message.mode}
            </span>
          </div>
        )}
        <div className="bubble-text">{message.content}</div>
        <div className="bubble-time">
          {new Date(message.timestamp ?? Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      {isUser && (
        <div className="avatar avatar-user">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default function ChatInterface({ domain, title, subtitle, placeholder, welcomeMessage, accentColor }: ChatInterfaceProps) {
  const starter: Message = {
    id: `assistant-${domain}-hello`,
    role: "assistant",
    content: welcomeMessage,
    mode: "system",
    timestamp: Date.now(),
  };

  const [messages, setMessages] = useState<Message[]>([starter]);
  const [draft, setDraft] = useState("");
  const [meta, setMeta] = useState<ChatMeta>({ sending: false, error: null });
  const listRef = useRef<HTMLDivElement | null>(null);

  const endpoint = useMemo(() => `${apiBase || ""}/api/chat`, []);
  const healthEndpoint = useMemo(() => `${apiBase || ""}/health`, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, meta.sending]);

  useEffect(() => {
    // Best-effort early signal if backend isn't reachable.
    const controller = new AbortController();
    fetch(healthEndpoint, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Backend health check failed");
        // Clear any stale error from a previous aborted attempt (e.g. React StrictMode remount).
        setMeta((prev) => (prev.error ? { ...prev, error: null } : prev));
      })
      .catch((err) => {
        // Ignore AbortError — it fires when React StrictMode unmounts and the cleanup aborts the fetch.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMeta((prev) =>
          prev.error
            ? prev
            : {
                ...prev,
                error:
                  "Backend API is not reachable. Start the FastAPI server on port 8000 (and ensure no other process is using that port).",
              },
        );
      });
    return () => controller.abort();
  }, [healthEndpoint]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || meta.sending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: draft.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setMeta({ sending: true, error: null });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, domain }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || "Request failed");
      }

      const data = await res.json();
      const botMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer,
        mode: data.mode,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setMeta({ sending: false, error: null });
    } catch (err) {
      setMeta({ sending: false, error: formatRequestError(err) });
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-shell" style={{ "--accent": accentColor } as React.CSSProperties}>
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <div className="chat-logo" style={{ background: accentColor }}>
              {domain === "education" ? "📚" : "🩺"}
            </div>
            <div>
              <h1 className="chat-title">{title}</h1>
              <p className="chat-subtitle">{subtitle}</p>
            </div>
          </div>
          <div className="status-pill">
            <span className="status-dot" style={{ background: accentColor, boxShadow: `0 0 0 4px ${accentColor}30` }} />
            <span>Online</span>
          </div>
        </header>

        {/* Messages */}
        <div className="chat-window">
          <div className="messages" ref={listRef}>
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} accentColor={accentColor} />
            ))}
            {meta.sending && (
              <div className="bubble-wrapper assistant">
                <div className="avatar avatar-bot" style={{ background: accentColor }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="bubble assistant">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <input
              className="chat-input"
              placeholder={placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={meta.sending}
              autoFocus
            />
            <button
              className="send-btn"
              type="submit"
              disabled={meta.sending || !draft.trim()}
              style={{ background: accentColor }}
            >
              {meta.sending ? (
                <div className="send-spinner" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
          {meta.error && <div className="error-msg">⚠️ {meta.error}</div>}
          <div className="input-hint">
            Responses indicate whether RAG retrieval or LLM was used
          </div>
        </form>
      </div>
    </div>
  );
}
