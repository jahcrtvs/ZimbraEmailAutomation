export const DEFAULT_LOCAL = { baseUrl: "http://localhost:11434/v1", model: "qwen2.5:3b-instruct" };
export const CLOUD_PROVIDERS = ["groq", "gemini"];
export const PROVIDER_NAMES = { groq: "Groq", gemini: "Gemini" };

// Ollama's hosted models are named "...-cloud" or "...:cloud" and run on Ollama's servers.
export const isCloudModel = name => /[-:]cloud$/i.test(String(name || "").trim());

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
export function isLoopbackUrl(u) {
  try { return LOOPBACK.has(new URL(u).hostname.toLowerCase()); } catch { return false; }
}

export const pullCommand = model => `ollama pull ${String(model || "").trim()}`;
