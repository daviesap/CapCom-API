## To run emulator
cd /Users/apndavies/Coding/flair-pdf-generator
export LOCAL_API_KEY='Sausages2025!!'
firebase emulators:start --only functions


## Curl command
  curl -X POST "http://127.0.0.1:5001/flair-pdf-generator/europe-west2/generatePdf?action=generateScheduleSnapshot" \
  -H "Content-Type: application/json" \
  --data-binary "@/Users/apndavies/Coding/flair-pdf-generator/functions/local-emulator/input/schedule-sample.json"


## Change action as neccessary to 
generatePdf
getProfileIds
generateScheduleSnapshot