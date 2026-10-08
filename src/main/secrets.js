import fs from "node:fs";
import path from "node:path";

export const PROVIDERS = ["gemini", "groq"];

export function createSecrets(dir, safeStorage) {
  fs.mkdirSync(dir, { recursive: true });
  const fileFor = provider => {
    if (!PROVIDERS.includes(provider)) throw new Error("Unknown provider.");
    return path.join(dir, provider + ".key");
  };
  return {
    setKey(key, provider = "gemini") {
      const file = fileFor(provider);
      const k = String(key || "").trim();
      if (!k) return;
      if (!safeStorage.isEncryptionAvailable()) throw new Error("OS encryption is not available; cannot store the API key.");
      fs.writeFileSync(file, safeStorage.encryptString(k));
    },
    getKey(provider = "gemini") {
      const file = fileFor(provider);
      try { return safeStorage.decryptString(fs.readFileSync(file)); } catch { return null; }
    },
    hasKey(provider = "gemini") { return this.getKey(provider) !== null; },
    clearKey(provider = "gemini") { try { fs.rmSync(fileFor(provider)); } catch { /* none */ } }
  };
}
