import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, Modal, FlatList, Alert } from 'react-native';
import { Colors } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from '../../firebase/firebaseConfig';

interface Food {
  id: string;
  name: string;
  price: number;
  description: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  foods: Food[];
}

interface Discount {
  id: string;
  name: string;
  percent: number;
  type: string;
  startDate: Timestamp;
  expirationDate: Timestamp;
  categories?: string[];
  foods?: string[];
}

const OrderItem = ({ name, price, onRemove }: { name: string, price: string, onRemove: () => void }) => (
  <View style={styles.orderItem}>
    <View>
        <Text style={styles.orderItemName}>{name}</Text>
        <Text style={styles.orderItemPrice}>{price}</Text>
    </View>
    <TouchableOpacity onPress={onRemove}>
        <Ionicons name="close-circle" size={24} color="red" />
    </TouchableOpacity>
  </View>
);

const PosScreen = () => {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDiscountModalVisible, setIsDiscountModalVisible] = useState(false);
  const [orderItems, setOrderItems] = useState<Food[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [total, setTotal] = useState(0);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    const fetchCategoriesAndDiscounts = async () => {
      const categoriesCollection = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(categoriesCollection);
      const categoriesList = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        foods: [],
      })) as Category[];
      setCategories(categoriesList);

      const discountsCollection = collection(db, 'discounts');
      const discountsSnapshot = await getDocs(discountsCollection);
      const discountsList = discountsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Discount[];
      setDiscounts(discountsList.filter(d => new Date() >= d.startDate.toDate() && new Date() <= d.expirationDate.toDate()));
    };

    fetchCategoriesAndDiscounts();
  }, []);

  useEffect(() => {
    const newSubtotal = orderItems.reduce((acc, item) => acc + item.price, 0);
    let newDiscountAmount = 0;

    if (appliedDiscount) {
      if (appliedDiscount.type === 'Entire Order') {
        newDiscountAmount = newSubtotal * (appliedDiscount.percent / 100);
      } else if (appliedDiscount.type === 'Category' && appliedDiscount.categories) {
        const discountedSubtotal = orderItems
          .filter(item => appliedDiscount.categories?.includes(item.categoryId))
          .reduce((acc, item) => acc + item.price, 0);
        newDiscountAmount = discountedSubtotal * (appliedDiscount.percent / 100);
      } else if (appliedDiscount.type === 'Food' && appliedDiscount.foods) {
        const discountedSubtotal = orderItems
          .filter(item => appliedDiscount.foods?.includes(item.id))
          .reduce((acc, item) => acc + item.price, 0);
        newDiscountAmount = discountedSubtotal * (appliedDiscount.percent / 100);
      }
    }

    const newTax = newSubtotal * 0.1; // 10% tax
    const newServiceCharge = newSubtotal * 0.1; // 10% service charge
    const newTotal = newSubtotal + newTax + newServiceCharge - newDiscountAmount;

    setSubtotal(newSubtotal);
    setDiscountAmount(newDiscountAmount);
    setTax(newTax);
    setServiceCharge(newServiceCharge);
    setTotal(newTotal);
  }, [orderItems, appliedDiscount]);

  const handleCategoryPress = async (category: Category) => {
    const categoryRef = doc(db, 'categories', category.id);
    const foodsCollectionRef = collection(categoryRef, 'foods');
    const foodsSnapshot = await getDocs(foodsCollectionRef);
    const foodsList = foodsSnapshot.docs.map(foodDoc => {
        const data = foodDoc.data();
        return { 
            id: foodDoc.id, 
            name: data.name, 
            price: data.price, 
            description: data.description,
            categoryId: category.id
        };
    }) as Food[];

    setSelectedCategory({ ...category, foods: foodsList });
    setIsModalVisible(true);
  };

  const navigateToSettings = () => {
    router.push('/(main)/pos-settings');
  };

  const addToOrder = (food: Food) => {
    setOrderItems([...orderItems, food]);
  };

  const removeItem = (indexToRemove: number) => {
    setOrderItems(orderItems.filter((_, index) => index !== indexToRemove));
  };

  const handlePay = async () => {
    if (orderItems.length === 0) {
      Alert.alert("Empty Order", "Please add items to the order before paying.");
      return;
    }

    try {
      await addDoc(collection(db, "transactions"), {
        items: orderItems,
        subtotal: subtotal,
        tax: tax,
        serviceCharge: serviceCharge,
        discount: discountAmount,
        total: total,
        createdAt: serverTimestamp(),
        currency: 'PHP',
      });
      Alert.alert("Payment Successful", "Transaction has been recorded.");
      setOrderItems([]);
      setAppliedDiscount(null);
    } catch (error) {
      console.error("Error processing payment: ", error);
      Alert.alert("Payment Error", "There was an error processing the payment.");
    }
  };

  const applyDiscount = (discount: Discount) => {
      setAppliedDiscount(discount);
      setIsDiscountModalVisible(false);
  }
  
  const renderFoodItem = ({ item }: { item: Food }) => (
    <TouchableOpacity onPress={() => { addToOrder(item); setIsModalVisible(false); }}>
        <View style={styles.foodItemContainer}>
        <Text style={styles.foodItemName}>{item.name}</Text>
        <Text style={styles.foodItemPrice}>₱{item.price.toFixed(2)}</Text>
        <Text style={styles.foodItemDescription}>{item.description}</Text>
        </View>
    </TouchableOpacity>
  );

  const renderDiscountItem = ({ item }: { item: Discount }) => (
    <TouchableOpacity onPress={() => applyDiscount(item)}>
        <View style={styles.foodItemContainer}>
            <Text style={styles.foodItemName}>{item.name}</Text>
            <Text>{item.percent}% - {item.type}</Text>
        </View>
    </TouchableOpacity>
  )

  const mainContent = (
    <View style={styles.mainContent}>
      <View style={styles.categoriesContainer}>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity key={category.id} style={styles.categoryTile} onPress={() => handleCategoryPress(category)}>
                <Text style={styles.categoryText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
      </View>
    </View>
  );

  const orderSidebar = (
    <View style={styles.orderContainer}>
      <Text style={styles.orderTitle}>Order</Text>
      <ScrollView>
        {orderItems.map((item, index) => (
          <OrderItem key={`${item.id}-${index}`} name={item.name} price={`₱${item.price.toFixed(2)}`} onRemove={() => removeItem(index)} />
        ))}
      </ScrollView>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text>Subtotal</Text>
          <Text>₱{subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>Tax</Text>
          <Text>₱{tax.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>Service Charge</Text>
          <Text>₱{serviceCharge.toFixed(2)}</Text>
        </View>
        {appliedDiscount && (
          <View style={styles.summaryRow}>
            <TouchableOpacity onPress={() => setAppliedDiscount(null)}>
                <Text style={{color: 'red'}}>Discount ({appliedDiscount.name})</Text>
            </TouchableOpacity>
            <Text style={{color: 'red'}}>-₱{discountAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.summaryRowTotal}>
          <Text style={styles.totalText}>TOTAL</Text>
          <Text style={styles.totalText}>₱{total.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {setOrderItems([]); setAppliedDiscount(null);}}><Text style={styles.actionButtonText}>CLEAR</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setIsDiscountModalVisible(true)}><Text style={styles.actionButtonText}>DISCOUNT</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.payButton]} onPress={handlePay}><Text style={styles.payButtonText}>PAY</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
        <Modal
            animationType="slide"
            transparent={true}
            visible={isModalVisible}
            onRequestClose={() => {
                setIsModalVisible(!isModalVisible);
            }}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>
                    <FlatList
                        data={selectedCategory?.foods}
                        renderItem={renderFoodItem}
                        keyExtractor={item => item.id}
                    />
                    <TouchableOpacity
                        style={[styles.button, styles.buttonClose]}
                        onPress={() => setIsModalVisible(!isModalVisible)}
                    >
                        <Text style={styles.textStyle}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

        <Modal
            animationType="slide"
            transparent={true}
            visible={isDiscountModalVisible}
            onRequestClose={() => {
                setIsDiscountModalVisible(!isDiscountModalVisible);
            }}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>Select a Discount</Text>
                    <FlatList
                        data={discounts}
                        renderItem={renderDiscountItem}
                        keyExtractor={item => item.id}
                        ListEmptyComponent={<Text>No active discounts available</Text>}
                    />
                    <TouchableOpacity
                        style={[styles.button, styles.buttonClose]}
                        onPress={() => setIsDiscountModalVisible(!isDiscountModalVisible)}
                    >
                        <Text style={styles.textStyle}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

      <View style={styles.header}>
        <Text style={styles.logo}>ONECORE</Text>
        <TouchableOpacity onPress={navigateToSettings}>
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
      {isLandscape ? (
        <View style={styles.landscapeLayout}>
          <View style={styles.leftPane}>
            <ScrollView>{mainContent}</ScrollView>
          </View>
          <View style={styles.rightPane}>
            {orderSidebar}
          </View>
        </View>
      ) : (
        <ScrollView>
            {mainContent}
            {orderSidebar}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        backgroundColor: Colors.light.tint,
        paddingHorizontal: 20,
        paddingVertical: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: 'sans-serif-condensed',
    },
    landscapeLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    leftPane: {
        flex: 3,
    },
    rightPane: {
        flex: 2,
        borderLeftWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#f9f9f9'
    },
    mainContent: {
        flex: 1,
    },
    categoriesContainer: {
        flex: 1,
        padding: 10,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
    },
    categoryTile: {
        width: '45%',
        margin: 5,
        height: 100,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Colors.light.tint,
    },
    categoryText: {
        fontWeight: 'bold',
        color: Colors.light.tint,
    },
    orderContainer: {
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#ccc',
        flex: 1, 
    },
    orderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    orderItemName: {
        fontSize: 16,
    },
    orderItemPrice: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryContainer: {
        marginTop: 'auto',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    summaryRowTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    totalText: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        flexWrap: 'wrap',
    },
    actionButton: {
        padding: 15,
        borderRadius: 5,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
        flexGrow: 1,
        margin: 2,
    },
    actionButtonText: {
        fontWeight: 'bold',
        color: '#333'
    },
    payButton: {
        backgroundColor: Colors.light.tint,
    },
    payButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
        maxHeight: '80%',
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2
    },
    buttonClose: {
        backgroundColor: "#2196F3",
        marginTop: 15,
    },
    textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center"
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: "center"
    },
    foodItemContainer: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        width: '100%'
    },
    foodItemName: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    foodItemPrice: {
        fontSize: 16,
        color: 'green'
    },
    foodItemDescription: {
        fontSize: 14,
        color: 'gray'
    }
});

export default PosScreen;
