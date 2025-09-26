import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const SystemSettings = () => {
  const router = useRouter();

  const handleLogout = () => {
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.tilesContainer}>
        <TouchableOpacity style={styles.tile}>
          <Ionicons name="cloud-upload-outline" size={50} color={Colors.light.tint} />
          <Text style={styles.tileText}>Sync to Cloud Database</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tile} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={50} color={Colors.light.tint} />
          <Text style={styles.tileText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 80,
    backgroundColor: Colors.light.background,
    justifyContent: 'flex-start',
  },
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  tile: {
    width: '45%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 10,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tileText: {
    marginTop: 10,
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default SystemSettings;
