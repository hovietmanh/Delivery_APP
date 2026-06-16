import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@constants/Colors';
import { Typography } from '@constants/Layout';

interface TrackingEvent {
  status: string;
  label: string;
  location?: string;
  note?: string;
  timestamp?: string;
  isDone: boolean;
  isActive: boolean;
}

interface Props { events: TrackingEvent[] }

export function TrackingTimeline({ events }: Props) {
  return (
    <View style={styles.container}>
      {events.map((event, i) => (
        <View key={i} style={styles.row}>
          {/* Left: dot + line */}
          <View style={styles.dotCol}>
            <View style={[
              styles.dot,
              event.isDone && styles.dotDone,
              event.isActive && styles.dotActive,
            ]}>
              {event.isDone && <Text style={styles.check}>✓</Text>}
              {event.isActive && <Text style={styles.busIcon}>🚌</Text>}
            </View>
            {i < events.length - 1 && (
              <View style={[styles.line, event.isDone && styles.lineDone]} />
            )}
          </View>

          {/* Right: content */}
          <View style={styles.content}>
            <View style={styles.topRow}>
              <Text style={[styles.label, event.isActive && styles.labelActive, event.isDone && styles.labelDone]}>
                {event.label}
              </Text>
              {event.timestamp && (
                <Text style={styles.time}>{event.timestamp}</Text>
              )}
            </View>
            {event.location && <Text style={styles.location}>{event.location}</Text>}
            {event.note && <Text style={styles.note}>{event.note}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  row: { flexDirection: 'row', marginBottom: 4 },
  dotCol: { width: 36, alignItems: 'center' },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.bg, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  dotDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  dotActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  check: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  busIcon: { fontSize: 14 },
  line: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2, minHeight: 20 },
  lineDone: { backgroundColor: Colors.success },
  content: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...Typography.bodyBold, color: Colors.secondary, flex: 1 },
  labelActive: { color: Colors.blue },
  labelDone: { color: Colors.dark },
  time: { ...Typography.smallBold, color: Colors.secondary },
  location: { ...Typography.small, color: Colors.secondary, marginTop: 2 },
  note: { ...Typography.small, color: Colors.placeholder, marginTop: 2, fontStyle: 'italic' },
});
