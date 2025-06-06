/**
 * Core SIP manager class that handles all SIP operations
 */
import JsSIP from "jssip";
import { EventEmitter } from "events";
import {
  SipStatus,
  SipSession,
  SipConfig,
  CallStatus,
  CallDirection,
  ConnectionPayload,
  RTCConfig,
  SipState,
} from "./types";
import { sipReducer, defaultSipState } from "./SipReducer";
import { eventHandlers } from "./SipEvents";
import { _referUserHandler, getPcConfigs } from "./SipUtils";
import moment from "moment";

// Define callback type for state updates
type StateUpdateCallback = (newState: SipState) => void;

export class SipManager extends EventEmitter {
  private ua: JsSIP.UA | null = null;
  private state:SipState = defaultSipState;
  private config: SipConfig;
  private _reffered: { _uuid: string; _number: string } | null = null;
  private stateUpdateCallbacks: StateUpdateCallback[] = [];

  constructor(config: SipConfig) {
    super();
    this.config = config;
     // Bind all public methods
     this.start = this.start.bind(this);
      this.stop = this.stop.bind(this);
      
     this._makeCall = this._makeCall.bind(this);
     this._answerCall = this._answerCall.bind(this);
     this._terminate = this._terminate.bind(this);
     this._toggleHold = this._toggleHold.bind(this);
      this._hold = this._hold.bind(this);
      this._unHold = this._unHold.bind(this);
      this._muteCall = this._muteCall.bind(this);
      this._sendDtmf = this._sendDtmf.bind(this);
      this._referUser = this._referUser.bind(this);
      this._attendedTransfer = this._attendedTransfer.bind(this);
      this._speakerOff = this._speakerOff.bind(this);
      this._speakerOn = this._speakerOn.bind(this);
      this._nbTerminate = this._nbTerminate.bind(this);
      this._passInfo = this._passInfo.bind(this);
      this.subscribeToState = this.subscribeToState.bind(this);
      this.unsubscribeFromState = this.unsubscribeFromState.bind(this);
      this.initialize();
  }
 /**
   * Subscribe to state updates
   * @param callback - Function to call when state changes
   * @returns Unsubscribe function
   */
 public subscribeToState(callback: StateUpdateCallback): () => void {
  this.stateUpdateCallbacks.push(callback);
  // Immediately send current state to new subscriber
  callback(this.state);
  return () => this.unsubscribeFromState(callback);
}
public unsubscribeFromState(callback: StateUpdateCallback): void {
  this.stateUpdateCallbacks = this.stateUpdateCallbacks.filter(
    (cb) => cb !== callback
  );
}

/**
   * Notify all subscribers of state changes
   */
private notifyStateChange(): void {
  this.stateUpdateCallbacks.forEach((callback) => callback(this.state));
}

  public get _state(): Readonly<SipState> {
    return this.state;
  }

  /**
   * Initialize the SIP UA (User Agent)
   */
  private initialize(): void {
    console.log("Initializing SipManager...")
    try {
      const socket = new JsSIP.WebSocketInterface(this.config.sockets[0]); //we have to send socket url as sockets['url']
      //   JsSIP.debug.disable('JsSIP:*');
      JsSIP.debug.disable();

      this.ua = new JsSIP.UA({
        sockets: [socket],
        uri: this.config.uri,
        password: this.config.password,
        session_timers: this.config.session_timers,
        registrar_server: this.config.registrar_server,
      });
      console.log('UA created, starting...');
      this.ua.start();
      console.log('Setting up event listeners...');
      this.setupEventListeners();
      console.log('Initialization complete');
    } catch (error) {
      // this.emit("error", `Error while initializing SIP: ${error}`);
      console.log("error", `Error while initializing SIP: ${error}`);
    }
  }

  /**
   * Setup event listeners for the SIP UA
   */
  private setupEventListeners(): void {
    if (!this.ua) return;

    // Connection status events
    this.ua.on("connecting", () => this.updateStatus("connecting"));
    this.ua.on("connected", () => this.updateStatus("connected"));
    this.ua.on("disconnected", () => this.updateStatus("disconnected"));
    this.ua.on("registered", () => this.updateStatus("registered"));
    this.ua.on("unregistered", () => this.updateStatus("unregistered"));
    this.ua.on("registrationFailed", () =>
      this.updateStatus("registrationFailed")
    );

    // New call events
    this.ua.on("newRTCSession", (data: any) => {
      const { originator, session, request } = data;
      const displayName = session._remote_identity._display_name || null;
      const number = session._remote_identity._uri._user || null;
      const callId = request.call_id;

      const newSession: SipSession = {
        _name: displayName || "Unknown Number",
        _number: number || "",
        _status: "connecting",
        _direction: originator === "local" ? "outbound" : "inbound",
        _started_at: moment.utc().valueOf(),
        _joined_at: null,
        _active: false,
        _recording: false,
      };

      this.updateState({
        _type: "_NEW_CALL",
        _payload: {
          _uiSession: { [callId]: newSession },
          _uaSession: { [callId]: session },
        },
      }, callId);

      // Setup session event handlers
      eventHandlers(session, callId, {
        onStatusChange: (status) => this.handleCallStatusChange(callId, status),
        onEnd: () => this.handleCallEnd(callId),
        onFail: () => this.handleCallFailed(callId),
        onHold: () => this.handleCallHold(callId),
        onUnhold: () => this.handleCallUnhold(callId),
        onMute: () => this.handleCallMute(callId),
        onUnmute: () => this.handleCallUnmute(callId),
        onRecording: (event) => this.handleCallRecording(callId, event),
      });

      
    });
  }

  /**
   * Start the SIP UA
   */
  public start(): void {
    try {
      this.ua?.start();
    } catch (error) {
      // this.emit("error", `Connection error: ${error}`);
      console.log("error", `Connection error: ${error}`);
    }
  }

  /**
   * Stop the SIP UA
   */
  public stop(): void {
    try {
      this.ua?.stop();
    } catch (error) {
      // this.emit("error", `Connection break error: ${error}`);
      console.log("error", `Connection break error: ${error}`);
    }
  }

  /**
   * Make a new call
   * @param number - The number to call
   * @param displayName - Display name for the call
   * @param connectionPayload - Optional connection payload for billing
   */
  public _makeCall(
    displayName: string,
    callMeAt: string,
    connectionPayload?: ConnectionPayload,
    _config?: RTCConfig
  ): void {
    if (!this.state) {
      console.error('SipManager: state not initialized');
      return;
    }
  
    // Add UA existence check
    if (!this.ua) {
      console.error('SipManager: UA not initialized');
      return;
    }

    if (
      !(callMeAt || this.state._number) ||
      this.state._status !== "registered" ||
      !this.ua
    ) {
      // this.emit("error", "Cannot make call - not registered or invalid number");
      console.log("error", "Cannot make call - not registered or invalid number");
      return;
    }

    const pcConfig = getPcConfigs(_config);

    const options: any = {
      mediaConstraints: { audio: true, video: false },
      fromDisplayName: displayName,
      RTCConstraints: {
        optional: [{ DtlsSrtpKeyAgreement: "false" }],
      },
      rtcOfferConstraints: {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 0,
      },
      pcConfig,
    };

    if (connectionPayload) {
      // Add connection payload to the extra headers
      options.extraHeaders = [
        `X-sip-connection-payload: ${JSON.stringify(connectionPayload)}`,
      ];
    }

    this.ua?.call(callMeAt ?? this.state._number, options);
  }

  /**
   * Answer an incoming call
   * @param _uuid - The ID of the call to answer
   */
  public _answerCall(_uuid: string, _config?: RTCConfig): void {
    let pcConfig = getPcConfigs(_config);
    if (
      !_uuid ||
      !this.state._uaSessions[_uuid] ||
      !this.state._uiSessions[_uuid]
    )
      return;
    this.state._uaSessions[_uuid].answer({ pcConfig });
  }

  /**
   * Terminate a call
   * @param _uuid - The ID of the call to terminate
   */
  public _terminate(_uuid: string): void {
    if (
      !_uuid ||
      !this.state._uaSessions[_uuid] ||
      !this.state._uiSessions[_uuid]
    )
      return;
    if (
      this.state._uiSessions[_uuid]._direction === "inbound" &&
      this.state._uiSessions[_uuid]._status === "ringing"
    ) {
      this.state._uaSessions[_uuid].terminate({
        status_code: 480,
        reason_phrase: "Unavailable",
      });
    } else {
      this.state._uaSessions[_uuid].terminate();
    }
    //   if (sessionStorage.getItem('cid')) {
    //     sessionStorage.removeItem('cid');
    //   }
  }

  /**
   * Toggle hold on a call
   * @param _uuid - The ID of the call to hold/unhold
   */
  public _toggleHold(_uuid: string): void {
    const { _uaSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    if (!_uaSession) return;
    if (_uaSession.isOnHold() && _uaSession.isOnHold().local === true) {
      _uaSession.unhold();
    } else {
      _uaSession.hold();
    }
  }

  /**
   * Put a call on hold
   * @param _uuid - The ID of the call to hold
   */
  public _hold(_uuid: string): void {
    const { _uaSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    if (!_uaSession) return;
    if (_uaSession.isOnHold() && _uaSession.isOnHold().local === true) {
      return;
    } else {
      _uaSession.hold();
    }
  }

  /**
   * Take a call off hold
   * @param _uuid - The ID of the call to unhold
   */
  public _unHold(_uuid: string): void {
    const { _uaSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    if (!_uaSession) return;
    if (_uaSession.isOnHold() && _uaSession.isOnHold().local === true) {
      _uaSession.unhold();
    } else {
      return;
    }
  }

  /**
   * Toggle mute on a call
   * @param _uuid - The ID of the call to mute/unmute
   */
  public _muteCall(_uuid: string): void {
    const { _uaSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    if (!_uaSession) return;
    if (_uaSession.isMuted() && _uaSession.isMuted().audio === true) {
      _uaSession.unmute();
    } else {
      _uaSession.mute();
    }
  }

  public _nbTerminate(_pn: any): void {
    // number based termination
    let uuid = null;
    const { _uiSessions, _uaSessions } = this.state;
    Object.keys(_uiSessions).forEach((_key) => {
      let _value = _uiSessions[_key];
      if (_value?._number === _pn) {
        uuid = _key;
      }
    });
    if (uuid) {
      _uaSessions[uuid].terminate();
    }
  }

  /**
   * Send DTMF tones
   * @param callId - The ID of the call
   * @param dtmf - The DTMF tone to send
   */
  public _sendDtmf(_uuid: string, _dtmf: string, _optionsInfo: any): void {
    if (!_uuid || !_dtmf) return;
    let _options = _optionsInfo
      ? _optionsInfo
      : {
          duration: 100,
          interToneGap: 500,
          extraHeaders: [`_uuid: ${_uuid}`],
          transportType: "INFO",
        };
    const { _uaSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    _uaSession.sendDTMF(_dtmf, _options);
  }

  /**
   * Refer a call to another number
   * @param _uuid - The ID of the call to refer
   * @param number - The number to transfer to
   * @param accepted - Whether the transfer was accepted
   * @param secondaryCallId - Optional secondary call ID for attended transfer
   */
  public _referUser(
    _uuid: string,
    _number: string,
    _accepted: boolean = false,
    _secondaryuuid?: string
  ): void {
    if (!_uuid || !_number) return;
    const { _uaSessions, _uiSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    let _uiSession = _uiSessions[_uuid];
    let pcConfig = getPcConfigs();
    let _options = {
      extraHeaders: [`_uuid:"${_uuid},_type:"_incoming_refer"`],
      eventHandlers: _referUserHandler,
      pcConfig,
    };
    if (!_uaSession || !_uiSession) return;
    if (_accepted) {
      if (_secondaryuuid) {
        const call2Session = _uaSessions[_secondaryuuid];
        const options = {
          replaces: call2Session,
        };
        _uaSession.refer(call2Session.remote_identity.uri, options);
      } else {
        _uaSession.refer(_number);
      }
    } else {
      this._reffered = { _uuid, _number };
      _uaSession.answer(_options);
    }
  }

  public _passInfo(_uuid: string, _info: any): void {
    if (!_uuid || !_info) return;
    const { _uaSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    if (!_uaSession) return;
    _uaSession.sendInfo(_info);
  }

  /**
   * Perform an attended transfer
   * @param callId - The ID of the call to transfer
   * @param number - The number to transfer to
   */
  public _attendedTransfer(_uuid: string, _number: string): void {
    if (!_uuid) return;
    const { _uaSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    if (!_uaSession || !_number) return;
    let _currentSession = _uaSession;
    _currentSession.hold();
    _uaSession.refer(_number, {
      extraHeaders: ["attended-transfer:test-case"],
      eventHandlers: function (_event: any) {
        _event.on("requestSucceeded", function (_data: any) {
          console.log("HEREEEEE", _data);
        });
        _event.on("requestFailed", function (_data: any) {
          console.log("HEREEEEE", _data);
        });
        _event.on("trying", function (_data: any) {
          console.log("HEREEEEE", _data);
        });
        _event.on("progress", function (_data: any) {
          console.log("HEREEEEE", _data);
        });
        _event.on("accepted", function (_data: any) {
          console.log("HEREEEEE", _data);
        });
        _event.on("failed", function (_data: any) {
          console.log("HEREEEEE", _data);
        });
      },
      replaces: _currentSession,
    });
  }

  /**
   * Toggle speaker on/off
   * @param _uuid - The ID of the call
   */
  public _speakerOff(_uuid: string): void {
    if (!_uuid) return;
    const { _uaSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    if (_uaSession) {
      const pc = _uaSession.connection;
      pc.getSenders().forEach((sender: any) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = false;
          this.state = sipReducer(this.state, {
            _type: "_SPEAKER_OFF",
            _payload: _uuid,
          });
          console.log("Audio paused", sender.track.enabled);
        }
      });
    } else {
      console.log("No active session to pause audio");
    }
  }

  public _speakerOn(_uuid: string): void {
    if (!_uuid) return;
    const { _uaSessions } = this.state;
    let _uaSession = _uaSessions[_uuid];
    if (_uaSession) {
      const pc = _uaSession.connection;
      pc.getSenders().forEach((sender: any) => {
        if (sender.track && sender.track.kind === "audio") {
          sender.track.enabled = true;
          this.state = sipReducer(this.state, {
            _type: "_SPEAKER_ON",
            _payload: _uuid,
          });
          console.log("Audio paused", sender.track.enabled);
        }
      });
    } else {
      console.log("No active session to pause audio");
    }
  }

  /**
   * Update the SIP status and emit events
   * @param status - The new status
   */
  private updateStatus(status: SipStatus): void {
    //for updating ua status
    this.state = sipReducer(this.state, {
      _type: "_SET_STATUS",
      _payload: status,
    });
    // this.emit("statusChange", status);
    console.log("statusChange", status);
  }

  /**
   * Handle call status changes
   * @param callId - The ID of the call
   * @param status - The new call status
   */
  private handleCallStatusChange(callId: string, status: CallStatus): void {
    //for updating call status
    const prevState = this.state;
    this.state = sipReducer(this.state, {
      _type: "_UPDATE_CALL",
      _payload: { _call_id: callId, _status: status },
    });

     // Only notify if state actually changed
     if (this.state !== prevState) {
      this.notifyStateChange();
      
      // const session = this.state._uiSessions[callId];
      // if (session) {
      //   this.emit("callUpdated", session);
      // }
    }

    // const session = this.state._uiSessions[callId];
    // if (session) {
    //   // this.emit("callUpdated", session);
    //   console.log("callUpdated", {newSate: this.state, uiSession :session});
    // }
    
  }

  /**
   * Handle call end
   * @param callId - The ID of the call that ended
   */
  private handleCallEnd(callId: string): void {
    const prevState = this.state;
    this.state = sipReducer(this.state, {
      _type: "_COMPLETE_CALL",
      _payload: callId,
    });
    // Only notify if state actually changed
    if (this.state !== prevState) {
      this.notifyStateChange();
      
      // const session = this.state._uiSessions[callId];
      // if (session) {
      //   this.emit("callEnded", session);
      // }
    }

    // const session = this.state._uiSessions[callId];
    // if (session) {
    //   // this.emit("callEnded", session);
    //   console.log("callEnded", session);
    // }
    
  }
  /**
   * Handle call end
   * @param callId - The ID of the call that ended
   */
  private handleCallFailed(callId: string): void {
    const prevState = this.state;
    this.state = sipReducer(this.state, {
      _type: "_FAILED_CALL",
      _payload: callId,
    });
     // Only notify if state actually changed
     if (this.state !== prevState) {
      this.notifyStateChange();
      
      // const session = this.state._uiSessions[callId];
      // if (session) {
      //   this.emit("callFailed", session);
      // }
    }

    // const session = this.state._uiSessions[callId];
    // if (session) {
    //   // this.emit("callFailed", session);
    //   console.log("callFailed", {newSate: this.state, uiSession :session});
    // }
   
  }

  /**
   * Handle call hold
   * @param callId - The ID of the call that was held
   */
  private handleCallHold(callId: string): void {
    const prevState = this.state;
    this.state = sipReducer(this.state, {
      _type: "_HOLD_CALL",
      _payload: callId,
    });
     // Only notify if state actually changed
     if (this.state !== prevState) {
      this.notifyStateChange();
      
      // const session = this.state._uiSessions[callId];
      // if (session) {
      //   this.emit("callHold", session);
      // }
    }
   
  }

  /**
   * Handle call unhold
   * @param callId - The ID of the call that was unheld
   */
  private handleCallUnhold(callId: string): void {
    const prevState = this.state;
    this.state = sipReducer(this.state, {
      _type: "_UNHOLD_CALL",
      _payload: callId,
    });
        // Only notify if state actually changed
        if (this.state !== prevState) {
          this.notifyStateChange();
          
          // const session = this.state._uiSessions[callId];
          // if (session) {
          //   this.emit("callUnhold", session);
          // }
        }
    
  }

  /**
   * Handle call mute
   * @param callId - The ID of the call that was muted
   */
  private handleCallMute(callId: string): void {
    const prevState = this.state;
    this.state = sipReducer(this.state, {
      _type: "_MUTE_CALL",
      _payload: callId,
    });
       // Only notify if state actually changed
       if (this.state !== prevState) {
        this.notifyStateChange();
        
        // const session = this.state._uiSessions[callId];
        // if (session) {
        //   this.emit("callMuted", session);
        // }
      }
  }

  /**
   * Handle call unmute
   * @param callId - The ID of the call that was unmuted
   */
  private handleCallUnmute(callId: string): void {
    const prevState = this.state;
    this.state = sipReducer(this.state, {
      _type: "_UNMUTE_CALL",
      _payload: callId,
    });
      // Only notify if state actually changed
      if (this.state !== prevState) {
        this.notifyStateChange();
        
        // const session = this.state._uiSessions[callId];
        // if (session) {
        //   this.emit("callUnmuted", session);
        // }
      }
  }
  private handleCallRecording(callId: string, event: any): void {
    const prevState = this.state;
    this.state = sipReducer(this.state, {
      _type: "_RECORDING",
      _payload: {
        _call_id: callId,
        _recording: event,
      },
    });
      // Only notify if state actually changed
      if (this.state !== prevState) {
        this.notifyStateChange();
        
        // const session = this.state._uiSessions[callId];
        // if (session) {
        //   this.emit("callRecordingStarted", session);
        // }
      }
  }

  /**
   * Update the internal state
   * @param action - The action to perform on the state
   */
  private updateState(action: any, callId : string): void {
    //for dispatch type New_Call
    const prevState = this.state;
    this.state = sipReducer(this.state, action);
    // Only notify if state actually changed
    if (this.state !== prevState) {
      this.notifyStateChange();
      
      // const session = this.state._uiSessions[callId];
      // if (session) {
      //   this.emit("callUpdated", session);
      // }
    }
   
    // const session = this.state._uiSessions[callId];
    // if (session) {
    //   // this.emit("callStarted", session);
    //   console.log("callStarted", {newSate: this.state, uiSession :session});
    // }
  
  }
}
