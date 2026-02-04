# PioX Camera App

A simple, single-page HD camera mobile application with GPS geo-tagging and local storage.

## Features

- 📸 **HD Quality Photos** - Capture high-definition photos with maximum quality
- 🗺️ **GPS Geo-Tagging** - Tag photos with precise GPS coordinates (optional)
- 💾 **Local Storage** - Save photos locally using AsyncStorage
- 📱 **Native Camera** - Full-screen camera experience using Expo Camera
- 🎯 **Event Titles** - Add custom event titles to your photos
- 🔄 **Camera Flip** - Switch between front and back cameras
- 📊 **Photo Counter** - Track how many photos you've captured
- 🗑️ **Clear All** - Option to clear all photos from local storage

## Tech Stack

- **React Native** - Mobile app framework
- **Expo** - Development platform and tools
- **TypeScript** - Type-safe development
- **AsyncStorage** - Local data persistence
- **Expo Camera** - Native camera access
- **Expo Location** - GPS coordinates
- **Expo Media Library** - Save to device gallery

## Project Structure

```
/app/
├── app/                    # Expo Router app directory
│   └── index.tsx          # Main camera screen (single page)
├── assets/                # Images, fonts, and other static assets
├── node_modules/          # Dependencies
├── app.json              # Expo configuration
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Yarn or npm
- Expo Go app (for testing on physical device)

### Installation

1. Install dependencies:
```bash
yarn install
```

2. Start the development server:
```bash
yarn start
```

3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

## Usage

1. **Grant Permissions**: Allow camera, location, and media library access
2. **Enter Event Title**: Type a title for your photo (optional)
3. **Capture Photo**: Tap the large circular button to take a photo
4. **Toggle GPS**: Use the location button to enable/disable GPS tagging
5. **Flip Camera**: Switch between front and back cameras
6. **View Count**: See total photos saved in the top-right corner
7. **Clear All**: Remove all photos from local storage (gallery photos remain)

## Data Storage

Photos are stored using AsyncStorage with the following structure:

```typescript
interface Photo {
  id: string;
  event_title: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
  resolution: string;
  base64: string;
}
```

Photos are also automatically saved to your device's camera roll/gallery.

## Permissions

The app requires the following permissions:

- **Camera**: To capture photos
- **Location**: To tag photos with GPS coordinates
- **Media Library**: To save photos to device gallery

## Development

### Available Scripts

- `yarn start` - Start Expo development server
- `yarn android` - Open on Android emulator/device
- `yarn ios` - Open on iOS simulator/device
- `yarn web` - Open in web browser (limited functionality)
- `yarn lint` - Run ESLint

### Build for Production

To create a production build:

```bash
# For Android
expo build:android

# For iOS
expo build:ios
```

## Notes

- This is a **client-side only** application with no backend
- All data is stored locally on the device
- Photos in base64 format may consume significant storage
- Clearing app data will remove all stored photos (gallery photos are safe)

## License

MIT License - Feel free to use this project for your own purposes.

## Version

1.0.0 - Initial Release
