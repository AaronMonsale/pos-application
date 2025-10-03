import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { auth, db } from '../../firebase';

interface Table {
    id: string;
    name: string;
    occupied?: boolean;
    occupiedBy?: string;
}

interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

const TablesScreen = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const isAdmin = params.admin === 'true';
    const { staff: staffJson } = params as { staff?: string };

    const [modalVisible, setModalVisible] = useState(false);
    const [tables, setTables] = useState<Table[]>([]);
    const [editingTable, setEditingTable] = useState<Table | null>(null);

    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
    const [tableName, setTableName] = useState('');
    const [numberOfTables, setNumberOfTables] = useState('');

    const [viewOrderModalVisible, setViewOrderModalVisible] = useState(false);
    const [selectedTableForView, setSelectedTableForView] = useState<Table | null>(null);
    const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
    const [loadingOrder, setLoadingOrder] = useState(false);


    useLayoutEffect(() => {
        if (isAdmin) {
            navigation.setOptions({
                headerTitle: 'Manage Tables',
                headerBackVisible: false,
                headerLeft: () => (
                    <TouchableOpacity onPress={() => router.push('/(main)/admin')} style={{ marginRight: 16 }}>
                        <Ionicons name="arrow-back" size={24} color={'#000'} />
                    </TouchableOpacity>
                ),
                headerStyle: { backgroundColor: 'white' },
                headerTintColor: '#000',
                headerTitleStyle: { fontWeight: 'normal', fontSize: 18, },
                headerShadowVisible: false,
                elevation: 0,
            });
        } else {
            const handleLogout = () => {
                Alert.alert("Logout", "Are you sure you want to log out?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Logout", style: "destructive", onPress: () => { auth.signOut(); router.replace('/(auth)/login'); } },
                ]);
            };
            navigation.setOptions({
                headerTitle: 'Tables',
                headerLeft: () => null,
                headerRight: () => (
                    <TouchableOpacity style={{ marginRight: 15 }} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={28} color="white" />
                    </TouchableOpacity>
                ),
                headerStyle: { backgroundColor: Colors.light.tint },
                headerTintColor: 'white',
                headerTitleStyle: { fontWeight: 'bold' },
            });
        }
    }, [navigation, router, isAdmin]);


    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        const tablesCollection = collection(db, 'tables');
        const tablesSnapshot = await getDocs(tablesCollection);
        const tablesList = tablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        setTables(tablesList);
    };

    const handleAddOrUpdateTable = async () => {
        if (!isAdmin) return;

        if (editingTable) {
            if (tableName.trim() === '') return Alert.alert('Error', 'Table name cannot be empty.');
            const tableDoc = doc(db, 'tables', editingTable.id);
            await updateDoc(tableDoc, { name: tableName });
            closeModal();
            fetchTables();
            return;
        }

        if (addMode === 'single') {
            if (tableName.trim() === '') return Alert.alert('Error', 'Table name cannot be empty.');
            await addDoc(collection(db, 'tables'), { name: tableName, occupied: false, occupiedBy: null });
        } else {
            const count = parseInt(numberOfTables, 10);
            if (isNaN(count) || count <= 0) {
                return Alert.alert('Error', 'Please enter a valid number of tables to add.');
            }

            const querySnapshot = await getDocs(collection(db, 'tables'));
            let maxTableNumber = 0;
            querySnapshot.forEach(doc => {
                const name = doc.data().name;
                const match = name.match(/^Table (\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxTableNumber) maxTableNumber = num;
                }
            });

            const batch = writeBatch(db);
            for (let i = 1; i <= count; i++) {
                const newTableName = `Table ${maxTableNumber + i}`;
                const newTableRef = doc(collection(db, 'tables'));
                batch.set(newTableRef, { name: newTableName, occupied: false, occupiedBy: null });
            }
            await batch.commit();
        }

        closeModal();
        fetchTables();
    };

    const handleEdit = (table: Table) => {
        if (!isAdmin) return;
        setEditingTable(table);
        setTableName(table.name);
        setAddMode('single');
        setModalVisible(true);
    };

    const handleDelete = (tableId: string) => {
        if (!isAdmin) return;
        Alert.alert('Delete Table', 'Are you sure you want to delete this table?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteDoc(doc(db, 'tables', tableId));
                    fetchTables();
                },
            },
        ]);
    };

    const handleTablePress = (table: Table) => {
        if (isAdmin) {
            viewOrder(table);
        } else {
            if (table.occupied) {
                viewOrder(table);
            } else {
                router.push({
                    pathname: '/(main)/pos',
                    params: {
                        tableId: table.id,
                        tableName: table.name,
                        staff: staffJson,
                    },
                });
            }
        }
    };

    const viewOrder = async (table: Table) => {
        if (!table.id) return;
        setLoadingOrder(true);
        setSelectedTableForView(table);
        setViewOrderModalVisible(true);
        setCurrentOrderItems([]);

        try {
            const tableDocRef = doc(db, 'tables', table.id);
            const tableDocSnap = await getDoc(tableDocRef);

            if (tableDocSnap.exists()) {
                const tableData = tableDocSnap.data();
                const items = (tableData.order || []).map((item: any) => ({
                    ...item.food,
                    quantity: item.quantity
                }));
                setCurrentOrderItems(items);
            } else {
                console.log(`No such table found: ${table.id}`);
            }
        } catch (error) {
            console.error("Error fetching order for table: ", error);
            Alert.alert("Error", "Could not fetch order details for this table.");
        } finally {
            setLoadingOrder(false);
        }
    };

    const handleLongPress = (table: Table) => {
        if (!isAdmin) return;
        Alert.alert(`Manage Table: ${table.name}`, 'Choose an option', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Edit', onPress: () => handleEdit(table) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDelete(table.id) },
        ]);
    }

    const openAddModal = () => {
        if (!isAdmin) return;
        setEditingTable(null);
        setAddMode('single');
        setTableName('');
        setNumberOfTables('');
        setModalVisible(true);
    }

    const closeModal = () => {
        setModalVisible(false);
        setEditingTable(null);
        setTableName('');
        setNumberOfTables('');
    }

    const renderTableItem = ({ item }: { item: Table }) => (
        <TouchableOpacity
            style={[styles.tile, item.occupied && styles.occupiedTile]}
            onPress={() => handleTablePress(item)}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.7}
        >
            <Ionicons name="grid-outline" size={32} color={item.occupied ? 'white' : Colors.light.tint} />
            <Text style={[styles.tileText, item.occupied && styles.occupiedTileText]}>{item.name}</Text>
            {item.occupied && item.occupiedBy && (<Text style={styles.occupiedByText} numberOfLines={1}>by {item.occupiedBy}</Text>)}
            {isAdmin && <View style={styles.adminIndicator}><Text style={styles.adminIndicatorText}>Manage</Text></View>}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {isAdmin && (
                <TouchableOpacity style={styles.manageButton} onPress={openAddModal}>
                    <Text style={styles.manageButtonText}>Add New Table(s)</Text>
                </TouchableOpacity>
            )}

            <FlatList
                data={tables}
                renderItem={renderTableItem}
                keyExtractor={item => item.id}
                numColumns={3}
                contentContainerStyle={styles.tilesContainer}
                onRefresh={fetchTables}
                refreshing={false}
            />

            {isAdmin && (
                <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
                    <TouchableWithoutFeedback onPress={closeModal}>
                        <View style={styles.centeredView}>
                            <TouchableWithoutFeedback>
                                <View style={styles.modalView}>
                                    <Text style={styles.modalTitle}>{editingTable ? 'Edit Table' : 'Add New Table(s)'}</Text>
                                    {!editingTable && (
                                        <View style={styles.modeSelector}>
                                            <TouchableOpacity style={[styles.modeButton, addMode === 'single' && styles.modeButtonActive]} onPress={() => setAddMode('single')}>
                                                <Text style={[styles.modeButtonText, addMode === 'single' && styles.modeButtonTextActive]}>Single</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.modeButton, addMode === 'bulk' && styles.modeButtonActive]} onPress={() => setAddMode('bulk')}>
                                                <Text style={[styles.modeButtonText, addMode === 'bulk' && styles.modeButtonTextActive]}>Bulk</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {addMode === 'single' || editingTable ? (
                                        <TextInput style={styles.input} placeholder="Table Name" value={tableName} onChangeText={setTableName} autoFocus />
                                    ) : (
                                        <TextInput style={styles.input} placeholder="How many tables to add?" value={numberOfTables} onChangeText={setNumberOfTables} keyboardType="number-pad" autoFocus />
                                    )}
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={closeModal}>
                                            <Text style={styles.buttonText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={handleAddOrUpdateTable}>
                                            <Text style={styles.buttonText}>{editingTable ? 'Update' : 'Add'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            )}

            <Modal animationType="slide" transparent={true} visible={viewOrderModalVisible} onRequestClose={() => setViewOrderModalVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setViewOrderModalVisible(false)}>
                    <View style={styles.centeredView}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalView}>
                                {selectedTableForView && (
                                    <>
                                        <Text style={styles.modalTitle}>Order: {selectedTableForView.name}</Text>
                                        {selectedTableForView.occupiedBy && (
                                            <Text style={styles.responsibleStaffText}>Served by: {selectedTableForView.occupiedBy}</Text>
                                        )}
                                        
                                        {loadingOrder ? (
                                            <ActivityIndicator size="large" color={Colors.light.tint} style={{ marginVertical: 20 }}/>
                                        ) : (
                                            <FlatList
                                                data={currentOrderItems}
                                                keyExtractor={(item) => item.id}
                                                renderItem={({ item }) => (
                                                    <View style={styles.orderItemContainer}>
                                                        <Text style={styles.orderItemText} numberOfLines={1}>{item.quantity}x {item.name}</Text>
                                                        <Text style={styles.orderItemPrice}>₱{(item.price * item.quantity).toFixed(2)}</Text>
                                                    </View>
                                                )}
                                                ListEmptyComponent={<Text style={styles.emptyOrderText}>This table is empty.</Text>}
                                                style={styles.orderList}
                                                contentContainerStyle={{ flexGrow: 1 }}
                                            />
                                        )}
                                        
                                        <TouchableOpacity
                                            style={[styles.button, styles.buttonClose]}
                                            onPress={() => setViewOrderModalVisible(false)}
                                        >
                                            <Text style={styles.buttonText}>Close</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingTop: 10,
    },
    manageButton: {
        backgroundColor: Colors.light.tint,
        padding: 15,
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    manageButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    tilesContainer: {
        paddingHorizontal: 5,
    },
    tile: {
        flex: 1,
        aspectRatio: 1,
        margin: 5,
        backgroundColor: 'white',
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        borderWidth: 1,
        borderColor: '#eee',
        padding: 5,
        position: 'relative',
    },
    occupiedTile: {
        backgroundColor: '#00156E',
    },
    tileText: {
        marginTop: 8,
        color: Colors.light.tint,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    occupiedTileText: {
        color: 'white',
    },
    occupiedByText: {
        fontSize: 11,
        color: 'white',
        marginTop: 2,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    adminIndicator: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: '#ffc107',
        borderRadius: 5,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    adminIndicatorText: {
        color: 'black',
        fontSize: 10,
        fontWeight: 'bold',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        elevation: 5,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalTitle: {
        marginBottom: 5,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: 'bold',
    },
    input: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 20,
        width: '100%',
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 10,
    },
    button: {
        borderRadius: 10,
        paddingVertical: 15,
        elevation: 2,
        flex: 1,
        alignItems: 'center',
    },
    buttonSave: {
        backgroundColor: Colors.light.tint,
        marginLeft: 10,
    },
    buttonCancel: {
        backgroundColor: '#6c757d',
        marginRight: 10,
    },
    buttonClose: {
        backgroundColor: '#6c757d',
        width: '100%',
        marginTop: 15,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
    modeSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
    },
    modeButton: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 10,
    },
    modeButtonActive: {
        backgroundColor: Colors.light.tint,
    },
    modeButtonText: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 16,
    },
    modeButtonTextActive: {
        color: 'white',
    },
    responsibleStaffText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        fontStyle: 'italic',
    },
    orderList: {
        width: '100%',
        marginBottom: 10,
    },
    orderItemContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        width: '100%',
    },
    orderItemText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    orderItemPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.light.tint,
    },
    emptyOrderText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
        color: '#888'
    }
});

export default TablesScreen;
