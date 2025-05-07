import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { deleteDoc } from 'firebase/firestore'; // at the top with other imports

function TitleStyleEditor() {
    const [projectId, setProjectId] = useState("project-abc");
    const [titleStyle, setTitleStyle] = useState({
        fontSize: 12,
        fontStyle: "bold",
        colour: "#000000"
    });
    const [message, setMessage] = useState("");
    const [savedData, setSavedData] = useState(null);
    const [allProfiles, setAllProfiles] = useState([]);

    const handleChange = (field, value) => {
        setTitleStyle(prev => ({ ...prev, [field]: value }));
    };

    const loadAllProfiles = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "styleProfiles"));
            const profiles = querySnapshot.docs.map(doc => ({
                id: doc.id,
                data: doc.data()
            }));
            setAllProfiles(profiles);
        } catch (error) {
            console.error("Error loading profiles:", error);
        }
    };

    useEffect(() => {
        loadAllProfiles();
    }, []);

    const handleSave = async () => {
        try {
            const docRef = doc(db, "styleProfiles", projectId);

            await setDoc(docRef, {
                stylesDocument: {
                    title: titleStyle
                }
            }, { merge: true });

            const updatedDoc = await getDoc(docRef);
            if (updatedDoc.exists()) {
                const data = updatedDoc.data();
                setSavedData(data.stylesDocument?.title || null);
            }

            setMessage("Saved to Firestore!");
        } catch (error) {
            console.error("Error saving:", error);
            setMessage("Error saving to Firestore");
        }
        await loadAllProfiles();
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Delete profile "${id}"?`)) return;

        try {
            await deleteDoc(doc(db, "styleProfiles", id));
            setMessage(`Deleted "${id}" from Firestore`);
            await loadAllProfiles();
        } catch (error) {
            console.error("Error deleting profile:", error);
            setMessage("Error deleting profile");
        }
    };

    return (
        <div className="main-wrapper">
            <div className="editor-box">
                <h2>Edit Title Style</h2>

                <div>
                    <label>Project ID:
                        <input
                            type="text"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            style={{ marginLeft: "1rem" }}
                        />
                    </label>
                </div>

                <div style={{ marginTop: "1rem" }}>
                    <label>Font Size:
                        <input
                            type="number"
                            value={titleStyle.fontSize}
                            onChange={(e) => handleChange("fontSize", parseInt(e.target.value))}
                            style={{ marginLeft: "1rem" }}
                        />
                    </label>
                </div>

                <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <label htmlFor="fontStyle">Font Style:</label>
                    <select
                        id="fontStyle"
                        value={["normal", "italic", "bold"].includes(titleStyle.fontStyle) ? titleStyle.fontStyle : "normal"}
                        onChange={(e) => handleChange("fontStyle", e.target.value)}
                        style={{
                            padding: "0.4rem",
                            fontSize: "1rem",
                            borderRadius: "4px",
                            border: "1px solid #ccc"
                        }}
                    >
                        <option value="normal">Normal</option>
                        <option value="italic">Italic</option>
                        <option value="bold">Bold</option>
                    </select>
                </div>

                <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <label htmlFor="titleColour">Colour:</label>
                    <input
                        id="titleColour"
                        type="color"
                        value={titleStyle.colour}
                        onChange={(e) => handleChange("colour", e.target.value)}
                        style={{
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            border: '1px solid #ccc',
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            backgroundColor: titleStyle.colour,
                            cursor: 'pointer',
                            borderRadius: '4px'
                        }}
                    />
                    <code style={{ fontSize: "0.9rem", color: "#555" }}>
                        {titleStyle.colour}
                    </code>
                </div>

                <button
                    onClick={handleSave}
                    style={{
                        marginTop: "1.5rem",
                        padding: "0.5rem 1rem",
                        background: "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px"
                    }}
                >
                    Save
                </button>

                {message && <p style={{ marginTop: "1rem" }}>{message}</p>}



                {allProfiles.length > 0 && (
                    <div style={{ marginTop: "2rem" }}>
                        <h3>All Profiles in Firestore</h3>
                        <table border="1" cellPadding="8">
                            <thead>
                                <tr>
                                    <th>Project ID</th>
                                    <th>Title Style</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allProfiles.map(profile => (
                                    <tr key={profile.id}>
                                        <td>{profile.id}</td>
                                        <td>
                                            {profile.data.stylesDocument?.title
                                                ? JSON.stringify(profile.data.stylesDocument.title)
                                                : <em>No title style</em>}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleDelete(profile.id)}
                                                style={{
                                                    background: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    padding: '0.25rem 0.75rem',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TitleStyleEditor;