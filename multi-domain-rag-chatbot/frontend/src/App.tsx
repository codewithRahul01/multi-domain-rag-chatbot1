import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import ChatInterface from "./components/ChatInterface";
import "./styles.css";

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: "/education", label: "📚 Education", emoji: "📚", color: "#6366f1" },
    { path: "/medical", label: "🩺 Medical", emoji: "🩺", color: "#f43f5e" },
  ];

  return (
    <nav className="top-nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="nav-logo-text">
            RAG<span className="nav-logo-highlight">Chat</span>
          </span>
        </Link>
        <div className="nav-links">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive ? "active" : ""}`}
                style={{
                  "--link-color": item.color,
                } as React.CSSProperties}
              >
                <span className="nav-link-label">{item.label}</span>
                {isActive && <span className="nav-link-indicator" />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function HomePage() {
  return (
    <div className="home-page">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="home-content">
        <div className="hero-badge">✨ Powered by Hybrid RAG + LLaMA 3.1</div>
        <h1 className="home-title">
          Ask Anything.<br />
          <span className="home-title-gradient">Get Intelligent Answers.</span>
        </h1>
        <p className="home-subtitle">
          Multi-domain AI chatbot with retrieval-augmented generation.
          <br />
          Select a domain below to start exploring.
        </p>

        <div className="domain-cards">
          <Link to="/education" className="domain-card card-education">
            <div className="card-glow" />
            <div className="card-content">
              <div className="domain-icon-wrapper">
                <span className="domain-emoji">📚</span>
              </div>
              <h2>Education</h2>
              <p>Explore academic topics, learning resources, and educational insights from curated knowledge bases.</p>
              <div className="card-cta">
                <span>Start chatting</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          <Link to="/medical" className="domain-card card-medical">
            <div className="card-glow" />
            <div className="card-content">
              <div className="domain-icon-wrapper">
                <span className="domain-emoji">🩺</span>
              </div>
              <h2>Medical</h2>
              <p>Get reliable health information and medical knowledge from trusted sources. Not a substitute for professional advice.</p>
              <div className="card-cta">
                <span>Start chatting</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        <div className="home-footer-info">
          <div className="info-chip">
            <span className="info-dot" />
            FAISS Vector Search
          </div>
          <div className="info-chip">
            <span className="info-dot" />
            Groq LLaMA 3.1
          </div>
          <div className="info-chip">
            <span className="info-dot" />
            Hybrid Retrieval
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/education"
            element={
              <ChatInterface
                key="education"
                domain="education"
                title="Education Assistant"
                subtitle="Hybrid RAG · Education Domain"
                placeholder="Ask about education, learning, academic topics..."
                welcomeMessage="👋 Hello! I'm your Education Assistant. Ask me anything about education — I'll search through curated knowledge and tell you exactly how I found the answer."
                accentColor="#6366f1"
              />
            }
          />
          <Route
            path="/medical"
            element={
              <ChatInterface
                key="medical"
                domain="medical"
                title="Medical Assistant"
                subtitle="Hybrid RAG · Medical Domain"
                placeholder="Ask about health, medicine, symptoms..."
                welcomeMessage="👋 Hello! I'm your Medical Assistant. Ask me health-related questions and I'll retrieve relevant information. Note: This is not a substitute for professional medical advice."
                accentColor="#f43f5e"
              />
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
