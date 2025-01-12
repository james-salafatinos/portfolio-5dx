Todo:

Submission System
- [80%] Able to click several emotions, and add as tags e.g. [[+Joy], [+Apprehension]], 
with metadata optional on location, time, etc.
- [80%] Able to click microphone button to record a voice memo (optional)
- [80%] Able to transcribe that voice memo using whisper API (optional, could be local storage)
- Able to submit and store on cloud database (only text, not audio)
  - Set up a mongo free db
  - When a user stages a submission, (and optionally records), enable db input 
    - The db input will be async/awaiting from a callback when the transcription from openAI whisper is complete -- then it will submit to db

Dashboard System
- Able to query and pull down data from cloud database
- Able to visualize data as a list of entries / table
- Able to export data as a csv or json 
- Able to visualie data as a heatmap on the wheel (or similar)
- Able to visualize data as a linechart over time (or similar)
  


  