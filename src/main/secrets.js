import fs from "node:fs";
import path from "node:path";

export function createSecrets(dir, safeStorage) {
  const file = path.join(dir, "gemini.key");
  fs.mkdirSync(dir, { recursive: true });
  return {
    setKey(key) {
      const k = String(key || "").trim();
      if (!k) return;
      if (!safeStorage.isEncryptionAvailable()) throw new Error("OS encryption is not available; cannot store the API key.");
      fs.writeFileSync(file, safeStorage.encryptString(k));
    },
    getKey() {
      try { return safeStorage.decryptString(fs.readFileSync(file)); } catch { return null; }
    },
    hasKey() { return this.getKey() !== null; },
    clearKey() { try { fs.rmSync(file); } catch { /* none */ } }
  };
}
