App.jsx
└─ Router (e.g., react-router)
   ├─ ProfileList.jsx                # list/create profiles (uses default template JSON)
   └─ ViewProfile.jsx                # main “edit this profile” screen
      ├─ DocumentEditor.jsx          # page size/margins/header/footer logo/text
      ├─ ColumnsEditor.jsx           # choose columns & order from detectedFields
      └─ StylesEditor.jsx            # edit styles.styles.* (header/labels/rows etc.)
         └─ StyleBoxList.jsx         # grid/list of style “cards”
            └─ StyleBox.jsx          # one style section (e.g., Header, LabelRow, Row)
               └─ RowStyleEditor.jsx # only for styles.row.{default,important,new,past}