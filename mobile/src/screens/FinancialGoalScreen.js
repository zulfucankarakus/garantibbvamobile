import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// SafeAreaView removed
import { Header } from '../components/Header';
import { colors, spacing, fontSize } from '../utils/theme';

export default function FinancialGoalScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Header title="FinancialGoal" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.text}>FinancialGoalScreen - Yakında...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  text: { fontSize: fontSize.lg, color: colors.textSecondary },
});
