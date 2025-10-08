import { Ionicons } from '@expo/vector-icons';
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Colors } from "../../constants/theme";

// Updated the modules to include the new functions
const modules = [
  // Replaced "User & Role" with "Manage Staff"
  { name: "Manage Staff", icon: "people-outline" as const, route: "/(main)/staff" },
  // Added "User Management"
  { name: "User Management", icon: "person-circle-outline" as const, route: "/(main)/user-management" },
  // Added "Manage Tables"
  { name: "Manage Tables", icon: "grid-outline" as const, route: { pathname: '/(main)/tables', params: { admin: 'true' } } },
  { name: "Menu", icon: "restaurant-outline" as const, route: "/(main)/menu" },
  { name: "Transactions", icon: "cash-outline" as const, route: "/(main)/transactions" },
  { name: "Reports & Analytics", icon: "stats-chart-outline" as const, route: "/(main)/reports-analytics" },
  { name: "Discount", icon: "pricetag-outline" as const, route: "/(main)/discount" },
  { name: "System Settings", icon: "settings-outline" as const, route: "/(main)/system-settings" },
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
            <Ionicons name={module.icon} size={48} color={Colors.light.tint} />
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
    marginTop: 20,
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
    width: '45%', // Keep 2 columns as per the image
    aspectRatio: 1,
    backgroundColor: 'white', // Changed to white
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
    shadowOpacity: 0.1, // Softer shadow
    shadowRadius: 3.84,
    elevation: 3, // Lower elevation for a flatter look
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
