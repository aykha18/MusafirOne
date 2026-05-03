import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from 'react-native';

import { apiClient, type ReferralMe } from '@/api/client';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedInput } from '@/components/themed-input';
import { ThemedView } from '@/components/themed-view';
import { AppCard } from '@/components/ui/app-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, UI } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ReferralScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [data, setData] = useState<ReferralMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await apiClient.getReferralMe();
        setData(next);
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const referralCode = useMemo(() => (data?.code ? String(data.code) : ''), [data?.code]);

  const shareInvite = async () => {
    if (!referralCode) return;
    setBusy(true);
    try {
      const message = `Join MusafirOne and earn rewards.\n\nUse my referral code: ${referralCode}\n\nAfter you sign up and complete your first transaction, we both get AED 20.`;
      await Share.share({ message });
    } finally {
      setBusy(false);
    }
  };

  const handleRedeem = async () => {
    const code = redeemCode.trim().toUpperCase();
    if (!code) return;
    setRedeemBusy(true);
    setRedeemMessage(null);
    try {
      await apiClient.redeemReferral(code);
      const next = await apiClient.getReferralMe();
      setData(next);
      setRedeemCode('');
      setRedeemMessage('Referral code applied. Complete your first transaction to unlock the reward.');
    } catch (e) {
      setRedeemMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setRedeemBusy(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={[styles.heroIcon, { backgroundColor: 'rgba(255, 45, 85, 0.12)' }]}>
              <IconSymbol name="gift" size={22} color="#FF2D55" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
                Referral Program
              </ThemedText>
              <ThemedText style={{ opacity: 0.75, marginTop: 2 }}>
                Invite friends and earn AED 20 each
              </ThemedText>
            </View>
            <View
              style={[
                styles.rewardPill,
                { backgroundColor: 'rgba(77, 163, 255, 0.10)', borderColor: 'rgba(77, 163, 255, 0.20)' },
              ]}
            >
              <ThemedText style={styles.rewardText}>AED 20</ThemedText>
            </View>
          </View>
        </AppCard>

        {error ? (
          <AppCard variant="soft">
            <ThemedText style={{ color: '#d00' }}>{error}</ThemedText>
          </AppCard>
        ) : null}

        <AppCard variant="soft">
          <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
            Your referral code
          </ThemedText>
          <View style={styles.codeRow}>
            <View
              style={[
                styles.codeBox,
                { borderColor: Colors[colorScheme].border, backgroundColor: Colors[colorScheme].card },
              ]}
            >
              <ThemedText type="defaultSemiBold" style={styles.codeText}>
                {referralCode || '—'}
              </ThemedText>
            </View>
            <ThemedButton
              title={busy ? 'Sharing…' : 'Share'}
              onPress={shareInvite}
              disabled={busy || !referralCode}
              style={{ flex: 1 }}
            />
          </View>
          <View style={{ marginTop: 12, gap: 6 }}>
            <ThemedText style={{ opacity: 0.75 }}>Invites sent: {String(data?.stats?.sent ?? 0)}</ThemedText>
            <ThemedText style={{ opacity: 0.75 }}>Pending rewards: {String(data?.stats?.pending ?? 0)}</ThemedText>
            <ThemedText style={{ opacity: 0.75 }}>
              Earned: AED {String(data?.stats?.earnedAed ?? 0)}
            </ThemedText>
          </View>
        </AppCard>

        <AppCard variant="soft">
          <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
            Redeem a referral code
          </ThemedText>
          <ThemedText style={{ opacity: 0.75, marginTop: 6 }}>
            Enter your friend’s code before your first transaction.
          </ThemedText>
          <View style={{ marginTop: 12, gap: 10 }}>
            <ThemedInput
              placeholder="Enter code (e.g., ABCD1234)"
              autoCapitalize="characters"
              value={redeemCode}
              onChangeText={(v) => setRedeemCode(v.toUpperCase())}
            />
            <ThemedButton
              title={redeemBusy ? 'Applying…' : 'Apply Code'}
              onPress={handleRedeem}
              disabled={redeemBusy || redeemCode.trim().length < 6}
              fullWidth
            />
            {redeemMessage ? (
              <ThemedText style={{ opacity: redeemMessage.includes('applied') ? 0.9 : 0.9, color: redeemMessage.includes('applied') ? '#1b8f3a' : '#d00' }}>
                {redeemMessage}
              </ThemedText>
            ) : null}
            {data?.received ? (
              <ThemedText style={{ opacity: 0.75 }}>
                Redeemed status: {data.received.status}
              </ThemedText>
            ) : null}
          </View>
        </AppCard>

        <AppCard variant="soft">
          <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
            How it works
          </ThemedText>
          <View style={{ marginTop: 10, gap: 10 }}>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: Colors[colorScheme].tint }]} />
              <ThemedText style={styles.stepText}>Share your referral code with a friend</ThemedText>
            </View>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: Colors[colorScheme].tint }]} />
              <ThemedText style={styles.stepText}>Friend signs up and completes their first transaction</ThemedText>
            </View>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: Colors[colorScheme].tint }]} />
              <ThemedText style={styles.stepText}>You both receive AED 20 credit</ThemedText>
            </View>
          </View>
        </AppCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: UI.spacing.lg,
    gap: UI.spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    padding: UI.spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI.spacing.sm,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  rewardText: {
    fontSize: 12,
    opacity: 0.9,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI.spacing.sm,
    marginTop: 12,
  },
  codeBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 18,
    letterSpacing: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepText: {
    flex: 1,
    opacity: 0.85,
  },
});
