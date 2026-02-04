#!/usr/bin/env python3
"""
GeoCamera Backend API Test Suite
Tests all photo management endpoints for disaster response documentation
"""

import requests
import json
import base64
import time
from datetime import datetime
import os

# Test configuration
BACKEND_URL = "https://frontend-reorg-4.preview.emergentagent.com/api"

# Test data
def get_test_image_base64():
    """Generate a small test image in base64 format"""
    # Create a minimal 1x1 pixel PNG image in base64
    # This is a valid PNG image data
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg=="

def test_create_photo():
    """Test POST /api/photos endpoint"""
    print("\n=== Testing POST /api/photos ===")
    
    # Test 1: Complete photo data
    print("Test 1: Creating photo with complete data...")
    photo_data = {
        "event_title": "Typhoon Damage Assessment",
        "latitude": 14.5995,
        "longitude": 120.9842,
        "image_base64": get_test_image_base64(),
        "resolution": "1920x1080"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/photos", json=photo_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Photo created successfully")
            print(f"   ID: {data['id']}")
            print(f"   Filename: {data['filename']}")
            print(f"   Event: {data['event_title']}")
            print(f"   GPS: {data['latitude']}, {data['longitude']}")
            
            # Verify filename format
            expected_format = "Typhoon_Damage_Assessment_"
            if expected_format in data['filename']:
                print(f"✅ Filename format correct: {data['filename']}")
            else:
                print(f"❌ Filename format incorrect: {data['filename']}")
            
            # Verify base64 is NOT in response
            if 'image_base64' not in data:
                print("✅ Base64 image correctly excluded from response")
            else:
                print("❌ Base64 image should not be in response")
                
            return data['id']  # Return ID for further tests
        else:
            print(f"❌ Failed to create photo: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating photo: {str(e)}")
        return None

def test_create_photo_edge_cases():
    """Test edge cases for photo creation"""
    print("\n=== Testing POST /api/photos Edge Cases ===")
    
    # Test 2: Photo without GPS coordinates
    print("Test 2: Creating photo without GPS...")
    photo_data = {
        "event_title": "Indoor Documentation",
        "image_base64": get_test_image_base64(),
        "resolution": "1280x720"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/photos", json=photo_data)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Photo without GPS created successfully")
            print(f"   Latitude: {data.get('latitude', 'None')}")
            print(f"   Longitude: {data.get('longitude', 'None')}")
            return data['id']
        else:
            print(f"❌ Failed to create photo without GPS: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating photo without GPS: {str(e)}")
        return None

def test_get_all_photos():
    """Test GET /api/photos endpoint"""
    print("\n=== Testing GET /api/photos ===")
    
    try:
        response = requests.get(f"{BACKEND_URL}/photos")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            photos = response.json()
            print(f"✅ Retrieved {len(photos)} photos")
            
            if photos:
                # Check first photo structure
                photo = photos[0]
                required_fields = ['id', 'event_title', 'timestamp', 'filename']
                missing_fields = [field for field in required_fields if field not in photo]
                
                if not missing_fields:
                    print("✅ Photo structure correct")
                else:
                    print(f"❌ Missing fields: {missing_fields}")
                
                # Verify base64 is NOT included
                if 'image_base64' not in photo:
                    print("✅ Base64 image correctly excluded from list response")
                else:
                    print("❌ Base64 image should not be in list response")
                
                # Check sorting (newest first)
                if len(photos) > 1:
                    first_time = datetime.fromisoformat(photos[0]['timestamp'].replace('Z', '+00:00'))
                    second_time = datetime.fromisoformat(photos[1]['timestamp'].replace('Z', '+00:00'))
                    if first_time >= second_time:
                        print("✅ Photos sorted by timestamp (newest first)")
                    else:
                        print("❌ Photos not properly sorted")
                
                return photos
            else:
                print("ℹ️ No photos found in database")
                return []
        else:
            print(f"❌ Failed to get photos: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error getting photos: {str(e)}")
        return None

def test_get_photos_with_filter():
    """Test GET /api/photos with event_title filter"""
    print("\n=== Testing GET /api/photos with filter ===")
    
    try:
        # Test filtering by event title
        response = requests.get(f"{BACKEND_URL}/photos", params={"event_title": "Typhoon"})
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            photos = response.json()
            print(f"✅ Retrieved {len(photos)} photos with 'Typhoon' filter")
            
            # Verify all photos contain the filter term
            if photos:
                all_match = all("typhoon" in photo['event_title'].lower() for photo in photos)
                if all_match:
                    print("✅ All filtered photos match the search term")
                else:
                    print("❌ Some photos don't match the filter")
            
            return photos
        else:
            print(f"❌ Failed to get filtered photos: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error getting filtered photos: {str(e)}")
        return None

def test_get_photo_by_id(photo_id):
    """Test GET /api/photos/{photo_id} endpoint"""
    print(f"\n=== Testing GET /api/photos/{photo_id} ===")
    
    if not photo_id:
        print("❌ No photo ID provided for testing")
        return None
    
    try:
        response = requests.get(f"{BACKEND_URL}/photos/{photo_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            photo = response.json()
            print(f"✅ Retrieved photo by ID successfully")
            print(f"   Event: {photo['event_title']}")
            print(f"   Filename: {photo['filename']}")
            
            # Verify base64 IS included in single photo response
            if 'image_base64' in photo and photo['image_base64']:
                print("✅ Base64 image correctly included in single photo response")
            else:
                print("❌ Base64 image should be included in single photo response")
            
            # Verify all metadata is present
            required_fields = ['id', 'event_title', 'timestamp', 'filename', 'image_base64']
            missing_fields = [field for field in required_fields if field not in photo]
            
            if not missing_fields:
                print("✅ All required fields present")
            else:
                print(f"❌ Missing fields: {missing_fields}")
            
            return photo
        elif response.status_code == 404:
            print(f"❌ Photo not found (404)")
            return None
        else:
            print(f"❌ Failed to get photo by ID: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error getting photo by ID: {str(e)}")
        return None

def test_get_photo_by_invalid_id():
    """Test GET /api/photos/{photo_id} with invalid ID"""
    print("\n=== Testing GET /api/photos with invalid ID ===")
    
    invalid_id = "invalid-photo-id-12345"
    
    try:
        response = requests.get(f"{BACKEND_URL}/photos/{invalid_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 404:
            print("✅ Correctly returned 404 for invalid photo ID")
            return True
        else:
            print(f"❌ Expected 404, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing invalid photo ID: {str(e)}")
        return False

def test_delete_photo(photo_id):
    """Test DELETE /api/photos/{photo_id} endpoint"""
    print(f"\n=== Testing DELETE /api/photos/{photo_id} ===")
    
    if not photo_id:
        print("❌ No photo ID provided for deletion testing")
        return False
    
    try:
        # First verify photo exists
        get_response = requests.get(f"{BACKEND_URL}/photos/{photo_id}")
        if get_response.status_code != 200:
            print(f"❌ Photo {photo_id} doesn't exist for deletion test")
            return False
        
        # Delete the photo
        response = requests.delete(f"{BACKEND_URL}/photos/{photo_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Photo deleted successfully")
            print(f"   Message: {data.get('message', 'No message')}")
            print(f"   ID: {data.get('id', 'No ID')}")
            
            # Verify photo is actually deleted
            verify_response = requests.get(f"{BACKEND_URL}/photos/{photo_id}")
            if verify_response.status_code == 404:
                print("✅ Photo confirmed deleted from database")
                return True
            else:
                print("❌ Photo still exists after deletion")
                return False
        elif response.status_code == 404:
            print(f"❌ Photo not found for deletion (404)")
            return False
        else:
            print(f"❌ Failed to delete photo: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error deleting photo: {str(e)}")
        return False

def test_delete_nonexistent_photo():
    """Test DELETE /api/photos/{photo_id} with non-existent ID"""
    print("\n=== Testing DELETE with non-existent photo ID ===")
    
    nonexistent_id = "nonexistent-photo-id-99999"
    
    try:
        response = requests.delete(f"{BACKEND_URL}/photos/{nonexistent_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 404:
            print("✅ Correctly returned 404 for non-existent photo ID")
            return True
        else:
            print(f"❌ Expected 404, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing non-existent photo deletion: {str(e)}")
        return False

def main():
    """Run all backend API tests"""
    print("🚀 Starting GeoCamera Backend API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Test results tracking
    results = {
        "create_photo": False,
        "create_photo_no_gps": False,
        "get_all_photos": False,
        "get_photos_filtered": False,
        "get_photo_by_id": False,
        "get_invalid_id": False,
        "delete_photo": False,
        "delete_nonexistent": False
    }
    
    # Test photo creation
    photo_id_1 = test_create_photo()
    results["create_photo"] = photo_id_1 is not None
    
    # Test photo creation without GPS
    photo_id_2 = test_create_photo_edge_cases()
    results["create_photo_no_gps"] = photo_id_2 is not None
    
    # Test getting all photos
    all_photos = test_get_all_photos()
    results["get_all_photos"] = all_photos is not None
    
    # Test filtered photos
    filtered_photos = test_get_photos_with_filter()
    results["get_photos_filtered"] = filtered_photos is not None
    
    # Test getting photo by ID
    if photo_id_1:
        photo_detail = test_get_photo_by_id(photo_id_1)
        results["get_photo_by_id"] = photo_detail is not None
    
    # Test invalid photo ID
    results["get_invalid_id"] = test_get_photo_by_invalid_id()
    
    # Test photo deletion (use second photo to keep first for other tests)
    if photo_id_2:
        results["delete_photo"] = test_delete_photo(photo_id_2)
    
    # Test deleting non-existent photo
    results["delete_nonexistent"] = test_delete_nonexistent_photo()
    
    # Print summary
    print("\n" + "="*50)
    print("📊 TEST SUMMARY")
    print("="*50)
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{test_name:<25} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend API is working correctly.")
        return True
    else:
        print(f"⚠️  {total - passed} tests failed. Please check the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)