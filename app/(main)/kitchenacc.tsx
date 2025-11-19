
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { PrismaClient } from '@prisma/client';
import { Colors } from '../../constants/theme';

const prisma = new PrismaClient();

interface KitchenUser {
    id: number;
    email: string;
}

const KitchenAccountsScreen = () => {
    const [kitchenUsers, setKitchenUsers] = useState<KitchenUser[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchKitchenUsers = async () => {
            try {
                const users = await prisma.user.findMany({
                    where: { role: "KITCHEN" },
                });
                setKitchenUsers(users);
            } catch (error) {
                console.error("Error fetching kitchen accounts: ", error);
                Alert.alert("Error", "Could not load kitchen accounts.");
            } finally {
                setLoading(false);
            }
        };

        fetchKitchenUsers();
    }, []);

    const handleDelete = (user: KitchenUser) => {
        Alert.alert(
            "Delete Kitchen User",
            `Are you sure you want to delete ${user.email}? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await prisma.user.delete({ where: { id: user.id } });
                            setKitchenUsers(kitchenUsers.filter(u => u.id !== user.id));
                            Alert.alert("User Deleted", `The account for ${user.email} has been deleted.`);
                        } catch (error) {
                            console.error("Error deleting user: ", error);
                            Alert.alert("Error", "Failed to delete the user account.");
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return <ActivityIndicator size="large" style={styles.loader} />;
    }

    const renderItem = ({ item }: { item: KitchenUser }) => (
        <View style={styles.userItem}>
            <View>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userRole}>Kitchen Staff</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)}>
                <Ionicons name="trash-bin-outline" size={24} color={Colors.light.danger} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={kitchenUsers}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={kitchenUsers.length === 0 ? styles.emptyContainer : styles.listContainer}
                ListEmptyComponent={() => (
                    <Text style={styles.emptyText}>No kitchen accounts found.</Text>
                )}
            />
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/(main)/create-kitchen-account')}
            >
                <Ionicons name="add-outline" size={32} color="white" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6c757d',
    },
    userItem: {
        backgroundColor: 'white',
        padding: 16,
        marginVertical: 8,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    userEmail: {
        fontSize: 16,
        fontWeight: '600',
    },
    userRole: {
        fontSize: 14,
        color: 'gray',
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        right: 20,
        bottom: 20,
        backgroundColor: Colors.light.tint,
        borderRadius: 30,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});

export default KitchenAccountsScreen;
