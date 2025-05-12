import React, { useState } from "react";

export default function Tabs({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="tabs-bar">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`tab-button ${activeTab === index ? "active" : "inactive"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ✅ This is the missing content section */}
      <div className="tab-content" style={{ marginTop: '1rem' }}>
        {tabs[activeTab].content}
      </div>
    </div>
  );
}