
import { View, Text, Button } from "react-native";
import React from "react";
import { auth } from "../../firebase";
import { useRouter } from "expo-router";

const Orders = () => {
  const router = useRouter();

  const handleLogout = () => {
    auth.signOut();
    router.replace("/(auth)/login");
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Order Management</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

export default Orders;
