import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Colors } from "../../constants/theme";

const modules = [
  { name: "User & Role", icon: "people-outline" as const, route: "/(main)/user-role" },
  { name: "Menu", icon: "restaurant-outline" as const, route: "/(main)/menu" },
  { name: "Transactions", icon: "cash-outline" as const, route: "/(main)/transactions" },
  { name: "Reports & Analytics", icon: "stats-chart-outline" as const, route: "/(main)/reports-analytics" },
  { name: "System Settings", icon: "settings-outline" as const, route: "/(main)/system-settings" },
  { name: "Discount", icon: "pricetag-outline" as const, route: "/(main)/discount" },
];

const AdminDashboard = () => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const Container = isLandscape ? ScrollView : View;

  return (
    <Container style={isLandscape ? styles.scrollContainer : styles.container} contentContainerStyle={isLandscape ? {alignItems: 'center'} : {}}>
      <Image source={require('../../assets/images/onecore_consultancy_inc_logo.jpg')} style={styles.logo} />
      <Text style={styles.headerText}>ADMIN DASHBOARD</Text>
      <View style={styles.tilesContainer}>
        {modules.map((module) => (
          <TouchableOpacity key={module.name} style={styles.tile} onPress={() => router.push(module.route as any)}>
            <Ionicons name={module.icon} size={64} color={Colors.light.tint} />
            <Text style={styles.tileText}>{module.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  logo: {
    width: 250,
    height: 120,
    resizeMode: 'contain', 
  },
  headerText: {
    color: Colors.light.tint,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10, 
  },
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  tile: {
    width: '45%', // 2 columns
    aspectRatio: 1, // make it a square
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

export default AdminDashboard;
