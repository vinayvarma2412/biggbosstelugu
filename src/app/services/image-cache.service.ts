import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class ImageCacheService {
  private readonly CACHE_KEY = 'cached_images';
  private readonly CACHE_DIRECTORY = 'cached_images';

  constructor() { }

  /**
   * Get cached image path for a given name
   * @param name - The name/key to look for in cache
   * @returns Promise<string | null> - Cached image path or null if not found
   */
  async getCachedImagePath(name: string): Promise<string | null> {
    try {
      const cachedImages = await this.getCachedImages();
      return cachedImages[name] || null;
    } catch (error) {
      console.error('Error getting cached image path:', error);
      return null;
    }
  }

  /**
   * Check if Filesystem plugin is available
   */
  private isFilesystemAvailable(): boolean {
    return Capacitor.isPluginAvailable('Filesystem');
  }

  /**
   * Cache an image by downloading it and storing the local path
   * @param name - The name/key to store the image under
   * @param imageUrl - The URL of the image to download
   * @returns Promise<string | null> - Local file path or null if failed
   */
  async cacheImage(name: string, imageUrl: string): Promise<string | null> {
    try {
      // Check if Filesystem plugin is available
      if (!this.isFilesystemAvailable()) {
        console.warn('Filesystem plugin not available, skipping cache');
        return null;
      }

      // Check if already cached
      const existingPath = await this.getCachedImagePath(name);
      if (existingPath) {
        // Verify the file still exists
        const fileExists = await this.fileExists(existingPath);
        if (fileExists) {
          return existingPath;
        }
      }

      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64Data = this.arrayBufferToBase64(arrayBuffer);
      
      // Get file extension from URL or default to jpg
      const fileExtension = this.getFileExtension(imageUrl) || 'jpg';
      const fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExtension}`;
      
      // Ensure cache directory exists
      await this.ensureCacheDirectoryExists();
      
      // Write file to cache directory
      const filePath = `${this.CACHE_DIRECTORY}/${fileName}`;
      console.log(`Writing file to cache: ${filePath}`);
      console.log(`Base64 data length: ${base64Data.length}`);
      console.log(`Platform: ${Capacitor.getPlatform()}`);
      
      const result = await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Data
      });

      const localPath = result.uri;
      console.log(`File written successfully, URI: ${localPath}`);
      console.log(`File path used: ${filePath}`);
      console.log(`Result object:`, result);
      
      // Verify the file was actually written
      try {
        const verifyStat = await Filesystem.stat({
          path: filePath,
          directory: Directory.Data
        });
        console.log(`File verification successful:`, verifyStat);
      } catch (verifyError) {
        console.error(`File verification failed:`, verifyError);
        throw new Error(`File was not written successfully: ${verifyError}`);
      }
      
      // Store the relative path in preferences (not the full URI)
      await this.setCachedImagePath(name, filePath);
      console.log(`Cached image path stored for ${name}: ${filePath}`);
      
      return this.getFileUri(filePath);
    } catch (error) {
      console.error('Error caching image:', error);
      return null;
    }
  }

  /**
   * Get the proper file URI for display in web context
   * @param filePath - The file path from Capacitor Filesystem
   * @returns string - Proper file URI for display
   */
  getFileUri(filePath: string): string {
    return Capacitor.convertFileSrc(filePath);
  }

  /**
   * Get cached image as data URL for web platform
   * @param filePath - The file path from Capacitor Filesystem
   * @returns Promise<string | null> - Data URL or null if failed
   */
  async getCachedImageAsDataUrl(filePath: string): Promise<string | null> {
    try {
      console.log('Converting cached image to data URL:', filePath);
      console.log('Is native platform:', Capacitor.isNativePlatform());
      console.log('Platform:', Capacitor.getPlatform());
      
      // Check if Filesystem plugin is available
      if (!this.isFilesystemAvailable()) {
        console.warn('Filesystem plugin not available, cannot read cached image');
        return null;
      }
      
      // First check if file exists
      const fileExists = await this.fileExists(filePath);
      if (!fileExists) {
        console.warn('Cached file does not exist:', filePath);
        return null;
      }
      
      // For native platforms (Android/iOS), read file and convert to data URL
      if (Capacitor.isNativePlatform()) {
        console.log('Reading file for native platform and converting to data URL');
        try {
          const fileData = await Filesystem.readFile({
            path: filePath,
            directory: Directory.Data
          });
          
          console.log('File data received:', {
            hasData: !!fileData.data,
            dataType: typeof fileData.data,
            dataLength: typeof fileData.data === 'string' ? fileData.data.length : fileData.data?.size || 0
          });
          
          if (!fileData.data) {
            console.error('No data received from file read');
            return null;
          }
          
          // Get file extension for proper MIME type
          const extension = this.getFileExtensionFromPath(filePath) || 'jpg';
          const mimeType = this.getMimeTypeFromExtension(extension);
          
          console.log('File read successfully for native platform, extension:', extension, 'MIME type:', mimeType);
          const dataUrl = `data:${mimeType};base64,${fileData.data}`;
          console.log('Generated data URL length:', dataUrl.length);
          return dataUrl;
        } catch (error) {
          console.error('Error reading file for native platform:', error);
          return null;
        }
      } else {
        // For web platform, read the file and convert to data URL
        console.log('Reading file for web platform...');
        const fileData = await Filesystem.readFile({
          path: filePath,
          directory: Directory.Data
        });
        
        // Get file extension for proper MIME type
        const extension = this.getFileExtensionFromPath(filePath) || 'jpg';
        const mimeType = this.getMimeTypeFromExtension(extension);
        
        console.log('File read successfully, extension:', extension, 'MIME type:', mimeType);
        return `data:${mimeType};base64,${fileData.data}`;
      }
    } catch (error) {
      console.error('Error converting cached image to data URL:', error);
      return null;
    }
  }

  /**
   * Get file extension from file path
   * @param filePath - The file path
   * @returns string | null - File extension or null
   */
  private getFileExtensionFromPath(filePath: string): string | null {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot !== -1) {
      return filePath.substring(lastDot + 1).toLowerCase();
    }
    return null;
  }

  /**
   * Get MIME type from file extension
   * @param extension - File extension
   * @returns string - MIME type
   */
  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
  }

  /**
   * Ensure the cache directory exists
   */
  private async ensureCacheDirectoryExists(): Promise<void> {
    // Check if Filesystem plugin is available
    if (!this.isFilesystemAvailable()) {
      console.warn('Filesystem plugin not available, cannot create cache directory');
      return;
    }

    try {
      // Check if directory exists
      const stat = await Filesystem.stat({
        path: this.CACHE_DIRECTORY,
        directory: Directory.Data
      });
      console.log(`Cache directory exists: ${this.CACHE_DIRECTORY}`, stat);
    } catch (error) {
      // Directory doesn't exist, create it
      try {
        console.log(`Creating cache directory: ${this.CACHE_DIRECTORY}`);
        await Filesystem.mkdir({
          path: this.CACHE_DIRECTORY,
          directory: Directory.Data,
          recursive: true
        });
        console.log(`Successfully created cache directory: ${this.CACHE_DIRECTORY}`);
      } catch (mkdirError) {
        console.error('Error creating cache directory:', mkdirError);
        throw mkdirError;
      }
    }
  }

  /**
   * Get all cached images from preferences
   * @returns Promise<{[key: string]: string}> - Object with name as key and path as value
   */
  private async getCachedImages(): Promise<{[key: string]: string}> {
    try {
      const result = await Preferences.get({ key: this.CACHE_KEY });
      return result.value ? JSON.parse(result.value) : {};
    } catch (error) {
      console.error('Error getting cached images:', error);
      return {};
    }
  }

  /**
   * Set cached image path in preferences
   * @param name - The name/key to store
   * @param path - The local file path
   */
  private async setCachedImagePath(name: string, path: string): Promise<void> {
    try {
      const cachedImages = await this.getCachedImages();
      cachedImages[name] = path;
      await Preferences.set({
        key: this.CACHE_KEY,
        value: JSON.stringify(cachedImages)
      });
    } catch (error) {
      console.error('Error setting cached image path:', error);
    }
  }

  /**
   * Check if a file exists at the given path
   * @param path - The file path to check
   * @returns Promise<boolean> - True if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    // Check if Filesystem plugin is available
    if (!this.isFilesystemAvailable()) {
      console.warn('Filesystem plugin not available, cannot check file existence');
      return false;
    }

    try {
      const stat = await Filesystem.stat({ path, directory: Directory.Data });
      console.log(`File exists: ${path}`, stat);
      return true;
    } catch (error) {
      console.log(`File does not exist: ${path}`, error);
      return false;
    }
  }

  /**
   * Convert ArrayBuffer to Base64 string
   * @param buffer - The ArrayBuffer to convert
   * @returns string - Base64 encoded string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Extract file extension from URL
   * @param url - The URL to extract extension from
   * @returns string | null - File extension or null if not found
   */
  private getFileExtension(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const lastDot = pathname.lastIndexOf('.');
      if (lastDot !== -1) {
        return pathname.substring(lastDot + 1).toLowerCase();
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    try {
      // Clear from preferences
      await Preferences.remove({ key: this.CACHE_KEY });
      
      // Try to remove the cache directory (this might fail on some platforms)
      try {
        await Filesystem.rmdir({
          path: this.CACHE_DIRECTORY,
          directory: Directory.Data,
          recursive: true
        });
      } catch (error) {
        console.warn('Could not remove cache directory:', error);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache size information
   * @returns Promise<{count: number, totalSize: number}> - Cache statistics
   */
  async getCacheInfo(): Promise<{count: number, totalSize: number}> {
    try {
      const cachedImages = await this.getCachedImages();
      const count = Object.keys(cachedImages).length;
      
      let totalSize = 0;
      for (const path of Object.values(cachedImages)) {
        try {
          const stat = await Filesystem.stat({ path, directory: Directory.Data });
          totalSize += stat.size || 0;
        } catch (error) {
          // File might not exist, skip it
        }
      }
      
      return { count, totalSize };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { count: 0, totalSize: 0 };
    }
  }
}
