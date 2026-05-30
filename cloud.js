// cloud.js — thin, lazy Firebase/Firestore wrapper for shared routes.
//
// Everything here is OPTIONAL and degrades gracefully. If firebaseConfig.js is
// left blank, isCloudEnabled() returns false and the app never touches the
// network — so the static GitHub Pages build keeps working untouched. When
// config is present, the Firebase SDK is dynamically imported from gstatic the
// first time a cloud call is made (never on page load).

import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION } from "./firebaseConfig.js";

const SDK = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

export function isCloudEnabled() {
  return !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

let _ctx = null;
async function ctx() {
  if (!isCloudEnabled()) throw new Error("cloud-disabled");
  if (!_ctx) {
    _ctx = (async () => {
      const [appMod, fsMod] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-firestore.js`),
      ]);
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      const db = fsMod.getFirestore(app);
      return { db, fs: fsMod };
    })().catch((e) => {
      _ctx = null; // allow a later retry if the SDK failed to load
      throw e;
    });
  }
  return _ctx;
}

// Store a shared route and return its short document id (used as ?r=<id>).
export async function publishRoute(stops, name) {
  const { db, fs } = await ctx();
  const ref = await fs.addDoc(fs.collection(db, "routes"), {
    stops,
    name: name || "",
    created: fs.serverTimestamp(),
  });
  return ref.id;
}

// Look up a shared route by id. Returns { stops, name } or null if missing.
export async function fetchRoute(id) {
  const { db, fs } = await ctx();
  const snap = await fs.getDoc(fs.doc(db, "routes", id));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return Array.isArray(data.stops) ? { stops: data.stops, name: data.name || "" } : null;
}
