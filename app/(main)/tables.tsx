import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const TablesScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Tables Screen</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 20,
    },
});

export default TablesScreen;
