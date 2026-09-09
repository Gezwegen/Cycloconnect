/**
 * Strava Integration Domain Types and State Unions
 */

export interface StravaAthlete {
  readonly id: number;
  readonly username?: string;
  readonly firstname: string;
  readonly lastname: string;
  readonly profile?: string;
  readonly city?: string;
  readonly state?: string;
  readonly country?: string;
}

export interface StravaTokenData {
  readonly token_type: string;
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_at: number;
  readonly expires_in: number;
  readonly athlete?: StravaAthlete;
}

export interface StravaAuthStatus {
  readonly isAuthenticated: boolean;
  readonly athlete?: StravaAthlete;
  readonly expiresAt?: number;
  readonly scope?: string;
}

export type StravaAuthState =
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'authenticating' }
  | { readonly status: 'authenticated'; readonly athlete: StravaAthlete; readonly expiresAt?: number }
  | { readonly status: 'error'; readonly message: string };

export interface SyncProgress {
  readonly inProgress: boolean;
  readonly step: string;
  readonly progressPercent: number;
  readonly currentItem?: string;
  readonly totalItems?: number;
  readonly completedItems?: number;
  readonly error?: string;
}

export type SyncState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'syncing';
      readonly currentItem: string;
      readonly completedCount: number;
      readonly totalCount: number;
      readonly progressPercent: number;
      readonly stepDescription: string;
    }
  | {
      readonly status: 'completed';
      readonly totalCount: number;
      readonly successCount: number;
      readonly failCount: number;
    }
  | { readonly status: 'error'; readonly message: string };

export interface UploadResult {
  readonly uploadId: string;
  readonly activityId?: string;
  readonly status: string;
  readonly error?: string;
}

