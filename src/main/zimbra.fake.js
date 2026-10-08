import fs from "node:fs";
import path from "node:path";

// Test double used when DD_TEST=1: records prepared messages instead of driving Chrome.
export function createFakeZimbra(dir) {
  const file = path.join(dir, "prepared.json");
  return {
    async checkSession() { return "connected"; },
    async openPage() {},
    async prepareMessage(msg, onStep = () => {}) {
      onStep(1); onStep(2);
      const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
      fs.writeFileSync(file, JSON.stringify([...all, msg]));
      onStep(3);
    }
  };
}
