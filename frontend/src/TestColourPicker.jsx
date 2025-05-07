import React, { useState } from 'react';

function TestColourPicker() {
  const [colour, setColour] = useState('#ff0000');

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h2>Test Colour Picker</h2>

      <label htmlFor="colourTest">Colour:</label>

      <input
        id="colourTest"
        type="color"
        value={colour}
        onChange={(e) => setColour(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          border: '1px solid #ccc',
          width: '40px',
          height: '40px',
          padding: 0,
          backgroundColor: colour,
          cursor: 'pointer',
          borderRadius: '4px',
          marginLeft: '1rem',
          verticalAlign: 'middle'
        }}
      />

      <code style={{ marginLeft: '0.75rem', fontSize: '0.9rem', color: '#555' }}>
        {colour}
      </code>
    </div>
  );
}

export default TestColourPicker;