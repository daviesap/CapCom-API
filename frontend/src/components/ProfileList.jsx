// ProfileList.jsx
import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { nanoid } from 'nanoid';

export default function ProfileList() {
  const [profiles, setProfiles] = useState([]);
  const [newProfileName, setNewProfileName] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      const snapshot = await getDocs(collection(db, 'styleProfiles'));
      const data = snapshot.docs.map((doc) => ({
        profileId: doc.id,
        ...doc.data(),
      }));
      setProfiles(data);
    };
    fetchProfiles();
  }, []);

  const handleAddProfile = async () => {
    const id = nanoid(10);
    const docRef = doc(db, 'styleProfiles', id);
    await setDoc(docRef, {
      name: newProfileName,
      styles: {},
    });
    setProfiles([...profiles, { profileId: id, name: newProfileName, styles: {} }]);
    setNewProfileName('');
  };

  const handleDeleteProfile = async (id) => {
    await deleteDoc(doc(db, 'styleProfiles', id));
    setProfiles(profiles.filter((p) => p.profileId !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Saved Profiles</h1>

      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          className="border px-2 py-1 rounded w-1/2"
          placeholder="New profile name"
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
        />
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={handleAddProfile}
          disabled={!newProfileName.trim()}
        >
          Add Profile
        </button>
      </div>

      <ul className="space-y-4">
        {profiles.map((profile) => (
          <li key={profile.profileId} className="bg-white shadow rounded p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-500">ID: {profile.profileId}</div>
                <div className="text-lg font-medium">{profile.name || 'Unnamed Profile'}</div>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/view/${profile.profileId}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  View
                </Link>
                <button
                  onClick={() => handleDeleteProfile(profile.profileId)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}