import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './ManagerPanel.css';

export default function ManagerPanel() {
  const [chats, setChats] = useState([]);
  const [selectedClient, setSelected] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:3001/api/chats')
      .then(res => setChats(res.data))
      .catch(err => console.error('Ошибка загрузки чатов:', err));

    const socket = io('http://localhost:3001');
    socket.emit('manager-join');

    socket.on('message', msg => {
      setChats(prev => {
        const updated = [...prev];
        const chat = updated.find(c => c.clientId === msg.clientId);
        if (chat) chat.messages.push(msg);
        else updated.push({ clientId: msg.clientId, messages: [msg] });
        return updated;
      });

      if (selectedClient?.clientId === msg.clientId) {
        setSelected(prev => ({ ...prev, messages: [...prev.messages, msg] }));
      }
    });

    return () => socket.disconnect();
  }, [selectedClient]);

  return (
    <div className="manager-panel">
      <aside className="chat-list">
        <h2>Пользователи</h2>
        {chats.map(chat => (
          <div key={chat.clientId} className={`chat-user ${selectedClient?.clientId === chat.clientId ? 'active' : ''}`} onClick={() => setSelected(chat)}>
            <strong>{chat.clientId.slice(0, 8)}</strong><br />
            <span className="last">{chat.messages.at(-1)?.text}</span>
          </div>
        ))}
      </aside>
      <main className="chat-window">
        {selectedClient ? (
          <>
            <h3>Переписка: {selectedClient.clientId}</h3>
            <div className="messages">
              {selectedClient.messages.map((msg, idx) => (
                <div key={idx} className={`msg ${msg.from}`}>
                  <b>{msg.from}:</b> {msg.text}
                  <span className="t">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>Выберите пользователя для просмотра переписки</p>
        )}
      </main>
    </div>
  );
}