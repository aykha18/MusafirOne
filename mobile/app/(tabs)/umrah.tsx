import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiClient, type DirectoryBusinessListItem } from '@/api/client';
import { CitySelector } from '@/components/city-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, UI } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BrowseTab = 'all' | 'topRated' | 'verified';

export default function UmrahScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const [items, setItems] = useState<DirectoryBusinessListItem[]>([]);
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browseTab, setBrowseTab] = useState<BrowseTab>('all');

  const palette =
    colorScheme === 'dark'
      ? {
          screen: '#0B0D14',
          card: '#171A25',
          cardSoft: '#1B1F2C',
          border: 'rgba(255,255,255,0.08)',
          divider: 'rgba(255,255,255,0.08)',
          text: Colors.dark.text,
          muted: '#A0A8BD',
          primary: '#5C96FF',
          primarySoft: 'rgba(92,150,255,0.18)',
          pill: '#202842',
          tile: '#202330',
          tileBorder: 'rgba(255,255,255,0.04)',
          tabTrack: '#171A25',
          tabActive: '#2A2E3B',
          tabInactive: '#8E96AC',
        }
      : {
          screen: '#F3F6FB',
          card: '#FFFFFF',
          cardSoft: '#F7F9FD',
          border: 'rgba(17,24,28,0.08)',
          divider: 'rgba(17,24,28,0.08)',
          text: Colors.light.text,
          muted: '#667085',
          primary: '#5C96FF',
          primarySoft: 'rgba(92,150,255,0.14)',
          pill: '#E8F0FF',
          tile: '#F6F8FC',
          tileBorder: 'rgba(17,24,28,0.06)',
          tabTrack: '#EDEFF5',
          tabActive: '#FFFFFF',
          tabInactive: '#667085',
        };

  const refresh = useCallback(async (opts?: { nextCity?: string }) => {
    if (!apiClient.getAccessToken()) {
      setError('Please sign in to view Umrah agencies.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let chosenCity = (opts?.nextCity ?? city).trim();
      const res = await apiClient.listDirectoryBusinesses({
        type: 'umrah',
        city: chosenCity || undefined,
      });
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [city]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visibleItems = useMemo(() => {
    const next = [...items];
    if (browseTab === 'verified') {
      return next.filter((item) => item.isVerified);
    }

    if (browseTab === 'topRated') {
      return next.sort((a, b) => {
        if (a.isVerified !== b.isVerified) {
          return Number(b.isVerified) - Number(a.isVerified);
        }
        if (a.claimStatus !== b.claimStatus) {
          return a.claimStatus.localeCompare(b.claimStatus);
        }
        return a.name.localeCompare(b.name);
      });
    }

    return next.sort((a, b) => a.name.localeCompare(b.name));
  }, [browseTab, items]);

  const openPhone = async (phone?: string | null) => {
    if (!phone) {
      Alert.alert('No phone number available');
      return;
    }
    await Linking.openURL(`tel:${phone}`);
  };

  const openWhatsApp = async (whatsapp?: string | null) => {
    if (!whatsapp) {
      Alert.alert('No WhatsApp number available');
      return;
    }
    const digits = whatsapp.replace(/[^\d+]/g, '');
    await Linking.openURL(`https://wa.me/${digits.replace(/^\+/, '')}`);
  };

  const openWebsite = async (website?: string | null) => {
    if (!website) {
      Alert.alert('No website available');
      return;
    }
    const url = website.startsWith('http://') || website.startsWith('https://') ? website : `https://${website}`;
    await Linking.openURL(url);
  };

  const openDirections = async (it: DirectoryBusinessListItem) => {
    if (typeof it.lat !== 'number' || typeof it.lng !== 'number') {
      Alert.alert('Location not available');
      return;
    }
    const label = encodeURIComponent(it.name ?? 'Umrah agency');
    const url = `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}&query_place_id=${label}`;
    await Linking.openURL(url);
  };

  const claimLabel = (status: DirectoryBusinessListItem['claimStatus']) => {
    if (status === 'claim_requested') return 'Claim in review';
    if (status === 'claim_rejected') return 'Claim rejected';
    if (status === 'claimed') return 'Claimed';
    return 'Unclaimed';
  };

  const canClaim = (status: DirectoryBusinessListItem['claimStatus']) => {
    return status === 'unclaimed' || status === 'claim_rejected';
  };

  const submitClaim = async (businessId: string) => {
    router.push(`/claims/${businessId}`);
  };

  const openInquiry = (businessId: string) => {
    router.push(`/umrah/${businessId}`);
  };

  const showListingHelp = () => {
    Alert.alert('Listing Info', 'Verified agencies are admin-verified. Unclaimed listings can still be contacted or claimed by the owner.');
  };

  const renderActionTile = (
    key: string,
    label: string,
    iconName: React.ComponentProps<typeof MaterialIcons>['name'],
    onPress: () => void,
  ) => (
    <Pressable
      key={key}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        {
          backgroundColor: palette.tile,
          borderColor: palette.tileBorder,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <MaterialIcons name={iconName} size={20} color={palette.primary} />
      <ThemedText style={[styles.actionLabel, { color: palette.muted }]}>{label}</ThemedText>
    </Pressable>
  );

  return (
    <ThemedView style={[styles.screen, { backgroundColor: palette.screen }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + UI.spacing.sm,
          paddingBottom: insets.bottom + 92,
          paddingHorizontal: UI.spacing.md,
          gap: UI.spacing.md,
        }}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title" style={[styles.screenTitle, { color: palette.text }]}>
              Umrah
            </ThemedText>
            <ThemedText style={[styles.screenSubtitle, { color: palette.muted }]}>
              Browse agencies and contact them instantly.
            </ThemedText>
          </View>
          <Pressable
            onPress={() => void refresh()}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed || busy ? 0.82 : 1,
              },
            ]}
          >
            <MaterialIcons name="refresh" size={20} color={palette.primary} />
          </Pressable>
        </View>

        <View style={[styles.panelCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText type="defaultSemiBold" style={[styles.sectionLabel, { color: palette.text }]}>
            City
          </ThemedText>
          <CitySelector
            value={city}
            onChange={(value) => {
              setCity(value);
              void refresh({ nextCity: value });
            }}
            placeholder="Select city"
          />
          {city ? (
            <Pressable
              onPress={() => {
                setCity('');
                void refresh({ nextCity: '' });
              }}
            >
              <ThemedText style={[styles.clearLink, { color: palette.primary }]}>Show all cities</ThemedText>
            </Pressable>
          ) : (
            <ThemedText style={[styles.filterHint, { color: palette.muted }]}>
              Showing agencies from all cities
            </ThemedText>
          )}
        </View>

        <View style={[styles.tabTrack, { backgroundColor: palette.tabTrack, borderColor: palette.border }]}>
          {([
            { value: 'all', label: 'All' },
            { value: 'topRated', label: 'Top Rated' },
            { value: 'verified', label: 'Verified' },
          ] as Array<{ value: BrowseTab; label: string }>).map((tab) => {
            const active = browseTab === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setBrowseTab(tab.value)}
                style={({ pressed }) => [
                  styles.tabItem,
                  {
                    backgroundColor: active ? palette.tabActive : 'transparent',
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={{
                    color: active ? palette.text : palette.tabInactive,
                  }}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View style={[styles.feedbackCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ThemedText style={{ color: '#FF7C7C' }}>{error}</ThemedText>
          </View>
        ) : null}
        {busy ? (
          <View style={[styles.feedbackCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ThemedText style={{ color: palette.muted }}>Loading agencies...</ThemedText>
          </View>
        ) : null}

        <View style={styles.cardsList}>
          {visibleItems.map((it) => (
            <View
              key={it.id}
              style={[styles.listingCard, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <View style={styles.listingHeader}>
                <ThemedText type="defaultSemiBold" style={[styles.listingTitle, { color: palette.text }]}>
                  {it.name}
                </ThemedText>
                <Pressable
                  onPress={canClaim(it.claimStatus) ? () => void submitClaim(it.id) : showListingHelp}
                  style={({ pressed }) => [{ opacity: pressed ? 0.76 : 1 }]}
                >
                  <View style={styles.headerMeta}>
                    {it.isVerified ? (
                      <MaterialIcons name="verified" size={16} color={palette.primary} />
                    ) : (
                      <MaterialIcons name="info-outline" size={16} color={palette.muted} />
                    )}
                    <ThemedText style={[styles.headerMetaLabel, { color: it.isVerified ? palette.primary : palette.muted }]}>
                      {canClaim(it.claimStatus) ? 'Claim' : it.isVerified ? 'Verified' : 'Listed'}
                    </ThemedText>
                  </View>
                </Pressable>
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.cityPill, { backgroundColor: palette.primarySoft }]}>
                  <ThemedText style={[styles.cityPillText, { color: palette.primary }]}>{it.city}</ThemedText>
                </View>
                {it.isVerified ? (
                  <View style={styles.inlineMeta}>
                    <MaterialIcons name="verified" size={14} color={palette.primary} />
                    <ThemedText style={[styles.inlineMetaText, { color: palette.primary }]}>Verified</ThemedText>
                  </View>
                ) : null}
                <ThemedText style={[styles.inlineStatus, { color: palette.muted }]}>{claimLabel(it.claimStatus)}</ThemedText>
              </View>

              <ThemedText style={[styles.addressText, { color: palette.muted }]}>{it.address}</ThemedText>

              <View style={[styles.divider, { backgroundColor: palette.divider }]} />

              <Pressable
                onPress={() => openInquiry(it.id)}
                style={({ pressed }) => [
                  styles.inquiryButton,
                  { backgroundColor: palette.primary, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <MaterialIcons name="send" size={18} color="#FFFFFF" />
                <ThemedText type="defaultSemiBold" style={styles.inquiryLabel}>
                  Inquiry
                </ThemedText>
              </Pressable>

              <View style={styles.actionRow}>
                {renderActionTile('call', 'Call', 'call', () => {
                  void openPhone(it.phone);
                })}
                {renderActionTile('whatsapp', 'WhatsApp', 'chat-bubble-outline', () => {
                  void openWhatsApp(it.whatsapp);
                })}
                {renderActionTile('website', 'Website', 'public', () => {
                  void openWebsite(it.website);
                })}
                {renderActionTile('directions', 'Directions', 'near-me', () => {
                  void openDirections(it);
                })}
              </View>
            </View>
          ))}

          {visibleItems.length === 0 && !busy ? (
            <View style={[styles.feedbackCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <ThemedText style={{ color: palette.muted }}>No agencies found for the current filters.</ThemedText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI.spacing.sm,
  },
  screenTitle: {
    fontFamily: Fonts.rounded,
  },
  screenSubtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelCard: {
    borderWidth: 1,
    borderRadius: UI.radius.xl,
    padding: UI.spacing.lg,
    gap: UI.spacing.sm,
  },
  sectionLabel: {
    fontSize: 18,
  },
  clearLink: {
    fontSize: 15,
  },
  filterHint: {
    fontSize: 14,
  },
  tabTrack: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 18,
    padding: 4,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackCard: {
    borderWidth: 1,
    borderRadius: UI.radius.lg,
    padding: UI.spacing.md,
  },
  cardsList: {
    gap: UI.spacing.md,
  },
  listingCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: UI.spacing.lg,
    gap: UI.spacing.md,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: UI.spacing.sm,
  },
  listingTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerMetaLabel: {
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  cityPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cityPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineMetaText: {
    fontSize: 13,
  },
  inlineStatus: {
    fontSize: 13,
  },
  addressText: {
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginHorizontal: -UI.spacing.lg,
  },
  inquiryButton: {
    minHeight: 44,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inquiryLabel: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionTile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
  },
  actionLabel: {
    fontSize: 12,
  },
});
