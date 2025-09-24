
import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="orders" options={{ headerShown: false }} />
    </Stack>
  );
}
