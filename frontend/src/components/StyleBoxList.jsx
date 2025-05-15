import React from "react";
import StyleBox from "./StyleBox";

export default function StyleBoxList({ styles, editingStyle, onEdit, onSave }) {
  if (!styles) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {Object.entries(styles)
        .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
        .flatMap(([styleKey, styleData]) => {
          if (styleKey === "row" && typeof styleData === "object") {
            return Object.entries(styleData)
              .sort(([aKey], [bKey]) => aKey.localeCompare(bKey))
              .map(([subKey, subData]) => (
                <StyleBox
                  key={`${styleKey}.${subKey}`}
                  styleKey={`${styleKey}.${subKey}`}
                  styleData={subData}
                  pathArray={[styleKey, subKey]}
                  editingStyle={editingStyle}
                  onEdit={onEdit}
                  onSave={onSave}
                />
              ));
          }

          return (
            <StyleBox
              key={styleKey}
              styleKey={styleKey}
              styleData={styleData}
              pathArray={[styleKey]}
              editingStyle={editingStyle}
              onEdit={onEdit}
              onSave={onSave}
            />
          );
        })}
    </div>
  );
}