/**
 * Live-session socket. Intentionally separate from NotificationContext so a
 * live-room reconnect cannot drop or rejoin the per-user notification room.
 */
import { io, Socket } from 'socket.io-client';
import { apiBaseUrl } from './env';

export function createLiveSocket(token: string): Socket {
    return io(apiBaseUrl(), {
        path: '/socket.io/',
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        withCredentials: false,
        timeout: 20000,
        auth: { token },
    });
}
