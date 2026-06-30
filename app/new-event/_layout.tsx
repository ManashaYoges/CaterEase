import { Stack } from 'expo-router';
import { NewEventProvider } from '@/context/NewEventContext';

export default function NewEventLayout() {
  return (
    <NewEventProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="customer-details" />
        <Stack.Screen name="index" />
        <Stack.Screen name="select-menu-type" />
        <Stack.Screen name="menu-selection" />
        <Stack.Screen name="build-menu" />
        <Stack.Screen name="review-order" />
        <Stack.Screen name="confirm-save" />
        <Stack.Screen name="event-created" />
        // In app/new-event/_layout.tsx, add:
        <Stack.Screen name="load-saved-menu" />
      </Stack>
    </NewEventProvider>
  );
}
