using Microsoft.AspNetCore.SignalR;

namespace Miaou.Hubs;

/// <summary>
/// Arène temps réel « bureau » : les joueurs rejoignent une salle (leur bureau),
/// voient les cats/curseurs des autres et leurs scores en direct. Réseau simple
/// via SignalR — base du multijoueur de Miaou.
/// </summary>
public class ArenaHub : Hub
{
    public async Task JoinRoom(string room, string name, string catDna)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, room);
        await Clients.OthersInGroup(room).SendAsync("PlayerJoined", Context.ConnectionId, name, catDna);
    }

    public async Task LeaveRoom(string room)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, room);
        await Clients.OthersInGroup(room).SendAsync("PlayerLeft", Context.ConnectionId);
    }

    // Score en direct pendant une partie (course au meilleur score du bureau).
    public Task UpdateScore(string room, string name, int score) =>
        Clients.OthersInGroup(room).SendAsync("ScoreUpdate", Context.ConnectionId, name, score);

    // Position du laser/curseur, pour voir jouer les collègues en temps réel.
    public Task UpdateCursor(string room, double x, double y) =>
        Clients.OthersInGroup(room).SendAsync("CursorMove", Context.ConnectionId, x, y);

    // Position du chat dans le monde 3D : présence + déplacement des collègues.
    public Task UpdatePose(string room, double x, double z, double facing) =>
        Clients.OthersInGroup(room).SendAsync("PoseUpdate", Context.ConnectionId, x, z, facing);

    // Petit "coucou" / interaction sociale entre chats.
    public Task Wave(string room) =>
        Clients.OthersInGroup(room).SendAsync("Wave", Context.ConnectionId);
}
