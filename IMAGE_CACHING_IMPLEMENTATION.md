# Image Caching Implementation

This document explains the image caching functionality implemented for the BiggBoss app.

## Overview

The image caching system automatically downloads and stores Firebase images locally on the device to improve performance and reduce data usage. Images are cached using the contestant's name as a key.

## How It Works

### 1. Image Cache Service (`src/app/services/image-cache.service.ts`)

The `ImageCacheService` handles all image caching operations:

- **Download and Cache**: Downloads images from Firebase URLs and stores them locally
- **Cache Management**: Stores image paths in Capacitor Preferences with key `cached_images`
- **File Storage**: Uses Capacitor Filesystem to store images in the `cached_images` directory
- **Cache Validation**: Checks if cached files still exist before using them

### 2. Integration in Home Page

The `HomePage` component integrates the caching service:

- **Automatic Processing**: When `getVotersData()` is called, it automatically processes all voter images
- **Fallback Support**: If caching fails, falls back to original Firebase URLs
- **Error Handling**: Gracefully handles download failures and network issues

### 3. Template Updates

The HTML template uses cached images with fallback:

```html
<img [src]="voter.cachedImgUrl || voter.imgUrl" (load)="onImageLoad(i)" class="voterImg" alt="loading.." />
```

## Key Features

### Automatic Caching
- Images are automatically downloaded and cached when first accessed
- Subsequent loads use cached images for faster performance
- No manual intervention required

### Smart Fallback
- If cached image is not available, uses original Firebase URL
- If download fails, gracefully falls back to original URL
- Ensures images always display even if caching fails

### Cache Management
- Images are stored with contestant names as keys
- Cache can be cleared using `clearCache()` method
- Cache statistics available via `getCacheInfo()` method

### File Organization
- Images stored in `cached_images/` directory
- File names sanitized (special characters replaced with underscores)
- File extensions preserved from original URLs

## Usage

### Basic Usage
The caching works automatically - no additional code needed. When `getVotersData()` is called:

1. Firebase data is fetched
2. Images are processed for caching
3. Cached paths are added to voter objects
4. Template displays cached images

### Manual Cache Management

```typescript
// Get cache statistics
const stats = await this.getCacheStats();
console.log(`Cached images: ${stats.count}, Total size: ${stats.totalSize} bytes`);

// Refresh all cached images (force re-download)
await this.refreshVoterImages();

// Clear all cached images
await this.imageCacheService.clearCache();
```

## Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Falls back to original URLs if download fails
- **File System Errors**: Handles storage permission issues gracefully
- **Invalid URLs**: Skips caching for malformed URLs
- **Missing Data**: Handles cases where name or imgUrl is missing

## Performance Benefits

- **Faster Loading**: Cached images load instantly on subsequent visits
- **Reduced Data Usage**: Images only downloaded once
- **Offline Support**: Cached images work without internet connection
- **Better UX**: No loading delays for previously viewed images

## Storage Considerations

- Images are stored in device's data directory
- Cache size grows with number of contestants
- Consider implementing cache size limits for production
- Cache can be cleared to free up space

## Future Enhancements

Potential improvements for the caching system:

1. **Cache Size Limits**: Implement maximum cache size with LRU eviction
2. **Image Compression**: Compress images before storing to save space
3. **Background Refresh**: Update cached images in background
4. **Cache Expiration**: Add TTL for cached images
5. **Batch Operations**: Optimize bulk image processing