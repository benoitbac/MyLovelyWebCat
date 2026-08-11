// Client de l'arène temps réel (multijoueur « bureau »). Enveloppe typée autour
// de SignalR : on rejoint une salle, on diffuse la position de son chat, et on
// reçoit celle des collègues. Volontairement mince — la mise en scène 3D vit
// dans le monde, pas ici.

import * as signalR from '@microsoft/signalr';

const BASE =
  (import.meta.env.VITE_ARENA_URL as string | undefined) ?? 'http://localhost:5279';

export interface ArenaHandlers {
  onJoined?: (id: string, name: string, catDna: string) => void;
  onLeft?: (id: string) => void;
  onPose?: (id: string, x: number, z: number, facing: number) => void;
  onWave?: (id: string) => void;
}

export class Arena {
  private conn: signalR.HubConnection;
  private room = '';

  constructor(handlers: ArenaHandlers) {
    this.conn = new signalR.HubConnectionBuilder()
      .withUrl(`${BASE}/hub/arena`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.conn.on('PlayerJoined', (id, name, dna) => handlers.onJoined?.(id, name, dna));
    this.conn.on('PlayerLeft', (id) => handlers.onLeft?.(id));
    this.conn.on('PoseUpdate', (id, x, z, f) => handlers.onPose?.(id, x, z, f));
    this.conn.on('Wave', (id) => handlers.onWave?.(id));
  }

  get connected(): boolean {
    return this.conn.state === signalR.HubConnectionState.Connected;
  }

  /** Se connecte et rejoint une salle. Silencieux en cas d'échec (jeu solo si pas de serveur). */
  async join(room: string, name: string, catDna: string): Promise<boolean> {
    this.room = room;
    try {
      await this.conn.start();
      await this.conn.invoke('JoinRoom', room, name, catDna);
      return true;
    } catch {
      return false;
    }
  }

  async sendPose(x: number, z: number, facing: number): Promise<void> {
    if (!this.connected) return;
    try {
      await this.conn.invoke('UpdatePose', this.room, x, z, facing);
    } catch {
      /* une frame perdue ne doit pas casser la boucle */
    }
  }

  async wave(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.conn.invoke('Wave', this.room);
    } catch {
      /* ignore */
    }
  }

  async leave(): Promise<void> {
    try {
      if (this.connected) await this.conn.invoke('LeaveRoom', this.room);
    } catch {
      /* on s'en va de toute façon */
    }
    await this.conn.stop();
  }
}
