
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDocs, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { db } from '../../firebase';

interface User {
    id: string;
    email: string;
    role: string;
    deletedAt?: Date | null;
}

const UserManagementScreen = () => {
    const [userList, setUserList] = useState<User[]>([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const usersCollection = query(collection(db, 'users'), where("deletedAt", "==", null));
            const usersSnapshot = await getDocs(usersCollection);
            const list = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)).sort((a, b) => a.email.localeCompare(b.email));
            setUserList(list);
        } catch (error) {
            console.error("Error fetching users: ", error);
            Alert.alert("Error", "Could not fetch user list.");
        }
    };

    const handleDelete = (user: User) => {
        Alert.alert(
            'Delete User',
            `Are you sure you want to delete ${user.email}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const userDoc = doc(db, 'users', user.id);
                            await updateDoc(userDoc, { deletedAt: serverTimestamp() });
                            fetchUsers();
                        } catch (error) {
                            console.error("Error deleting user: ", error);
                            Alert.alert("Error", "Could not delete user.");
                        }
                    },
                },
            ]
        );
    }; 
    
    const renderUserItem = ({ item }: { item: User }) => (
        <View style={styles.itemContainer}>
            <View>
                <Text style={styles.itemName}>{item.email}</Text>
                <Text style={styles.itemRole}>{item.role}</Text>
            </View>
            <View style={styles.itemActions}>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
                    <Ionicons name="trash-bin" size={24} color={'#dc3545'} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={userList}
                renderItem={renderUserItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
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
    itemRole: {
        fontSize: 14,
        color: 'gray',
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
});

export default UserManagementScreen;
