import { Stack } from 'expo-router';
import { SessionProvider } from '../sessionContext';

export default function RootLayout() {
  return <SessionProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }} /></SessionProvider>;
}
