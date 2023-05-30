// Firebase imports
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Project's aux functions and type imports
import {
  FutureDeliveriesRefType,
  addDeliveryRefToFutureDeliveriesRef,
  removeDeliveryRefFromFutureDeliveriesRef,
  updateTruckActiveDeliveriesRef,
} from "./utils";
import {getSaoPauloTimeZoneCurrentDate} from "../../utils";

export const writeActiveDeliveriesRef = functions.firestore
  .document("users/{userId}/deliveries/{deliveryId}")
  .onWrite(async (change, _context) => {
    try {
      const previousDeliveryData = change.before.data();
      const previousDeliveryDate = previousDeliveryData?.deliveryDate;

      const deliveryRef = change.after.ref;
      const deliveryData = change.after.data();
      const deliveryDate = deliveryData?.deliveryDate;

      const currentDate = getSaoPauloTimeZoneCurrentDate();

      console.log("Delivery document change detected:");
      console.log("Previous Delivery Date:", previousDeliveryDate);
      console.log("New Delivery Date:", deliveryDate);

      if (
        deliveryDate !== currentDate &&
        previousDeliveryDate !== currentDate
      ) {
        console.log(
          "Neither the previous nor current date are the current date:",
          currentDate
        );
        return null;
      }

      if (!change.before.exists && change.after.exists) {
        if (deliveryData?.truckRef) {
          // Document created
          console.log("Delivery document was just created...");
          await updateTruckActiveDeliveriesRef(
            deliveryData.truckRef,
            deliveryRef,
            "add"
          );
          console.log("DeliveryRef added to the truck's activeDeliveriesRef!");
        }
      } else if (
        deliveryData?.truckRef &&
        previousDeliveryDate !== deliveryDate
      ) {
        // The delivery date changed but the truckRef remains the same (valid)
        console.log("The truck remains the same but the date changed...");
        await updateTruckActiveDeliveriesRef(
          deliveryData.truckRef,
          deliveryRef,
          "remove"
        );

        if (deliveryDate === currentDate) {
          // Delivery date was in the future and now it's in the current date
          console.log("Delivery date is set for the current date");
          await updateTruckActiveDeliveriesRef(
            deliveryData.truckRef,
            deliveryRef,
            "add"
          );
          console.log("DeliveryRef added to the truck's activeDeliveriesRef!");
        }
      } else if (previousDeliveryData?.truckRef !== deliveryData?.truckRef) {
        // The delivery changed trucks
        console.log("The delivery changed trucks");
        console.log("Previous Truck ID: ", previousDeliveryData?.truckRef?.id);
        console.log("New Truck ID: ", deliveryData?.truckRef?.id);

        if (previousDeliveryData?.truckRef) {
          // Remove from the previousDeliveryTruckRef array
          console.log("Removing delivery from the previous truck");
          await updateTruckActiveDeliveriesRef(
            previousDeliveryData.truckRef,
            deliveryRef,
            "remove"
          );
          console.log(
            "DeliveryRef removed from the previous truck's activeDeliveriesRef!"
          );
        }

        if (deliveryData?.truckRef) {
          // Add to the currentDeliveryTruckRef array
          console.log("Assigning delivery to the new truck");
          await updateTruckActiveDeliveriesRef(
            deliveryData.truckRef,
            deliveryRef,
            "add"
          );
          console.log(
            "DeliveryRef added to the new truck's activeDeliveriesRef!"
          );
        }
      }
    } catch (error) {
      console.error(
        "Error occurred while processing delivery document:",
        error
      );
    }
    return null;
  });

export const writeFutureDeliveriesRef = functions.firestore
  .document("users/{userId}/deliveries/{deliveryId}")
  .onWrite(async (change, _context) => {
    // Triggered when a delivery document is created, updated, or deleted in
    // Firestore under the path "users/{userId}/deliveries/{deliveryId}".
    // This function synchronizes the assigned truck's future deliveries list
    // with the deliveries associated with it.

    // Get the old and new value of the document to check changes
    const previousDeliveryData = change.before.data();
    const previousDeliveryDate = previousDeliveryData?.deliveryDate;

    const deliveryRef = change.after.ref;
    const deliveryData = change.after.data();

    const deliveryDate = deliveryData?.deliveryDate;

    const currentDate = getSaoPauloTimeZoneCurrentDate();

    console.log("Delivery document change detected:");
    console.log("Previous Delivery Date:", previousDeliveryDate);
    console.log("New Delivery Date:", deliveryDate);

    // If the deliveryDate and previousDeliveryDate are not in the future,
    // then do nothing, because another function must handle it
    if (deliveryDate <= currentDate && previousDeliveryDate <= currentDate) {
      console.log(
        "Both the new date and the previous date are not in the future"
      );
      return null;
    }

    // If the delivery document has no data or no assigned truck, there's
    // nothing to do
    if (!deliveryData || !deliveryData.truckRef) {
      console.log(
        "The delivery document either doesn't exist " +
          "or has no assigned truck to it"
      );
      return null;
    }

    console.log("Checking assigned truck details:");

    // Retrieve the assigned truck document from Firestore
    const truckRef = deliveryData.truckRef as admin.firestore.DocumentReference;
    const truckDoc = await truckRef.get();

    // If the assigned truck document doesn't exist, there's nothing to do
    if (!truckDoc.exists) {
      console.log("The truck document does not exist");
      return null;
    }

    // Retrieve the data of the assigned truck document
    const truckData = truckDoc.data();

    if (!truckData) {
      console.log("The assigned truck reference has no data");
      return null;
    }

    console.log("Assigned truck details retrieved successfully");
    console.log("Truck ID:", truckRef.id);
    console.log("Truck Data:", truckData);

    // Initialize the futureDeliveriesRef variable as an empty map
    let futureDeliveriesRef: FutureDeliveriesRefType = {};

    if (truckData.futureDeliveriesRef) {
      // If the assigned truck already has the field, retrieve it
      futureDeliveriesRef =
        truckData.futureDeliveriesRef as FutureDeliveriesRefType;
    }

    if (change.before.exists && !change.after.exists) {
      // Document deleted
      console.log("Delivery document deleted");

      // If the delivery document has been deleted, remove it
      const modifiedFutureDeliveriesRef =
        removeDeliveryRefFromFutureDeliveriesRef(
          futureDeliveriesRef,
          deliveryRef,
          deliveryDate
        );

      await truckRef.update({futureDeliveriesRef: modifiedFutureDeliveriesRef});

      console.log("Delivery reference removed from future deliveries");
    } else if (!change.before.exists && change.after.exists) {
      // Document created
      console.log("Delivery document created");

      // If a new delivery document has been created, add it to the map of
      // future deliveries refs
      const modifiedFutureDeliveriesRef = addDeliveryRefToFutureDeliveriesRef(
        futureDeliveriesRef,
        deliveryRef,
        deliveryDate
      );

      await truckRef.update({futureDeliveriesRef: modifiedFutureDeliveriesRef});

      console.log("Delivery reference added to future deliveries");
    } else {
      // Document updated
      console.log("Delivery document updated");

      // If the delivery document has been updated, check if the assigned
      // truck has changed and if the deliveryDate has changed
      const previousData = change.before.data() as {
        truckRef: admin.firestore.DocumentReference;
      };
      const previousTruckRef = previousData.truckRef;

      if (previousTruckRef && previousTruckRef.id !== truckRef.id) {
        // The delivery was associated with a different truck before
        console.log("Delivery was associated with a different truck before");

        // Remove the delivery from the previous truck's futureDeliveriesRef
        const previousTruckDoc = await previousTruckRef.get();
        const previousTruckData = previousTruckDoc.data();

        if (!previousTruckData) {
          console.log("The previous truck document does not exist");
          return null;
        }

        const previousTruckFutureDeliveriesRef =
          previousTruckData.futureDeliveriesRef as FutureDeliveriesRefType;

        // Remove the deliveryRef from the previous truck
        const modifiedPreviousTruckFutureDeliveriesRef =
          removeDeliveryRefFromFutureDeliveriesRef(
            previousTruckFutureDeliveriesRef,
            deliveryRef,
            deliveryDate
          );

        await previousTruckRef.update({
          futureDeliveriesRef: modifiedPreviousTruckFutureDeliveriesRef,
        });

        console.log(
          "Delivery reference removed from previous truck's future deliveries"
        );

        // Add the delivery to the new truck's futureDeliveriesRef
        const modifiedFutureDeliveriesRef = addDeliveryRefToFutureDeliveriesRef(
          futureDeliveriesRef,
          deliveryRef,
          deliveryDate
        );

        await truckRef.update({
          futureDeliveriesRef: modifiedFutureDeliveriesRef,
        });

        console.log(
          "Delivery reference added to new truck's future deliveries"
        );
      } else if (previousDeliveryDate !== deliveryDate) {
        // The delivery date changed, so the deliveryRef must change arrays
        console.log("Delivery date has changed");

        // Remove the previousDeliveryDate if it is in the future
        let modifiedMap = {...futureDeliveriesRef};

        if (previousDeliveryDate > currentDate) {
          // Only remove if the previous delivery date is in the future,
          // otherwise it will be handled by another function
          modifiedMap = removeDeliveryRefFromFutureDeliveriesRef(
            futureDeliveriesRef,
            deliveryRef,
            previousDeliveryDate
          );
        }

        if (deliveryDate > currentDate) {
          // If the new delivery date is still in the future, add it to the
          // truck's futureDeliveriesRef, otherwise it will be handled by
          // another function
          modifiedMap = addDeliveryRefToFutureDeliveriesRef(
            modifiedMap,
            deliveryRef,
            deliveryDate
          );
        }

        await truckRef.update({futureDeliveriesRef: modifiedMap});

        console.log("Delivery reference updated in future deliveries");
      }
    }

    console.log("Function execution completed");

    return null;
  });
