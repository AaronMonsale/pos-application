import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { auth, db } from '../../firebase';

// --- Interfaces ---
interface Food { id: string; name: string; price: number; description: string; categoryId: string; }
interface OrderItemType { id: string; food: Food; quantity: number; discount?: number | null; note?: string; }
interface Category { id: string; name: string; foods: Food[]; }
interface Discount { id: string; name: string; percent: number; type: string; startDate: Timestamp; expirationDate: Timestamp; categories?: string[]; foods?: string[]; }
interface Staff { id: string; name: string; pin: string; }

// --- Sub-components ---
const OrderItem = ({ item, onRemove, onIncrement, onDecrement, onPress }: { item: OrderItemType, onRemove: () => void, onIncrement: () => void, onDecrement: () => void, onPress: () => void }) => (
    <TouchableOpacity onPress={onPress}>
        <View style={styles.orderItem}>
            <View style={{ flex: 1 }}>
                <Text style={styles.orderItemName}>{item.food.name} <Text style={{fontWeight: 'normal'}}>x{item.quantity}</Text></Text>
                {item.discount && <Text style={styles.itemDiscountText}>{`Discount: ${item.discount}%`}</Text>}
                {item.note && <Text style={styles.itemNoteText}>{`Note: ${item.note}`}</Text>}
                <Text style={styles.orderItemPrice}>{`₱${(item.food.price * item.quantity * (1 - (item.discount || 0) / 100)).toFixed(2)}`}</Text>
            </View>
            <View style={styles.quantityControl}>
                <TouchableOpacity onPress={onDecrement}><Ionicons name="remove-circle-outline" size={24} color={Colors.light.tint} /></TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity onPress={onIncrement}><Ionicons name="add-circle" size={24} color={Colors.light.tint} /></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onRemove} style={{ marginLeft: 10 }}><Ionicons name="trash-bin-outline" size={24} color="red" /></TouchableOpacity>
        </View>
    </TouchableOpacity>
);

// --- Main Component ---
const PosScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { tableId, tableName, staff: staffJson } = params as { tableId: string; tableName: string; staff?: string };
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // --- State ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDiscountModalVisible, setIsDiscountModalVisible] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItemType[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [total, setTotal] = useState(0);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isItemEditorVisible, setIsItemEditorVisible] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItemType | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isTableOccupied, setIsTableOccupied] = useState(false);
  const [occupiedBy, setOccupiedBy] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(() => { try { return staffJson ? JSON.parse(staffJson) : null; } catch (e) { return null; } });
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [selectedStaffForLogin, setSelectedStaffForLogin] = useState<Staff | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const isSystemLocked = !currentStaff;
  
  const handleBack = () => {
    router.back();
  }

  // --- Data Fetching and Real-time Listeners ---

  // Effect for fetching static data like categories and staff list once
  useEffect(() => {
    const fetchStaticData = async () => {
        try {
            const categoriesSnapshot = await getDocs(collection(db, 'categories'));
            const categoriesList = categoriesSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, foods: [] })) as Category[];
            setCategories(categoriesList);

            const discountsSnapshot = await getDocs(collection(db, 'discounts'));
            const allDiscounts = discountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Discount[];
            const activeDiscounts = allDiscounts.filter(d => new Date() >= d.startDate.toDate() && new Date() <= d.expirationDate.toDate());
            setDiscounts(activeDiscounts);

            const staffSnapshot = await getDocs(collection(db, 'staff'));
            const allStaff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setStaffList(allStaff);

        } catch (error) {
            console.error("Failed to fetch static data:", error);
            Alert.alert("Error", "Failed to load essential page data.");
        }
    };
    fetchStaticData();
  }, []);

  // Effect for setting up the real-time listener for the table's order data
  useEffect(() => {
    if (!tableId) return; // Don't run if there's no tableId

    const tableDocRef = doc(db, 'tables', tableId);
    
    // onSnapshot creates the listener and returns an unsubscribe function
    const unsubscribe = onSnapshot(tableDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const tableData = docSnap.data();
            
            // Update the table status in real-time
            setIsTableOccupied(tableData.occupied || false);
            setOccupiedBy(tableData.occupiedBy || null);
            
            // Update the order items from the database
            const orderFromDb = (tableData.order || []).map((item: any, index: number) => ({
                ...item,
                id: `${item.food.id}-${Date.now()}-${index}` // Create a unique ID for the FlatList
            }));

            // Only update state if the order has actually changed
            if (JSON.stringify(orderFromDb) !== JSON.stringify(orderItems)) {
                setOrderItems(orderFromDb);
            }
        } else {
            console.error("Table document not found!");
            Alert.alert("Error", "Could not find the specified table.", [
                { text: "OK", onPress: () => router.back() }
            ]);
        }
    }, (error) => {
        console.error("Failed to listen to table changes:", error);
        Alert.alert("Error", "Lost connection to the table data.");
    });

    // Cleanup function: This will be called when the component unmounts
    // or when the tableId changes, preventing memory leaks.
    return () => unsubscribe();
    
  }, [tableId]); // Dependency array: ensures this effect re-runs if the user navigates to a different table

  useEffect(() => {
    const newSubtotal = orderItems.reduce((acc, item) => acc + (item.food.price * item.quantity), 0);
    const totalItemDiscount = orderItems.reduce((acc, item) => acc + (item.discount ? (item.food.price * item.quantity) * (item.discount / 100) : 0), 0);
    let totalDiscountFromGlobal = 0;
    if (appliedDiscount) {
        const subtotalForGlobalDiscount = orderItems.reduce((acc, item) => {
            if ( (appliedDiscount.type === 'Entire Order') || (appliedDiscount.type === 'Category' && appliedDiscount.categories?.includes(item.food.categoryId)) || (appliedDiscount.type === 'Food' && appliedDiscount.foods?.includes(item.food.id)) ) {
                return acc + (item.food.price * item.quantity * (1 - (item.discount || 0) / 100));
            } return acc; }, 0);
        totalDiscountFromGlobal = subtotalForGlobalDiscount * (appliedDiscount.percent / 100);
    }
    const totalDiscount = totalItemDiscount + totalDiscountFromGlobal;
    const subtotalAfterDiscounts = newSubtotal - totalDiscount;
    const newTax = subtotalAfterDiscounts * 0.1;
    const newServiceCharge = subtotalAfterDiscounts * 0.1;
    const newTotal = subtotalAfterDiscounts + newTax + newServiceCharge;
    setSubtotal(newSubtotal); setDiscountAmount(totalDiscount); setTax(newTax); setServiceCharge(newServiceCharge); setTotal(newTotal);
  }, [orderItems, appliedDiscount]);

  const handleSaveOrder = async () => {
    if (!currentStaff) {
      Alert.alert("Login Required", "Please log in before saving an order.");
      return;
    }
    
    if (orderItems.length === 0) {
      try {
        const tableDoc = doc(db, 'tables', tableId);
        await updateDoc(tableDoc, { 
            occupied: false, 
            occupiedBy: null, 
            staffId: null, 
            order: [],
            status: 'available' // Reset status when cleared
        });
        Alert.alert("Table Cleared", `${tableName} is now available.`, [
          { text: "OK", onPress: () => router.replace('/(main)/tables') }
        ]);
      } catch (error) {
        console.error("Error clearing order: ", error);
        Alert.alert("Error", "Could not clear the order from the table.");
      }
      return;
    }

    try {
      const tableDocRef = doc(db, 'tables', tableId);
      
      // Get the current table data to check the status
      const tableDocSnap = await getDoc(tableDocRef);
      const currentStatus = tableDocSnap.exists() ? tableDocSnap.data().status : null;

      const orderToSave = orderItems.map(item => ({
        food: item.food,
        quantity: item.quantity,
        discount: item.discount || null,
        note: item.note || '',
      }));
      
      const updateData: any = {
        occupied: true,
        occupiedBy: currentStaff.name,
        staffId: currentStaff.id,
        order: orderToSave,
        status: 'serving', // This status will make the order appear in the kitchen
      };

      // Only set a new timestamp if it's a new order for the kitchen
      // This prevents the order from losing its place in the queue on every update
      if (currentStatus !== 'serving') {
        updateData.orderPlacedAt = serverTimestamp();
      }
      
      await updateDoc(tableDocRef, updateData);

      // Navigate to the pending order screen
      router.replace({
        pathname: '/(main)/pending-order',
        params: { tableId, tableName },
      });

    } catch (error) {
      console.error("Error saving order: ", error);
      Alert.alert("Error", "Could not save the order to the table.");
    }
  };

  const handlePay = async () => {
    if (orderItems.length === 0) return Alert.alert("Empty Order", "Cannot process an empty order.");
    try {
        const transactionItems = orderItems.map(item => ({ id: item.food.id, name: item.food.name, price: item.food.price, quantity: item.quantity, discount: item.discount || 0, note: item.note || '', total: item.food.price * item.quantity * (1 - (item.discount || 0) / 100), }));
        await addDoc(collection(db, "transactions"), { items: transactionItems, subtotal: subtotal, tax: tax, serviceCharge: serviceCharge, discount: discountAmount, total: total, createdAt: serverTimestamp(), staffId: currentStaff?.id || null, staffName: currentStaff?.name || null, tableId: tableId || null, tableName: tableName || null, status: 'completed' });
        if (tableId) {
            await updateDoc(doc(db, 'tables', tableId), { occupied: false, occupiedBy: null, staffId: null, order: [], });
        }
        router.replace({ 
            pathname: '/(main)/summary', 
            params: { 
                items: JSON.stringify(transactionItems), 
                subtotal: subtotal.toString(), 
                tax: tax.toString(), 
                serviceCharge: serviceCharge.toString(), 
                discount: discountAmount.toString(), 
                total: total.toString(), 
                staffName: currentStaff?.name || 'N/A', 
                tableName: tableName || 'N/A',
            } 
        });
    } catch (error) { console.error("Error processing payment: ", error); Alert.alert("Payment Error", "There was an error processing the payment."); }
  };

  const handleCategoryPress = async (category: Category) => { if (isSystemLocked) return; const foodsSnapshot = await getDocs(collection(doc(db, 'categories', category.id), 'foods')); const foodsList = foodsSnapshot.docs.map(foodDoc => ({ id: foodDoc.id, ...foodDoc.data(), categoryId: category.id } as Food)); setSelectedCategory({ ...category, foods: foodsList }); setIsModalVisible(true); };
  
  const addToOrder = (food: Food) => {
    const existingItem = orderItems.find(item => item.food.id === food.id && !item.discount);
    if (existingItem) {
        incrementQuantity(existingItem.id);
    } else {
        setOrderItems(prevItems => [...prevItems, { id: `${food.id}-${Date.now()}`, food, quantity: 1, discount: null, note: '' }]);
    }
  };

  const incrementQuantity = (itemId: string) => { setOrderItems(prevItems => prevItems.map(item => item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item)); };
  const decrementQuantity = (itemId: string) => { setOrderItems(prevItems => { const existingItem = prevItems.find(item => item.id === itemId); if (existingItem && existingItem.quantity > 1) { return prevItems.map(item => item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item); } else { return prevItems.filter(item => item.id !== itemId); } }); };
  const removeItem = (itemId: string) => { setOrderItems(prevItems => prevItems.filter(item => item.id !== itemId)); };
  const openItemEditor = (item: OrderItemType) => { setSelectedOrderItem(item); setEditQuantity(item.quantity.toString()); setEditDiscount(item.discount?.toString() || ''); setEditNote(item.note || ''); setIsItemEditorVisible(true); };
  const handleUpdateItem = () => { if (selectedOrderItem) { const qty = parseInt(editQuantity, 10); const disc = parseFloat(editDiscount); setOrderItems(prevItems => prevItems.map(item => item.id === selectedOrderItem.id ? { ...item, quantity: !isNaN(qty) && qty > 0 ? qty : item.quantity, discount: !isNaN(disc) && disc > 0 ? disc : null, note: editNote, } : item )); closeItemEditor(); } };
  const closeItemEditor = () => { setIsItemEditorVisible(false); setSelectedOrderItem(null); setEditQuantity(''); setEditDiscount(''); setEditNote(''); };
  const applyDiscount = (discount: Discount) => { setAppliedDiscount(discount); setIsDiscountModalVisible(false); }
  const handleStaffSelect = (staff: Staff) => { setSelectedStaffForLogin(staff); setIsDropdownVisible(false); setIsPinModalVisible(true); };
  const handlePinLogin = () => { if (enteredPin === selectedStaffForLogin?.pin) { setCurrentStaff(selectedStaffForLogin); setIsPinModalVisible(false); setEnteredPin(''); } else { Alert.alert("Invalid PIN", "The PIN you entered is incorrect."); setEnteredPin(''); } };
  const handleLogout = () => { if (orderItems.length > 0) { Alert.alert( "Unsaved Order", "There are items in the current order. Please save or clear it before logging out.", [{ text: "Cancel", style: "cancel" }, { text: "Save Order", onPress: handleSaveOrder }, { text: "Logout Anyway", style: "destructive", onPress: () => { auth.signOut(); router.replace('/(auth)/login'); } }] ); } else { auth.signOut(); router.replace('/(auth)/login'); } setIsDropdownVisible(false); };

  const renderFoodItem = ({ item }: { item: Food }) => (
    <TouchableOpacity onPress={() => { addToOrder(item); setIsModalVisible(false); }}>
        <View style={styles.foodItemContainer}>
            <Text style={styles.foodItemName}>{item.name}</Text>
            <Text style={styles.foodItemPrice}>{`₱${item.price.toFixed(2)}`}</Text>
            <Text style={styles.foodItemDescription}>{item.description}</Text>
        </View>
    </TouchableOpacity>
  );

  const renderDiscountItem = ({ item }: { item: Discount }) => (
    <TouchableOpacity onPress={() => applyDiscount(item)}>
        <View style={styles.foodItemContainer}>
            <Text style={styles.foodItemName}>{item.name}</Text>
            <Text>{`${item.percent}% - ${item.type}`}</Text>
        </View>
    </TouchableOpacity>
  );

  const mainContent = (
      <View style={[styles.mainContent, isSystemLocked && styles.disabledView]}>
          <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                  <TouchableOpacity
                      key={category.id}
                      style={styles.categoryTile}
                      onPress={() => handleCategoryPress(category)}
                      disabled={isSystemLocked}
                  >
                      <Text style={styles.categoryText}>{category.name}</Text>
                  </TouchableOpacity>
              ))}
          </View>
      </View>
  );

  const orderSidebar = (
    <View style={[styles.orderContainer, isSystemLocked && styles.disabledView]}>
        <Text style={styles.orderTitle}>{`Order: ${tableName}`}</Text>
        <ScrollView>
            {orderItems.map((item) => (
                <OrderItem
                    key={item.id}
                    item={item}
                    onPress={() => openItemEditor(item)}
                    onRemove={() => removeItem(item.id)}
                    onIncrement={() => incrementQuantity(item.id)}
                    onDecrement={() => decrementQuantity(item.id)}
                />
            ))}
        </ScrollView>
        <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
                <Text>Subtotal</Text>
                <Text>{`₱${subtotal.toFixed(2)}`}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text>Tax</Text>
                <Text>{`₱${tax.toFixed(2)}`}</Text>
            </View>
            <View style={styles.summaryRow}>
                <Text>Service Charge</Text>
                <Text>{`₱${serviceCharge.toFixed(2)}`}</Text>
            </View>
            {discountAmount > 0 && (
                <View style={styles.summaryRow}>
                    <TouchableOpacity onPress={() => setAppliedDiscount(null)}>
                        <Text style={{ color: 'red' }}>
                            {`Discount ${appliedDiscount ? `(${appliedDiscount.name})` : ''}`}
                        </Text>
                    </TouchableOpacity>
                    <Text style={{ color: 'red' }}>{`-₱${discountAmount.toFixed(2)}`}</Text>
                </View>
            )}
            <View style={styles.summaryRowTotal}>
                <Text style={styles.totalText}>TOTAL</Text>
                <Text style={styles.totalText}>{`₱${total.toFixed(2)}`}</Text>
            </View>
        </View>
        <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
                style={[styles.actionButton, styles.occupyButton, isSystemLocked && styles.disabledButton]}
                onPress={handleSaveOrder}
                disabled={isSystemLocked}
            >
                <Text style={styles.actionButtonText}>SAVE ORDER</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.actionButton, isSystemLocked && styles.disabledButton]}
                onPress={() => { setOrderItems([]); setAppliedDiscount(null); }}
                disabled={isSystemLocked}
            >
                <Text style={styles.actionButtonText}>CLEAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.actionButton, isSystemLocked && styles.disabledButton]}
                onPress={() => setIsDiscountModalVisible(true)}
                disabled={isSystemLocked}
            >
                <Text style={styles.actionButtonText}>DISCOUNT</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.actionButton, styles.payButton, (isSystemLocked || orderItems.length === 0) && styles.disabledButton]}
                onPress={handlePay}
                disabled={isSystemLocked || orderItems.length === 0}
            >
                <Text style={styles.payButtonText}>PAY</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  const renderPinModal = () => (
    <Modal
        visible={isPinModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPinModalVisible(false)}
    >
        <View style={styles.modalOverlay}>
            <View style={styles.pinModalContent}>
                <Text style={styles.modalTitle}>{`Enter PIN for ${selectedStaffForLogin?.name}`}</Text>
                <TextInput
                    style={styles.pinInput}
                    value={enteredPin}
                    onChangeText={setEnteredPin}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    autoFocus={true}
                />
                <View style={styles.modalActions}>
                    <TouchableOpacity
                        style={[styles.button, styles.buttonCancel]}
                        onPress={() => { setIsPinModalVisible(false); setEnteredPin(''); }}
                    >
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={handlePinLogin}>
                        <Text style={styles.buttonText}>Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
  );

  const applicableDiscounts = selectedOrderItem
    ? discounts.filter(d =>
        (d.type === 'Food' && d.foods?.includes(selectedOrderItem.food.id)) ||
        (d.type === 'Category' && d.categories?.includes(selectedOrderItem.food.categoryId))
      )
    : [];
  
  return (
      <SafeAreaView style={styles.container}>
          {renderPinModal()}
          <Modal
              visible={isItemEditorVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={closeItemEditor}
          >
              <View style={styles.modalOverlay}>
                  <View style={styles.pinModalContent}>
                      <Text style={styles.modalTitle}>{`Edit Item: ${selectedOrderItem?.food.name}`}</Text>
                      <Text style={styles.inputLabel}>Quantity</Text>
                      <TextInput
                          style={styles.pinInput}
                          value={editQuantity}
                          onChangeText={setEditQuantity}
                          keyboardType="number-pad"
                          autoFocus={true}
                      />
                      <Text style={styles.inputLabel}>Discount (%)</Text>
                      <TextInput
                          style={styles.pinInput}
                          value={editDiscount}
                          onChangeText={setEditDiscount}
                          keyboardType="decimal-pad"
                          placeholder="Enter discount percentage"
                      />
                      <Text style={styles.inputLabel}>Or Select Preset</Text>
                      <View style={styles.pickerContainer}>
                          <TouchableOpacity
                              style={styles.picker}
                              onPress={() => {
                                  Alert.alert(
                                      'Select Discount',
                                      'Choose a preset option',
                                      [
                                          { text: 'No Discount', onPress: () => setEditDiscount('') },
                                          ...applicableDiscounts.map(d => ({
                                              text: `${d.name} (${d.percent}%)`,
                                              onPress: () => setEditDiscount(d.percent.toString()),
                                          })),
                                      ],
                                      { cancelable: true }
                                  );
                              }}
                          >
                              <Text style={styles.pickerText}>Select a preset discount...</Text>
                          </TouchableOpacity>
                      </View>
                      <Text style={styles.inputLabel}>Note</Text>
                      <TextInput style={styles.pinInput} value={editNote} onChangeText={setEditNote} />
                      <View style={styles.modalActions}>
                          <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={closeItemEditor}>
                              <Text style={styles.buttonText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={handleUpdateItem}>
                              <Text style={styles.buttonText}>Update</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
          </Modal>
          <Modal
              animationType="slide"
              transparent={true}
              visible={isModalVisible}
              onRequestClose={() => setIsModalVisible(false)}
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
                          onPress={() => setIsModalVisible(false)}
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
              onRequestClose={() => setIsDiscountModalVisible(false)}
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
                          onPress={() => setIsDiscountModalVisible(false)}
                      >
                          <Text style={styles.textStyle}>Close</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </Modal>

          <View style={styles.header}>
              <TouchableOpacity
                  style={styles.headerBackButton}
                  onPress={handleBack}
              >
                  <Ionicons name="arrow-back-outline" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.headerTableInfo}>
                  <Text style={styles.tableName}>{tableName}</Text>
                  <Text style={styles.tableStatus}>
                      {isTableOccupied ? `(Occupied by ${occupiedBy})` : '(Available)'}
                  </Text>
              </View>
              <View>
                  <TouchableOpacity
                      style={styles.helloButton}
                      onPress={() => setIsDropdownVisible(!isDropdownVisible)}
                      // Corrected Logic: Disable only if a different staff is logged in.
                      disabled={!!(currentStaff && isTableOccupied && occupiedBy && currentStaff.name !== occupiedBy)}
                  >
                      <Text style={styles.helloText}>
                          {currentStaff ? currentStaff.name : (isTableOccupied && occupiedBy ? occupiedBy : 'Select Staff')}
                      </Text>
                      <Ionicons name="caret-down" size={20} color="white" />
                  </TouchableOpacity>
                  {isDropdownVisible && (
                      <View style={styles.dropdown}>
                          {currentStaff ? (
                              <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                                  <Text style={styles.dropdownText}>Logout</Text>
                              </TouchableOpacity>
                          ) : (
                              <FlatList
                                  // If table is occupied, only show the occupying staff to allow login.
                                  data={isTableOccupied && occupiedBy ? staffList.filter(staff => staff.name === occupiedBy) : staffList}
                                  keyExtractor={(item) => item.id}
                                  renderItem={({ item }) => (
                                      <TouchableOpacity
                                          style={styles.dropdownItem}
                                          onPress={() => handleStaffSelect(item)}
                                      >
                                          <Text style={styles.dropdownText}>{item.name}</Text>
                                      </TouchableOpacity>
                                  )}
                                  ListEmptyComponent={
                                      <View style={styles.dropdownItem}>
                                          <Text style={styles.dropdownText}>
                                            {isTableOccupied && occupiedBy ? `Login as ${occupiedBy}` : 'No staff found'}
                                          </Text>
                                      </View>
                                  }
                              />
                          )}
                      </View>
                  )}
              </View>
          </View>




          {isDropdownVisible && (
              <TouchableWithoutFeedback onPress={() => setIsDropdownVisible(false)}>
                  <View style={styles.overlay} />
              </TouchableWithoutFeedback>
          )}

          {isLandscape ? (
              <View style={styles.landscapeLayout}>
                  <View style={styles.leftPane}>{mainContent}</View>
                  <View style={styles.rightPane}>{orderSidebar}</View>
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

// This is the full and complete stylesheet that will not crash
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    header: { backgroundColor: Colors.light.tint, paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2001 },
    headerBackButton: { flexDirection: 'row', alignItems: 'center' },
    headerTableInfo: { flex: 1, alignItems: 'center' },
    tableName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    tableStatus: { color: 'white', fontSize: 14 },
    helloButton: { flexDirection: 'row', alignItems: 'center' },
    helloText: { color: 'white', marginRight: 5, fontSize: 16 },
    dropdown: { position: 'absolute', top: 50, right: 20, backgroundColor: 'white', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, zIndex: 2002 },
    dropdownItem: { padding: 15 },
    dropdownText: { fontSize: 16 },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000 },
    landscapeLayout: { flex: 1, flexDirection: 'row' },
    leftPane: { flex: 3 },
    rightPane: { flex: 2, borderLeftWidth: 1, borderColor: '#ccc', backgroundColor: '#f9f9f9' },
    mainContent: { flex: 1, padding: 10 },
    disabledView: { opacity: 0.5 },
    categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
    categoryTile: { width: '45%', margin: 5, height: 100, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 2, borderColor: Colors.light.tint },
    categoryText: { fontWeight: 'bold', color: Colors.light.tint },
    orderContainer: { padding: 10, borderTopWidth: 1, borderColor: '#ccc', flex: 1 },
    orderTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    orderItemName: { fontSize: 16, fontWeight: 'bold' },
    orderItemPrice: { fontSize: 14, color: 'black' },
    itemDiscountText: { fontSize: 12, color: 'green' },
    itemNoteText: { fontSize: 12, color: 'blue' },
    quantityControl: { flexDirection: 'row', alignItems: 'center' },
    quantityText: { marginHorizontal: 10, fontSize: 16 },
    summaryContainer: { marginTop: 'auto', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ccc' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    totalText: { fontWeight: 'bold', fontSize: 18 },
    actionButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap' },
    actionButton: { padding: 15, borderRadius: 5, backgroundColor: '#E0E0E0', alignItems: 'center', flexGrow: 1, margin: 2 },
    actionButtonText: { fontWeight: 'bold', color: '#333' },
    payButton: { backgroundColor: Colors.light.tint },
    occupyButton: { backgroundColor: '#ffc107' },
    payButtonText: { color: 'white', fontWeight: 'bold' },
    disabledButton: { backgroundColor: '#d3d3d3' },
    centeredView: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'rgba(0,0,0,0.5)' },
    modalView: { margin: 20, backgroundColor: "white", borderRadius: 20, padding: 35, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, width: '90%', maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: "center" },
    foodItemContainer: { width: '100%', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    foodItemName: { fontSize: 18, fontWeight: 'bold' },
    foodItemPrice: { fontSize: 16, color: 'gray', marginTop: 5 },
    foodItemDescription: { fontSize: 14, color: '#666', marginTop: 5 },
    button: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20, elevation: 2, marginHorizontal: 5 },
    buttonClose: { backgroundColor: "#2196F3", marginTop: 15 },
    textStyle: { color: "white", fontWeight: "bold", textAlign: "center" },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    pinModalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '90%', alignItems: 'center' },
    pinInput: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, marginBottom: 15, fontSize: 18, width: '100%', textAlign: 'center' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-evenly', width: '100%', marginTop: 10 },
    buttonCancel: { backgroundColor: '#6c757d' },
    buttonSave: { backgroundColor: Colors.light.tint },
    buttonText: { color: 'white', fontWeight: 'bold' },
    inputLabel: { alignSelf: 'flex-start', marginLeft: '5%', color: '#666', marginBottom: 5 },
    pickerContainer: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15 },
    picker: { padding: 15 },
    pickerText: { fontSize: 16 },
});

export default PosScreen;
