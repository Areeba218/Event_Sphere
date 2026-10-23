import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN } from './api';

const EVENTS = ['event:changed', 'notification:new', 'message:new', 'schedule:changed', 'booths:changed', 'analytics:changed'];

// Connects to the API's Socket.IO server. `handlers` maps event names to callbacks;
// `eventIds` are the events whose schedule/booth changes this client wants to hear about.
export function useRealtime(token, handlers, eventIds) {
  const handlersRef = useRef(handlers);
  const idsRef = useRef(eventIds);
  const socketRef = useRef(null);

  useEffect(() => { handlersRef.current = handlers; });
  useEffect(() => {
    idsRef.current = eventIds;
    eventIds.forEach((id) => socketRef.current?.emit('event:join', id));
  }, [eventIds]);

  useEffect(() => {
    const socket = io(API_ORIGIN, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => idsRef.current.forEach((id) => socket.emit('event:join', id))); // also re-joins after reconnects
    EVENTS.forEach((name) => socket.on(name, (payload) => handlersRef.current[name]?.(payload)));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [token]);
}
