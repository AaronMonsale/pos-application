
import { View, Text, TextInput, Button, Alert, StyleSheet } from "react-native";
import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { useRouter } from "expo-router";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      if (usersSnapshot.empty) {
        setIsRegistrationOpen(true);
      } else {
        setIsRegistrationOpen(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  const handleRegister = async () => {
    if (!isRegistrationOpen) {
      Alert.alert("Error", "Registration is closed.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Add user role to Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "admin", // The first user is always an admin
        deletedAt: null,
      });

      Alert.alert("Success", "Admin registered successfully!");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  if (!isRegistrationOpen) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Registration is closed</Text>
        <Button title="Back to Login" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Registration</Text>
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
      <Button title="Register" onPress={handleRegister} />
      <View style={{marginTop: 10}}/>
      <Button title="Back to Login" onPress={() => router.back()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
});

export default Register;
