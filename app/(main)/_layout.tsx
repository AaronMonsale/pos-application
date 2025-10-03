import { Stack } from 'expo-router';
import React from 'react';

const MainLayout = () => {
    return (
        <Stack>
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="pos" options={{ headerShown: false }} />
            <Stack.Screen name="tables" />
            <Stack.Screen name="menu" options={{ headerShown: false }} />
            <Stack.Screen name="transactions" options={{ headerShown: false }} />
            <Stack.Screen name="summary" options={{ headerShown: false }} />
            <Stack.Screen name="staff" options={{ headerShown: false }} />
            <Stack.Screen name="reports-analytics" options={{ headerShown: false }} />
            <Stack.Screen name="system-settings" options={{ headerShown: false }} />
            <Stack.Screen name="pos-settings" options={{ headerShown: false }} />
            <Stack.Screen name="discount" options={{ headerShown: false }} />
            <Stack.Screen name="user-role" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack>
    );
};

export default MainLayout;
