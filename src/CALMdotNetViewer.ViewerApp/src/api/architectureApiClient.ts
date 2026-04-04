import type {
  ArchitectureDocument,
  ArchitectureSummary,
  ValidationResult
} from "../features/architecture/types";

export class ArchitectureApiClient {
  async getArchitectures(): Promise<ArchitectureSummary[]> {
    const response = await fetch("/api/architectures");
    if (!response.ok) {
      throw new Error(`Failed to load architectures: ${response.status}`);
    }

    return response.json();
  }

  async getArchitecture(id: string): Promise<ArchitectureDocument> {
    const response = await fetch(`/api/architectures/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to load architecture '${id}': ${response.status}`);
    }

    return response.json();
  }

  async validateArchitecture(content: string, fileName = "uploaded-architecture.json"): Promise<ValidationResult> {
    const response = await fetch("/api/architectures/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName,
        content,
        contentType: "application/json"
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to validate architecture: ${response.status}`);
    }

    return response.json();
  }
}

export const architectureApiClient = new ArchitectureApiClient();
