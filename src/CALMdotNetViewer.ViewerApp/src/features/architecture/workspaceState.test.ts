import { describe, expect, it } from "vitest";
import {
  formatValidationError,
  formatValidationNotice,
  selectInitialArchitectureId
} from "./workspaceState";

describe("workspaceState", () => {
  it("prefers the default sample architecture when it is available", () => {
    const selectedId = selectInitialArchitectureId([
      { id: "customer-onboarding", title: "Customer Onboarding", schema: null, updatedAt: "2026-04-04T00:00:00Z" },
      { id: "payments-architecture", title: "Payments Architecture", schema: null, updatedAt: "2026-04-04T01:00:00Z" }
    ]);

    expect(selectedId).toBe("payments-architecture");
  });

  it("falls back to the first available architecture when the preferred id is missing", () => {
    const selectedId = selectInitialArchitectureId([
      { id: "customer-onboarding", title: "Customer Onboarding", schema: null, updatedAt: "2026-04-04T00:00:00Z" }
    ]);

    expect(selectedId).toBe("customer-onboarding");
  });

  it("formats validation failures into a user-facing error message", () => {
    const message = formatValidationError({
      isValid: false,
      errors: [
        { severity: "error", code: "invalid-json", message: "Unexpected token } in JSON at position 42" },
        { severity: "error", code: "missing-required", message: "Missing nodes array" }
      ],
      warnings: []
    });

    expect(message).toBe(
      "The selected file is not a valid CALM JSON document: Unexpected token } in JSON at position 42 (+1 more)"
    );
  });

  it("formats validation warnings into a user-facing notice", () => {
    const message = formatValidationNotice({
      isValid: true,
      errors: [],
      warnings: [
        {
          severity: "warning",
          code: "missing-nodes",
          message: "The document does not include a top-level 'nodes' collection."
        }
      ]
    });

    expect(message).toBe(
      "Uploaded with 1 warning(s): The document does not include a top-level 'nodes' collection."
    );
  });
});
