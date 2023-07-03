export interface Item {
  name: string;
  quantity: string;
  unit: string;
}

export interface GeoAddress {
  latitude: number;
  longitude: number;
}

export interface Truck {
  activeDeliveriesRef: FirebaseFirestore.DocumentReference[];
  completedDeliveriesRef: FirebaseFirestore.DocumentReference[];
  currentDateDriversRef: FirebaseFirestore.DocumentReference[];
  driverRef: FirebaseFirestore.DocumentReference | null;
  futureDeliveriesRef: {
    [date: string]: FirebaseFirestore.DocumentReference[];
  };
  geoAddressArray: GeoAddress[];
  id: string;
  historyRef: FirebaseFirestore.DocumentReference;
  lastLocation: GeoAddress;
  licensePlate: string;
  name: string;
  size: string;
}

export interface HistoryTruck {
  history: {
    [date: string]: {
      activeDeliveriesRef: FirebaseFirestore.DocumentReference[];
      completedDeliveriesRef: FirebaseFirestore.DocumentReference[];
      currentDateDriversRef: FirebaseFirestore.DocumentReference[];
      geoAddressArray: GeoAddress[];
    };
  };
  truckRef: FirebaseFirestore.DocumentReference;
}

export interface Delivery {
  address: string;
  addressNumber: string;
  city: string;
  clientRef: FirebaseFirestore.DocumentReference | null;
  createdAt: FirebaseFirestore.Timestamp;
  deliveryDate: string;
  deliveredAt?: FirebaseFirestore.Timestamp;
  expectedDeliveryInterval: string;
  geoAddress: GeoAddress;
  id?: string;
  isComplete: boolean;
  items: Item[];
  number: number;
  state: string;
  truckRef: FirebaseFirestore.DocumentReference | null;
}
