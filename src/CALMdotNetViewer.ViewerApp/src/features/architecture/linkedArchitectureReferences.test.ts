import { describe, expect, it } from "vitest";
import {
  resolvePrimaryLinkedArchitecture,
  resolveSelectedNodeLinkedArchitectures
} from "./linkedArchitectureReferences";

describe("resolveSelectedNodeLinkedArchitectures", () => {
  it("maps selected node detailed architecture references to resolved linked architectures", () => {
    const linkedArchitectures = resolveSelectedNodeLinkedArchitectures(
      {
        "unique-id": "payments-api",
        details: {
          "detailed-architecture": {
            reference: "https://specs.internal/payment-service"
          }
        }
      },
      [
        {
          reference: "https://specs.internal/payment-service",
          resolvedId: "payment-service-details",
          label: "payment service",
          resolutionStatus: "resolved"
        }
      ]
    );

    expect(linkedArchitectures).toEqual([
      {
        reference: "https://specs.internal/payment-service",
        resolvedId: "payment-service-details",
        label: "payment service",
        resolutionStatus: "resolved"
      }
    ]);
  });

  it("returns an empty list when the selected node has no linked architecture references", () => {
    expect(resolveSelectedNodeLinkedArchitectures(
      {
        "unique-id": "payments-db",
        name: "Payments DB"
      },
      []
    )).toEqual([]);
  });

  it("returns the first resolved linked architecture for diagram navigation", () => {
    expect(resolvePrimaryLinkedArchitecture(
      {
        "unique-id": "payments-api",
        details: {
          "detailed-architecture": {
            reference: "https://specs.internal/payment-service"
          }
        }
      },
      [
        {
          reference: "https://specs.internal/payment-service",
          resolvedId: "payment-service-details",
          label: "payment service",
          resolutionStatus: "resolved"
        }
      ]
    )).toEqual({
      reference: "https://specs.internal/payment-service",
      resolvedId: "payment-service-details",
      label: "payment service",
      resolutionStatus: "resolved"
    });
  });
});
