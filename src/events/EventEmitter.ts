type Listener = (...args: any[]) => void;

export class EventEmitter {
  private events: Record<string, Listener[]> = {};//{ "AUTH_CONNECT": [listener1],
  // "AUTH_DISCONNECT": [listener2] }

  on(event: string, listener: Listener): void {
    if (!this.events[event]) this.events[event] = [];// Initialize if event doesn't exist
    this.events[event].push(listener);// Add listener
  }

  emit(event: string, ...args: any[]): void {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));//Calls all listeners for an event with given arguments.(({ isConnected, username })=>setStatus({ isConnected, username }))
    }//while login emitting AUTH_CONNECT event and passing the status({ isConnected, username }) and when logout emitting AUTH_DISCONNECT event and passing the status
  }

  off(event: string, listener: Listener): void {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }
}