
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { auth, db } from '../../firebase';

interface Table {
    id: string;
    name: string;
    occupied?: boolean;
    occupiedBy?: string;
}

const TablesScreen = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const { staff: staffJson } = params as { staff?: string };

    const [modalVisible, setModalVisible] = useState(false);
    const [tables, setTables] = useState<Table[]>([]);
    const [tableName, setTableName] = useState('');
    const [editingTable, setEditingTable] = useState<Table | null>(null);

    useLayoutEffect(() => {
        const handleLogout = () => {
            Alert.alert("Logout", "Are you sure you want to log out?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: () => {
                        auth.signOut();
                        router.replace('/(auth)/login');
                    },
                },
            ]);
        };

        navigation.setOptions({
            headerTitle: 'Tables',
            headerLeft: () => null,
            headerRight: () => (
                <TouchableOpacity
                    style={{ marginRight: 15 }}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={28} color="white" />
                </TouchableOpacity>
            ),
            headerStyle: {
                backgroundColor: Colors.light.tint,
            },
            headerTintColor: 'white',
            headerTitleStyle: {
                fontWeight: 'bold',
            },
        });
    }, [navigation, router]);

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        const tablesCollection = collection(db, 'tables');
        const tablesSnapshot = await getDocs(tablesCollection);
        const tablesList = tablesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)).sort((a, b) => a.name.localeCompare(b.name));
        setTables(tablesList);
    };

    const handleAddOrUpdateTable = async () => {
        if (tableName.trim() === '') {
            Alert.alert('Error', 'Table name cannot be empty.');
            return;
        }

        if (editingTable) {
            // Update existing table
            const tableDoc = doc(db, 'tables', editingTable.id);
            await updateDoc(tableDoc, { name: tableName });
            setEditingTable(null);
        } else {
            // Add new table
            await addDoc(collection(db, 'tables'), { name: tableName, occupied: false, occupiedBy: null });
        }

        setTableName('');
        setModalVisible(false);
        fetchTables(); // Refresh the list from Firestore
    };

    const handleEdit = (table: Table) => {
        setEditingTable(table);
        setTableName(table.name);
        setModalVisible(true);
    };

    const handleDelete = (tableId: string) => {
        Alert.alert(
            'Delete Table',
            `Are you sure you want to delete this table?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteDoc(doc(db, 'tables', tableId));
                        fetchTables(); // Refresh the list
                    },
                },
            ]
        );
    };

    const handleTablePress = (table: Table) => {
        router.push({
            pathname: '/(main)/pos',
            params: { 
                tableId: table.id, 
                tableName: table.name,
                staff: staffJson,
             },
        });
    };

    const handleLongPress = (table: Table) => {
        Alert.alert(
            `Manage Table: ${table.name}`,
            'Choose an option',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Edit',
                    onPress: () => handleEdit(table),
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDelete(table.id),
                },
            ]
        );
    }
    
    const openAddModal = () => {
        setEditingTable(null);
        setTableName('');
        setModalVisible(true);
    }

    const renderTableItem = ({ item }: { item: Table }) => (
        <TouchableOpacity 
            style={[styles.tile, item.occupied && styles.occupiedTile]} 
            onPress={() => handleTablePress(item)} 
            onLongPress={() => handleLongPress(item)}
        >
            <Ionicons name="grid-outline" size={32} color={item.occupied ? 'white' : Colors.light.tint} />
            <Text style={[styles.tileText, item.occupied && styles.occupiedTileText]}>{item.name}</Text>
            {item.occupied && item.occupiedBy && (
                <Text style={styles.occupiedByText} numberOfLines={1}>
                    by {item.occupiedBy}
                </Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.buttonContainer}>
                 <TouchableOpacity style={styles.manageButton} onPress={openAddModal}>
                    <Text style={styles.manageButtonText}>Add Table</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.manageButton} onPress={() => router.push('/(main)/staff')}>
                    <Text style={styles.manageButtonText}>Manage Staff</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={tables}
                renderItem={renderTableItem}
                keyExtractor={item => item.id}
                numColumns={3} // Adjust number of columns for your desired layout
                contentContainerStyle={styles.tilesContainer}
                onRefresh={fetchTables}
                refreshing={false}
            />

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.centeredView}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalView}>
                                <Text style={styles.modalText}>{editingTable ? 'Edit Table' : 'Add New Table'}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Table Name"
                                    value={tableName}
                                    onChangeText={setTableName}
                                    autoFocus
                                />
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonCancel]}
                                        onPress={() => setModalVisible(false)}
                                    >
                                        <Text style={styles.buttonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonSave]}
                                        onPress={handleAddOrUpdateTable}
                                    >
                                        <Text style={styles.buttonText}>{editingTable ? 'Update' : 'Add'}</Text>
                                    </TouchableOpacity>
                                </View>
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
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    manageButton: {
        backgroundColor: Colors.light.tint,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        flex: 1,
        marginHorizontal: 10,
    },
    manageButtonText: {
        color: 'white',
        fontSize: 16,
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
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#eee',
        padding: 5,
    },
    occupiedTile: {
        backgroundColor: '#00156E',
        borderColor: '#e0a800',
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
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
        maxWidth: 400,
    },
    modalText: {
        marginBottom: 25,
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
    },
    button: {
        borderRadius: 10,
        padding: 15,
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
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
});

export default TablesScreen;
