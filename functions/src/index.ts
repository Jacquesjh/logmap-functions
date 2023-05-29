// Firebase imports
import * as admin from "firebase-admin";

admin.initializeApp();

export * from "./db/deliveries/onUpdate";
export * from "./db/deliveries/onWrite";
export * from "./schedule/newDay/onNewDay";
