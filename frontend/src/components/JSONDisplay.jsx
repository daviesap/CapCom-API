import React, { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { toast } from "react-toastify";

export default function JSONDisplay({ jsonData, onSaveJson }) {
  const reorderedJson = useMemo(() => ({
    name: jsonData?.name,
    ...Object.fromEntries(
      Object.entries(jsonData || {}).filter(([key]) => key !== "name")
    ),
  }), [jsonData]);

  const prettyJson = useMemo(
    () => JSON.stringify(reorderedJson, null, 2),
    [reorderedJson]
  );
  const [editorValue, setEditorValue] = useState(prettyJson);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setEditorValue(prettyJson);
    setSaveError("");
  }, [prettyJson]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editorValue);
    alert("JSON copied to clipboard!");
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(editorValue);
      setSaveError("");
      await onSaveJson?.(parsed);
      toast.success("Profile JSON saved!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid JSON";
      setSaveError(message);
      toast.error("Invalid JSON. Fix the JSON before saving.");
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-700">Current JSON</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
          >
            Copy to Clipboard
          </button>
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
          >
            Save JSON
          </button>
        </div>
      </div>

      {saveError ? (
        <p className="mb-2 text-sm text-red-600">{saveError}</p>
      ) : null}

      <div className="overflow-hidden rounded border border-gray-300">
        <Editor
          height="70vh"
          defaultLanguage="json"
          value={editorValue}
          onChange={(value) => setEditorValue(value || "")}
          options={{
            minimap: { enabled: false },
            wordWrap: "on",
            scrollBeyondLastLine: false,
            fontSize: 13,
            formatOnPaste: true,
            formatOnType: true,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
