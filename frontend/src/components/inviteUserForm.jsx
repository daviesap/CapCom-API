// /frontend/src/components/InviteUserForm.jsx

import React, { useState } from "react";
import { sendUserInvite } from "../services/inviteUser";  // ✅ this uses your service file

export default function InviteUserForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [orgId, setOrgId] = useState("flair");  // You can change this default if you want
  const [status, setStatus] = useState("");

  const handleInvite = async () => {
    try {
      await sendUserInvite({ email, role, orgId });
      setStatus("✅ Invite sent successfully!");
      setEmail("");
    } catch (err) {
      console.error(err);
      setStatus(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-bold mb-4">Invite New User</h2>

      <input
        className="border p-2 mb-2 w-full"
        type="email"
        placeholder="User email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="border p-2 mb-2 w-full"
        placeholder="User role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />

      <input
        className="border p-2 mb-2 w-full"
        placeholder="Org ID"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
      />

      <button className="bg-blue-500 text-white p-2 rounded" onClick={handleInvite}>
        Send Invite
      </button>

      {status && <div className="mt-2">{status}</div>}
    </div>
  );
}