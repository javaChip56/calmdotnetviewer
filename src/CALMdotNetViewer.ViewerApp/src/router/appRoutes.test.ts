import { describe, expect, it } from "vitest";
import {
  architectureRoute,
  linkedArchitectureRoute,
  parseAppRoute
} from "./appRoutes";

describe("appRoutes", () => {
  it("builds a root architecture route with focus state", () => {
    expect(architectureRoute("payments-architecture", "payments-api"))
      .toBe("/architectures/payments-architecture?focus=payments-api");
  });

  it("builds a linked architecture route with focus state", () => {
    expect(linkedArchitectureRoute("payments-architecture", "payment-service-details", "fraud-check"))
      .toBe("/architectures/payments-architecture/linked/payment-service-details?focus=fraud-check");
  });

  it("parses a root architecture route", () => {
    expect(parseAppRoute("/architectures/payments-architecture", "?focus=payments-api")).toEqual({
      kind: "architecture",
      architectureId: "payments-architecture",
      focus: "payments-api"
    });
  });

  it("parses a linked architecture route", () => {
    expect(parseAppRoute("/architectures/payments-architecture/linked/payment-service-details", "?focus=fraud-check"))
      .toEqual({
        kind: "linked",
        parentArchitectureId: "payments-architecture",
        architectureId: "payment-service-details",
        focus: "fraud-check"
      });
  });

  it("returns null for unrelated paths", () => {
    expect(parseAppRoute("/", "")).toBeNull();
  });
});
