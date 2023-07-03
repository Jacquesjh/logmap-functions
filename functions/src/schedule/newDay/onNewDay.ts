import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {WriteResult} from "firebase-admin/firestore";

import {HistoryTruck, Truck} from "../../models";

import {
  getSaoPauloTimeZoneCurrentDate,
  getSaoPauloTimeZonePreviousDate,
} from "../../utils";

export const updateTruckHistoryAndDeliveries = functions.pubsub
  .schedule("every day 00:02")
  .timeZone("America/Sao_Paulo")
  .onRun(async (context) => {
    try {
      // Get all users
      const usersSnapshot = await admin.firestore().collection("users").get();
      const promises: Promise<void>[] = [];

      usersSnapshot.forEach((userDoc) => {
        const userTrucksCollectionRef = userDoc.ref.collection("trucks");

        promises.push(
          // Get all trucks for this user
          userTrucksCollectionRef.get().then(async (trucksSnapshot) => {
            const updateHistoryTruckPromises: Promise<WriteResult>[] = [];
            const updateTruckFieldsPromises: Promise<WriteResult>[] = [];

            for (const truckDoc of trucksSnapshot.docs) {
              const truckData = truckDoc.data() as Truck;

              console.log(`Processing truck: ${truckData.name}`);
              console.log(
                `---- Truck deliveries: ${truckData.activeDeliveriesRef}`
              );

              console.log(
                "---- Truck completed deliveries:" +
                  ` ${truckData.completedDeliveriesRef}`
              );

              if (truckData.geoAddressArray.length === 0) {
                // The truck made no route on the previous day
                console.log("------- The truck did not registred any movement");
                continue;
              }

              const historyTruckRef = truckData.historyRef;
              const historyTruckData = (
                await historyTruckRef.get()
              ).data() as HistoryTruck;

              // Get the fields you want to save from truck data
              const previousDate = getSaoPauloTimeZonePreviousDate();

              console.log(`Previous date: ${previousDate}`);

              historyTruckData.history[previousDate] = {
                activeDeliveriesRef: truckData.activeDeliveriesRef,
                completedDeliveriesRef: truckData.completedDeliveriesRef,
                currentDateDriversRef: truckData.currentDateDriversRef,
                geoAddressArray: truckData.geoAddressArray,
              };

              console.log(
                "New entry on the truck's " +
                  `history: ${historyTruckData.history[previousDate]}`
              );

              // Update the truck document
              updateHistoryTruckPromises.push(
                historyTruckRef.update({history: historyTruckData.history})
              );

              console.log("Updated this truck's history!");

              // If the truck has future deliveries with the current date,
              // then set then as the activeDeliveriesRef and remove them
              // from the futureDeliveriesRef
              const currentDate = getSaoPauloTimeZoneCurrentDate();

              let currentDateDeliveriesRef = truckData.activeDeliveriesRef;

              if (truckData.futureDeliveriesRef[currentDate]) {
                console.log("There are deliveries scheduled for today!");
                console.log(`${truckData.futureDeliveriesRef[currentDate]}`);

                currentDateDeliveriesRef =
                  truckData.futureDeliveriesRef[currentDate];

                delete truckData.futureDeliveriesRef[currentDate];
              }

              // Update the history document with the new data
              updateTruckFieldsPromises.push(
                truckDoc.ref.update({
                  activeDeliveriesRef: currentDateDeliveriesRef,
                  completedDeliveriesRef: [],
                  currentDateDriversRef: [],
                  futureDeliveriesRef: truckData.futureDeliveriesRef,
                  geoAddressArray: [],
                })
              );
            }

            await Promise.all(updateHistoryTruckPromises);
            await Promise.all(updateTruckFieldsPromises);
          })
        );
      });

      await Promise.all(promises);
      console.log("Truck history updated successfully!");
    } catch (error) {
      console.error("Error updating truck history:", error);
    }
  });
