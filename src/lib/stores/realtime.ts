import { writable } from 'svelte/store';

export type RealtimeEvent = 
  | { type: 'post_update'; postId: string; updates: { score?: number; upvotes?: number; downvotes?: number; commentCount?: number; userVote?: number } }
  | { type: 'new_post'; post: any }
  | { type: 'new_comment'; postId: string; comment: any }
  | { type: 'vote_update'; postId: string; score: number; userVote: number };

type RealtimeState = {
  connected: boolean;
  lastUpdate: number;
};

const initialState: RealtimeState = {
  connected: false,
  lastUpdate: 0,
};

function createRealtimeStore() {
  const { subscribe, set, update } = writable<RealtimeState>(initialState);
  
  let eventSource: EventSource | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  
  const listeners = new Set<(event: RealtimeEvent) => void>();

  function emit(event: RealtimeEvent) {
    listeners.forEach(listener => listener(event));
    update(s => ({ ...s, lastUpdate: Date.now() }));
  }

  function connect() {
    if (typeof window === 'undefined') return;

    disconnect();

    eventSource = new EventSource('/api/realtime');

    eventSource.onopen = () => {
      console.log('[Realtime] SSE connected');
      update(s => ({ ...s, connected: true }));
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeEvent;
        emit(data);
      } catch (e) {
        console.error('[Realtime] Parse error:', e);
      }
    };

    eventSource.onerror = () => {
      console.log('[Realtime] SSE error, falling back to polling');
      disconnect();
      startPolling();
    };
  }

  function startPolling() {
    if (pollInterval) return;
    
    update(s => ({ ...s, connected: false }));
    
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/realtime/updates?_=' + Date.now(), { 
          headers: { 'Cache-Control': 'no-cache' } 
        });
        if (res.ok) {
          const data = await res.json();
          if (data.updates?.length) {
            data.updates.forEach((update: RealtimeEvent) => emit(update));
          }
        }
      } catch (e) {
        console.error('[Realtime] Poll error:', e);
      }
    }, 15000);
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    update(s => ({ ...s, connected: false }));
  }

  function on(listener: (event: RealtimeEvent) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function requestUpdate(postId: string) {
    fetch(`/api/realtime/updates?postId=${postId}`, { method: 'POST' });
  }

  return {
    subscribe,
    on,
    connect,
    disconnect,
    requestUpdate,
  };
}

export const realtime = createRealtimeStore();