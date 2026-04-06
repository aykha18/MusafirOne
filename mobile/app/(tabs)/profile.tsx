import { StyleSheet, View, Alert, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { CitySelector } from '@/components/city-selector';
import { apiClient, type VerificationDocument } from '@/api/client';
import { disconnectSocket } from '@/api/socket';
import { Colors, UI } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppCard } from '@/components/ui/app-card';

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
  const [editingDetails, setEditingDetails] = useState(false);
  const [editCity, setEditCity] = useState('');
  const [editCorridor, setEditCorridor] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  useEffect(() => {
    void loadProfile();
    void loadDocuments();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await apiClient.getMe();
      setUser(data as UserProfile);
      const cast = data as UserProfile;
      if (!editingDetails) {
        setEditCity(cast.city ?? '');
        setEditCorridor(cast.corridor ?? '');
      }
      if (phoneInput.trim().length === 0) {
        setPhoneInput(
          cast.phoneNumber?.startsWith('google_') ? '' : (cast.phoneNumber ?? ''),
        );
      }
    } catch {
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
    } catch {
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
            } catch {
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

  const isPlaceholderPhone =
    !user.phoneNumber ||
    user.phoneNumber.trim().length === 0 ||
    user.phoneNumber.startsWith('google_');
  const needsPhoneVerification = isPlaceholderPhone || user.verificationLevel < 1;

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      await apiClient.updateProfile({
        city: editCity.trim(),
        corridor: editCorridor.trim(),
      });
      setEditingDetails(false);
      Alert.alert('Saved', 'Profile updated');
      await loadProfile();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setSavingDetails(false);
    }
  };

  const handleRequestOtp = async () => {
    const phoneNumber = phoneInput.trim();
    if (phoneNumber.length < 7) {
      Alert.alert('Invalid phone number', 'Enter a valid phone number with country code (e.g., +9715xxxxxxx).');
      return;
    }
    setRequestingOtp(true);
    try {
      await apiClient.requestOtp({ phoneNumber });
      setOtpSent(true);
      Alert.alert('OTP sent', 'Check your SMS for the code.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyPhone = async () => {
    const phoneNumber = phoneInput.trim();
    const code = otpCode.trim();
    if (phoneNumber.length < 7) {
      Alert.alert('Invalid phone number', 'Enter a valid phone number with country code.');
      return;
    }
    if (code.length < 4) {
      Alert.alert('Invalid code', 'Enter the OTP code.');
      return;
    }
    setVerifyingPhone(true);
    try {
      await apiClient.linkPhone({ phoneNumber, code, deviceFingerprint: 'demo-device' });
      setOtpCode('');
      setOtpSent(false);
      Alert.alert('Verified', 'Phone verified successfully');
      await loadProfile();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setVerifyingPhone(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].surface }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <ThemedText type="title" style={styles.topHeaderTitle}>
            My Profile
          </ThemedText>
          <Pressable
            onPress={() => setEditingDetails(true)}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: Colors[colorScheme ?? 'light'].background,
                borderColor: Colors[colorScheme ?? 'light'].border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={8}
          >
            <IconSymbol name="square.and.pencil" size={18} color={Colors[colorScheme ?? 'light'].icon} />
          </Pressable>
        </View>

        <AppCard style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
              <ThemedText style={styles.avatarText} lightColor="#fff" darkColor="#fff">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={styles.profileName}>
                {user.fullName || 'User'}
              </ThemedText>
              <ThemedText style={styles.profileMeta}>
                {(user.city ? `${user.city}` : 'City not set') +
                  (user.corridor ? ` · ${user.corridor}` : '')}
              </ThemedText>
              <View style={[styles.verifiedPill, { backgroundColor: Colors[colorScheme ?? 'light'].surface }]}>
                <IconSymbol name="checkmark.seal.fill" size={14} color={Colors[colorScheme ?? 'light'].tint} />
                <ThemedText style={[styles.verifiedText, { color: Colors[colorScheme ?? 'light'].tint }]}>
                  Level {user.verificationLevel} Verified
                </ThemedText>
              </View>
              <ThemedText style={styles.phone}>
                {isPlaceholderPhone ? 'Phone not set' : user.phoneNumber}
              </ThemedText>
            </View>
          </View>
        </AppCard>

        <View style={styles.statsRow}>
          <AppCard style={styles.statCard} variant="soft">
            <ThemedText type="defaultSemiBold" style={styles.statValue}>0</ThemedText>
            <ThemedText style={styles.statLabel}>Exchanges</ThemedText>
          </AppCard>
          <AppCard style={styles.statCard} variant="soft">
            <ThemedText type="defaultSemiBold" style={styles.statValue}>0</ThemedText>
            <ThemedText style={styles.statLabel}>Parcels</ThemedText>
          </AppCard>
          <AppCard style={styles.statCard} variant="soft">
            <ThemedText type="defaultSemiBold" style={styles.statValue}>0.0</ThemedText>
            <ThemedText style={styles.statLabel}>Rating</ThemedText>
          </AppCard>
          <AppCard style={styles.statCard} variant="soft">
            <ThemedText type="defaultSemiBold" style={styles.statValue}>0</ThemedText>
            <ThemedText style={styles.statLabel}>Community</ThemedText>
          </AppCard>
        </View>

        <AppCard style={[styles.trustCard, { backgroundColor: '#0B2A6F', borderColor: 'transparent' }]}>
          <ThemedText style={styles.trustLabel} lightColor="#D7E6FF" darkColor="#D7E6FF">
            Trust Score
          </ThemedText>
          <View style={styles.trustScoreRow}>
            <ThemedText style={styles.trustScore} lightColor="#fff" darkColor="#fff">
              {user.trustScore}
            </ThemedText>
            <ThemedText style={styles.trustOutOf} lightColor="#D7E6FF" darkColor="#D7E6FF">
              / 100
            </ThemedText>
            <View style={{ flex: 1 }} />
            <View style={styles.trustChip}>
              <ThemedText style={styles.trustChipText} lightColor="#0B2A6F" darkColor="#0B2A6F">
                {user.trustScore >= 80 ? 'Excellent' : user.trustScore >= 50 ? 'Good' : 'New'}
              </ThemedText>
            </View>
          </View>
          <View style={styles.trustBarBg}>
            <View style={[styles.trustBarFill, { width: `${Math.min(100, Math.max(0, user.trustScore))}%` }]} />
          </View>
          <ThemedText style={styles.trustHint} lightColor="#D7E6FF" darkColor="#D7E6FF">
            Complete more transactions to improve your trust score.
          </ThemedText>
        </AppCard>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Mobile Verification (Level 1)
          </ThemedText>
          <AppCard style={styles.card}>
            {!needsPhoneVerification ? (
              <ThemedText style={styles.subtext}>Your phone is verified.</ThemedText>
            ) : (
              <>
                <ThemedInput
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  placeholder="+9715xxxxxxx"
                  keyboardType="phone-pad"
                />
                {otpSent ? (
                  <View style={{ marginTop: 10, gap: 10 }}>
                    <ThemedInput
                      value={otpCode}
                      onChangeText={setOtpCode}
                      placeholder="Enter OTP code"
                      keyboardType="number-pad"
                    />
                    <View style={styles.actionsRow}>
                      <ThemedButton
                        title={verifyingPhone ? 'Verifying…' : 'Verify'}
                        onPress={handleVerifyPhone}
                        disabled={verifyingPhone || requestingOtp}
                        style={{ flex: 1 }}
                      />
                      <ThemedButton
                        title="Resend"
                        variant="secondary"
                        onPress={handleRequestOtp}
                        disabled={requestingOtp || verifyingPhone}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 10 }}>
                    <ThemedButton
                      title={requestingOtp ? 'Sending…' : 'Send OTP'}
                      onPress={handleRequestOtp}
                      disabled={requestingOtp}
                      fullWidth
                    />
                  </View>
                )}
              </>
            )}
          </AppCard>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Document Verification (Level 2)
          </ThemedText>
          <AppCard style={styles.card}>
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
          </AppCard>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Details</ThemedText>
          <AppCard style={styles.card}>
            {editingDetails ? (
              <View style={{ gap: 10 }}>
                <CitySelector value={editCity} onChange={setEditCity} placeholder="Select City" />
                <ThemedInput
                  value={editCorridor}
                  onChangeText={setEditCorridor}
                  placeholder="Corridor (e.g., South Asia)"
                />
                <View style={styles.actionsRow}>
                  <ThemedButton
                    title={savingDetails ? 'Saving…' : 'Save'}
                    onPress={handleSaveDetails}
                    disabled={savingDetails}
                    style={{ flex: 1 }}
                  />
                  <ThemedButton
                    title="Cancel"
                    variant="secondary"
                    onPress={() => {
                      setEditingDetails(false);
                      setEditCity(user.city ?? '');
                      setEditCorridor(user.corridor ?? '');
                    }}
                    disabled={savingDetails}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.label}>City</ThemedText>
                  <ThemedText>{user.city || 'Not set'}</ThemedText>
                </View>
                <View style={[styles.separator, { backgroundColor: Colors[colorScheme ?? 'light'].icon }]} />
                <View style={styles.detailRow}>
                  <ThemedText style={styles.label}>Corridor</ThemedText>
                  <ThemedText>{user.corridor || 'Not set'}</ThemedText>
                </View>
                <View style={{ marginTop: 12 }}>
                  <ThemedButton
                    title="Edit"
                    variant="secondary"
                    onPress={() => setEditingDetails(true)}
                    fullWidth
                  />
                </View>
              </>
            )}
          </AppCard>
        </View>

        <View style={styles.logout}>
          <ThemedButton 
            title="Logout" 
            onPress={handleLogout} 
            variant="danger" 
            fullWidth
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: UI.spacing.lg,
    paddingTop: UI.spacing.lg,
    paddingBottom: 90,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: UI.spacing.md,
  },
  topHeaderTitle: {
    fontSize: 28,
    lineHeight: 32,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    padding: UI.spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI.spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 18,
    lineHeight: 22,
  },
  profileMeta: {
    fontSize: 13,
    lineHeight: 16,
    opacity: 0.8,
    marginTop: 4,
  },
  verifiedPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  verifiedText: {
    fontSize: 12,
    lineHeight: 14,
  },
  phone: {
    marginTop: 8,
    opacity: 0.6,
    fontSize: 12,
    lineHeight: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: UI.spacing.sm,
    marginTop: UI.spacing.md,
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    lineHeight: 20,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.75,
  },
  trustCard: {
    padding: UI.spacing.lg,
    marginTop: UI.spacing.lg,
  },
  trustLabel: {
    fontSize: 13,
    lineHeight: 16,
    opacity: 0.95,
  },
  trustScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 8,
  },
  trustScore: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
  },
  trustOutOf: {
    fontSize: 14,
    lineHeight: 18,
    paddingBottom: 8,
    opacity: 0.95,
  },
  trustChip: {
    backgroundColor: '#22D18B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trustChipText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  trustBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: UI.spacing.md,
  },
  trustBarFill: {
    height: '100%',
    backgroundColor: '#22D18B',
    borderRadius: 999,
  },
  trustHint: {
    marginTop: UI.spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.95,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
  },
  card: {
    padding: UI.spacing.lg,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  logout: {
    marginBottom: 16,
  },
});
