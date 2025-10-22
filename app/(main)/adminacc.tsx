
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
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

const AdminAccScreen = () => {
    const [admins, setAdmins] = useState<User[]>([]);

    useEffect(() => {
        const usersCollection = query(collection(db, 'users'), where('role', '==', 'admin'), where("deletedAt", "==", null));
        
        const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAdmins(list.sort((a, b) => a.email.localeCompare(b.email)));
        }, (error) => {
            console.error("Error fetching admins: ", error);
            Alert.alert("Error", "Could not fetch admin list.");
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const handleDelete = (user: User) => {
        Alert.alert(
            'Delete Admin',
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
                            // No need to call fetchUsers() anymore, onSnapshot will handle the update
                        } catch (error) {
                            console.error("Error deleting admin: ", error);
                            Alert.alert("Error", "Could not delete admin.");
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
                data={admins}
                renderItem={renderUserItem}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={styles.emptyText}>No admin users found.</Text>}
            />
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
});

export default AdminAccScreen;
