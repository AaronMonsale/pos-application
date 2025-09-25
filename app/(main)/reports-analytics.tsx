import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { Colors } from '../../constants/theme';

const ReportsAnalytics = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reports & Analytics</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.tint,
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default ReportsAnalytics;
