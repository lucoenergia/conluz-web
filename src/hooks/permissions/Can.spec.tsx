import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Can } from "./Can";
import type { CapabilityOutcome } from "./capabilityOutcome";

function setup(outcome: CapabilityOutcome) {
  render(
    <Can outcome={outcome} fallback={<span>fallback</span>}>
      <span>control</span>
    </Can>,
  );
}

describe("Can", () => {
  it("renders its children when allowed", () => {
    setup({ state: "allowed" });
    expect(screen.getByText("control")).toBeInTheDocument();
  });

  it("renders the fallback when denied", () => {
    setup({ state: "denied" });
    expect(screen.queryByText("control")).not.toBeInTheDocument();
    expect(screen.getByText("fallback")).toBeInTheDocument();
  });

  it("renders the fallback while pending, rather than flashing the control", () => {
    setup({ state: "pending" });
    expect(screen.queryByText("control")).not.toBeInTheDocument();
  });

  // A control whose authorisation could not be established must not appear:
  // offering an action the backend will refuse is worse than offering nothing,
  // and an inline error beside a button is noise. Only whole pages report it.
  it("renders the fallback on error, and no error message of its own", () => {
    setup({ state: "error", error: new Error("boom"), retry: () => {} });
    expect(screen.queryByText("control")).not.toBeInTheDocument();
    expect(screen.getByText("fallback")).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
  });

  it("renders nothing at all when denied without a fallback", () => {
    const { container } = render(
      <Can outcome={{ state: "denied" }}>
        <span>control</span>
      </Can>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
