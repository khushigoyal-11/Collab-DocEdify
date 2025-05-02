// App.js
import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const [view, setView]        = useState('login');         // 'login'|'editor'|'history'
  const [username, setUsername]= useState('');
  const [password, setPassword]= useState('');
  const [token, setToken]      = useState('');
  const [doc, setDoc]          = useState('');
  const [presence, setPresence]= useState([]);
  const [cursors, setCursors]  = useState({});
  const [historyList, setHistoryList] = useState([]);
  const socketRef = useRef(null);

  // Establish Socket.IO once
  const connectSocket = (jwt) => {
    if (socketRef.current) socketRef.current.disconnect();
    const socket = io('http://localhost:5000', { auth: { token: jwt } });
    socketRef.current = socket;
    socket.on('connect',     () => console.log('⚡ Connected'));
    socket.on('init',        setDoc);
    socket.on('update',      setDoc);
    socket.on('presence',    setPresence);
    socket.on('cursor',      ({username,position}) =>
      setCursors(prev=>({ ...prev, [username]: position }))
    );
    socket.on('disconnect',  () => console.log('🔒 Disconnected'));
  };

  // Auth handlers
  const handleRegister = async () => {
    const res = await fetch('/api/register',{ method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,password})});
    if(!res.ok) return alert('Register failed');
    const { token: jwt } = await res.json();
    setToken(jwt);
    connectSocket(jwt);
    setView('editor');
  };
  const handleLogin = async () => {
    const res = await fetch('/api/login',{ method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,password})});
    if(!res.ok) return alert('Login failed');
    const { token: jwt } = await res.json();
    setToken(jwt);
    connectSocket(jwt);
    setView('editor');
  };

  // Editor events
  const handleChange = e => {
    const text = e.target.value;
    setDoc(text);
    socketRef.current.emit('update', text);
  };
  const handleCursor = e => {
    socketRef.current.emit('cursor', e.target.selectionStart);
  };

  // HISTORY APIs
  const loadHistory = async () => {
    const res = await fetch('/api/history');
    const list = await res.json();
    setHistoryList(list);
    setView('history');
  };
  const saveVersion = async () => {
    await fetch('/api/history/save', { method: 'POST' });
    alert('Version saved');
  };
  const rollback = async (id) => {
    await fetch(`/api/history/${id}/rollback`, { method: 'POST' });
    setView('editor');
  };

  // RENDER
  if (view === 'login') {
    return (
      <div className="login centered">
        <div className="form-container">
          <h2>Login / Register</h2>
          <input placeholder="Username" value={username}
            onChange={e=>setUsername(e.target.value)} />
          <input type="password" placeholder="Password" value={password}
            onChange={e=>setPassword(e.target.value)} />
          <div className="button-row">
            <button onClick={handleLogin}>Login</button>
            <button onClick={handleRegister}>Register</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="editor-container">
        <button onClick={()=>setView('editor')}>← Back</button>
        <h3>Version History</h3>
        <ul>
          {historyList.map(h => (
            <li key={h.id}>
              {new Date(h.timestamp).toLocaleString()}
              <button onClick={()=>rollback(h.id)}>Load</button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Editor view
  return (
    <div className="editor-container">
      <div className="presence-bar">
        Online: {presence.map(u=>u.username).join(', ')}
        <button onClick={saveVersion} style={{marginLeft:12}}>
          Save Version
        </button>
        <button onClick={loadHistory} style={{marginLeft:8}}>
          History
        </button>
      </div>

      {/* Wrap textarea+overlay in a relative container */}
      <div style={{position:'relative'}}>
        <textarea
          value={doc}
          onChange={handleChange}
          onSelect={handleCursor}
          style={{ width:'100%', height:'60vh' }}
        />

        {/* Cursor labels inside textarea bounds */}
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
                     top: lineNo * 24 + 8,   // 24px line-height + 8px padding
                     left: colNo  * 10 + 8,   // 10px char + 8px padding
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
