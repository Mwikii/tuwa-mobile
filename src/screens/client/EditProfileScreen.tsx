import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';

const CLOUDINARY_CLOUD_NAME = 'deg3ng6dl';
const CLOUDINARY_PRESET = 'tuwa_profiles';

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);
      formData.append('upload_preset', CLOUDINARY_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const data = await res.json();
      setPhotoUrl(data.secure_url);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await updateUser({ name, email, photoUrl });
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage} disabled={uploading}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {user?.name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.photoEditText}>📷</Text>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.photoHint}>Tap to change photo</Text>

        <Text style={styles.fieldLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor="#bbb"
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Phone Number</Text>
        <View style={styles.inputDisabled}>
          <Text style={styles.inputDisabledText}>{user?.phone}</Text>
        </View>
        <Text style={styles.fieldHint}>Phone number cannot be changed</Text>

        <Text style={styles.fieldLabel}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor="#bbb"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving || uploading}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 24, color: '#000' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  content: { padding: 24, alignItems: 'center' },
  photoContainer: {
    marginTop: 16,
    marginBottom: 8,
    position: 'relative',
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoEditText: { fontSize: 14 },
  photoHint: { fontSize: 12, color: '#bbb', marginBottom: 32 },
  fieldLabel: {
    fontSize: 11,
    color: '#bbb',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
  },
  inputDisabled: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 4,
  },
  inputDisabledText: { fontSize: 16, color: '#bbb' },
  fieldHint: {
    fontSize: 11,
    color: '#ccc',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  saveBtn: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
