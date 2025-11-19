import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/theme';
import { PrismaClient, Transaction, TransactionItem } from '@prisma/client';

const prisma = new PrismaClient();

interface TransactionWithItems extends Transaction {
    items: TransactionItem[];
}

const SummaryScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { transactionId } = params as { transactionId: string };
    const [transaction, setTransaction] = useState<TransactionWithItems | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransaction = async () => {
            if (!transactionId) return;
            try {
                const fetchedTransaction = await prisma.transaction.findUnique({
                    where: { id: parseInt(transactionId) },
                    include: { items: true },
                });
                setTransaction(fetchedTransaction as TransactionWithItems);
            } catch (error) {
                console.error("Failed to fetch transaction details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransaction();
    }, [transactionId]);

    const renderOrderItem = ({ item }: { item: TransactionItem }) => (
        <View style={styles.itemRow}>
            <View>
                <Text style={styles.itemName}>{`${item.name} x${item.quantity}`}</Text>
                {item.discount > 0 && (
                    <Text style={styles.itemDiscount}>
                        {`Discount: ${item.discount}%`}
                    </Text>
                )}
            </View>
            <Text style={styles.itemTotal}>{`₱${item.total.toFixed(2)}`}</Text>
        </View>
    );

    if (loading) {
        return <ActivityIndicator size="large" color={Colors.light.tint} style={{ flex: 1, justifyContent: 'center' }} />;
    }

    if (!transaction) {
        return <View style={styles.container}><Text>Transaction not found.</Text></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Transaction Summary</Text>
            </View>
            <View style={styles.detailsContainer}>
                <Text style={styles.detailText}>{`Staff: ${transaction.staffName}`}</Text>
                <Text style={styles.detailText}>{`Table: ${transaction.tableName}`}</Text>
            </View>
            <FlatList
                data={transaction.items}
                renderItem={renderOrderItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.list}
            />
            <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                    <Text style={{fontSize: 16}}>Subtotal</Text>
                    <Text style={{fontSize: 16}}>{`₱${transaction.subtotal.toFixed(2)}`}</Text>
                </View>
                {transaction.discount > 0 && (
                     <View style={styles.summaryRow}>
                        <Text style={styles.discountText}>Discount</Text>
                        <Text style={styles.discountText}>{`-₱${transaction.discount.toFixed(2)}`}</Text>
                    </View>
                )}
                <View style={styles.summaryRow}>
                    <Text style={{fontSize: 16}}>Tax</Text>
                    <Text style={{fontSize: 16}}>{`₱${transaction.tax.toFixed(2)}`}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={{fontSize: 16}}>Service Charge</Text>
                    <Text style={{fontSize: 16}}>{`₱${transaction.serviceCharge.toFixed(2)}`}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalText}>TOTAL</Text>
                    <Text style={styles.totalText}>{`₱${transaction.total.toFixed(2)}`}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.doneButton}
                onPress={() => router.back()}
            >
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