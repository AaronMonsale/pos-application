import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack>
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="user-role" options={{ headerShown: true, headerTitle: 'User & Role' }} />
      <Stack.Screen name="menu" options={{ headerShown: true, headerTitle: 'Menu' }} />
      <Stack.Screen name="reports-analytics" options={{ headerShown: true, headerTitle: 'Reports & Analytics' }} />
      <Stack.Screen name="system-settings" options={{ headerShown: true, headerTitle: 'System Settings' }} />
      <Stack.Screen name="pos" options={{ headerShown: false }} />
      <Stack.Screen name="pos-settings" options={{ headerShown: true, headerTitle: 'POS Settings' }} />
       <Stack.Screen name="tables" options={{ headerShown: true, headerTitle: 'Tables', headerBackVisible: false }} />
      <Stack.Screen name="summary" options={{ headerShown: false }} />
       <Stack.Screen name="staff" options={{ headerShown: true, headerTitle: 'Staff', headerBackVisible: false }} />
    </Stack>
  );
}
