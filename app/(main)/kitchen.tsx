
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db, auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

interface OrderItem {
    food: { name: string; price: number; };
    quantity: number;
    note?: string;
}

interface TableOrder {
    id: string; 
    name: string;
    order: OrderItem[];
    orderPlacedAt: Timestamp;
    kitchenStatus: 'pending' | 'in_progress'; 
}

const KitchenScreen = () => {
    const [activeOrders, setActiveOrders] = useState<TableOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.replace('/(auth)/login');
        } catch (error) {
            console.error("Logout Error:", error);
            Alert.alert("Logout Failed", "An error occurred while logging out.");
        }
    };

    useEffect(() => {
        const q = query(collection(db, 'tables'), where('status', '==', 'serving'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders: TableOrder[] = snapshot.docs
                .filter(doc => doc.data().order && doc.data().order.length > 0)
                .map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    order: doc.data().order,
                    orderPlacedAt: doc.data().orderPlacedAt || Timestamp.now(),
                    kitchenStatus: doc.data().kitchenStatus || 'pending'
                }))
                .sort((a, b) => a.orderPlacedAt.toMillis() - b.orderPlacedAt.toMillis());

            setActiveOrders(orders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching kitchen orders: ", error);
            setLoading(false);
            Alert.alert("Error", "Could not load kitchen orders.");
        });

        return () => unsubscribe();
    }, []);

    const handleAcceptOrder = async (tableId: string) => {
        const tableRef = doc(db, 'tables', tableId);
        try {
            await updateDoc(tableRef, { kitchenStatus: 'in_progress' });
        } catch (error) {
            console.error("Error accepting order: ", error);
            Alert.alert("Error", "Failed to accept the order.");
        }
    };
    
    const handleOrderPrepared = async (tableId: string) => {
        const tableRef = doc(db, 'tables', tableId);
        try {
            await updateDoc(tableRef, { status: 'order_ready' });
            Alert.alert('Order Prepared', 'The order is ready to be served.');
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
                <View style={[styles.statusBadge, item.kitchenStatus === 'pending' ? styles.pendingBadge : styles.inProgressBadge]}>
                    <Text style={styles.statusText}>{item.kitchenStatus === 'pending' ? 'Pending' : 'In Progress'}</Text>
                </View>
            </View>
            <Text style={styles.timestamp}>Order Placed at {item.orderPlacedAt.toDate().toLocaleTimeString()}</Text>

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

            {item.kitchenStatus === 'pending' ? (
                <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={() => handleAcceptOrder(item.id)}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                    <Text style={styles.buttonText}>Accept Order</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={[styles.button, styles.doneButton]} onPress={() => handleOrderPrepared(item.id)}>
                    <Ionicons name="checkmark-done-outline" size={24} color="white" />
                    <Text style={styles.buttonText}>Mark as Prepared</Text>
                </TouchableOpacity>
            )}
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#343a40', padding: 15 },
    tableName: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    timestamp: { fontSize: 14, color: '#adb5bd', paddingHorizontal: 15, paddingBottom: 10 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
    pendingBadge: { backgroundColor: '#ffc107' },
    inProgressBadge: { backgroundColor: '#17a2b8' },
    statusText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    itemList: { paddingHorizontal: 15, paddingBottom: 10 },
    itemContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#5a6268', paddingVertical: 12 },
    quantity: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginRight: 15, width: 40 },
    itemDetails: { flex: 1 },
    foodName: { fontSize: 18, fontWeight: '500', color: '#e9ecef' },
    note: { fontSize: 15, fontStyle: 'italic', color: '#ffc107', marginTop: 5 },
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    acceptButton: { backgroundColor: '#28a745' },
    doneButton: { backgroundColor: '#007bff' },
});

export default KitchenScreen;
