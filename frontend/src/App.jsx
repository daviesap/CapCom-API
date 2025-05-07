import { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import "./App.css";

function App() {
  // State for our simple JSON object
  const [profile, setProfile] = useState({
    profileName: "",
    title: "",
    background: "#ffffff"
  });

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prevProfile) => ({
      ...prevProfile,
      [name]: value
    }));
  };

  // Save the profile to Firestore
  const handleSave = async () => {
    try {
      // We'll store the profile in a Firestore collection called "profiles"
      const docRef = await addDoc(collection(db, "profiles"), profile);
      alert(`Profile saved with ID: ${docRef.id}`);
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Error saving profile. See console for details.");
    }
  };

  return (
    <div className="App">
      <h1>Create a Test Profile</h1>
      <div className="form-group">
        <label>Profile Name:</label>
        <input 
          type="text" 
          name="profileName" 
          value={profile.profileName}
          onChange={handleChange}
          placeholder="Enter profile name"
        />
      </div>
      <div className="form-group">
        <label>Title:</label>
        <input 
          type="text" 
          name="title"
          value={profile.title}
          onChange={handleChange}
          placeholder="Enter a title"
        />
      </div>
      <div className="form-group">
        <label>Background Colour:</label>
        <input 
          type="color" 
          name="background"
          value={profile.background}
          onChange={handleChange}
        />
      </div>
      <button onClick={handleSave}>Save Profile</button>
    </div>
  );
}

export default App;