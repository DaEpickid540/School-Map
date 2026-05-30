// firebaseConfig.js — OPTIONAL Google Firebase backend.
//
// The app runs fully without Firebase: route sharing falls back to long
// ?stops= URLs (+ QR codes), and favorites are stored locally. That keeps
// the GitHub Pages deployment working with zero setup.
//
// ── ENABLE THE FREE CLOUD BACKEND (short share links) ────────────
// 1. Create a free project at https://console.firebase.google.com
// 2. Add a Web App, then copy its config values below.
// 3. In the console, enable Firestore Database (start in production mode)
//    and add this rule so anyone can create/read shared routes but not edit
//    or delete them:
//
//      rules_version = '2';
//      service cloud.firestore {
//        match /databases/{db}/documents {
//          match /routes/{id} {
//            allow read, create: if true;
//            allow update, delete: if false;
//          }
//        }
//      }
//
// NOTE: the Web "apiKey" below is NOT a secret — Firebase web keys are safe to
// ship in client code; access is controlled by the Firestore rules above.
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// Which Firebase JS SDK version to lazy-load from gstatic when cloud is on.
export const FIREBASE_SDK_VERSION = "10.12.2";
