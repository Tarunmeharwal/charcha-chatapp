import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socket = null;

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
    }
    return socket;
};

export const connectSocket = (userId) => {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
        s.emit("setup", userId);
    }
    return s;
};

export const disconnectSocket = () => {
    if (socket && socket.connected) {
        socket.disconnect();
    }
};
