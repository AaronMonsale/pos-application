
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';

const UserManagementScreen = () => {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.tile} onPress={() => router.push('/(main)/adminacc')}>
                <Ionicons name="person-circle-outline" size={40} color={Colors.light.tint} />
                <Text style={styles.tileText}>Admins</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tile} onPress={() => router.push('/(main)/employeeacc')}>
                <Ionicons name="people-outline" size={40} color={Colors.light.tint} />
                <Text style={styles.tileText}>Employees</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tile} onPress={() => router.push('/(main)/kitchenacc')}>
                <Ionicons name="flame-outline" size={40} color={Colors.light.tint} />
                <Text style={styles.tileText}>Kitchen</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap', // Allow items to wrap to the next line
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: 20,
        backgroundColor: '#f8f9fa',
        gap: 20,
        paddingHorizontal: 20,
    },
    tile: {
        // Adjust width to fit 2 in a row, considering gap
        width: '45%',
        aspectRatio: 1,
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        marginBottom: 20, // Add margin bottom for spacing when wrapped
    },
    tileText: {
        marginTop: 10,
        fontSize: 18,
        fontWeight: '500',
        color: Colors.light.tint,
        textAlign: 'center',
    },
});

export default UserManagementScreen;
