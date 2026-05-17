import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC83QDmzVbCO0uGM2OxWS_R99y6weCHbn4",
    authDomain: "lighthouse-estate-gate-acces.firebaseapp.com",
    projectId: "lighthouse-estate-gate-acces",
    storageBucket: "lighthouse-estate-gate-acces.firebasestorage.app",
    messagingSenderId: "447434971584",
    appId: "1:447434971584:web:b0278866eddeeb34279025"
};

export const appId = 'lighthouse-lekki-v1';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const initAuthFlow = async () => {
    try {
        await signInAnonymously(auth);
    } catch (err) { 
        console.error("Auth Failure", err); 
    }
};
