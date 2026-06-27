# School-Map

An interactive room-finder web app for a multi-building, multi-floor school campus. Hosted on Firebase. Users select a building and room to get its location on the floor map. Supports shared routes via Firestore and an optional Groq-powered AI mode for natural language room queries.

## Features

- Room lookup across 5 buildings (A–E) and 3 floors
- Floor map with coordinate overlays per room
- Share a route — generates a short link backed by Firestore
- AI Mode: natural language room search via Groq (free API key required)
- Degrades gracefully — works as a static site with no Firebase config

## Structure

```
├── index.html / android.html   Main entry points
├── aiConfig.js                 Groq API config (model, endpoint)
├── cloud.js                    Firebase/Firestore wrapper (lazy-loaded)
├── firebaseConfig.js           Firebase project config (fill in your own)
├── displayRooms.js             Room rendering logic
├── A_Rooms.js – E_Rooms.js    Room data per building
├── coordinates_floor1.js       Pixel coordinates for floor 1 rooms
├── coordinates_floor2.js       Pixel coordinates for floor 2 rooms
├── coordinates_floor3.js       Pixel coordinates for floor 3 rooms
└── firebase.json               Firebase Hosting config
```

## Setup

**Static (no cloud):** Leave `firebaseConfig.js` blank — the app works fully offline/static and can be hosted anywhere including GitHub Pages.

**With Firebase (shared routes):**
1. Create a Firebase project with Firestore enabled
2. Fill in `firebaseConfig.js` with your project config
3. Deploy: `firebase deploy`

**AI Mode:**
1. Get a free API key at [console.groq.com/keys](https://console.groq.com/keys)
2. Either paste it in `aiConfig.js` (use only a free/disposable key — it ships in page source) or let users enter it in the settings panel on the site

## Deployment

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```
