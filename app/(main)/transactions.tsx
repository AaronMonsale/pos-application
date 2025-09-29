import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { db } from '../../firebase';

interface Transaction {
  id: string;
  items: { name: string; price: number }[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount?: number;
  total: number;
  createdAt: { toDate: () => Date };
  currency: string;
}

const TransactionsScreen = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const transactionsCollection = collection(db, 'transactions');
        const q = query(transactionsCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const transactionsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        setTransactions(transactionsList);
        setFilteredTransactions(transactionsList);
      } catch (error) {
        console.error("Error fetching transactions: ", error);
        Alert.alert("Error", "Could not fetch transactions.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    let filtered = transactions;

    if (startDate) {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        filtered = filtered.filter(t => t.createdAt.toDate() >= startOfDay);
    }
    if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filtered = filtered.filter(t => t.createdAt.toDate() <= endOfDay);
    }

    setFilteredTransactions(filtered);
  }, [startDate, endDate, transactions]);

  const handleTransactionPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalVisible(true);
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity onPress={() => handleTransactionPress(item)}>
        <View style={styles.transactionContainer}>
            <View style={styles.transactionHeader}>
                <Text style={styles.transactionId}>ID: {item.id}</Text>
                <Text style={styles.transactionDate}>{item.createdAt.toDate().toLocaleDateString()}</Text>
            </View>
            <View style={styles.itemsContainer}>
                {item.items.map((food, index) => (
                    <Text key={index} style={styles.itemText}>{food.name} - {item.currency}{food.price.toFixed(2)}</Text>
                ))}
            </View>
            {item.discount && item.discount > 0 && (
                <Text style={styles.discountText}>Discount Applied!</Text>
            )}
            <Text style={styles.total}>Total: {item.currency}{item.total.toFixed(2)}</Text>
        </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator size="large" color={Colors.light.tint} style={styles.centered} />;
  }

  return (
    <View style={styles.container}>
        <View style={styles.dateFilterContainer}>
            <Text style={styles.dateFilterTitle}>Date Range:</Text>
            <View style={styles.datePickerRow}>
                <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.datePickerInput}>
                    <Text>{startDate ? `From: ${startDate.toLocaleDateString()}` : "From"}</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerSeparator}>{'>'}</Text>
                <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.datePickerInput}>
                    <Text>{endDate ? `To: ${endDate.toLocaleDateString()}` : "To"}</Text>
                </TouchableOpacity>
            </View>
        </View>

        {showStartDatePicker && (
            <DateTimePicker
                testID="startDatePicker"
                value={startDate || new Date()}
                mode="date"
                display="default"
                onChange={onStartDateChange}
            />
        )}
        {showEndDatePicker && (
            <DateTimePicker
                testID="endDatePicker"
                value={endDate || new Date()}
                mode="date"
                display="default"
                onChange={onEndDateChange}
            />
        )}
        <Modal
            animationType="slide"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={() => setIsModalVisible(false)}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    {selectedTransaction && (
                        <>
                            <Text style={styles.modalTitle}>Transaction Details</Text>
                            <Text style={styles.modalText}>ID: {selectedTransaction.id}</Text>
                            <Text style={styles.modalText}>Date: {selectedTransaction.createdAt.toDate().toLocaleString()}</Text>
                            <View style={styles.itemsContainer}>
                                {selectedTransaction.items.map((item, index) => (
                                    <Text key={index} style={styles.itemText}>{item.name} - {selectedTransaction.currency}{item.price.toFixed(2)}</Text>
                                ))}
                            </View>
                            <Text style={styles.modalText}>Subtotal: {selectedTransaction.currency}{selectedTransaction.subtotal.toFixed(2)}</Text>
                            <Text style={styles.modalText}>Tax: {selectedTransaction.currency}{selectedTransaction.tax.toFixed(2)}</Text>
                            {selectedTransaction.serviceCharge > 0 && (
                                <Text style={styles.modalText}>Service Charge: {selectedTransaction.currency}{selectedTransaction.serviceCharge.toFixed(2)}</Text>
                            )}
                            {selectedTransaction.discount && selectedTransaction.discount > 0 && (
                                <Text style={styles.modalText}>Discount: -{selectedTransaction.currency}{selectedTransaction.discount.toFixed(2)}</Text>
                            )}
                            <Text style={styles.modalTotal}>Total: {selectedTransaction.currency}{selectedTransaction.total.toFixed(2)}</Text>
                        </>
                    )}
                    <TouchableOpacity
                        style={[styles.button, styles.buttonClose]}
                        onPress={() => setIsModalVisible(false)}
                    >
                        <Text style={styles.textStyle}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterContainer: {
    marginBottom: 16,
  },
  dateFilterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 8,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  datePickerInput: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    padding: 10,
    borderRadius: 5,
    width: '40%',
    alignItems: 'center',
  },
  datePickerSeparator: {
    fontSize: 20,
    color: Colors.light.tint,
  },
  transactionContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionId: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#888',
  },
  transactionDate: {
    fontSize: 12,
    color: '#888',
  },
  itemsContainer: {
    marginVertical: 10,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
  discountText: {
    color: 'green',
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 5,
  },
  total: {
    fontWeight: 'bold',
    fontSize: 18,
    color: Colors.light.tint,
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#888',
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
      margin: 20,
      backgroundColor: "white",
      borderRadius: 20,
      padding: 35,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
          width: 0,
          height: 2
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      width: '80%',
  },
  button: {
      borderRadius: 20,
      padding: 10,
      elevation: 2,
      marginTop: 15,
  },
  buttonClose: {
      backgroundColor: "#2196F3",
  },
  textStyle: {
      color: "white",
      fontWeight: "bold",
      textAlign: "center"
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
      textAlign: "center"
  },
  modalText: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  modalTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
    color: Colors.light.tint,
  },
});

export default TransactionsScreen;