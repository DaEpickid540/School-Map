// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC42CMewFxDynOFbUy-jIPilQVKcJa39HE",
  authDomain: "mason-navigator.firebaseapp.com",
  projectId: "mason-navigator",
  storageBucket: "mason-navigator.firebasestorage.app",
  messagingSenderId: "87865169627",
  appId: "1:87865169627:web:41eb9fd7c866554ee69efe",
  measurementId: "G-PVYZSCC3CT",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
