import { describe, expect, it } from "vitest";
import {
  architectureRoute,
  currentDocumentFocusRoute,
  linkedArchitectureRoute,
  parseAppRoute
} from "./appRoutes";

describe("appRoutes", () => {
  it("builds a root architecture route with focus state", () => {
    expect(architectureRoute("payments-architecture", "payments-api"))
      .toBe("/architectures/payments-architecture?focus=payments-api");
  });

  it("builds a root architecture preview route", () => {
    expect(architectureRoute("payments-architecture", "payments-api", "preview", "architecture"))
      .toBe("/architectures/payments-architecture?focus=payments-api&view=preview&pane=architecture");
  });

  it("builds a linked architecture route with focus state", () => {
    expect(linkedArchitectureRoute("payments-architecture", "payment-service-details", "fraud-check"))
      .toBe("/architectures/payments-architecture/linked/payment-service-details?focus=fraud-check");
  });

  it("builds a focus route for the currently opened linked document", () => {
    expect(currentDocumentFocusRoute("payment-service-details", "fraud-check", "payments-architecture"))
      .toBe("/architectures/payments-architecture/linked/payment-service-details?focus=fraud-check");
  });

  it("builds a preview route for the currently opened linked document", () => {
    expect(currentDocumentFocusRoute(
      "payment-service-details",
      "fraud-check",
      "payments-architecture",
      "preview",
      "interface"
    )).toBe("/architectures/payments-architecture/linked/payment-service-details?focus=fraud-check&view=preview&pane=interface");
  });

  it("parses a root architecture route", () => {
    expect(parseAppRoute("/architectures/payments-architecture", "?focus=payments-api")).toEqual({
      kind: "architecture",
      architectureId: "payments-architecture",
      focus: "payments-api",
      view: "workspace",
      previewPane: null
    });
  });

  it("parses a root architecture preview route", () => {
    expect(parseAppRoute("/architectures/payments-architecture", "?focus=payments-api&view=preview&pane=flow")).toEqual({
      kind: "architecture",
      architectureId: "payments-architecture",
      focus: "payments-api",
      view: "preview",
      previewPane: "flow"
    });
  });

  it("parses a linked architecture route", () => {
    expect(parseAppRoute("/architectures/payments-architecture/linked/payment-service-details", "?focus=fraud-check"))
      .toEqual({
        kind: "linked",
        parentArchitectureId: "payments-architecture",
        architectureId: "payment-service-details",
        focus: "fraud-check",
        view: "workspace",
        previewPane: null
      });
  });

  it("returns null for unrelated paths", () => {
    expect(parseAppRoute("/", "")).toBeNull();
  });
});
