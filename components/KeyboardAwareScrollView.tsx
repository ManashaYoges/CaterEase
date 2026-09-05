import React, { useRef } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  Platform,
  KeyboardAvoidingView,
  View,
  findNodeHandle,
  UIManager,
  StyleSheet,
} from 'react-native';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Visible space in dp between top of soft keyboard and active input (default 240) */
  extraHeight?: number;
  /** Target Y offset from top of scroll container (default 120px for upper-middle view) */
  targetTopOffset?: number;
  /** Set true if screen already has an outer KeyboardAvoidingView */
  disableKeyboardAvoidingView?: boolean;
  keyboardVerticalOffset?: number;
}

export default function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  style,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  extraHeight = 240,
  targetTopOffset = 120,
  disableKeyboardAvoidingView = false,
  keyboardVerticalOffset = 0,
  ...props
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);

  const handleFocus = (e: any) => {
    const target = e.nativeEvent?.target || e.target;
    if (!target || !scrollRef.current) return;

    // Small delay to allow soft keyboard animation and layout updates to settle
    setTimeout(() => {
      try {
        if (Platform.OS === 'web') {
          const scrollResponder = (scrollRef.current as any)?.getScrollResponder?.();
          const scrollNode =
            scrollResponder?.getScrollableNode?.() ||
            scrollResponder?.getInnerViewNode?.() ||
            (scrollRef.current as any);

          if (target && typeof target.getBoundingClientRect === 'function') {
            const targetRect = target.getBoundingClientRect();
            let scrollRect = { top: 0, height: window.innerHeight };
            if (scrollNode && typeof scrollNode.getBoundingClientRect === 'function') {
              scrollRect = scrollNode.getBoundingClientRect();
            }

            const currentScrollY =
              scrollNode?.scrollTop !== undefined
                ? scrollNode.scrollTop
                : window.scrollY || 0;

            const relativeTop = currentScrollY + (targetRect.top - scrollRect.top);
            // Calculate scrollToY to position the element at targetTopOffset in upper-middle
            const scrollToY = Math.max(0, relativeTop - targetTopOffset);

            if (scrollNode && typeof scrollNode.scrollTo === 'function') {
              scrollNode.scrollTo({ top: scrollToY, behavior: 'smooth' });
            } else if (scrollRef.current?.scrollTo) {
              scrollRef.current.scrollTo({ y: scrollToY, animated: true });
            } else if (scrollNode) {
              scrollNode.scrollTop = scrollToY;
            }
          }
        } else {
          // Native (iOS / Android)
          const scrollResponder = scrollRef.current?.getScrollResponder?.();
          if (scrollResponder) {
            const nodeHandle = findNodeHandle(target) || target;
            const scrollHandle = findNodeHandle(scrollRef.current);

            if (nodeHandle && scrollHandle && UIManager.measureLayout) {
              UIManager.measureLayout(
                nodeHandle,
                scrollHandle,
                () => {
                  if (scrollResponder.scrollResponderScrollNativeHandleToKeyboard) {
                    scrollResponder.scrollResponderScrollNativeHandleToKeyboard(
                      nodeHandle,
                      extraHeight,
                      true
                    );
                  }
                },
                (_x, y, _w, _h) => {
                  const scrollToY = Math.max(0, y - targetTopOffset);
                  scrollRef.current?.scrollTo({ y: scrollToY, animated: true });
                }
              );
            } else if (scrollResponder.scrollResponderScrollNativeHandleToKeyboard) {
              scrollResponder.scrollResponderScrollNativeHandleToKeyboard(
                nodeHandle,
                extraHeight,
                true
              );
            }
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    }, Platform.OS === 'web' ? 60 : 120);
  };

  const combinedContentContainerStyle = [
    styles.defaultContentContainer,
    contentContainerStyle,
  ];

  const content = (
    <ScrollView
      ref={scrollRef}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={combinedContentContainerStyle}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardDismissMode="on-drag"
      scrollEventThrottle={16}
      {...props}
    >
      <View onFocus={handleFocus} style={{ flex: 1 }}>
        {children}
      </View>
    </ScrollView>
  );

  if (disableKeyboardAvoidingView) {
    return content;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  defaultContentContainer: {
    flexGrow: 1,
    paddingBottom: 280,
  },
});

