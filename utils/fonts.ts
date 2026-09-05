import { Dimensions, PixelRatio } from 'react-native';

export const F = {
  regular:   'Inter_400Regular',
  medium:    'Inter_500Medium',
  semibold:  'Inter_600SemiBold',
  bold:      'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

export function fw(weight: '400' | '500' | '600' | '700' | '800') {
  const map: Record<string, string> = {
    '400': F.regular,
    '500': F.medium,
    '600': F.semibold,
    '700': F.bold,
    '800': F.extrabold,
  };
  return { fontFamily: map[weight] };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375;

/**
 * Responsive font scaling function.
 * Scales font sizes moderately based on screen width and pixel density.
 * Clamps maximum scaling to avoid oversized text on tablets and web screens.
 */
export function scaleFont(size: number, factor = 0.35): number {
  const clampedWidth = Math.min(SCREEN_WIDTH, 500);
  const scale = clampedWidth / BASE_WIDTH;
  const scaledSize = size + (size * scale - size) * factor;
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
}

