import { Stack } from 'expo-router';
import React from 'react';

const MainLayout = () => {
    return (
        <Stack>
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="pos" options={{ headerShown: false }} />
            <Stack.Screen name="tables" />
            <Stack.Screen name="menu" options={{ title: "Menu" }} />
            <Stack.Screen name="transactions" options={{ title: "Transactions" }} />
            <Stack.Screen name="summary" options={{ headerShown: false }} />
            <Stack.Screen name="staff" options={{ title: "Manage Staff" }} />
            <Stack.Screen name="reports-analytics" options={{ title: "Reports & Analytics" }} />
            <Stack.Screen name="system-settings" options={{ title: "System Settings" }} />
            <Stack.Screen name="pos-settings" options={{ headerShown: false }} />
            <Stack.Screen name="discount" options={{ title: "Discount" }} />
            <Stack.Screen name="user-role" options={{ title: "User Roles" }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name='kitchen' options={{ title: "Kitchen" }} />
        </Stack>
    );
};

export default MainLayout;
