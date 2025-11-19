import DateTimePicker from '@react-native-community/datetimepicker';
import { PrismaClient } from '@prisma/client';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MultiSelect from 'react-native-multiple-select';
import RNPickerSelect from 'react-native-picker-select';
import { Colors } from '../../constants/theme';

const prisma = new PrismaClient();

interface Item {
  id: string;
  name: string;
}

interface Discount {
  id: number;
  name: string;
  percent: number;
  type: string;
  startDate: Date;
  expirationDate: Date;
  categories?: any[];
  foods?: any[];
}

const DiscountScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [selectedDiscountCategories, setSelectedDiscountCategories] = useState<string[]>([]);
  const [selectedDiscountFoods, setSelectedDiscountFoods] = useState<string[]>([]);
  const [discountName, setDiscountName] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [discountStart, setDiscountStart] = useState(new Date());
  const [discountExpiration, setDiscountExpiration] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showExpirationDatePicker, setShowExpirationDatePicker] = useState(false);
  const [categories, setCategories] = useState<Item[]>([]);
  const [foods, setFoods] = useState<Item[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<string[]>([]);

  const fetchDiscounts = async () => {
    const discountsList = await prisma.discount.findMany({
      include: {
        categories: true,
        foods: true,
      },
    });
    setDiscounts(discountsList);
  };

  useEffect(() => {
    if (modalVisible) {
      const fetchCategories = async () => {
        const categoriesList = await prisma.category.findMany();
        setCategories(categoriesList.map(c => ({ id: c.id.toString(), name: c.name })));
      };

      fetchCategories();
    } else {
      fetchDiscounts();
    }
  }, [modalVisible]);

  useEffect(() => {
    const fetchFoods = async () => {
      if (selectedCategories.length > 0) {
        const foodsList = await prisma.food.findMany({
          where: {
            categoryId: {
              in: selectedCategories.map(c => parseInt(c, 10)),
            },
          },
        });
        setFoods(foodsList.map(f => ({ id: f.id.toString(), name: f.name })));
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
          const categoryNames = selectedDiscount.categories.map(c => c.name);
          setSelectedDiscountCategories(categoryNames);
        } else {
          setSelectedDiscountCategories([]);
        }

        if (selectedDiscount.foods && selectedDiscount.foods.length > 0) {
          const foodNames = selectedDiscount.foods.map(f => f.name);
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
    return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`.toString();
  };

  const handleCreateDiscount = async () => {
    if (!discountName || !discountType || !discountPercent) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    try {
      await prisma.discount.create({
        data: {
          name: discountName,
          percent: parseFloat(discountPercent),
          type: discountType,
          startDate: discountStart,
          expirationDate: discountExpiration,
          categories: {
            connect: selectedCategories.map(id => ({ id: parseInt(id, 10) })),
          },
          foods: {
            connect: selectedFoods.map(id => ({ id: parseInt(id, 10) })),
          },
        },
      });
      Alert.alert('Success', 'Discount created successfully!');
      setModalVisible(false);
      // Reset form
      setDiscountName('');
      setDiscountPercent('');
      setDiscountType('');
      setDiscountStart(new Date());
      setDiscountExpiration(new Date());
      setSelectedCategories([]);
      setSelectedFoods([]);
    } catch (error) {
      console.error('Error creating discount: ', error);
      Alert.alert('Error', 'There was an error creating the discount.');
    }
  };

  const handleDeleteDiscount = async (discountId: number) => {
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
              await prisma.discount.delete({ where: { id: discountId } });
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
        <TextInput
            style={styles.input}
            onChangeText={setDiscountPercent}
            value={discountPercent}
            placeholder="Discount Percent"
            keyboardType="numeric"
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
        <Text>{item.percent}%</Text>
        <Text>Start: {formatDate(new Date(item.startDate))}</Text>
        <Text>Expires: {formatDate(new Date(item.expirationDate))}</Text>
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
        keyExtractor={item => item.id.toString()}
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
                <Text>{selectedDiscount.percent}%</Text>
                <Text>Start: {formatDate(new Date(selectedDiscount.startDate))}</Text>
                <Text>Expires: {formatDate(new Date(selectedDiscount.expirationDate))}</Text>

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