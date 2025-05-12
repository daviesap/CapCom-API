import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function ColumnsEditor({ columnsData, onSave }) {
  const [draft, setDraft] = useState(columnsData || []);

  useEffect(() => {
    setDraft(columnsData || []);
  }, [columnsData]);

  const handleChange = (index, key, value) => {
    const updated = [...draft];
    updated[index] = { ...updated[index], [key]: value };
    setDraft(updated);
  };

  const handleAddColumn = () => {
    setDraft([
      ...draft,
      { field: `Column ${draft.length + 1}`, label: `Label ${draft.length + 1}`, width: 50, showLabel: true },
    ]);
  };

  const handleRemoveColumn = (index) => {
    const updated = [...draft];
    updated.splice(index, 1);
    setDraft(updated);
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3>Columns</h3>
      {draft.map((col, i) => (
        <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            Field:
            <input
              type="text"
              value={col.field}
              onChange={e => handleChange(i, 'field', e.target.value)}
              style={{ marginTop: '0.25rem' }}
            />
          </label>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            Label:
            <input
              type="text"
              value={col.label}
              onChange={e => handleChange(i, 'label', e.target.value)}
              style={{ marginTop: '0.25rem' }}
            />
          </label>
          <label style={{ flex: 0.5, display: 'flex', flexDirection: 'column' }}>
            Width:
            <input
              type="number"
              value={col.width}
              onChange={e => handleChange(i, 'width', parseInt(e.target.value, 10) || 0)}
              style={{ marginTop: '0.25rem' }}
            />
          </label>
          <label style={{ flex: 0.5, display: 'flex', flexDirection: 'column' }}>
            Show Label:
            <input
              type="checkbox"
              checked={col.showLabel}
              onChange={e => handleChange(i, 'showLabel', e.target.checked)}
              style={{ marginTop: '0.5rem' }}
            />
          </label>
          <button onClick={() => handleRemoveColumn(i)} style={{ height: '2rem' }}>Remove</button>
        </div>
      ))}
      <button onClick={handleAddColumn} style={{ marginRight: '1rem' }}>Add Column</button>
      <button
       onClick={() => {
        onSave(draft);
      toast.success("Columns JSON saved!");
        }}
        >Save Column JSON
        </button>
    </div >
  );
}