import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PrismaClient, Food, Category, Discount, User as Staff, Prisma } from '@prisma/client';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { useStaff } from './_layout';

const prisma = new PrismaClient();

interface OrderItemType { id: string; food: Food; quantity: number; discount?: number | null; note?: string | null; }
interface CategoryWithFoods extends Category { foods: Food[]; }

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

const PosScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { tableId, tableName } = params as { tableId: string; tableName: string; };
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { currentStaff, setCurrentStaff } = useStaff();
  
  const [categories, setCategories] = useState<CategoryWithFoods[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithFoods | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDiscountModalVisible, setIsDiscountModalVisible] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItemType[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [total, setTotal] = useState(0);
  const [discounts, setDiscounts] = useState<Prisma.DiscountGetPayload<{ include: { foods: true, categories: true } }>[]>([]);
  const [appliedDiscount, setAppliedDiscount] = useState<Prisma.DiscountGetPayload<{ include: { foods: true, categories: true } }> | null>(null);
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
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [selectedStaffForLogin, setSelectedStaffForLogin] = useState<Staff | null>(null);
  const [enteredPin, setEnteredPin] = useState('');

  const isSystemLocked = !currentStaff;

  const handleBack = () => router.back();

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            const [categoriesList, activeDiscounts, allStaff] = await Promise.all([
                prisma.category.findMany({ include: { foods: true } }),
                prisma.discount.findMany({ where: { startDate: { lte: new Date() }, expirationDate: { gte: new Date() } }, include: { foods: true, categories: true } }),
                prisma.user.findMany({ where: { role: 'USER' } })
            ]);
            setCategories(categoriesList);
            setDiscounts(activeDiscounts);
            setStaffList(allStaff);
        } catch (error) {
            console.error("Failed to fetch initial data:", error);
            Alert.alert("Error", "Failed to load essential page data.");
        }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!tableId) return;
    const fetchTableData = async () => {
      try {
        const table = await prisma.table.findUnique({ where: { id: parseInt(tableId) }, include: { order: { include: { items: { include: { food: true } } } } } });
        if (table) {
          setIsTableOccupied(table.occupied);
          setOccupiedBy(table.occupiedBy);
          const orderFromDb = table.order?.items.map((item, index) => ({ ...item, id: `${item.food.id}-${Date.now()}-${index}`, food: item.food, discount: item.discount, note: item.note })) || [];
          setOrderItems(orderFromDb);
        } else {
          Alert.alert("Error", "Table not found.", [{ text: "OK", onPress: () => router.back() }]);
        }
      } catch (error) {
        console.error("Failed to fetch table data:", error);
      }
    };

    fetchTableData();
    const interval = setInterval(fetchTableData, 5000); // Polling every 5 seconds
    return () => clearInterval(interval);
  }, [tableId, router]);

  useEffect(() => {
    const newSubtotal = orderItems.reduce((acc, item) => acc + (item.food.price * item.quantity), 0);
    const totalItemDiscount = orderItems.reduce((acc, item) => acc + (item.discount ? (item.food.price * item.quantity) * (item.discount / 100) : 0), 0);
    let totalDiscountFromGlobal = 0;
    if (appliedDiscount) {
        const subtotalForGlobalDiscount = orderItems.reduce((acc, item) => {
            const foodInDiscount = appliedDiscount.foods.some(f => f.id === item.food.id);
            const categoryInDiscount = appliedDiscount.categories.some(c => c.id === item.food.categoryId);
            if ( (appliedDiscount.type === 'Entire Order') || (appliedDiscount.type === 'Category' && categoryInDiscount) || (appliedDiscount.type === 'Food' && foodInDiscount) ) {
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
    if (!currentStaff) return Alert.alert("Login Required", "Please log in to save an order.");
    try {
        const orderCreateData = {
            items: { create: orderItems.map(i => ({ foodId: i.food.id, quantity: i.quantity, discount: i.discount, note: i.note })) },
            orderPlacedAt: new Date(),
        };

        const orderUpdateData = {
            items: {
                deleteMany: {},
                create: orderItems.map(i => ({ foodId: i.food.id, quantity: i.quantity, discount: i.discount, note: i.note })),
            },
            orderPlacedAt: new Date(),
        };

        await prisma.table.update({
            where: { id: parseInt(tableId) },
            data: {
                occupied: orderItems.length > 0,
                occupiedBy: orderItems.length > 0 ? currentStaff.name : null,
                staffId: orderItems.length > 0 ? currentStaff.id : null,
                order: { upsert: { create: orderCreateData, update: orderUpdateData } },
                status: orderItems.length > 0 ? 'serving' : 'available',
                kitchenStatus: orderItems.length > 0 ? 'pending' : null,
            },
        });

        if (orderItems.length > 0) {
            router.replace({ pathname: '/(main)/pending-order', params: { tableId, tableName } });
        } else {
            Alert.alert("Table Cleared", `${tableName} is now available.`, [{ text: "OK", onPress: () => router.replace('/(main)/tables') }]);
        }
    } catch (error) {
        console.error("Error saving order:", error);
        Alert.alert("Error", "Could not save the order.");
    }
};

  const handlePay = async () => {
    if (orderItems.length === 0) return Alert.alert("Empty Order", "Cannot process an empty order.");
    try {
        const transaction = await prisma.transaction.create({ data: { subtotal, tax, serviceCharge, discount: discountAmount, total, staffId: currentStaff?.id, staffName: currentStaff?.name, tableId: parseInt(tableId), tableName, status: 'completed', items: { create: orderItems.map(i => ({ foodId: i.food.id, name: i.food.name, price: i.food.price, quantity: i.quantity, discount: i.discount || 0, note: i.note || '', total: i.food.price * i.quantity * (1 - (i.discount || 0) / 100) })) } } });
        await prisma.table.update({ where: { id: parseInt(tableId) }, data: { occupied: false, occupiedBy: null, staffId: null, order: { delete: true }, status: 'available', kitchenStatus: null }});
        router.replace({ pathname: '/(main)/summary', params: { transactionId: transaction.id.toString() } });
    } catch (error) { console.error("Error processing payment:", error); Alert.alert("Payment Error", "There was an error processing the payment."); }
  };

  const handleCategoryPress = (category: CategoryWithFoods) => { if (!isSystemLocked) { setSelectedCategory(category); setIsModalVisible(true); } };
  const addToOrder = (food: Food) => { const existing = orderItems.find(i => i.food.id === food.id && !i.discount); if (existing) incrementQuantity(existing.id); else setOrderItems(prev => [...prev, { id: `${food.id}-${Date.now()}`, food, quantity: 1 }]); };
  const incrementQuantity = (itemId: string) => setOrderItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i));
  const decrementQuantity = (itemId: string) => setOrderItems(prev => { const item = prev.find(i => i.id === itemId); return item && item.quantity > 1 ? prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i) : prev.filter(i => i.id !== itemId); });
  const removeItem = (itemId: string) => setOrderItems(prev => prev.filter(i => i.id !== itemId));
  const openItemEditor = (item: OrderItemType) => { setSelectedOrderItem(item); setEditQuantity(item.quantity.toString()); setEditDiscount(item.discount?.toString() || ''); setEditNote(item.note || ''); setIsItemEditorVisible(true); };
  const handleUpdateItem = () => { if (selectedOrderItem) { const qty = parseInt(editQuantity, 10); const disc = parseFloat(editDiscount); setOrderItems(prev => prev.map(i => i.id === selectedOrderItem.id ? { ...i, quantity: !isNaN(qty) && qty > 0 ? qty : i.quantity, discount: !isNaN(disc) && disc >= 0 ? disc : null, note: editNote } : i)); closeItemEditor(); } };
  const closeItemEditor = () => { setIsItemEditorVisible(false); setSelectedOrderItem(null); setEditQuantity(''); setEditDiscount(''); setEditNote(''); };
  const applyDiscount = (discount: Prisma.DiscountGetPayload<{ include: { foods: true, categories: true } }>) => { setAppliedDiscount(discount); setIsDiscountModalVisible(false); };
  const handleStaffSelect = (staff: Staff) => { setSelectedStaffForLogin(staff); setIsDropdownVisible(false); setIsPinModalVisible(true); };
  const handlePinLogin = () => { if (selectedStaffForLogin && selectedStaffForLogin.pin && selectedStaffForLogin.name && enteredPin === selectedStaffForLogin.pin) { setCurrentStaff({ id: selectedStaffForLogin.id, name: selectedStaffForLogin.name, pin: selectedStaffForLogin.pin, }); setIsPinModalVisible(false); setEnteredPin(''); } else { Alert.alert("Invalid PIN", "The PIN is incorrect."); setEnteredPin(''); } };
  const handleLogout = () => { if (orderItems.length > 0) Alert.alert("Unsaved Order", "There are items in the order. Please save or clear it before logging out.", [{ text: "Cancel" }, { text: "Save Order", onPress: handleSaveOrder }, { text: "Logout Anyway", style: "destructive", onPress: () => setCurrentStaff(null) }]); else setCurrentStaff(null); setIsDropdownVisible(false); };

  const mainContent = (
      <View style={[styles.mainContent, isSystemLocked && styles.disabledView]}>
          <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                  <TouchableOpacity key={category.id} style={styles.categoryTile} onPress={() => handleCategoryPress(category)} disabled={isSystemLocked}>
                      <Text style={styles.categoryText}>{category.name}</Text>
                  </TouchableOpacity>
              ))}
          </View>
      </View>
  );

  const orderSidebar = (
    <View style={[styles.orderContainer, isSystemLocked && styles.disabledView]}>
        <Text style={styles.orderTitle}>{`Order: ${tableName}`}</Text>
        <ScrollView>{orderItems.map((item) => <OrderItem key={item.id} item={item} onPress={() => openItemEditor(item)} onRemove={() => removeItem(item.id)} onIncrement={() => incrementQuantity(item.id)} onDecrement={() => decrementQuantity(item.id)} />)}</ScrollView>
        <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}><Text>Subtotal</Text><Text>{`₱${subtotal.toFixed(2)}`}</Text></View>
            <View style={styles.summaryRow}><Text>Tax</Text><Text>{`₱${tax.toFixed(2)}`}</Text></View>
            <View style={styles.summaryRow}><Text>Service Charge</Text><Text>{`₱${serviceCharge.toFixed(2)}`}</Text></View>
            {discountAmount > 0 && <View style={styles.summaryRow}><TouchableOpacity onPress={() => setAppliedDiscount(null)}><Text style={{ color: 'red' }}>{`Discount ${appliedDiscount ? `(${appliedDiscount.name})` : ''}`}</Text></TouchableOpacity><Text style={{ color: 'red' }}>{`-₱${discountAmount.toFixed(2)}`}</Text></View>}
            <View style={styles.summaryRowTotal}><Text style={styles.totalText}>TOTAL</Text><Text style={styles.totalText}>{`₱${total.toFixed(2)}`}</Text></View>
        </View>
        <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.occupyButton, isSystemLocked && styles.disabledButton]} onPress={handleSaveOrder} disabled={isSystemLocked}><Text style={styles.actionButtonText}>SAVE ORDER</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, isSystemLocked && styles.disabledButton]} onPress={() => { setOrderItems([]); setAppliedDiscount(null); }} disabled={isSystemLocked}><Text style={styles.actionButtonText}>CLEAR</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, isSystemLocked && styles.disabledButton]} onPress={() => setIsDiscountModalVisible(true)} disabled={isSystemLocked}><Text style={styles.actionButtonText}>DISCOUNT</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.payButton, (isSystemLocked || orderItems.length === 0) && styles.disabledButton]} onPress={handlePay} disabled={isSystemLocked || orderItems.length === 0}><Text style={styles.payButtonText}>PAY</Text></TouchableOpacity>
        </View>
    </View>
  );

  const renderPinModal = () => (
    <Modal visible={isPinModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsPinModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.pinModalContent}>
            <Text style={styles.modalTitle}>{`Enter PIN for ${selectedStaffForLogin?.name}`}</Text>
            <TextInput style={styles.pinInput} value={enteredPin} onChangeText={setEnteredPin} keyboardType="number-pad" maxLength={4} secureTextEntry autoFocus={true} />
            <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={() => { setIsPinModalVisible(false); setEnteredPin(''); }}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={handlePinLogin}><Text style={styles.buttonText}>Login</Text></TouchableOpacity>
            </View>
        </View></View>
    </Modal>
  );

  return (
      <SafeAreaView style={styles.container}>
          {renderPinModal()}
          <Modal visible={isItemEditorVisible} transparent={true} animationType="fade" onRequestClose={closeItemEditor}><View style={styles.modalOverlay}><View style={styles.pinModalContent}>
              <Text style={styles.modalTitle}>{`Edit Item: ${selectedOrderItem?.food.name}`}</Text>
              <Text style={styles.inputLabel}>Quantity</Text>
              <TextInput style={styles.pinInput} value={editQuantity} onChangeText={setEditQuantity} keyboardType="number-pad" autoFocus={true} />
              <Text style={styles.inputLabel}>Discount (%)</Text>
              <TextInput style={styles.pinInput} value={editDiscount} onChangeText={setEditDiscount} keyboardType="decimal-pad" placeholder="Enter discount percentage" />
              <Text style={styles.inputLabel}>Note</Text>
              <TextInput style={styles.pinInput} value={editNote} onChangeText={setEditNote} />
              <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={closeItemEditor}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={handleUpdateItem}><Text style={styles.buttonText}>Update</Text></TouchableOpacity>
              </View>
          </View></View></Modal>
          <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}><View style={styles.centeredView}><View style={styles.modalView}>
              <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>
              <FlatList data={selectedCategory?.foods} renderItem={({ item }) => <TouchableOpacity onPress={() => { addToOrder(item); setIsModalVisible(false); }}><View style={styles.foodItemContainer}><Text style={styles.foodItemName}>{item.name}</Text><Text style={styles.foodItemPrice}>{`₱${item.price.toFixed(2)}`}</Text><Text style={styles.foodItemDescription}>{item.description}</Text></View></TouchableOpacity>} keyExtractor={item => item.id.toString()} />
              <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={() => setIsModalVisible(false)}><Text style={styles.textStyle}>Close</Text></TouchableOpacity>
          </View></View></Modal>
          <Modal animationType="slide" transparent={true} visible={isDiscountModalVisible} onRequestClose={() => setIsDiscountModalVisible(false)}><View style={styles.centeredView}><View style={styles.modalView}>
              <Text style={styles.modalTitle}>Select a Discount</Text>
              <FlatList data={discounts} renderItem={({ item }) => <TouchableOpacity onPress={() => applyDiscount(item)}><View style={styles.foodItemContainer}><Text style={styles.foodItemName}>{item.name}</Text><Text>{`${item.percent}% - ${item.type}`}</Text></View></TouchableOpacity>} keyExtractor={item => item.id.toString()} ListEmptyComponent={<Text>No active discounts</Text>} />
              <TouchableOpacity style={[styles.button, styles.buttonClose]} onPress={() => setIsDiscountModalVisible(false)}><Text style={styles.textStyle}>Close</Text></TouchableOpacity>
          </View></View></Modal>

          <View style={styles.header}>
              <TouchableOpacity style={styles.headerBackButton} onPress={handleBack}><Ionicons name="arrow-back-outline" size={24} color="white" /></TouchableOpacity>
              <View style={styles.headerTableInfo}><Text style={styles.tableName}>{tableName}</Text><Text style={styles.tableStatus}>{isTableOccupied ? `(Occupied by ${occupiedBy})` : '(Available)'}</Text></View>
              <View>
                  <TouchableOpacity style={styles.helloButton} onPress={() => setIsDropdownVisible(!isDropdownVisible)} disabled={!!(currentStaff && isTableOccupied && occupiedBy && currentStaff.name !== occupiedBy)}><Text style={styles.helloText}>{currentStaff ? currentStaff.name : 'Select Staff'}</Text><Ionicons name="caret-down" size={20} color="white" /></TouchableOpacity>
                  {isDropdownVisible && <View style={styles.dropdown}>{currentStaff ? <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}><Text style={styles.dropdownText}>Logout</Text></TouchableOpacity> : <FlatList data={staffList} keyExtractor={(item) => item.id.toString()} renderItem={({ item }) => <TouchableOpacity style={styles.dropdownItem} onPress={() => handleStaffSelect(item)}><Text style={styles.dropdownText}>{item.name}</Text></TouchableOpacity>} ListEmptyComponent={<View style={styles.dropdownItem}><Text style={styles.dropdownText}>No staff found</Text></View>} />}</View>}
              </View>
          </View>

          {isDropdownVisible && <TouchableWithoutFeedback onPress={() => setIsDropdownVisible(false)}><View style={styles.overlay} /></TouchableWithoutFeedback>}
          {isLandscape ? <View style={styles.landscapeLayout}><View style={styles.leftPane}>{mainContent}</View><View style={styles.rightPane}>{orderSidebar}</View></View> : <ScrollView>{mainContent}{orderSidebar}</ScrollView>}
      </SafeAreaView>
  );
};

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
