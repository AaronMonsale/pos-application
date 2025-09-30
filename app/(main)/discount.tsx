import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MultiSelect from 'react-native-multiple-select';
import RNPickerSelect from 'react-native-picker-select';
import { Colors } from '../../constants/theme';
import { db } from '../../firebase/firebaseConfig'; // Adjust the import path as needed

interface Item {
  id: string;
  name: string;
}

interface Discount {
  id: string;
  name: string;
  value?: number;
  percent?: number;
  type: string;
  calculationType: 'value' | 'percentage';
  currency: string;
  startDate: Timestamp;
  expirationDate: Timestamp;
  categories?: string[];
  foods?: string[];
}

const DiscountScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [selectedDiscountCategories, setSelectedDiscountCategories] = useState<string[]>([]);
  const [selectedDiscountFoods, setSelectedDiscountFoods] = useState<string[]>([]);
  const [discountName, setDiscountName] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [discountCurrency, setDiscountCurrency] = useState('PHP');
  const [calculationType, setCalculationType] = useState<'value' | 'percentage'>('percentage');
  const [discountStart, setDiscountStart] = useState(new Date());
  const [discountExpiration, setDiscountExpiration] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showExpirationDatePicker, setShowExpirationDatePicker] = useState(false);
  const [categories, setCategories] = useState<Item[]>([]);
  const [foods, setFoods] = useState<Item[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);

  const fetchDiscounts = async () => {
    const discountsCollection = collection(db, 'discounts');
    const discountSnapshot = await getDocs(discountsCollection);
    const discountsList = discountSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Discount));
    setDiscounts(discountsList);
  };

  useEffect(() => {
    if (modalVisible) {
      const fetchCategories = async () => {
        const categoriesCollection = collection(db, 'categories');
        const categorySnapshot = await getDocs(categoriesCollection);
        const categoriesList = categorySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setCategories(categoriesList);
      };

      fetchCategories();
    } else {
      fetchDiscounts();
    }
  }, [modalVisible]);

  useEffect(() => {
    const fetchFoods = async () => {
      if (selectedCategories.length > 0) {
        let allFoods: Item[] = [];
        for (const categoryId of selectedCategories) {
          const foodsCollectionRef = collection(db, 'categories', categoryId, 'foods');
          const foodSnapshot = await getDocs(foodsCollectionRef);
          const foodsList = foodSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
          allFoods = [...allFoods, ...foodsList];
        }
        setFoods(allFoods);
      } else {
        setFoods([]);
      }
      setSelectedFoods([]);
    };

    fetchFoods();
  }, [selectedCategories]);

  useEffect(() => {
    if (selectedDiscount) {
      const fetchDetails = async () => {
        if (selectedDiscount.categories && selectedDiscount.categories.length > 0) {
          const categoryNames = [];
          for (const categoryId of selectedDiscount.categories) {
            const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
            if (categoryDoc.exists()) {
              categoryNames.push(categoryDoc.data().name);
            }
          }
          setSelectedDiscountCategories(categoryNames);
        } else {
            setSelectedDiscountCategories([]);
        }

        if (selectedDiscount.foods && selectedDiscount.foods.length > 0) {
            const foodNames = [];
            const allCategoriesSnapshot = await getDocs(collection(db, 'categories'));
            for (const categoryDoc of allCategoriesSnapshot.docs) {
                const foodsCollectionRef = collection(db, 'categories', categoryDoc.id, 'foods');
                const foodSnapshot = await getDocs(foodsCollectionRef);
                for (const foodDoc of foodSnapshot.docs) {
                    if (selectedDiscount.foods.includes(foodDoc.id)) {
                        foodNames.push(foodDoc.data().name);
                    }
                }
            }
            setSelectedDiscountFoods(foodNames);
        } else {
            setSelectedDiscountFoods([]);
        }
      };
      fetchDetails();
    }
  }, [selectedDiscount]);

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || discountStart;
    setShowStartDatePicker(Platform.OS === 'ios');
    setDiscountStart(currentDate);
  };

  const onExpirationDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || discountExpiration;
    setShowExpirationDatePicker(Platform.OS === 'ios');
    setDiscountExpiration(currentDate);
  };

  const formatDate = (date: Date) => {
    if (!date) return '';
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
  };

  const handleCreateDiscount = async () => {
    if (!discountName || !discountType) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const discountData: any = {
        name: discountName,
        type: discountType,
        calculationType: calculationType,
        currency: discountCurrency,
        startDate: discountStart,
        expirationDate: discountExpiration,
        categories: selectedCategories,
        foods: selectedFoods,
    };

    if (calculationType === 'percentage') {
        if (!discountPercent) {
            Alert.alert('Error', 'Please enter a discount percentage.');
            return;
        }
        discountData.percent = parseFloat(discountPercent);
    } else {
        if (!discountValue) {
            Alert.alert('Error', 'Please enter a discount value.');
            return;
        }
        discountData.value = parseFloat(discountValue);
    }

    try {
      await addDoc(collection(db, 'discounts'), discountData);
      Alert.alert('Success', 'Discount created successfully!');
      setModalVisible(false);
      // Reset form
      setDiscountName('');
      setDiscountValue('');
      setDiscountPercent('');
      setDiscountType('');
      setDiscountCurrency('PHP');
      setCalculationType('percentage');
      setDiscountStart(new Date());
      setDiscountExpiration(new Date());
      setSelectedCategories([]);
      setSelectedFoods([]);
    } catch (error) {
      console.error('Error creating discount: ', error);
      Alert.alert('Error', 'There was an error creating the discount.');
    }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    Alert.alert(
      "Delete Discount",
      "Are you sure you want to delete this discount?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "OK",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "discounts", discountId));
              Alert.alert("Success", "Discount deleted successfully!");
              setDetailsModalVisible(false);
              fetchDiscounts();
            } catch (error) {
              console.error("Error deleting discount: ", error);
              Alert.alert("Error", "There was an error deleting the discount.");
            }
          }
        }
      ]
    );
  };

  const renderForm = () => (
    <>
      <TextInput
        style={styles.input}
        onChangeText={setDiscountName}
        value={discountName}
        placeholder="Discount Name"
      />
        <View style={styles.pickerContainer}>
            <RNPickerSelect
                onValueChange={(value) => setCalculationType(value)}
                items={[
                    { label: 'Percentage', value: 'percentage' },
                    { label: 'Value', value: 'value' },
                ]}
                style={pickerSelectStyles}
                placeholder={{ label: "Select calculation type", value: 'percentage' }}
                value={calculationType}
            />
        </View>

        <TextInput
            style={calculationType === 'percentage' ? styles.input : styles.disabledInput}
            onChangeText={setDiscountPercent}
            value={discountPercent}
            placeholder="Discount Percent"
            keyboardType="numeric"
            editable={calculationType === 'percentage'}
        />
        <TextInput
            style={calculationType === 'value' ? styles.input : styles.disabledInput}
            onChangeText={setDiscountValue}
            value={discountValue}
            placeholder="Discount Value"
            keyboardType="numeric"
            editable={calculationType === 'value'}
        />
      <View style={styles.pickerContainer}>
        <RNPickerSelect
            onValueChange={(value) => setDiscountType(value)}
            items={[
                { label: 'Entire Order', value: 'Entire Order' },
                { label: 'Category', value: 'Category' },
                { label: 'Food', value: 'Food' },
            ]}
            style={pickerSelectStyles}
            placeholder={{ label: "Select a discount type", value: null }}
            value={discountType}
        />
      </View>
      
      {(discountType === 'Category' || discountType === 'Food') && (
        <View style={styles.multiselectContainer}>
            <MultiSelect
            items={categories}
            uniqueKey="id"
            onSelectedItemsChange={setSelectedCategories}
            selectedItems={selectedCategories}
            selectText="Pick Categories"
            searchInputPlaceholderText="Search Categories..."
            tagRemoveIconColor={Colors.light.tint}
            tagBorderColor={Colors.light.tint}
            tagTextColor={Colors.light.tint}
            selectedItemTextColor={Colors.light.tint}
            selectedItemIconColor={Colors.light.tint}
            itemTextColor="#000"
            displayKey="name"
            searchInputStyle={{ color: '#CCC' }}
            submitButtonColor={Colors.light.tint}
            submitButtonText="Submit"
            />
        </View>
      )}

      {discountType === 'Food' && selectedCategories.length > 0 && (
        <View style={styles.multiselectContainer}>
            <MultiSelect
            items={foods}
            uniqueKey="id"
            onSelectedItemsChange={setSelectedFoods}
            selectedItems={selectedFoods}
            selectText="Pick Foods"
            searchInputPlaceholderText="Search Foods..."
            tagRemoveIconColor={Colors.light.tint}
            tagBorderColor={Colors.light.tint}
            tagTextColor={Colors.light.tint}
            selectedItemTextColor={Colors.light.tint}
            selectedItemIconColor={Colors.light.tint}
            itemTextColor="#000"
            displayKey="name"
            searchInputStyle={{ color: '#CCC' }}
            submitButtonColor={Colors.light.tint}
            submitButtonText="Submit"
            />
        </View>
      )}

      <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.datePickerInput}>
        <Text>{`Discount Start: ${formatDate(discountStart)}`}</Text>
      </TouchableOpacity>
      {showStartDatePicker && (
        <DateTimePicker
          testID="startDatePicker"
          value={discountStart}
          mode={'date'}
          is24Hour={true}
          display="default"
          onChange={onStartDateChange}
        />
      )}
      <TouchableOpacity onPress={() => setShowExpirationDatePicker(true)} style={styles.datePickerInput}>
        <Text>{`Discount Expiration: ${formatDate(discountExpiration)}`}</Text>
      </TouchableOpacity>
      {showExpirationDatePicker && (
        <DateTimePicker
          testID="expirationDatePicker"
          value={discountExpiration}
          mode={'date'}
          is24Hour={true}
          display="default"
          onChange={onExpirationDateChange}
        />
      )}
    </>
  )

  const renderDiscountItem = ({ item }: { item: Discount }) => (
    <TouchableOpacity onPress={() => {
      setSelectedDiscount(item);
      setDetailsModalVisible(true);
    }}>
      <View style={styles.discountItem}>
        <Text style={styles.discountName}>{item.name}</Text>
        <Text>{item.calculationType === 'percentage' ? `${item.percent}%` : `${item.currency} ${item.value}`} ({item.calculationType})</Text>
        <Text>Start: {item.startDate && formatDate(item.startDate.toDate())}</Text>
        <Text>Expires: {item.expirationDate && formatDate(item.expirationDate.toDate())}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.createButtonText}>Create Discount</Text>
      </TouchableOpacity>

      <FlatList
        data={discounts}
        renderItem={renderDiscountItem}
        keyExtractor={item => item.id}
        style={{width: '100%'}}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.centeredView}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalText}>CREATE DISCOUNT</Text>
            <FlatList
                data={[]}
                renderItem={null}
                keyExtractor={(item, index) => index.toString()}
                ListHeaderComponent={<>{renderForm()}</>}
                showsVerticalScrollIndicator={false}
                style={{width: '100%'}}
            />
            <TouchableOpacity
                style={[styles.modalButton, styles.createModalButton]}
                onPress={handleCreateDiscount}
            >
                <Text style={styles.modalButtonText}>CREATE</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.modalButton, styles.closeModalButton]}
                onPress={() => setModalVisible(!modalVisible)}
            >
                <Text style={styles.modalButtonText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {selectedDiscount && (
              <>
                <Text style={styles.modalText}>{selectedDiscount.name}</Text>
                <Text>{selectedDiscount.calculationType === 'percentage' ? `${selectedDiscount.percent}%` : `${selectedDiscount.currency} ${selectedDiscount.value}`} ({selectedDiscount.calculationType})</Text>
                <Text>Start: {selectedDiscount.startDate && formatDate(selectedDiscount.startDate.toDate())}</Text>
                <Text>Expires: {selectedDiscount.expirationDate && formatDate(selectedDiscount.expirationDate.toDate())}</Text>

                {selectedDiscountCategories.length > 0 && (
                    <>
                        <Text style={styles.detailHeader}>Applied to Categories:</Text>
                        {selectedDiscountCategories.map(name => <Text key={name}>{name}</Text>)}
                    </>
                )}
                {selectedDiscountFoods.length > 0 && (
                    <>
                        <Text style={styles.detailHeader}>Applied to Foods:</Text>
                        {selectedDiscountFoods.map(name => <Text key={name}>{name}</Text>)}
                    </>
                )}

                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteModalButton, {marginTop: 20}] }
                  onPress={() => handleDeleteDiscount(selectedDiscount.id)}
                >
                  <Text style={styles.modalButtonText}>DELETE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.closeModalButton, {marginTop: 10}] }
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>CLOSE</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingTop: 20,
  },
  createButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '90%',
    marginBottom: 20,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 10,
    width: '100%',
    textAlign: 'center',
  },
  disabledInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 10,
    width: '100%',
    textAlign: 'center',
    backgroundColor: '#f2f2f2',
    color: '#a9a9a9',
  },
  multiselectContainer: {
    width: '100%',
    marginVertical: 10,
  },
  pickerContainer: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginVertical: 10,
  },
  datePickerInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 10,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalButton: {
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    marginVertical: 5,
    width: '100%',
    alignItems: 'center',
  },
  createModalButton: {
    backgroundColor: Colors.light.tint,
    marginTop: 15
  },
  closeModalButton: {
    backgroundColor: Colors.light.tint,
  },
  deleteModalButton: {
    backgroundColor: 'red',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  discountItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  discountName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailHeader: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 4,
        color: 'black',
        paddingRight: 30, // to ensure the text is never behind the icon
        textAlign: 'center',
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 8,
        color: 'black',
        paddingRight: 30, // to ensure the text is never behind the icon
        textAlign: 'center',
    },
});

export default DiscountScreen;
