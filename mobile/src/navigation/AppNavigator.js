import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../utils/theme';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import DashboardScreen from '../screens/DashboardScreen';
import AccountsScreen from '../screens/AccountsScreen';
import CardsScreen from '../screens/CardsScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Other Screens
import NotificationsScreen from '../screens/NotificationsScreen';
import MoneyTransferScreen from '../screens/MoneyTransferScreen';
import QRPaymentScreen from '../screens/QRPaymentScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import CreateCardScreen from '../screens/CreateCardScreen';
import AccountDetailScreen from '../screens/AccountDetailScreen';
import CardDetailScreen from '../screens/CardDetailScreen';
import UgiAssistantScreen from '../screens/UgiAssistantScreen';
import FinancialGoalScreen from '../screens/FinancialGoalScreen';
import MoreScreen from '../screens/MoreScreen';
import VisionLensScreen from '../screens/VisionLensScreen';
import VideoVisionAssistantScreen from '../screens/VideoVisionAssistantScreen';
// New Vision Flow Screens
import ProductComparisonScreen from '../screens/ProductComparisonScreen';
import FinancialDecisionScreen from '../screens/FinancialDecisionScreen';
import SimpleFinancialScreen from '../screens/SimpleFinancialScreen';
import InstallmentSelectionScreen from '../screens/InstallmentSelectionScreen';
import SavingsPlanScreen from '../screens/SavingsPlanScreen';
import PaymentConfirmationScreen from '../screens/PaymentConfirmationScreen';
import LoanApplicationScreen from '../screens/LoanApplicationScreen';
import BranchLocatorScreen from '../screens/BranchLocatorScreen';
// Investment Screens
import InvestmentsScreen from '../screens/InvestmentsScreen';
import InvestmentDetailScreen from '../screens/InvestmentDetailScreen';
import InvestmentPortfolioScreen from '../screens/InvestmentPortfolioScreen';
import SavingsGoalDetailScreen from '../screens/SavingsGoalDetailScreen';
import SmartInvestmentScreen from '../screens/SmartInvestmentScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Accounts') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Cards') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Transactions') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'menu' : 'menu-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Ana Sayfa' }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ title: 'Hesaplar' }}
      />
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{ title: 'Kartlar' }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: 'İşlemler' }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ title: 'Daha Fazla' }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // App Stack
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="MoneyTransfer" component={MoneyTransferScreen} />
            <Stack.Screen name="QRPayment" component={QRPaymentScreen} />
            <Stack.Screen name="Payments" component={PaymentsScreen} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
            <Stack.Screen name="CreateCard" component={CreateCardScreen} />
            <Stack.Screen name="AccountDetail" component={AccountDetailScreen} />
            <Stack.Screen name="CardDetail" component={CardDetailScreen} />
            <Stack.Screen name="UgiAssistant" component={UgiAssistantScreen} />
            <Stack.Screen name="FinancialGoal" component={FinancialGoalScreen} />
            <Stack.Screen name="VisionLens" component={VisionLensScreen} />
            <Stack.Screen name="VideoVisionAssistant" component={VideoVisionAssistantScreen} />
            {/* New Vision Flow Screens */}
            <Stack.Screen name="ProductComparison" component={ProductComparisonScreen} />
            <Stack.Screen name="FinancialDecision" component={FinancialDecisionScreen} />
            <Stack.Screen name="SimpleFinancial" component={SimpleFinancialScreen} />
            <Stack.Screen name="InstallmentSelection" component={InstallmentSelectionScreen} />
            <Stack.Screen name="LoanApplication" component={LoanApplicationScreen} />
            <Stack.Screen name="BranchLocator" component={BranchLocatorScreen} />
            <Stack.Screen name="SavingsPlan" component={SavingsPlanScreen} />
            <Stack.Screen name="PaymentConfirmation" component={PaymentConfirmationScreen} />
            <Stack.Screen name="Investments" component={InvestmentsScreen} />
            <Stack.Screen name="InvestmentDetail" component={InvestmentDetailScreen} />
            <Stack.Screen name="InvestmentPortfolio" component={InvestmentPortfolioScreen} />
            <Stack.Screen name="SavingsGoalDetail" component={SavingsGoalDetailScreen} />
            <Stack.Screen name="SmartInvestment" component={SmartInvestmentScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
