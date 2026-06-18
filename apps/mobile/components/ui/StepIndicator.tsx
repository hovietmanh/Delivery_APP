import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@constants/Colors';

interface Step { label: string }
interface Props { steps: Step[]; current: number }

const CIRCLE = 30;

export function StepIndicator({ steps, current }: Props) {
  const { top } = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingTop: top + 12 }]}>
      {/* Steps row — track line là absolute bên trong này */}
      <View style={styles.stepsRow}>

        {/* Đường kẻ nền */}
        <View style={styles.trackBg} />

        {/* Đường kẻ tiến độ — width = current/steps.length * 100% để căn đúng tâm circle */}
        <View style={[
          styles.trackFill,
          { width: `${(current / steps.length) * 100}%` },
        ]} />

        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <View key={i} style={styles.stepCol}>
              <View style={[
                styles.circle,
                done && styles.circleDone,
                active && styles.circleActive,
              ]}>
                {done
                  ? <Text style={styles.checkIcon}>✓</Text>
                  : <Text style={[styles.num, active && styles.numActive]}>{i + 1}</Text>
                }
              </View>
              <Text style={[
                styles.label,
                active && styles.labelActive,
                done && styles.labelDone,
              ]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    paddingBottom: 12,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },

  // Đường kẻ căn đúng tâm circle (CIRCLE/2 = 15)
  trackBg: {
    position: 'absolute',
    top: CIRCLE / 2,
    left: '12.5%',
    right: '12.5%',
    height: 2,
    backgroundColor: '#E5E7EB',
    zIndex: 0,
  },
  trackFill: {
    position: 'absolute',
    top: CIRCLE / 2,
    left: '12.5%',
    height: 2,
    backgroundColor: Colors.success,
    zIndex: 0,
  },

  stepCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },

  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blue,
  },
  circleDone: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },

  num: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  numActive: {
    color: '#fff',
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.blue,
    fontWeight: '700',
  },
  labelDone: {
    color: Colors.success,
    fontWeight: '600',
  },
});
