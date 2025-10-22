import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, doc, onSnapshot, query, Timestamp, where } from "firebase/firestore";
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import RNPickerSelect from 'react-native-picker-select';
import { Colors } from '../../constants/theme';
import { db } from "../../firebase";

const chartConfig = {
  backgroundColor: "#fff",
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(26, 95, 180, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: "6",
    strokeWidth: "2",
    stroke: "#023e8a",
  },
  barPercentage: 0.5,
};

interface PickerItem {
    label: string;
    value: string;
}

interface Transaction {
    id: string;
    items: { name: string; price: number }[];
    subtotal: number;
    tax: number;
    serviceCharge: number;
    total: number;
    createdAt: Timestamp;
    currency: string;
}

const ReportsAnalytics = () => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const screenWidth = width;

  const [chartType, setChartType] = useState('Bar');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [topSellingCategory, setTopSellingCategory] = useState<string | null>(null);
  const [topSellingFood, setTopSellingFood] = useState<string | null>(null);
  const [categories, setCategories] = useState<PickerItem[]>([]);
  const [foods, setFoods] = useState<PickerItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const categoriesCollection = collection(db, 'categories');
    const unsubscribe = onSnapshot(categoriesCollection, (categoriesSnapshot) => {
        const categoriesList: PickerItem[] = categoriesSnapshot.docs.map(doc => ({ label: doc.data().name, value: doc.id }));
        setCategories(categoriesList);
    }, (error) => {
        console.error("Error fetching categories: ", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
        const startOfDay = new Date(fromDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);

        const transactionsRef = collection(db, 'transactions');
        const q = query(
            transactionsRef,
            where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
            where('createdAt', '<=', Timestamp.fromDate(endOfDay))
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedTransactions = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Transaction[];
            setTransactions(fetchedTransactions);
        }, (error) => {
            console.error("Error fetching transactions: ", error);
            Alert.alert("Error", "Could not fetch transactions.");
        });

        return () => unsubscribe();
    } catch (error) {
        console.error("Error setting up transaction listener: ", error);
        Alert.alert("Error", "Could not set up transaction listener.");
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (topSellingCategory) {
        const categoryRef = doc(db, 'categories', topSellingCategory);
        const foodsCollectionRef = collection(categoryRef, 'foods');
        const unsubscribe = onSnapshot(foodsCollectionRef, (foodsSnapshot) => {
            const foodsList: PickerItem[] = foodsSnapshot.docs.map(doc => ({ label: doc.data().name, value: doc.id }));
            setFoods(foodsList);
        }, (error) => {
            console.error("Error fetching foods: ", error);
        });

        return () => unsubscribe();
    } else {
        setFoods([]);
    }
  }, [topSellingCategory]);

  const { totalSales, totalServiceCharge } = useMemo(() => {
    let sales = 0;
    let serviceCharge = 0;
    const foodNamesInCategory = foods.map(f => f.label);

    if (topSellingFood) {
        const selectedFoodLabel = foods.find(f => f.value === topSellingFood)?.label;
        transactions.forEach(t => {
            t.items.forEach(item => {
                if (item.name === selectedFoodLabel) {
                    sales += item.price;
                }
            });
        });
    } else if (topSellingCategory) {
        transactions.forEach(t => {
            t.items.forEach(item => {
                if (foodNamesInCategory.includes(item.name)) {
                    sales += item.price;
                }
            });
        });
    } else {
        sales = transactions.reduce((acc, curr) => acc + curr.total, 0);
        serviceCharge = transactions.reduce((acc, curr) => acc + (curr.serviceCharge || 0), 0);
    }
    return { totalSales: sales, totalServiceCharge: serviceCharge };
  }, [transactions, topSellingCategory, topSellingFood, foods]);

  const chartData = useMemo(() => {
    const data: { [key: string]: number } = {};
    const foodNamesInCategory = foods.map(f => f.label);
    const selectedFoodLabel = foods.find(f => f.value === topSellingFood)?.label;

    transactions.forEach(transaction => {
        const date = transaction.createdAt.toDate().toLocaleDateString();
        let salesForDate = 0;

        if (topSellingFood && selectedFoodLabel) {
            transaction.items.forEach(item => {
                if (item.name === selectedFoodLabel) {
                    salesForDate += item.price;
                }
            });
        } else if (topSellingCategory) {
            transaction.items.forEach(item => {
                if (foodNamesInCategory.includes(item.name)) {
                    salesForDate += item.price;
                }
            });
        } else {
            salesForDate = transaction.total;
        }

        if (salesForDate > 0) {
            data[date] = (data[date] || 0) + salesForDate;
        }
    });

    const labels = Object.keys(data);
    const dataPoints = Object.values(data);

    if (labels.length === 0) {
        return {
            labels: ['No Data'],
            datasets: [{ data: [0] }]
        };
    }

    return {
        labels,
        datasets: [{ data: dataPoints }]
    };
}, [transactions, topSellingCategory, topSellingFood, foods]);

const pieChartData = useMemo(() => {
    const foodNamesInCategory = foods.map(f => f.label);
    const selectedFoodLabel = foods.find(f => f.value === topSellingFood)?.label;

    const itemsToConsider = transactions.flatMap(t => t.items).filter(item => {
        if (selectedFoodLabel) {
            return item.name === selectedFoodLabel;
        }
        if (topSellingCategory) {
            return foodNamesInCategory.includes(item.name);
        }
        return true;
    });
    
    if (itemsToConsider.length === 0) {
        return [{ name: "No Data", population: 1, color: "#ccc", legendFontColor: "#7F7F7F", legendFontSize: 15 }];
    }

    const salesByFood = itemsToConsider.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.price;
        return acc;
    }, {} as { [key: string]: number });

    const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"];

    return Object.keys(salesByFood).map((key, index) => ({
        name: key,
        population: salesByFood[key],
        color: colors[index % colors.length],
        legendFontColor: "#7F7F7F",
        legendFontSize: 15
    }));
}, [transactions, topSellingCategory, topSellingFood, foods]);

  const currentYear = new Date().getFullYear();
  const minimumDate = new Date(currentYear, 0, 1);
  const maximumDate = new Date(currentYear, 11, 31);

  const onFromDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || fromDate;
    setShowFromDatePicker(Platform.OS === 'ios');
    setFromDate(currentDate);
  };

  const onToDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || toDate;
    setShowToDatePicker(Platform.OS === 'ios');
    setToDate(currentDate);
  };

  const handleCategoryChange = (value: string | null) => {
    setTopSellingCategory(value);
    setTopSellingFood(null);
  };

  const renderChart = () => {
    const chartWidth = isLandscape ? (width * 3 / 5) - 40 : screenWidth - 32;
    switch (chartType) {
      case 'Bar':
        return <BarChart style={styles.chart} data={chartData} width={chartWidth} height={220} yAxisLabel="₱" yAxisSuffix="" chartConfig={chartConfig} verticalLabelRotation={30} fromZero />;
      case 'Line':
        return <LineChart style={styles.chart} data={chartData} width={chartWidth} height={220} yAxisLabel="₱" yAxisSuffix="" chartConfig={chartConfig} fromZero bezier />;
      case 'Pie':
        return <PieChart data={pieChartData} width={chartWidth} height={220} chartConfig={chartConfig} accessor={"population"} backgroundColor={"transparent"} paddingLeft={"15"} absolute />;
      default:
        return null;
    }
  }

  const DateRangePicker = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterTitle}>Date Range:</Text>
      <View style={styles.dateFilterContainer}>
        <TouchableOpacity onPress={() => setShowFromDatePicker(true)} style={styles.dateButton}>
          <Text style={styles.dateButtonText}>{`From: ${fromDate.toLocaleDateString()}`}</Text>
        </TouchableOpacity>
        <Text style={styles.dateSeparator}> {'>'} </Text>
        <TouchableOpacity onPress={() => setShowToDatePicker(true)} style={styles.dateButton}>
          <Text style={styles.dateButtonText}>{`To: ${toDate.toLocaleDateString()}`}</Text>
        </TouchableOpacity>
      </View>
      {showFromDatePicker && (
        <DateTimePicker
          testID="fromDatePicker"
          value={fromDate}
          mode={"date"}
          display="default"
          onChange={onFromDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
      {showToDatePicker && (
        <DateTimePicker
          testID="toDatePicker"
          value={toDate}
          mode={"date"}
          display="default"
          onChange={onToDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );

  const TopSellingFilter = () => (
    <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Top Selling:</Text>
        <RNPickerSelect
            onValueChange={handleCategoryChange}
            items={categories}
            style={pickerSelectStyles}
            placeholder={{ label: "Select a category", value: null }}
            value={topSellingCategory}
        />
        <RNPickerSelect
            onValueChange={(value) => setTopSellingFood(value)}
            items={foods}
            style={pickerSelectStyles}
            placeholder={{ label: "Select a food item", value: null }}
            disabled={!topSellingCategory}
            value={topSellingFood}
        />
    </View>
  );

  const TotalSales = () => (
      <>
        <View style={styles.totalSalesContainer}>
            <Text style={styles.totalSalesTitle}>Total Sales</Text>
            <Text style={styles.totalSalesAmount}>₱{totalSales.toLocaleString()}</Text>
        </View>
        <View style={styles.totalSalesContainer}>
            <Text style={styles.totalSalesTitle}>Total Service Charge</Text>
            <Text style={styles.totalSalesAmount}>₱{totalServiceCharge.toLocaleString()}</Text>
        </View>
      </>
  );

  const Chart = () => (
      <>
        <View style={styles.chartTypeContainer}>
            <TouchableOpacity
            style={[styles.chartTypeButton, chartType === 'Bar' && styles.selectedChartType]}
            onPress={() => setChartType('Bar')}
            >
            <Text style={[styles.chartTypeText, chartType === 'Bar' && styles.selectedChartTypeText]}>Bar</Text>
            </TouchableOpacity>
            <TouchableOpacity
            style={[styles.chartTypeButton, chartType === 'Line' && styles.selectedChartType]}
            onPress={() => setChartType('Line')}
            >
            <Text style={[styles.chartTypeText, chartType === 'Line' && styles.selectedChartTypeText]}>Line</Text>
            </TouchableOpacity>
            <TouchableOpacity
            style={[styles.chartTypeButton, chartType === 'Pie' && styles.selectedChartType]}
            onPress={() => setChartType('Pie')}
            >
            <Text style={[styles.chartTypeText, chartType === 'Pie' && styles.selectedChartTypeText]}>Pie</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.chartContainer}>
            {renderChart()}
        </View>
    </>
  )

  return (
    <View style={{flex: 1, backgroundColor: Colors.light.background}}>
        {isLandscape ? (
            <View style={styles.landscapeLayout}>
                <ScrollView style={styles.leftPane}>
                    <TotalSales />
                    <Chart />
                </ScrollView>
                <ScrollView style={styles.rightPane}>
                    <DateRangePicker />
                    <TopSellingFilter />
                    <TouchableOpacity style={styles.downloadButton}>
                        <Text style={styles.downloadButtonText}>Download Report</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        ) : (
            <ScrollView style={styles.container}>
                <DateRangePicker />
                <TopSellingFilter />
                <TotalSales />
                <Chart />
                <TouchableOpacity style={styles.downloadButton}>
                    <Text style={styles.downloadButtonText}>Download Report</Text>
                </TouchableOpacity>
            </ScrollView>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  landscapeLayout: {
    flexDirection: 'row',
    flex: 1,
  },
  leftPane: {
    flex: 3,
    padding: 16,
  },
  rightPane: {
    flex: 2,
    padding: 16,
    borderLeftWidth: 1,
    borderColor: '#ccc',
  },
  filterContainer: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginBottom: 12,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  dateButtonText: {
    color: Colors.light.tint,
  },
  dateSeparator: {
    fontSize: 24,
    color: Colors.light.tint,
    marginHorizontal: 10,
  },
  chartTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  chartTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  selectedChartType: {
    backgroundColor: Colors.light.tint,
  },
  chartTypeText: {
    color: Colors.light.tint,
  },
  selectedChartTypeText: {
    color: '#fff',
  },
  chartContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  chart: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  downloadButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 45,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalSalesContainer: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  totalSalesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.tint,
  },
  totalSalesAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.tint,
    marginTop: 8,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30,
    marginBottom: 10,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: 'purple',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
    marginBottom: 10,
  },
});

export default ReportsAnalytics;
