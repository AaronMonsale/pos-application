import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { auth, db } from "../../firebase";

const UserRole = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("POS"); // Default role

  const handleCreateUser = async () => {
    if (!email || !password || !role) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: role,
      });
      Alert.alert("Success", "Employee account created successfully!");
      setEmail("");
      setPassword("");
      setRole("POS"); // Reset to default
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Employee Account</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Employee Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <View style={{ marginBottom: 24 }}>
          <Text style={{marginBottom: 8, color: Colors.light.tint, fontWeight: "bold"}}>Role:</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setRole("POS")}
              style={[
                styles.roleButton,
                role === "POS" && styles.selectedRole,
              ]}
            >
              <Text style={role === 'POS' ? styles.selectedRoleText : styles.roleText}>POS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRole("Kitchen")}
              style={[
                styles.roleButton,
                role === "Kitchen" && styles.selectedRole,
              ]}
            >
              <Text style={role === 'Kitchen' ? styles.selectedRoleText : styles.roleText}>Kitchen</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Button title="Create User" onPress={handleCreateUser} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.tint,
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  input: {
    height: 40,
    borderColor: Colors.light.tint,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10, // Added margin to separate buttons
  },
  selectedRole: {
    backgroundColor: Colors.light.tint,
  },
  roleText: {
      color: Colors.light.tint,
  },
  selectedRoleText: {
    color: Colors.light.background,
  },
});

export default UserRole;
