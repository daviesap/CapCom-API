# JSON Format Specification for **flair-pdf-generator**

This document defines the required JSON structure and field types for generating PDFs with the **flair-pdf-generator** tool. Use this as a reference when constructing or validating your payload.

---

## Root Object

The top-level JSON object must contain the following keys:

| Key        | Type   | Description                                            |
| ---------- | ------ | ------------------------------------------------------ |
| `document` | Object | PDF settings (filename, page, margins, spacing).       |
| `header`   | Object | Header content and styling (text lines, logo).         |
| `footer`   | Object | Footer content and styling.                            |
| `styles`   | Object | Named text styles used throughout the document.        |
| `columns`  | Array  | Definition of table columns (order, width, labels).    |
| `groups`   | Array  | An ordered list of content groups to render as tables. |

---

## `document` Object

Defines the overall page and spacing parameters.

| Field                 | Type   | Description                                               | Example          |
| --------------------- | ------ | --------------------------------------------------------- | ---------------- |
| `filename`            | String | Output PDF filename (should end with `.pdf`).             | `"schedule.pdf"` |
| `pageSize.width`      | Number | Page width in points (e.g. 595 for A4 portrait).          | `842`            |
| `pageSize.height`     | Number | Page height in points (e.g. 842 for A4 landscape).        | `595`            |
| `leftMargin`          | Number | Left margin in points.                                    | `50`             |
| `rightMargin`         | Number | Right margin in points.                                   | `50`             |
| `topMargin`           | Number | Top margin in points.                                     | `50`             |
| `bottomMargin`        | Number | Bottom margin in points.                                  | `50`             |
| `headerPaddingBottom` | Number | Space below header before content starts, in points.      | `20`             |
| `footerPaddingTop`    | Number | Space above footer before page end, in points.            | `20`             |
| `groupPaddingBottom`  | Number | Extra space after each group/table, in points.            | `10`             |
| `bottomPageThreshold` | Number | Minimum remaining space (points) before forcing new page. | `100`            |

---

## `header` Object

Specifies header text and optional logo.

| Field              | Type           | Description                                            | Example                           |
| ------------------ | -------------- | ------------------------------------------------------ | --------------------------------- |
| `text`             | Array\[String] | Array of header lines (each rendered on its own line). | `["Event 2025","Daily Schedule"]` |
| `style.fontSize`   | Number         | Font size for header text in points.                   | `16`                              |
| `style.fontWeight` | String         | Font weight: `"normal"` or `"bold"`.                   | `"bold"`                          |
| `style.colour`     | String         | Hex color code for text.                               | `"#000000"`                       |
| `logo.url`         | String         | URL or local path to a PNG logo.                       | `"/assets/logo.png"`              |
| `logo.width`       | Number         | Logo width in points.                                  | `120`                             |
| `logo.height`      | Number         | Logo height in points.                                 | `40`                              |

---

## `footer` Object

Single-line footer and its style.

| Field              | Type   | Description                            | Example               |
| ------------------ | ------ | -------------------------------------- | --------------------- |
| `text`             | String | Footer text (rendered once at bottom). | `"© 2025 My Company"` |
| `style.fontSize`   | Number | Font size in points.                   | `10`                  |
| `style.fontWeight` | String | Font weight: `"normal"` or `"bold"`.   | `"normal"`            |
| `style.colour`     | String | Hex color code for text.               | `"#333333"`           |

---

## `styles` Object

Reusable named styles for table text.

Each style must include:

| Style Key       | Type   | Fields (all required)                               |
| --------------- | ------ | --------------------------------------------------- |
| `defaultRow`    | Object | `fontSize`, `fontWeight`, `colour`                  |
| `groupTitle`    | Object | `fontSize`, `fontWeight`, `colour`                  |
| `groupMetadata` | Object | `fontSize`, `fontWeight`, `colour`, `paddingBottom` |
| `labelRow`      | Object | `fontSize`, `fontWeight`, `colour`                  |

Use this pattern for each:

```jsonc
"<styleName>": {
  "fontSize": <Number>,
  "fontWeight": "normal" | "bold",
  "colour": "#RRGGBB",
  // optional for groupMetadata:
  "paddingBottom": <Number>
}
```

---

## `columns` Array

Defines table column order, width, and labels.

Each entry:

| Field       | Type    | Description                                       | Example  |
| ----------- | ------- | ------------------------------------------------- | -------- |
| `field`     | String  | Key in each row’s `rows` object.                  | `"time"` |
| `label`     | String  | Column header text (shown if `showLabel = true`). | `"Time"` |
| `width`     | Number  | Column width in points.                           | `100`    |
| `showLabel` | Boolean | Whether to render the label row for this column.  | `true`   |

Example:

```json
"columns": [
  {"field":"time","label":"Time","width":100,"showLabel":true},
  {"field":"session","label":"Session","width":300,"showLabel":true}
]
```

---

## `groups` Array

An ordered list of content groups (renders as separate tables).

Each group object:

| Field           | Type           | Description                                          | Example              |
| --------------- | -------------- | ---------------------------------------------------- | -------------------- |
| `groupTitle`    | String         | Title text rendered above the table.                 | `"Morning Sessions"` |
| `groupMetadata` | String         | Subheading or note (rendered below title).           | `"Main Hall"`        |
| `groupContent`  | Array\[Object] | List of rows, each with a `rows` object (see below). | …                    |

### `groupContent` entries

Each entry in `groupContent` must be an object with a `rows` key. The `rows` object maps each `columns.field` to a cell value (string):

```json
{
  "rows": {
    "time": "09:00 – 10:00",
    "session": "Welcome Remarks",
    "speaker": "Dr. Jane Smith"
  }
}
```

* **Order** of `groupContent` defines row order.
* Every key in `rows` **must** match one of your defined `columns.field` values.

---

## Full Example Structure

```json
{
  "document": { … },
  "header":   { … },
  "footer":   { … },
  "styles":   { … },
  "columns":  [ … ],
  "groups":   [ … ]
}
```

Ensure your JSON payload strictly follows the types and keys specified above to avoid runtime validation errors.
