import { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
import {
  apiClient,
  type Dispute,
  type DisputeStatus,
  type VerificationDocument,
  type VerificationDocumentStatus,
  User,
} from '@/api/client';
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
  const [tab, setTab] = useState<'users' | 'disputes' | 'documents'>('users');
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (tab === 'disputes') {
      loadDisputes();
    }
    if (tab === 'documents') {
      loadDocuments();
    }
  }, [tab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
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
      setLoadingUsers(false);
    }
  };

  const loadDisputes = async () => {
    setLoadingDisputes(true);
    setError(null);
    try {
      const list = await apiClient.listAllDisputes();
      setDisputes(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDisputes(false);
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

  const handleResolveDispute = async (disputeId: string, status: DisputeStatus) => {
    try {
      await apiClient.resolveDispute(disputeId, status);
      Alert.alert('Success', `Dispute updated: ${status}`);
      loadDisputes();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const loadDocuments = async () => {
    setLoadingDocuments(true);
    setError(null);
    try {
      const list = await apiClient.listAllVerificationDocuments();
      setDocuments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleReviewDocument = async (
    id: string,
    status: VerificationDocumentStatus,
    rejectionReason?: string,
  ) => {
    try {
      await apiClient.reviewVerificationDocument({ id, status, rejectionReason });
      Alert.alert('Success', `Document updated: ${status}`);
      loadDocuments();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const loading =
    tab === 'users'
      ? loadingUsers
      : tab === 'disputes'
      ? loadingDisputes
      : loadingDocuments;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={null}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Admin Dashboard</ThemedText>
      </ThemedView>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'users' && styles.activeTab]}
          onPress={() => setTab('users')}
          disabled={loading}
        >
          <ThemedText style={[styles.tabText, tab === 'users' && styles.activeTabText]}>
            Users
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'disputes' && styles.activeTab]}
          onPress={() => setTab('disputes')}
          disabled={loading}
        >
          <ThemedText style={[styles.tabText, tab === 'disputes' && styles.activeTabText]}>
            Disputes
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'documents' && styles.activeTab]}
          onPress={() => setTab('documents')}
          disabled={loading}
        >
          <ThemedText style={[styles.tabText, tab === 'documents' && styles.activeTabText]}>
            Documents
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedButton
          title="Refresh"
          onPress={tab === 'users' ? loadUsers : tab === 'disputes' ? loadDisputes : loadDocuments}
          disabled={loading}
        />
        
        {error && <ThemedText style={{ color: 'red' }}>{error}</ThemedText>}

        {tab === 'users' ? (
          <>
            {users.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View>
                    <ThemedText type="subtitle">{user.fullName || 'No Name'}</ThemedText>
                    <ThemedText style={styles.phoneText}>{user.phoneNumber}</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      user.isSuspended ? styles.suspendedBadge : styles.activeBadge,
                    ]}
                  >
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
                    style={[
                      styles.actionButton,
                      user.isSuspended ? styles.unsuspendButton : styles.suspendButton,
                    ]}
                    onPress={() => handleSuspend(user)}
                  >
                    <ThemedText style={styles.buttonText}>
                      {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.verifyButton]}
                    onPress={() => handleVerify(user)}
                  >
                    <ThemedText style={styles.buttonText}>
                      {user.verificationLevel ? 'Unverify' : 'Verify'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {users.length === 0 && !loading && <ThemedText>No users found</ThemedText>}
          </>
        ) : tab === 'disputes' ? (
          <>
            {disputes.map((d) => {
              const isResolved =
                d.status === 'resolved_valid' || d.status === 'resolved_invalid';
              const relatedId = d.matchRequestId ?? d.parcelRequestId ?? '';
              const relatedType = d.matchRequestId ? 'currency' : d.parcelRequestId ? 'parcel' : 'unknown';
              return (
                <View key={d.id} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View>
                      <ThemedText type="subtitle">Dispute</ThemedText>
                      <ThemedText style={styles.phoneText}>
                        {relatedType} • {relatedId}
                      </ThemedText>
                    </View>
                    <View style={[styles.statusBadge, isResolved ? styles.activeBadge : styles.suspendedBadge]}>
                      <ThemedText style={styles.statusText}>{d.status}</ThemedText>
                    </View>
                  </View>

                  <ThemedText>{d.reason}</ThemedText>
                  <ThemedText style={styles.metaText}>
                    Created: {new Date(d.createdAt).toLocaleString()}
                  </ThemedText>

                  {!isResolved ? (
                    <View style={styles.disputeButtonRow}>
                      <ThemedButton
                        title="Under review"
                        variant="secondary"
                        onPress={() => handleResolveDispute(d.id, 'under_review')}
                        style={{ flex: 1 }}
                      />
                      <ThemedButton
                        title="Valid"
                        onPress={() => handleResolveDispute(d.id, 'resolved_valid')}
                        style={{ flex: 1 }}
                      />
                      <ThemedButton
                        title="Invalid"
                        variant="secondary"
                        onPress={() => handleResolveDispute(d.id, 'resolved_invalid')}
                        style={{ flex: 1 }}
                      />
                    </View>
                  ) : (
                    <ThemedText style={styles.metaText}>
                      Resolved: {d.resolvedAt ? new Date(d.resolvedAt).toLocaleString() : '-'}
                    </ThemedText>
                  )}
                </View>
              );
            })}

            {disputes.length === 0 && !loading && <ThemedText>No disputes found</ThemedText>}
          </>
        ) : (
          <>
            {documents.map((doc) => {
              const isFinal = doc.status === 'approved' || doc.status === 'rejected';
              return (
                <View key={doc.id} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View>
                      <ThemedText type="subtitle">{doc.type}</ThemedText>
                      <ThemedText style={styles.phoneText} numberOfLines={1}>
                        {doc.fileName}
                      </ThemedText>
                      <ThemedText style={styles.metaText}>
                        User: {doc.userId}
                      </ThemedText>
                    </View>
                    <View style={[styles.statusBadge, isFinal ? styles.activeBadge : styles.suspendedBadge]}>
                      <ThemedText style={styles.statusText}>{doc.status}</ThemedText>
                    </View>
                  </View>

                  {doc.status === 'rejected' && doc.rejectionReason ? (
                    <ThemedText style={styles.metaText}>{doc.rejectionReason}</ThemedText>
                  ) : null}

                  <View style={styles.disputeButtonRow}>
                    <ThemedButton
                      title="Under review"
                      variant="secondary"
                      onPress={() => handleReviewDocument(doc.id, 'under_review')}
                      style={{ flex: 1 }}
                      disabled={doc.status === 'under_review'}
                    />
                    <ThemedButton
                      title="Approve"
                      onPress={() => handleReviewDocument(doc.id, 'approved')}
                      style={{ flex: 1 }}
                      disabled={doc.status === 'approved'}
                    />
                    <ThemedButton
                      title="Reject"
                      variant="secondary"
                      onPress={() =>
                        handleReviewDocument(
                          doc.id,
                          'rejected',
                          'Please re-upload a clearer document.',
                        )
                      }
                      style={{ flex: 1 }}
                      disabled={doc.status === 'rejected'}
                    />
                  </View>
                </View>
              );
            })}

            {documents.length === 0 && !loading && (
              <ThemedText>No documents found</ThemedText>
            )}
          </>
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
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.3)',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0a7ea4',
  },
  tabText: {
    opacity: 0.6,
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#0a7ea4',
    opacity: 1,
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
  metaText: {
    fontSize: 12,
    opacity: 0.7,
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
  disputeButtonRow: {
    flexDirection: 'row',
    gap: 8,
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
