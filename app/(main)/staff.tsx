
import { Ionicons } from '@expo/vector-icons';
import { PrismaClient, User } from '@prisma/client';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Colors } from '../../constants/theme';

const prisma = new PrismaClient();

interface Staff extends User {}

const StaffManagementScreen = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [staffName, setStaffName] = useState('');
    const [staffPin, setStaffPin] = useState('');
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const list = await prisma.user.findMany({
                where: { role: 'USER', deletedAt: null },
                orderBy: { name: 'asc' },
            });
            setStaffList(list);
        } catch (error) {
            console.error("Error fetching staff: ", error);
            Alert.alert("Error", "Could not fetch staff list.");
        }
    };

    const handleAddOrUpdateStaff = async () => {
        if (staffName.trim() === '' || staffPin.trim() === '') {
            Alert.alert('Error', 'Staff name and PIN cannot be empty.');
            return;
        }
        if (!/^\d{4}$/.test(staffPin)) {
            Alert.alert('Error', 'PIN must be exactly 4 digits.');
            return;
        }

        try {
            if (editingStaff) {
                await prisma.user.update({
                    where: { id: editingStaff.id },
                    data: { name: staffName, pin: staffPin },
                });
            } else {
                await prisma.user.create({ data: { name: staffName, pin: staffPin, email: `${staffName.replace(/\s/g, '').toLowerCase()}@onecore.com`, password: 'password' } });
            }
            closeModal();
            fetchStaff();
        } catch (error) {
            console.error("Error adding/updating staff: ", error);
            Alert.alert("Error", "Could not save staff details.");
        }
    };

    const handleEdit = (staff: Staff) => {
        setEditingStaff(staff);
        setStaffName(staff.name || '');
        setStaffPin(staff.pin || '');
        setModalVisible(true);
    };

    const handleDelete = (staff: Staff) => {
        Alert.alert(
            'Delete Staff',
            `Are you sure you want to delete ${staff.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await prisma.user.update({
                                where: { id: staff.id },
                                data: { deletedAt: new Date() },
                            });
                            fetchStaff();
                        } catch (error) {
                            console.error("Error deleting staff: ", error);
                            Alert.alert("Error", "Could not delete staff member.");
                        }
                    },
                },
            ]
        );
    }; 
    
    const openModal = () => {
        setEditingStaff(null);
        setStaffName('');
        setStaffPin('');
        setModalVisible(true);
    }

    const closeModal = () => {
        setModalVisible(false);
        setEditingStaff(null);
        setStaffName('');
        setStaffPin('');
    }

    const renderStaffItem = ({ item }: { item: Staff }) => (
        <View style={styles.itemContainer}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                    <Ionicons name="pencil" size={24} color={Colors.light.tint} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
                    <Ionicons name="trash-bin" size={24} color={'#dc3545'} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.addButton} onPress={openModal}>
                <Text style={styles.addButtonText}>Add New Staff</Text>
            </TouchableOpacity>

            <FlatList
                data={staffList}
                renderItem={renderStaffItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<Text style={styles.emptyText}>No staff members found. Add one to get started.</Text>}
            />

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeModal}
            >
                <TouchableWithoutFeedback onPress={closeModal}>
                    <View style={styles.centeredView}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalView}>
                                <Text style={styles.modalText}>{editingStaff ? 'Edit Staff' : 'Add New Staff'}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Staff Name"
                                    value={staffName}
                                    onChangeText={setStaffName}
                                    autoCapitalize="words"
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="4-Digit PIN"
                                    value={staffPin}
                                    onChangeText={setStaffPin}
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    secureTextEntry
                                />
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonCancel]}
                                        onPress={closeModal}
                                    >
                                        <Text style={styles.buttonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonSave]}
                                        onPress={handleAddOrUpdateStaff}
                                    >
                                        <Text style={styles.buttonText}>{editingStaff ? 'Update' : 'Add'}</Text>
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
    addButton: {
        backgroundColor: Colors.light.tint,
        padding: 15,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
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
    },
    addButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContainer: {
        paddingHorizontal: 20,
    },
    itemContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
        elevation: 3,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '500',
    },
    itemActions: {
        flexDirection: 'row',
    },
    actionButton: {
        marginLeft: 20,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#6c757d',
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
        width: '90%',
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

export default StaffManagementScreen;