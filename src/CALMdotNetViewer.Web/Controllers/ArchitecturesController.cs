using CALMdotNetViewer.Web.Contracts;
using CALMdotNetViewer.Web.Models;
using CALMdotNetViewer.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace CALMdotNetViewer.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ArchitecturesController(IArchitectureStore store) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ArchitectureSummaryResponse>>> GetSummaries(CancellationToken cancellationToken)
    {
        var summaries = await store.GetSummariesAsync(cancellationToken);
        return Ok(summaries);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<IReadOnlyList<ArchitectureSummaryResponse>>> RefreshSummaries(CancellationToken cancellationToken)
    {
        var summaries = await store.RefreshAsync(cancellationToken);
        return Ok(summaries);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ArchitectureResponse>> GetArchitecture(string id, CancellationToken cancellationToken)
    {
        var architecture = await store.GetAsync(id, cancellationToken);
        if (architecture is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(architecture));
    }

    [HttpPost]
    public async Task<ActionResult<ArchitectureResponse>> CreateArchitecture(
        [FromBody] UploadArchitectureRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var created = await store.CreateAsync(request, cancellationToken);
            return CreatedAtAction(nameof(GetArchitecture), new { id = created.Id }, ToResponse(created));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("validate")]
    public async Task<ActionResult<ValidationResponse>> ValidateArchitecture(
        [FromBody] ValidateArchitectureRequest request,
        CancellationToken cancellationToken)
    {
        var result = await store.ValidateAsync(request, cancellationToken);
        return Ok(ToResponse(result));
    }

    [HttpGet("{id}/linked")]
    public async Task<ActionResult<IReadOnlyList<ArchitectureReferenceResponse>>> GetLinkedArchitectures(
        string id,
        CancellationToken cancellationToken)
    {
        var architecture = await store.GetAsync(id, cancellationToken);
        if (architecture is null)
        {
            return NotFound();
        }

        var linked = await store.GetLinkedAsync(id, cancellationToken);
        return Ok(linked.Select(ToResponse).ToList());
    }

    [HttpGet("{id}/linked/{linkedId}")]
    public async Task<ActionResult<ArchitectureResponse>> GetLinkedArchitecture(
        string id,
        string linkedId,
        CancellationToken cancellationToken)
    {
        var linked = await store.GetLinkedAsync(id, linkedId, cancellationToken);
        if (linked is null)
        {
            return NotFound();
        }

        return Ok(ToResponse(linked));
    }

    private static ArchitectureResponse ToResponse(ArchitectureDocument document) =>
        new(
            document.Id,
            document.Title,
            document.Content,
            document.Format,
            document.Schema,
            document.LinkedArchitectures.Select(ToResponse).ToList(),
            new ArchitectureMetadataResponse(document.CreatedAt, document.UpdatedAt));

    private static ArchitectureReferenceResponse ToResponse(ArchitectureReference reference) =>
        new(reference.Reference, reference.ResolvedId, reference.Label, reference.ResolutionStatus);

    private static ValidationResponse ToResponse(ValidationResult result) =>
        new(
            result.IsValid,
            result.Errors.Select(ToResponse).ToList(),
            result.Warnings.Select(ToResponse).ToList());

    private static ValidationIssueResponse ToResponse(ValidationIssue issue) =>
        new(issue.Severity, issue.Code, issue.Message, issue.Path, issue.LineStart, issue.LineEnd);
}
