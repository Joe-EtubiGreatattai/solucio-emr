import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getToken } from '../api.js';

// One shared connection. The server only says "something changed"; screens refetch through the API.
let socket = null;
function connect() {
  if (socket || !getToken()) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL || '/', { path: import.meta.env.VITE_SOCKET_PATH || '/socket.io', auth: { token: getToken() }, transports: ['websocket', 'polling'] });
  return socket;
}
export function disconnectLive() {
  socket?.disconnect();
  socket = null;
}

/** Calls onChange (debounced) whenever one of these resources changes anywhere in the hospital. */
export function useLive(resources, onChange) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = resources.join(',');
  useEffect(() => {
    const s = connect();
    if (!s) return undefined;
    let t;
    const handler = (e) => {
      if (!key.split(',').includes(e.resource)) return;
      clearTimeout(t);
      t = setTimeout(() => cb.current?.(e), 250);
    };
    s.on('changed', handler);
    // Refresh when the connection comes back, in case something was missed
    const again = () => cb.current?.({ resource: 'reconnect' });
    s.io.on('reconnect', again);
    return () => { clearTimeout(t); s.off('changed', handler); s.io.off('reconnect', again); };
  }, [key]);
}
