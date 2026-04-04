namespace CALMdotNetViewer.Web.Contracts;

public sealed record UploadArchitectureRequest(
    string FileName,
    string Content,
    string ContentType = "application/json");

public sealed record ValidateArchitectureRequest(
    string Content,
    string? FileName = null,
    string ContentType = "application/json");

public sealed record ArchitectureReferenceResponse(
    string Reference,
    string? ResolvedId,
    string Label,
    string ResolutionStatus);

public sealed record ArchitectureMetadataResponse(
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ArchitectureResponse(
    string Id,
    string Title,
    string Content,
    string Format,
    string? Schema,
    IReadOnlyList<ArchitectureReferenceResponse> LinkedArchitectures,
    ArchitectureMetadataResponse Metadata);

public sealed record ArchitectureSummaryResponse(
    string Id,
    string Title,
    string? Schema,
    DateTimeOffset UpdatedAt);

public sealed record ValidationIssueResponse(
    string Severity,
    string Code,
    string Message,
    string? Path = null,
    int? LineStart = null,
    int? LineEnd = null);

public sealed record ValidationResponse(
    bool IsValid,
    IReadOnlyList<ValidationIssueResponse> Errors,
    IReadOnlyList<ValidationIssueResponse> Warnings);
