
import { View, Text, TextInput, Alert, Image, StyleSheet, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { Colors } from '../../constants/theme';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Get user role from Firestore
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.role === "admin") {
          router.replace("/(main)/dashboard");
        } else {
          router.replace("/(main)/orders");
        }
      } else {
        Alert.alert("Error", "User data not found!");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/images/onecore_consultancy_inc_logo.jpg')} style={styles.logo} />
      <Text style={styles.title}>Login</Text>
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
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.registerButton]} onPress={() => router.push("/(auth)/register")}>
        <Text style={[styles.buttonText, styles.registerButtonText]}>Register</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  logo: {
    width: 200,
    height: 100,
    alignSelf: "center",
    marginBottom: 24,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: "center",
    color: Colors.light.tint,
  },
  input: {
    height: 40,
    borderColor: Colors.light.tint,
    borderWidth: 1,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderRadius: 5,
  },
  button: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  registerButtonText: {
    color: Colors.light.tint,
  }
});

export default Login;
