// client/src/App.js
import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [view, setView]          = useState('login');
  const [currentUser, setCurrentUser] = useState('');
  const [password, setPassword]  = useState('');
  const [token, setToken]        = useState('');
  const [doc, setDoc]            = useState('');
  const [presence, setPresence]  = useState([]);
  const [cursors, setCursors]    = useState({});
  const socketRef = useRef(null);

  const connectSocket = (jwt) => {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(API_BASE, { auth: { token: jwt }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => console.log('⚡ Connected'));
    socket.on('init',   (initial) => setDoc(initial));
    socket.on('update', (updated) => setDoc(updated));
    socket.on('presence', (list)  => setPresence(list));
    socket.on('cursor', ({ user, pos }) => {
      if (user !== currentUser) {
        setCursors(prev => ({ ...prev, [user]: pos }));
      }
    });
    socket.on('disconnect', () => console.log('🔒 Disconnected'));
  };

  const handleRegister = async () => {
    const res = await fetch(`${API_BASE}/api/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, password })
    });
    if (!res.ok) return alert('Register failed');
    const { token: jwt } = await res.json();
    setToken(jwt);
    connectSocket(jwt);
    setView('editor');
  };

  const handleLogin = async () => {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser, password })
    });
    if (!res.ok) return alert('Login failed');
    const { token: jwt } = await res.json();
    setToken(jwt);
    connectSocket(jwt);
    setView('editor');
  };

  const handleChange = e => {
    const text = e.target.value;
    setDoc(text);
    socketRef.current.emit('update', text);
  };

  const handleCursor = e => {
    socketRef.current.emit('cursor', { user: currentUser, pos: e.target.selectionStart });
  };

  const handleSave = async () => {
    await fetch(`${API_BASE}/api/history/save`, { method: 'POST' });
    alert('Document saved.');
  };

  const openHistory = async () => {
    const res = await fetch(`${API_BASE}/api/history`);
    if (!res.ok) return alert('Failed to load history');
    const data = await res.json();
    const list = data.map((h, i) => `${i+1}. ${new Date(h.timestamp).toLocaleString()}`);
    alert('History:\n' + list.join('\n'));
  };

  if (view === 'login') {
    return (
      <div className="login centered">
        <div className="form-container">
          <h2>Login / Register</h2>
          <input placeholder="Username" value={currentUser} onChange={e => setCurrentUser(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="button-row">
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleRegister}>Register</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="presence-bar">
        Online: {presence.map(u => u.username).join(', ')}
      </div>
      <div style={{ position: 'relative' }}>
        <textarea value={doc} onChange={handleChange} onSelect={handleCursor} />
        <div className="cursors-overlay">
          {Object.entries(cursors).map(([user, pos]) => {
            const before = doc.slice(0, pos);
            const lines = before.split('\n');
            const lineNo = lines.length - 1;
            const colNo = lines[lines.length - 1].length;
            return (
              <div key={user} style={{ position: 'absolute', top: lineNo * 24 + 8, left: colNo * 10 + 8 }}>
                {user}
              </div>
            );
          })}
        </div>
      </div>
      <div className="button-group">
        <button onClick={handleSave}>💾 Save</button>
        <button onClick={openHistory}>📜 History</button>
      </div>
    </div>
  );
}

export default App;