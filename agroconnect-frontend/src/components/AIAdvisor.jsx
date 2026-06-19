//aiadvisor.jsx


import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api/priceApi";
import { formatBilingualText, t } from "../utils/translations";
import "./AIAdvisor.css";

export default function AIAdvisor({ crop, weather, state, prices, bestMandi, language }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Suggested questions
  const SUGGESTIONS = language === "hi" ? [
    "क्या मुझे अभी बेचना चाहिए या इंतजार करना चाहिए?",
    "कौन सी मंडी सबसे अच्छा भाव दे रही है?",
    "इस फसल के लिए कौन सा कीटनाशक सही है?",
    "मौसम भाव को कैसे प्रभावित कर रहा है?",
    "मुझे फसल की कटाई कब करनी चाहिए?",
    "कटाई के बाद भंडारण कैसे करें?",
  ] : [
    "Should I sell now or wait?",
    "Which mandi gives best price?",
    "What pesticide for this crop?",
    "How is weather affecting prices?",
    "When should I harvest?",
    "How to store after harvest?",
  ];

  const buildContext = () => ({
    crop: crop?.name,
    cropInfo: crop
      ? {
          season: crop.season,
          temp: crop.temp,
          harvest: crop.harvest,
          soil: crop.soil,
        }
      : null,
    weather,
    state,
    prices: prices?.slice(0, 10),
    bestMandi,
    languagePreference: language === "hi" ? "Hindi" : "English",
    instruction: `IMPORTANT: Respond ONLY in ${language === "hi" ? "Hindi (Devanagari script)" : "Professional English"}. If the user asks in a different language, switch to that language but prefer ${language === "hi" ? "Hindi" : "English"} by default.`
  });

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const userMsg = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const data = await sendChatMessage({
        messages: newMessages,
        context: buildContext(),
      });

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      } else {
        setError("Could not get a response. Try again.");
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
  };

  /* ✅ FIXED MESSAGE RENDERING */
  const renderMessage = (content) => {
    const lines = content.split("\n").filter(Boolean);

    return (
      <div>
        {lines.map((line, i) => {
          let text = line.trim();

          // Remove markdown bold **
          const wasBold = /\*\*(.*?)\*\*/.test(text);
          text = text.replace(/\*\*(.*?)\*\*/g, "$1");

          // Numbered list
          if (/^\d+\./.test(text)) {
            return (
              <li key={i} className="chat-list-item">
                {text.replace(/^\d+\.\s*/, "")}
              </li>
            );
          }

          // Emoji section headers
          if (/^[⏰📍📈🌦️💡✅⚠️🌾🚜💰📦🔍]/.test(text)) {
            return (
              <div key={i} className="chat-section-header">
                {text}
              </div>
            );
          }

          // Title line
          if (wasBold) {
            return (
              <div key={i} className="chat-title">
                {text}
              </div>
            );
          }

          return (
            <p key={i} className="chat-line">
              {text}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="ai-advisor">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <span className="ai-icon">🤖</span>
          <div>
            <h2 className="ai-title">{t("aiAdvisor", language)}</h2>
            <p className="ai-sub">
              {language === "hi" ? "कुछ भी पूछें" : "Ask anything"} · {formatBilingualText(crop?.name, language, "crop")}
              {state ? ` ${language === "hi" ? "में" : "in"} ${formatBilingualText(state, language, "state")}` : ` · ${t("allIndia", language)}`}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button className="ai-clear-btn" onClick={clearChat}>
            🗑️ {language === "hi" ? "साफ़ करें" : "Clear"}
          </button>
        )}
      </div>

      {/* Context chips */}
      <div className="ai-context">
        {weather && (
          <span className="context-chip">
            🌤️ {weather.temp}°C · {formatBilingualText(weather.city, language, "city")}
          </span>
        )}

        {prices?.length > 0 && (
          <span className="context-chip">📊 {prices.length} {t("mandis", language)}</span>
        )}

        {bestMandi && (
          <span className="context-chip">
            ⭐ ₹{bestMandi.modalPrice} {t("at", language)} {formatBilingualText(bestMandi.mandi, language)}
          </span>
        )}

        <span className="context-chip">
          📅{" "}
          {new Date().toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">🌾</div>

            <p className="chat-welcome-title">
              {language === "hi" ? "नमस्ते! मैं आपकी क्या सहायता कर सकता हूँ?" : "Namaste! How can I help you today?"}
            </p>

            <p className="chat-welcome-sub">
              {language === "hi" 
                ? `${formatBilingualText(crop?.name, language, "crop") || "अपनी फसल"} के बारे में कुछ भी पूछें - भाव, बिक्री का समय, कीटनाशक, कटाई, मौसम का प्रभाव और बहुत कुछ।`
                : `Ask me anything about ${crop?.name || "your crop"} — prices, selling timing, pesticides, harvesting, weather impact, and more.`}
            </p>

            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="suggestion-chip"
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble-wrap ${msg.role}`}>
            {msg.role === "assistant" && (
              <span className="chat-avatar">🤖</span>
            )}

            <div className={`chat-bubble ${msg.role}`}>
              {msg.role === "assistant" ? (
                renderMessage(msg.content)
              ) : (
                <p className="chat-line">{msg.content}</p>
              )}
            </div>

            {msg.role === "user" && (
              <span className="chat-avatar user-avatar">👨‍🌾</span>
            )}
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="chat-bubble-wrap assistant">
            <span className="chat-avatar">🤖</span>
            <div className="chat-bubble assistant chat-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="ai-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      {messages.length > 0 && (
        <div className="ai-disclaimer">
          ⚠️ {language === "hi" 
            ? "एआई-जनित सलाह। हमेशा स्थानीय बाजार विशेषज्ञों के साथ सत्यापन करें।" 
            : "AI-generated advice. Always verify with local market experts."}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder={language === "hi" ? "कुछ भी पूछें..." : "Ask anything..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />

        <button
          className={`chat-send-btn ${loading ? "loading" : ""}`}
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          {loading ? <span className="ai-spinner" /> : "➤"}
        </button>
      </div>
    </div>
  );
}