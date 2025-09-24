
import { Platform } from 'react-native';

const tintColorLight = '#00008B'; // DarkBlue, from your logo
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C', // A very dark gray, almost black
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};
