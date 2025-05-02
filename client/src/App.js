import React, { useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [view, setView]               = useState('login');
  const [currentUser, setCurrentUser] = useState('');
  const [password, setPassword]       = useState('');
  const [token, setToken]             = useState('');
  const [doc, setDoc]                 = useState('');
  const [presence, setPresence]       = useState([]);
  const [cursors, setCursors]         = useState({});
  const [historyList, setHistoryList] = useState([]);
  const socketRef = useRef(null);

  // 1) Connect to socket.io with auth
  const connectSocket = (authToken, username) => {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(API_BASE, {
      auth: { token: authToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('⚡ Connected to server, socket id=', socket.id));
    socket.on('init', (initial) => {
      console.log('📥 Received init:', initial);
      setDoc(initial);
    });
    socket.on('update', (updated) => {
      console.log('📥 Received update:', updated);
      setDoc(updated);
    });
    socket.on('presence', (list) => {
      console.log('📥 Presence list:', list);
      setPresence(list);
    });
    socket.on('cursor', ({ user, position }) => {
      console.log(`📥 Cursor from ${user} @${position}`);
      if (user !== username) {
        setCursors(prev => ({ ...prev, [user]: position }));
      }
    });
    socket.on('disconnect', () => console.log('🔒 Disconnected'));
  };

  // 2) Registration
  const handleRegister = async () => {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, password }),
    });
    if (!res.ok) return alert('Register failed');
    const data = await res.json();
    setToken(data.token);
    setCurrentUser(data.username);
    connectSocket(data.token, data.username);
    setView('editor');
  };

  // 3) Login
  const handleLogin = async () => {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, password }),
    });
    if (!res.ok) return alert('Login failed');
    const data = await res.json();
    setToken(data.token);
    setCurrentUser(data.username);
    connectSocket(data.token, data.username);
    setView('editor');
  };

  // 4) Emit document changes
  const handleChange = (e) => {
    const text = e.target.value;
    console.log('📤 Emitting update:', text);
    setDoc(text);
    socketRef.current.emit('update', text);
  };

  // 5) Emit cursor position
  const handleCursor = (e) => {
    const payload = {
      user: currentUser,
      position: e.target.selectionStart
    };
    console.log('📤 Emitting cursor:', payload);
    socketRef.current.emit('cursor', payload);
  };

  // 6) Save version
  const handleSave = async () => {
    await fetch(`${API_BASE}/api/history/save`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    alert('Document saved!');
  };

  // 7) Load history list
  const loadHistory = async () => {
    const res = await fetch(`${API_BASE}/api/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert('Could not load history');
    const list = await res.json();
    setHistoryList(list);
    setView('history');
  };

  // 8) Roll back to a past version
  const rollback = async (id) => {
    await fetch(`${API_BASE}/api/history/${id}/rollback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setView('editor');
  };

  // —— RENDERING ——

  // Login / Register screen
  if (view === 'login') {
    return (
      <div className="login centered">
        <div className="form-container">
          <h2>Login / Register</h2>
          <input
            placeholder="Username"
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="button-row">
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleRegister}>Register</button>
          </div>
        </div>
      </div>
    );
  }

  // History screen
  if (view === 'history') {
    return (
      <div className="editor-container">
        <button onClick={() => setView('editor')}>← Back</button>
        <h3>Version History</h3>
        <ul>
          {historyList.map((h) => (
            <li key={h.id}>
              <strong>{h.author}</strong> — {new Date(h.timestamp).toLocaleString()}
              <button onClick={() => rollback(h.id)}>Load</button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Main editor view
  return (
    <div className="editor-container">
      <div className="presence-bar">
        Online: {presence.map((u) => u.username).join(', ')}
      </div>
      <div style={{ position: 'relative' }}>
        <textarea
          value={doc}
          onChange={handleChange}
          onSelect={handleCursor}
        />
        <div className="cursors-overlay">
          {Object.entries(cursors).map(([user, pos]) => {
            const before = doc.slice(0, pos);
            const lines  = before.split('\n');
            const row    = lines.length - 1;
            const col    = lines[lines.length - 1].length;
            return (
              <div
                key={user}
                style={{
                  position: 'absolute',
                  top:  row * 24 + 8,
                  left: col * 10 + 8,
                  background: '#bb86fc',
                  padding: '2px 4px',
                  borderRadius: '4px',
                }}
              >
                {user}
              </div>
            );
          })}
        </div>
      </div>
      <div className="button-group">
        <button onClick={handleSave}>💾 Save</button>
        <button onClick={loadHistory}>📜 History</button>
      </div>
    </div>
  );
}

export default App;
