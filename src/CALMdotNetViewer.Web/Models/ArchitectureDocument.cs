namespace CALMdotNetViewer.Web.Models;

public sealed record ArchitectureDocument(
    string Id,
    string Title,
    string Content,
    string Format,
    string? Schema,
    IReadOnlyList<ArchitectureReference> LinkedArchitectures,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ArchitectureReference(
    string Reference,
    string? ResolvedId,
    string Label,
    string ResolutionStatus);

public sealed record ValidationIssue(
    string Severity,
    string Code,
    string Message,
    string? Path = null,
    int? LineStart = null,
    int? LineEnd = null);

public sealed record ValidationResult(
    bool IsValid,
    IReadOnlyList<ValidationIssue> Errors,
    IReadOnlyList<ValidationIssue> Warnings);
