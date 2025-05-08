/**
 * Utility functions for SIP operations
 */

import { RTCConfig } from "./types";

// Define the interface for the configuration object
  
  // Define the structure of the RTCConfiguration
  interface RTCIceServer {
    urls: string;
    username?: string;
    credential?: string;
  }
  
  interface PcConfig {
    iceServers: RTCIceServer[];
  }
  
  // Function to get the Peer Connection Configurations
  export const getPcConfigs = (_config?: RTCConfig): PcConfig => {
    // Define default STUN server
    // const stunUrl = 'stun:stun.l.google.com:19302';
    const stunUrl = _config?.stun_url || 'stun:stun.l.google.com:19302';
    const turnUrl = _config?.turn_url || '';
    const turnUsername = _config?.turn_username || '';
    const turnPassword = _config?.turn_password || '';
  
    // Initialize pcConfig with an empty array for iceServers
    let pcConfig: PcConfig = { iceServers: [] };
  
    // Populate the iceServers based on available configurations
    if (stunUrl && turnUrl && turnPassword) {
      pcConfig = {
        iceServers: [
          { urls: stunUrl },
          {
            urls: turnUrl,
            username: turnUsername,
            credential: turnPassword,
          },
        ],
      };
    } else if (stunUrl && !turnUrl) {
      pcConfig = {
        iceServers: [{ urls: stunUrl }],
      };
    } else if (turnUrl && !stunUrl) {
      pcConfig = {
        iceServers: [
          {
            urls: turnUrl,
            username: turnUsername,
            credential: turnPassword,
          },
        ],
      };
    }
  
    return pcConfig;
  };
  
  
  /**
   * Get refer user event handlers
   */
  export const _referUserHandler = (_event : any) => {
    _event.on('requestSucceeded', function (_data :any) {
      console.log('HEREEEEE', _data);
    });
    _event.on('requestFailed', function (_data :any) {
      console.log('HEREEEEE', _data );
    });
    _event.on('trying', function (_data :any) {
      console.log('HEREEEEE', _data );
    });
    _event.on('progress', function (_data :any) {
      console.log('HEREEEEE', _data );
    });
    _event.on('accepted', function (_data :any) {
      console.log('HEREEEEE', _data );
    });
    _event.on('failed', function (_data :any) {
      console.log('HEREEEEE', _data );
    });
  };