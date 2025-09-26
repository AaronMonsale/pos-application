import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, TextInput, Alert } from 'react-native';
import { Colors } from '../../constants/theme';
import { collection, addDoc, getDocs, doc } from "firebase/firestore";
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

const MenuManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [screen, setScreen] = useState('list'); // 'list', 'createCategory', 'addFood', 'categoryDetails'
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodPrice, setNewFoodPrice] = useState('');
  const [newFoodDescription, setNewFoodDescription] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const categoriesCollection = collection(db, 'categories');
    const categoriesSnapshot = await getDocs(categoriesCollection);
    const categoriesList = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      foods: [], // Initialize with empty foods
    })) as Category[];
    setCategories(categoriesList);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName) {
      Alert.alert('Error', 'Please enter a category name.');
      return;
    }
    try {
      await addDoc(collection(db, 'categories'), { name: newCategoryName });
      setNewCategoryName('');
      fetchCategories();
      navigateToList();
      Alert.alert('Success', 'Category created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create category.');
    }
  };

  const handleAddFood = async () => {
    if (!newFoodName || !newFoodPrice) {
      Alert.alert('Error', 'Please enter food name and price.');
      return;
    }
    if (!selectedCategory) {
        Alert.alert('Error', 'No category selected.');
        return;
      }
    try {
        const categoryRef = doc(db, "categories", selectedCategory.id);
        const foodsCollectionRef = collection(categoryRef, "foods");
        await addDoc(foodsCollectionRef, {
            name: newFoodName,
            price: parseFloat(newFoodPrice),
            description: newFoodDescription,
          });

      setNewFoodName('');
      setNewFoodPrice('');
      setNewFoodDescription('');

      // Re-fetch foods for the current category to show the new item.
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
      setSelectedCategory(prevCategory => ({ ...prevCategory!, foods: foodsList }));

      setScreen('categoryDetails');
      Alert.alert('Success', 'Food added successfully');
    } catch (error) {
      console.error("Error adding food: ", error);
      Alert.alert('Error', 'Failed to add food.');
    }
  };

  const handleSelectCategory = async (category: Category) => {
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
    setScreen('categoryDetails');
  };

  const renderFoodItem = ({ item }: { item: Food }) => (
    <View style={styles.foodItem}>
      <Text style={styles.foodName}>{item.name}</Text>
    </View>
  );

  const navigateToList = () => {
    setSelectedCategory(null);
    setScreen('list');
  }

  if (screen === 'createCategory') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={navigateToList} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Categories</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create New Category</Text>
        <TextInput
          style={styles.input}
          placeholder="Category Name"
          value={newCategoryName}
          onChangeText={setNewCategoryName}
        />
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateCategory}>
          <Text style={styles.actionButtonText}>Save Category</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'addFood') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setScreen('categoryDetails')} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to {selectedCategory?.name}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add New Food</Text>
        <TextInput
          style={styles.input}
          placeholder="Food Name"
          value={newFoodName}
          onChangeText={setNewFoodName}
        />
        <TextInput
          style={styles.input}
          placeholder="Price"
          keyboardType="numeric"
          value={newFoodPrice}
          onChangeText={setNewFoodPrice}
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          multiline
          value={newFoodDescription}
          onChangeText={setNewFoodDescription}
        />
        <TouchableOpacity style={styles.actionButton} onPress={handleAddFood}>
          <Text style={styles.actionButtonText}>Save Food</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'categoryDetails') {
    if (!selectedCategory) return null;
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={navigateToList} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Categories</Text>
        </TouchableOpacity>
        <Text style={styles.categoryTitle}>{selectedCategory.name}</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setScreen('addFood')}>
          <Text style={styles.createButtonText}>Add Food</Text>
        </TouchableOpacity>
        <FlatList
          data={selectedCategory.foods}
          renderItem={renderFoodItem}
          keyExtractor={(item) => item.id}
          style={styles.foodList}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createButton} onPress={() => setScreen('createCategory')}>
        <Text style={styles.createButtonText}>Create Category</Text>
      </TouchableOpacity>
      <ScrollView style={styles.categoriesContainer}>
        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <TouchableOpacity key={category.id} style={styles.categoryTile} onPress={() => handleSelectCategory(category)}>
              <Text style={styles.categoryText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  createButton: {
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    flex: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryTile: {
    width: '48%',
    marginVertical: 8,
    height: 120,
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
    fontSize: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: Colors.light.tint,
    fontSize: 16,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.tint,
    textAlign: 'center',
    marginBottom: 16,
  },
  foodList: {
    flex: 1,
  },
  foodItem: {
    backgroundColor: '#fff',
    padding: 20,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  foodName: {
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.tint,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    fontSize: 16,
  },
  actionButton: {
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MenuManagement;
