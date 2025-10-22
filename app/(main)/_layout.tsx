import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { auth } from '../../firebase';

const MainLayout = () => {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.replace('/(auth)/login'); // Redirect to login after logout
        } catch (error) {
            console.error("Logout Error:", error);
            Alert.alert("Logout Failed", "An error occurred while logging out.");
        }
    };

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
            <Stack.Screen 
                name='kitchen' 
                options={{ headerShown: false }}
            />
            <Stack.Screen name='pending-order' options={{ headerShown: false }} />
        </Stack>
    );
};

export default MainLayout;
