import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { PrismaClient, Table, Order, OrderItem, Food } from '@prisma/client';
import React, { useCallback, useLayoutEffect, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Colors } from '../../constants/theme';

const prisma = new PrismaClient();

interface TableWithRelations extends Table {
    order: (Order & { items: (OrderItem & { food: Food })[] }) | null;
}

const TablesScreen = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const isAdmin = params.admin === 'true';
    const { staff: staffJson } = params as { staff?: string };
    const [staffName, setStaffName] = useState<string | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [tables, setTables] = useState<TableWithRelations[]>([]);
    const [editingTable, setEditingTable] = useState<Table | null>(null);

    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
    const [tableName, setTableName] = useState('');
    const [numberOfTables, setNumberOfTables] = useState('');

    const [viewOrderModalVisible, setViewOrderModalVisible] = useState(false);
    const [selectedTableForView, setSelectedTableForView] = useState<TableWithRelations | null>(null);
    const [loadingOrder, setLoadingOrder] = useState(false);
    const [orderSubtotal, setOrderSubtotal] = useState(0);
    const [orderTax, setOrderTax] = useState(0);
    const [orderServiceCharge, setOrderServiceCharge] = useState(0);
    const [orderDiscount, setOrderDiscount] = useState(0);
    const [orderTotal, setOrderTotal] = useState(0);

    useEffect(() => {
        if (staffJson) {
            const staff = JSON.parse(staffJson);
            setStaffName(staff.name);
        }
    }, [staffJson]);

    const fetchTables = async () => {
        try {
            const tablesList = await prisma.table.findMany({
                where: { deletedAt: null },
                include: {
                    order: {
                        include: {
                            items: { include: { food: true } },
                        },
                    },
                },
                orderBy: { name: 'asc' },
            });
            setTables(tablesList);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not fetch tables.');
        }
    };

    useEffect(() => {
        fetchTables();
        const interval = setInterval(fetchTables, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const handleLogout = useCallback(() => {
        Alert.alert("Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Logout", style: "destructive", onPress: () => router.replace('/(auth)/login') },
        ]);
    }, [router]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: isAdmin ? 'Manage Tables' : 'Tables',
            headerBackVisible: !isAdmin,
            headerLeft: isAdmin ? () => (
                <TouchableOpacity onPress={() => router.push('/(main)/admin')} style={{ marginRight: 16 }}>
                    <Ionicons name="arrow-back" size={24} color={'#000'} />
                </TouchableOpacity>
            ) : undefined,
            headerRight: !isAdmin ? () => (
                <TouchableOpacity style={{ marginRight: 15 }} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={28} color="white" />
                </TouchableOpacity>
            ) : undefined,
            headerStyle: { backgroundColor: isAdmin ? 'white' : Colors.light.tint },
            headerTintColor: isAdmin ? '#000' : 'white',
            headerTitleStyle: { fontWeight: isAdmin ? 'normal' : 'bold', fontSize: 18 },
            headerShadowVisible: !isAdmin,
        });
    }, [navigation, router, isAdmin, handleLogout]);

    useEffect(() => {
        if (!selectedTableForView || !viewOrderModalVisible) return;

        setLoadingOrder(true);
        const orderItems = selectedTableForView.order?.items || [];
        const subtotal = orderItems.reduce((acc, item) => acc + (item.food.price * item.quantity), 0);
        const totalDiscount = orderItems.reduce((acc, item) => acc + (item.food.price * item.quantity * ((item.discount || 0) / 100)), 0);
        const subtotalAfterDiscounts = subtotal - totalDiscount;
        const tax = subtotalAfterDiscounts * 0.10;
        const serviceCharge = subtotalAfterDiscounts * 0.10;
        const total = subtotalAfterDiscounts + tax + serviceCharge;

        setOrderSubtotal(subtotal);
        setOrderDiscount(totalDiscount);
        setOrderTax(tax);
        setOrderServiceCharge(serviceCharge);
        setOrderTotal(total);
        setLoadingOrder(false);

    }, [selectedTableForView, viewOrderModalVisible]);

    const handleAddOrUpdateTable = async () => {
        if (!isAdmin) return;

        if (editingTable) {
            if (tableName.trim() === '') return Alert.alert('Error', 'Table name cannot be empty.');
            await prisma.table.update({
                where: { id: editingTable.id },
                data: { name: tableName },
            });
            fetchTables();
            closeModal();
            return;
        }

        if (addMode === 'single') {
            if (tableName.trim() === '') return Alert.alert('Error', 'Table name cannot be empty.');
            await prisma.table.create({ data: { name: tableName } });
        } else {
            const count = parseInt(numberOfTables, 10);
            if (isNaN(count) || count <= 0) {
                return Alert.alert('Error', 'Please enter a valid number of tables to add.');
            }
            const tableData = Array.from({ length: count }, (_, i) => ({ name: `Table ${i + 1}` }));
            await prisma.table.createMany({ data: tableData });
        }

        fetchTables();
        closeModal();
    };

    const handleEdit = (table: Table) => {
        if (!isAdmin) return;
        setEditingTable(table);
        setTableName(table.name);
        setAddMode('single');
        setModalVisible(true);
    };

    const handleDelete = (table: Table) => {
        if (!isAdmin) return;
        Alert.alert('Delete Table', 'Are you sure you want to delete this table?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await prisma.table.update({
                        where: { id: table.id },
                        data: { deletedAt: new Date() },
                    });
                    fetchTables();
                },
            },
        ]);
    };

    const handleTablePress = (table: TableWithRelations) => {
        if (isAdmin) {
            viewOrder(table);
        } else {
            router.push({
                pathname: '/(main)/pos',
                params: { tableId: table.id.toString(), tableName: table.name, staff: staffJson },
            });
        }
    };

    const viewOrder = (table: TableWithRelations) => {
        setSelectedTableForView(table);
        setViewOrderModalVisible(true);
    };

    const handleLongPress = (table: Table) => {
        if (!isAdmin) return;
        Alert.alert(`Manage Table: ${table.name}`, 'Choose an option', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Edit', onPress: () => handleEdit(table) },
            { text: 'Delete', style: 'destructive', onPress: () => handleDelete(table) },
        ]);
    };

    const openAddModal = () => {
        if (!isAdmin) return;
        setEditingTable(null);
        setAddMode('single');
        setTableName('');
        setNumberOfTables('');
        setModalVisible(true);
    };

    const closeModal = () => {
        setModalVisible(false);
        setEditingTable(null);
        setTableName('');
        setNumberOfTables('');
    };

    const renderTableItem = ({ item }: { item: TableWithRelations }) => (
        <TouchableOpacity
            style={[styles.tile, item.occupied && styles.occupiedTile]}
            onPress={() => handleTablePress(item)}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.7}>
            <Ionicons name="grid-outline" size={32} color={item.occupied ? 'white' : Colors.light.tint} />
            <Text style={[styles.tileText, item.occupied && styles.occupiedTileText]}>{item.name}</Text>
            {item.occupied && item.occupiedBy ? (<Text style={styles.occupiedByText} numberOfLines={1}>{`by ${item.occupiedBy}`}</Text>) : null}
            {isAdmin ? <View style={styles.adminIndicator}><Text style={styles.adminIndicatorText}>Manage</Text></View> : null}
        </TouchableOpacity>
    );

    const renderAdminModal = () => (
        <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
            <TouchableWithoutFeedback onPress={closeModal}>
                <View style={styles.centeredView}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalView}>
                            <Text style={styles.modalTitle}>{editingTable ? 'Edit Table' : 'Add New Table(s)'}</Text>
                            {!editingTable && (
                                <View style={styles.modeSelector}>
                                    <TouchableOpacity style={[styles.modeButton, addMode === 'single' && styles.modeButtonActive]} onPress={() => setAddMode('single')}>
                                        <Text style={[styles.modeButtonText, addMode === 'single' && styles.modeButtonTextActive]}>Single</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modeButton, addMode === 'bulk' && styles.modeButtonActive]} onPress={() => setAddMode('bulk')}>
                                        <Text style={[styles.modeButtonText, addMode === 'bulk' && styles.modeButtonTextActive]}>Bulk</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {addMode === 'single' || editingTable ? (
                                <TextInput style={styles.input} placeholder="Table Name" value={tableName} onChangeText={setTableName} autoFocus />
                            ) : (
                                <TextInput style={styles.input} placeholder="How many tables to add?" value={numberOfTables} onChangeText={setNumberOfTables} keyboardType="number-pad" autoFocus />
                            )}
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={closeModal}>
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={handleAddOrUpdateTable}>
                                    <Text style={styles.buttonText}>{editingTable ? 'Update' : 'Add'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const renderViewOrderModal = () => (
        <Modal animationType="slide" transparent={true} visible={viewOrderModalVisible} onRequestClose={() => setViewOrderModalVisible(false)}>
            <TouchableWithoutFeedback onPress={() => setViewOrderModalVisible(false)}>
                <View style={styles.centeredView}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalView}>
                            {selectedTableForView ? (
                                <>
                                    <Text style={styles.modalTitle}>{`Order: ${selectedTableForView.name}`}</Text>
                                    {selectedTableForView.occupiedBy ? (<Text style={styles.responsibleStaffText}>{`Served by: ${selectedTableForView.occupiedBy}`}</Text>) : null}
                                    {loadingOrder ? (
                                        <ActivityIndicator size="large" color={Colors.light.tint} style={{ marginVertical: 20 }}/>
                                    ) : (
                                        <>
                                            <FlatList
                                                data={selectedTableForView.order?.items || []}
                                                keyExtractor={(item) => item.id.toString()}
                                                renderItem={({ item }) => {
                                                    const finalPrice = (item.food.price * item.quantity) * (1 - (item.discount || 0) / 100);
                                                    return (
                                                        <View style={styles.orderItemContainer}>
                                                            <View style={{ flex: 1, marginRight: 8 }}>
                                                                <Text style={styles.orderItemText} numberOfLines={1}>{`${item.quantity}x ${item.food.name}`}</Text>
                                                                {item.discount && item.discount > 0 ? (
                                                                    <Text style={styles.discountTag}>{`${item.discount}% off`}</Text>
                                                                ) : null}
                                                            </View>
                                                            <Text style={styles.orderItemPrice}>{`₱${finalPrice.toFixed(2)}`}</Text>
                                                        </View>
                                                    );
                                                }}
                                                ListEmptyComponent={<Text style={styles.emptyOrderText}>This table is empty.</Text>}
                                                style={styles.orderList}
                                                contentContainerStyle={{ flexGrow: 1 }}
                                            />
                                            
                                            {(selectedTableForView.order?.items.length || 0) > 0 && (
                                                <View style={styles.summaryContainer}>
                                                    <View style={styles.summaryRow}>
                                                        <Text style={styles.summaryText}>Subtotal</Text>
                                                        <Text style={styles.summaryText}>{`₱${orderSubtotal.toFixed(2)}`}</Text>
                                                    </View>
                                                    {orderDiscount > 0 && (
                                                        <View style={styles.summaryRow}>
                                                            <Text style={[styles.summaryText, {color: 'red'}]}>Discount</Text>
                                                            <Text style={[styles.summaryText, {color: 'red'}]}>{`-₱${orderDiscount.toFixed(2)}`}</Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.summaryRow}>
                                                        <Text style={styles.summaryText}>Tax</Text>
                                                        <Text style={styles.summaryText}>{`₱${orderTax.toFixed(2)}`}</Text>
                                                    </View>
                                                    <View style={styles.summaryRow}>
                                                        <Text style={styles.summaryText}>Service Charge</Text>
                                                        <Text style={styles.summaryText}>{`₱${orderServiceCharge.toFixed(2)}`}</Text>
                                                    </View>
                                                    <View style={styles.summaryRowTotal}>
                                                        <Text style={styles.totalText}>TOTAL</Text>
                                                        <Text style={styles.totalText}>{`₱${orderTotal.toFixed(2)}`}</Text>
                                                    </View>
                                                </View>
                                            )}
                                        </>
                                    )}
                                    
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonClose]}
                                        onPress={() => setViewOrderModalVisible(false)}>
                                        <Text style={styles.buttonText}>Close</Text>
                                    </TouchableOpacity>
                                </>
                            ) : null}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    return (
        <View style={styles.container}>
            {isAdmin && (
                <TouchableOpacity style={styles.manageButton} onPress={openAddModal}>
                    <Text style={styles.manageButtonText}>Add New Table(s)</Text>
                </TouchableOpacity>
            )}
            <FlatList
                data={tables}
                renderItem={renderTableItem}
                keyExtractor={item => item.id.toString()}
                numColumns={3}
                contentContainerStyle={styles.tilesContainer}
            />
            {isAdmin && renderAdminModal()}
            {renderViewOrderModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: 10, },
    manageButton: { backgroundColor: Colors.light.tint, padding: 15, marginHorizontal: 20, marginBottom: 10, borderRadius: 10, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, },
    manageButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', },
    tilesContainer: { paddingHorizontal: 5, },
    tile: { flex: 1, aspectRatio: 1, margin: 5, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 5, borderWidth: 1, borderColor: '#eee', padding: 5, position: 'relative', },
    occupiedTile: { backgroundColor: '#00156E', },
    tileText: { marginTop: 8, color: Colors.light.tint, fontSize: 14, fontWeight: '600', textAlign: 'center', },
    occupiedTileText: { color: 'white', },
    occupiedByText: { fontSize: 11, color: 'white', marginTop: 2, fontWeight: 'bold', textAlign: 'center', },
    adminIndicator: { position: 'absolute', top: 5, right: 5, backgroundColor: '#ffc107', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, },
    adminIndicatorText: { color: 'black', fontSize: 10, fontWeight: 'bold', },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', },
    modalView: { margin: 20, backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5, width: '90%', maxWidth: 400, maxHeight: '80%', },
    modalTitle: { marginBottom: 5, textAlign: 'center', fontSize: 22, fontWeight: 'bold', },
    input: { height: 50, borderColor: '#ccc', borderWidth: 1, marginBottom: 20, width: '100%', padding: 15, borderRadius: 10, fontSize: 16, },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10, },
    button: { borderRadius: 10, paddingVertical: 15, elevation: 2, flex: 1, alignItems: 'center', },
    buttonSave: { backgroundColor: Colors.light.tint, marginLeft: 10, },
    buttonCancel: { backgroundColor: '#6c757d', marginRight: 10, },
    buttonClose: { backgroundColor: '#6c757d', width: '100%', marginTop: 15, flex: 0, },
    buttonText: { color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16, },
    modeSelector: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 20, padding: 4, },
    modeButton: { paddingVertical: 8, paddingHorizontal: 25, borderRadius: 16, },
    modeButtonActive: { backgroundColor: Colors.light.tint, },
    modeButtonText: { color: '#333', fontWeight: 'bold', fontSize: 16, },
    modeButtonTextActive: { color: 'white', },
    responsibleStaffText: { fontSize: 16, color: '#666', marginBottom: 20, fontStyle: 'italic', },
    orderList: { width: '100%', maxHeight: '50%', marginBottom: 10, },
    orderItemContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%', },
    orderItemText: { fontSize: 16, color: '#333', flex: 1, },
    orderItemPrice: { fontSize: 16, fontWeight: 'bold', color: Colors.light.tint, },
    emptyOrderText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#888' },
    summaryContainer: { width: '100%', marginTop: 'auto', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ccc' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, },
    summaryText: { fontSize: 15, color: '#444' },
    summaryRowTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 2, paddingTop: 8, borderColor: '#333' },
    totalText: { fontWeight: 'bold', fontSize: 18, color: '#000' },
    discountTag: {
        fontSize: 12,
        color: 'red',
        fontStyle: 'italic',
        marginTop: 2,
    },
});

export default TablesScreen;