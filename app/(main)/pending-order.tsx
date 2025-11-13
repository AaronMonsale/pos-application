
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebase';

interface OrderItem {
    food: { name: string; price: number; };
    quantity: number;
    note?: string;
}

// --- Main Component ---
const PendingOrderScreen = () => {
    const router = useRouter();
    const { tableId, tableName } = useLocalSearchParams<{ tableId: string, tableName: string }>();
    
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [orderStatus, setOrderStatus] = useState('pending');
    const [kitchenStatus, setKitchenStatus] = useState('pending');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tableId) {
            Alert.alert("Error", "No table specified.", [{ text: "OK", onPress: () => router.back() }]);
            return;
        }

        const tableDocRef = doc(db, 'tables', tableId);
        const unsubscribe = onSnapshot(tableDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const tableData = docSnap.data();
                setOrderItems(tableData.order || []);
                setOrderStatus(tableData.status || 'serving'); // overall status
                setKitchenStatus(tableData.kitchenStatus || 'pending'); // kitchen-specific status

                if (tableData.status === 'available') {
                    router.replace('/(main)/tables');
                }
            } else {
                Alert.alert("Error", "Table not found.", [{ text: "OK", onPress: () => router.back() }]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Failed to fetch pending order:", error);
            Alert.alert("Error", "Could not load the order.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tableId]);

    const handleMarkAsServed = async () => {
        if (orderStatus !== 'order_ready') {
            Alert.alert("Not Ready", "The order is not yet marked as ready by the kitchen.");
            return;
        }

        try {
            const tableDocRef = doc(db, 'tables', tableId);
            await updateDoc(tableDocRef, {
                status: 'available', 
                occupied: false,
                occupiedBy: null,
                staffId: null,
                order: [],
                kitchenStatus: null
            });
            Alert.alert("Table Cleared", "The table is now available.", [
                { text: "OK", onPress: () => router.replace('/(main)/tables') }
            ]);
        } catch (error) {
            console.error("Error marking as served: ", error);
            Alert.alert("Error", "Failed to clear the table.");
        }
    };

    const getStatusInfo = () => {
        if (orderStatus === 'order_ready') {
            return { text: 'Ready for Pickup', color: '#28a745', icon: 'checkmark-circle-outline' };
        }
        if (kitchenStatus === 'in_progress') {
            return { text: 'In Progress', color: '#17a2b8', icon: 'hourglass-outline' };
        }
        return { text: 'Pending in Kitchen', color: '#ffc107', icon: 'time-outline' };
    };
    
    const statusInfo = getStatusInfo();

    const renderOrderItem = ({ item }: { item: OrderItem }) => (
        <View style={styles.itemCard}>
            <Text style={styles.itemQuantity}>{item.quantity}x</Text>
            <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.food.name}</Text>
                {item.note && <Text style={styles.itemNote}>Note: {item.note}</Text>}
            </View>
        </View>
    );

    if (loading) {
        return <ActivityIndicator size="large" style={styles.loader} />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order for {tableName}</Text>
            </View>

            <View style={styles.statusContainer}>
                <Ionicons name={statusInfo.icon as any} size={30} color={statusInfo.color} />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
            </View>

            <FlatList
                data={orderItems}
                renderItem={renderOrderItem}
                keyExtractor={(item, index) => `${item.food.name}-${index}`}
                ListEmptyComponent={<Text style={styles.emptyText}>No pending items for this table.</Text>}
                contentContainerStyle={styles.listContainer}
            />

            <TouchableOpacity 
                style={[styles.serveButton, orderStatus !== 'order_ready' && styles.disabledButton]}
                onPress={handleMarkAsServed}
                disabled={orderStatus !== 'order_ready'}
            >
                <Ionicons name="restaurant-outline" size={24} color="white" />
                <Text style={styles.serveButtonText}>Mark as Served & Clear Table</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#343a40', 
        padding: 15,
        paddingTop: 50, 
    },
    backButton: { position: 'absolute', top: 45, left: 15, zIndex: 1 },
    headerTitle: { 
        fontSize: 24, 
        fontWeight: 'bold', 
        color: '#FFF', 
        textAlign: 'center',
        flex: 1,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#FFF',
        margin: 15,
        borderRadius: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statusText: { fontSize: 22, fontWeight: 'bold', marginLeft: 10 },
    listContainer: { paddingHorizontal: 15, paddingBottom: 15 },
    itemCard: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        elevation: 2,
    },
    itemQuantity: { fontSize: 20, fontWeight: 'bold', color: '#fd7e14', marginRight: 15 },
    itemDetails: { flex: 1 },
    itemName: { fontSize: 18, fontWeight: '600', color: '#343a40' },
    itemNote: { fontSize: 14, color: '#6c757d', fontStyle: 'italic', marginTop: 4 },
    serveButton: {
        backgroundColor: '#28a745',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', 
        padding: 18,
        margin: 15,
        borderRadius: 12,
        elevation: 3,
    },
    serveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    disabledButton: { backgroundColor: '#a9a9a9' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
    emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#6c757d' },
});

export default PendingOrderScreen;
