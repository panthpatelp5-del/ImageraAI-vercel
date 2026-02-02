
const firebaseConfig = {
  apiKey: "AIzaSyBTY1QvmQE1sbO-IajMTVYHo9hLAg3WTp0",
  authDomain: "imagera-ai-1011.firebaseapp.com",
  projectId: "imagera-ai-1011",
  storageBucket: "imagera-ai-1011.firebasestorage.app",
  messagingSenderId: "506508600312",
  appId: "1:506508600312:web:c515660a3b0ea24fa32c0d",
  measurementId: "G-FEL38CLBHZ"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

