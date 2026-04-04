using CALMdotNetViewer.Web.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSingleton<IArchitectureStore, InMemoryArchitectureStore>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

app.MapGet("/health", () => Results.Ok(new
{
    service = "CALMdotNetViewer.Web",
    status = "Healthy",
    utc = DateTimeOffset.UtcNow
}));

app.Run();
