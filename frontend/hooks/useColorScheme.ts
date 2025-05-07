// Force light theme by always returning 'light' instead of the system color scheme
import { ColorSchemeName } from 'react-native';

// Create a custom hook that always returns light theme
export function useColorScheme(): NonNullable<ColorSchemeName> {
  return 'light';
}
