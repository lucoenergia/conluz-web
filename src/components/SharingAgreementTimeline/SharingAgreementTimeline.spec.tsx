import "@testing-library/jest-dom";
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { SharingAgreementTimeline } from "./SharingAgreementTimeline";
import { SharingAgreementResponseStatus } from "../../api/models";
import type { SharingAgreementResponse } from "../../api/models";

function renderTimeline(agreements: SharingAgreementResponse[]) {
  return render(
    <MemoryRouter>
      <SharingAgreementTimeline plantId="plant-1" agreements={agreements} />
    </MemoryRouter>,
  );
}

const agreements: SharingAgreementResponse[] = [
  { id: "a1", name: "Reparto 2026 H2", status: SharingAgreementResponseStatus.DRAFT },
  { id: "a2", name: "Reparto 2025-2026", status: SharingAgreementResponseStatus.PUBLISHED },
  { id: "a3", name: "Recálculo enero 2024", status: SharingAgreementResponseStatus.SUPERSEDED },
];

describe("SharingAgreementTimeline", () => {
  test("renders one rail dot per agreement, in order", () => {
    const { container } = renderTimeline(agreements);

    const dots = container.querySelectorAll('[data-testid="sharing-agreement-timeline-dot"]');
    expect(dots).toHaveLength(3);
  });

  test("renders a connector between every pair of rows but not after the last one", () => {
    const { container } = renderTimeline(agreements);

    const connectors = container.querySelectorAll('[data-testid="sharing-agreement-timeline-connector"]');
    expect(connectors).toHaveLength(agreements.length - 1);
  });

  test("renders every agreement's card through the timeline wrapper", () => {
    renderTimeline(agreements);

    agreements.forEach((agreement) => {
      expect(screen.getByText(agreement.name as string)).toBeInTheDocument();
    });
  });

  test("a single-agreement list renders one dot and no connector", () => {
    const { container } = renderTimeline([agreements[0]]);

    expect(container.querySelectorAll('[data-testid="sharing-agreement-timeline-dot"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="sharing-agreement-timeline-connector"]')).toHaveLength(0);
  });

  test("renders nothing when there are no agreements", () => {
    const { container } = renderTimeline([]);

    expect(container.querySelectorAll('[data-testid="sharing-agreement-timeline-dot"]')).toHaveLength(0);
  });
});
