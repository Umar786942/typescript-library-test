import { User, AuthStatus, AuthEvents } from './types';
import { EventEmitter } from '../events/EventEmitter';

const emitter = new EventEmitter();
const users: User[] = [{ username: "admin", password: "12345" }]; // Mock DB

export const connect = (username: string, password: string): AuthStatus => {
  const user = users.find(u => u.username === username && u.password === password);
  const isConnected = !!user;
  
  emitter.emit(AuthEvents.CONNECT, { isConnected, username });
  return { isConnected, username };
};

export const disconnect = (): AuthStatus => {
  emitter.emit(AuthEvents.DISCONNECT, { isConnected: false });
  return { isConnected: false };
};

export const onAuthChange = (callback: (status: AuthStatus) => void): void => {
  emitter.on(AuthEvents.CONNECT, callback);
  emitter.on(AuthEvents.DISCONNECT, callback);
};