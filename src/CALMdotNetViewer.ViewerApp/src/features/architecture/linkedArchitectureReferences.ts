import type { ArchitectureReference } from "./types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractReferencesRecursive(value: unknown, references: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      extractReferencesRecursive(item, references);
    }

    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "detailed-architecture") {
      if (typeof nestedValue === "string" && nestedValue.trim().length > 0) {
        references.push(nestedValue);
      } else if (isRecord(nestedValue) && typeof nestedValue.reference === "string" && nestedValue.reference.trim().length > 0) {
        references.push(nestedValue.reference);
      }
    }

    extractReferencesRecursive(nestedValue, references);
  }
}

export function resolveSelectedNodeLinkedArchitectures(
  selectedNodeRaw: unknown,
  linkedArchitectures: ArchitectureReference[]
): ArchitectureReference[] {
  const references: string[] = [];
  extractReferencesRecursive(selectedNodeRaw, references);

  const uniqueReferences = [...new Set(references)];
  return uniqueReferences
    .map((reference) => linkedArchitectures.find((linkedArchitecture) => linkedArchitecture.reference === reference) ?? null)
    .filter((reference): reference is ArchitectureReference => reference !== null);
}
