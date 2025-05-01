// client/src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [text, setText] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    // 1) create socket here
    const socket = new WebSocket('ws://localhost:6000');
    socketRef.current = socket;

    socket.onopen = () => console.log('⚡ Connected to WS server');
    socket.onmessage = (ev) => {
      console.log('⏪ Received message:', ev.data);
      setText(ev.data);
    };
    socket.onclose = () => console.log('🔒 WS connection closed');
    socket.onerror = (err) => console.error('WS error', err);

    // 2) cleanup on real unmount
    return () => {
      console.log('🧹 Closing socket');
      socket.close();
    };
  }, []); // run once

  const handleChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    // 3) only send if open
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('⏫ Sending message:', newText);
      socketRef.current.send(newText);
    }
  };

  return (
    <div className="App">
      <h1>Collaborative Editor</h1>
      <textarea value={text} onChange={handleChange} />
    </div>
  );
}

export default App;
