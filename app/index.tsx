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
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const router = useRouter();
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

  // Get location on mount
  useEffect(() => {
    if (locationPermission?.granted && isLocationEnabled) {
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).then(setLocation).catch(console.error);
    }
  }, [locationPermission?.granted, isLocationEnabled]);

  // Request all permissions on mount
  useEffect(() => {
    (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!locationPermission?.granted) {
        await requestLocationPermission();
      }
      if (!mediaPermission?.granted) {
        await requestMediaPermission();
      }
    })();
  }, []);

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

      // Save to gallery
      if (mediaPermission?.granted) {
        const eventSlug = eventTitle || 'GeoPhoto';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${eventSlug}_${timestamp}`;
        
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }

      // Save to backend
      const photoData = {
        event_title: eventTitle || 'Untitled Event',
        latitude: currentLocation?.coords.latitude || null,
        longitude: currentLocation?.coords.longitude || null,
        image_base64: photo.base64 || '',
        resolution: `${photo.width}x${photo.height}`,
      };

      const response = await fetch(`${BACKEND_URL}/api/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(photoData),
      });

      if (!response.ok) {
        throw new Error('Failed to save photo to server');
      }

      // Show success feedback
      Alert.alert(
        'Photo Captured!',
        `Event: ${eventTitle || 'Untitled'}\nLocation: ${currentLocation ? 'GPS Tagged' : 'No GPS'}\nSaved to gallery and database`,
        [
          {
            text: 'View Gallery',
            onPress: () => router.push('/gallery'),
          },
          {
            text: 'Take Another',
            style: 'cancel',
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
          This app needs camera access to capture disaster photos
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
            <Text style={styles.appTitle}>GeoCamera</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/gallery')}
            >
              <Ionicons name="images-outline" size={28} color="#FFF" />
            </TouchableOpacity>
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
              placeholder="Event Title (e.g., Building Damage Assessment)"
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
          <Text style={styles.infoText}>
            Photos saved in HD • GPS {isLocationEnabled ? 'Enabled' : 'Disabled'}
          </Text>
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
  iconButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  infoText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});