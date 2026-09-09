import { app, BrowserWindow, safeStorage } from 'electron';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { KomootAuthStatus, KomootUser, StravaAuthStatus, StravaTokenData } from '../types';
import { STRAVA_CONFIG } from '../constants/api';
import { logger } from './logger';

const TAG = 'AuthManager';

interface StoredEncryptedVault {
  strava?: string; // base64 encrypted payload
  komoot?: string; // base64 encrypted payload
}

export class AuthManager {
  private vaultPath: string;
  private fallbackKey: Buffer;

  // Strava Developer App credentials must be provided via environment variables or .env file
  private stravaClientId: string = process.env.STRAVA_CLIENT_ID || '';
  private stravaClientSecret: string = process.env.STRAVA_CLIENT_SECRET || '';
  private stravaRedirectUri: string = STRAVA_CONFIG.REDIRECT_URI;

  constructor() {
    const userDataDir = app ? app.getPath('userData') : path.join(process.cwd(), '.cycloconnect');
    if (!fs.existsSync(userDataDir)) {
      try {
        fs.mkdirSync(userDataDir, { recursive: true });
      } catch {
        // ignore
      }
    }
    this.vaultPath = path.join(userDataDir, 'credentials_vault.enc');

    // Secure machine-salted fallback key if safeStorage is not available
    const machineId = (process.env.USER || process.env.USERNAME || 'cycloconnect_user') + '_mio_seed_2026';
    this.fallbackKey = crypto.scryptSync(machineId, 'cycloconnect_salt_2026', 32);
  }

  private ensureStravaCredentials(): void {
    if (!this.stravaClientId || !this.stravaClientSecret) {
      throw new Error(
        'Strava API credentials are not configured. Please set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in your .env file or environment variables.'
      );
    }
  }

  /**
   * Encrypt plaintext using Electron safeStorage (Windows DPAPI)
   */
  private encrypt(plaintext: string): string {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = safeStorage.encryptString(plaintext);
      return `safe:${encryptedBuffer.toString('base64')}`;
    }

    // AES-256-GCM fallback
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.fallbackKey, iv);
    let enc = cipher.update(plaintext, 'utf8', 'base64');
    enc += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    return `fallback:${iv.toString('base64')}:${authTag}:${enc}`;
  }

  /**
   * Decrypt ciphertext using Electron safeStorage (or AES-256 fallback)
   */
  private decrypt(ciphertext: string): string | null {
    try {
      if (ciphertext.startsWith('safe:')) {
        const rawBase64 = ciphertext.substring(5);
        const buffer = Buffer.from(rawBase64, 'base64');
        return safeStorage.decryptString(buffer);
      }

      if (ciphertext.startsWith('fallback:')) {
        const parts = ciphertext.split(':');
        const iv = Buffer.from(parts[1], 'base64');
        const authTag = Buffer.from(parts[2], 'base64');
        const encrypted = parts[3];

        const decipher = crypto.createDecipheriv('aes-256-gcm', this.fallbackKey, iv);
        decipher.setAuthTag(authTag);
        let dec = decipher.update(encrypted, 'base64', 'utf8');
        dec += decipher.final('utf8');
        return dec;
      }

      return null;
    } catch (err) {
      logger.error(TAG, 'Decryption failed:', err);
      return null;
    }
  }

  private readVault(): StoredEncryptedVault {
    try {
      if (fs.existsSync(this.vaultPath)) {
        const content = fs.readFileSync(this.vaultPath, 'utf8');
        return JSON.parse(content) as StoredEncryptedVault;
      }
    } catch (err) {
      logger.warn(TAG, 'Could not read vault file, initializing new vault:', err);
    }
    return {};
  }

  private writeVault(vault: StoredEncryptedVault): void {
    try {
      fs.writeFileSync(this.vaultPath, JSON.stringify(vault, null, 2), 'utf8');
    } catch (err) {
      logger.error(TAG, 'Failed to write credentials vault:', err);
    }
  }

  // ==================== STRAVA TOKENS ====================

  public saveStravaTokens(tokenData: StravaTokenData): void {
    const vault = this.readVault();
    vault.strava = this.encrypt(JSON.stringify(tokenData));
    this.writeVault(vault);
    logger.info(TAG, 'Successfully encrypted and saved Strava token to vault.');
  }

  public getStravaTokens(): StravaTokenData | null {
    const vault = this.readVault();
    if (!vault.strava) return null;

    const decrypted = this.decrypt(vault.strava);
    if (!decrypted) return null;

    try {
      return JSON.parse(decrypted) as StravaTokenData;
    } catch {
      return null;
    }
  }

  public clearStravaTokens(): void {
    const vault = this.readVault();
    delete vault.strava;
    this.writeVault(vault);
    logger.info(TAG, 'Strava tokens cleared from vault.');
  }

  public getStravaAuthStatus(): StravaAuthStatus {
    const tokens = this.getStravaTokens();
    if (!tokens || !tokens.access_token) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      athlete: tokens.athlete,
      expiresAt: tokens.expires_at,
    };
  }

  /**
   * Launches Electron BrowserWindow to handle the Strava OAuth2 Authorization code flow.
   */
  public async launchStravaOAuthWindow(parentWindow?: BrowserWindow): Promise<StravaTokenData> {
    this.ensureStravaCredentials();

    return new Promise((resolve, reject) => {
      const authUrl = `${STRAVA_CONFIG.AUTH_URL}?client_id=${this.stravaClientId}&response_type=code&redirect_uri=${encodeURIComponent(
        this.stravaRedirectUri
      )}&approval_prompt=auto&scope=${STRAVA_CONFIG.SCOPE}`;

      const authWindow = new BrowserWindow({
        width: 600,
        height: 720,
        show: false,
        parent: parentWindow || undefined,
        modal: !!parentWindow,
        title: 'Connect with Strava - CycloConnect',
        backgroundColor: '#0F172A',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      });

      let handled = false;

      const filter = {
        urls: [`${this.stravaRedirectUri}*`],
      };

      authWindow.webContents.session.webRequest.onBeforeRequest(filter, async (details, callback) => {
        const url = new URL(details.url);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (code) {
          handled = true;
          callback({ cancel: true });
          authWindow.destroy();

          try {
            const tokenData = await this.exchangeStravaAuthCode(code);
            this.saveStravaTokens(tokenData);
            resolve(tokenData);
          } catch (exchangeErr) {
            reject(exchangeErr);
          }
        } else if (error) {
          handled = true;
          callback({ cancel: true });
          authWindow.destroy();
          reject(new Error(`Strava OAuth error: ${error}`));
        } else {
          callback({});
        }
      });

      authWindow.on('closed', () => {
        if (!handled) {
          reject(new Error('User closed the Strava login window before completion.'));
        }
      });

      authWindow.loadURL(authUrl);
      authWindow.once('ready-to-show', () => {
        authWindow.show();
      });
    });
  }

  /**
   * Exchanges OAuth authorization code for permanent refresh_token and current access_token.
   */
  public async exchangeStravaAuthCode(code: string): Promise<StravaTokenData> {
    this.ensureStravaCredentials();

    const response = await fetch(STRAVA_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.stravaClientId,
        client_secret: this.stravaClientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(TAG, `Strava code exchange failed (${response.status}):`, errorText);
      throw new Error(`Failed to exchange Strava auth code: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as StravaTokenData;
    return data;
  }

  /**
   * Refresh Strava token if expired or expiring soon
   */
  public async getValidStravaAccessToken(): Promise<string> {
    const tokens = this.getStravaTokens();
    if (!tokens || !tokens.access_token) {
      throw new Error('Not logged into Strava. Please authenticate first.');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (tokens.expires_at && tokens.expires_at - nowSeconds < STRAVA_CONFIG.TOKEN_REFRESH_WINDOW_SECONDS) {
      this.ensureStravaCredentials();
      logger.info(TAG, 'Strava access token expired or expiring soon, refreshing...');

      const refreshResponse = await fetch(STRAVA_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.stravaClientId,
          client_secret: this.stravaClientSecret,
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        logger.error(TAG, 'Failed to refresh Strava access token');
        throw new Error('Failed to refresh Strava access token');
      }

      const refreshed = (await refreshResponse.json()) as StravaTokenData;
      const updatedTokens: StravaTokenData = {
        ...refreshed,
        athlete: tokens.athlete,
      };
      this.saveStravaTokens(updatedTokens);
      return updatedTokens.access_token;
    }

    return tokens.access_token;
  }

  // ==================== KOMOOT CREDENTIALS ====================

  public saveKomootAuth(authData: { user: KomootUser; sessionCookie?: string; token?: string }): void {
    const vault = this.readVault();
    vault.komoot = this.encrypt(JSON.stringify(authData));
    this.writeVault(vault);
    logger.info(TAG, 'Successfully encrypted and saved Komoot credentials to vault.');
  }

  public getKomootAuth(): { user: KomootUser; sessionCookie?: string; token?: string } | null {
    const vault = this.readVault();
    if (!vault.komoot) return null;

    const decrypted = this.decrypt(vault.komoot);
    if (!decrypted) return null;

    try {
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  public clearKomootAuth(): void {
    const vault = this.readVault();
    delete vault.komoot;
    this.writeVault(vault);
    logger.info(TAG, 'Komoot session cleared from vault.');
  }

  public getKomootAuthStatus(): KomootAuthStatus {
    const auth = this.getKomootAuth();
    if (!auth || !auth.user || !auth.user.id) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      user: auth.user,
    };
  }
}
