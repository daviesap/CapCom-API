import React from "react";
import StyleBoxList from "./StyleBoxList";

export default function StylesEditor({ styles, editingStyle, onEdit, onSave }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <StyleBoxList
        styles={styles}
        editingStyle={editingStyle}
        onEdit={onEdit}
        onSave={onSave}
      />
    </div>
  );
}