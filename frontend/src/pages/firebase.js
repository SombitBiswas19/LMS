import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB3-6JCBcqEpc6ZMcM0mj1i9CJqRHWy-Uw",
    authDomain: "lmsproject-4bf4c.firebaseapp.com",
    projectId: "lmsproject-4bf4c",
    storageBucket: "lmsproject-4bf4c.firebasestorage.app",
    messagingSenderId: "400720133726",
    appId: "1:400720133726:web:081de099f863ec15f27ecf",
    measurementId: "G-C9KHPBJ8JJ"
  };

  const app = initializeApp(firebaseConfig);

  // Initialize Firestore and Auth
  const auth = getAuth(app);
  const db = getFirestore(app);
  
  // Export auth and db to be used in other files
  export { auth, db };
