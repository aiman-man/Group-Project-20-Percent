# Mobile Application Development Jobsheet Portal

## Files
- `index.html` — Home, About Us, Team and Jobsheet sections.
- `style.css` — Futuristic AI/HUD theme and animations.
- `script.js` — Loading screen, 24 jobsheets, two-student filtering, progress, cursor light, canvas background and music.
- `viewer.html` — Lecturer review page with back button.
- `viewer.js` — Review details, local completion state and submission link/notes.
- `assets/audio/system-theme.mp3` — Put your own MP3 file here.

## Run in VS Code
Install Live Server, open `index.html`, then click **Go Live**.

## Edit member details
Search `aiman@example.com`, `haziq@example.com` and the phone placeholders inside `index.html`.

## Audio
Create or rename your audio file exactly as:
`assets/audio/system-theme.mp3`

Browsers do not allow music to autoplay with sound. The visitor must click the MUSIC button.

## Static prototype limitation
Completion, notes and submission links are stored in localStorage on the same browser/device. The file picker only previews selected local file names. Real uploads shared with a lecturer require Firebase Storage, Supabase Storage or another backend.
