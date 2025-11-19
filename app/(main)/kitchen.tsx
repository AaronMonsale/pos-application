
import { Ionicons } from '@expo/vector-icons';
import { PrismaClient, Table, Order, OrderItem, Food } from '@prisma/client';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const prisma = new PrismaClient();

interface KitchenOrderItem extends OrderItem {
    food: Food;
}

interface KitchenOrder extends Order {
    items: KitchenOrderItem[];
}

interface KitchenTable extends Table {
    order: KitchenOrder | null;
}

const KitchenScreen = () => {
    const [activeOrders, setActiveOrders] = useState<KitchenTable[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const handleLogout = async () => {
        router.replace('/(auth)/login');
    };

    const fetchOrders = async () => {
        try {
            const orders = await prisma.table.findMany({
                where: { 
                    status: 'serving',
                    order: { isNot: null },
                },
                include: {
                    order: {
                        include: {
                            items: {
                                include: {
                                    food: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    order: {
                        orderPlacedAt: 'asc',
                    },
                },
            });
            setActiveOrders(orders.filter(o => o.order) as KitchenTable[]);
        } catch (error) {
            console.error("Error fetching kitchen orders: ", error);
            Alert.alert("Error", "Could not load kitchen orders.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const handleAcceptOrder = async (tableId: number) => {
        try {
            await prisma.table.update({ where: { id: tableId }, data: { kitchenStatus: 'in_progress' } });
            fetchOrders();
        } catch (error) {
            console.error("Error accepting order: ", error);
            Alert.alert("Error", "Failed to accept the order.");
        }
    };
    
    const handleOrderPrepared = async (tableId: number) => {
        try {
            await prisma.table.update({ where: { id: tableId }, data: { status: 'order_ready' } });
            Alert.alert('Order Prepared', 'The order is ready to be served.');
            fetchOrders();
        } catch (error) {
            console.error("Error updating order status: ", error);
            Alert.alert("Error", "Failed to mark order as prepared.");
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" style={styles.loader} />;
    }

    const renderOrderCard = ({ item }: { item: KitchenTable }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.tableName}>Table: {item.name}</Text>
                <View style={[styles.statusBadge, item.kitchenStatus === 'pending' ? styles.pendingBadge : styles.inProgressBadge]}>
                    <Text style={styles.statusText}>{item.kitchenStatus === 'pending' ? 'Pending' : 'In Progress'}</Text>
                </View>
            </View>
            <Text style={styles.timestamp}>Order Placed at {item.order?.orderPlacedAt?.toLocaleTimeString()}</Text>

            <View style={styles.itemList}>
                {item.order?.items.map((orderItem, index) => (
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
                    keyExtractor={item => item.id.toString()}
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
