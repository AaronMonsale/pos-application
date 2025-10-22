import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from '../../constants/theme';
import { auth, db } from "../../firebase";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegisterButton, setShowRegisterButton] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUsers = async () => {
      try {
        const usersCollection = collection(db, "users");
        const q = query(usersCollection, limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setShowRegisterButton(true);
        }
      } catch (error) {
        console.error("Error checking for users:", error);
        Alert.alert("Error", "Could not check for existing users.");
      }
    };

    checkUsers();
  }, []);

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
        // Role-based redirection
        if (userData.role === "admin") {
          router.replace("/(main)/admin");
        } else if (userData.role === "Kitchen") {
          router.replace("/(main)/kitchen");
        } else {
          router.replace("/(main)/tables");
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
      {showRegisterButton && (
        <TouchableOpacity style={[styles.button, styles.registerButton]} onPress={() => router.push("/(auth)/register")}>
          <Text style={[styles.buttonText, styles.registerButtonText]}>Register</Text>
        </TouchableOpacity>
      )}
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
