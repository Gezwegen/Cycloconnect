import * as path from 'path';

/**
 * Path Security & Canonical Containment Utilities
 * Enforces strict containment boundaries for all file system I/O.
 */
export class PathSecurity {
  /**
   * Asserts that a target file path resolves within the allowed root directory.
   * Throws an error if directory traversal is detected.
   */
  public static assertContainment(allowedRoot: string, targetPath: string, contextDescription = 'Path'): string {
    const canonicalRoot = path.resolve(allowedRoot).toLowerCase();
    const canonicalTarget = path.resolve(targetPath).toLowerCase();

    // Check if target starts with canonicalRoot (plus directory separator or exact match)
    const isValid =
      canonicalTarget === canonicalRoot ||
      canonicalTarget.startsWith(canonicalRoot.endsWith(path.sep) ? canonicalRoot : canonicalRoot + path.sep);

    if (!isValid) {
      throw new Error(`Security Violation: ${contextDescription} "${targetPath}" is outside allowed boundary "${allowedRoot}".`);
    }

    return path.resolve(targetPath);
  }

  /**
   * Strictly sanitizes filenames by stripping directory traversal sequences, path separators,
   * null bytes, and illegal filesystem characters.
   */
  public static sanitizeFilename(inputName: string, fallbackName: string): string {
    const sanitized = String(inputName || '')
      .replace(/[/\\?%*:|"<>]/g, '_')
      .replace(/\.\.+/g, '_')
      .replace(/[\x00-\x1f\x80-\x9f]/g, '')
      .trim();

    return sanitized || fallbackName;
  }

  /**
   * Verifies that the file has a .fit extension.
   */
  public static validateFitExtension(filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.fit') {
      throw new Error(
        `Invalid ride file format: "${path.basename(filePath)}". Only recorded .fit activity files can be uploaded to Strava. Unridden route files (.gpx) are not exportable.`
      );
    }
  }

  /**
   * Verifies that the file has a .gpx extension.
   */
  public static validateGpxExtension(filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.gpx') {
      throw new Error(`File is not a valid GPX route file: "${path.basename(filePath)}".`);
    }
  }
}

