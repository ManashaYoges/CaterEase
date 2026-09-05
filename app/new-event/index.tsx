import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Platform, Modal, KeyboardAvoidingView, ScrollView, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, X, Calendar, Minus, ChevronLeft, ChevronRight, Clock, ChevronDown, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNewEvent, EventDate } from '@/context/NewEventContext';
import StepIndicator from '@/components/StepIndicator';
import OnboardingGuidancePopup from '@/components/OnboardingGuidancePopup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from '@/components/KeyboardAwareScrollView';
import { F, scaleFont } from '@/utils/fonts';
import { T } from '@/utils/typography';
import Colors from '@/constants/Colors';
import { DEFAULT_EVENT_TYPES, getCustomEventTypes, saveCustomEventType } from '@/utils/eventTypeStorage';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function genId() { return Math.random().toString(36).slice(2, 10); }

function DatePickerModal({ visible, onClose, onSelect, initialDate }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (dateStr: string) => void;
  initialDate: string;
}) {
  const { t, language } = useLanguage();
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

  const daysHeaders = language === 'ta'
    ? ['ஞா', 'தி', 'செ', 'பு', 'வி', 'வெ', 'ச']
    : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={dp.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={dp.picker}>
          <View style={dp.header}>
            <TouchableOpacity onPress={prevMonth} style={dp.navBtn}><ChevronLeft size={18} color="#374151" /></TouchableOpacity>
            <Text style={dp.monthTitle}>{t(MONTHS[month])} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={dp.navBtn}><ChevronRight size={18} color="#374151" /></TouchableOpacity>
          </View>
          <View style={dp.daysRow}>
            {daysHeaders.map(d => <Text key={d} style={dp.dayLabel}>{d}</Text>)}
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
              <Text style={dp.cancelText}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dp.confirmBtn} onPress={() => { onSelect(selected); onClose(); }}>
              <Text style={dp.confirmText}>{t('Confirm')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function TimePickerModal({ visible, title, value, onClose, onSelect }: {
  visible: boolean;
  title: string;
  value: string;
  onClose: () => void;
  onSelect: (time: string) => void;
}) {
  const { t } = useLanguage();
  const [hour, setHour] = useState(Number((value || '08:00').split(':')[0]) || 0);
  const [minute, setMinute] = useState(Number((value || '08:00').split(':')[1]) || 0);

  useEffect(() => {
    setHour(Number((value || '08:00').split(':')[0]) || 0);
    setMinute(Number((value || '08:00').split(':')[1]) || 0);
  }, [value, visible]);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const minuteOptions = [0, 15, 30, 45];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={tp.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={tp.picker}>
          <View style={tp.header}>
            <Clock size={16} color="#1B4332" />
            <Text style={tp.title}>{title}</Text>
          </View>
          <Text style={tp.preview}>{pad(hour)}:{pad(minute)}</Text>
          <Text style={tp.subTitle}>{t('Hour')}</Text>
          <View style={tp.grid}>
            {Array.from({ length: 24 }).map((_, h) => (
              <TouchableOpacity
                key={h}
                style={[tp.timeCell, hour === h && tp.timeCellActive]}
                onPress={() => setHour(h)}
              >
                <Text style={[tp.timeCellText, hour === h && tp.timeCellTextActive]}>{pad(h)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={tp.subTitle}>{t('Minute')}</Text>
          <View style={tp.minuteRow}>
            {minuteOptions.map(m => (
              <TouchableOpacity
                key={m}
                style={[tp.minuteCell, minute === m && tp.timeCellActive]}
                onPress={() => setMinute(m)}
              >
                <Text style={[tp.timeCellText, minute === m && tp.timeCellTextActive]}>{pad(m)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={tp.footer}>
            <TouchableOpacity style={tp.cancelBtn} onPress={onClose}>
              <Text style={tp.cancelText}>{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tp.confirmBtn} onPress={() => { onSelect(`${pad(hour)}:${pad(minute)}`); onClose(); }}>
              <Text style={tp.confirmText}>{t('Confirm')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function EventDetailsScreen() {
  const router = useRouter();
  const { data, update } = useNewEvent();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const eventNameRef = useRef<TextInput>(null);
  const venueRef = useRef<TextInput>(null);
  const guestCountRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const [eventName, setEventName] = useState(data.eventName || '');
  const [eventType, setEventType] = useState(data.eventType || '');
  const [eventDates, setEventDates] = useState<EventDate[]>(data.eventDates.length > 0 ? data.eventDates : []);
  const [venue, setVenue] = useState(data.venue || '');
  const [guestCount, setGuestCount] = useState(data.guestCount || 0);
  const [notes, setNotes] = useState(data.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Custom Event Type & Dropdown State
  const [customEventTypes, setCustomEventTypes] = useState<string[]>([]);
  const [showDropdownModal, setShowDropdownModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customEventTypeInput, setCustomEventTypeInput] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    getCustomEventTypes(user?.uid).then(types => {
      if (isMounted) {
        setCustomEventTypes(types);
      }
    });
    return () => { isMounted = false; };
  }, [user?.uid]);

  useEffect(() => {
    setEventName(data.eventName || '');
    setEventDates(data.eventDates.length > 0 ? data.eventDates : []);
    setVenue(data.venue || '');
    setGuestCount(data.guestCount || 0);
    setNotes(data.notes || '');

    const currentType = data.eventType || '';

    if (currentType) {
      setEventType(currentType);
      const matchedDefault = DEFAULT_EVENT_TYPES.find(
        d => d.toLowerCase() === currentType.toLowerCase() || d.toLowerCase().replace(/ /g, '_') === currentType.toLowerCase()
      );
      if (matchedDefault) {
        setSelectedOption(matchedDefault);
        setCustomEventTypeInput('');
      } else {
        const matchedCustom = customEventTypes.find(
          c => c.toLowerCase() === currentType.toLowerCase() || c.toLowerCase().replace(/ /g, '_') === currentType.toLowerCase()
        );
        if (matchedCustom) {
          setSelectedOption(matchedCustom);
          setCustomEventTypeInput('');
        } else {
          // Custom type string loaded from context/data
          setSelectedOption('Custom');
          setCustomEventTypeInput(currentType);
        }
      }
    } else if (selectedOption !== 'Custom') {
      setEventType('');
      setSelectedOption('');
      setCustomEventTypeInput('');
    }
  }, [data.eventName, data.eventType, data.eventDates, data.venue, data.guestCount, data.notes, customEventTypes]);

  const dropdownOptions = useMemo(() => {
    const list = [...DEFAULT_EVENT_TYPES];
    customEventTypes.forEach(c => {
      if (!list.some(d => d.toLowerCase() === c.toLowerCase())) {
        list.push(c);
      }
    });
    if (!list.includes('Custom')) {
      list.push('Custom');
    }
    return list;
  }, [customEventTypes]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateId, setActiveDateId] = useState<string | null>(null);
  const [activeTimePicker, setActiveTimePicker] = useState<{
    dateId: string;
    meal: string;
    field: 'from' | 'to';
  } | null>(null);

  const addDate = () => {
    const newDate: EventDate = { id: genId(), date: new Date().toISOString().split('T')[0], mealTypes: ['Breakfast'], mealTimings: {} };
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
      const mealKey = meal.toLowerCase();
      const isSelected = d.mealTypes.includes(meal);
      const meals = isSelected
        ? d.mealTypes.filter(m => m !== meal)
        : [...d.mealTypes, meal];
      const mealTimings = { ...(d.mealTimings || {}) };
      if (isSelected) delete mealTimings[mealKey];
      return { ...d, mealTypes: meals, mealTimings };
    }));
  };

  const updateMealTiming = (dateId: string, meal: string, field: 'from' | 'to', time: string) => {
    const mealKey = meal.toLowerCase();
    setEventDates(prev => prev.map(d => {
      if (d.id !== dateId) return d;
      const currentTiming = d.mealTimings?.[mealKey] || { from: '', to: '' };
      return {
        ...d,
        mealTimings: {
          ...(d.mealTimings || {}),
          [mealKey]: { ...currentTiming, [field]: time },
        },
      };
    }));
  };

  const handleSelectOption = (opt: string) => {
    setShowDropdownModal(false);

    if (opt === selectedOption) return;

    // Reset only dependent fields BELOW Event Type (Event Dates, Venue, Guest Count, Notes)
    // DO NOT clear Event Name!
    setEventDates([]);
    setVenue('');
    setGuestCount(0);
    setNotes('');
    setErrors(prev => {
      const copy = { ...prev };
      delete copy.eventType;
      delete copy.customEventType;
      return copy;
    });

    if (opt === 'Custom') {
      setSelectedOption('Custom');
      setCustomEventTypeInput('');
      setEventType('');
      update({
        eventType: '',
        eventName: eventName,
        eventDates: [],
        venue: '',
        guestCount: 0,
        notes: '',
        menuType: '',
        selectedItems: [],
        dateMenus: [],
      });
    } else {
      setSelectedOption(opt);
      setCustomEventTypeInput('');
      setEventType(opt);
      update({
        eventType: opt,
        eventName: eventName,
        eventDates: [],
        venue: '',
        guestCount: 0,
        notes: '',
        menuType: '',
        selectedItems: [],
        dateMenus: [],
      });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getActiveDateStr = () => {
    if (!activeDateId) return new Date().toISOString().split('T')[0];
    return eventDates.find(d => d.id === activeDateId)?.date || new Date().toISOString().split('T')[0];
  };

  const getActiveTimeValue = () => {
    if (!activeTimePicker) return '08:00';
    const ed = eventDates.find(d => d.id === activeTimePicker.dateId);
    const mealKey = activeTimePicker.meal.toLowerCase();
    return ed?.mealTimings?.[mealKey]?.[activeTimePicker.field] || '08:00';
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!eventName.trim()) e.eventName = t('Event name is required');

    if (selectedOption === 'Custom') {
      if (!customEventTypeInput.trim()) {
        e.customEventType = t('Custom event type is required');
        e.eventType = t('Custom event type is required');
      }
    } else if (!selectedOption && !eventType) {
      e.eventType = t('Event type is required');
    }

    if (eventDates.length === 0) e.eventDates = t('At least one event date is required');
    if (!venue.trim()) e.venue = t('Venue is required');
    if (!guestCount || guestCount <= 0) e.guestCount = t('Guest count is required');
    return e;
  };

  const handleNext = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    let finalEventType = eventType;
    if (selectedOption === 'Custom') {
      finalEventType = customEventTypeInput.trim();
      const updatedCustomTypes = await saveCustomEventType(finalEventType);
      setCustomEventTypes(updatedCustomTypes);
    }

    update({ eventName, eventType: finalEventType, eventDates, venue, guestCount, notes });
    router.push('/new-event/select-menu-type');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#1B5E20', '#1B5E20']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Colors.white }]}>{t('Create Event')}</Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Step 2 of 4 since customer was step 1 */}
      <StepIndicator current={2} total={4} />

      <KeyboardAwareScrollView disableKeyboardAvoidingView contentContainerStyle={styles.scroll}>
        <OnboardingGuidancePopup
          message={t('Complete the event details.')}
          pointerPosition="bottom"
          containerStyle={{ marginBottom: 12 }}
        />

        <Text style={styles.sectionLabel}>{t('Event Name')} <Text style={styles.required}>*</Text></Text>
        <TextInput
          ref={eventNameRef}
          style={[styles.input, errors.eventName ? styles.inputError : null]}
          placeholder="Sathish Wedding"
          placeholderTextColor="#9CA3AF"
          value={eventName}
          onChangeText={(t) => setEventName(t.replace(/[^a-zA-Z\s]/g, ''))}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => venueRef.current?.focus()}
          blurOnSubmit={false}
        />
        {errors.eventName ? <Text style={styles.fieldError}>{errors.eventName}</Text> : null}

        <Text style={styles.sectionLabel}>{t('Event Type')} <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity
          onPress={() => setShowDropdownModal(true)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#1B5E20', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.dropdownTrigger, errors.eventType ? styles.inputError : null]}
          >
            <Text style={[styles.dropdownTriggerText, !selectedOption && styles.dropdownPlaceholder]}>
              {selectedOption ? t(selectedOption) : t('Select Event Type')}
            </Text>
            <ChevronDown size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
        {errors.eventType ? <Text style={styles.fieldError}>{errors.eventType}</Text> : null}

        {selectedOption === 'Custom' && (
          <View style={{ marginTop: 4 }}>
            <Text style={styles.sectionLabel}>{t('Custom Event Type')} <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.customEventType ? styles.inputError : null]}
              placeholder={t('Enter event type')}
              placeholderTextColor="#9CA3AF"
              value={customEventTypeInput}
              onChangeText={(text) => {
                setCustomEventTypeInput(text);
                setEventType(text);
                if (errors.customEventType) {
                  setErrors(prev => {
                    const copy = { ...prev };
                    delete copy.customEventType;
                    delete copy.eventType;
                    return copy;
                  });
                }
              }}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {errors.customEventType ? <Text style={styles.fieldError}>{errors.customEventType}</Text> : null}
          </View>
        )}

        <View style={styles.dateSectionHeader}>
          <Text style={[styles.sectionLabel, { flex: 1, marginRight: 8, marginBottom: 0, marginTop: 0 }]}>
            {t('Selected Event Date & Meal')} <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.addDateBtn} onPress={addDate}>
            <Plus size={14} color="#1B4332" />
            <Text style={styles.addDateText}>{t('Add Date')}</Text>
          </TouchableOpacity>
        </View>
        {errors.eventDates ? <Text style={styles.fieldError}>{errors.eventDates}</Text> : null}

        {eventDates.map(ed => (
          <View key={ed.id} style={styles.dateCard}>
            <View style={styles.dateCardHeader}>
              <TouchableOpacity style={styles.dateRow} onPress={() => editDate(ed.id)}>
                <Calendar size={14} color="#1B4332" />
                <Text style={styles.dateText}>{formatDate(ed.date)}</Text>
                <View style={styles.eventTypePill}>
                  <Text style={styles.eventTypePillText}>
                    {t(eventType || selectedOption || 'Event')}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeDate(ed.id)} style={{ padding: 4 }}>
                <X size={14} color="#9CA3AF" />
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
                    {t(meal)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {ed.mealTypes.length > 0 && (
              <View style={styles.timingRows}>
                {ed.mealTypes.map(meal => {
                  const mealKey = meal.toLowerCase();
                  const timing = ed.mealTimings?.[mealKey];
                  return (
                    <View key={meal} style={styles.timingRow}>
                      <Text style={styles.timingMeal}>{t(meal)}</Text>
                      <TouchableOpacity
                        style={[styles.timeBtn, timing?.from ? styles.timeBtnSet : null]}
                        onPress={() => setActiveTimePicker({ dateId: ed.id, meal, field: 'from' })}
                      >
                        <Text style={styles.timeLabel} numberOfLines={1}>{t('From')}</Text>
                        <Text style={[styles.timeValue, timing?.from ? styles.timeValueSet : null]} numberOfLines={1}>
                          {timing?.from || t('Set')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.timeBtn, timing?.to ? styles.timeBtnSet : null]}
                        onPress={() => setActiveTimePicker({ dateId: ed.id, meal, field: 'to' })}
                      >
                        <Text style={styles.timeLabel} numberOfLines={1}>{t('To')}</Text>
                        <Text style={[styles.timeValue, timing?.to ? styles.timeValueSet : null]} numberOfLines={1}>
                          {timing?.to || t('Set')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
            {errors[`date-${ed.id}`] ? <Text style={styles.fieldError}>{errors[`date-${ed.id}`]}</Text> : null}
          </View>
        ))}

        <Text style={styles.sectionLabel}>{t('Venue')} <Text style={styles.required}>*</Text></Text>
        <TextInput
          ref={venueRef}
          style={[styles.input, errors.venue ? styles.inputError : null]}
          placeholder="PLP Palace"
          placeholderTextColor="#9CA3AF"
          value={venue}
          onChangeText={setVenue}
          returnKeyType="next"
          onSubmitEditing={() => guestCountRef.current?.focus()}
          blurOnSubmit={false}
        />
        {errors.venue ? <Text style={styles.fieldError}>{errors.venue}</Text> : null}

        <Text style={styles.sectionLabel}>{t('Number of Guests')} <Text style={styles.required}>*</Text></Text>
        <View style={styles.counterRow}>
          <TouchableOpacity style={styles.counterBtn} onPress={() => setGuestCount(g => Math.max(0, g - 10))}>
            <Minus size={16} color="#374151" />
          </TouchableOpacity>
          <TextInput
            ref={guestCountRef}
            style={styles.counterInput}
            value={guestCount > 0 ? String(guestCount) : ''}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            onChangeText={(t) => setGuestCount(parseInt(t.replace(/\D/g, '') || '0', 10))}
            keyboardType="numeric"
            textAlign="center"
            returnKeyType="next"
            onSubmitEditing={() => notesRef.current?.focus()}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={styles.counterBtn} onPress={() => setGuestCount(g => (g > 0 ? g + 10 : 10))}>
            <Plus size={16} color="#374151" />
          </TouchableOpacity>
        </View>
        {errors.guestCount ? <Text style={styles.fieldError}>{errors.guestCount}</Text> : null}

        <Text style={styles.sectionLabel}>{t('Notes')}</Text>
        <TextInput
          ref={notesRef}
          style={[styles.input, styles.notesInput]}
          placeholder={t('VIP guests, special arrangements, guest preferences, etc.')}
          placeholderTextColor="#9CA3AF"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          returnKeyType="done"
          blurOnSubmit={true}
        />

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>{t('Next: Build Menu')}</Text>
          <Text style={styles.nextArrow}>→</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* DROPDOWN SELECTOR MODAL */}
      <Modal
        visible={showDropdownModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdownModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDropdownModal(false)}
        >
          <Pressable style={styles.dropdownModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>{t('Select Event Type')}</Text>
              <TouchableOpacity onPress={() => setShowDropdownModal(false)} style={{ padding: 4 }} activeOpacity={0.7}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
              {dropdownOptions.map((opt) => {
                const isSelected = selectedOption === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowSelected]}
                    onPress={() => handleSelectOption(opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected]}>
                      {t(opt)}
                    </Text>
                    {isSelected && <Check size={16} color="#1B4332" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
      <TimePickerModal
        visible={activeTimePicker !== null}
        title={t('Select Time')}
        value={getActiveTimeValue()}
        onClose={() => setActiveTimePicker(null)}
        onSelect={(time) => {
          if (activeTimePicker) {
            updateMealTiming(activeTimePicker.dateId, activeTimePicker.meal, activeTimePicker.field, time);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

const dp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  picker: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: 300, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  monthTitle: { fontSize: scaleFont(12), fontFamily: F.semibold, color: '#111827' },
  daysRow: { flexDirection: 'row', marginBottom: 6 },
  dayLabel: { flex: 1, textAlign: 'center', ...T.labelSm, color: '#9CA3AF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  bubble: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  bubbleSel: { backgroundColor: '#1B4332' },
  bubbleToday: { borderWidth: 1.5, borderColor: '#1B4332' },
  dayNum: { fontSize: scaleFont(10), fontFamily: F.regular, color: '#374151' },
  dayNumSel: { color: '#fff', fontFamily: F.semibold },
  dayNumToday: { color: '#1B4332', fontFamily: F.semibold },
  footer: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: { flex: 1, height: 38, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  cancelText: { ...T.btnSm, color: '#6B7280' },
  confirmBtn: { flex: 1, height: 38, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B4332', borderRadius: 8 },
  confirmText: { ...T.btnSm },
});

const tp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  picker: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: 310, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  title: { flex: 1, ...T.cardTitle, fontSize: scaleFont(11.5) },
  preview: { fontSize: scaleFont(18), fontFamily: F.semibold, color: '#1B4332', textAlign: 'center', marginBottom: 8 },
  subTitle: { ...T.labelSm, marginTop: 6, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  timeCell: { width: 40, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  timeCellActive: { backgroundColor: '#1B4332', borderColor: '#1B4332' },
  timeCellText: { fontSize: scaleFont(9), fontFamily: F.semibold, color: '#374151' },
  timeCellTextActive: { color: '#fff' },
  minuteRow: { flexDirection: 'row', gap: 6 },
  minuteCell: { flex: 1, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  footer: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cancelBtn: { flex: 1, height: 38, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  cancelText: { ...T.btnSm, color: '#6B7280' },
  confirmBtn: { flex: 1, height: 38, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B4332', borderRadius: 8 },
  confirmText: { ...T.btnSm },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderGreenLight },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...T.h2, color: Colors.primary },
  scroll: { padding: 16, paddingBottom: 20 },
  sectionLabel: { ...T.label, fontSize: scaleFont(11), lineHeight: scaleFont(16), marginBottom: 6, marginTop: 6, color: Colors.textPrimary },
  required: { color: '#DC2626' },
  input: { borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: scaleFont(11.5), fontFamily: F.regular, color: Colors.textPrimary, backgroundColor: Colors.white, marginBottom: 4 },
  inputError: { borderColor: '#EF4444' },
  fieldError: { color: '#EF4444', fontSize: scaleFont(9.5), fontFamily: F.regular, marginBottom: 6 },
  dropdownTrigger: { borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 10, paddingHorizontal: 12, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, overflow: 'hidden' },
  dropdownTriggerText: { flex: 1, fontSize: scaleFont(11.5), fontFamily: F.medium, color: '#FFFFFF', marginRight: 6 },
  dropdownPlaceholder: { color: '#E8F5E9' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  dropdownModalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, width: '100%', maxWidth: 340, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  dropdownModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownModalTitle: { fontSize: scaleFont(12.5), fontFamily: F.semibold, color: '#111827' },
  dropdownOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8 },
  dropdownOptionRowSelected: { backgroundColor: '#E8F5E9' },
  dropdownOptionText: { fontSize: scaleFont(11.5), fontFamily: F.regular, color: '#374151' },
  dropdownOptionTextSelected: { fontFamily: F.semibold, color: '#1B4332' },
  dateSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 6, gap: 8 },
  addDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  addDateText: { fontSize: scaleFont(10.5), color: Colors.primary, fontFamily: F.semibold },
  dateCard: { backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.borderGreenLight },
  dateCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dateText: { fontSize: scaleFont(11), fontFamily: F.semibold, color: Colors.textPrimary },
  eventTypePill: { backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  eventTypePillText: { fontSize: scaleFont(8.5), color: Colors.white, fontFamily: F.medium },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  mealBtn: { borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  mealBtnActive: { backgroundColor: Colors.lightGreen, borderColor: Colors.primary },
  mealBtnText: { fontSize: scaleFont(9.5), color: Colors.textSecondary, fontFamily: F.medium },
  mealBtnTextActive: { color: Colors.primary, fontFamily: F.semibold },
  timingRows: { marginTop: 10, gap: 6 },
  timingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timingMeal: { flex: 1, fontSize: scaleFont(10.5), fontFamily: F.medium, color: Colors.textSecondary, flexShrink: 1 },
  timeBtn: { width: 84, borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 6, backgroundColor: Colors.white, paddingHorizontal: 4, paddingVertical: 4, alignItems: 'center', justifyContent: 'center' },
  timeBtnSet: { borderColor: Colors.primary, backgroundColor: Colors.lightGreen },
  timeLabel: { fontSize: scaleFont(8), fontFamily: F.medium, color: Colors.textMuted, marginBottom: 1, textAlign: 'center' },
  timeValue: { fontSize: scaleFont(10), fontFamily: F.semibold, color: Colors.textSecondary, textAlign: 'center' },
  timeValueSet: { color: Colors.primary },
  counterRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.borderGreenLight, borderRadius: 10, overflow: 'hidden', marginBottom: 6, height: 44, backgroundColor: Colors.white },
  counterBtn: { width: 44, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.veryLightGreen },
  counterInput: { flex: 1, fontSize: scaleFont(12.5), fontFamily: F.semibold, color: Colors.textPrimary },
  notesInput: { height: 72, paddingTop: 10, paddingBottom: 10, textAlignVertical: 'top' },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: 10, height: 46, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 6 },
  nextBtnText: { ...T.btnLg, fontSize: scaleFont(12), color: Colors.white },
  nextArrow: { fontSize: scaleFont(13), color: Colors.white },
});
