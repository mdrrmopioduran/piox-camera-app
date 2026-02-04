import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

interface Photo {
  id: string;
  event_title: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
  resolution: string;
  base64: string;
}

export default function CameraScreen() {
  const cameraRef = useRef<any>(null);
  
  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  
  // State
  const [eventTitle, setEventTitle] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(true);
  const [photoCount, setPhotoCount] = useState(0);

  // Get location on mount
  useEffect(() => {
    if (locationPermission?.granted && isLocationEnabled) {
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).then(setLocation).catch(console.error);
    }
  }, [locationPermission?.granted, isLocationEnabled]);

  // Request all permissions and load photo count
  useEffect(() => {
    const initializeApp = async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!locationPermission?.granted) {
        await requestLocationPermission();
      }
      if (!mediaPermission?.granted) {
        await requestMediaPermission();
      }
      
      // Load photo count
      await updatePhotoCount();
    };
    
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updatePhotoCount = async () => {
    try {
      const photosJson = await AsyncStorage.getItem('photos');
      const photos: Photo[] = photosJson ? JSON.parse(photosJson) : [];
      setPhotoCount(photos.length);
    } catch (error) {
      console.error('Error loading photo count:', error);
    }
  };

  const savePhotoToStorage = async (photo: Photo) => {
    try {
      const photosJson = await AsyncStorage.getItem('photos');
      const photos: Photo[] = photosJson ? JSON.parse(photosJson) : [];
      photos.push(photo);
      await AsyncStorage.setItem('photos', JSON.stringify(photos));
      await updatePhotoCount();
    } catch (error) {
      console.error('Error saving photo:', error);
      throw error;
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      // Get current location if enabled
      let currentLocation = location;
      if (isLocationEnabled && locationPermission?.granted) {
        try {
          currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setLocation(currentLocation);
        } catch (error) {
          console.warn('Could not get location:', error);
        }
      }

      // Take photo in HD quality
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1, // HD quality (0-1)
        base64: true,
        exif: true,
      });

      // Save to device gallery
      if (mediaPermission?.granted) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }

      // Save to local storage
      const photoData: Photo = {
        id: Date.now().toString(),
        event_title: eventTitle || 'Untitled Event',
        latitude: currentLocation?.coords.latitude || null,
        longitude: currentLocation?.coords.longitude || null,
        timestamp: new Date().toISOString(),
        resolution: `${photo.width}x${photo.height}`,
        base64: photo.base64 || '',
      };

      await savePhotoToStorage(photoData);

      // Show success feedback
      Alert.alert(
        '✅ Photo Saved!',
        `Event: ${eventTitle || 'Untitled'}\nLocation: ${currentLocation ? 'GPS Tagged' : 'No GPS'}\nSaved to gallery and local storage\n\nTotal Photos: ${photoCount + 1}`,
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );

      // Clear event title for next photo
      setEventTitle('');
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const clearAllPhotos = async () => {
    Alert.alert(
      'Clear All Photos?',
      'This will remove all photos from local storage. Photos in your gallery will remain.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('photos');
              await updatePhotoCount();
              Alert.alert('Success', 'All photos cleared from storage');
            } catch (err) {
              console.error('Error clearing photos:', err);
              Alert.alert('Error', 'Failed to clear photos');
            }
          },
        },
      ]
    );
  };

  // Show permission request UI
  if (!cameraPermission || !locationPermission || !mediaPermission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={80} color="#FFD700" />
        <Text style={styles.permissionText}>Camera permission required</Text>
        <Text style={styles.permissionSubtext}>
          This app needs camera access to capture photos
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestCameraPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Top Controls */}
        <View style={styles.topControls}>
          <View style={styles.headerRow}>
            <Text style={styles.appTitle}>PioX Camera</Text>
            <View style={styles.photoCounter}>
              <Ionicons name="images-outline" size={20} color="#FFD700" />
              <Text style={styles.photoCountText}>{photoCount}</Text>
            </View>
          </View>
          
          {/* Location Status */}
          <View style={styles.locationStatus}>
            <Ionicons
              name={isLocationEnabled ? 'location' : 'location-outline'}
              size={16}
              color={isLocationEnabled ? '#4CAF50' : '#999'}
            />
            <Text style={styles.locationText}>
              {isLocationEnabled
                ? location
                  ? `GPS: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                  : 'Getting GPS...'
                : 'GPS Disabled'}
            </Text>
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Event Title Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="text-outline" size={20} color="#FFD700" />
            <TextInput
              style={styles.input}
              placeholder="Event Title (e.g., Disaster Documentation)"
              placeholderTextColor="#999"
              value={eventTitle}
              onChangeText={setEventTitle}
              maxLength={100}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            {/* Flip Camera */}
            <TouchableOpacity style={styles.secondaryButton} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse-outline" size={32} color="#FFF" />
            </TouchableOpacity>

            {/* Capture Button */}
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator size="large" color="#003DA5" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            {/* GPS Toggle */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setIsLocationEnabled(!isLocationEnabled)}
            >
              <Ionicons
                name={isLocationEnabled ? 'location' : 'location-outline'}
                size={32}
                color={isLocationEnabled ? '#4CAF50' : '#FFF'}
              />
            </TouchableOpacity>
          </View>

          {/* Info Text */}
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              HD Quality • GPS {isLocationEnabled ? 'Enabled' : 'Disabled'} • Saved Locally
            </Text>
            {photoCount > 0 && (
              <TouchableOpacity onPress={clearAllPhotos}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 24,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  permissionButtonText: {
    color: '#003DA5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  photoCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  photoCountText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  locationText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#003DA5',
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.8,
  },
  clearButton: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
