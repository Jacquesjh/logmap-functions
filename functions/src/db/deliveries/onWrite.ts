// Firebase imports
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Project's aux functions and type imports
import {
  FutureDeliveriesRefType,
  addDeliveryRefToFutureDeliveriesRef,
  removeDeliveryRefFromFutureDeliveriesRef,
} from "./utils";
import {getSaoPauloTimeZoneCurrentDate} from "../../utils";

export const writeActiveDeliveriesRef = functions.firestore
  .document("users/{userId}/deliveries/{deliveryId}")
  .onWrite(async (change, _context) => {
    //  Read operations:
    // - 1 read operation to get the old and new value of the delivery document
    // - 1 read operation to get the assigned truck document
    // - If the assigned truck document already has an activeDeliveriesRef
    // field, there may be an additional read operation to retrieve it.

    // Write operations:
    // - 0 or 1 write operation to update the activeDeliveriesRef field of the
    // assigned truck document, depending on whether there was a change to the
    // activeDeliveriesRef array
    // - If the delivery document is deleted or created, there is 1 write
    // operation to add or remove it from the activeDeliveriesRef array.

    // Delete operations:
    // -If the delivery document is deleted, there is 1 delete operation to
    // remove it from the activeDeliveriesRef array.

    // Get the old and new value of the document to check changes
    const previousDeliveryData = change.before.data();
    const previousDeliveryDate = previousDeliveryData?.deliveryDate;

    const deliveryRef = change.after.ref;
    const deliveryData = change.after.data();

    const deliveryDate = deliveryData?.deliveryDate;

    const currentDate = getSaoPauloTimeZoneCurrentDate();

    // If the deliveryDate and previousDeliveryDate are not the current date,
    // do not do anything because another function must add the deliveryRef
    // to the futureDeliveriesRef field of the truck document.
    if (deliveryDate !== currentDate && previousDeliveryDate !== currentDate) {
      console.log(
        `Neither the new date ${deliveryDate} nor ${previousDeliveryDate} ` +
          `are the current date ${currentDate}`
      );
      return null;
    }

    // If the delivery document has no data or no assigned truck, there's
    // nothing to do
    if (!deliveryData || !deliveryData.truckRef) {
      return null;
    }

    // Retrieve the assigned truck document from Firestore
    const truckRef = deliveryData.truckRef as admin.firestore.DocumentReference;
    const truckDoc = await truckRef.get();

    // If the assigned truck document doesn't exist, there's nothing to do
    if (!truckDoc.exists) {
      return null;
    }

    // Retrieve the data of the assigned truck document
    const truckData = truckDoc.data();

    if (!truckData) {
      console.log("The assign truck ref has no data");
      return null;
    }

    // Initialize the activeDeliveriesRef variable as an empty array
    let activeDeliveriesRef: admin.firestore.DocumentReference[] = [];

    if (truckData.activeDeliveriesRef) {
      // If the assigned truck already has the field, retrieve it
      activeDeliveriesRef = truckData.activeDeliveriesRef;
    }

    // Get the ID of the delivery document
    const deliveryId = deliveryRef.id;

    if (change.before.exists && !change.after.exists) {
      // Document deleted
      // If the delivery document has been deleted, remove it from the active
      // deliveries array
      const index = activeDeliveriesRef.findIndex(
        (ref) => ref.id === deliveryId
      );

      if (index >= 0) {
        activeDeliveriesRef.splice(index, 1);

        await truckRef.update({activeDeliveriesRef: activeDeliveriesRef});
      }
    } else if (!change.before.exists && change.after.exists) {
      // Document created
      // If a new delivery document has been created, add it to the active
      // deliveries list
      activeDeliveriesRef.push(deliveryRef);

      await truckRef.update({activeDeliveriesRef: activeDeliveriesRef});
    } else {
      // Document updated

      // If the delivery document has been updated, check if the assigned
      // truck has changed and if the previousDeliveryDate was the current date
      // but it was changed to another date
      const previousData = change.before.data() as {
        truckRef: admin.firestore.DocumentReference;
      };

      const previousTruckRef = previousData.truckRef;

      if (previousTruckRef && previousTruckRef.id !== truckRef.id) {
        // The delivery was associated with a different truck before
        // Remove the delivery from the previous truck's active deliveries list
        const index = activeDeliveriesRef.findIndex(
          (ref) => ref.id === deliveryId
        );

        if (index >= 0) {
          activeDeliveriesRef.splice(index, 1);
        }

        await previousTruckRef.update({
          activeDeliveriesRef:
            admin.firestore.FieldValue.arrayRemove(deliveryRef),
        });

        // Add the delivery to the new truck's active deliveries list
        activeDeliveriesRef.push(deliveryRef);

        await truckRef.update({activeDeliveriesRef: activeDeliveriesRef});
      } else if (
        previousDeliveryDate === currentDate &&
        deliveryDate !== currentDate
      ) {
        // The delivery was set to the current date, meaning that it was in the
        // truck's activeDeliveriesRef, but it was changed to another date.
        // Meaning that it must be removed from the field. Another function
        // will handle the new delivery date.

        const index = activeDeliveriesRef.findIndex(
          (ref) => ref.id === deliveryId
        );

        if (index >= 0) {
          activeDeliveriesRef.splice(index, 1);
          await truckRef.update({activeDeliveriesRef});
        }
      } else if (
        previousDeliveryDate !== currentDate &&
        deliveryDate === currentDate
      ) {
        // The previous date was in the future but now the delivery date is
        // set to today. So it must be part of the current active deliveries
        // array of the truck

        // Add the delivery to the new truck's active deliveries list
        activeDeliveriesRef.push(deliveryRef);

        await truckRef.update({activeDeliveriesRef: activeDeliveriesRef});
      }
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

    // If the deliveryDate and previousDeliveryDate are not in the future,
    // then do nothing, because another function must handle it
    if (deliveryDate <= currentDate && previousDeliveryDate <= currentDate) {
      console.log(
        `Both the new date ${deliveryDate} and the previous date ` +
          `${previousDeliveryDate} are not in the future`
      );
      return null;
    }

    // If the delivery document has no data or no assigned truck, there's
    // nothing to do
    if (!deliveryData || !deliveryData.truckRef) {
      console.log(
        "The delivery document either doesn't exist or " +
          "has no assigned truck to it"
      );
      return null;
    }

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
      console.log("The assign truck ref has no data");
      return null;
    }

    // Initialize the futureDeliveriesRef variable as an empty map
    let futureDeliveriesRef: FutureDeliveriesRefType = {};

    if (truckData.futureDeliveriesRef) {
      // If the assigned truck already has the field, retrieve it
      futureDeliveriesRef =
        truckData.futureDeliveriesRef as FutureDeliveriesRefType;
    }

    if (change.before.exists && !change.after.exists) {
      // Document deleted
      // If the delivery document has been deleted, remove it
      const modifiedFutureDeliveriesRef =
        removeDeliveryRefFromFutureDeliveriesRef(
          futureDeliveriesRef,
          deliveryRef,
          deliveryDate
        );

      await truckRef.update({futureDeliveriesRef: modifiedFutureDeliveriesRef});
    } else if (!change.before.exists && change.after.exists) {
      // Document created
      // If a new delivery document has been created, add it to the map of
      // future deliveries refs
      const modifiedFutureDeliveriesRef = addDeliveryRefToFutureDeliveriesRef(
        futureDeliveriesRef,
        deliveryRef,
        deliveryDate
      );

      await truckRef.update({futureDeliveriesRef: modifiedFutureDeliveriesRef});
    } else {
      // Document updated

      // If the delivery document has been updated, check if the assigned
      // truck has changed and if the deliveryDate has changed
      const previousData = change.before.data() as {
        truckRef: admin.firestore.DocumentReference;
      };

      const previousTruckRef = previousData.truckRef;

      if (previousTruckRef && previousTruckRef.id !== truckRef.id) {
        // The delivery was associated with a different truck before
        // Remove the delivery from the previous truck's futureDeliveriesRef

        const previousTruckDoc = await previousTruckRef.get();

        // Retrieve the data of the assigned truck document
        const previousTruckData = previousTruckDoc.data();

        if (!previousTruckData) {
          return null;
        }

        // Retrieve the list of active deliveries from the assigned
        // truck document
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

        // Add the delivery to the new truck's futureDeliveriesRef
        const modified = addDeliveryRefToFutureDeliveriesRef(
          futureDeliveriesRef,
          deliveryRef,
          deliveryDate
        );

        await truckRef.update({futureDeliveriesRef: modified});
      } else if (previousDeliveryDate !== deliveryDate) {
        // The delivery date changed, so the deliveryRef must change arrays.
        // Must remove the previousDeliveryDate and, if the new deliveryDate
        // is in the future, add to the futureDeliveriesRef to the
        // corresponding date

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
      }
    }

    return null;
  });
