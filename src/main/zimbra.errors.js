export class ZimbraError extends Error {
  constructor(code, message) { super(message); this.name = "ZimbraError"; this.code = code; }
}
