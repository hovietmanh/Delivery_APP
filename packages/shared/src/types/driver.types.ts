export type DriverStatus = 'OFFLINE' | 'ONLINE' | 'BUSY';

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  vehicleType: string;
  vehiclePlate: string;
  status: DriverStatus;
  rating: number;
  totalTrips: number;
  currentLatitude?: number;
  currentLongitude?: number;
}

export interface NearbyDriver {
  id: string;
  lat: number;
  lng: number;
  fullName: string;
  avatarUrl?: string;
  rating: number;
  vehicleType: string;
  vehiclePlate: string;
  distance: number;
}
