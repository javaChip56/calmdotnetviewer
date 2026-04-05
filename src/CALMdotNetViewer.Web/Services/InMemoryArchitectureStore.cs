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
    private readonly Dictionary<string, SourceDocumentRecord> discoveredSources = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, SourceDocumentRecord> uploadedSources = new(StringComparer.OrdinalIgnoreCase);
    private readonly object gate = new();

    private readonly string sampleDataPath;

    public InMemoryArchitectureStore(
        IHostEnvironment hostEnvironment,
        IOptions<ArchitectureSourceOptions> architectureSourceOptions)
    {
        sampleDataPath = ResolveFolderPath(
            hostEnvironment.ContentRootPath,
            architectureSourceOptions.Value.FolderPath);
        RefreshDiscoveredSources();
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
            return Task.FromResult(BuildSummariesLocked());
        }
    }

    public Task<IReadOnlyList<ArchitectureSummaryResponse>> RefreshAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        lock (gate)
        {
            RefreshDiscoveredSourcesLocked();
            return Task.FromResult(BuildSummariesLocked());
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

        var documentId = CreateStableId(request.FileName, request.Content);
        var timestamp = DateTimeOffset.UtcNow;
        ArchitectureDocument document;

        lock (gate)
        {
            uploadedSources[documentId] = new SourceDocumentRecord(
                documentId,
                request.FileName,
                request.Content,
                timestamp);

            RebuildMaterializedDocumentsLocked();
            document = documents[documentId];
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

    private ArchitectureDocument BuildDocument(
        string id,
        string fileName,
        string content,
        DateTimeOffset timestamp,
        IReadOnlyList<ArchitectureReference>? linkedArchitectures = null)
    {
        using var json = JsonDocument.Parse(content);
        var root = json.RootElement;
        var schema = root.TryGetProperty("$schema", out var schemaElement) && schemaElement.ValueKind == JsonValueKind.String
            ? schemaElement.GetString()
            : null;

        return new ArchitectureDocument(
            id,
            ExtractTitle(root, fileName),
            content,
            "json",
            schema,
            linkedArchitectures ?? Array.Empty<ArchitectureReference>(),
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

    private void RefreshDiscoveredSources()
    {
        lock (gate)
        {
            RefreshDiscoveredSourcesLocked();
        }
    }

    private void RefreshDiscoveredSourcesLocked()
    {
        var now = DateTimeOffset.UtcNow;

        if (!Directory.Exists(sampleDataPath))
        {
            throw new DirectoryNotFoundException(
                $"Configured architecture source folder was not found: {sampleDataPath}");
        }

        var discoveredFiles = Directory.EnumerateFiles(sampleDataPath, "*.json", SearchOption.AllDirectories)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToList();
        var refreshedDiscoveredSources = new Dictionary<string, SourceDocumentRecord>(StringComparer.OrdinalIgnoreCase);
        var usedIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var filePath in discoveredFiles)
        {
            var content = File.ReadAllText(filePath);
            var fileInfo = new FileInfo(filePath);
            var id = CreateDiscoveredId(fileInfo, usedIds);
            refreshedDiscoveredSources[id] = new SourceDocumentRecord(
                id,
                fileInfo.Name,
                content,
                fileInfo.LastWriteTimeUtc == default ? now : fileInfo.LastWriteTimeUtc);
        }

        discoveredSources.Clear();
        foreach (var entry in refreshedDiscoveredSources)
        {
            discoveredSources[entry.Key] = entry.Value;
        }

        RebuildMaterializedDocumentsLocked();
    }

    private void RebuildMaterializedDocumentsLocked()
    {
        var allSources = discoveredSources.Values
            .Concat(uploadedSources.Values)
            .OrderBy(source => source.FileName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var referenceLookup = BuildReferenceLookup(allSources);
        documents.Clear();

        foreach (var source in allSources)
        {
            using var json = JsonDocument.Parse(source.Content);
            var linkedArchitectures = ExtractReferences(json.RootElement)
                .Select(reference => new ArchitectureReference(
                    reference,
                    ResolveReference(reference, referenceLookup),
                    BuildReferenceLabel(reference),
                    ResolveReference(reference, referenceLookup) is null ? "unresolved" : "resolved"))
                .ToList();

            documents[source.Id] = BuildDocument(
                source.Id,
                source.FileName,
                source.Content,
                source.Timestamp,
                linkedArchitectures);
        }
    }

    private IReadOnlyList<ArchitectureSummaryResponse> BuildSummariesLocked() =>
        documents.Values
            .OrderByDescending(x => x.UpdatedAt)
            .Select(x => new ArchitectureSummaryResponse(x.Id, x.Title, x.Schema, x.UpdatedAt))
            .ToList();

    private static string CreateDiscoveredId(FileInfo fileInfo, HashSet<string> usedIds)
    {
        var slug = Slugify(Path.GetFileNameWithoutExtension(fileInfo.Name));
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "architecture";
        }

        var candidate = slug;
        var suffix = 2;
        while (!usedIds.Add(candidate))
        {
            candidate = $"{slug}-{suffix++}";
        }

        return candidate;
    }

    private static Dictionary<string, string> BuildReferenceLookup(
        IReadOnlyList<SourceDocumentRecord> discoveredDocuments)
    {
        var lookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var discoveredDocument in discoveredDocuments)
        {
            lookup.TryAdd(discoveredDocument.Id, discoveredDocument.Id);
            lookup.TryAdd(discoveredDocument.FileName, discoveredDocument.Id);
            lookup.TryAdd(Path.GetFileNameWithoutExtension(discoveredDocument.FileName), discoveredDocument.Id);
            lookup.TryAdd(Slugify(Path.GetFileNameWithoutExtension(discoveredDocument.FileName)), discoveredDocument.Id);

            using var json = JsonDocument.Parse(discoveredDocument.Content);
            var root = json.RootElement;
            var title = ExtractTitle(root, discoveredDocument.FileName);
            lookup.TryAdd(title, discoveredDocument.Id);
            lookup.TryAdd(Slugify(title), discoveredDocument.Id);
        }

        return lookup;
    }

    private static string? ResolveReference(string reference, IReadOnlyDictionary<string, string> referenceLookup)
    {
        if (referenceLookup.TryGetValue(reference, out var directMatch))
        {
            return directMatch;
        }

        if (Uri.TryCreate(reference, UriKind.Absolute, out var uri))
        {
            var lastSegment = uri.Segments.LastOrDefault()?.Trim('/');
            if (!string.IsNullOrWhiteSpace(lastSegment) &&
                referenceLookup.TryGetValue(lastSegment, out var segmentMatch))
            {
                return segmentMatch;
            }

            var slug = Slugify(lastSegment ?? string.Empty);
            if (!string.IsNullOrWhiteSpace(slug) &&
                referenceLookup.TryGetValue(slug, out var slugMatch))
            {
                return slugMatch;
            }

            if (!string.IsNullOrWhiteSpace(slug))
            {
                var partialSegmentMatch = referenceLookup
                    .FirstOrDefault(entry => entry.Key.Contains(slug, StringComparison.OrdinalIgnoreCase));

                if (!string.IsNullOrWhiteSpace(partialSegmentMatch.Value))
                {
                    return partialSegmentMatch.Value;
                }
            }
        }

        var fileName = Path.GetFileName(reference);
        if (!string.IsNullOrWhiteSpace(fileName) &&
            referenceLookup.TryGetValue(fileName, out var fileNameMatch))
        {
            return fileNameMatch;
        }

        var fileBaseName = Path.GetFileNameWithoutExtension(reference);
        if (!string.IsNullOrWhiteSpace(fileBaseName) &&
            referenceLookup.TryGetValue(fileBaseName, out var fileBaseNameMatch))
        {
            return fileBaseNameMatch;
        }

        var normalizedReference = Slugify(reference);
        if (!string.IsNullOrWhiteSpace(normalizedReference) &&
            referenceLookup.TryGetValue(normalizedReference, out var normalizedMatch))
        {
            return normalizedMatch;
        }

        if (!string.IsNullOrWhiteSpace(normalizedReference))
        {
            var partialMatch = referenceLookup
                .FirstOrDefault(entry =>
                    entry.Key.Contains(normalizedReference, StringComparison.OrdinalIgnoreCase) ||
                    normalizedReference.Contains(entry.Key, StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrWhiteSpace(partialMatch.Value))
            {
                return partialMatch.Value;
            }
        }

        return null;
    }

    private static string Slugify(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = new string(value
            .ToLowerInvariant()
            .Select(character => char.IsLetterOrDigit(character) ? character : '-')
            .ToArray());

        return normalized.Trim('-');
    }

    private sealed record SourceDocumentRecord(
        string Id,
        string FileName,
        string Content,
        DateTimeOffset Timestamp);
}
