import { MaterialIcons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';
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
  const [screen, setScreen] = useState('list'); // 'list', 'createCategory', 'addFood', 'categoryDetails', 'editCategory', 'editFood'
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodPrice, setNewFoodPrice] = useState('');
  const [newFoodDescription, setNewFoodDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingFood, setEditingFood] = useState<Food | null>(null);

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

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName) {
      Alert.alert('Error', 'Invalid data for update.');
      return;
    }
    try {
      const categoryRef = doc(db, 'categories', editingCategory.id);
      await updateDoc(categoryRef, { name: newCategoryName });
      setNewCategoryName('');
      setEditingCategory(null);
      fetchCategories();
      navigateToList();
      Alert.alert('Success', 'Category updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update category.');
    }
  };

  const handleUpdateFood = async () => {
    if (!editingFood || !selectedCategory || !newFoodName || !newFoodPrice) {
      Alert.alert('Error', 'Invalid data for update.');
      return;
    }
    try {
      const foodRef = doc(db, 'categories', selectedCategory.id, 'foods', editingFood.id);
      await updateDoc(foodRef, {
        name: newFoodName,
        price: parseFloat(newFoodPrice),
        description: newFoodDescription,
      });

      setNewFoodName('');
      setNewFoodPrice('');
      setNewFoodDescription('');
      setEditingFood(null);

      // Re-fetch foods to show the updated item.
      handleSelectCategory(selectedCategory);
      setScreen('categoryDetails');
      Alert.alert('Success', 'Food updated successfully');
    } catch (error) {
      console.error("Error updating food: ", error);
      Alert.alert('Error', 'Failed to update food.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category and all its food items?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'categories', categoryId));
              fetchCategories();
              navigateToList();
              Alert.alert('Success', 'Category deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete category.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteFood = async (foodId: string) => {
    if (!selectedCategory) return;

    Alert.alert(
      'Delete Food',
      'Are you sure you want to delete this food item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'categories', selectedCategory.id, 'foods', foodId));
              // Re-fetch foods to show the updated list.
              handleSelectCategory(selectedCategory);
              Alert.alert('Success', 'Food deleted successfully');
            } catch (error) {
              console.error("Error deleting food: ", error);
              Alert.alert('Error', 'Failed to delete food.');
            }
          }
        }
      ]
    );
  };


  const renderFoodItem = ({ item }: { item: Food }) => (
    <View style={styles.foodItem}>
      <Text style={styles.foodName}>{item.name}</Text>
      <View style={styles.foodIconContainer}>
        <TouchableOpacity onPress={() => {
          setEditingFood(item);
          setNewFoodName(item.name);
          setNewFoodPrice(item.price.toString());
          setNewFoodDescription(item.description);
          setScreen('editFood');
        }}>
          <MaterialIcons name="edit" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteFood(item.id)}>
          <MaterialIcons name="delete" size={24} color="red" />
        </TouchableOpacity>
      </View>
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

  if (screen === 'editCategory') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={navigateToList} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Categories</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Category</Text>
        <TextInput
          style={styles.input}
          placeholder="Category Name"
          value={newCategoryName}
          onChangeText={setNewCategoryName}
        />
        <TouchableOpacity style={styles.actionButton} onPress={handleUpdateCategory}>
          <Text style={styles.actionButtonText}>Update Category</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'editFood') {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={() => setScreen('categoryDetails')} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to {selectedCategory?.name}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Food</Text>
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
        <TouchableOpacity style={styles.actionButton} onPress={handleUpdateFood}>
          <Text style={styles.actionButtonText}>Update Food</Text>
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
              <View style={styles.iconContainer}>
                <TouchableOpacity onPress={(e) => {
                  e.stopPropagation();
                  setEditingCategory(category);
                  setNewCategoryName(category.name);
                  setScreen('editCategory');
                }}>
                  <MaterialIcons name="edit" size={24} color={Colors.light.tint} />
                </TouchableOpacity>
                <TouchableOpacity onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteCategory(category.id)
                  }}>
                  <MaterialIcons name="delete" size={24} color="red" />
                </TouchableOpacity>
              </View>
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
    justifyContent: 'space-around',
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
    padding: 10,
  },
  categoryText: {
    fontWeight: 'bold',
    color: Colors.light.tint,
    fontSize: 16,
    marginBottom: 10,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodName: {
    fontSize: 18,
    fontWeight: 'bold',
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
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  foodIconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 60,
  }
});

export default MenuManagement;
