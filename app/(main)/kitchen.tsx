
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db, auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

interface OrderItem {
    food: { name: string; price: number; };
    quantity: number;
    note?: string;
}

interface TableOrder {
    id: string; // Document ID from Firestore
    name: string;
    order: OrderItem[];
    orderPlacedAt: Timestamp; // Timestamp for sorting
}

const KitchenScreen = () => {
    const [activeOrders, setActiveOrders] = useState<TableOrder[]>([]);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        // Query for tables that are occupied and have a pending order
        const q = query(collection(db, 'tables'), where('status', '==', 'serving'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders: TableOrder[] = snapshot.docs
                .filter(doc => doc.data().order && doc.data().order.length > 0) // Ensure there is an order
                .map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    order: doc.data().order,
                    orderPlacedAt: doc.data().orderPlacedAt || Timestamp.now() // Use timestamp if available
                }))
                .sort((a, b) => a.orderPlacedAt.toMillis() - b.orderPlacedAt.toMillis()); // Sort by oldest first

            setActiveOrders(orders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching kitchen orders: ", error);
            setLoading(false);
            Alert.alert("Error", "Could not load kitchen orders.");
        });

        return () => unsubscribe();
    }, []);

    const handleOrderPrepared = async (tableId: string) => {
        const tableRef = doc(db, 'tables', tableId);
        try {
            // Mark the order as prepared. This changes the table's status from 'serving' to 'order_ready'.
            // This will automatically remove it from the kitchen screen on the next snapshot.
            await updateDoc(tableRef, {
                status: 'order_ready', // New status to indicate food is ready for pickup
            });
            Alert.alert('Order Prepared', `The order for the table is ready to be served.`);
        } catch (error) {
            console.error("Error updating order status: ", error);
            Alert.alert("Error", "Failed to mark order as prepared.");
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" style={styles.loader} />;
    }

    const renderOrderCard = ({ item }: { item: TableOrder }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                 <Text style={styles.tableName}>Table: {item.name}</Text>
                 <Text style={styles.timestamp}>{item.orderPlacedAt.toDate().toLocaleTimeString()}</Text>
            </View>
           
            <View style={styles.itemList}>
                {item.order.map((orderItem, index) => (
                    <View key={index} style={styles.itemContainer}>
                        <Text style={styles.quantity}>{orderItem.quantity}x</Text>
                        <View style={styles.itemDetails}>
                            <Text style={styles.foodName}>{orderItem.food.name}</Text>
                            {orderItem.note && <Text style={styles.note}>Note: {orderItem.note}</Text>}
                        </View>
                    </View>
                ))}
            </View>
            <TouchableOpacity style={styles.doneButton} onPress={() => handleOrderPrepared(item.id)}>
                <Ionicons name="checkmark-done-outline" size={24} color="white" />
                <Text style={styles.doneButtonText}>Mark as Prepared</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ionicons name="flame-outline" size={32} color="#FFF" />
                    <Text style={styles.title}>Kitchen Order Queue</Text>
                </View>
                <TouchableOpacity onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={32} color="#FFF" />
                </TouchableOpacity>
            </View>
            {activeOrders.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No Pending Orders</Text>
                </View>
            ) : (
                <FlatList
                    data={activeOrders}
                    renderItem={renderOrderCard}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#343a40' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#23272b', paddingTop: 50 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginLeft: 10 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#343a40' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 18, color: '#adb5bd' },
    listContainer: { padding: 16 },
    card: { backgroundColor: '#495057', borderRadius: 12, marginBottom: 20, overflow: 'hidden', elevation: 5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fd7e14', padding: 15 },
    tableName: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    timestamp: { fontSize: 14, color: 'white', alignSelf: 'center' },
    itemList: { padding: 15 },
    itemContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#5a6268', paddingVertical: 12 },
    quantity: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginRight: 15, width: 40 },
    itemDetails: { flex: 1 },
    foodName: { fontSize: 18, fontWeight: '500', color: '#e9ecef' },
    note: { fontSize: 15, fontStyle: 'italic', color: '#ffc107', marginTop: 5 },
    doneButton: { flexDirection: 'row', backgroundColor: '#28a745', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, marginTop: 10 },
    doneButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
});

export default KitchenScreen;
