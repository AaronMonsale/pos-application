
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack initialRouteName="(auth)">
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
    </Stack>
  );
}
