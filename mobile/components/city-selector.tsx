import React, { useMemo, useState } from 'react';
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
  currency: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelectCity?: (city: City) => void;
  placeholder?: string;
};

export function CitySelector({ value, onChange, onSelectCity, placeholder }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCities = useMemo(
    () =>
      citiesData.filter((city) =>
        !normalizedSearch ||
        city.name.toLowerCase().includes(normalizedSearch) ||
        city.code.toLowerCase().includes(normalizedSearch) ||
        city.country.toLowerCase().includes(normalizedSearch) ||
        (city.currency && city.currency.toLowerCase().includes(normalizedSearch)),
      ),
    [normalizedSearch],
  );

  const showManualSelection = !!normalizedSearch;
  const hasExactAirportCityMatch = filteredCities.some(
    (city) => city.name.trim().toLowerCase() === normalizedSearch,
  );

  const handleSelect = (city: City) => {
    onChange(city.name);
    if (onSelectCity) {
      onSelectCity(city);
    }
    setModalVisible(false);
    setSearch('');
  };

  const handleManualSelect = () => {
    const manualCity = search.trim();
    if (!manualCity) {
      return;
    }
    onChange(manualCity);
    setModalVisible(false);
    setSearch('');
  };

  const handleOpen = () => {
    setSearch(value.trim());
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
              placeholder="Search or enter city"
              autoFocus
            />
          </View>

          {showManualSelection ? (
            <TouchableOpacity
              style={[styles.manualItem, { borderColor, backgroundColor }]}
              onPress={handleManualSelect}
            >
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">
                  Use "{search.trim()}"
                </ThemedText>
                <ThemedText style={[styles.country, { color: borderColor }]}>
                  Search with a custom city not present in the airport list
                </ThemedText>
              </View>
              {!hasExactAirportCityMatch ? (
                <Ionicons name="create-outline" size={20} color={textColor} />
              ) : null}
            </TouchableOpacity>
          ) : null}

          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => handleSelect(item)}
              >
                <View>
                <ThemedText type="defaultSemiBold">{item.name} ({item.code}) - {item.currency}</ThemedText>
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
  manualItem: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
