//DocumentEditor.jsx
// src/components/DocumentEditor.jsx

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export default function DocumentStylesEditor({ documentData, onSave, onChange }) {
  const [draft, setDraft] = useState(documentData || {});

  useEffect(() => {
    setDraft(documentData || {});
  }, [documentData]);

  const updateValue = (key, subKey, value) => {
    const updated = { ...draft };

    if (subKey) {
      updated[key] = {
        ...(draft[key] || {}),
        [subKey]: value,
      };
    } else {
      updated[key] = value;
    }

    setDraft(updated);
    if (onChange) onChange(updated); // ✅ Notify parent of change
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3>Document Styles</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '600px' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Type</th>
            <th style={{ borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Field</th>
            <th style={{ borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {/* Page Size */}
          <tr>
            <td rowSpan="2" style={{ padding: '0.5rem', verticalAlign: 'top' }}>Page Size</td>
            <td style={{ padding: '0.5rem' }}>Width</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.pageSize?.width || 0}
                onChange={e => updateValue('pageSize', 'width', parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Height</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.pageSize?.height || 0}
                onChange={e => updateValue('pageSize', 'height', parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>

          {/* Margins */}
          <tr>
            <td rowSpan="4" style={{ padding: '0.5rem', verticalAlign: 'top' }}>Margins</td>
            <td style={{ padding: '0.5rem' }}>Top</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.topMargin || 0}
                onChange={e => updateValue('topMargin', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Left</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.leftMargin || 0}
                onChange={e => updateValue('leftMargin', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Bottom</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.bottomMargin || 0}
                onChange={e => updateValue('bottomMargin', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Right</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.rightMargin || 0}
                onChange={e => updateValue('rightMargin', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>

          {/* Others */}
          <tr>
            <td rowSpan="2" style={{ padding: '0.5rem', verticalAlign: 'top' }}>Other</td>
            <td style={{ padding: '0.5rem' }}>Group Padding Bottom</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.groupPaddingBottom || 0}
                onChange={e => updateValue('groupPaddingBottom', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Bottom Page Threshold</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.bottomPageThreshold || 0}
                onChange={e => updateValue('bottomPageThreshold', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <button
        style={{ marginTop: '1rem' }}
        onClick={() => {
          onSave(draft);
          toast.success("Document JSON saved!");
        }}
      >
        Save Document JSON
      </button>
    </div>
    
  );
}

