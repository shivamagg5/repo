export interface Venue {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  capacity: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenuePublic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  capacity: number | null;
  media?: VenueMedia[];
}

export interface VenueMedia {
  id: string;
  venueId: string;
  url: string;
  type: string;
  sortOrder: number;
}

export interface VenueAvailability {
  id: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateVenueInput {
  organizationId?: string; // Optional in request body, verified/derived on server
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
}

export interface UpdateVenueInput {
  name?: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
}
