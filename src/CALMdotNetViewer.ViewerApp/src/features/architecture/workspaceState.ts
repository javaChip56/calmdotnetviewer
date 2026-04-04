import type { ArchitectureSummary, ValidationResult } from "./types";

export function selectInitialArchitectureId(
  summaries: ArchitectureSummary[],
  preferredId = "payments-architecture"
): string | null {
  if (summaries.length === 0) {
    return null;
  }

  return summaries.find((summary) => summary.id === preferredId)?.id ?? summaries[0].id;
}

export function formatValidationError(result: ValidationResult): string | null {
  if (result.isValid || result.errors.length === 0) {
    return null;
  }

  const [firstError] = result.errors;
  const additionalCount = result.errors.length - 1;
  const suffix = additionalCount > 0 ? ` (+${additionalCount} more)` : "";
  return `The selected file is not a valid CALM JSON document: ${firstError.message}${suffix}`;
}

export function formatValidationNotice(result: ValidationResult): string | null {
  if (!result.isValid || result.warnings.length === 0) {
    return null;
  }

  const [firstWarning] = result.warnings;
  const additionalCount = result.warnings.length - 1;
  const suffix = additionalCount > 0 ? ` (+${additionalCount} more)` : "";
  return `Uploaded with ${result.warnings.length} warning(s): ${firstWarning.message}${suffix}`;
}
