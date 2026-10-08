import { describe, it, expect } from "vitest";
import { itemFromDisk, itemToDisk, historyFromDisk, historyToDisk } from "../../../src/renderer/src/persist.js";

const blocks = [{ type: "section", title: "TASK TODAY", items: ["A."] }];

describe("persist mapping", () => {
  it("round-trips a schedule item", () => {
    const disk = { id: "1", date: "2026-10-08", time: "5:00 PM", recipient: "m@c.com", subject: "S", status: "scheduled", blocks, createdAt: "2026-10-08T10:00:00.000Z" };
    const r = itemFromDisk(disk);
    expect(r.date).toEqual(new Date(2026, 9, 8));
    expect(r.to).toBe("m@c.com");
    expect(itemToDisk(r)).toEqual(disk);
  });
  it("round-trips a history entry and derives dateLabel", () => {
    const disk = { id: "h1", date: "2026-10-07", time: "5:02 PM", recipient: "m@c.com", status: "sent", notes: { work: "x" }, blocks };
    const r = historyFromDisk(disk);
    expect(r.dateLabel).toBe("October 7, 2026");
    expect(historyToDisk(r)).toEqual(disk);
  });
  it("itemToDisk stamps createdAt when missing", () => {
    expect(itemToDisk({ id: "1", date: new Date(2026, 9, 8), time: "5:00 PM", to: "a@b.co", subject: "S", status: "scheduled", blocks }).createdAt).toMatch(/^\d{4}-/);
  });
});
