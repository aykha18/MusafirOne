import React, { useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, FlatList, View } from 'react-native';
import { ThemedInput } from './themed-input';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Ionicons } from '@expo/vector-icons';
import citiesData from '../data/cities.json';
import { useThemeColor } from '@/hooks/use-theme-color';

type City = {
  id: string;
  name: string;
  country: string;
  code: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function CitySelector({ value, onChange, placeholder }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');

  const filteredCities = citiesData.filter((city) =>
    city.name.toLowerCase().includes(search.toLowerCase()) ||
    city.code.toLowerCase().includes(search.toLowerCase()) ||
    city.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (city: City) => {
    onChange(city.name);
    setModalVisible(false);
    setSearch('');
  };

  const handleOpen = () => {
    console.log('CitySelector: handleOpen called');
    setModalVisible(true);
  };

  return (
    <>
      <ThemedInput
        value={value}
        onChangeText={() => {}}
        placeholder={placeholder || 'Select City'}
        onPress={handleOpen}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <ThemedText type="subtitle">Select City</ThemedText>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchContainer}>
            <ThemedInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search city, country or code"
              autoFocus
            />
          </View>

          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => handleSelect(item)}
              >
                <View>
                  <ThemedText type="defaultSemiBold">{item.name} ({item.code})</ThemedText>
                  <ThemedText style={[styles.country, { color: borderColor }]}>{item.country}</ThemedText>
                </View>
                {value === item.name && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: borderColor }]} />}
            keyboardShouldPersistTaps="handled"
          />
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  country: {
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: 1,
    marginLeft: 16,
  },
});
