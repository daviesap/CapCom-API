// src/pages/InviteUserPage.jsx

import React from "react";
import InviteUserForm from "../components/InviteUserForm";

export default function InviteUserPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Invite New User</h1>
      <InviteUserForm />
    </div>
  );
}