
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface OrderItem {
    food: {
        name: string;
        price: number;
    };
    quantity: number;
    note: string;
}

interface KitchenOrder {
    id: string;
    table: string;
    items: OrderItem[];
    createdAt: any;
}

const KitchenScreen = () => {
    const [orders, setOrders] = useState<KitchenOrder[]>([]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'kitchenOrders'), (snapshot) => {
            const kitchenOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as KitchenOrder));
            setOrders(kitchenOrders);
        });

        return () => unsubscribe();
    }, []);

    const handleCompleteOrder = async (orderId: string) => {
        try {
            await deleteDoc(doc(db, 'kitchenOrders', orderId));
            Alert.alert('Order Completed', 'The order has been marked as completed.');
        } catch (error) {
            console.error('Error completing order: ', error);
            Alert.alert('Error', 'Could not complete the order.');
        }
    };

    const renderItem = ({ item }: { item: KitchenOrder }) => (
        <View style={styles.card}>
            <Text style={styles.table}>Table: {item.table}</Text>
            {item.items.map((orderItem, index) => (
                <View key={index} style={styles.item}>
                    <Text style={styles.quantity}>{orderItem.quantity}x</Text>
                    <View>
                        <Text style={styles.foodName}>{orderItem.food.name}</Text>
                        {orderItem.note ? <Text style={styles.note}>Note: {orderItem.note}</Text> : null}
                    </View>
                </View>
            ))}
            <TouchableOpacity style={styles.completeButton} onPress={() => handleCompleteOrder(item.id)}>
                <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Pending Orders</Text>
            <FlatList
                data={orders}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    list: {
        paddingBottom: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    table: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    item: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    quantity: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
    foodName: {
        fontSize: 16,
    },
    note: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#666',
    },
    completeButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    completeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default KitchenScreen;
