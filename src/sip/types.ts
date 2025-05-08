/**
 * Type definitions for the SIP library
 */

// SIP session state
export type SipStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "registered"
  | "unregistered"
  | "registrationFailed";

// Call direction
export type CallDirection = "inbound" | "outbound" | "missed";

// Call status
export type CallStatus =
  | "connecting"
  | "ringing"
  | "connected"
  | "hold"
  | "mute"
  | "failed"
  | "ended";

// SIP session interface
export interface SipSession {
  _name: string;
  _number: string;
  _status: CallStatus;
  _direction: CallDirection;
  _started_at: number; //i think it should be date
  _joined_at: number | null; //i think it should be date
  _active: boolean;
  _recording: boolean;
}

// SIP configuration
export interface SipConfig {
  uri: string;
  password: string;
  registrar_server: string;
  sockets: string[];
  session_timers: boolean;
//   iceServers?: RTCIceServer[];

}

// SIP manager options
export interface SipManagerOptions {
  onStatusChange?: (status: SipStatus) => void;
  onCallStart?: (session: SipSession) => void;
  onCallEnd?: (session: SipSession) => void;
  onCallUpdate?: (session: SipSession) => void;
}

// SIP state
export interface SipState {
  _status: SipStatus | null;
  _number: string | null;
  //   sessions: Record<string, SipSession>;
  //   activeSessionId: string | null;
  _uaSessions: Record<string, any>;
  _uiSessions: Record<string, SipSession>;
  _ring: string | null;
}

// Connection payload for billing integration (to be handled by host app)
export interface ConnectionPayload {
  call_id?: string;
  table_ymd?: string;
  [key: string]: any;
}

export interface RTCConfig {
    stun_url?: string;
    turn_url?: string;
    turn_username?: string;
    turn_password?: string;
  }
