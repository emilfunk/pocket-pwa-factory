import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { Plus, Check, Trash2, Smartphone, WifiOff } from 'lucide-react';

export default function App() {
  const [title, setTitle] = useState('');
  const items = useLiveQuery(() => db.items.reverse().sortBy('createdAt')) || [];

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await db.items.add({
      title: title.trim(),
      completed: false,
      createdAt: Date.now()
    });
    setTitle('');
  };

  const toggleItem = async (id: number, current: boolean) => {
    await db.items.update(id, { completed: !current });
  };

  const deleteItem = async (id: number) => {
    await db.items.delete(id);
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-background border-x border-border">
      {/* Mobile Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-lg">Pocket PWA</h1>
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          <WifiOff className="w-3.5 h-3.5 text-emerald-400" /> Offline First
        </span>
      </header>

      {/* Main List */}
      <main className="flex-1 p-4 overflow-y-auto space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No items stored yet.</p>
            <p className="text-xs mt-1">Add one below to test offline Dexie DB!</p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-xl border border-border bg-card transition ${
                item.completed ? 'opacity-50 line-through' : ''
              }`}
            >
              <button
                onClick={() => toggleItem(item.id!, item.completed)}
                className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                  item.completed ? 'bg-primary border-primary text-white' : 'border-muted-foreground'
                }`}
              >
                {item.completed && <Check className="w-3.5 h-3.5" />}
              </button>
              <span className="flex-1 mx-3 text-sm">{item.title}</span>
              <button
                onClick={() => deleteItem(item.id!)}
                className="text-muted-foreground hover:text-red-400 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </main>

      {/* Input Dock */}
      <footer className="sticky bottom-0 bg-card/90 backdrop-blur border-t border-border p-4">
        <form onSubmit={addItem} className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Type new item..."
            className="flex-1 bg-muted px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          />
          <button
            type="submit"
            className="bg-primary hover:bg-blue-600 active:scale-95 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center transition"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
