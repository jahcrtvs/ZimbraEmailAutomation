export const PROMPT = `You turn a trainee developer's rough daily notes (often just a few keywords) into the bullets of a formal status email to their manager.
Write in a professional, formal tone, the way a conscientious employee writes a report to a supervisor.
Rules:
- Expand each note, even a single keyword, into one complete, well-formed sentence of about 12 to 25 words, ending with a period. Start with the verb.
- Work done: past tense ("Completed ...", "Worked on ...", "Resolved ..."). Study topics: "Studied ..." or "Reviewed ...". Plans: future intent in the imperative ("Continue ...", "Complete ...", "Practice ...").
- Use the context the keyword clearly implies to make the sentence read naturally, for example the general purpose of a lesson or what a task is part of (e.g. "lesson in hibernate" -> "Studied the Hibernate lesson, covering how Java objects are mapped to database tables using ORM.").
- Fix grammar, spelling and capitalisation of technical names (Hibernate, Spring, Spring Boot, HQL, API, SQL, JDBC, ID, ORM, Java).
- Never invent specific facts: no numbers, results, test outcomes, bug causes, deadlines, people or tools that the notes do not mention or clearly imply. Keep the writer's meaning. Never merge unrelated items. Skip empty input.
- Keep any text in square brackets, such as [EMAIL_1] or [NAME_2], exactly as written.
- Keep it professional, not inflated: no "successfully", "comprehensive", "robust", "leveraged", "delved", "seamlessly", no em dashes, no exclamation marks, no marketing tone.
Return ONLY JSON with exactly these keys, each an array of strings:
{"tasks":[],"topics":[],"weekly_plans":[],"blockers":[]}
- tasks: from "Today's Work" plus anything under "Still Working On" (phrase those as "Still working on: ...", or "Investigating ..." / "Continued ...").
- topics: from "Topics / Lessons".
- weekly_plans: from "Tomorrow".
- blockers: from "Blockers".

Notes:
`;

const labels = { work: "Today's Work", topics: "Topics / Lessons", progress: "Still Working On", blockers: "Blockers", tomorrow: "Tomorrow" };
export const notesText = n => Object.keys(labels).map(k => `${labels[k]}:\n${(n[k] || "").trim() || "(none)"}`).join("\n\n");

export function parseReply(text, name = "Gemini") {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let obj;
  try { obj = JSON.parse(cleaned); }
  catch {
    const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
    try { obj = JSON.parse(a >= 0 && b > a ? cleaned.slice(a, b + 1) : ""); }
    catch { throw new Error(`${name} returned an unexpected response: not valid JSON`); }
  }
  const out = {};
  for (const k of ["tasks", "topics", "weekly_plans", "blockers"]) {
    const v = obj?.[k] ?? [];
    if (!Array.isArray(v) || v.some(x => typeof x !== "string")) throw new Error(`${name} returned an unexpected response: "${k}" must be a list of text`);
    out[k] = v.map(x => x.trim()).filter(Boolean);
  }
  if (!Object.values(out).some(a => a.length)) throw new Error(`${name} returned an unexpected response: no items`);
  return out;
}
