import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoDetail {
  id: string;
  event_title: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
  filename: string;
  image_base64: string;
  resolution: string | null;
}

export default function PhotoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotoDetail();
  }, [id]);

  const fetchPhotoDetail = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/photos/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch photo');
      }
      const data = await response.json();
      setPhoto(data);
    } catch (error) {
      console.error('Error fetching photo:', error);
      Alert.alert('Error', 'Failed to load photo details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/photos/${id}`, {
                method: 'DELETE',
              });
              if (!response.ok) {
                throw new Error('Failed to delete photo');
              }
              Alert.alert('Success', 'Photo deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!photo) return;

    const message = `Event: ${photo.event_title}\nDate: ${new Date(photo.timestamp).toLocaleString()}\n${photo.latitude && photo.longitude ? `Location: ${photo.latitude}, ${photo.longitude}` : 'No GPS data'}`;

    try {
      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!photo) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Photo not found</Text>
      </View>
    );
  }

  const hasGPS = photo.latitude !== null && photo.longitude !== null;
  const date = new Date(photo.timestamp);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Details</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${photo.image_base64}` }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={24} color="#FFD700" />
            <Text style={styles.cardTitle}>Event Information</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Event Title:</Text>
            <Text style={styles.value}>{photo.event_title}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Date & Time:</Text>
            <Text style={styles.value}>
              {date.toLocaleDateString()} at {date.toLocaleTimeString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Filename:</Text>
            <Text style={styles.value}>{photo.filename}</Text>
          </View>

          {photo.resolution && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Resolution:</Text>
              <Text style={styles.value}>{photo.resolution}</Text>
            </View>
          )}
        </View>

        {/* GPS Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name={hasGPS ? 'location' : 'location-outline'}
              size={24}
              color={hasGPS ? '#4CAF50' : '#999'}
            />
            <Text style={styles.cardTitle}>GPS Information</Text>
          </View>

          {hasGPS ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Latitude:</Text>
                <Text style={styles.value}>{photo.latitude?.toFixed(6)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Longitude:</Text>
                <Text style={styles.value}>{photo.longitude?.toFixed(6)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Coordinates:</Text>
                <Text style={styles.value}>
                  {photo.latitude?.toFixed(6)}, {photo.longitude?.toFixed(6)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.noGpsText}>
              This photo was captured without GPS tagging
            </Text>
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#FFF" />
          <Text style={styles.deleteButtonText}>Delete Photo</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerButton: {
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
  content: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: '#2a2a2a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '500',
  },
  noGpsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 18,
    color: '#999',
  },
});