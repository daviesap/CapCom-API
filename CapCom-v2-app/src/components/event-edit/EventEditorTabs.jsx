import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function EventEditorTabs({ tabs, activeTab, onChange }) {
  return (
    <nav className="tabs event-edit-tabs" aria-label="Event edit sections">
      {tabs.map((tab) => (
        <button
          className={activeTab === tab.id ? "tab active" : "tab"}
          type="button"
          key={tab.id}
          onClick={() => onChange(tab.id)}
        >
          <CapcomIcon name={tab.icon} size={18} weight="duotone" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
