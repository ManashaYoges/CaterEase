import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, scaleFont } from '@/utils/fonts';
import Colors from '@/constants/Colors';

interface Props {
  message: string;
  pointerPosition?: 'top' | 'bottom';
  containerStyle?: StyleProp<ViewStyle>;
  pointerOffsetLeft?: DimensionValue;
}

export default function OnboardingGuidancePopup({
  message,
  pointerPosition = 'bottom',
  containerStyle,
  pointerOffsetLeft,
}: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [hasCreatedFirstEvent, setHasCreatedFirstEvent] = useState<boolean>(true);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setDismissed(false);

      const checkEvents = async () => {
        if (!user) {
          if (isMounted) setHasCreatedFirstEvent(true);
          return;
        }
        try {
          const snap = await getDocs(
            query(collection(db, 'events'), where('user_id', '==', user.uid))
          );
          if (isMounted) {
            setHasCreatedFirstEvent(!snap.empty);
          }
        } catch (e) {
          if (isMounted) setHasCreatedFirstEvent(true);
        }
      };

      checkEvents();
      return () => {
        isMounted = false;
      };
    }, [user])
  );

  if (hasCreatedFirstEvent || dismissed) {
    return null;
  }

  const pointerStyleOverride = pointerOffsetLeft !== undefined ? { marginLeft: pointerOffsetLeft } : {};

  return (
    <View style={[styles.container, containerStyle]} pointerEvents="box-none">
      {pointerPosition === 'top' && (
        <View style={[styles.pointerTop, pointerStyleOverride]} />
      )}
      <View style={styles.tooltipBox}>
        <Text style={styles.messageText}>{message}</Text>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => setDismissed(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.doneText}>{t('Done')}</Text>
        </TouchableOpacity>
      </View>
      {pointerPosition === 'bottom' && (
        <View style={[styles.pointerBottom, pointerStyleOverride]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: '48%',
    maxWidth: 240,
    minWidth: 180,
    alignItems: 'center',
    zIndex: 100,
    elevation: 10,
    marginVertical: 6,
  },
  tooltipBox: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#1B4332',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  messageText: {
    fontSize: scaleFont(10),
    fontFamily: F.regular,
    color: '#065F46',
    lineHeight: 14,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: '#1B4332',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'center',
  },
  doneText: {
    fontSize: scaleFont(9.5),
    fontFamily: F.medium,
    color: '#FFFFFF',
  },
  pointerBottom: {
    width: 12,
    height: 12,
    backgroundColor: '#ECFDF5',
    borderColor: '#1B4332',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: '45deg' }],
    marginTop: -6,
    zIndex: 101,
  },
  pointerTop: {
    width: 12,
    height: 12,
    backgroundColor: '#ECFDF5',
    borderColor: '#1B4332',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    transform: [{ rotate: '45deg' }],
    marginBottom: -6,
    zIndex: 101,
  },
});
