import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Step {
  label: string;
  num: number;
}

const STEPS_3: Step[] = [
  { num: 1, label: 'Event Details' },
  { num: 2, label: 'Menu' },
  { num: 3, label: 'Review' },
];

const STEPS_4: Step[] = [
  { num: 1, label: 'Customer' },
  { num: 2, label: 'Event Details' },
  { num: 3, label: 'Menu' },
  { num: 4, label: 'Review' },
];

export default function StepIndicator({ current, total = 3 }: { current: number; total?: number }) {
  const STEPS = total === 4 ? STEPS_4 : STEPS_3;
  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => (
        <React.Fragment key={step.num}>
          <View style={styles.stepItem}>
            <View style={[
              styles.circle,
              current >= step.num ? styles.circleActive : styles.circleInactive,
            ]}>
              <Text style={[styles.num, current >= step.num ? styles.numActive : styles.numInactive]}>
                {step.num}
              </Text>
            </View>
            <Text style={[styles.label, current >= step.num ? styles.labelActive : styles.labelInactive]}>
              {step.label}
            </Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[styles.line, current > step.num ? styles.lineActive : styles.lineInactive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff' },
  stepItem: { alignItems: 'center', gap: 4 },
  circle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  circleActive: { backgroundColor: '#1B4332' },
  circleInactive: { backgroundColor: '#E5E7EB' },
  num: { fontSize: 13, fontWeight: '700' },
  numActive: { color: '#fff' },
  numInactive: { color: '#9CA3AF' },
  label: { fontSize: 10, fontWeight: '600' },
  labelActive: { color: '#1B4332' },
  labelInactive: { color: '#9CA3AF' },
  line: { flex: 1, height: 2, marginBottom: 16 },
  lineActive: { backgroundColor: '#1B4332' },
  lineInactive: { backgroundColor: '#E5E7EB' },
});