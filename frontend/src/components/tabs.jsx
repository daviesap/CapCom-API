import React, { useState } from 'react';
import TabOne from './documentJSON';
import TabTwo from './stylesJSON';
import TabThree from './columnsJSON';

export default function TabsExample() {
  const [activeTab, setActiveTab] = useState('tab1');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tab1':
        return <TabOne />;
      case 'tab2':
        return <TabTwo />;
      case 'tab3':
        return <TabThree />;
      default:
        return null;
    }
  };

  return (
    <div className="tabs-wrapper">
      <h2>Tabbed Interface Test</h2>
      <div className="tab-buttons">
        <button
          className={`tab-button ${activeTab === 'tab1' ? 'active' : ''}`}
          onClick={() => setActiveTab('tab1')}
        >
          Document
        </button>
        <button
          className={`tab-button ${activeTab === 'tab2' ? 'active' : ''}`}
          onClick={() => setActiveTab('tab2')}
        >
          Styles
        </button>
        <button
          className={`tab-button ${activeTab === 'tab3' ? 'active' : ''}`}
          onClick={() => setActiveTab('tab3')}
        >
          Columns
        </button>
      </div>
      <div className="tab-content">{renderTabContent()}</div>
    </div>
  );
}