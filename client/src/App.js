// client/src/App.js
import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Base URL for API calls: uses env var in production, empty string locally
const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [view, setView]         = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken]       = useState('');
  const [doc, setDoc]           = useState('');
  const [presence, setPresence] = useState([]);
  const [cursors, setCursors]   = useState({});
  const socketRef = useRef(null);

  // Connect to Socket.IO server once we have a JWT
  const connectSocket = (jwt) => {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(API_BASE, {
      auth: { token: jwt },
      transports: ['websocket'],
    });
    
    socketRef.current = socket;

    socket.on('connect',     () => console.log('⚡ Connected'));
    socket.on('init',        (initial)       => setDoc(initial));
    socket.on('update',      (updated)       => setDoc(updated));
    socket.on('presence',    (list)          => setPresence(list));
    socket.on('cursor',      ({username,pos}) =>
      setCursors(prev => ({ ...prev, [username]: pos }))
    );
    socket.on('disconnect',  () => console.log('🔒 Disconnected'));
  };

  // Register
  const handleRegister = async () => {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) return alert('Register failed');
    const { token: jwt } = await res.json();
    setToken(jwt);
    connectSocket(jwt);
    setView('editor');
  };

  // Login
  const handleLogin = async () => {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) return alert('Login failed');
    const { token: jwt } = await res.json();
    setToken(jwt);
    connectSocket(jwt);
    setView('editor');
  };

  // Text change
  const handleChange = e => {
    const text = e.target.value;
    setDoc(text);
    socketRef.current.emit('update', text);
  };

  // Cursor move
  const handleCursor = e => {
    socketRef.current.emit('cursor', e.target.selectionStart);
  };

  // Login/Register view
  if (view === 'login') {
    return (
      <div className="login centered">
        <div className="form-container">
          <h2>Login / Register</h2>
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <div className="button-row">
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleRegister}>Register</button>
          </div>
        </div>
      </div>
    );
  }

  // Editor view
  return (
    <div className="editor-container">
      <div className="presence-bar">
        Online: {presence.map(u => u.username).join(', ')}
      </div>

      <div style={{ position: 'relative' }}>
        <textarea
          value={doc}
          onChange={handleChange}
          onSelect={handleCursor}
        />

        <div className="cursors-overlay">
          {Object.entries(cursors).map(([user,pos]) => {
            const before = doc.slice(0,pos);
            const lines  = before.split('\n');
            const lineNo = lines.length - 1;
            const colNo  = lines[lines.length - 1].length;
            return (
              <div key={user}
                   style={{
                     position:'absolute',
                     top: lineNo * 24 + 8,
                     left: colNo * 10 + 8,
                   }}>
                {user}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
