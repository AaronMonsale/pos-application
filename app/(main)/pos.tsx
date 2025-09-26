import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, FlatList } from 'react-native';
import { Colors } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc } from "firebase/firestore";
import { db } from '../../firebase';

interface Food {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface Category {
  id: string;
  name: string;
  foods: Food[];
}

const OrderItem = ({ name, price }: { name: string, price: string }) => (
  <View style={styles.orderItem}>
    <Text style={styles.orderItemName}>{name}</Text>
    <Text style={styles.orderItemPrice}>{price}</Text>
  </View>
);

const PosScreen = () => {
  const router = useRouter();
  const isTablet = Dimensions.get('window').width >= 768;
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const categoriesCollection = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(categoriesCollection);
      const categoriesList = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        foods: [],
      })) as Category[];
      setCategories(categoriesList);
    };

    fetchCategories();
  }, []);

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
            description: data.description 
        };
    }) as Food[];

    setSelectedCategory({ ...category, foods: foodsList });
    setIsModalVisible(true);
  };

  const navigateToSettings = () => {
    router.push('/(main)/pos-settings');
  };

  const renderFoodItem = ({ item }: { item: Food }) => (
    <View style={styles.foodItemContainer}>
      <Text style={styles.foodItemName}>{item.name}</Text>
      <Text style={styles.foodItemPrice}>${item.price.toFixed(2)}</Text>
      <Text style={styles.foodItemDescription}>{item.description}</Text>
    </View>
  );

  const mainContent = (
    <View style={styles.mainContent}>
      <View style={styles.categoriesContainer}>
        <ScrollView>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity key={category.id} style={styles.categoryTile} onPress={() => handleCategoryPress(category)}>
                <Text style={styles.categoryText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );

  const orderSidebar = (
    <View style={styles.orderContainer}>
      <Text style={styles.orderTitle}>Order #17</Text>
      <ScrollView>
        <OrderItem name="Beef Tongue Curry Don" price="Rp19.013" />
      </ScrollView>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text>Subtotal</Text>
          <Text>Rp19.013</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>Tax</Text>
          <Text>Rp3.087</Text>
        </View>
        <View style={styles.summaryRowTotal}>
          <Text style={styles.totalText}>TOTAL</Text>
          <Text style={styles.totalText}>Rp23.000</Text>
        </View>
      </View>
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButton}><Text style={styles.actionButtonText}>CLEAR</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}><Text style={styles.actionButtonText}>SEND</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}><Text style={styles.actionButtonText}>DISCOUNT</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.payButton]}><Text style={styles.payButtonText}>PAY</Text></TouchableOpacity>
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

      <View style={styles.header}>
        <Text style={styles.logo}>ONECORE</Text>
        <TouchableOpacity onPress={navigateToSettings}>
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
      {isTablet ? (
        <View style={styles.tabletLayout}>
          <View style={styles.leftPane}>{orderSidebar}</View>
          <View style={styles.rightPane}>{mainContent}</View>
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
    tabletLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    leftPane: {
        flex: 2,
        borderRightWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#f9f9f9'
    },
    rightPane: {
        flex: 3,
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
    },
    orderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
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
        marginTop: 20,
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
        elevation: 5
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2
    },
    buttonClose: {
        backgroundColor: "#2196F3",
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
