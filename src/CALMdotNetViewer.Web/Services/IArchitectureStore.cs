using CALMdotNetViewer.Web.Contracts;
using CALMdotNetViewer.Web.Models;

namespace CALMdotNetViewer.Web.Services;

public interface IArchitectureStore
{
    Task<ArchitectureDocument?> GetAsync(string id, CancellationToken cancellationToken);
    Task<IReadOnlyList<ArchitectureSummaryResponse>> GetSummariesAsync(CancellationToken cancellationToken);
    Task<ArchitectureDocument> CreateAsync(UploadArchitectureRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<ArchitectureReference>> GetLinkedAsync(string id, CancellationToken cancellationToken);
    Task<ArchitectureDocument?> GetLinkedAsync(string id, string linkedId, CancellationToken cancellationToken);
    Task<ValidationResult> ValidateAsync(ValidateArchitectureRequest request, CancellationToken cancellationToken);
}
