import { GpsPoint, Waypoint } from './track';

/**
 * Komoot Integration Domain Types and State Unions
 */

export interface KomootUser {
  readonly id: string;
  readonly display_name: string;
  readonly username?: string;
  readonly email?: string;
  readonly avatar_url?: string;
  readonly status?: string;
}

export type KomootDifficulty = 'easy' | 'moderate' | 'difficult';
export type KomootTransferStatus = 'idle' | 'transferring' | 'transferred' | 'error';

export interface KomootTour {
  readonly id: string | number;
  readonly name: string;
  readonly distance: number; // in meters
  readonly distanceKm: string;
  readonly duration: number; // in seconds
  readonly durationFormatted: string;
  readonly elevation_up: number; // in meters
  readonly elevation_down?: number;
  readonly sport: string; // e.g. "touringbicycle", "racebike", "mtb"
  readonly date: string;
  readonly difficulty?: KomootDifficulty;
  readonly imageUrl?: string;
  readonly downloadedToDevice?: boolean;
  readonly transferStatus?: KomootTransferStatus;
  readonly transferError?: string;
  readonly points?: GpsPoint[];
  readonly waypoints?: Waypoint[];
}

export interface KomootAuthStatus {
  readonly isAuthenticated: boolean;
  readonly user?: KomootUser;
}

export type KomootAuthState =
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'authenticating' }
  | { readonly status: 'authenticated'; readonly user: KomootUser }
  | { readonly status: 'error'; readonly message: string };

export interface RawKomootTourItem {
  readonly id: number;
  readonly name: string;
  readonly type: string;
  readonly date: string;
  readonly status: string;
  readonly distance: number;
  readonly duration: number;
  readonly elevation_up: number;
  readonly elevation_down: number;
  readonly sport: string;
  readonly difficulty?: {
    readonly grade: string;
    readonly explanation: string;
  };
  readonly _embedded?: {
    readonly creator?: {
      readonly display_name: string;
    };
  };
}

