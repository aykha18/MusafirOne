import React, { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { ThemedButton } from './themed-button';
import { ThemedInput } from './themed-input';
import { useThemeColor } from '@/hooks/use-theme-color';

interface DisputeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function DisputeModal({ visible, onClose, onSubmit, isLoading }: DisputeModalProps) {
  const [reason, setReason] = useState('');
  const backgroundColor = useThemeColor({}, 'background');

  const handleSubmit = () => {
    if (isLoading || !reason.trim()) return;
    onSubmit(reason);
    setReason('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ThemedView style={[styles.modalContent, { backgroundColor }]}>
          <ThemedText type="title" style={styles.title}>Report Dispute</ThemedText>
          
          <ThemedText style={styles.description}>
            Please describe the issue in detail. This will be reviewed by our support team.
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={styles.label}>Reason</ThemedText>
          <ThemedInput 
            value={reason} 
            onChangeText={setReason} 
            placeholder="Describe what went wrong..."
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          <View style={styles.actions}>
            <ThemedButton 
              title="Cancel" 
              variant="secondary" 
              onPress={() => {
                setReason('');
                onClose();
              }} 
              disabled={isLoading} 
              style={{ flex: 1 }} 
            />
            <View style={{ width: 16 }} />
            <ThemedButton 
              title="Submit Report" 
              onPress={handleSubmit} 
              disabled={isLoading || !reason.trim()} 
              style={{ flex: 1 }} 
              variant="danger"
            />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.7,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
