import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import RNPickerSelect from 'react-native-picker-select';
import { Colors } from '../../constants/theme';
import { collection, getDocs, doc } from "firebase/firestore";
import { db } from "../../firebase";

const screenWidth = Dimensions.get("window").width;

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2, // optional, default 3
  barPercentage: 0.5,
  useShadowColorFromDataset: false // optional
};

const data = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      data: [20, 45, 28, 80, 99, 43],
      color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // optional
      strokeWidth: 2 // optional
    }
  ],
};

const pieChartData = [
  { name: "Seoul", population: 21500000, color: "rgba(131, 167, 234, 1)", legendFontColor: "#7F7F7F", legendFontSize: 15 },
  { name: "Toronto", population: 2800000, color: "#F00", legendFontColor: "#7F7F7F", legendFontSize: 15 },
  { name: "Beijing", population: 527612, color: "red", legendFontColor: "#7F7F7F", legendFontSize: 15 },
  { name: "New York", population: 8538000, color: "#ffffff", legendFontColor: "#7F7F7F", legendFontSize: 15 },
  { name: "Moscow", population: 11920000, color: "rgb(0, 0, 255)", legendFontColor: "#7F7F7F", legendFontSize: 15 }
];

interface PickerItem {
    label: string;
    value: string;
  }

const ReportsAnalytics = () => {
  const [chartType, setChartType] = useState('Bar');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [topSellingCategory, setTopSellingCategory] = useState<string | null>(null);
  const [topSellingFood, setTopSellingFood] = useState<string | null>(null);
  const [totalSales, setTotalSales] = useState(5450.75); // Dummy data
  const [categories, setCategories] = useState<PickerItem[]>([]);
  const [foods, setFoods] = useState<PickerItem[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const categoriesCollection = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(categoriesCollection);
      const categoriesList: PickerItem[] = categoriesSnapshot.docs.map(doc => ({ label: doc.data().name, value: doc.id }));
      setCategories(categoriesList);
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchFoods = async () => {
        if (topSellingCategory) {
            const categoryRef = doc(db, 'categories', topSellingCategory);
            const foodsCollectionRef = collection(categoryRef, 'foods');
            const foodsSnapshot = await getDocs(foodsCollectionRef);
            const foodsList: PickerItem[] = foodsSnapshot.docs.map(doc => ({ label: doc.data().name, value: doc.id }));
            setFoods(foodsList);
        } else {
            setFoods([]);
        }
      };

    fetchFoods();
  }, [topSellingCategory]);

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
    switch (chartType) {
      case 'Bar':
        return <BarChart style={styles.chart} data={data} width={screenWidth - 32} height={220} yAxisLabel="" yAxisSuffix="" chartConfig={chartConfig} verticalLabelRotation={30} />;
      case 'Line':
        return <LineChart style={styles.chart} data={data} width={screenWidth - 32} height={220} yAxisLabel="" yAxisSuffix="" chartConfig={chartConfig} />;
      case 'Pie':
        return <PieChart data={pieChartData} width={screenWidth - 32} height={220} chartConfig={chartConfig} accessor={"population"} backgroundColor={"transparent"} paddingLeft={"15"} absolute />;
      default:
        return null;
    }
  }

  return (
    <ScrollView style={styles.container}>
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

      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Top Selling:</Text>
        <RNPickerSelect
            onValueChange={handleCategoryChange}
            items={categories}
            style={pickerSelectStyles}
            placeholder={{ label: "Select a category", value: null }}
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

      <View style={styles.totalSalesContainer}>
        <Text style={styles.totalSalesTitle}>Total Sales</Text>
        <Text style={styles.totalSalesAmount}>${totalSales.toLocaleString()}</Text>
      </View>

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

      <TouchableOpacity style={styles.downloadButton}>
        <Text style={styles.downloadButtonText}>Download Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
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
  },
  downloadButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
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
