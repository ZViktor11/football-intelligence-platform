import { router } from 'expo-router';
import { LoginScreen } from '../LoginScreen';
import { useSession } from '../sessionContext';

export default function LoginRoute() {
  const { setSession } = useSession();
  const close = () => router.canGoBack() ? router.back() : router.replace('/');
  return <LoginScreen onLogin={session => { setSession(session); close(); }} onCancel={close} />;
}
