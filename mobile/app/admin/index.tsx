import { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { apiClient, User } from '@/api/client';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type UserWithStats = User & {
  stats?: {
    currencyPosts: number;
    parcelTrips: number;
    parcelRequests: number;
    totalPosts: number;
  }
};

export default function AdminScreen() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.listUsers();
      // Fetch stats for each user
      const usersWithStats = await Promise.all(
        result.map(async (user) => {
          try {
            const stats = await apiClient.getUserStats(user.id);
            return { ...user, stats };
          } catch (e) {
            // console.error(`Failed to load stats for user ${user.id}`, e);
            return user;
          }
        })
      );
      setUsers(usersWithStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (user: User) => {
    try {
      const newStatus = !user.isSuspended;
      await apiClient.suspendUser(user.id, newStatus);
      Alert.alert('Success', `User ${newStatus ? 'suspended' : 'activated'}`);
      loadUsers();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const handleVerify = async (user: User) => {
    try {
      const newLevel = user.verificationLevel ? 0 : 1;
      await apiClient.verifyUser(user.id, newLevel);
      Alert.alert('Success', `User ${newLevel ? 'verified' : 'unverified'}`);
      loadUsers();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={null}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Admin Dashboard</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedButton title="Refresh" onPress={loadUsers} disabled={loading} />
        
        {error && <ThemedText style={{ color: 'red' }}>{error}</ThemedText>}
        
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View>
                <ThemedText type="subtitle">{user.fullName || 'No Name'}</ThemedText>
                <ThemedText style={styles.phoneText}>{user.phoneNumber}</ThemedText>
              </View>
              <View style={[styles.statusBadge, user.isSuspended ? styles.suspendedBadge : styles.activeBadge]}>
                <ThemedText style={styles.statusText}>
                  {user.isSuspended ? 'Suspended' : 'Active'}
                </ThemedText>
              </View>
            </View>

            {user.stats && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <ThemedText type="defaultSemiBold">{user.stats.currencyPosts}</ThemedText>
                  <ThemedText style={styles.statLabel}>Currency</ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText type="defaultSemiBold">{user.stats.parcelTrips}</ThemedText>
                  <ThemedText style={styles.statLabel}>Trips</ThemedText>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <ThemedText type="defaultSemiBold">{user.stats.parcelRequests}</ThemedText>
                  <ThemedText style={styles.statLabel}>Requests</ThemedText>
                </View>
              </View>
            )}

            <View style={styles.actionRow}>
              <ThemedText>Verified: {user.verificationLevel ? 'Yes' : 'No'}</ThemedText>
              <ThemedText>Admin: {user.isAdmin ? 'Yes' : 'No'}</ThemedText>
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, user.isSuspended ? styles.unsuspendButton : styles.suspendButton]}
                onPress={() => handleSuspend(user)}>
                <ThemedText style={styles.buttonText}>
                  {user.isSuspended ? "Unsuspend" : "Suspend"}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.verifyButton]}
                onPress={() => handleVerify(user)}>
                <ThemedText style={styles.buttonText}>
                  {user.verificationLevel ? "Unverify" : "Verify"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        {users.length === 0 && !loading && (
          <ThemedText>No users found</ThemedText>
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stepContainer: {
    gap: 16,
    marginBottom: 8,
  },
  userCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    gap: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  phoneText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#e6fffa',
  },
  suspendedBadge: {
    backgroundColor: '#fff5f5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)', // Subtle dark background for stats inside card
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suspendButton: {
    backgroundColor: '#ff4d4f',
  },
  unsuspendButton: {
    backgroundColor: '#52c41a',
  },
  verifyButton: {
    backgroundColor: '#1890ff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
