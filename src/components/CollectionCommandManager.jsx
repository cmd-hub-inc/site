import React, { useMemo, useState } from 'react';
import { Plus, X, AlertCircle, Trash2 } from 'lucide-react';
import { addCommandToCollection, removeCommandFromCollection, fetchCommands } from '../api';
import CommandCard from './CommandCard';
import { C } from '../constants';

export default function CollectionCommandManager({
  collection,
  onUpdate,
  onCommandAdded,
  onCommandRemoved,
  isOwner = false,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableCommands, setAvailableCommands] = useState([]);
  const [loadingCommands, setLoadingCommands] = useState(false);

  const handleAddCommand = async (commandId) => {
    setError('');
    setLoading(true);
    try {
      const addedCommand = await addCommandToCollection(collection.id, commandId);
      if (onCommandAdded) onCommandAdded(addedCommand);
      else onUpdate?.();
    } catch (err) {
      setError(err.message || 'Failed to add command');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCommand = async (commandId) => {
    if (!window.confirm('Are you sure you want to remove this command from the collection?')) {
      return;
    }

    setError('');
    setLoading(true);
    try {
      await removeCommandFromCollection(collection.id, commandId);
      if (onCommandRemoved) onCommandRemoved(commandId);
      else onUpdate?.();
    } catch (err) {
      setError(err.message || 'Failed to remove command');
    } finally {
      setLoading(false);
    }
  };

  const safeCollectionCommands = (collection.commands || []).filter(Boolean);
  const collectionCommandIds = new Set(safeCollectionCommands.map((c) => c.id).filter(Boolean));

  const filteredCommands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableCommands;
    return availableCommands.filter((cmd) => {
      const name = String(cmd.name || '').toLowerCase();
      const desc = String(cmd.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [availableCommands, searchQuery]);

  const openAddModal = async () => {
    setShowAddModal(true);
    setLoadingCommands(true);
    setError('');
    try {
      const rows = await fetchCommands();
      const list = Array.isArray(rows) ? rows : [];
      setAvailableCommands(list);
    } catch (err) {
      setError(err.message || 'Failed to load commands');
      setAvailableCommands([]);
    } finally {
      setLoadingCommands(false);
    }
  };

  return (
    <div>
      {error && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            padding: '10px 12px',
            background: 'rgba(237,66,69,0.14)',
            border: '1px solid rgba(237,66,69,0.35)',
            borderRadius: 8,
            color: C.red,
            marginBottom: 10,
            fontSize: 14,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {isOwner && (
        <button
          onClick={openAddModal}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: 'none',
            background: C.blurple,
            color: C.white,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            marginBottom: 14,
          }}
        >
          <Plus size={18} />
          Add Commands to Collection
        </button>
      )}

      {safeCollectionCommands.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12 }}>
          {safeCollectionCommands.map((command) => (
            <div key={command.id} style={{ position: 'relative' }}>
              <CommandCard cmd={command} />
              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveCommand(command.id);
                  }}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    border: '1px solid rgba(237,66,69,0.35)',
                    borderRadius: 999,
                    padding: '6px 10px',
                    background: 'rgba(32,34,37,0.9)',
                    color: C.red,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                  }}
                  title="Remove from collection"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '28px 8px', color: C.muted }}>
          <p>No commands in this collection yet.</p>
          {isOwner && <p style={{ fontSize: 13 }}>Add commands to get started.</p>}
        </div>
      )}

      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 300,
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 760,
              maxHeight: '80vh',
              overflow: 'auto',
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 18,
            }}
          >
            <h3 style={{ margin: '0 0 12px', color: C.text, fontSize: 20 }}>Add Commands to Collection</h3>

            <input
              type="text"
              placeholder="Search commands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.surface2,
                color: C.text,
                marginBottom: 12,
              }}
            />

            <div style={{ display: 'grid', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {loadingCommands ? (
                <p style={{ color: C.muted, textAlign: 'center', padding: 16 }}>Loading commands...</p>
              ) : filteredCommands.length > 0 ? (
                filteredCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      alignItems: 'center',
                      padding: 10,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      background: C.surface2,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, color: C.text, fontWeight: 600 }}>{cmd.name}</p>
                      <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>{cmd.description}</p>
                    </div>
                    <button
                      onClick={() => handleAddCommand(cmd.id)}
                      disabled={loading || collectionCommandIds.has(cmd.id)}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 10px',
                        minWidth: 64,
                        background: collectionCommandIds.has(cmd.id) ? C.surface3 : C.blurple,
                        color: C.white,
                        cursor: loading || collectionCommandIds.has(cmd.id) ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        fontWeight: 600,
                      }}
                    >
                      {collectionCommandIds.has(cmd.id) ? 'Added' : 'Add'}
                    </button>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: C.muted, padding: '12px 0' }}>No commands found</p>
              )}
            </div>

            <button
              onClick={() => setShowAddModal(false)}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.surface2,
                color: C.text,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
