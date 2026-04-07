import { writable } from 'svelte/store';

export type RealtimeEvent =
  | { type: 'post_update'; postId: string; updates: { score?: number; upvotes?: number; downvotes?: number; commentCount?: number; userVote?: number } }
  | { type: 'new_post'; post: any }
  | { type: 'new_comment'; postId: string; comment: any }
  | { type: 'vote_update'; postId: string; score: number; userVote: number }
  | { type: 'online_count'; count: number }
  | { type: 'community_online_count'; community: string; count: number };

type RealtimeState = {
  connected: boolean;
  onlineCount: number;
  communityOnlineCounts: Record<string, number>;
  lastUpdate: number;
  currentCommunity?: string;
};

const initialState: RealtimeState = {
  connected: false,
  onlineCount: 0,
  communityOnlineCounts: {},
  lastUpdate: 0,
  currentCommunity: undefined,
};

function createRealtimeStore() {
  const { subscribe, set, update } = writable<RealtimeState>(initialState);

  let eventSource: EventSource | null = null;

  const listeners = new Set<(event: RealtimeEvent) => void>();

  function emit(event: RealtimeEvent) {
    listeners.forEach(listener => listener(event));
    update(s => ({ ...s, lastUpdate: Date.now() }));
  }

  function connect(community?: string) {
    if (typeof window === 'undefined') return;

    console.log('[Realtime] Connecting to community:', community);
    disconnect();

    const url = community ? `/api/realtime?community=${encodeURIComponent(community)}` : '/api/realtime';
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[Realtime] SSE connected to', community || 'global');
      update(s => ({ ...s, connected: true, currentCommunity: community }));
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeEvent;

        if (data.type === 'online_count') {
          update(s => ({ ...s, onlineCount: data.count }));
        } else if (data.type === 'community_online_count') {
          update(s => ({
            ...s,
            communityOnlineCounts: {
              ...s.communityOnlineCounts,
              [data.community]: data.count
            }
          }));
        } else {
          emit(data);
        }
      } catch (e) {
        console.error('[Realtime] Parse error:', e);
      }
    };

    eventSource.onerror = () => {
      console.log('[Realtime] SSE error');
      update(s => ({ ...s, connected: false }));
    };
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    update(s => ({ ...s, connected: false, communityOnlineCounts: {} }));
  }

  function on(listener: (event: RealtimeEvent) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function requestUpdate(postId: string) {
    fetch(`/api/realtime/updates?postId=${postId}`, { method: 'POST' });
  }

  function sendActivity() {
    // Send activity update to keep user online
    // This is a no-op for SSE, but keeps the API consistent
  }

  return {
    subscribe,
    on,
    connect,
    disconnect,
    requestUpdate,
    sendActivity,
  };
}

export const realtime = createRealtimeStore();