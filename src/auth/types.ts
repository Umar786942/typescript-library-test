export interface User {
    username: string;
    password: string;
  }
  
  export enum AuthEvents {
    CONNECT = "AUTH_CONNECT",
    DISCONNECT = "AUTH_DISCONNECT",
  }
  
  export type AuthStatus = {
    isConnected: boolean;
    username?: string;
  };