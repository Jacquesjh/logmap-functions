// Firebase imports
import * as admin from "firebase-admin";

admin.initializeApp();

// Auth triggered functions
export * from "./auth/user/onCreate";

// Firestore triggered database functions
export * from "./db/deliveries/onUpdate";
export * from "./db/deliveries/onWrite";

// Schedule triggered functions
export * from "./schedule/newDay/onNewDay";
