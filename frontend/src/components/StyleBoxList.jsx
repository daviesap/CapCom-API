import React from "react";
import StyleBox from "./StyleBox";

export default function StyleBoxList({ styles, editingStyle, onEdit, onSave }) {
  if (!styles) return null;

  return Object.entries(styles)
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
    });
}