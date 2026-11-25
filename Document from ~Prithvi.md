# NIT Patna — Swachh Campus V1

## Working now
- Mobile-friendly site
- Leaflet + OpenStreetMap map
- Browser GPS position
- Photo capture/upload
- Note + coordinates + timestamp
- Map report markers
- Demo persistence in browser localStorage

## Run
Use a local server because GPS permissions may be restricted for file:// pages:

python -m http.server 8000

Open http://localhost:8000

## Change map
Edit `CAMPUS_CONFIG` in `app.js`:

center: [LATITUDE, LONGITUDE],
zoom: 17

The current center is only a starting point; verify exact campus/building data before deployment.

## Workers / SMS
Do not put real worker phone numbers in `app.js`. Version 2 should use:
Browser → secure backend → database → SMS provider → worker

Store phone numbers and SMS API credentials server-side.

## Dustbin Locator (V2)
- 6 bins (BIN-001…006) placed from the violet crosses in the map photo; edit `DEFAULT_BINS` in `app.js`.
- Each bin has name, fill %, status, last-emptied time. Status: >=80% Full.
- Map locked to campus box `CAMPUS_CONFIG.bounds`.
- Admin button (demo PIN 1234): change fill %, maintenance, add/rename/remove bins.
- Coordinates are estimated from a screenshot: stand at each bin, read GPS, and update.
