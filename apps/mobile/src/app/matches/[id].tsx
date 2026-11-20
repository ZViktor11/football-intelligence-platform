import { router, useLocalSearchParams } from 'expo-router';
import { MatchDetail } from '../../../App';
import { useSession } from '../../sessionContext';

export default function MatchRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, favorites, expireSession } = useSession();
  return <MatchDetail key={id} matchId={Number(id)} token={session?.roles?.length ? session.accessToken : null}
    favorites={session ? favorites : null} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
    onSessionExpired={expireSession} />;
}
