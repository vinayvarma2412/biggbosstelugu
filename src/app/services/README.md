# Image Caching Service

This service provides comprehensive image caching functionality for the BiggBoss app, allowing images to be downloaded from Firebase Storage and stored locally until they are modified.

## Features

- **Automatic Caching**: Images are automatically downloaded and cached when first accessed
- **Modification Detection**: Checks Firebase metadata to detect when images are updated
- **Local Storage**: Uses Capacitor Filesystem API for cross-platform local storage
- **Cache Management**: Provides methods to clear cache, get cache info, and clean old images
- **Performance Optimization**: Preloads images for better user experience
- **Fallback Support**: Falls back to Firebase URLs if caching fails

## Usage

### Basic Usage

```typescript
// Inject the service
constructor(private imageCacheService: ImageCacheService) {}

// Get cached image URL
const cachedUrl = await this.imageCacheService.getCachedImageUrl('images/contestant1.jpg');
```

### Cache Management

```typescript
// Get cache information
const cacheInfo = await this.imageCacheService.getCacheInfo();
console.log(`Cached images: ${cacheInfo.count}, Size: ${cacheInfo.totalSize} bytes`);

// Clear all cached images
await this.imageCacheService.clearCache();

// Clean up old images (older than 30 days)
await this.imageCacheService.cleanupOldCache(30);

// Preload multiple images
const imagePaths = ['images/img1.jpg', 'images/img2.jpg'];
await this.imageCacheService.preloadImages(imagePaths);
```

## Implementation Details

### How It Works

1. **First Access**: When an image is requested for the first time, it's downloaded from Firebase Storage and saved locally
2. **Subsequent Access**: On subsequent requests, the service checks if the cached image is up-to-date by comparing Firebase metadata
3. **Update Detection**: If the image has been modified on Firebase, it's re-downloaded and cached
4. **Local Storage**: Images are stored in the app's data directory using Capacitor Filesystem API

### Storage Structure

```
App Data Directory/
└── cached_images/
    ├── contestant1_1640995200000.jpg
    ├── contestant2_1640995200001.jpg
    └── ...
```

### Metadata Storage

Cache metadata is stored in Capacitor Preferences with the following structure:

```typescript
{
  "images/contestant1.jpg": {
    "url": "https://firebase-storage-url...",
    "localPath": "cached_images/contestant1_1640995200000.jpg",
    "lastModified": "2023-12-31T12:00:00.000Z",
    "size": 1024000,
    "downloadedAt": "2023-12-31T12:00:00.000Z"
  }
}
```

## Integration with Home Component

The home component has been updated to use cached images for:

- **Contestant Images**: `contestant.imageUrl`
- **Voter Images**: `voter.imageUrl`
- **Winner Images**: `winner.img`
- **Highlight Images**: `highlight.imgUrl`
- **Live Picture**: `livePicUrl`
- **Logo**: `logoUrl`

### Automatic Preloading

The app automatically preloads all images after data is loaded:

```typescript
// In getSectionControlls()
setTimeout(() => {
  this.preloadAllImages();
  this.cleanupOldImages(); // Clean up old images on app start
}, 2000);
```

## Cache Settings Component

A cache settings component is available that allows users to:

- View cache information (count and size)
- Clear all cached images
- Clean up old images (older than 30 days)

## Error Handling

The service includes comprehensive error handling:

- **Network Errors**: Falls back to Firebase URLs if download fails
- **Storage Errors**: Logs errors and continues with fallback
- **Metadata Errors**: Assumes image needs update if metadata check fails

## Performance Benefits

1. **Faster Loading**: Cached images load instantly from local storage
2. **Reduced Data Usage**: Images are only downloaded once
3. **Offline Support**: Cached images work without internet connection
4. **Bandwidth Savings**: No repeated downloads of unchanged images

## Platform Support

- **iOS**: Uses native file system
- **Android**: Uses native file system  
- **Web**: Uses base64 data URLs (limited by browser storage)

## Configuration

The service can be configured by modifying these constants:

```typescript
private cacheDir = 'cached_images';           // Cache directory name
private cacheMetadataKey = 'image_cache_metadata'; // Metadata storage key
```

## Best Practices

1. **Preload Critical Images**: Use `preloadImages()` for images that will be displayed soon
2. **Regular Cleanup**: Call `cleanupOldCache()` periodically to manage storage
3. **Monitor Cache Size**: Use `getCacheInfo()` to monitor cache growth
4. **Handle Errors**: Always wrap calls in try-catch blocks
5. **User Control**: Provide users with cache management options

## Troubleshooting

### Common Issues

1. **Images Not Caching**: Check Firebase Storage permissions and network connectivity
2. **Storage Full**: Use `clearCache()` or `cleanupOldCache()` to free space
3. **Slow Performance**: Ensure images are being preloaded properly
4. **Web Platform Issues**: Web platform has storage limitations, consider implementing IndexedDB for larger caches

### Debug Information

Enable console logging to see cache operations:

```typescript
// The service logs all major operations
console.log('Image cached successfully');
console.log('Cache cleared successfully');
console.log('Preloaded X images');
```
