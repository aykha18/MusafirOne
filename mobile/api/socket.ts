import { io, Socket } from 'socket.io-client';
import { API_URL } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket: Socket | null = null;

export const connectSocket = async () => {
  const tokenRaw = await AsyncStorage.getItem('muhajirone_auth');
  if (!tokenRaw) return null;

  const { accessToken } = JSON.parse(tokenRaw);
  if (!accessToken) return null;

  if (socket?.connected) return socket;

  const socketUrl = API_URL.replace('/api', '');

  socket = io(socketUrl, {
    auth: {
      token: `Bearer ${accessToken}`,
    },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
