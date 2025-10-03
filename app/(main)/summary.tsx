import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';


const SummaryScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { orderItems, subtotal, tax, serviceCharge, discountAmount, total, staffName, tableName } = params;

    const items = JSON.parse(orderItems as string);

    const handleDone = () => {
        // Navigate back to the tables screen, resetting the staff to null
        router.replace({ pathname: '/(main)/tables' });
    };

    const renderOrderItem = ({ item }: { item: any }) => (
        <View style={styles.itemRow}>
            <View>
                <Text style={styles.itemName}>{item.name} x{item.quantity}</Text>
                {item.discount > 0 && (
                    <Text style={styles.itemDiscount}>
                        Discount: {item.discount}%
                    </Text>
                )}
            </View>
            <Text style={styles.itemTotal}>₱{item.total.toFixed(2)}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Transaction Summary</Text>
            </View>
            <View style={styles.detailsContainer}>
                <Text style={styles.detailText}>Staff: {staffName as string}</Text>
                <Text style={styles.detailText}>Table: {tableName as string}</Text>
            </View>

            <FlatList
                data={items}
                renderItem={renderOrderItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                style={styles.list}
            />

            <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                    <Text>Subtotal</Text>
                    <Text>₱{parseFloat(subtotal as string).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text>Tax</Text>
                    <Text>₱{parseFloat(tax as string).toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text>Service Charge</Text>
                    <Text>₱{parseFloat(serviceCharge as string).toFixed(2)}</Text>
                </View>
                {discountAmount && parseFloat(discountAmount as string) > 0 && (
                     <View style={styles.summaryRow}>
                        <Text style={styles.discountText}>Discount</Text>
                        <Text style={styles.discountText}>-₱{parseFloat(discountAmount as string).toFixed(2)}</Text>
                    </View>
                )}
                <View style={styles.totalRow}>
                    <Text style={styles.totalText}>TOTAL</Text>
                    <Text style={styles.totalText}>₱{parseFloat(total as string).toFixed(2)}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        backgroundColor: Colors.light.tint,
        padding: 20,
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    detailsContainer: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    detailText: {
        fontSize: 16,
        marginBottom: 5,
    },
    list: {
        flex: 1,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '500',
    },
    itemDiscount: {
        fontSize: 14,
        color: 'green',
        marginTop: 2,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryContainer: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        fontSize: 16,
    },
    discountText: {
        color: 'red',
        fontSize: 16,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    totalText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    doneButton: {
        backgroundColor: Colors.light.tint,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default SummaryScreen;
