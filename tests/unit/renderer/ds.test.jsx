// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as DS from "../../../src/renderer/src/ds/index.js";

const ICONS = "square-pen clock history layout-template settings copy pencil refresh-cw send check external-link lock mail loader-circle circle arrow-left chevron-down chevron-up chevron-left chevron-right calendar x info circle-alert circle-check triangle-alert ban".split(" ");

describe("design system port", () => {
  it("exports every component", () => {
    for (const n of "Button IconButton Icon Kbd Tooltip Badge StatusBadge Tag Banner ConfirmDialog EmptyState Modal Toast Checkbox DatePicker Field Input RadioCard Select Switch Textarea TimePicker Card NotchCard AppSidebar ConnectionStatus".split(" ")) {
      expect(DS[n], n).toBeTypeOf("function");
    }
  });
  it("renders every Lucide icon name the handoff uses", () => {
    for (const name of ICONS) {
      const { container } = render(<DS.Icon name={name} />);
      expect(container.querySelector("svg"), name).not.toBeNull();
    }
  });
  it("renders nothing for an unknown icon", () => {
    const { container } = render(<DS.Icon name="not-a-real-icon" />);
    expect(container.querySelector("svg")).toBeNull();
  });
  it("Button shows the disabled and loading states", () => {
    const { getByRole, rerender } = render(<DS.Button disabled>Go</DS.Button>);
    expect(getByRole("button")).toBeDisabled();
    rerender(<DS.Button loading>Go</DS.Button>);
    expect(getByRole("button")).toBeDisabled();
  });
});