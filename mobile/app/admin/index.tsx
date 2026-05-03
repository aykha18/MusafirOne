import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiClient, type User } from '@/api/client';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AppCard } from '@/components/ui/app-card';

type AnalyticsTab = 'overview' | 'users' | 'events' | 'crashes' | 'revenue';
type TimeRange = 'today' | '7d' | '30d' | '90d' | 'custom';

const ADMIN_PURPLE = '#7C3AED';
const ADMIN_BG = '#0E1012';
const ADMIN_CARD = '#12151A';
const ADMIN_BORDER = 'rgba(255,255,255,0.08)';
const ADMIN_MUTED = 'rgba(255,255,255,0.70)';

function rangeLabel(range: TimeRange) {
  if (range === 'today') return 'Today';
  if (range === '7d') return '7D';
  if (range === '30d') return '30D';
  if (range === '90d') return '90D';
  return 'Custom';
}

function tabTitle(tab: AnalyticsTab) {
  if (tab === 'overview') return 'App Analytics';
  if (tab === 'users') return 'Users';
  if (tab === 'events') return 'Events';
  if (tab === 'crashes') return 'Crashes';
  return 'Revenue';
}

function tabSubtitle(tab: AnalyticsTab) {
  if (tab === 'overview') return 'Last 30 days';
  if (tab === 'users') return 'Acquisition & retention';
  if (tab === 'events') return 'In-app interactions';
  if (tab === 'crashes') return 'Stability & errors';
  return 'IAP & subscriptions';
}

export default function AdminAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const [range, setRange] = useState<TimeRange>('30d');

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await apiClient.getMe();
        setMe(profile);
      } catch {
        setMe(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const isAdmin = !!me?.isAdmin;

  const rangeOptions: TimeRange[] = useMemo(() => ['today', '7d', '30d', '90d', 'custom'], []);

  const headerLeftIconName = 'device.tablet' as const;
  const tabItems = useMemo(
    () =>
      [
        { key: 'overview' as const, label: 'Overview', icon: 'chart.bar.fill' as const },
        { key: 'users' as const, label: 'Users', icon: 'person.2' as const },
        { key: 'events' as const, label: 'Events', icon: 'bolt.fill' as const },
        { key: 'crashes' as const, label: 'Crashes', icon: 'exclamationmark.triangle.fill' as const },
        { key: 'revenue' as const, label: 'Revenue', icon: 'dollarsign.circle.fill' as const },
      ] satisfies { key: AnalyticsTab; label: string; icon: any }[],
    [],
  );

  if (loading) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: ADMIN_BG }]}>
        <ActivityIndicator />
        <ThemedText style={{ marginTop: 10, color: ADMIN_MUTED }}>Loading admin…</ThemedText>
      </ThemedView>
    );
  }

  if (!isAdmin) {
    return (
      <ThemedView style={[styles.centered, { backgroundColor: ADMIN_BG, padding: 20 }]}>
        <ThemedText type="title" style={{ color: '#fff', textAlign: 'center' }}>
          Admin Only
        </ThemedText>
        <ThemedText style={{ marginTop: 10, color: ADMIN_MUTED, textAlign: 'center' }}>
          This dashboard is available for admin accounts.
        </ThemedText>
        <View style={{ height: 16 }} />
        <ThemedButton title="Go to App" onPress={() => router.replace('/currency')} fullWidth />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: ADMIN_BG }]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom + 92 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <IconSymbol name={headerLeftIconName} size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="title" style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>
                {tabTitle(tab)}
              </ThemedText>
              <ThemedText style={{ color: ADMIN_MUTED, marginTop: 4 }}>{tabSubtitle(tab)}</ThemedText>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => router.push('/admin/moderation')}
              style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <IconSymbol name="shield" size={18} color={ADMIN_MUTED} />
            </Pressable>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <IconSymbol name="line.3.horizontal.decrease.circle" size={18} color={ADMIN_MUTED} />
            </Pressable>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.headerButton, { opacity: pressed ? 0.85 : 1 }]}
            >
              <IconSymbol name="bell" size={18} color={ADMIN_MUTED} />
            </Pressable>
          </View>
        </View>

        <View style={styles.rangeRow}>
          {rangeOptions.map((r) => {
            const selected = r === range;
            return (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[
                  styles.rangeChip,
                  {
                    backgroundColor: selected ? ADMIN_PURPLE : 'rgba(255,255,255,0.04)',
                    borderColor: selected ? 'rgba(124,58,237,0.6)' : ADMIN_BORDER,
                  },
                ]}
              >
                <ThemedText style={{ color: selected ? '#fff' : ADMIN_MUTED, fontSize: 12, fontWeight: '700' }}>
                  {rangeLabel(r)}
                </ThemedText>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => {}} style={styles.exportRow}>
            <ThemedText style={{ color: ADMIN_PURPLE, fontWeight: '700' }}>Export</ThemedText>
            <IconSymbol name="chevron.right" size={18} color={ADMIN_PURPLE} />
          </Pressable>
        </View>

        {tab === 'overview' ? <OverviewTab /> : null}
        {tab === 'users' ? <UsersTab /> : null}
        {tab === 'events' ? <EventsTab /> : null}
        {tab === 'crashes' ? <CrashesTab /> : null}
        {tab === 'revenue' ? <RevenueTab /> : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {tabItems.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.bottomItem}>
              <View style={[styles.bottomIconCircle, active ? styles.bottomIconActive : styles.bottomIconIdle]}>
                <IconSymbol name={t.icon} size={18} color={active ? ADMIN_PURPLE : ADMIN_MUTED} />
              </View>
              <ThemedText style={{ color: active ? ADMIN_PURPLE : ADMIN_MUTED, fontSize: 11, marginTop: 6 }}>
                {t.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

function MetricCard({
  label,
  value,
  subLabel,
  delta,
  deltaPositive,
}: {
  label: string;
  value: string;
  subLabel: string;
  delta: string;
  deltaPositive: boolean;
}) {
  return (
    <AppCard style={styles.metricCard}>
      <ThemedText style={styles.metricLabel}>{label}</ThemedText>
      <View style={styles.metricValueRow}>
        <ThemedText style={styles.metricValue}>{value}</ThemedText>
      </View>
      <View style={styles.metricFootRow}>
        <ThemedText style={styles.metricSubLabel}>{subLabel}</ThemedText>
        <ThemedText style={[styles.metricDelta, { color: deltaPositive ? '#22D18B' : '#FF4D4F' }]}>
          {delta}
        </ThemedText>
      </View>
    </AppCard>
  );
}

function SectionTitle({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <ThemedText style={styles.sectionTitle}>{label}</ThemedText>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

function OverviewTab() {
  return (
    <View style={{ marginTop: 14, gap: 14 }}>
      <SectionTitle label="APP OVERVIEW" />
      <View style={styles.metricGrid}>
        <MetricCard label="DAILY ACTIVE USERS" value="4,890" subLabel="avg 7 days" delta="+14.2%" deltaPositive />
        <MetricCard label="MONTHLY ACTIVE" value="45.2K" subLabel="this month" delta="+8.7%" deltaPositive />
        <MetricCard label="AVG SESSION" value="4m 32s" subLabel="per user/day" delta="+0:23" deltaPositive />
        <MetricCard label="CRASH-FREE RATE" value="99.1%" subLabel="all sessions" delta="-0.2%" deltaPositive={false} />
      </View>

      <AppCard style={styles.bigCard}>
        <View style={styles.bigCardHeader}>
          <ThemedText style={styles.bigCardTitle}>Active Users</ThemedText>
          <ThemedText style={{ color: '#22D18B', fontWeight: '700' }}>↗ +14.2%</ThemedText>
        </View>
        <ThemedText style={styles.bigCardSubtitle}>DAU this week</ThemedText>
        <View style={styles.chartPlaceholder} />
      </AppCard>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <AppCard style={[styles.halfCard, { flex: 1 }]}>
          <ThemedText style={styles.bigCardTitle}>Platform</ThemedText>
          <View style={styles.donutRow}>
            <View style={styles.donut} />
            <View style={{ gap: 10 }}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: ADMIN_PURPLE }]} />
                <ThemedText style={styles.legendText}>iOS</ThemedText>
                <View style={{ flex: 1 }} />
                <ThemedText style={styles.legendText}>54%</ThemedText>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#22D18B' }]} />
                <ThemedText style={styles.legendText}>Android</ThemedText>
                <View style={{ flex: 1 }} />
                <ThemedText style={styles.legendText}>46%</ThemedText>
              </View>
            </View>
          </View>
        </AppCard>

        <AppCard style={[styles.halfCard, { flex: 1 }]}>
          <ThemedText style={styles.bigCardTitle}>Store</ThemedText>
          <View style={{ gap: 12, marginTop: 10 }}>
            <View style={styles.storeRow}>
              <View style={[styles.storeIcon, { backgroundColor: 'rgba(245, 179, 1, 0.14)' }]}>
                <IconSymbol name="star.fill" size={16} color="#F5B301" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: '#fff', fontWeight: '800' }}>4.7</ThemedText>
                <ThemedText style={styles.storeSub}>App Store Rating</ThemedText>
              </View>
            </View>
            <View style={styles.storeRow}>
              <View style={[styles.storeIcon, { backgroundColor: 'rgba(34, 209, 139, 0.14)' }]}>
                <IconSymbol name="arrow.down.circle" size={16} color="#22D18B" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: '#fff', fontWeight: '800' }}>128K</ThemedText>
                <ThemedText style={styles.storeSub}>Total Installs</ThemedText>
              </View>
            </View>
            <View style={styles.storeRow}>
              <View style={[styles.storeIcon, { backgroundColor: 'rgba(124, 58, 237, 0.14)' }]}>
                <IconSymbol name="person.2" size={16} color={ADMIN_PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: '#fff', fontWeight: '800' }}>3,241</ThemedText>
                <ThemedText style={styles.storeSub}>New Users (30d)</ThemedText>
              </View>
            </View>
          </View>
        </AppCard>
      </View>

      <AppCard style={styles.bigCard}>
        <View style={styles.bigCardHeader}>
          <ThemedText style={styles.bigCardTitle}>Session Times</ThemedText>
          <IconSymbol name="waveform.path.ecg" size={18} color={ADMIN_MUTED} />
        </View>
        <ThemedText style={styles.bigCardSubtitle}>Hourly active sessions</ThemedText>
        <View style={styles.barChartPlaceholder} />
      </AppCard>
    </View>
  );
}

function UsersTab() {
  const sources = [
    { label: 'Organic Search', value: 38, color: ADMIN_PURPLE },
    { label: 'Paid Ads', value: 29, color: '#2DD4BF' },
    { label: 'Social Media', value: 18, color: '#60A5FA' },
    { label: 'Referral', value: 10, color: '#F59E0B' },
    { label: 'Direct', value: 5, color: '#A3A3A3' },
  ];
  return (
    <View style={{ marginTop: 14, gap: 14 }}>
      <SectionTitle label="USER ANALYTICS" right={<ThemedText style={{ color: ADMIN_PURPLE, fontWeight: '700' }}>Export</ThemedText>} />

      <AppCard style={styles.bigCard}>
        <View style={styles.bigCardHeader}>
          <ThemedText style={styles.bigCardTitle}>User Retention</ThemedText>
          <View style={styles.smallPill}>
            <ThemedText style={styles.smallPillText}>18% D30</ThemedText>
          </View>
        </View>
        <ThemedText style={styles.bigCardSubtitle}>Cohort: July installs</ThemedText>
        <View style={styles.chartPlaceholder} />
      </AppCard>

      <AppCard style={styles.bigCard}>
        <ThemedText style={styles.bigCardTitle}>Acquisition Sources</ThemedText>
        <View style={{ gap: 12, marginTop: 12 }}>
          {sources.map((s) => (
            <View key={s.label}>
              <View style={styles.sourceRow}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{s.label}</ThemedText>
                <View style={{ flex: 1 }} />
                <ThemedText style={{ color: ADMIN_MUTED, fontWeight: '700' }}>{s.value}%</ThemedText>
              </View>
              <View style={styles.sourceBarBg}>
                <View style={[styles.sourceBarFill, { width: `${s.value}%`, backgroundColor: s.color }]} />
              </View>
            </View>
          ))}
        </View>
      </AppCard>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <AppCard style={styles.summaryCard}>
          <IconSymbol name="person.badge.plus" size={18} color="#2DD4BF" />
          <ThemedText style={styles.summaryValue}>3,241</ThemedText>
          <ThemedText style={styles.summaryLabel}>NEW USERS</ThemedText>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <IconSymbol name="waveform.path.ecg" size={18} color="#60A5FA" />
          <ThemedText style={styles.summaryValue}>1,649</ThemedText>
          <ThemedText style={styles.summaryLabel}>RETURNING</ThemedText>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <IconSymbol name="person.crop.circle.badge.xmark" size={18} color="#FF4D4F" />
          <ThemedText style={styles.summaryValue}>284</ThemedText>
          <ThemedText style={styles.summaryLabel}>CHURNED</ThemedText>
        </AppCard>
      </View>
    </View>
  );
}

function EventsTab() {
  const events = [
    { name: 'app_open', total: '128.4K', delta: '+12%', positive: true },
    { name: 'screen_view', total: '841.2K', delta: '+8%', positive: true },
    { name: 'sign_up', total: '3,241', delta: '+22%', positive: true },
    { name: 'purchase', total: '892', delta: '-4%', positive: false },
    { name: 'notification_tap', total: '24.1K', delta: '+31%', positive: true },
    { name: 'share', total: '6,720', delta: '-1%', positive: false },
  ];

  return (
    <View style={{ marginTop: 14, gap: 14 }}>
      <SectionTitle label="EVENT TRACKING" right={<ThemedText style={{ color: ADMIN_PURPLE, fontWeight: '700' }}>Export</ThemedText>} />

      <AppCard style={styles.bigCard}>
        <View style={styles.bigCardHeader}>
          <View>
            <ThemedText style={styles.bigCardTitle}>Top Events</ThemedText>
            <ThemedText style={styles.bigCardSubtitle}>Total tracked: 1.2M events</ThemedText>
          </View>
          <ThemedText style={{ color: ADMIN_MUTED }}>Last 30 days</ThemedText>
        </View>
        <View style={{ marginTop: 10 }}>
          {events.map((e, idx) => (
            <View key={e.name} style={styles.eventRow}>
              <View style={styles.eventRank}>
                <ThemedText style={{ color: ADMIN_MUTED, fontWeight: '800' }}>{idx + 1}</ThemedText>
              </View>
              <ThemedText style={{ color: '#fff', fontWeight: '800', flex: 1 }}>{e.name}</ThemedText>
              <ThemedText style={{ color: '#fff', fontWeight: '800', width: 78, textAlign: 'right' }}>{e.total}</ThemedText>
              <ThemedText
                style={{
                  color: e.positive ? '#22D18B' : '#FF4D4F',
                  fontWeight: '800',
                  width: 54,
                  textAlign: 'right',
                }}
              >
                {e.delta}
              </ThemedText>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard style={styles.bigCard}>
        <View style={styles.bigCardHeader}>
          <ThemedText style={styles.bigCardTitle}>Event Volume</ThemedText>
          <ThemedText style={{ color: ADMIN_MUTED }}>7-day trend</ThemedText>
        </View>
        <View style={styles.barChartPlaceholder} />
      </AppCard>
    </View>
  );
}

function CrashesTab() {
  const crashes = [
    { title: 'NullPointerException', file: 'HomeViewModel.kt:142', platform: 'Android', severity: 'High', count: '84x' },
    { title: 'EXC_BAD_ACCESS (SIGSEGV)', file: 'NetworkManager.swift:89', platform: 'iOS', severity: 'High', count: '41x' },
    { title: 'IndexOutOfBoundsException', file: 'FeedAdapter.kt:67', platform: 'Android', severity: 'Med', count: '29x' },
    { title: 'Thread 1: signal SIGABRT', file: 'CoreData+Ext.swift:34', platform: 'iOS', severity: 'Med', count: '18x' },
  ];
  return (
    <View style={{ marginTop: 14, gap: 14 }}>
      <AppCard style={styles.bigCard}>
        <View style={styles.bigCardHeader}>
          <View>
            <ThemedText style={styles.bigCardTitle}>Crash-free Sessions</ThemedText>
            <ThemedText style={styles.bigCardSubtitle}>All platforms · 30 days</ThemedText>
          </View>
          <View style={[styles.smallPill, { backgroundColor: 'rgba(255, 77, 79, 0.14)' }]}>
            <ThemedText style={[styles.smallPillText, { color: '#FF4D4F' }]}>-0.2% vs last</ThemedText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 10 }}>
          <ThemedText style={{ color: '#fff', fontSize: 44, lineHeight: 50, fontWeight: '900' }}>99.1</ThemedText>
          <ThemedText style={{ color: ADMIN_MUTED, fontSize: 18, fontWeight: '800', paddingBottom: 8 }}>%</ThemedText>
          <View style={{ flex: 1 }} />
          <View style={{ gap: 6, paddingBottom: 4 }}>
            <View style={styles.platformLine}>
              <View style={[styles.legendDot, { backgroundColor: ADMIN_PURPLE }]} />
              <ThemedText style={styles.legendText}>iOS</ThemedText>
              <ThemedText style={[styles.legendText, { marginLeft: 6 }]}>99.4%</ThemedText>
            </View>
            <View style={styles.platformLine}>
              <View style={[styles.legendDot, { backgroundColor: '#22D18B' }]} />
              <ThemedText style={styles.legendText}>Android</ThemedText>
              <ThemedText style={[styles.legendText, { marginLeft: 6 }]}>98.7%</ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: '99%' }]} />
        </View>
      </AppCard>

      <AppCard style={styles.bigCard}>
        <View style={styles.bigCardHeader}>
          <ThemedText style={styles.bigCardTitle}>Top Crashes</ThemedText>
          <ThemedText style={{ color: ADMIN_MUTED }}>182 total · 3 unresolved</ThemedText>
        </View>
        <View style={{ marginTop: 10, gap: 10 }}>
          {crashes.map((c) => (
            <View key={c.title} style={styles.crashRow}>
              <View style={[styles.crashIcon, { backgroundColor: 'rgba(255, 77, 79, 0.12)' }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#FF4D4F" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: '#fff', fontWeight: '800' }}>{c.title}</ThemedText>
                <ThemedText style={{ color: ADMIN_MUTED, marginTop: 2 }}>{c.file}</ThemedText>
                <View style={styles.crashMetaRow}>
                  <View style={[styles.severityPill, { backgroundColor: 'rgba(255, 77, 79, 0.14)' }]}>
                    <ThemedText style={[styles.severityText, { color: '#FF4D4F' }]}>{c.severity}</ThemedText>
                  </View>
                  <View style={[styles.severityPill, { backgroundColor: 'rgba(124, 58, 237, 0.14)' }]}>
                    <ThemedText style={[styles.severityText, { color: ADMIN_PURPLE }]}>{c.platform}</ThemedText>
                  </View>
                  <View style={{ flex: 1 }} />
                  <ThemedText style={{ color: ADMIN_MUTED, fontWeight: '800' }}>{c.count}</ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </AppCard>
    </View>
  );
}

function RevenueTab() {
  const breakdown = [
    { label: 'Annual Subscriptions', value: 11400, color: '#60A5FA' },
    { label: 'Monthly Subscriptions', value: 7900, color: ADMIN_PURPLE },
    { label: 'One-time Purchases', value: 3800, color: '#22D18B' },
    { label: 'Consumables', value: 1600, color: '#F59E0B' },
  ];
  const max = Math.max(...breakdown.map((b) => b.value));

  return (
    <View style={{ marginTop: 14, gap: 14 }}>
      <SectionTitle label="REVENUE" right={<ThemedText style={{ color: ADMIN_PURPLE, fontWeight: '700' }}>Export</ThemedText>} />

      <AppCard style={styles.bigCard}>
        <View style={styles.bigCardHeader}>
          <View>
            <ThemedText style={styles.bigCardSubtitle}>MONTHLY REVENUE</ThemedText>
            <ThemedText style={{ color: '#fff', fontSize: 34, lineHeight: 38, fontWeight: '900', marginTop: 6 }}>
              $24,700
            </ThemedText>
            <ThemedText style={{ color: '#22D18B', fontWeight: '800', marginTop: 8 }}>↗ +18.3% vs last month</ThemedText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <ThemedText style={styles.bigCardSubtitle}>ARPPU</ThemedText>
            <ThemedText style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 6 }}>$3.84</ThemedText>
          </View>
        </View>
      </AppCard>

      <AppCard style={styles.bigCard}>
        <ThemedText style={styles.bigCardTitle}>IAP vs Subscriptions</ThemedText>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: ADMIN_PURPLE }]} />
            <ThemedText style={styles.legendText}>IAP</ThemedText>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
            <ThemedText style={styles.legendText}>Subscriptions</ThemedText>
          </View>
        </View>
        <View style={styles.barChartPlaceholder} />
      </AppCard>

      <AppCard style={styles.bigCard}>
        <ThemedText style={styles.bigCardTitle}>Revenue Breakdown</ThemedText>
        <View style={{ gap: 12, marginTop: 12 }}>
          {breakdown.map((b) => (
            <View key={b.label}>
              <View style={styles.sourceRow}>
                <View style={[styles.legendDot, { backgroundColor: b.color }]} />
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>{b.label}</ThemedText>
                <View style={{ flex: 1 }} />
                <ThemedText style={{ color: '#fff', fontWeight: '900' }}>${b.value.toLocaleString()}</ThemedText>
              </View>
              <View style={styles.sourceBarBg}>
                <View style={[styles.sourceBarFill, { width: `${(b.value / max) * 100}%`, backgroundColor: b.color }]} />
              </View>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard style={styles.bigCard}>
        <ThemedText style={styles.bigCardTitle}>Purchase Funnel</ThemedText>
        <View style={styles.chartPlaceholder} />
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ADMIN_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: ADMIN_BORDER,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 6 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { color: ADMIN_MUTED, fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    width: '48%',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: ADMIN_CARD,
    borderColor: ADMIN_BORDER,
    borderWidth: 1,
    borderRadius: 16,
  },
  metricLabel: { color: ADMIN_MUTED, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  metricValueRow: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  metricValue: { color: '#fff', fontSize: 26, lineHeight: 30, fontWeight: '900' },
  metricFootRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  metricSubLabel: { color: ADMIN_MUTED, fontSize: 12 },
  metricDelta: { marginLeft: 'auto', fontSize: 12, fontWeight: '800' },
  bigCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: ADMIN_CARD,
    borderColor: ADMIN_BORDER,
    borderWidth: 1,
    borderRadius: 18,
  },
  bigCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bigCardTitle: { color: '#fff', fontSize: 16, lineHeight: 20, fontWeight: '900' },
  bigCardSubtitle: { color: ADMIN_MUTED, marginTop: 2 },
  chartPlaceholder: {
    height: 150,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: 'rgba(124,58,237,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.18)',
  },
  barChartPlaceholder: {
    height: 140,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: ADMIN_BORDER,
  },
  halfCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: ADMIN_CARD,
    borderColor: ADMIN_BORDER,
    borderWidth: 1,
    borderRadius: 18,
  },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  donut: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 12,
    borderColor: ADMIN_PURPLE,
    borderLeftColor: '#22D18B',
    borderBottomColor: '#22D18B',
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: ADMIN_MUTED, fontWeight: '700' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  storeSub: { color: ADMIN_MUTED, marginTop: 2, fontSize: 12 },
  smallPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(245, 158, 11, 0.14)' },
  smallPillText: { color: '#F59E0B', fontWeight: '900', fontSize: 12 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sourceBarBg: { height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 8, overflow: 'hidden' },
  sourceBarFill: { height: 10, borderRadius: 999 },
  summaryCard: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: ADMIN_CARD,
    borderColor: ADMIN_BORDER,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: { color: '#fff', fontWeight: '900', fontSize: 18 },
  summaryLabel: { color: ADMIN_MUTED, fontWeight: '800', fontSize: 11, letterSpacing: 0.7 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ADMIN_BORDER,
  },
  eventRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: ADMIN_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: { height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 12, overflow: 'hidden' },
  progressBarFill: { height: 10, borderRadius: 999, backgroundColor: ADMIN_PURPLE },
  platformLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  crashRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: ADMIN_BORDER },
  crashIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  crashMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  severityPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  severityText: { fontWeight: '900', fontSize: 12 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: ADMIN_BORDER,
    backgroundColor: 'rgba(14,16,18,0.98)',
  },
  bottomItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  bottomIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bottomIconActive: { backgroundColor: 'rgba(124,58,237,0.16)' },
  bottomIconIdle: { backgroundColor: 'rgba(255,255,255,0.03)' },
});