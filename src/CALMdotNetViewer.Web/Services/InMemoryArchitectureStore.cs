using System.Text;
using System.Text.Json;
using CALMdotNetViewer.Web.Contracts;
using CALMdotNetViewer.Web.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace CALMdotNetViewer.Web.Services;

public sealed class InMemoryArchitectureStore : IArchitectureStore
{
    private readonly Dictionary<string, ArchitectureDocument> documents = new(StringComparer.OrdinalIgnoreCase);
    private readonly object gate = new();

    private readonly string sampleDataPath;

    public InMemoryArchitectureStore(
        IHostEnvironment hostEnvironment,
        IOptions<ArchitectureSourceOptions> architectureSourceOptions)
    {
        sampleDataPath = ResolveFolderPath(
            hostEnvironment.ContentRootPath,
            architectureSourceOptions.Value.FolderPath);
        SeedDocuments();
    }

    public Task<ArchitectureDocument?> GetAsync(string id, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (gate)
        {
            documents.TryGetValue(id, out var document);
            return Task.FromResult(document);
        }
    }

    public Task<IReadOnlyList<ArchitectureSummaryResponse>> GetSummariesAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (gate)
        {
            var summaries = documents.Values
                .OrderByDescending(x => x.UpdatedAt)
                .Select(x => new ArchitectureSummaryResponse(x.Id, x.Title, x.Schema, x.UpdatedAt))
                .ToList();

            return Task.FromResult<IReadOnlyList<ArchitectureSummaryResponse>>(summaries);
        }
    }

    public Task<ArchitectureDocument> CreateAsync(UploadArchitectureRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var validation = ValidateContent(request.Content);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException("The uploaded architecture document is not valid JSON.");
        }

        var document = BuildDocument(
            CreateStableId(request.FileName, request.Content),
            request.FileName,
            request.Content,
            DateTimeOffset.UtcNow);

        lock (gate)
        {
            documents[document.Id] = document;
        }

        return Task.FromResult(document);
    }

    public Task<IReadOnlyList<ArchitectureReference>> GetLinkedAsync(string id, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (gate)
        {
            if (!documents.TryGetValue(id, out var document))
            {
                return Task.FromResult<IReadOnlyList<ArchitectureReference>>(Array.Empty<ArchitectureReference>());
            }

            return Task.FromResult(document.LinkedArchitectures);
        }
    }

    public Task<ArchitectureDocument?> GetLinkedAsync(string id, string linkedId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (gate)
        {
            if (!documents.TryGetValue(id, out var parent))
            {
                return Task.FromResult<ArchitectureDocument?>(null);
            }

            var link = parent.LinkedArchitectures.FirstOrDefault(x =>
                string.Equals(x.ResolvedId, linkedId, StringComparison.OrdinalIgnoreCase));

            if (link is null)
            {
                return Task.FromResult<ArchitectureDocument?>(null);
            }

            documents.TryGetValue(linkedId, out var linked);
            return Task.FromResult(linked);
        }
    }

    public Task<ValidationResult> ValidateAsync(ValidateArchitectureRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(ValidateContent(request.Content));
    }

    private ValidationResult ValidateContent(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return new ValidationResult(
                false,
                new[]
                {
                    new ValidationIssue("error", "empty-content", "The architecture document is empty.")
                },
                Array.Empty<ValidationIssue>());
        }

        try
        {
            using var document = JsonDocument.Parse(content);
            var root = document.RootElement;
            var warnings = new List<ValidationIssue>();

            if (!root.TryGetProperty("nodes", out _))
            {
                warnings.Add(new ValidationIssue(
                    "warning",
                    "missing-nodes",
                    "The document does not include a top-level 'nodes' collection."));
            }

            return new ValidationResult(true, Array.Empty<ValidationIssue>(), warnings);
        }
        catch (JsonException ex)
        {
            return new ValidationResult(
                false,
                new[]
                {
                    new ValidationIssue(
                        "error",
                        "invalid-json",
                        ex.Message,
                        LineStart: (int?)ex.LineNumber,
                        LineEnd: (int?)ex.LineNumber)
                },
                Array.Empty<ValidationIssue>());
        }
    }

    private ArchitectureDocument BuildDocument(string id, string fileName, string content, DateTimeOffset timestamp)
    {
        using var json = JsonDocument.Parse(content);
        var root = json.RootElement;
        var schema = root.TryGetProperty("$schema", out var schemaElement) && schemaElement.ValueKind == JsonValueKind.String
            ? schemaElement.GetString()
            : null;

        var references = ExtractReferences(root)
            .Select(reference => new ArchitectureReference(
                reference,
                ResolveSeededReference(reference),
                BuildReferenceLabel(reference),
                ResolveSeededReference(reference) is null ? "unresolved" : "resolved"))
            .ToList();

        return new ArchitectureDocument(
            id,
            ExtractTitle(root, fileName),
            content,
            "json",
            schema,
            references,
            timestamp,
            timestamp);
    }

    private static string ExtractTitle(JsonElement root, string fileName)
    {
        if (root.TryGetProperty("metadata", out var metadata) &&
            metadata.ValueKind == JsonValueKind.Object &&
            metadata.TryGetProperty("title", out var title) &&
            title.ValueKind == JsonValueKind.String)
        {
            return title.GetString() ?? Path.GetFileNameWithoutExtension(fileName);
        }

        if (root.TryGetProperty("name", out var name) && name.ValueKind == JsonValueKind.String)
        {
            return name.GetString() ?? Path.GetFileNameWithoutExtension(fileName);
        }

        return Path.GetFileNameWithoutExtension(fileName);
    }

    private static List<string> ExtractReferences(JsonElement element)
    {
        var references = new List<string>();
        ExtractReferencesRecursive(element, references);
        return references.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static void ExtractReferencesRecursive(JsonElement element, List<string> references)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    if (property.NameEquals("detailed-architecture"))
                    {
                        if (property.Value.ValueKind == JsonValueKind.String)
                        {
                            var directReference = property.Value.GetString();
                            if (!string.IsNullOrWhiteSpace(directReference))
                            {
                                references.Add(directReference);
                            }
                        }
                        else if (property.Value.ValueKind == JsonValueKind.Object &&
                                 property.Value.TryGetProperty("reference", out var nestedReference) &&
                                 nestedReference.ValueKind == JsonValueKind.String)
                        {
                            var reference = nestedReference.GetString();
                            if (!string.IsNullOrWhiteSpace(reference))
                            {
                                references.Add(reference);
                            }
                        }
                    }

                    ExtractReferencesRecursive(property.Value, references);
                }
                break;
            case JsonValueKind.Array:
                foreach (var child in element.EnumerateArray())
                {
                    ExtractReferencesRecursive(child, references);
                }
                break;
        }
    }

    private static string BuildReferenceLabel(string reference)
    {
        if (reference.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return new Uri(reference).Segments.Last().Trim('/').Replace('-', ' ');
        }

        return reference.Replace('-', ' ').Replace('_', ' ');
    }

    private static string? ResolveSeededReference(string reference) =>
        reference switch
        {
            "https://specs.internal/payment-service" => "payment-service-details",
            _ => null
        };

    private static string CreateStableId(string fileName, string content)
    {
        var baseName = Path.GetFileNameWithoutExtension(fileName).ToLowerInvariant();
        var slug = new string(baseName.Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray()).Trim('-');
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "architecture";
        }

        var seed = $"{fileName}:{content.Length}:{DateTimeOffset.UtcNow.Ticks}";
        var bytes = Encoding.UTF8.GetBytes(seed);
        var suffix = Convert.ToHexString(bytes).ToLowerInvariant()[..8];
        return $"{slug}-{suffix}";
    }

    private static string ResolveFolderPath(string contentRootPath, string configuredFolderPath)
    {
        if (string.IsNullOrWhiteSpace(configuredFolderPath))
        {
            configuredFolderPath = "SampleData";
        }

        return Path.IsPathRooted(configuredFolderPath)
            ? configuredFolderPath
            : Path.GetFullPath(Path.Combine(contentRootPath, configuredFolderPath));
    }

    private void SeedDocuments()
    {
        var now = DateTimeOffset.UtcNow;

        if (!Directory.Exists(sampleDataPath))
        {
            throw new DirectoryNotFoundException(
                $"Configured architecture source folder was not found: {sampleDataPath}");
        }

        var sampleFiles = new[]
        {
            ("payments-architecture", "payments-architecture.json"),
            ("payment-service-details", "payment-service-details.json")
        };

        foreach (var (id, fileName) in sampleFiles)
        {
            var content = File.ReadAllText(Path.Combine(sampleDataPath, fileName));
            documents[id] = BuildDocument(id, fileName, content, now);
        }
    }
}
