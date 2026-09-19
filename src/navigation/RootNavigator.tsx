import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AgentEditScreen } from '../screens/AgentEditScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { colors } from '../theme/colors';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.primary,
    text: colors.text,
    border: colors.border,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="AgentEdit" component={AgentEditScreen} />
        <Stack.Screen name="Vault" component={VaultScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
