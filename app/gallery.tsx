import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface Photo {
  id: string;
  event_title: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
  filename: string;
  resolution: string | null;
}

export default function GalleryScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/photos`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPhotos();
  }, []);

  const handlePhotoPress = (photo: Photo) => {
    router.push(`/photo/${photo.id}`);
  };

  const renderPhoto = ({ item }: { item: Photo }) => {
    const hasGPS = item.latitude !== null && item.longitude !== null;
    const date = new Date(item.timestamp);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        style={styles.photoCard}
        onPress={() => handlePhotoPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.photoPlaceholder}>
          <Ionicons name="image-outline" size={48} color="#666" />
        </View>
        
        <View style={styles.photoInfo}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.event_title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons
              name={hasGPS ? 'location' : 'location-outline'}
              size={12}
              color={hasGPS ? '#4CAF50' : '#999'}
            />
            <Text style={styles.metaText}>
              {hasGPS ? 'GPS Tagged' : 'No GPS'}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {dateStr} {timeStr}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Gallery</Text>
        <View style={styles.headerRight}>
          <Text style={styles.countText}>{photos.length} photos</Text>
        </View>
      </View>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={80} color="#666" />
          <Text style={styles.emptyTitle}>No Photos Yet</Text>
          <Text style={styles.emptyText}>
            Capture your first disaster response photo
          </Text>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={() => router.back()}
          >
            <Ionicons name="camera" size={24} color="#003DA5" />
            <Text style={styles.captureButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFD700"
              colors={['#FFD700']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  headerRight: {
    width: 40,
  },
  countText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  grid: {
    padding: 16,
  },
  photoCard: {
    width: ITEM_WIDTH,
    marginBottom: 16,
    marginHorizontal: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    width: '100%',
    height: ITEM_WIDTH * 0.75,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInfo: {
    padding: 12,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  captureButtonText: {
    color: '#003DA5',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});