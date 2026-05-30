// aiConfig.js — Groq-powered "AI Mode" configuration
//
// ── HOW TO ENABLE AI MODE ────────────────────────────────────────
// 1. Create a FREE API key at https://console.groq.com/keys
// 2. Paste it below as GROQ_API_KEY (between the quotes), OR leave it
//    blank and enter it in the "API key settings" panel on the site
//    (that key is stored only in the visitor's own browser).
//
// ⚠ SECURITY NOTE: a key placed in this file ships in the page source
// and is visible to anyone. Only ever put a FREE / disposable Groq key
// here — never a paid key. AI Mode automatically LOCKS itself when the
// free quota is exhausted (HTTP 429), so visitors see a tidy "come back
// later" message instead of raw errors.
export const GROQ_API_KEY = "";

// Fast, free-tier-friendly model. Swap for another Groq model id if you like.
export const GROQ_MODEL = "llama-3.1-8b-instant";

// OpenAI-compatible Groq chat-completions endpoint.
export const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
