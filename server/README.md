# Miaou — Backend (.NET 9)

API + temps réel pour Miaou : classements et **arène multijoueur** (SignalR).

## Lancer

```bash
cd server
dotnet run --urls http://localhost:5099
```

## Endpoints

| Méthode | Route              | Rôle                                  |
| ------- | ------------------ | ------------------------------------- |
| GET     | `/health`          | Santé du service                      |
| GET     | `/api/leaderboard` | Top 20 des scores                     |
| POST    | `/api/scores`      | Soumettre un score (`{name, score}`)  |
| WS      | `/hub/arena`       | Hub SignalR (arène bureau temps réel) |

## Arène (`ArenaHub`)

`JoinRoom(room, name, catDna)` · `UpdateScore(room, name, score)` ·
`UpdateCursor(room, x, y)` · `Wave(room)` · `LeaveRoom(room)`.
Événements diffusés : `PlayerJoined/Left`, `ScoreUpdate`, `CursorMove`, `Wave`.

> Stockage en mémoire pour l'instant (classement) — base de données + comptes à venir.
