import { StyleSheet, View, Alert, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { CitySelector } from '@/components/city-selector';
import { apiClient, type MyStats, type VerificationDocument } from '@/api/client';
import { disconnectSocket } from '@/api/socket';
import { Colors, UI } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppCard } from '@/components/ui/app-card';
import { SegmentedControl } from '@/components/ui/segmented-control';

type UserProfile = {
  id: string;
  phoneNumber: string;
  fullName: string;
  city?: string;
  corridor?: string;
  verificationLevel: number;
  trustScore: number;
  createdAt?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MyStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [tab, setTab] = useState<'overview' | 'activity'>('overview');
  const [panel, setPanel] = useState<
    'none' | 'edit_profile' | 'verify_identity' | 'privacy' | 'help' | 'notifications' | 'language'
  >('none');
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editFullName, setEditFullName] = useState('');
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
    void loadStats();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await apiClient.getMe();
      setUser(data as UserProfile);
      const cast = data as UserProfile;
      if (!editingDetails) {
        setEditFullName(cast.fullName ?? '');
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

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const s = await apiClient.getMyStats();
      setStats(s as MyStats);
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
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
        fullName: editFullName.trim(),
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

  const createdAt = user?.createdAt ? new Date(user.createdAt) : null;
  const memberSinceLabel =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? `Member since ${createdAt.toLocaleString(undefined, { month: 'short', year: 'numeric' })}`
      : 'Member since —';

  const verificationPillLabel = (() => {
    const level = user?.verificationLevel ?? 0;
    if (level >= 2) return 'Level 2 Verified';
    if (level >= 1) return 'Level 1 Verified';
    return 'Unverified';
  })();

  const trustTierLabel = (() => {
    const score = user?.trustScore ?? 0;
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Good';
    return 'New';
  })();

  const formatCompact = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(value);
  };

  const appVersion = Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? '1.0.0';

  return (
    <ThemedView style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].surface }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <ThemedText type="title" style={styles.topHeaderTitle}>
            My Profile
          </ThemedText>
          <Pressable
            onPress={() => {
              setPanel('edit_profile');
              setEditingDetails(true);
            }}
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
              <View style={[styles.cameraDot, { backgroundColor: Colors[colorScheme ?? 'light'].background, borderColor: Colors[colorScheme ?? 'light'].border }]}>
                <IconSymbol name="camera.fill" size={14} color={Colors[colorScheme ?? 'light'].icon} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <ThemedText type="defaultSemiBold" style={styles.profileName} numberOfLines={1}>
                  {user.fullName || 'User'}
                </ThemedText>
                {(user.verificationLevel ?? 0) >= 2 ? (
                  <IconSymbol name="checkmark.seal.fill" size={16} color={Colors[colorScheme ?? 'light'].tint} />
                ) : null}
              </View>
              <ThemedText style={styles.profileMeta} numberOfLines={1}>
                {(user.city ? `${user.city}` : 'City not set') + ' · ' + memberSinceLabel}
              </ThemedText>
              <Pressable
                onPress={() => setPanel('verify_identity')}
                style={[
                  styles.verifiedPill,
                  (user.verificationLevel ?? 0) >= 1
                    ? { backgroundColor: 'rgba(34, 209, 139, 0.12)' }
                    : { backgroundColor: Colors[colorScheme ?? 'light'].surface },
                ]}
              >
                <View
                  style={[
                    styles.verifiedDot,
                    { backgroundColor: (user.verificationLevel ?? 0) >= 1 ? '#22D18B' : Colors[colorScheme ?? 'light'].icon },
                  ]}
                />
                <ThemedText
                  style={[
                    styles.verifiedText,
                    { color: (user.verificationLevel ?? 0) >= 1 ? '#1b8f3a' : Colors[colorScheme ?? 'light'].text },
                  ]}
                >
                  {verificationPillLabel}
                </ThemedText>
                <IconSymbol
                  name="chevron.right"
                  size={16}
                  color={(user.verificationLevel ?? 0) >= 1 ? '#1b8f3a' : Colors[colorScheme ?? 'light'].icon}
                />
              </Pressable>
            </View>
          </View>
        </AppCard>

        <View style={styles.statsRow}>
          <AppCard style={styles.statCard} variant="soft">
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(34, 209, 139, 0.14)' }]}>
              <IconSymbol name="arrow.left.arrow.right" size={18} color="#1b8f3a" />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>
              {loadingStats ? '—' : String(stats?.exchanges ?? 0)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>EXCHANGES</ThemedText>
          </AppCard>
          <AppCard style={styles.statCard} variant="soft">
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(240, 138, 26, 0.16)' }]}>
              <IconSymbol name="shippingbox.fill" size={18} color="#E98100" />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>
              {loadingStats ? '—' : String(stats?.parcels ?? 0)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>PARCELS</ThemedText>
          </AppCard>
          <AppCard style={styles.statCard} variant="soft">
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(77, 163, 255, 0.16)' }]}>
              <IconSymbol name="star.fill" size={18} color={Colors[colorScheme ?? 'light'].tint} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>
              {loadingStats ? '—' : (stats?.ratingAvg ? stats.ratingAvg.toFixed(1) : '—')}
            </ThemedText>
            <ThemedText style={styles.statLabel}>RATING</ThemedText>
          </AppCard>
          <AppCard style={styles.statCard} variant="soft">
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(155, 161, 166, 0.16)' }]}>
              <IconSymbol name="person.2.fill" size={18} color={Colors[colorScheme ?? 'light'].icon} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>
              {loadingStats ? '—' : formatCompact(stats?.community ?? 0)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>COMMUNITY</ThemedText>
          </AppCard>
        </View>

        <AppCard style={[styles.trustCard, { backgroundColor: '#0B2A6F', borderColor: 'transparent' }]}>
          <View style={styles.trustHeaderRow}>
            <ThemedText style={styles.trustLabel} lightColor="#D7E6FF" darkColor="#D7E6FF">
              TRUST SCORE
            </ThemedText>
            <View style={[styles.trustChip, { backgroundColor: 'rgba(34, 209, 139, 0.18)' }]}>
              <ThemedText style={[styles.trustChipText, { color: '#22D18B' }]} lightColor="#22D18B" darkColor="#22D18B">
                {trustTierLabel}
              </ThemedText>
            </View>
          </View>
          <View style={styles.trustScoreRow}>
            <ThemedText style={styles.trustScore} lightColor="#fff" darkColor="#fff">
              {user.trustScore}
            </ThemedText>
            <ThemedText style={styles.trustOutOf} lightColor="#D7E6FF" darkColor="#D7E6FF">
              / 100
            </ThemedText>
          </View>
          <View style={styles.trustBarBg}>
            <View style={[styles.trustBarFill, { width: `${Math.min(100, Math.max(0, user.trustScore))}%` }]} />
          </View>
          <ThemedText style={styles.trustHint} lightColor="#D7E6FF" darkColor="#D7E6FF">
            Top verified users get more matches. Complete identity checks to boost trust.
          </ThemedText>
        </AppCard>

        <View style={{ marginTop: UI.spacing.lg }}>
          <SegmentedControl
            value={tab}
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'activity', label: 'Activity' },
            ]}
            onChange={setTab}
          />
        </View>

        {tab === 'overview' ? (
          <>
            <ThemedText style={styles.sectionHeading}>ACCOUNT</ThemedText>
            <AppCard style={styles.menuCard}>
              <Pressable onPress={() => { setPanel('edit_profile'); setEditingDetails(true); }} style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: 'rgba(77, 163, 255, 0.14)' }]}>
                  <IconSymbol name="square.and.pencil" size={18} color={Colors[colorScheme ?? 'light'].tint} />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.menuLabel}>Edit Profile</ThemedText>
                <View style={{ flex: 1 }} />
                <IconSymbol name="chevron.right" size={18} color={Colors[colorScheme ?? 'light'].icon} />
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: Colors[colorScheme ?? 'light'].border }]} />
              <Pressable onPress={() => setPanel('notifications')} style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: 'rgba(175, 82, 222, 0.14)' }]}>
                  <IconSymbol name="bell" size={18} color="#AF52DE" />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.menuLabel}>Notifications</ThemedText>
                <View style={{ flex: 1 }} />
                <IconSymbol name="chevron.right" size={18} color={Colors[colorScheme ?? 'light'].icon} />
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: Colors[colorScheme ?? 'light'].border }]} />
              <Pressable onPress={() => setPanel('language')} style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: 'rgba(34, 209, 139, 0.14)' }]}>
                  <IconSymbol name="globe" size={18} color="#1b8f3a" />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.menuLabel}>Language & Region</ThemedText>
                <View style={{ flex: 1 }} />
                <IconSymbol name="chevron.right" size={18} color={Colors[colorScheme ?? 'light'].icon} />
              </Pressable>
            </AppCard>

            <ThemedText style={styles.sectionHeading}>SECURITY</ThemedText>
            <AppCard style={styles.menuCard}>
              <Pressable onPress={() => setPanel('privacy')} style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: 'rgba(240, 138, 26, 0.14)' }]}>
                  <IconSymbol name="lock.fill" size={18} color="#E98100" />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.menuLabel}>Privacy & Security</ThemedText>
                <View style={{ flex: 1 }} />
                <IconSymbol name="chevron.right" size={18} color={Colors[colorScheme ?? 'light'].icon} />
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: Colors[colorScheme ?? 'light'].border }]} />
              <Pressable onPress={() => setPanel('verify_identity')} style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: 'rgba(77, 163, 255, 0.14)' }]}>
                  <IconSymbol name="checkmark.seal.fill" size={18} color={Colors[colorScheme ?? 'light'].tint} />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.menuLabel}>Verify Identity</ThemedText>
                <View style={{ flex: 1 }} />
                <View style={[styles.levelPill, { backgroundColor: 'rgba(77, 163, 255, 0.12)', borderColor: 'rgba(77, 163, 255, 0.22)' }]}>
                  <ThemedText style={styles.levelPillText}>Level {user.verificationLevel}</ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={18} color={Colors[colorScheme ?? 'light'].icon} />
              </Pressable>
            </AppCard>

            <ThemedText style={styles.sectionHeading}>SUPPORT</ThemedText>
            <AppCard style={styles.menuCard}>
              <Pressable onPress={() => setPanel('help')} style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: 'rgba(155, 161, 166, 0.14)' }]}>
                  <IconSymbol name="questionmark.circle" size={18} color={Colors[colorScheme ?? 'light'].icon} />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.menuLabel}>Help Center</ThemedText>
                <View style={{ flex: 1 }} />
                <IconSymbol name="chevron.right" size={18} color={Colors[colorScheme ?? 'light'].icon} />
              </Pressable>
              <View style={[styles.menuDivider, { backgroundColor: Colors[colorScheme ?? 'light'].border }]} />
              <Pressable onPress={() => Alert.alert('Referral Program', 'Coming soon.')} style={styles.menuRow}>
                <View style={[styles.menuIcon, { backgroundColor: 'rgba(255, 45, 85, 0.12)' }]}>
                  <IconSymbol name="gift" size={18} color="#FF2D55" />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.menuLabel}>Referral Program</ThemedText>
                <View style={{ flex: 1 }} />
                <View style={[styles.levelPill, { backgroundColor: 'rgba(77, 163, 255, 0.10)', borderColor: 'rgba(77, 163, 255, 0.20)' }]}>
                  <ThemedText style={styles.levelPillText}>Earn AED 20</ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={18} color={Colors[colorScheme ?? 'light'].icon} />
              </Pressable>
            </AppCard>

            <Pressable
              onPress={handleLogout}
              style={[
                styles.signOutRow,
                {
                  backgroundColor: Colors[colorScheme ?? 'light'].card,
                  borderColor: Colors[colorScheme ?? 'light'].border,
                },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: 'rgba(255, 59, 48, 0.12)' }]}>
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color="#FF3B30" />
              </View>
              <ThemedText type="defaultSemiBold" style={{ color: '#FF3B30' }}>Sign Out</ThemedText>
              <View style={{ flex: 1 }} />
            </Pressable>

            {panel === 'edit_profile' ? (
              <AppCard style={[styles.panelCard, { marginTop: UI.spacing.md }]}>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>Edit Profile</ThemedText>
                <View style={{ gap: 10, marginTop: 12 }}>
                  <ThemedInput value={editFullName} onChangeText={setEditFullName} placeholder="Full name" />
                  <CitySelector value={editCity} onChange={setEditCity} placeholder="Select City" />
                  <ThemedInput value={editCorridor} onChangeText={setEditCorridor} placeholder="Corridor (e.g., South Asia)" />
                  <View style={styles.actionsRow}>
                    <ThemedButton title={savingDetails ? 'Saving…' : 'Save'} onPress={handleSaveDetails} disabled={savingDetails} style={{ flex: 1 }} />
                    <ThemedButton title="Cancel" variant="secondary" onPress={() => { setEditingDetails(false); setPanel('none'); }} disabled={savingDetails} style={{ flex: 1 }} />
                  </View>
                </View>
              </AppCard>
            ) : null}

            {panel === 'verify_identity' ? (
              <AppCard style={[styles.panelCard, { marginTop: UI.spacing.md }]}>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>Verify Identity</ThemedText>
                <ThemedText style={{ opacity: 0.8, marginTop: 6 }}>Increase trust and unlock more matches.</ThemedText>

                <View style={{ marginTop: UI.spacing.md, gap: UI.spacing.md }}>
                  <AppCard variant="soft" style={{ padding: UI.spacing.lg }}>
                    <ThemedText type="defaultSemiBold">Mobile Verification (Level 1)</ThemedText>
                    {!needsPhoneVerification ? (
                      <ThemedText style={{ opacity: 0.75, marginTop: 6 }}>Your phone is verified.</ThemedText>
                    ) : (
                      <View style={{ gap: 10, marginTop: 10 }}>
                        <ThemedInput value={phoneInput} onChangeText={setPhoneInput} placeholder="+9715xxxxxxx" keyboardType="phone-pad" />
                        {otpSent ? (
                          <>
                            <ThemedInput value={otpCode} onChangeText={setOtpCode} placeholder="Enter OTP code" keyboardType="number-pad" />
                            <View style={styles.actionsRow}>
                              <ThemedButton title={verifyingPhone ? 'Verifying…' : 'Verify'} onPress={handleVerifyPhone} disabled={verifyingPhone || requestingOtp} style={{ flex: 1 }} />
                              <ThemedButton title="Resend" variant="secondary" onPress={handleRequestOtp} disabled={requestingOtp || verifyingPhone} style={{ flex: 1 }} />
                            </View>
                          </>
                        ) : (
                          <ThemedButton title={requestingOtp ? 'Sending…' : 'Send OTP'} onPress={handleRequestOtp} disabled={requestingOtp} fullWidth />
                        )}
                      </View>
                    )}
                  </AppCard>

                  <AppCard variant="soft" style={{ padding: UI.spacing.lg }}>
                    <ThemedText type="defaultSemiBold">Document Verification (Level 2)</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                      <ThemedButton title={uploading ? 'Uploading…' : 'Upload ID'} onPress={() => uploadDocument('id_card')} disabled={uploading} style={{ flex: 1 }} />
                      <ThemedButton title={uploading ? 'Uploading…' : 'Upload Selfie'} onPress={() => uploadDocument('selfie')} disabled={uploading} variant="secondary" style={{ flex: 1 }} />
                    </View>

                    {loadingDocuments ? (
                      <View style={{ marginTop: 12 }}>
                        <ActivityIndicator />
                      </View>
                    ) : documents.length === 0 ? (
                      <ThemedText style={{ opacity: 0.7, marginTop: 12 }}>No documents submitted yet.</ThemedText>
                    ) : (
                      <View style={{ marginTop: 12, gap: 8 }}>
                        {documents.slice(0, 3).map((doc) => (
                          <View key={doc.id} style={styles.docRow}>
                            <View style={{ flex: 1 }}>
                              <ThemedText type="defaultSemiBold">
                                {doc.type} • {doc.status}
                              </ThemedText>
                              <ThemedText style={styles.subtext} numberOfLines={1}>{doc.fileName}</ThemedText>
                              {doc.status === 'rejected' && doc.rejectionReason ? (
                                <ThemedText style={[styles.subtext, { marginTop: 4 }]}>{doc.rejectionReason}</ThemedText>
                              ) : null}
                            </View>
                          </View>
                        ))}
                        <ThemedButton title="Refresh Documents" variant="secondary" onPress={loadDocuments} />
                      </View>
                    )}
                  </AppCard>
                </View>
              </AppCard>
            ) : null}

            <ThemedText style={styles.footerText}>
              MusafirOne v{appVersion} · Terms · Privacy
            </ThemedText>
          </>
        ) : (
          <>
            <View style={styles.activityHeaderRow}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>This Month</ThemedText>
              <ThemedText style={{ opacity: 0.7 }}>
                {new Date().toLocaleString(undefined, { month: 'short', year: 'numeric' })}
              </ThemedText>
            </View>
            <View style={styles.monthRow}>
              <AppCard variant="soft" style={styles.monthCard}>
                <View style={[styles.monthIcon, { backgroundColor: 'rgba(34, 209, 139, 0.14)' }]} />
                <ThemedText type="defaultSemiBold">AED —</ThemedText>
                <ThemedText style={styles.monthLabel}>VOLUME</ThemedText>
              </AppCard>
              <AppCard variant="soft" style={styles.monthCard}>
                <View style={[styles.monthIcon, { backgroundColor: 'rgba(77, 163, 255, 0.14)' }]} />
                <ThemedText type="defaultSemiBold">{loadingStats ? '—' : String(stats?.exchanges ?? 0)}</ThemedText>
                <ThemedText style={styles.monthLabel}>TRANSACTIONS</ThemedText>
              </AppCard>
              <AppCard variant="soft" style={styles.monthCard}>
                <View style={[styles.monthIcon, { backgroundColor: 'rgba(240, 138, 26, 0.14)' }]} />
                <ThemedText type="defaultSemiBold">{loadingStats ? '—' : String(stats?.parcels ?? 0)}</ThemedText>
                <ThemedText style={styles.monthLabel}>PARCELS</ThemedText>
              </AppCard>
            </View>

            <ThemedText style={styles.sectionHeading}>RECENT</ThemedText>
            <AppCard style={styles.menuCard}>
              <View style={styles.recentRow}>
                <View style={[styles.recentIcon, { backgroundColor: 'rgba(34, 209, 139, 0.14)' }]}>
                  <IconSymbol name="arrow.left.arrow.right" size={18} color="#1b8f3a" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">Exchange activity</ThemedText>
                  <ThemedText style={{ opacity: 0.7 }}>Your recent exchanges will appear here.</ThemedText>
                </View>
                <View style={styles.donePill}>
                  <ThemedText style={styles.donePillText}>Done</ThemedText>
                </View>
              </View>
              <View style={[styles.menuDivider, { backgroundColor: Colors[colorScheme ?? 'light'].border }]} />
              <View style={styles.recentRow}>
                <View style={[styles.recentIcon, { backgroundColor: 'rgba(240, 138, 26, 0.14)' }]}>
                  <IconSymbol name="shippingbox.fill" size={18} color="#E98100" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">Parcel activity</ThemedText>
                  <ThemedText style={{ opacity: 0.7 }}>Your recent parcels will appear here.</ThemedText>
                </View>
                <View style={styles.donePill}>
                  <ThemedText style={styles.donePillText}>Done</ThemedText>
                </View>
              </View>
            </AppCard>
          </>
        )}
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
    position: 'relative',
  },
  cameraDot: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  verifiedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22D18B',
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
  statIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
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
  trustHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trustLabel: {
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.95,
    letterSpacing: 0.7,
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
  sectionHeading: {
    marginTop: UI.spacing.lg,
    marginBottom: UI.spacing.sm,
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.7,
    letterSpacing: 0.7,
  },
  menuCard: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
  },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
  },
  levelPillText: {
    fontSize: 12,
    lineHeight: 14,
    opacity: 0.9,
  },
  signOutRow: {
    marginTop: UI.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
  },
  panelCard: {
    padding: UI.spacing.lg,
  },
  footerText: {
    textAlign: 'center',
    marginTop: UI.spacing.lg,
    marginBottom: UI.spacing.lg,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.7,
  },
  activityHeaderRow: {
    marginTop: UI.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthRow: {
    flexDirection: 'row',
    gap: UI.spacing.sm,
    marginTop: UI.spacing.md,
  },
  monthCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  monthIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  monthLabel: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.7,
    letterSpacing: 0.7,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  recentIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 209, 139, 0.12)',
  },
  donePillText: {
    fontSize: 12,
    lineHeight: 14,
    color: '#1b8f3a',
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
