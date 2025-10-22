
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../firebase";
import { Colors } from "../../constants/theme";

const CreateKitchenAccountScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleCreateAccount = async () => {
        if (!email || !password) {
            Alert.alert("Missing Information", "Please enter both an email and password.");
            return;
        }

        try {
            // Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Add user details to Firestore with the role "Kitchen"
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: "Kitchen", // Automatically assign the "Kitchen" role
                createdAt: new Date(),
            });

            Alert.alert("Account Created", `The kitchen account for ${email} has been successfully created.`);
            router.back(); // Go back to the kitchen accounts list

        } catch (error: any) {
            console.error("Error creating kitchen account:", error);
            Alert.alert("Creation Failed", error.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create New Kitchen Account</Text>
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
            <TouchableOpacity style={styles.button} onPress={handleCreateAccount}>
                <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f8f9fa',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: Colors.light.tint,
    },
    input: {
        height: 50,
        borderColor: '#dee2e6',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 20,
        backgroundColor: 'white',
        fontSize: 16,
    },
    button: {
        backgroundColor: Colors.light.tint,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default CreateKitchenAccountScreen;
