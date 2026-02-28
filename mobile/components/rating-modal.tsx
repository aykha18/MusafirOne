import React, { useState } from 'react';
import { Modal, StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { ThemedButton } from './themed-button';
import { ThemedInput } from './themed-input';
import { useThemeColor } from '@/hooks/use-theme-color';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: RatingData) => Promise<void>;
  isLoading?: boolean;
}

export interface RatingData {
  reliabilityScore: number;
  communicationScore: number;
  timelinessScore: number;
  comment: string;
}

export function RatingModal({ visible, onClose, onSubmit, isLoading }: RatingModalProps) {
  const [reliability, setReliability] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [timeliness, setTimeliness] = useState(5);
  const [comment, setComment] = useState('');

  const backgroundColor = useThemeColor({}, 'background');

  const handleSubmit = async () => {
    if (isLoading) return;
    try {
      await onSubmit({
        reliabilityScore: reliability,
        communicationScore: communication,
        timelinessScore: timeliness,
        comment,
      });
      // Reset form
      setReliability(5);
      setCommunication(5);
      setTimeliness(5);
      setComment('');
    } catch (e) {
      // Error handled by parent
    }
  };

  const renderStars = (score: number, setScore: (s: number) => void) => {
    return (
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setScore(star)}>
            <ThemedText style={[styles.star, { opacity: star <= score ? 1 : 0.3 }]}>
              ⭐
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ThemedView style={[styles.modalContent, { backgroundColor }]}>
          <ThemedText type="title" style={styles.title}>Rate Experience</ThemedText>
          
          <ThemedText type="defaultSemiBold">Reliability</ThemedText>
          {renderStars(reliability, setReliability)}

          <ThemedText type="defaultSemiBold">Communication</ThemedText>
          {renderStars(communication, setCommunication)}

          <ThemedText type="defaultSemiBold">Timeliness</ThemedText>
          {renderStars(timeliness, setTimeliness)}

          <ThemedText type="defaultSemiBold">Comment (Optional)</ThemedText>
          <ThemedInput 
            value={comment} 
            onChangeText={setComment} 
            placeholder="Share your experience..."
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: 'top' }}
          />

          <View style={styles.actions}>
            <ThemedButton title="Cancel" variant="secondary" onPress={onClose} disabled={isLoading} style={{ flex: 1 }} />
            <View style={{ width: 16 }} />
            <ThemedButton title="Submit" onPress={handleSubmit} disabled={isLoading} style={{ flex: 1 }} />
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    gap: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  star: {
    fontSize: 24,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
