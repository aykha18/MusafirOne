import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, Alert, Modal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedButton } from '@/components/themed-button';
import { ThemedInput } from '@/components/themed-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { apiClient } from '@/api/client';
import { CountrySelector, Country } from '@/components/country-selector';
import { DateTimePickerInput } from '@/components/date-time-picker-input';
import { RatingModal, RatingData } from '@/components/rating-modal';
import { DisputeModal } from '@/components/dispute-modal';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import parcelItemTypes from '@/data/parcel-item-types.json';

type ParcelTrip = {
  id: string;
  fromCountry: string;
  toCountry: string;
  departureDate: string;
  arrivalDate: string;
  maxWeightKg: number;
  allowedCategories?: string;
  userId: string;
  status: string;
  requests?: ParcelRequest[];
};

type ParcelRequest = {
  id: string;
  fromCountry: string;
  toCountry: string;
  flexibleFromDate: string;
  flexibleToDate: string;
  itemType: string;
  weightKg: number;
  userId: string;
  status: string;
  tripId?: string;
  matchInitiatedByUserId?: string;
};

type ParcelItemTypeOption = {
  id: string;
  label: string;
};

export default function ParcelScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Dynamic styles
  const cardBackgroundColor = isDark ? '#1E1E1E' : '#fff';
  const formBackgroundColor = isDark ? '#1E1E1E' : '#f5f5f5';
  const tabContainerColor = isDark ? '#2C2C2E' : '#eee';
  const activeTabColor = isDark ? '#48484A' : '#fff';
  const tabTextColor = isDark ? '#9BA1A6' : '#666';
  const activeTabTextColor = isDark ? '#fff' : '#000';
  const badgeBackgroundColor = isDark ? '#3A3A3C' : '#e0e0e0';
  const borderColor = isDark ? '#333' : '#e0e0e0';

  const [viewMode, setViewMode] = useState<'trips' | 'requests'>('requests');
  
  const [trips, setTrips] = useState<ParcelTrip[]>([]);
  const [requests, setRequests] = useState<ParcelRequest[]>([]);
  
  const [myTrips, setMyTrips] = useState<ParcelTrip[]>([]);
  const [myRequests, setMyRequests] = useState<ParcelRequest[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  
  const [showTripForm, setShowTripForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  
  // Trip Form State
  const [fromCountry, setFromCountry] = useState<Country | undefined>(undefined);
  const [toCountry, setToCountry] = useState<Country | undefined>(undefined);
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [departureTime, setDepartureTime] = useState<Date | undefined>(undefined);
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(undefined);
  const [arrivalTime, setArrivalTime] = useState<Date | undefined>(undefined);
  const [maxWeightKg, setMaxWeightKg] = useState('');
  const [allowedCategories, setAllowedCategories] = useState('');
  
  // Request Form State
  const [reqItemType, setReqItemType] = useState('');
  const [reqWeightKg, setReqWeightKg] = useState('');
  const [reqFromCountry, setReqFromCountry] = useState<Country | undefined>(undefined);
  const [reqToCountry, setReqToCountry] = useState<Country | undefined>(undefined);
  const [reqFlexibleFromDate, setReqFlexibleFromDate] = useState<Date | undefined>(undefined);
  const [reqFlexibleToDate, setReqFlexibleToDate] = useState<Date | undefined>(undefined);

  const itemTypeOptions = parcelItemTypes as ParcelItemTypeOption[];

  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filterMineOnly, setFilterMineOnly] = useState(false);
  const [filterFromCountry, setFilterFromCountry] = useState<Country | undefined>(undefined);
  const [filterToCountry, setFilterToCountry] = useState<Country | undefined>(undefined);
  const [filterItemType, setFilterItemType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [creatingBusy, setCreatingBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Match Modal State (Trips)
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [tripModalTitle, setTripModalTitle] = useState('');
  const [candidateTrips, setCandidateTrips] = useState<ParcelTrip[]>([]);
  const [selectedRequestForMatching, setSelectedRequestForMatching] = useState<ParcelRequest | null>(null);

  // Match Modal State (Requests)
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestModalTitle, setRequestModalTitle] = useState('');
  const [candidateRequests, setCandidateRequests] = useState<ParcelRequest[]>([]);
  const [selectedTripForMatching, setSelectedTripForMatching] = useState<ParcelTrip | null>(null);

  const [matchingBusy, setMatchingBusy] = useState(false);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRequestForRating, setSelectedRequestForRating] = useState<ParcelRequest | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);

  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [selectedRequestForDispute, setSelectedRequestForDispute] = useState<ParcelRequest | null>(null);
  const [disputeBusy, setDisputeBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      // 1. Get Me
      let currentUserId = myUserId;
      if (!currentUserId) {
        const me = await apiClient.getMe();
        if ((me as any).id) {
          currentUserId = (me as any).id;
          setMyUserId(currentUserId);
        }
      }

      // 2. Load My Lists First (to ensure we have them)
      const myTripsResult = await apiClient.listMyParcelTrips();
      const myTripsList = ((myTripsResult as any) ?? []) as ParcelTrip[];
      setMyTrips(myTripsList);

      const myRequestsResult = await apiClient.listMyParcelRequests();
      const myRequestsList = ((myRequestsResult as any) ?? []) as ParcelRequest[];
      setMyRequests(myRequestsList);

      // 3. Load Public Lists
      const tripsResult = await apiClient.listParcelTrips();
      const requestsResult = await apiClient.listParcelRequests();
      const publicTrips = ((tripsResult as any).items ?? []) as ParcelTrip[];
      const publicRequests = ((requestsResult as any).items ?? []) as ParcelRequest[];

      // 4. Merge Lists (My items + Public items, deduplicated)
      // Use Map to deduplicate by ID, keeping my items (with potentially different status)
      const mergedTripsMap = new Map<string, ParcelTrip>();
      myTripsList.forEach(t => mergedTripsMap.set(t.id, t));
      publicTrips.forEach(t => {
        if (!mergedTripsMap.has(t.id)) {
          mergedTripsMap.set(t.id, t);
        }
      });
      
      const mergedRequestsMap = new Map<string, ParcelRequest>();
      myRequestsList.forEach(r => mergedRequestsMap.set(r.id, r));
      publicRequests.forEach(r => {
        if (!mergedRequestsMap.has(r.id)) {
          mergedRequestsMap.set(r.id, r);
        }
      });

      // Sort Trips by departure date
      const allTrips = Array.from(mergedTripsMap.values()).sort((a, b) => 
        new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime()
      );
      
      // Requests: keep my requests at top (insertion order), others appended
      const allRequests = Array.from(mergedRequestsMap.values());

      setTrips(allTrips);
      setRequests(allRequests);

      setLoadedOnce(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!apiClient.getAccessToken()) {
      router.push('/');
      return;
    }
    void load();
  }, []);

  const handleCreateTrip = async () => {
    setCreatingBusy(true);
    setCreateError(null);
    try {
      if (!fromCountry || !toCountry || !departureDate || !arrivalDate || !maxWeightKg) {
        throw new Error('Please fill in all required fields');
      }

      const maxWeight = Number(maxWeightKg);
      if (isNaN(maxWeight) || maxWeight <= 0) {
        throw new Error('Max weight must be a valid number greater than 0');
      }

      const finalDeparture = new Date(departureDate);
      if (departureTime) {
        finalDeparture.setHours(departureTime.getHours());
        finalDeparture.setMinutes(departureTime.getMinutes());
      } else {
        finalDeparture.setHours(0, 0, 0, 0);
      }

      const finalArrival = new Date(arrivalDate);
      if (arrivalTime) {
        finalArrival.setHours(arrivalTime.getHours());
        finalArrival.setMinutes(arrivalTime.getMinutes());
      } else {
        finalArrival.setHours(23, 59, 59, 999);
      }

      await apiClient.createParcelTrip({
        fromCountry: fromCountry.name,
        toCountry: toCountry.name,
        departureDate: finalDeparture.toISOString(),
        arrivalDate: finalArrival.toISOString(),
        maxWeightKg: maxWeight,
        allowedCategories,
      });
      
      setFromCountry(undefined);
      setToCountry(undefined);
      setDepartureDate(undefined);
      setDepartureTime(undefined);
      setArrivalDate(undefined);
      setArrivalTime(undefined);
      setMaxWeightKg('');
      setAllowedCategories('');
      setShowTripForm(false);
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingBusy(false);
    }
  };

  const handleCreateRequest = async () => {
    setCreatingBusy(true);
    setCreateError(null);
    try {
      if (!reqItemType || !reqFromCountry || !reqToCountry || !reqFlexibleFromDate || !reqFlexibleToDate || !reqWeightKg) {
        throw new Error('Please fill in all required fields');
      }

      const weight = Number(reqWeightKg);
      if (isNaN(weight) || weight < 0.1) {
        throw new Error('Weight must be at least 0.1 kg');
      }

      const flexibleFrom = new Date(reqFlexibleFromDate);
      flexibleFrom.setHours(0, 0, 0, 0);

      const flexibleTo = new Date(reqFlexibleToDate);
      flexibleTo.setHours(23, 59, 59, 999);

      await apiClient.createParcelRequest({
        itemType: reqItemType,
        weightKg: weight,
        fromCountry: reqFromCountry.name,
        toCountry: reqToCountry.name,
        flexibleFromDate: flexibleFrom.toISOString(),
        flexibleToDate: flexibleTo.toISOString(),
      });
      
      setReqItemType('');
      setReqFromCountry(undefined);
      setReqToCountry(undefined);
      setReqFlexibleFromDate(undefined);
      setReqFlexibleToDate(undefined);
      setReqWeightKg('');
      setShowRequestForm(false);
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingBusy(false);
    }
  };

  const findTripsForRequest = async (request: ParcelRequest) => {
    const isMyRequest = request.userId === myUserId;
    
    setMatchingBusy(true);
    try {
      let candidates: ParcelTrip[] = [];
      if (isMyRequest) {
        // Find public trips for my request
        const result = await apiClient.searchTripsForRequest(request.id);
        candidates = (result as any) ?? [];
        setTripModalTitle('Matching Trips');
      } else {
        // Find my trips for public request
        candidates = myTrips.filter(trip => {
          if (trip.status !== 'active') return false;
          if (trip.fromCountry !== request.fromCountry || trip.toCountry !== request.toCountry) return false;
          const tripDate = new Date(trip.departureDate);
          const reqFrom = new Date(request.flexibleFromDate);
          reqFrom.setHours(0, 0, 0, 0);
          const reqTo = new Date(request.flexibleToDate);
          reqTo.setHours(23, 59, 59, 999);
          
          if (tripDate < reqFrom || tripDate > reqTo) return false;
          if (trip.maxWeightKg < request.weightKg) return false;
          return true;
        });
        setTripModalTitle('Select Your Trip');
      }

      if (candidates.length === 0) {
        Alert.alert('No Matches', 'No suitable trips found.');
        return;
      }

      setCandidateTrips(candidates);
      setSelectedRequestForMatching(request);
      setTripModalVisible(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setMatchingBusy(false);
    }
  };

  const findRequestsForTrip = async (trip: ParcelTrip) => {
    const isMyTrip = trip.userId === myUserId;

    setMatchingBusy(true);
    try {
      let candidates: ParcelRequest[] = [];
      if (isMyTrip) {
        // Find public requests for my trip
        const result = await apiClient.searchRequestsForTrip(trip.id);
        candidates = (result as any) ?? [];
        setRequestModalTitle('Matching Requests');
      } else {
        // Find my requests for public trip
        candidates = myRequests.filter(req => {
          if (req.status !== 'active') return false;
          if (req.fromCountry !== trip.fromCountry || req.toCountry !== trip.toCountry) return false;
          const tripDate = new Date(trip.departureDate);
          const reqFrom = new Date(req.flexibleFromDate);
          const reqTo = new Date(req.flexibleToDate);
          
          // Reset times for date-only comparison
          reqFrom.setHours(0, 0, 0, 0);
          reqTo.setHours(23, 59, 59, 999);
          
          if (tripDate < reqFrom || tripDate > reqTo) return false;
          if (req.weightKg > trip.maxWeightKg) return false;
          return true;
        });
        setRequestModalTitle('Select Your Request');
      }

      if (candidates.length === 0) {
        Alert.alert('No Matches', 'No suitable requests found.');
        return;
      }

      setCandidateRequests(candidates);
      setSelectedTripForMatching(trip);
      setRequestModalVisible(true);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setMatchingBusy(false);
    }
  };

  const handleConfirmMatch = async (tripId: string, requestId: string) => {
    setMatchingBusy(true);
    try {
      await apiClient.requestParcelMatch(requestId, tripId);
      Alert.alert('Success', 'Match requested! Waiting for acceptance.');
      setTripModalVisible(false);
      setRequestModalVisible(false);
      setSelectedRequestForMatching(null);
      setSelectedTripForMatching(null);
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setMatchingBusy(false);
    }
  };

  const handleAcceptMatch = async (requestId: string) => {
    setMatchingBusy(true);
    try {
      await apiClient.acceptParcelMatch(requestId);
      Alert.alert('Success', 'Match accepted!');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setMatchingBusy(false);
    }
  };

  const handleRejectMatch = async (requestId: string) => {
    setMatchingBusy(true);
    try {
      await apiClient.rejectParcelMatch(requestId);
      Alert.alert('Success', 'Match rejected.');
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setMatchingBusy(false);
    }
  };

  const handleMessage = async (targetUserId: string, matchRequestId?: string, parcelRequestId?: string) => {
    try {
      setBusy(true);
      const conversation = await apiClient.createConversation({
        targetUserId,
        matchRequestId,
        parcelRequestId,
      });
      router.push(`/chat/${conversation.id}`);
    } catch (e) {
      Alert.alert('Error', 'Could not start conversation');
      // console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteTrip = async (tripId: string) => {
    Alert.alert(
      'Complete Trip',
      'Are you sure you want to mark this trip as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setBusy(true);
            try {
              await apiClient.completeParcelTrip(tripId);
              Alert.alert('Success', 'Trip marked as completed!');
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteRequest = async (requestId: string) => {
    Alert.alert(
      'Complete Request',
      'Are you sure you want to mark this request as completed/received?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setBusy(true);
            try {
              await apiClient.completeParcelRequest(requestId);
              Alert.alert('Success', 'Request marked as completed!');
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleRateRequest = async (data: {
    reliabilityScore: number;
    communicationScore: number;
    timelinessScore: number;
    comment?: string;
  }) => {
    if (!selectedRequestForRating) return;
    setRatingBusy(true);
    try {
      await apiClient.createRating({
        parcelRequestId: selectedRequestForRating.id,
        reliabilityScore: data.reliabilityScore,
        communicationScore: data.communicationScore,
        timelinessScore: data.timelinessScore,
        comment: data.comment,
      });
      Alert.alert('Success', 'Rating submitted!');
      setRatingModalVisible(false);
      setSelectedRequestForRating(null);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setRatingBusy(false);
    }
  };

  const handleDisputeRequest = async (reason: string) => {
    if (!selectedRequestForDispute) return;
    setDisputeBusy(true);
    try {
      await apiClient.createDispute({
        parcelRequestId: selectedRequestForDispute.id,
        reason,
      });
      Alert.alert('Success', 'Dispute reported. Support will review it.');
      setDisputeModalVisible(false);
      setSelectedRequestForDispute(null);
      // Optimistically update status if needed
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setDisputeBusy(false);
    }
  };

  const renderTripItem = ({ item }: { item: ParcelTrip }) => {
    const isMyTrip = item.userId === myUserId;
    const isMatched = item.status === 'matched';
    const isCompleted = item.status === 'completed';
    
    // Check for pending requests on my trip
    const pendingRequests = isMyTrip && item.requests ? item.requests.filter(r => r.status === 'pending') : [];

    return (
      <ThemedView style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor }]}>
        <View style={styles.cardHeader}>
          <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
            {item.fromCountry} ➡️ {item.toCountry}
          </ThemedText>
          {(isMyTrip || isMatched || isCompleted) && (
            <ThemedText style={[styles.badge, { backgroundColor: badgeBackgroundColor }]}>
              {isCompleted ? 'Completed' : isMatched ? 'Matched' : 'My Trip'}
            </ThemedText>
          )}
        </View>
        <ThemedText>Depart: {new Date(item.departureDate).toLocaleDateString()} {new Date(item.departureDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</ThemedText>
        <ThemedText>Arrive: {new Date(item.arrivalDate).toLocaleDateString()} {new Date(item.arrivalDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</ThemedText>
        <ThemedText>Max Weight: {item.maxWeightKg} kg</ThemedText>
        {item.allowedCategories && <ThemedText>Categories: {item.allowedCategories}</ThemedText>}
        
        {/* Pending Requests Section for Trip Owner */}
        {pendingRequests.length > 0 && (
          <View style={styles.sectionSpacing}>
            <ThemedText type="defaultSemiBold" style={{color: Colors.light.tint}}>Pending Requests ({pendingRequests.length})</ThemedText>
            {pendingRequests.map(req => {
               const iInitiated = req.matchInitiatedByUserId === myUserId;
               return (
                 <View key={req.id} style={[styles.card, { marginHorizontal: 0, marginTop: 8 }]}>
                    <ThemedText>Item: {req.itemType} ({req.weightKg}kg)</ThemedText>
                    <View style={styles.cardActions}>
                      {iInitiated ? (
                        <ThemedText style={{fontStyle: 'italic', color: '#666'}}>Waiting for acceptance...</ThemedText>
                      ) : (
                        <>
                          <ThemedButton 
                        title="Accept" 
                        onPress={() => handleAcceptMatch(req.id)} 
                        disabled={matchingBusy}
                        style={{ marginRight: 8 }}
                      />
                      <ThemedButton 
                        title="Reject" 
                        onPress={() => handleRejectMatch(req.id)} 
                        disabled={matchingBusy}
                        variant="secondary"
                        style={{ marginRight: 8 }}
                      />
                      <ThemedButton 
                        title="Chat" 
                        onPress={() => handleMessage(req.userId, undefined, req.id)} 
                        disabled={matchingBusy}
                        variant="secondary"
                      />
                    </>
                  )}
                </View>
             </View>
           );
        })}
      </View>
    )}

    {isMyTrip && item.status === 'active' && (
           <View style={[styles.cardActions, { justifyContent: 'space-between' }]}>
             <ThemedButton 
               title="Find Packages" 
               onPress={() => findRequestsForTrip(item)} 
               disabled={busy || matchingBusy}
               style={{ flex: 1, marginRight: 8 }}
             />
             <ThemedButton 
               title="Complete Trip" 
               onPress={() => handleCompleteTrip(item.id)} 
               disabled={busy}
               variant="secondary"
               style={{ flex: 1 }}
             />
           </View>
        )}

        {!isMyTrip && item.status === 'active' && (
       <View style={[styles.cardActions, { justifyContent: 'space-between' }]}>
         <ThemedButton 
           title="Send Package" 
           onPress={() => findRequestsForTrip(item)} 
           disabled={matchingBusy}
           style={{ flex: 1, marginRight: 8 }}
         />
         <ThemedButton 
           title="Chat" 
           onPress={() => handleMessage(item.userId)} 
           disabled={matchingBusy}
           variant="secondary"
           style={{ flex: 1 }}
         />
       </View>
    )}
  </ThemedView>
);
  };

  const renderRequestItem = ({ item }: { item: ParcelRequest }) => {
    const isMyRequest = item.userId === myUserId;
    const isMatched = item.status === 'matched';
    const isPending = item.status === 'pending';
    const isCompleted = item.status === 'completed';
    const isMyTripMatch = item.tripId && myTrips.some(t => t.id === item.tripId);
    const iInitiated = item.matchInitiatedByUserId === myUserId;
    
    const matchedTrip = item.tripId ? trips.find(t => t.id === item.tripId) : null;
    const chatTargetId = isMyRequest ? matchedTrip?.userId : item.userId;

    return (
      <ThemedView style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor }]}>
        <View style={styles.cardHeader}>
          <ThemedText type="defaultSemiBold">{item.fromCountry} ➡️ {item.toCountry}</ThemedText>
          {isMyRequest ? (
             <ThemedText style={[styles.badge, { backgroundColor: badgeBackgroundColor }]}>My Request</ThemedText>
          ) : isMatched ? (
             <ThemedText style={[styles.badge, { backgroundColor: Colors.light.tint }]}>Matched</ThemedText>
          ) : isPending ? (
             <ThemedText style={[styles.badge, { backgroundColor: '#ffd700', color: '#000' }]}>Pending</ThemedText>
          ) : isCompleted ? (
             <ThemedText style={[styles.badge, { backgroundColor: badgeBackgroundColor }]}>Completed</ThemedText>
          ) : null}
        </View>
        <ThemedText>Item: {item.itemType}</ThemedText>
        <ThemedText>Weight: {item.weightKg} kg</ThemedText>
        <ThemedText>
          Window: {new Date(item.flexibleFromDate).toLocaleDateString()} -{' '}
          {new Date(item.flexibleToDate).toLocaleDateString()}
        </ThemedText>
        
        {/* Actions for Public User (Trip Owner looking for packages) */}
        {!isMyRequest && !isMatched && !isPending && !isCompleted && (
          <View style={styles.cardActions}>
            <ThemedButton 
              title="Carry this Package" 
              onPress={() => findTripsForRequest(item)} 
              disabled={matchingBusy}
              style={{ marginRight: 8 }}
            />
            <ThemedButton 
              title="Chat" 
              onPress={() => handleMessage(item.userId, undefined, item.id)} 
              disabled={matchingBusy}
              variant="secondary"
            />
          </View>
        )}

        {/* Actions for Request Owner - Active */}
        {isMyRequest && item.status === 'active' && (
           <View style={styles.cardActions}>
             <ThemedButton 
               title="Find Traveler" 
               onPress={() => findTripsForRequest(item)} 
               disabled={matchingBusy}
             />
           </View>
        )}

        {/* Pending Actions (For Request Owner OR Trip Owner) */}
        {(isMyRequest || isMyTripMatch) && isPending && (
           <View style={styles.cardActions}>
             {iInitiated ? (
               <>
                 <ThemedText style={{fontStyle: 'italic', color: '#666', marginRight: 8, alignSelf: 'center'}}>Waiting for acceptance...</ThemedText>
                 {chatTargetId && (
                   <ThemedButton 
                     title="Chat" 
                     onPress={() => handleMessage(chatTargetId, undefined, item.id)} 
                     disabled={matchingBusy}
                     variant="secondary"
                   />
                 )}
               </>
             ) : (
               <>
                  <ThemedButton 
                    title="Accept" 
                    onPress={() => handleAcceptMatch(item.id)} 
                    disabled={matchingBusy}
                    style={{ marginRight: 8 }}
                  />
                  <ThemedButton 
                    title="Reject" 
                    onPress={() => handleRejectMatch(item.id)} 
                    disabled={matchingBusy}
                    variant="secondary"
                    style={{ marginRight: 8 }}
                  />
                  {chatTargetId && (
                    <ThemedButton 
                      title="Chat" 
                      onPress={() => handleMessage(chatTargetId, undefined, item.id)} 
                      disabled={matchingBusy}
                      variant="secondary"
                    />
                  )}
               </>
             )}
           </View>
        )}

        {/* Matched Actions */}
        {isMyRequest && isMatched && (
           <View style={styles.cardActions}>
             <ThemedButton 
               title="Mark as Received" 
               onPress={() => handleCompleteRequest(item.id)} 
               disabled={busy}
               style={{ flex: 1, marginRight: 8 }}
             />
             <ThemedButton 
               title="Dispute" 
               variant="secondary"
               onPress={() => {
                 setSelectedRequestForDispute(item);
                 setDisputeModalVisible(true);
               }} 
               disabled={disputeBusy}
               style={{ flex: 1, marginRight: 8 }}
             />
             {chatTargetId && (
               <ThemedButton 
                 title="Chat" 
                 onPress={() => handleMessage(chatTargetId, undefined, item.id)} 
                 disabled={matchingBusy}
                 variant="secondary"
                 style={{ flex: 1 }}
               />
             )}
           </View>
        )}

        {isMyTripMatch && isMatched && (
           <View style={styles.cardActions}>
             <ThemedButton 
               title="Dispute" 
               variant="secondary"
               onPress={() => {
                 setSelectedRequestForDispute(item);
                 setDisputeModalVisible(true);
               }} 
               disabled={disputeBusy}
               style={{ flex: 1, marginRight: 8 }}
             />
             {chatTargetId && (
               <ThemedButton 
                 title="Chat" 
                 onPress={() => handleMessage(chatTargetId, undefined, item.id)} 
                 disabled={matchingBusy}
                 variant="secondary"
                 style={{ flex: 1 }}
               />
             )}
           </View>
        )}

        {(isMyRequest || isMyTripMatch) && isCompleted && (
           <View style={styles.cardActions}>
             <ThemedButton 
               title="Rate User" 
               onPress={() => {
                 setSelectedRequestForRating(item);
                 setRatingModalVisible(true);
               }} 
               disabled={ratingBusy}
               style={{ flex: 1, marginRight: 8 }}
             />
             <ThemedButton 
               title="Dispute" 
               variant="secondary"
               onPress={() => {
                 setSelectedRequestForDispute(item);
                 setDisputeModalVisible(true);
               }} 
               disabled={disputeBusy}
               style={{ flex: 1 }}
             />
           </View>
        )}
      </ThemedView>
    );
  };

  const normalize = (value: string) => value.trim().toLowerCase();

  const matchesCountryFilter = (value: string, country?: Country) => {
    if (!country) return true;
    const v = normalize(value);
    return v === normalize(country.name) || v === normalize(country.code);
  };

  const matchesTextFilter = (value: string | undefined, filter: string) => {
    if (!filter) return true;
    return normalize(value ?? '').includes(normalize(filter));
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterMineOnly && myUserId && r.userId !== myUserId) return false;
      if (!matchesCountryFilter(r.fromCountry, filterFromCountry)) return false;
      if (!matchesCountryFilter(r.toCountry, filterToCountry)) return false;
      if (!matchesTextFilter(r.itemType, filterItemType)) return false;
      if (!matchesTextFilter(r.status, filterStatus)) return false;
      return true;
    });
  }, [requests, filterMineOnly, myUserId, filterFromCountry, filterToCountry, filterItemType, filterStatus]);

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (filterMineOnly && myUserId && t.userId !== myUserId) return false;
      if (!matchesCountryFilter(t.fromCountry, filterFromCountry)) return false;
      if (!matchesCountryFilter(t.toCountry, filterToCountry)) return false;
      if (!matchesTextFilter(t.allowedCategories, filterItemType)) return false;
      if (!matchesTextFilter(t.status, filterStatus)) return false;
      return true;
    });
  }, [trips, filterMineOnly, myUserId, filterFromCountry, filterToCountry, filterItemType, filterStatus]);

  function ItemTypeSelector({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) {
    const [modalVisible, setModalVisible] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = itemTypeOptions.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()),
    );

    return (
      <>
        <ThemedInput
          value={value}
          onChangeText={() => {}}
          placeholder={placeholder}
          onPress={() => setModalVisible(true)}
        />
        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <ThemedView style={{ flex: 1, paddingTop: 48, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <ThemedText type="subtitle">{placeholder}</ThemedText>
              <ThemedButton title="Close" variant="secondary" onPress={() => setModalVisible(false)} />
            </View>
            <ThemedInput value={search} onChangeText={setSearch} placeholder="Search item type" />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 12 }}
                  onPress={() => {
                    onChange(item.label);
                    setModalVisible(false);
                    setSearch('');
                  }}
                >
                  <ThemedText type="defaultSemiBold">{item.label}</ThemedText>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={[styles.separator, { opacity: 0.2 }]} />}
            />
          </ThemedView>
        </Modal>
      </>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={null}>
      <ThemedView style={styles.header}>
        <View>
          <ThemedText type="title">Parcel Delivery</ThemedText>
          <ThemedText style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            Send packages securely or earn money by traveling.
          </ThemedText>
          <ThemedText style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
            • Use &quot;New Trip&quot; if you are traveling and can carry a parcel.
          </ThemedText>
          <ThemedText style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
            • Use &quot;New Request&quot; if you need to send a parcel.
          </ThemedText>
          <ThemedText style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Browse the lists below to find a match for your trip or parcel.
          </ThemedText>
        </View>
        <View style={styles.headerButtons}>
          <ThemedButton
            title={showTripForm ? 'Close trip form' : 'New trip'}
            onPress={() => {
              setShowTripForm((prev) => !prev);
              setShowRequestForm(false);
            }}
            disabled={busy || creatingBusy}
          />
          <ThemedButton
            title={showRequestForm ? 'Close request form' : 'New request'}
            onPress={() => {
              setShowRequestForm((prev) => !prev);
              setShowTripForm(false);
            }}
            disabled={busy || creatingBusy}
          />
          <ThemedButton title="Refresh" onPress={load} disabled={busy} variant="secondary" />
        </View>
      </ThemedView>

      {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
      {createError && <ThemedText style={styles.errorText}>{createError}</ThemedText>}
      
      {showTripForm && (
        <View style={styles.form}>
          <CountrySelector placeholder="From Country" value={fromCountry} onChange={setFromCountry} showDialCode={false} />
          <CountrySelector placeholder="To Country" value={toCountry} onChange={setToCountry} showDialCode={false} />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <DateTimePickerInput placeholder="Departure Date" value={departureDate || ''} onChange={setDepartureDate} mode="date" minimumDate={new Date()} />
            </View>
            <View style={styles.spacer} />
            <View style={styles.flex1}>
              <DateTimePickerInput placeholder="Time (Optional)" value={departureTime || ''} onChange={setDepartureTime} mode="time" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <DateTimePickerInput placeholder="Arrival Date" value={arrivalDate || ''} onChange={setArrivalDate} mode="date" minimumDate={departureDate || new Date()} />
            </View>
            <View style={styles.spacer} />
            <View style={styles.flex1}>
              <DateTimePickerInput placeholder="Time (Optional)" value={arrivalTime || ''} onChange={setArrivalTime} mode="time" />
            </View>
          </View>
          <ThemedInput placeholder="Max weight (kg)" keyboardType="numeric" value={maxWeightKg} onChangeText={setMaxWeightKg} />
          <ThemedInput placeholder="Allowed categories" value={allowedCategories} onChangeText={setAllowedCategories} />
          <ThemedButton
            title="Create trip"
            onPress={handleCreateTrip}
            disabled={creatingBusy || !fromCountry || !toCountry || !departureDate || !arrivalDate || !maxWeightKg}
            fullWidth
          />
        </View>
      )}

      {showRequestForm && (
        <View style={styles.form}>
          <ItemTypeSelector placeholder="Item type" value={reqItemType} onChange={setReqItemType} />
          <ThemedInput placeholder="Weight (kg)" keyboardType="numeric" value={reqWeightKg} onChangeText={setReqWeightKg} />
          <CountrySelector placeholder="From Country" value={reqFromCountry} onChange={setReqFromCountry} showDialCode={false} />
          <CountrySelector placeholder="To Country" value={reqToCountry} onChange={setReqToCountry} showDialCode={false} />
          <View style={styles.row}>
             <View style={styles.flex1}>
                <DateTimePickerInput placeholder="Flexible From" value={reqFlexibleFromDate || ''} onChange={setReqFlexibleFromDate} mode="date" minimumDate={new Date()} />
             </View>
             <View style={styles.spacer} />
             <View style={styles.flex1}>
                <DateTimePickerInput placeholder="Flexible To" value={reqFlexibleToDate || ''} onChange={setReqFlexibleToDate} mode="date" minimumDate={reqFlexibleFromDate || new Date()} />
             </View>
          </View>
          <ThemedButton
            title="Create request"
            onPress={handleCreateRequest}
            disabled={creatingBusy || !reqItemType || !reqWeightKg || !reqFromCountry || !reqToCountry || !reqFlexibleFromDate || !reqFlexibleToDate}
            fullWidth
          />
        </View>
      )}

      <View style={[styles.tabsContainer, { backgroundColor: tabContainerColor }]}>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'requests' && [styles.activeTab, { backgroundColor: activeTabColor }]]} 
          onPress={() => setViewMode('requests')}>
          <ThemedText style={[styles.tabText, { color: tabTextColor }, viewMode === 'requests' && [styles.activeTabText, { color: activeTabTextColor }]]}>Find Packages</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, viewMode === 'trips' && [styles.activeTab, { backgroundColor: activeTabColor }]]} 
          onPress={() => setViewMode('trips')}>
          <ThemedText style={[styles.tabText, { color: tabTextColor }, viewMode === 'trips' && [styles.activeTabText, { color: activeTabTextColor }]]}>Find Travelers</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.filterButtons}>
        <ThemedButton
          title={filtersVisible ? 'Hide filters' : 'Filters'}
          variant="secondary"
          onPress={() => setFiltersVisible((v) => !v)}
          disabled={busy}
          style={{ flex: 1, marginRight: 8 }}
        />
        <ThemedButton
          title="Clear"
          variant="secondary"
          onPress={() => {
            setFilterMineOnly(false);
            setFilterFromCountry(undefined);
            setFilterToCountry(undefined);
            setFilterItemType('');
            setFilterStatus('');
          }}
          disabled={busy}
          style={{ width: 110 }}
        />
      </View>

      {filtersVisible && (
        <View style={styles.form}>
          <View style={styles.filterRow}>
            <ThemedButton
              title={filterMineOnly ? 'Mine only: ON' : 'Mine only: OFF'}
              variant="secondary"
              onPress={() => setFilterMineOnly((v) => !v)}
              disabled={busy}
              fullWidth
            />
          </View>
          <CountrySelector
            placeholder="From Country"
            value={filterFromCountry}
            onChange={setFilterFromCountry}
            showDialCode={false}
          />
          <CountrySelector
            placeholder="To Country"
            value={filterToCountry}
            onChange={setFilterToCountry}
            showDialCode={false}
          />
          <ItemTypeSelector
            placeholder={viewMode === 'requests' ? 'Item type' : 'Category'}
            value={filterItemType}
            onChange={setFilterItemType}
          />
          <ThemedInput
            placeholder="Status (e.g. active, pending, matched, completed)"
            value={filterStatus}
            onChangeText={setFilterStatus}
          />
        </View>
      )}

      {viewMode === 'requests' ? (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<ThemedText style={styles.emptyText}>No parcel requests found.</ThemedText>}
        />
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<ThemedText style={styles.emptyText}>No trips found.</ThemedText>}
        />
      )}

      <Modal
        visible={tripModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTripModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>{tripModalTitle}</ThemedText>
            <ThemedText style={styles.modalSubtitle}>Select a trip to match:</ThemedText>
            
            <FlatList
              data={candidateTrips}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.candidateTrip, { backgroundColor: cardBackgroundColor, borderColor }]} 
                  onPress={() => handleConfirmMatch(item.id, selectedRequestForMatching!.id)}
                  disabled={matchingBusy}
                >
                  <ThemedText type="defaultSemiBold">{new Date(item.departureDate).toLocaleDateString()}</ThemedText>
                  <ThemedText>{item.fromCountry} ➡️ {item.toCountry}</ThemedText>
                  <ThemedText>Max: {item.maxWeightKg}kg</ThemedText>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              style={styles.candidateList}
            />
            
            <ThemedButton 
              title="Cancel" 
              variant="secondary" 
              onPress={() => setTripModalVisible(false)} 
              disabled={matchingBusy}
            />
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={requestModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>{requestModalTitle}</ThemedText>
            <ThemedText style={styles.modalSubtitle}>Select a request to match:</ThemedText>
            
            <FlatList
              data={candidateRequests}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.candidateTrip, { backgroundColor: cardBackgroundColor, borderColor }]} 
                  onPress={() => handleConfirmMatch(selectedTripForMatching!.id, item.id)}
                  disabled={matchingBusy}
                >
                  <ThemedText type="defaultSemiBold">{item.itemType} ({item.weightKg}kg)</ThemedText>
                  <ThemedText>{item.fromCountry} ➡️ {item.toCountry}</ThemedText>
                  <ThemedText>{new Date(item.flexibleFromDate).toLocaleDateString()} - {new Date(item.flexibleToDate).toLocaleDateString()}</ThemedText>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              style={styles.candidateList}
            />
            
            <ThemedButton 
              title="Cancel" 
              variant="secondary" 
              onPress={() => setRequestModalVisible(false)} 
              disabled={matchingBusy}
            />
          </ThemedView>
        </View>
      </Modal>

      <RatingModal
        visible={ratingModalVisible}
        onClose={() => {
          setRatingModalVisible(false);
          setSelectedRequestForRating(null);
        }}
        onSubmit={handleRateRequest}
        isLoading={ratingBusy}
      />

      <DisputeModal
        visible={disputeModalVisible}
        onClose={() => {
          setDisputeModalVisible(false);
          setSelectedRequestForDispute(null);
        }}
        onSubmit={handleDisputeRequest}
        isLoading={disputeBusy}
      />

    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    gap: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  form: {
    padding: 16,
    gap: 16,
    borderRadius: 8,
    margin: 16,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  spacer: {
    width: 16,
  },
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    overflow: 'hidden',
  },
  separator: {
    height: 8,
  },
  sectionSpacing: {
    marginTop: 24,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    paddingHorizontal: 16,
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#666',
  },
  cardActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
    padding: 4,
  },
  filterButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filterRow: {
    width: '100%',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  tabText: {
  },
  activeTabText: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  candidateList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  candidateTrip: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
});
