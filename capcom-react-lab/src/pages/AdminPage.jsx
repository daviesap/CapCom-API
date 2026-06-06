import { CapcomIcon } from "../icons/capcomIcons.jsx";

export default function AdminPage() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">Access-controlled administration tools.</p>
        </div>
      </div>

      <div className="panel placeholder-panel">
        <CapcomIcon name="admin" size={32} weight="duotone" />
        <div>
          <h2>Admin workflows</h2>
          <p className="page-subtitle">
            This area is reserved for users with the required access level.
          </p>
        </div>
      </div>
    </section>
  );
}
