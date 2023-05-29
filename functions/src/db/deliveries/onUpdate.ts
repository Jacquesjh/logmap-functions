// Firebase imports
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {Delivery, Truck} from "../../models";

/**
 * This Firebase function, named "handleDeliveryCompletion," is
 * triggered when a delivery document * is updated and marked as complete.
 * It performs the necessary actions to handle the completion of a delivery.
 */
export const handleDeliveryCompletion = functions.firestore
  .document("users/{userId}/deliveries/{deliveryId}")
  .onUpdate(async (change, _context) => {
    // When a delivery document is set as complete

    // Get the old and new value of the document to check changes
    const newValue = change.after.data() as Delivery;
    const oldValue = change.before.data() as Delivery;

    // Check if delivery was just marked as complete
    if (newValue.isComplete && !oldValue.isComplete) {
      const truckRef = newValue.truckRef as admin.firestore.DocumentReference;

      // Gets the data of the truck
      const truckData = (await truckRef.get()).data() as Truck;

      try {
        // Remove the delivery from the truck array of active deliveries
        // because it was completed and add it to the array of
        // completed deliveries
        await truckRef.update({
          activeDeliveriesRef: admin.firestore.FieldValue.arrayRemove(
            change.after.ref
          ),
          completedDeliveriesRef: admin.firestore.FieldValue.arrayUnion(
            change.after.ref
          ),
        });

        // Update delivery's deliveredAt and driverRef fields
        await change.after.ref.update({
          driverRef: truckData.driverRef,
          deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("Delivery updated successfully!");
      } catch (error) {
        console.error("Error updating delivery:", error);
      }
    }
  });
