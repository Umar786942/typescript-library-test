/**
 * State management for SIP calls
 */
import { SipState, SipStatus, SipSession, CallStatus } from "./types";
import moment from "moment";

// Default initial state
export const defaultSipState: SipState = {
  _status: null,
  _number: null,
  //   sessions: {},
  //   activeSessionId: null,//in react properties were _status,_number, _uaSessions, _uiSessions,_ring
  _uaSessions: {},
  _uiSessions: {},
  _ring: null,
};

// Reducer action types
type SipAction =
    | { _type: "_SET_STATUS"; _payload: SipStatus | null }
    | { _type: "_SET_NUMBER"; _payload: string | null }
    | {
        _type: "_NEW_CALL";
        _payload: {
                _uiSession: {
                    [_call_id: string]: SipSession;
                };
                _uaSession: {
                    [_call_id: string]: any;
                };
            };
        }
    | { _type: "_UPDATE_CALL"; _payload: { _call_id: string; _status: CallStatus } }
    | { _type: "_HOLD_CALL"; _payload: string }
    | { _type: "_UNHOLD_CALL"; _payload: string }
    | { _type: "_MUTE_CALL"; _payload: string }
    | { _type: "_UNMUTE_CALL"; _payload: string }
    // | { type: "END_CALL"; payload: string }
    | { _type: "_FAILED_CALL"; _payload: string }
    | { _type: "_COMPLETE_CALL"; _payload: string }
    | { _type: "_RECORDING"; _payload: {_call_id: string; _recording: any} }
    |{ _type: "_SPEAKER_ON"; _payload: string }
    |{ _type: "_SPEAKER_OFF"; _payload: string }
    

/**
 * SIP state reducer
 * @param state - Current state
 * @param action - Action to perform
 */
export function sipReducer(_state: SipState, _action: SipAction): SipState {
    const { _type, _payload  } = _action;
    if (_type === '_SET_STATUS') {
      console.log("Inside _SET_STATUS reducer", {action:_action, state:_state});
      return { ..._state, _status: _payload };
    } else if (_type === '_SET_NUMBER') {
      console.log("Inside _SET_NUMBER reducer", {action:_action, state:_state});
      return { ..._state, _number: _payload };
    } else if (_type === '_NEW_CALL') {
      console.log("Inside _NEW_CALL reducer", {action:_action, state:_state});
      let _uaSessions = { ..._state._uaSessions, ..._payload._uaSession };
      let _uiSessions = { ..._state._uiSessions, ..._payload._uiSession };
      return { ..._state, _uaSessions, _uiSessions };
    } else if (_type === '_UPDATE_CALL') {
      console.log("Inside _UPDATE_CALL reducer", {action:_action, state:_state});
      let { _uiSessions, _uaSessions } = _state;
      if (_payload._status === 'connected') {
        Object.keys(_uiSessions)?.forEach((_key) => {
          if (
            _key !== _payload._call_id &&
            _uiSessions[_key]._status === 'connected'
          ) {
            _uaSessions[_key].hold();
            _uiSessions[_key] = {
              ..._uiSessions[_key],
              _status: 'hold',
              _active: false,
            };
          }
        });
      }
      _uiSessions[_payload._call_id] = {
        ..._uiSessions[_payload._call_id],
        _status: _payload._status,
        _active: true,
        _joined_at: moment.utc().valueOf(),
      };
      return { ..._state, _uiSessions };
    } else if (_type === '_HOLD_CALL') {
      console.log("Inside _HOLD_CALL reducer", {action:_action, state:_state});
      let { _uiSessions } = _state;
      _uiSessions[_payload] = { ..._uiSessions[_payload], _status: 'hold' };
      return { ..._state, _uiSessions };
    } else if (_type === '_UNHOLD_CALL' || _type === '_UNMUTE_CALL') {
      console.log("Inside _UNHOLD_CALL reducer", {action:_action, state:_state});
      let { _uiSessions, _uaSessions } = _state;
      if (_type === '_UNHOLD_CALL') {
        Object.keys(_uiSessions)?.forEach((_key) => {
          if (_key !== _payload && _uiSessions[_key]._status === 'connected') {
            _uaSessions[_key].hold();
            _uiSessions[_key] = {
              ..._uiSessions[_key],
              _status: 'hold',
              _active: false,
            };
          }
        });
      }
      _uiSessions[_payload] = {
        ..._uiSessions[_payload],
        _status: 'connected',
        _active: true,
      };
      return { ..._state, _uiSessions };
    } else if (_type === '_MUTE_CALL') {
      console.log("Inside _MUTE_CALL reducer", {action:_action, state:_state});
      let { _uiSessions } = _state;
      _uiSessions[_payload] = { ..._uiSessions[_payload], _status: 'mute' };
      return { ..._state, _uiSessions };
    } else if (_type === '_RECORDING') {
      console.log("Inside _RECORDING reducer", {action:_action, state:_state});
      let { _uiSessions } = _state;
      _uiSessions[_payload._call_id] = {
        ..._uiSessions[_payload._call_id],
        _recording: _payload._recording,
      };
      return { ..._state, _uiSessions };
    } else if (_type === '_FAILED_CALL' || _type === '_COMPLETE_CALL') {
      console.log("Inside _FAILED_CALL reducer", {action:_action, state:_state});
      let { _uaSessions, _uiSessions } = _state;
      delete _uaSessions[_payload];
      delete _uiSessions[_payload];
      return { ..._state, _uaSessions, _uiSessions };
    } else {
      return _state;
    }
}
