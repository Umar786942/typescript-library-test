/**
 * Event handlers for SIP sessions
 */
import JsSIP from "jssip";
import { CallStatus } from "./types";

interface EventHandlersOptions {
  onStatusChange: (status: CallStatus) => void;
  onEnd: () => void;
  onFail: () => void;
  onHold: () => void;
  onUnhold: () => void;
  onMute: () => void;
  onUnmute: () => void;
  onRecording: (event: any) => void;
}

/**
 * Setup event handlers for a SIP session
 * @param session - The JsSIP session
 * @param callId - The call ID
 * @param handlers - Event handler callbacks
 */
export function eventHandlers(
  session: any,
  callId: string,
  handlers: EventHandlersOptions
): void {
  let iceCandidateTimeout: ReturnType<typeof setTimeout> | null = null;
  const _audioObj = new Audio();

  // Add media stream to audio element
  session.on("peerconnection", (data: any) => {
    data.peerconnection.addEventListener("addstream", (e: any) => {
      const element = document.getElementById(callId);
      if (element && e.stream) {
        (element as HTMLAudioElement).srcObject = e.stream;
        (element as HTMLAudioElement).play().catch(console.error);
      }
    });
  });

  // Session event handlers
  session.on("connecting", () => {
    handlers.onStatusChange("connecting");
  });

  session.on("confirmed", () => {
    _audioObj.srcObject = session?.connection?.getRemoteStreams()?.[0];
    _audioObj.play();
   
    handlers.onStatusChange("connected");
  });

  session.on("progress", () => {
    handlers.onStatusChange("ringing");
  });

  session.on("accepted", () => {
    handlers.onStatusChange("connected");
  });

  session.on("failed", () => {
    handlers.onFail();
  });

  session.on("ended", () => {
    handlers.onEnd();
  });

  session.on("hold", () => {
    handlers.onHold();
  });

  session.on("unhold", () => {
    setTimeout(() => {
      _audioObj.srcObject = session?.connection?.getRemoteStreams()?.[0];
      _audioObj.play();
    }, 1000);
    handlers.onUnhold();
  });

  session.on("muted", () => {
    handlers.onMute();
  });

  session.on("unmuted", () => {
    _audioObj.srcObject = session?.connection?.getRemoteStreams()?.[0];
    _audioObj.play();
    handlers.onUnmute();
  });

  session.on("newDTMF", (e: any) => {
    console.log("DTMF received:", e);
  });

  session.on("newInfo", ({ info }: { info: any }) => {
    console.log("New info received:", info);
  });
  session.on("recording", (event: any) => {
    handlers.onRecording(event);
  });

  session.on("icecandidate", (candidate: any) => {
    if (iceCandidateTimeout) {
      clearTimeout(iceCandidateTimeout);
    }
    iceCandidateTimeout = setTimeout(candidate.ready, 3000);
  });
}
