import DateTimePicker from '@react-native-community/datetimepicker';
import { PrismaClient, Category, Food, Transaction, Prisma } from '@prisma/client';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import RNPickerSelect from 'react-native-picker-select';
import { Colors } from '../../constants/theme';

const prisma = new PrismaClient();

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
    value: any;
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
    const [topSellingCategory, setTopSellingCategory] = useState<number | null>(null);
    const [topSellingFood, setTopSellingFood] = useState<number | null>(null);
    const [categories, setCategories] = useState<PickerItem[]>([]);
    const [foods, setFoods] = useState<PickerItem[]>([]);
    const [transactions, setTransactions] = useState<Prisma.TransactionGetPayload<{ include: { items: true } }>[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categoriesList = await prisma.category.findMany();
                setCategories(categoriesList.map(c => ({ label: c.name, value: c.id })));
            } catch (error) {
                console.error("Error fetching categories: ", error);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const startOfDay = new Date(fromDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);

                const fetchedTransactions = await prisma.transaction.findMany({
                    where: {
                        createdAt: {
                            gte: startOfDay,
                            lte: endOfDay,
                        },
                    },
                    include: { items: true },
                });
                setTransactions(fetchedTransactions);
            } catch (error) {
                console.error("Error fetching transactions: ", error);
                Alert.alert("Error", "Could not fetch transactions.");
            }
        };
        fetchTransactions();
    }, [fromDate, toDate]);

    useEffect(() => {
        const fetchFoods = async () => {
            if (topSellingCategory) {
                try {
                    const foodsList = await prisma.food.findMany({ where: { categoryId: topSellingCategory } });
                    setFoods(foodsList.map(f => ({ label: f.name, value: f.id })));
                } catch (error) {
                    console.error("Error fetching foods: ", error);
                }
            } else {
                setFoods([]);
            }
        };
        fetchFoods();
    }, [topSellingCategory]);

    const { totalSales, totalServiceCharge } = useMemo(() => {
        let sales = transactions.reduce((acc, curr) => acc + curr.total, 0);
        let serviceCharge = transactions.reduce((acc, curr) => acc + (curr.serviceCharge || 0), 0);
        return { totalSales: sales, totalServiceCharge: serviceCharge };
    }, [transactions]);

    const chartData = useMemo(() => {
        const data: { [key: string]: number } = {};
        transactions.forEach(transaction => {
            const date = new Date(transaction.createdAt).toLocaleDateString();
            data[date] = (data[date] || 0) + transaction.total;
        });

        const labels = Object.keys(data);
        const dataPoints = Object.values(data);

        if (labels.length === 0) {
            return { labels: ['No Data'], datasets: [{ data: [0] }] };
        }

        return { labels, datasets: [{ data: dataPoints }] };
    }, [transactions]);

    const pieChartData = useMemo(() => {
        if (transactions.length === 0) {
            return [{ name: "No Data", population: 1, color: "#ccc", legendFontColor: "#7F7F7F", legendFontSize: 15 }];
        }

        const salesByFood = transactions.flatMap(t => t.items).reduce((acc, item) => {
            acc[item.name] = (acc[item.name] || 0) + item.total;
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
    }, [transactions]);

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
            <Text style={styles.filterTitle}>Filter by:</Text>
            <RNPickerSelect
                onValueChange={(value) => setTopSellingCategory(value)}
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
        <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
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
