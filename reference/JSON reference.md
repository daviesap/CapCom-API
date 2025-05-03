PDF Generator JSON Reference

This document describes the structure of the JSON payload consumed by the PDF generator. Required keys are marked accordingly.

⸻

1. Top‐Level Keys
	•	document (object) — Required
	•	Contains layout, metadata, and filename settings.
	•	styles (object) — Required
	•	Defines text and row formatting styles.
	•	filters (object)
	•	(Optional) Lists of tags or locations to filter out groups before rendering.
	•	columns (array) — Required
	•	Describes each table column.
	•	groups (array) — Required
	•	The content groups to render, each with its own rows.

⸻

2. document Object

Key	Type	Required	Description
user	string	❌	(Optional) Caller identifier for logging.
appName	string	❌	(Optional) Title shown in logs or header fallback.
filename	string	✅	Base name for the generated PDF (no .pdf suffix required).
leftMargin,			
rightMargin,			
topMargin,			
bottomMargin	number	✅	Page margins in points.
headerPaddingBottom	number	❌	Space below header text before content begins. Default: 10.
footerPaddingTop	number	❌	Space above footer text before content ends. Default: 10.
groupPaddingBottom	number	❌	Vertical gap after each group. Default: 0.
bottomPageThreshold	number	❌	(Unused) Legacy threshold for page breaks.
pageSize (object)	object	✅	Custom page dimensions:
			• width: page width in points.
			• height: page height in points.
header (object)	object	❌	Header configuration:
			• logo (object): { url, width, height } — embeds an image.
			• text: array of lines to draw above content.
			• style: { fontSize, fontWeight, colour } for header text.
footer (object)	object	❌	Footer configuration:
			• text: single line of footer text.
			• style: { fontSize, fontWeight, colour } for footer text.



⸻

3. styles Object

Defines named style rules used throughout the PDF.

"styles": {
  "groupTitle": { ... },
  "groupMetadata": { ... },
  "labelRow": { ... },
  "row": {
    "default": { ... },
    "highlight": { ... },
    "lowlight": { ... }
  }
}

	•	groupTitle — Style for group titles.
	•	groupMetadata — Style for the metadata line under each title.
	•	labelRow — Style for the header row of each table.
	•	row — An object whose keys correspond to row formats:
	•	default — Used when format is omitted.
	•	Other keys (e.g. highlight, lowlight) may add backgroundColour.

Each style object supports:
	•	fontSize (number)
	•	fontWeight ("normal" or "bold")
	•	colour or fontColour (hex string)
	•	backgroundColour (hex string) — for rows only
	•	paddingBottom (number)

⸻

4. filters Object

"filters": { "tags": [], "location": [] }

	•	tags, location — Lists of values; any group entries matching these are omitted. If unused, set to empty arrays.

⸻

5. columns Array

Each column definition controls layout and labeling:

"columns": [
  {
    "field": "time",       // key in each row object
    "label": "Time",       // header text
    "width": 80,            // column width in points
    "showLabel": true       // whether to draw the label row
  },
  ...
]

	•	field (string, Required) — Property name in rows objects.
	•	label (string, Required if showLabel) — Text for the column header.
	•	width (number) — Column width in points. Defaults to 100.
	•	showLabel (boolean) — Draw this column’s header label row.

⸻

6. groups Array

Each group represents a section of the schedule:

"groups": [
  {
    "groupTitle": "Sunday 30 March 2025",   // Section header
    "groupMetadata": "PMs fly California", // Subheader text
    "groupContent": [                        // Array of row entries
      {
        "rows": {                           // Actual cell data
          "date": "Sun 30 March",
          "time": "tbc",
          "description": "...",
          "tags": ["Logistics"],
          "location": []
        },
        "format": "highlight"              // Matches a key in styles.row
      },
      ...
    ]
  },
  ...
]

	•	groupTitle (string, Required) — Printed in bold at group start.
	•	groupMetadata (string, Required) — Printed beneath the title.
	•	groupContent (array, Required) — Entries to render as rows.
	•	Each entry must have:
	•	rows (object, Required) — Maps each column’s field to a value (string or array).
	•	format (string) — Optional; picks a style in styles.row. Defaults to default.

⸻

Validation notes:
	•	The generator expects all required keys to exist. Missing document.filename, document.pageSize, styles.row.default, columns, or groups will cause errors.
	•	Optional keys (e.g. document.user, filters, footer) have safe defaults.
	•	It is recommended to always supply filename, margin settings, at least one column, and one group.