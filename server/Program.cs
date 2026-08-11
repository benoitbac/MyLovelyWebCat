using Miaou.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Port fixe pour que le client web sache où joindre l'arène en dev.
builder.WebHost.UseUrls("http://localhost:5279");

builder.Services.AddSignalR();
builder.Services.AddSingleton<Leaderboard>();
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(p => p
        .SetIsOriginAllowed(_ => true)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();
app.UseCors();

// Santé du service.
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "miaou", ts = DateTimeOffset.UtcNow }));

// Classement (in-memory pour l'instant ; base de données plus tard).
app.MapGet("/api/leaderboard", (Leaderboard lb) => Results.Ok(lb.Top(20)));
app.MapPost("/api/scores", (ScoreEntry entry, Leaderboard lb) =>
{
    lb.Submit(entry);
    return Results.Ok(lb.Top(20));
});

// Arène temps réel (multijoueur bureau).
app.MapHub<ArenaHub>("/hub/arena");

app.Run();

/// <summary>Un score soumis par un joueur.</summary>
public record ScoreEntry(string Name, int Score);

/// <summary>Classement thread-safe en mémoire.</summary>
public class Leaderboard
{
    private readonly List<ScoreEntry> _scores = new();
    private readonly object _lock = new();

    public void Submit(ScoreEntry entry)
    {
        lock (_lock)
        {
            _scores.Add(entry);
        }
    }

    public IReadOnlyList<ScoreEntry> Top(int n)
    {
        lock (_lock)
        {
            return _scores.OrderByDescending(s => s.Score).Take(n).ToList();
        }
    }
}
