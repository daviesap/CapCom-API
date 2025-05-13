import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import ProfileStylesViewer from "../components/StylesEditor";

function DocumentEditor({ documentData, onSave }) {
  const [draft, setDraft] = useState(documentData);

  useEffect(() => {
    setDraft(documentData);
  }, [documentData]);

  const updateValue = (key, subKey, value) => {
    if (subKey) {
      setDraft({
        ...draft,
        [key]: {
          ...draft[key],
          [subKey]: value,
        },
      });
    } else {
      setDraft({
        ...draft,
        [key]: value,
      });
    }
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
                value={draft.pageSize.width}
                onChange={e => updateValue('pageSize', 'width', parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Height</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.pageSize.height}
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
                value={draft.topMargin}
                onChange={e => updateValue('topMargin', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Left</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.leftMargin}
                onChange={e => updateValue('leftMargin', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Bottom</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.bottomMargin}
                onChange={e => updateValue('bottomMargin', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Right</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.rightMargin}
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
                value={draft.groupPaddingBottom}
                onChange={e => updateValue('groupPaddingBottom', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.5rem' }}>Bottom Page Threshold</td>
            <td style={{ padding: '0.5rem' }}>
              <input
                type="number"
                value={draft.bottomPageThreshold}
                onChange={e => updateValue('bottomPageThreshold', null, parseFloat(e.target.value) || 0)}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <button style={{ marginTop: '1rem' }} onClick={() => onSave(draft)}>Save Document JSON</button>
    </div>
  );
}

function ColumnsEditor({ columnsData, onSave }) {
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
      <h3>Columns OLD</h3>
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
      <button onClick={() => onSave(draft)}>Save Column JSON</button>
    </div>
  );
}

function ViewProfile({ profileId }) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [editingPath, setEditingPath] = useState(null);
  const [ setPreviewStyle] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "styleProfiles", profileId));
      if (snap.exists()) {
        setProfileData(snap.data());
      }
    };
    fetchProfile();
  }, [profileId]);

  const handleStyleSave = async (newValue) => {
    if (!editingPath) return;
    const updatedStyles = { ...profileData.styles };

    if (editingPath.length === 1) {
      updatedStyles[editingPath[0]] = newValue;
    } else if (editingPath.length === 2) {
      updatedStyles[editingPath[0]] = {
        ...updatedStyles[editingPath[0]],
        [editingPath[1]]: newValue,
      };
    }

    const updatedProfile = { ...profileData, styles: updatedStyles };
    await updateDoc(doc(db, "styleProfiles", profileId), { styles: updatedStyles });

    setProfileData(updatedProfile);
    setEditingPath(null);
    setPreviewStyle(null);
  };

  const handleDocumentSave = async (newDoc) => {
    const updatedProfile = { ...profileData, document: newDoc };
    await updateDoc(doc(db, "styleProfiles", profileId), { document: newDoc });
    setProfileData(updatedProfile);
  };

  const handleColumnsSave = async (newCols) => {
    const updatedProfile = { ...profileData, columns: newCols };
    await updateDoc(doc(db, "styleProfiles", profileId), { columns: newCols });
    setProfileData(updatedProfile);
  };

  if (!profileData) return <p>Loading profile data...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>Profile Viewer</h2>
      <p><strong>Profile ID:</strong> {profileId}</p>
      <p><strong>Profile Name:</strong> {profileData.name || "(unnamed)"}</p>

      <h3>Styles</h3>
      <ProfileStylesViewer
        styles={profileData.styles}
        editingStyle={
          editingPath
            ? editingPath.length === 1
              ? profileData.styles?.[editingPath[0]]
              : profileData.styles?.[editingPath[0]]?.[editingPath[1]]
            : null
        }
        onEdit={(pathArray) => {
          setEditingPath(pathArray);
          const [k1, k2] = pathArray;
          const style =
            pathArray.length === 1
              ? profileData.styles?.[k1]
              : profileData.styles?.[k1]?.[k2];
          setPreviewStyle(style);
        }}
        onSave={handleStyleSave}
      />
      <DocumentEditor
        documentData={profileData.document}
        onSave={handleDocumentSave}
      />
      <ColumnsEditor
        columnsData={profileData.columns}
        onSave={handleColumnsSave}
      />

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: "2rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        ← Back to Home
      </button>
    </div>
  );
}

export default ViewProfile;
