
import { View, Text, Button } from "react-native";
import React from "react";
import { useRouter } from "expo-router";

const Dashboard = () => {
  const router = useRouter();

  const handleLogout = () => {
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Admin Dashboard</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

export default Dashboard;
