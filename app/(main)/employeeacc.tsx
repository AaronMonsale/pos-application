
import { Ionicons } from '@expo/vector-icons';
import { PrismaClient, User } from '@prisma/client';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';

const prisma = new PrismaClient();

const EmployeeAccScreen = () => {
    const [employees, setEmployees] = useState<User[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const fetchEmployees = async () => {
        try {
            const list = await prisma.user.findMany({
                where: { role: 'USER', deletedAt: null },
                orderBy: { email: 'asc' },
            });
            setEmployees(list);
        } catch (error) {
            console.error("Error fetching employees: ", error);
            Alert.alert("Error", "Could not fetch employee list.");
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleAddEmployee = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password.');
            return;
        }

        try {
            await prisma.user.create({
                data: {
                    email,
                    password, // Remember to hash passwords in a real app!
                    role: 'USER',
                },
            });

            Alert.alert('Success', 'Employee account created successfully.');
            setModalVisible(false);
            setEmail('');
            setPassword('');
            fetchEmployees();
        } catch (error: any) {
            console.error("Error creating employee: ", error);
            Alert.alert('Error', "An account with this email already exists.");
        }
    };

    const handleDelete = (user: User) => {
        Alert.alert(
            'Delete Employee',
            `Are you sure you want to delete ${user.email}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { deletedAt: new Date() },
                            });
                            fetchEmployees();
                        } catch (error) {
                            console.error("Error deleting employee: ", error);
                            Alert.alert("Error", "Could not delete employee.");
                        }
                    },
                },
            ]
        );
    }; 
    
    const renderUserItem = ({ item }: { item: User }) => (
        <View style={styles.userItem}>
            <View>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userRole}>{item.role}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
                <Ionicons name="trash-bin" size={24} color={'#dc3545'} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={employees}
                renderItem={renderUserItem}
                keyExtractor={item => item.id.toString()}
                ListEmptyComponent={<Text style={styles.emptyText}>No employee users found.</Text>}
            />

            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Add New Employee</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                        <TouchableOpacity style={styles.button} onPress={handleAddEmployee}>
                            <Text style={styles.textStyle}>Add Employee</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={() => setModalVisible(false)}>
                            <Text style={styles.textStyle}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingTop: 20,
    },
    userItem: {
        backgroundColor: 'white',
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    userEmail: {
        fontSize: 16,
        fontWeight: '600',
    },
    userRole: {
        fontSize: 14,
        color: 'gray',
        textTransform: 'capitalize',
        marginTop: 5,
    },
    deleteButton: {
        padding: 5,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#6c757d',
    },
    addButton: {
        position: 'absolute',
        right: 30,
        bottom: 30,
        backgroundColor: Colors.light.tint,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.4)',
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
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
    modalText: {
        marginBottom: 20,
        textAlign: "center",
        fontSize: 20,
        fontWeight: 'bold'
    },
    input: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        marginBottom: 15,
        paddingHorizontal: 15,
        width: '100%', 
        borderRadius: 10,
        fontSize: 16,
    },
    button: {
        backgroundColor: Colors.light.tint,
        borderRadius: 10,
        paddingVertical: 15,
        elevation: 2,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10
    },
    buttonClose: {
        backgroundColor: "#6c757d",
    },
    textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
        fontSize: 16,
    }
});

export default EmployeeAccScreen;