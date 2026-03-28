import { StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/themed-button';
import { apiClient, type VerificationDocument } from '@/api/client';
import { disconnectSocket } from '@/api/socket';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

type UserProfile = {
  id: string;
  phoneNumber: string;
  fullName: string;
  city?: string;
  corridor?: string;
  verificationLevel: number;
  trustScore: number;
};

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void loadProfile();
    void loadDocuments();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await apiClient.getMe();
      setUser(data as UserProfile);
    } catch (e) {
      // console.error(e);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const docs = await apiClient.listMyVerificationDocuments();
      setDocuments(docs);
    } catch (e) {
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const uploadDocument = async (
    type: 'id_card' | 'passport' | 'driver_license' | 'residence_permit' | 'selfie',
  ) => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri || !asset.name || !asset.mimeType) {
        Alert.alert('Error', 'Selected file is missing metadata');
        return;
      }
      await apiClient.uploadVerificationDocument({
        type,
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
      });
      Alert.alert('Submitted', 'Document submitted for review');
      await loadDocuments();
      await loadProfile();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    // console.log('Logout button pressed');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {
          // console.log('Logout cancelled');
        } },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            // console.log('Logout confirmed');
            try {
              disconnectSocket();
              await apiClient.setTokens(null);
              // console.log('Tokens cleared');
              
              // Navigate to the index tab specifically
              // Use navigate instead of replace to ensure tab switching works
              router.navigate('/');
            } catch (e) {
              // console.error('Logout error:', e);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Failed to load profile.</ThemedText>
        <ThemedButton title="Retry" onPress={loadProfile} style={{ marginTop: 16 }} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
            <ThemedText style={styles.avatarText}>
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.name}>{user.fullName || 'User'}</ThemedText>
          <ThemedText style={styles.phone}>{user.phoneNumber}</ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Verification</ThemedText>
        <View style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].icon }]}>
          <View style={styles.row}>
            <IconSymbol name="checkmark.shield.fill" size={24} color={Colors[colorScheme ?? 'light'].tint} />
            <View style={styles.rowContent}>
              <ThemedText type="defaultSemiBold">Level {user.verificationLevel}</ThemedText>
              <ThemedText style={styles.subtext}>Trust Score: {user.trustScore}</ThemedText>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Document Verification (Level 2)
        </ThemedText>
        <View style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].icon }]}>
          <View style={styles.docsButtons}>
            <ThemedButton
              title={uploading ? 'Uploading…' : 'Upload ID'}
              onPress={() => uploadDocument('id_card')}
              disabled={uploading}
              style={{ flex: 1 }}
            />
            <ThemedButton
              title={uploading ? 'Uploading…' : 'Upload Selfie'}
              onPress={() => uploadDocument('selfie')}
              disabled={uploading}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>

          {loadingDocuments ? (
            <View style={{ marginTop: 12 }}>
              <ActivityIndicator />
            </View>
          ) : documents.length === 0 ? (
            <ThemedText style={[styles.subtext, { marginTop: 12 }]}>
              No documents submitted yet.
            </ThemedText>
          ) : (
            <View style={{ marginTop: 12, gap: 8 }}>
              {documents.slice(0, 3).map((doc) => (
                <View key={doc.id} style={styles.docRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">
                      {doc.type} • {doc.status}
                    </ThemedText>
                    <ThemedText style={styles.subtext} numberOfLines={1}>
                      {doc.fileName}
                    </ThemedText>
                    {doc.status === 'rejected' && doc.rejectionReason ? (
                      <ThemedText style={[styles.subtext, { marginTop: 4 }]}>
                        {doc.rejectionReason}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              ))}
              <ThemedButton
                title="Refresh Documents"
                variant="secondary"
                onPress={loadDocuments}
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Details</ThemedText>
        <View style={[styles.card, { borderColor: Colors[colorScheme ?? 'light'].icon }]}>
          <View style={styles.detailRow}>
            <ThemedText style={styles.label}>City</ThemedText>
            <ThemedText>{user.city || 'Not set'}</ThemedText>
          </View>
          <View style={[styles.separator, { backgroundColor: Colors[colorScheme ?? 'light'].icon }]} />
          <View style={styles.detailRow}>
            <ThemedText style={styles.label}>Corridor</ThemedText>
            <ThemedText>{user.corridor || 'Not set'}</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedButton 
          title="Logout" 
          onPress={handleLogout} 
          variant="danger" 
          fullWidth
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    marginBottom: 4,
  },
  phone: {
    opacity: 0.6,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowContent: {
    marginLeft: 12,
  },
  subtext: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  docsButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    opacity: 0.6,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: 16,
  },
});
