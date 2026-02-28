import React, { useState } from 'react';
import { Platform, TouchableOpacity, View, StyleSheet, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ThemedInput } from './themed-input';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type Props = {
  value: Date | string | undefined;
  onChange: (date: Date) => void;
  placeholder?: string;
  mode?: 'date' | 'time';
  minimumDate?: Date;
};

export function DateTimePickerInput({ value, onChange, placeholder, mode = 'date', minimumDate }: Props) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(undefined);

  const dateValue = typeof value === 'string' ? (value ? new Date(value) : undefined) : value;
  
  const displayValue = dateValue 
    ? (mode === 'time' 
        ? dateValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : dateValue.toLocaleDateString())
    : '';

  const handleOpen = () => {
    console.log('DateTimePickerInput: handleOpen called');
    setTempDate(dateValue || new Date());
    setShow(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selectedDate) {
        onChange(selectedDate);
      }
    } else if (Platform.OS === 'web') {
      // On web, we don't auto-close, let user pick
      if (selectedDate) {
        onChange(selectedDate);
      }
    } else {
      // iOS: update temp date but don't close
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleDone = () => {
    if (tempDate) {
      onChange(tempDate);
    }
    setShow(false);
  };

  return (
    <View>
      <ThemedInput
        value={displayValue}
        onChangeText={() => {}}
        placeholder={placeholder}
        onPress={handleOpen}
      />
      
      {(Platform.OS === 'android') && show && (
        <DateTimePicker
          value={dateValue || new Date()}
          mode={mode}
          is24Hour={true}
          onChange={handleChange}
          minimumDate={minimumDate}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          transparent={true}
          visible={show}
          animationType="slide"
          onRequestClose={() => setShow(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={styles.modalContent}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <ThemedText style={styles.headerBtn}>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold">{placeholder || (mode === 'time' ? 'Select Time' : 'Select Date')}</ThemedText>
                <TouchableOpacity onPress={handleDone}>
                  <ThemedText style={[styles.headerBtn, styles.confirmBtn]}>Done</ThemedText>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempDate || new Date()}
                  mode={mode}
                  is24Hour={true}
                  onChange={handleChange}
                  minimumDate={minimumDate}
                  display="spinner"
                  themeVariant="light"
                  style={{ height: 200, width: '100%' }} 
                />
              </View>
            </ThemedView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerBtn: {
    fontSize: 16,
    color: '#007AFF',
  },
  confirmBtn: {
    fontWeight: '600',
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
});
