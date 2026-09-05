import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/context/LanguageContext';
import Colors from '@/constants/Colors';

interface Step {
  labelKey: string;
  num: number;
}

const STEPS_3: Step[] = [
  { num: 1, labelKey: 'Event Details' },
  { num: 2, labelKey: 'Menu' },
  { num: 3, labelKey: 'Review Order' },
];

const STEPS_4: Step[] = [
  { num: 1, labelKey: 'Customer Details' },
  { num: 2, labelKey: 'Event Details' },
  { num: 3, labelKey: 'Menu' },
  { num: 4, labelKey: 'Review Order' },
];

export default function StepIndicator({ current, total = 3 }: { current: number; total?: number }) {
  const { t } = useLanguage();
  const STEPS = total === 4 ? STEPS_4 : STEPS_3;
  return (
    <LinearGradient colors={['#1B5E20', '#2E7D32']} style={styles.container}>
      {STEPS.map((step, i) => (
        <View key={step.num} style={styles.stepItem}>
          <View style={styles.circleRow}>
            {i > 0 ? (
              <View style={[styles.line, current >= step.num ? styles.lineActive : styles.lineInactive]} />
            ) : (
              <View style={styles.linePlaceholder} />
            )}
            <View style={[
              styles.circle,
              current >= step.num ? styles.circleActive : styles.circleInactive,
            ]}>
              <Text style={[styles.num, current >= step.num ? styles.numActive : styles.numInactive]}>
                {step.num}
              </Text>
            </View>
            {i < STEPS.length - 1 ? (
              <View style={[styles.line, current > step.num ? styles.lineActive : styles.lineInactive]} />
            ) : (
              <View style={styles.linePlaceholder} />
            )}
          </View>
          <Text
            style={[styles.label, current >= step.num ? styles.labelActive : styles.labelInactive]}
            numberOfLines={2}
          >
            {t(step.labelKey)}
          </Text>
        </View>
      ))}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 32,
  },
  line: {
    flex: 1,
    height: 2,
  },
  linePlaceholder: {
    flex: 1,
    height: 2,
    backgroundColor: 'transparent',
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleActive: {
    backgroundColor: Colors.white,
  },
  circleInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  num: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  numActive: {
    color: '#1B5E20',
  },
  numInactive: {
    color: Colors.white,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    width: '100%',
    paddingHorizontal: 2,
    lineHeight: 13,
  },
  labelActive: {
    color: Colors.white,
  },
  labelInactive: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  lineActive: {
    backgroundColor: Colors.white,
  },
  lineInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});