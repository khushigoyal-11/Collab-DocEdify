import React, { useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [view, setView]        = useState('login');
  const [user, setUser]        = useState('');     // currently typing username
  const [password, setPassword]= useState('');
  const [token, setToken]      = useState('');
  const [doc, setDoc]          = useState('');
  const [presence, setPresence]= useState([]);
  const [cursors, setCursors]  = useState({});
  const [historyList, setHistoryList] = useState([]);
  const socketRef = useRef(null);

  const connectSocket = (jwt, username) => {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io(API_BASE, { auth:{ token: jwt }, transports:['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => console.log('⚡ Connected'));
    socket.on('init',    d => setDoc(d));
    socket.on('update',  d => setDoc(d));
    socket.on('presence', list => setPresence(list));
    socket.on('cursor', ({ username: who, position }) => {
      if (who !== username) {
        setCursors(prev => ({ ...prev, [who]: position }));
      }
    });
    socket.on('disconnect', () => console.log('🔒 Disconnected'));
  };

  const handleRegister = async () => {
    const res = await fetch(`${API_BASE}/api/register`, { /* ... */ });
    /* after success: */
    setToken(jwt);
    connectSocket(jwt, user);
    setView('editor');
  };

  const handleLogin = async () => {
    const res = await fetch(`${API_BASE}/api/login`, { /* ... */ });
    /* after success: */
    setToken(jwt);
    connectSocket(jwt, user);
    setView('editor');
  };

  const handleChange = e => {
    const text = e.target.value;
    setDoc(text);
    socketRef.current.emit('update', text);
  };

  const handleCursor = e => {
    socketRef.current.emit('cursor', { username: user, position: e.target.selectionStart });
  };

  // **Save Version on Demand**
  const handleSave = async () => {
    const res = await fetch(`${API_BASE}/api/history/save`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` }
    });
    if (!res.ok) return alert('Save failed');
    alert('Saved!');
  };

  // **Load History List**
  const loadHistory = async () => {
    const res = await fetch(`${API_BASE}/api/history`, {
      headers: { Authorization:`Bearer ${token}` }
    });
    const list = await res.json();
    setHistoryList(list);
    setView('history');
  };

  // **Rollback**
  const rollback = async (id) => {
    await fetch(`${API_BASE}/api/history/${id}/rollback`, {
      method: 'POST',
      headers: { Authorization:`Bearer ${token}` }
    });
    setView('editor');
  };

  // … render login same as before …

  if (view === 'history') {
    return (
      <div className="editor-container">
        <h3>Version History</h3>
        <button onClick={()=>setView('editor')}>Back</button>
        <ul>
          {historyList.map(h => (
            <li key={h.id}>
              <strong>{h.author}</strong> —{' '}
              {new Date(h.timestamp).toLocaleString()}{' '}
              <button onClick={()=>rollback(h.id)}>Load</button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // --- Editor view ---
  return (
    <div className="editor-container">
      <div className="presence-bar">
        Online: {presence.map(u=>u.username).join(', ')}
      </div>
      <div style={{position:'relative'}}>
        <textarea
          value={doc}
          onChange={handleChange}
          onSelect={handleCursor}
          style={{width:'100%', height:'60vh'}}
        />
        <div className="cursors-overlay">
          {Object.entries(cursors).map(([who,pos])=>{
            const lines = doc.slice(0,pos).split('\\n');
            const row   = lines.length-1;
            const col   = lines[lines.length-1].length;
            return (
              <div key={who}
                   style={{
                     position:'absolute',
                     top: row*24 + 8,
                     left: col*10 + 8,
                     padding:'2px 4px',
                     background:'#bb86fc',
                     borderRadius:'4px'
                   }}>
                {who}
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
