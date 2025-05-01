# 📄 Schedule PDF JSON Structure Reference

This document outlines the structure of the JSON file used to generate schedule PDFs.

---

## `document`

Metadata and layout settings for the PDF.

```json
document: {
  user: string,             // User's email
  appName: string,          // App or event name
  filename: string,         // Output filename
  leftMargin: number,
  rightMargin: number,
  topMargin: number,
  bottomMargin: number,
  headerPaddingBottom: number,
  footerPaddingTop: number,
  groupPaddingBottom: number,
  bottomPageThreshold: number,
  pageSize: {
    width: number,
    height: number
  },
  header: {
    logo: {
      url: string,
      width: number,
      height: number
    },
    text: [string],
    style: {
      fontSize: number,
      fontWeight: string, // "normal" or "bold"
      colour: string
    }
  },
  footer: {
    text: string,
    style: {
      fontSize: number,
      fontWeight: string,
      colour: string
    }
  }
}
```

---

## `styles`

Named text styles for reuse across the PDF.

```json
styles: {
  groupTitle: {
    fontSize: number,
    fontWeight: string,
    colour: string
  },
  groupMetadata: {
    fontSize: number,
    fontWeight: string,
    colour: string,
    paddingBottom: number
  },
  defaultRow: {
    fontSize: number,
    fontColour: string,
    fontWeight: string,
    backgroundColour: string
  }
}
```

---

## `columns`

Defines the layout of columns in each table row.

```json
columns: [
  {
    field: string,       // e.g., "time"
    label: string,       // e.g., "Time"
    width: number,
    wrap: boolean
  }
]
```

---

## `groups`

The main schedule content, divided into logical groups (usually by date).

```json
groups: [
  {
    groupTitle: string,
    groupMetadata: string,
    groupContent: [
      {
        rows: {
          time: string,
          description: string,
          tags: [string],
          location: [string]
        },
        format: {
          textColour: string // Optional
        }
      }
    ]
  }
]
```

---

## ✅ Notes

- Time is a string (`"HH:MM"`).
- All colours use hex codes (e.g., `"#FF0000"`).
- Locations and tags are arrays of strings, even if only one value is present.
