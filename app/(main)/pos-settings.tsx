import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';

const PosSettingsScreen = () => {
  const router = useRouter();

  const handleLogout = () => {
    router.replace('/(main)/tables');
  };

  const navigateToStaff = () => {
    router.push('/(main)/staff');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tile} onPress={navigateToStaff}>
        <Ionicons name="people-outline" size={24} color={Colors.light.tint} />
        <Text style={styles.tileText}>Manage Staff</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  tile: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  tileText: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 15,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PosSettingsScreen;
