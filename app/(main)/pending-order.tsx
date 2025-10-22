
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../firebase';

interface OrderItem {
    food: {
        name: string;
        price: number; // Keep price for context, but won't show in total
    };
    quantity: number;
    note?: string;
    discount?: number;
}

const PendingOrderScreen = () => {
    const router = useRouter();
    const { tableId, tableName } = useLocalSearchParams<{ tableId: string, tableName: string }>();
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
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
                // Set the order items from the table document
                setOrderItems(tableData.order || []);
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

    const handleBackToTables = () => {
        router.back();
    };

    if (loading) {
        return <ActivityIndicator size="large" style={styles.loader} />;
    }

    const renderOrderItem = ({ item }: { item: OrderItem }) => (
        <View style={styles.itemContainer}>
            <Text style={styles.quantity}>{item.quantity}x</Text>
            <View style={styles.itemDetails}>
                <Text style={styles.foodName}>{item.food.name}</Text>
                {item.note ? <Text style={styles.note}>Note: {item.note}</Text> : null}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackToTables} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                    <Text style={styles.backButtonText}>Back to Tables</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Order for {tableName}</Text>
            </View>
            <Text style={styles.subHeader}>Sent to Kitchen</Text>
            <FlatList
                data={orderItems}
                renderItem={renderOrderItem}
                keyExtractor={(item, index) => `${item.food.name}-${index}`}
                ListEmptyComponent={<Text style={styles.emptyText}>No pending items for this table.</Text>}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f9f9f9' 
    },
    header: { 
        backgroundColor: '#343a40', 
        paddingVertical: 20,
        paddingHorizontal: 15,
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        elevation: 3, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 2
    },
    backButton: { 
        position: 'absolute', 
        left: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        marginLeft: 8,
    },
    title: { 
        fontSize: 22,
        fontWeight: 'bold', 
        color: 'white' 
    },
    subHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: '#495057',
        textAlign: 'center',
        paddingVertical: 15,
        backgroundColor: '#e9ecef'
    },
    loader: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    list: { 
        padding: 16 
    },
    itemContainer: { 
        backgroundColor: 'white', 
        padding: 20,
        borderRadius: 8, 
        marginBottom: 15, 
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderLeftWidth: 5,
        borderLeftColor: '#fd7e14', // An accent color for the ticket
        elevation: 2, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 1 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 2 
    },
    quantity: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: '#000', 
        marginRight: 15,
        minWidth: 40, // Ensure alignment
    },
    itemDetails: { 
        flex: 1 
    },
    foodName: { 
        fontSize: 20, 
        fontWeight: '600', 
        color: '#343a40' 
    },
    note: { 
        fontSize: 16, 
        fontStyle: 'italic', 
        color: '#d9534f', // Red color to draw attention to notes
        marginTop: 8,
        padding: 8,
        backgroundColor: '#fcf8e3',
        borderRadius: 4,
        overflow: 'hidden' // Ensures the background color respects the border radius
    },
    emptyText: { 
        textAlign: 'center', 
        marginTop: 50, 
        fontSize: 16, 
        color: '#6c757d' 
    },
});

export default PendingOrderScreen;
