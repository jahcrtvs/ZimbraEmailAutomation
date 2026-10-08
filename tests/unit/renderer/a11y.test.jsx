// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal, Button } from "../../../src/renderer/src/ds/index.js";

function Harness() {
  const [open, setOpen] = React.useState(false);
  return (<>
    <button onClick={() => setOpen(true)}>opener</button>
    <Modal open={open} title="Hello" onClose={() => setOpen(false)} footer={<><Button>One</Button><Button>Two</Button></>}>body</Modal>
  </>);
}

describe("Modal accessibility", () => {
  it("is a labelled modal dialog", () => {
    render(<Harness />); fireEvent.click(screen.getByText("opener"));
    const d = screen.getByRole("dialog");
    expect(d).toHaveAttribute("aria-modal", "true");
    expect(d).toHaveAccessibleName("Hello");
  });
  it("focuses inside on open, traps Tab, restores focus on close", () => {
    render(<Harness />);
    const opener = screen.getByText("opener"); opener.focus(); fireEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    const focusables = dialog.querySelectorAll("button");
    focusables[focusables.length - 1].focus();
    fireEvent.keyDown(document.activeElement, { key: "Tab" });
    expect(document.activeElement).toBe(focusables[0]);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(opener);
  });
});
