// frontend/src/components/StyleSection.jsx

import React, { useState } from "react";

export default function StyleSection({ sectionKey, sectionData, onSave }) {
    const [localData, setLocalData] = useState(sectionData);

    const handleChange = (field, value) => {
        setLocalData((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleRowChange = (rowStyle, field, value) => {
        setLocalData((prev) => ({
            ...prev,
            [rowStyle]: {
                ...prev[rowStyle],
                [field]: value
            }
        }));
    };

    const renderStyleFields = (data, onChange, prefix = "") => (
        <>
            {Object.entries(data).map(([field, value]) => {
                if (typeof value === "number") {
                    return (
                        <div key={prefix + field} className="mb-3">
                            <label className="block">{prefix + field}</label>
                            <input
                                type="number"
                                value={value}
                                onChange={(e) => onChange(field, parseInt(e.target.value))}
                                className="border rounded p-1 w-32"
                            />
                        </div>
                    );
                } else if (typeof value === "string" && value.startsWith("#")) {
                    return (
                        <div key={prefix + field} className="mb-3">
                            <label className="block">{prefix + field}</label>
                            <input
                                type="color"
                                value={value}
                                onChange={(e) => onChange(field, e.target.value)}
                                className="w-16 h-10 p-1 border rounded"
                            />
                        </div>
                    );
                } else if (field === "fontStyle") {
                    return (
                        <div key={prefix + field} className="mb-3">
                            <label className="block">{prefix + field}</label>
                            <select
                                value={value}
                                onChange={(e) => onChange(field, e.target.value)}
                                className="border rounded p-1 w-40"
                            >
                                <option value="normal">Normal</option>
                                <option value="bold">Bold</option>
                                <option value="italic">Italic</option>
                                <option value="bolditalic">Bold Italic</option>
                            </select>
                        </div>
                    );
                }
                else {
                    return (
                        <div key={prefix + field} className="mb-3">
                            <label className="block">{prefix + field}</label>
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => onChange(field, e.target.value)}
                                className="border rounded p-1 w-64"
                            />
                        </div>
                    );
                }
            })}
        </>
    );

    return (
        <div className="mt-4">

            {sectionKey === "row" ? (
                <>
                    <div className="mb-4">
                        <label className="block font-semibold">Line Spacing</label>
                        <input
                            type="number"
                            value={localData.lineSpacing ?? 2}
                            onChange={(e) => handleChange("lineSpacing", parseInt(e.target.value))}
                            className="border rounded p-1 w-32"
                        />
                        <br /><button
                            onClick={() => onSave(localData)}
                            className="mt-4 px-4 py-2 rounded bg-green-500 text-white shadow"
                        >
                            Save
                        </button></div>

                    {["default", "highlight", "lowlight"].map((subKey) => (
                        <div key={subKey} className="mb-6 p-3 border rounded">
                            <div className="font-semibold mb-3 capitalize">{subKey}</div>
                            {renderStyleFields(localData[subKey], (field, value) => handleRowChange(subKey, field, value), `${subKey}.`)}
                            <button
                                onClick={() => onSave(localData)}
                                className="mt-4 px-4 py-2 rounded bg-green-500 text-white shadow"
                            >
                                Save
                            </button>


                        </div>
                    ))}
                </>
            ) : (
                renderStyleFields(localData, handleChange)
            )}


        </div>
    );
}