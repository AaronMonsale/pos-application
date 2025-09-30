import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
import { db } from '../../firebase';

interface Staff {
  id: string;
  name: string;
  pin: string;
}

const StaffManagementScreen = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  const fetchStaff = async () => {
    const staffCollection = collection(db, 'staff');
    const staffSnapshot = await getDocs(staffCollection);
    const staff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
    setStaffList(staff);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openModal = (staff: Staff | null = null) => {
    setEditingStaff(staff);
    setName(staff ? staff.name : '');
    setPin(staff ? staff.pin : '');
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!name || !pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
      Alert.alert('Invalid Input', 'Please enter a valid name and a 4-digit PIN.');
      return;
    }

    try {
      if (editingStaff) {
        const staffDoc = doc(db, 'staff', editingStaff.id);
        await updateDoc(staffDoc, { name, pin });
      } else {
        await addDoc(collection(db, 'staff'), { name, pin });
      }
      fetchStaff();
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error saving staff: ", error);
      Alert.alert('Error', 'There was a problem saving the staff member.');
    }
  };

  const handleDelete = async (staffId: string) => {
    Alert.alert(
      'Delete Staff',
      'Are you sure you want to delete this staff member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'staff', staffId));
              fetchStaff();
            } catch (error) {
              console.error("Error deleting staff: ", error);
              Alert.alert('Error', 'There was a problem deleting the staff member.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Staff }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.itemName}>{item.name}</Text>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={() => openModal(item)}>
          <Ionicons name="pencil" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 15 }}>
          <Ionicons name="trash" size={24} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={staffList}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.list}
      />
      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingStaff ? 'Edit Staff' : 'Add Staff'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="4-Digit PIN"
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    list: {
        flex: 1,
    },
    itemContainer: {
        backgroundColor: 'white',
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
    },
    itemName: {
        fontSize: 18,
    },
    itemActions: {
        flexDirection: 'row',
    },
    fab: {
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '90%',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginLeft: 10,
    },
    buttonCancel: {
        backgroundColor: '#ccc',
    },
    buttonSave: {
        backgroundColor: Colors.light.tint,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default StaffManagementScreen;