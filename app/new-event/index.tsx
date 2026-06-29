import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, X, Calendar, Minus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useNewEvent, EventDate } from '@/context/NewEventContext';
import StepIndicator from '@/components/StepIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal } from 'react-native';

const EVENT_TYPES = ['Wedding', 'Corporate', 'Birthday', 'Anniversary', 'Private Party'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function genId() { return Math.random().toString(36).slice(2, 10); }

function DatePickerModal({ visible, onClose, onSelect, initialDate }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (dateStr: string) => void;
  initialDate: string;
}) {
  const today = new Date();
  const init = initialDate ? new Date(initialDate + 'T00:00:00') : today;
  const [month, setMonth] = useState(init.getMonth());
  const [year, setYear] = useState(init.getFullYear());
  const [selected, setSelected] = useState(initialDate || today.toISOString().split('T')[0]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const makeDate = (day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;
  const todayStr = today.toISOString().split('T')[0];

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={dp.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={dp.picker}>
          <View style={dp.header}>
            <TouchableOpacity onPress={prevMonth} style={dp.navBtn}><ChevronLeft size={18} color="#374151" /></TouchableOpacity>
            <Text style={dp.monthTitle}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={dp.navBtn}><ChevronRight size={18} color="#374151" /></TouchableOpacity>
          </View>
          <View style={dp.daysRow}>
            {DAYS.map(d => <Text key={d} style={dp.dayLabel}>{d}</Text>)}
          </View>
          <View style={dp.grid}>
            {Array.from({ length: firstDay }).map((_, i) => <View key={`e${i}`} style={dp.cell} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = makeDate(day);
              const isSel = ds === selected;
              const isToday = ds === todayStr;
              return (
                <TouchableOpacity key={day} style={dp.cell} onPress={() => setSelected(ds)}>
                  <View style={[dp.bubble, isSel && dp.bubbleSel, isToday && !isSel && dp.bubbleToday]}>
                    <Text style={[dp.dayNum, isSel && dp.dayNumSel, isToday && !isSel && dp.dayNumToday]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={dp.footer}>
            <TouchableOpacity style={dp.cancelBtn} onPress={onClose}>
              <Text style={dp.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dp.confirmBtn} onPress={() => { onSelect(selected); onClose(); }}>
              <Text style={dp.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const dp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  picker: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: 320, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  daysRow: { flexDirection: 'row', marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  bubble: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  bubbleSel: { backgroundColor: '#1B4332' },
  bubbleToday: { borderWidth: 1.5, borderColor: '#1B4332' },
  dayNum: { fontSize: 13, fontWeight: '500', color: '#374151' },
  dayNumSel: { color: '#fff', fontWeight: '700' },
  dayNumToday: { color: '#1B4332', fontWeight: '700' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10 },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  confirmBtn: { flex: 1, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B4332', borderRadius: 10 },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default function EventDetailsScreen() {
  const router = useRouter();
  const { data, update } = useNewEvent();
  const insets = useSafeAreaInsets();

  const [eventName, setEventName] = useState(data.eventName);
  const [eventType, setEventType] = useState(data.eventType || 'wedding');
  const [eventDates, setEventDates] = useState<EventDate[]>(data.eventDates.length > 0 ? data.eventDates : []);
  const [venue, setVenue] = useState(data.venue);
  const [guestCount, setGuestCount] = useState(data.guestCount || 100);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateId, setActiveDateId] = useState<string | null>(null);

  const addDate = () => {
    const newDate: EventDate = { id: genId(), date: new Date().toISOString().split('T')[0], mealTypes: ['Breakfast'] };
    setEventDates(prev => [...prev, newDate]);
    setActiveDateId(newDate.id);
    setShowDatePicker(true);
  };

  const editDate = (id: string) => {
    setActiveDateId(id);
    setShowDatePicker(true);
  };

  const removeDate = (id: string) => setEventDates(prev => prev.filter(d => d.id !== id));

  const toggleMeal = (dateId: string, meal: string) => {
    setEventDates(prev => prev.map(d => {
      if (d.id !== dateId) return d;
      const meals = d.mealTypes.includes(meal)
        ? d.mealTypes.filter(m => m !== meal)
        : [...d.mealTypes, meal];
      return { ...d, mealTypes: meals };
    }));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getActiveDateStr = () => {
    if (!activeDateId) return new Date().toISOString().split('T')[0];
    return eventDates.find(d => d.id === activeDateId)?.date || new Date().toISOString().split('T')[0];
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!eventName.trim()) e.eventName = 'Event name is required';
    if (!venue.trim()) e.venue = 'Venue is required';
    if (eventDates.length === 0) e.eventDates = 'Add at least one date';
    return e;
  };

  const handleNext = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    update({ eventName, eventType, eventDates, venue, guestCount });
    router.push('/new-event/select-menu-type');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Event</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step 2 of 4 since customer was step 1 */}
        <StepIndicator current={2} total={4} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.sectionLabel}>Event Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.eventName ? styles.inputError : null]}
            placeholder="Sathish Wedding"
            placeholderTextColor="#9CA3AF"
            value={eventName}
            onChangeText={(t) => setEventName(t.replace(/[^a-zA-Z\s]/g, ''))}
            autoCapitalize="words"
          />
          {errors.eventName ? <Text style={styles.fieldError}>{errors.eventName}</Text> : null}

          <Text style={styles.sectionLabel}>Event Type <Text style={styles.required}>*</Text></Text>
          <View style={styles.typeGrid}>
            {EVENT_TYPES.map(type => {
              const key = type.toLowerCase().replace(/ /g, '_');
              const active = eventType === key;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeBtn, active ? styles.typeBtnActive : null]}
                  onPress={() => setEventType(key)}
                >
                  <Text style={[styles.typeBtnText, active ? styles.typeBtnTextActive : null]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dateSectionHeader}>
            <Text style={styles.sectionLabel}>Selected Event Date & Meal <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.addDateBtn} onPress={addDate}>
              <Plus size={14} color="#1B4332" />
              <Text style={styles.addDateText}>Add Date</Text>
            </TouchableOpacity>
          </View>
          {errors.eventDates ? <Text style={styles.fieldError}>{errors.eventDates}</Text> : null}

          {eventDates.map(ed => (
            <View key={ed.id} style={styles.dateCard}>
              <View style={styles.dateCardHeader}>
                <TouchableOpacity style={styles.dateRow} onPress={() => editDate(ed.id)}>
                  <Calendar size={16} color="#1B4332" />
                  <Text style={styles.dateText}>{formatDate(ed.date)}</Text>
                  <View style={styles.eventTypePill}>
                    <Text style={styles.eventTypePillText}>{eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeDate(ed.id)} style={{ padding: 4 }}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <View style={styles.mealRow}>
                {MEAL_TYPES.map(meal => (
                  <TouchableOpacity
                    key={meal}
                    style={[styles.mealBtn, ed.mealTypes.includes(meal) ? styles.mealBtnActive : null]}
                    onPress={() => toggleMeal(ed.id, meal)}
                  >
                    <Text style={[styles.mealBtnText, ed.mealTypes.includes(meal) ? styles.mealBtnTextActive : null]}>
                      {meal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <Text style={styles.sectionLabel}>Venue <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.venue ? styles.inputError : null]}
            placeholder="PLP Palace"
            placeholderTextColor="#9CA3AF"
            value={venue}
            onChangeText={setVenue}
          />
          {errors.venue ? <Text style={styles.fieldError}>{errors.venue}</Text> : null}

          <Text style={styles.sectionLabel}>Number of Guests <Text style={styles.required}>*</Text></Text>
          <View style={styles.counterRow}>
            <TouchableOpacity style={styles.counterBtn} onPress={() => setGuestCount(g => Math.max(1, g - 10))}>
              <Minus size={18} color="#374151" />
            </TouchableOpacity>
            <TextInput
              style={styles.counterInput}
              value={String(guestCount)}
              onChangeText={(t) => setGuestCount(parseInt(t.replace(/\D/g, '') || '0', 10))}
              keyboardType="numeric"
              textAlign="center"
            />
            <TouchableOpacity style={styles.counterBtn} onPress={() => setGuestCount(g => g + 10)}>
              <Plus size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Next: Build Menu</Text>
            <Text style={styles.nextArrow}>→</Text>
          </TouchableOpacity>
        </ScrollView>

        <DatePickerModal
          visible={showDatePicker}
          onClose={() => { setShowDatePicker(false); setActiveDateId(null); }}
          initialDate={getActiveDateStr()}
          onSelect={(dateStr) => {
            if (activeDateId) {
              setEventDates(prev => prev.map(d => d.id === activeDateId ? { ...d, date: dateStr } : d));
            }
            setActiveDateId(null);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 8 },
  required: { color: '#DC2626' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, height: 50, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB', marginBottom: 4 },
  inputError: { borderColor: '#EF4444' },
  fieldError: { color: '#EF4444', fontSize: 12, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeBtn: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  typeBtnActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  typeBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  typeBtnTextActive: { color: '#fff' },
  dateSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  addDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addDateText: { fontSize: 13, color: '#1B4332', fontWeight: '600' },
  dateCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dateCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dateText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  eventTypePill: { backgroundColor: '#1B4332', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  eventTypePillText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mealBtn: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fff' },
  mealBtnActive: { backgroundColor: '#D1FAE5', borderColor: '#1B4332' },
  mealBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  mealBtnTextActive: { color: '#065F46', fontWeight: '700' },
  counterRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden', marginBottom: 8, height: 50 },
  counterBtn: { width: 50, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  counterInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827' },
  nextBtn: { backgroundColor: '#1B4332', borderRadius: 12, height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 8 },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  nextArrow: { fontSize: 18, color: '#fff' },
});