import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

interface Item {
    id: string;
    name: string;
    price: number;
    quantity: number;
    discount: number;
    total: number;
}

const SummaryScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const {
        orderItems: itemsJson,
        subtotal: subtotalString,
        tax: taxString,
        serviceCharge: serviceChargeString,
        discountAmount: discountAmountString,
        total: totalString,
        staffName,
        tableName,
        staff: staffJson,
    } = params;

    const items: Item[] = itemsJson ? JSON.parse(itemsJson as string) : [];
    const subtotal = subtotalString ? parseFloat(subtotalString as string) : 0;
    const tax = taxString ? parseFloat(taxString as string) : 0;
    const serviceCharge = serviceChargeString ? parseFloat(serviceChargeString as string) : 0;
    const discountAmount = discountAmountString ? parseFloat(discountAmountString as string) : 0;
    const total = totalString ? parseFloat(totalString as string) : 0;

    const handleDone = () => {
        router.replace({ pathname: '/(main)/tables', params: { staff: staffJson } });
    };

    const renderOrderItem = ({ item }: { item: Item }) => (
        <View style={styles.itemContainer}>
            <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
            {item.discount > 0 && (
                 <Text style={styles.itemDiscount}>Discount: {item.discount}%</Text>
            )}
            <Text style={styles.itemTotal}>₱{item.total.toFixed(2)}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <Ionicons name="checkmark-circle" size={80} color="green" style={{ alignSelf: 'center' }} />
                <Text style={styles.title}>Payment Successful!</Text>
                <Text style={styles.subtitle}>Order for {tableName}</Text>
                
                <FlatList
                    data={items}
                    renderItem={renderOrderItem}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    style={styles.list}
                />

                <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}><Text>Subtotal</Text><Text>₱{subtotal.toFixed(2)}</Text></View>
                    {discountAmount > 0 && (
                        <View style={styles.summaryRow}><Text style={{color: 'red'}}>Discount</Text><Text style={{color: 'red'}}>-₱{discountAmount.toFixed(2)}</Text></View>
                    )}
                    <View style={styles.summaryRow}><Text>Tax</Text><Text>₱{tax.toFixed(2)}</Text></View>
                    <View style={styles.summaryRow}><Text>Service Charge</Text><Text>₱{serviceCharge.toFixed(2)}</Text></View>
                    <View style={styles.totalRow}><Text style={styles.totalText}>Total</Text><Text style={styles.totalText}>₱{total.toFixed(2)}</Text></View>
                </View>

                <Text style={styles.footerText}>Served by: {staffName}</Text>
                
                <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                    <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.tint, justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '90%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, },
    title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 10, },
    subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20, },
    list: { maxHeight: 200, marginBottom: 20, },
    itemContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee', },
    itemName: { flex: 1, fontSize: 16, },
    itemDiscount: { fontSize: 14, color: 'red', marginLeft: 8 },
    itemTotal: { fontSize: 16, fontWeight: 'bold', },
    summaryContainer: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15, },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: '#333', },
    totalText: { fontSize: 18, fontWeight: 'bold', },
    footerText: { textAlign: 'center', color: '#888', marginTop: 20, },
    doneButton: { backgroundColor: Colors.light.tint, padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center', },
    doneButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', },
});

export default SummaryScreen;
