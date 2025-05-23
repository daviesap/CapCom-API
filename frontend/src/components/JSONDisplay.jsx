import React from "react";
import ReactJson from "react-json-view";

export default function JSONDisplay({ jsonData }) {
  const handleCopy = () => {
    const prettyJson = JSON.stringify(jsonData, null, 2);
    navigator.clipboard.writeText(prettyJson);
    alert("JSON copied to clipboard!");
  };

  // Reorder keys to put "name" at the top
  const reorderedJson = {
    name: jsonData.name,
    ...Object.fromEntries(
      Object.entries(jsonData).filter(([key]) => key !== "name")
    ),
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-700">Current JSON</h3>
        <button
          onClick={handleCopy}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
        >
          Copy to Clipboard
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
        <ReactJson
          src={reorderedJson}
          name={false}
          collapsed={2}
          enableClipboard={false}
          displayDataTypes={false}
          theme="rjv-default"
        />
      </div>
    </div>
  );
}