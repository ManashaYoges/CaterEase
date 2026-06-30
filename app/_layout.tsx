import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  console.log("Loading:", loading);
  console.log("User:", user);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <AuthProvider>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="new-event" />
            <Stack.Screen name="add-customer" />
            <Stack.Screen name="event-detail" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});