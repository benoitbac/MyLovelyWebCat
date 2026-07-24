# 02 — Backend .NET 9 (ASP.NET Core + SignalR)

## Décision

Le backend (API, comptes, sauvegardes, classements et surtout **multijoueur temps
réel**) est en **.NET 9 / ASP.NET Core**, avec **SignalR** pour le temps réel.

## Pourquoi c'est le meilleur choix ici

- **Temps réel bas-latence** : SignalR gère WebSocket + fallbacks, groupes/rooms,
  reconnexion — parfait pour une **arène de bureau** (voir jouer les collègues,
  scores live, curseurs partagés).
- **Écosystème mûr & perf** : ASP.NET Core est parmi les frameworks web les plus
  rapides ; typage fort C#, DI, tooling de premier ordre.
- **Scalable** : backplane Redis pour scaler SignalR horizontalement quand il le
  faudra ; hébergement simple (conteneur).
- **Un seul langage côté serveur** pour API + hub + logique métier.

## Ce qui tourne déjà

```
server/Program.cs        → API minimale : /health, /api/leaderboard, POST /api/scores
server/Hubs/ArenaHub.cs  → hub SignalR : JoinRoom, UpdateScore, UpdateCursor, Wave
```

- Lancer : `cd server && dotnet run --urls http://localhost:5099`
- Vérifié : `/health` OK, soumission de score → classement OK.

## Suite

- Comptes + persistance (EF Core + base) au lieu du in-memory.
- Serveur **autoritatif** pour les modes compétitifs (rejoue la sim Rust côté serveur).
- Matchmaking simple par salle (code bureau).

## Alternatives écartées

- **Node/Socket.io** : correct mais on perd la robustesse/typage/perf de .NET, et
  c'est la stack que le projet veut assumer.
- **Firebase/Supabase realtime** : rapide à démarrer mais moins de contrôle et
  couplage fournisseur.
