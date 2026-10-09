import { describe, it, expect } from "vitest";
import { fmt, fmtShort, parseTime, toISODate, fromISODate, dueAt, formatTime, dayLabel, isValidEmail, parseEmails, isValidRecipients, formatDate } from "@shared/time.js";
import { subjectFor } from "@shared/report.js";

describe("date formats", () => {
  const d = new Date(2026, 9, 9);
  it("formats each style, defaulting to long", () => {
    expect(formatDate(d)).toBe("October 9, 2026");
    expect(formatDate(d, "weekday")).toBe("Friday, October 9, 2026");
    expect(formatDate(d, "short")).toBe("Oct 9, 2026");
    expect(formatDate(d, "mdy")).toBe("10/09/2026");
    expect(formatDate(d, "dmy")).toBe("09/10/2026");
    expect(formatDate(d, "iso")).toBe("2026-10-09");
    expect(formatDate(d, "bogus")).toBe("October 9, 2026");
  });
  it("applies the format to the subject", () => {
    expect(subjectFor("Daily Digest - {date}", d, "iso")).toBe("Daily Digest - 2026-10-09");
  });
});

describe("time helpers", () => {
  it("formats dates", () => {
    expect(fmt(new Date(2026, 9, 8))).toBe("October 8, 2026");
    expect(fmtShort(new Date(2026, 9, 8))).toBe("Oct 8");
  });
  it("parses times and rejects garbage", () => {
    expect(parseTime("5:00 PM")).toEqual({ h: 17, m: 0 });
    expect(parseTime("12:15 AM")).toEqual({ h: 0, m: 15 });
    expect(parseTime("12:15 PM")).toEqual({ h: 12, m: 15 });
    expect(parseTime("17:00")).toBeNull();
    expect(parseTime("13:00 PM")).toBeNull();
    expect(parseTime("5:75 PM")).toBeNull();
    expect(parseTime(undefined)).toBeNull();
  });
  it("round-trips ISO dates in local time", () => {
    const d = new Date(2026, 9, 8);
    expect(toISODate(d)).toBe("2026-10-08");
    expect(fromISODate("2026-10-08").getTime()).toBe(d.getTime());
  });
  it("computes due time or null", () => {
    const due = dueAt("2026-10-08", "5:00 PM");
    expect([due.getFullYear(), due.getMonth(), due.getDate(), due.getHours(), due.getMinutes()]).toEqual([2026, 9, 8, 17, 0]);
    expect(dueAt("2026-10-08", "nope")).toBeNull();
  });
  it("formats clock time", () => {
    expect(formatTime(new Date(2026, 9, 8, 16, 36))).toBe("4:36 PM");
    expect(formatTime(new Date(2026, 9, 8, 0, 5))).toBe("12:05 AM");
    expect(formatTime(new Date(2026, 9, 8, 12, 0))).toBe("12:00 PM");
  });
  it("labels days", () => {
    const today = new Date(2026, 9, 8, 15, 0);
    expect(dayLabel(new Date(2026, 9, 8), today)).toBe("Today");
    expect(dayLabel(new Date(2026, 9, 9), today)).toBe("Tomorrow");
    expect(dayLabel(new Date(2026, 9, 12), today)).toBe("Oct 12");
  });
  it("validates emails", () => {
    expect(isValidEmail("manager@company.com")).toBe(true);
    expect(isValidEmail("manager@company")).toBe(false);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });
  it("accepts one or more recipients separated by commas, semicolons or spaces", () => {
    expect(parseEmails(" a@x.com, b@y.org;c@z.net  ")).toEqual(["a@x.com", "b@y.org", "c@z.net"]);
    expect(isValidRecipients("a@x.com")).toBe(true);
    expect(isValidRecipients("a@x.com, b@y.org")).toBe(true);
    expect(isValidRecipients("a@x.com, nope")).toBe(false);
    expect(isValidRecipients(" , ")).toBe(false);
  });
});
