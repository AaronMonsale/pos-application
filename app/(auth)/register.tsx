
import { View, Text, TextInput, Button, Alert, TouchableOpacity, StyleSheet } from "react-native";
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee"); // default role
  const router = useRouter();

  const handleRegister = async () => {
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
        role: role,
      });

      Alert.alert("Success", "User registered successfully!");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Register
      </Text>
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
      <View style={{ marginBottom: 12 }}>
        <Text>Role:</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => setRole("admin")}
            style={[
              styles.roleButton,
              role === "admin" && styles.selectedRole,
            ]}
          >
            <Text style={role === 'admin' && styles.selectedRoleText}>Admin</Text>
          </TouchableOpacity>
          <View style={{ width: 10 }} />
          <TouchableOpacity
            onPress={() => setRole("employee")}
            style={[
              styles.roleButton,
              role === "employee" && styles.selectedRole,
            ]}
          >
            <Text style={role === 'employee' && styles.selectedRoleText}>Employee</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 5,
  },
  selectedRole: {
    backgroundColor: "blue",
    borderColor: "blue",
  },
  selectedRoleText: {
    color: 'white',
  }
});

export default Register;
