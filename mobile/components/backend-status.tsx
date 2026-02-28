import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { apiClient } from '@/api/client';

export function BackendStatus({ onConnected }: { onConnected: () => void }) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('');

  const checkConnection = async () => {
    setStatus('checking');
    try {
      console.log('BackendStatus: Checking connection...');
      const isHealthy = await apiClient.healthCheck();
      console.log('BackendStatus: Result', isHealthy);
      if (isHealthy) {
        setStatus('connected');
        onConnected();
      } else {
        setStatus('error');
        const url = apiClient.getBaseUrl();
        setMessage(`Could not connect to backend at ${url}. Please ensure the server is running and your device is on the same network.\n\nDebug Info:\nURL: ${url}`);
      }
    } catch (e) {
      console.error('BackendStatus: Error', e);
      setStatus('error');
      setMessage(`Connection error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  if (status === 'connected') {
    return null; // Or a small success toast? Ideally nothing if blocking.
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Backend Connection</Text>
      {status === 'checking' ? (
        <ActivityIndicator size="large" color="#0a7ea4" />
      ) : (
        <>
          <Text style={styles.error}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={checkConnection}>
            <Text style={styles.buttonText}>Retry Connection</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  error: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
