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

  async refreshArchitectures(): Promise<ArchitectureSummary[]> {
    const response = await fetch("/api/architectures/refresh", {
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`Failed to refresh architectures: ${response.status}`);
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

  async getLinkedArchitecture(parentId: string, linkedId: string): Promise<ArchitectureDocument> {
    const response = await fetch(`/api/architectures/${parentId}/linked/${linkedId}`);
    if (!response.ok) {
      throw new Error(`Failed to load linked architecture '${linkedId}' from '${parentId}': ${response.status}`);
    }

    return response.json();
  }

  async createArchitecture(
    fileName: string,
    content: string,
    contentType = "application/json"
  ): Promise<ArchitectureDocument> {
    const response = await fetch("/api/architectures", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName,
        content,
        contentType
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create architecture: ${response.status} ${errorText}`);
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
