import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { createContext, useContext, useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';

// --- Staff Context for Global State ---

interface Staff {
    id: number;
    name: string;
    pin: string;
}

interface StaffContextType {
    currentStaff: Staff | null;
    setCurrentStaff: (staff: Staff | null) => void;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export const useStaff = () => {
    const context = useContext(StaffContext);
    if (!context) {
        throw new Error('useStaff must be used within a StaffProvider');
    }
    return context;
};

const StaffProvider = ({ children }: { children: React.ReactNode }) => {
    const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
    
    return (
        <StaffContext.Provider value={{ currentStaff, setCurrentStaff }}>
            {children}
        </StaffContext.Provider>
    );
};

// --- Main Layout Component ---

const MainLayout = () => {
    const router = useRouter();

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
                options={{ 
                    headerShown: false 
                }}
            />
            <Stack.Screen name='pending-order' options={{ headerShown: false }} />
        </Stack>
    );
};

// --- Root Layout with Provider ---

const RootLayout = () => {
    return (
        <StaffProvider>
            <MainLayout />
        </StaffProvider>
    );
}

export default RootLayout;
