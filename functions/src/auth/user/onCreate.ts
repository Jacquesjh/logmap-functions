import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Function triggered when a new user is created
export const createUserCollections = functions.auth
  .user()
  .onCreate(async (user) => {
    const {uid} = user;

    // Create the user's document with empty string fields
    const userDocRef = admin.firestore().collection("users").doc(uid);
    const userData = {
      address: "",
      addressNumber: "",
      city: "",
      displayName: "",
      geoAddress: {latitude: 0, longitude: 0},
      state: "",
    };

    // Create the subcollections for the user
    const subcollections = [
      "clients",
      "deliveries",
      "drivers",
      "historyTrucks",
      "runs",
      "trucks",
    ];
    const subcollectionPromises = subcollections.map((subcollection) => {
      const subcollectionRef = userDocRef.collection(subcollection);
      return subcollectionRef.add({});
    });

    return Promise.all([userDocRef.set(userData), ...subcollectionPromises])
      .then(() => {
        console.log("User collections created successfully.");
        return null;
      })
      .catch((error) => {
        console.error("Error creating user collections:", error);
      });
  });
