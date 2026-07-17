// Firebase config for the optional "shared routes" feature.
// Consumed by cloud.js, which lazily loads the Firebase SDK from gstatic — so
// this file must stay a plain config module with NO bundler-style imports.
// Leave FIREBASE_CONFIG blank to disable cloud sync entirely (isCloudEnabled()
// returns false and the app stays a pure static map).
//
// Project: school-suite-652d8 (consolidated). Firestore: shared default DB,
// `routes` collection (public, append-only). Rules live in BookWare/mysite/
// firestore.rules — the authoritative ruleset for the shared default database.

export const FIREBASE_SDK_VERSION = "10.12.0";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBXu-MgR2uIXIeUkvV8jF9AZ_a1mR8mw8s",
  authDomain: "school-suite-652d8.firebaseapp.com",
  projectId: "school-suite-652d8",
  storageBucket: "school-suite-652d8.firebasestorage.app",
  messagingSenderId: "564790135010",
  appId: "1:564790135010:web:5d24d7b8da89acc84436bb",
  measurementId: "G-Q37MSFSM3K",
};
