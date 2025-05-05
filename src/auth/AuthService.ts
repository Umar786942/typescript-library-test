import { User, AuthStatus, AuthEvents } from './types';
import { EventEmitter } from '../events/EventEmitter';

export class AuthService {
  private emitter = new EventEmitter();
  private users: User[] = [{ username: "admin", password: "12345" }]; // Mock DB

  connect(username: string, password: string): AuthStatus {
    const user = this.users.find(u => u.username === username && u.password === password);
    const isConnected = !!user;

    this.emitter.emit(AuthEvents.CONNECT, { isConnected, username });
    return { isConnected, username };
  }

  disconnect(): AuthStatus {
    this.emitter.emit(AuthEvents.DISCONNECT, { isConnected: false });
    return { isConnected: false };
  }

  onAuthChange(callback: (status: AuthStatus) => void): void {
    this.emitter.on(AuthEvents.CONNECT, callback);
    this.emitter.on(AuthEvents.DISCONNECT, callback);
  }
}