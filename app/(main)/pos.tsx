import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Colors } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const categories = [
  'PIZZA', 'PASTA', 'DON', 'NASI', 'APPETIZER', 'SPECIAL DRINK',
  'FRESH JUICE', 'COLD DRINK', 'FLOAT & MILKSHAKE', 'SODA & SQUASH'
];

const OrderItem = ({ name, price }: { name: string, price: string }) => (
  <View style={styles.orderItem}>
    <Text style={styles.orderItemName}>{name}</Text>
    <Text style={styles.orderItemPrice}>{price}</Text>
  </View>
);

const PosScreen = () => {
  const router = useRouter();
  const isTablet = Dimensions.get('window').width >= 768;

  const navigateToSettings = () => {
    router.push('/(main)/pos-settings');
  };

  const mainContent = (
    <View style={styles.mainContent}>
      <View style={styles.categoriesContainer}>
        <ScrollView>
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => (
              <TouchableOpacity key={index} style={styles.categoryTile}>
                <Text style={styles.categoryText}>{category}</Text>
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
    }
});

export default PosScreen;
