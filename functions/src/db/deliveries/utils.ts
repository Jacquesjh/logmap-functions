import * as admin from "firebase-admin";

export type FutureDeliveriesRefType = {
  [date: string]: admin.firestore.DocumentReference[];
};

/**
 * Removes a given delivery reference from the array of delivery references
 * of a specified delivery date in the futureDeliveriesRef object. If the
 * delivery reference to be removed is the last one in its delivery date
 * array, the delivery date itself will be removed from the
 * futureDeliveriesRef object.
 *
 * @param {FutureDeliveriesRefType} futureDeliveriesRef - The object
 * containing the future delivery dates and their respective delivery
 * references.

 * @param {admin.firestore.DocumentReference} deliveryRef - The reference
 * to the delivery that should be removed.
 *
 * @param {string} deliveryDate - The date of the delivery, used as the key
 * to locate the corresponding future deliveries reference array.
 *
 * @return {FutureDeliveriesRefType} - The updated futureDeliveriesRef
 * object after removing the given delivery reference.
 *
 * @throws {Error} - The updated futureDeliveriesRef object after removing
 * the given delivery reference.
 */
export function removeDeliveryRefFromFutureDeliveriesRef(
  futureDeliveriesRef: FutureDeliveriesRefType,
  deliveryRef: admin.firestore.DocumentReference,
  deliveryDate: string
) {
  // Looks for the deliveryDate array in the map
  const deliveryDateRefs = futureDeliveriesRef[deliveryDate];

  if (!deliveryDateRefs) {
    throw new Error(
      `${deliveryDate} isn't in the futureDeliveriesRef map (${Object.keys(
        futureDeliveriesRef
      )}) + and it should be!`
    );
  }
  // Finds the index of the deliveryRef
  const deliveryRefIndex = deliveryDateRefs.findIndex(
    (ref: admin.firestore.DocumentReference) => ref.id === deliveryRef.id
  );

  if (deliveryRefIndex === -1) {
    throw new Error(
      `
    Delivery with reference ${deliveryRef.id} is not ` +
        `in the ${deliveryDate} list of deliveries.`
    );
  }
  // Removes the deliveryRef from the deliveryDateRefs array
  deliveryDateRefs.splice(deliveryRefIndex, 1);

  // If the deliveryDateRefs array is empty, removes the deliveryDate from
  // the futureDeliveriesRef object
  if (deliveryDateRefs.length === 0) {
    delete futureDeliveriesRef[deliveryDate];
  }

  return futureDeliveriesRef;
}

/**
 * Adds a delivery reference to the future deliveries map for the given
 * delivery date. If the delivery date doesn't exist yet in the map, it
 * creates it and assigns the delivery reference to it. If the delivery date
 * already exists in the map, it adds the delivery reference to the existing
 * array.
 *
 * @param {FutureDeliveriesRefType} futureDeliveriesRef - The future
 * deliveries map object.
 *
 * @param {admin.firestore.DocumentReference} deliveryRef - The delivery
 * reference to add to the map.
 *
 * @param {string} deliveryDate - The delivery date to which the delivery
 * reference should be added.
 *
 * @return {FutureDeliveriesRefType} - The updated future deliveries map
 * object.
 */
export function addDeliveryRefToFutureDeliveriesRef(
  futureDeliveriesRef: FutureDeliveriesRefType,
  deliveryRef: admin.firestore.DocumentReference,
  deliveryDate: string
) {
  // Looks for the deliveryDate array in the map
  const deliveryDateRefs = futureDeliveriesRef[deliveryDate];

  if (!deliveryDateRefs) {
    // If the deliveryDate doesn't exist yet in the map, create it
    // and assign the deliveryRef to it.
    futureDeliveriesRef[deliveryDate] = [deliveryRef];
  } else {
    // If the deliveryDate already exists in the map, add the deliveryRef
    // to the existing array.
    deliveryDateRefs.push(deliveryRef);
  }

  return futureDeliveriesRef;
}

/**
 * Update the activeDeliveriesRef field of a truck document in Firestore.
 * @param {admin.firestore.DocumentReference} truckRef - Reference to
 * the truck document.
 *
 * @param {admin.firestore.DocumentReference} deliveryRef - Reference to
 * the delivery document.
 *
 * @param {string} action - Action to perform: 'add' or 'remove'.
 *
 * @return {Promise<void>} Promise that resolves when the update is complete.
 */
export async function updateTruckActiveDeliveriesRef(
  truckRef: admin.firestore.DocumentReference,
  deliveryRef: admin.firestore.DocumentReference,
  action: "add" | "remove"
): Promise<void> {
  const truckDoc = await truckRef.get();

  if (!truckDoc.exists) {
    console.log("Assigned truck document does not exist");
    return;
  }

  if (action === "add") {
    await truckRef.update({
      activeDeliveriesRef: admin.firestore.FieldValue.arrayUnion(deliveryRef),
    });
  } else if (action === "remove") {
    await truckRef.update({
      activeDeliveriesRef: admin.firestore.FieldValue.arrayRemove(deliveryRef),
    });
  }
}
