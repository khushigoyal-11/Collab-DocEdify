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

  // Initialize socket connection; takes token and username
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

    // Log every incoming cursor message
    socket.on('cursor', ({ user, position }) => {
      console.log(`📥 Cursor from ${user} @${position}`);
      if (user !== username) {
        setCursors(prev => ({ ...prev, [user]: position }));
      }
    });

    socket.on('disconnect', () => console.log('🔒 Disconnected'));
  };

  const handleRegister = async () => {
    /* … no changes here … */
  };

  const handleLogin = async () => {
    /* … no changes here … */
  };

  const handleChange = (e) => {
    const text = e.target.value;
    console.log('📤 Emitting update:', text);
    setDoc(text);
    socketRef.current.emit('update', text);
  };

  const handleCursor = (e) => {
    const payload = {
      user: currentUser,
      position: e.target.selectionStart
    };
    console.log('📤 Emitting cursor:', payload);
    socketRef.current.emit('cursor', payload);
  };

  const handleSave = async () => { /* … */ };
  const loadHistory = async () => { /* … */ };
  const rollback     = async (id) => { /* … */ };

  // … rest of your render logic (login/history/editor) stays unchanged …
}

export default App;
