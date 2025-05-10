import { useEffect } from 'react';

const useWebSocket = (userId: number) => {
  useEffect(() => {
    const socket = new WebSocket('ws://127.0.0.1:8000/ws');

    socket.onopen = () => {
      console.log('WebSocket connected');
      // Register the user with the WebSocket server
      socket.send(JSON.stringify({ type: 'register', userId }));
    };

    socket.onmessage = (event) => {
      console.log('Message from server:', event.data);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      socket.close();
    };
  }, [userId]); // Reconnect if userId changes
};

export default useWebSocket;