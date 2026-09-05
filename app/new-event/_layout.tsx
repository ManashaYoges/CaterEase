import { Stack } from 'expo-router';

export default function NewEventLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="customer-details" />
      <Stack.Screen name="index" />
      <Stack.Screen name="select-menu-type" />
      <Stack.Screen name="menu-selection" />
      <Stack.Screen name="build-menu" />
      <Stack.Screen name="review-order" />
      <Stack.Screen name="confirm-save" />
      <Stack.Screen name="event-created" />
      <Stack.Screen name="load-saved-menu" />
    </Stack>
  );
}
