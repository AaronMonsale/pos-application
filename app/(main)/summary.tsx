import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

const SummaryScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { orderItems, subtotal, tax, serviceCharge, discountAmount, total, staffName } = params;

    // The orderItems are passed as a string, so we need to parse them back into an array of objects
    const items = JSON.parse(orderItems as string);
    
    const handlePrint = () => {
        // This is a placeholder for the actual print logic
        Alert.alert("Print Invoice", "This will print the invoice.");
    }

    const handleDone = () => {
        router.back(); // Go back to the main POS screen without clearing the navigation stack
    }

    const renderOrderItem = ({ item }: { item: any }) => (
        <View style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name} x{item.quantity}</Text>
            <Text style={styles.itemTotal}>₱{(item.price * item.quantity).toFixed(2)}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Transaction Summary</Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                <FlatList
                    data={items}
                    renderItem={renderOrderItem}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    style={styles.list}
                />

                <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryText}>Subtotal</Text>
                        <Text style={styles.summaryText}>₱{parseFloat(subtotal as string).toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryText}>Tax</Text>
                        <Text style={styles.summaryText}>₱{parseFloat(tax as string).toFixed(2)}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryText}>Service Charge</Text>
                        <Text style={styles.summaryText}>₱{parseFloat(serviceCharge as string).toFixed(2)}</Text>
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

                <View style={styles.staffInfo}>
                    <Text style={styles.staffText}>Transaction handled by: {staffName || 'N/A'}</Text>
                </View>

            </View>
            <View style={styles.footer}>
                <TouchableOpacity style={[styles.button, styles.printButton]} onPress={handlePrint}>
                    <Ionicons name="print-outline" size={24} color="white" />
                    <Text style={styles.buttonText}>Print Invoice</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.doneButton]} onPress={handleDone}>
                    <Text style={styles.buttonText}>Done</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        backgroundColor: Colors.light.tint,
        padding: 20,
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    list: {
        marginBottom: 20,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    itemName: {
        fontSize: 16,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryContainer: {
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 10,
        marginBottom: 20,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryText: {
        fontSize: 16,
    },
    discountText: {
        fontSize: 16,
        color: 'red',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        borderTopWidth: 2,
        borderTopColor: '#333',
        paddingTop: 10,
    },
    totalText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    staffInfo: {
        alignItems: 'center',
        marginTop: 20,
    },
    staffText: {
        fontSize: 16,
        fontStyle: 'italic',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
    },
    printButton: {
        backgroundColor: '#6c757d',
    },
    doneButton: {
        backgroundColor: Colors.light.tint,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});

export default SummaryScreen;
