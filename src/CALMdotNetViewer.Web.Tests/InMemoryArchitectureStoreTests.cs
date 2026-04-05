using CALMdotNetViewer.Web.Contracts;
using CALMdotNetViewer.Web.Models;
using CALMdotNetViewer.Web.Services;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace CALMdotNetViewer.Web.Tests;

public sealed class InMemoryArchitectureStoreTests
{
    [Fact]
    public async Task LoadsSeededArchitecturesFromConfiguredFolder()
    {
        using var testFolder = new TemporaryArchitectureFolder();
        var store = CreateStore(testFolder.RootPath, "SampleData");

        var architecture = await store.GetAsync("payments-architecture", CancellationToken.None);
        var linked = await store.GetLinkedAsync("payments-architecture", CancellationToken.None);

        Assert.NotNull(architecture);
        Assert.Equal("Payments Architecture", architecture!.Title);
        Assert.Contains(linked, reference => reference.ResolvedId == "payment-service-details");
    }

    [Fact]
    public async Task AutoDiscoversJsonFilesRecursivelyFromConfiguredFolder()
    {
        using var testFolder = new TemporaryArchitectureFolder();
        var store = CreateStore(testFolder.RootPath, "SampleData");

        var summaries = await store.GetSummariesAsync(CancellationToken.None);
        var nestedArchitecture = await store.GetAsync("settlement-engine", CancellationToken.None);

        Assert.Contains(summaries, summary => summary.Id == "settlement-engine");
        Assert.NotNull(nestedArchitecture);
        Assert.Equal("Settlement Engine", nestedArchitecture!.Title);
    }

    [Fact]
    public async Task ValidateAsyncReturnsErrorForInvalidJson()
    {
        using var testFolder = new TemporaryArchitectureFolder();
        var store = CreateStore(testFolder.RootPath, "SampleData");

        var result = await store.ValidateAsync(
            new ValidateArchitectureRequest("{ invalid json"),
            CancellationToken.None);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, issue => issue.Code == "invalid-json");
    }

    [Fact]
    public async Task CreateAsyncStoresUploadedArchitectureAndReturnsItInSummaries()
    {
        using var testFolder = new TemporaryArchitectureFolder();
        var store = CreateStore(testFolder.RootPath, "SampleData");

        var created = await store.CreateAsync(
            new UploadArchitectureRequest(
                "uploaded-architecture.json",
                """
                {
                  "$schema": "https://calm.finos.org/release/1.1/meta/calm.json",
                  "metadata": { "title": "Uploaded Architecture" },
                  "nodes": [
                    { "unique-id": "uploaded-service", "node-type": "service", "name": "Uploaded Service" }
                  ],
                  "relationships": []
                }
                """),
            CancellationToken.None);

        var summaries = await store.GetSummariesAsync(CancellationToken.None);

        Assert.Equal("Uploaded Architecture", created.Title);
        Assert.Contains(summaries, summary => summary.Id == created.Id && summary.Title == "Uploaded Architecture");
    }

    [Fact]
    public void ThrowsWhenConfiguredFolderDoesNotExist()
    {
        using var testFolder = new TemporaryArchitectureFolder();

        var exception = Assert.Throws<DirectoryNotFoundException>(() =>
            CreateStore(testFolder.RootPath, "MissingFolder"));

        Assert.Contains("MissingFolder", exception.Message);
    }

    private static InMemoryArchitectureStore CreateStore(string contentRootPath, string folderPath)
    {
        var hostEnvironment = new TestHostEnvironment
        {
            ContentRootPath = contentRootPath,
            ContentRootFileProvider = new PhysicalFileProvider(contentRootPath)
        };

        return new InMemoryArchitectureStore(
            hostEnvironment,
            Options.Create(new ArchitectureSourceOptions
            {
                FolderPath = folderPath
            }));
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "CALMdotNetViewer.Web.Tests";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class TemporaryArchitectureFolder : IDisposable
    {
        public string RootPath { get; }

        public TemporaryArchitectureFolder()
        {
            RootPath = Path.Combine(Path.GetTempPath(), $"calm-dotnetviewer-tests-{Guid.NewGuid():N}");
            var sampleDataPath = Path.Combine(RootPath, "SampleData");
            Directory.CreateDirectory(sampleDataPath);

            File.WriteAllText(
                Path.Combine(sampleDataPath, "payments-architecture.json"),
                """
                {
                  "$schema": "https://calm.finos.org/release/1.1/meta/calm.json",
                  "metadata": { "title": "Payments Architecture" },
                  "nodes": [
                    { "unique-id": "channel-ui", "node-type": "webclient", "name": "Channel UI" },
                    {
                      "unique-id": "payments-api",
                      "node-type": "service",
                      "name": "Payments API",
                      "details": {
                        "detailed-architecture": {
                          "reference": "https://specs.internal/payment-service"
                        }
                      }
                    }
                  ],
                  "relationships": []
                }
                """);

            File.WriteAllText(
                Path.Combine(sampleDataPath, "payment-service-details.json"),
                """
                {
                  "$schema": "https://calm.finos.org/release/1.1/meta/calm.json",
                  "metadata": { "title": "Payment Service Details" },
                  "nodes": [
                    { "unique-id": "payment-orchestrator", "node-type": "service", "name": "Payment Orchestrator" }
                  ],
                  "relationships": []
                }
                """);

            var nestedFolder = Path.Combine(sampleDataPath, "Nested");
            Directory.CreateDirectory(nestedFolder);

            File.WriteAllText(
                Path.Combine(nestedFolder, "settlement-engine.json"),
                """
                {
                  "$schema": "https://calm.finos.org/release/1.1/meta/calm.json",
                  "metadata": { "title": "Settlement Engine" },
                  "nodes": [
                    { "unique-id": "settlement-service", "node-type": "service", "name": "Settlement Service" }
                  ],
                  "relationships": []
                }
                """);
        }

        public void Dispose()
        {
            if (Directory.Exists(RootPath))
            {
                Directory.Delete(RootPath, recursive: true);
            }
        }
    }
}
