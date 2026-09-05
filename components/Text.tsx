import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { F } from '@/utils/fonts';

interface Props extends TextProps {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
}

const weightMap = {
  regular:   F.regular,
  medium:    F.medium,
  semibold:  F.semibold,
  bold:      F.bold,
  extrabold: F.extrabold,
};

export default function Text({ style, weight = 'regular', ...props }: Props) {
  return (
    <RNText
      {...props}
      style={[{ fontFamily: weightMap[weight] }, style]}
    />
  );
}
