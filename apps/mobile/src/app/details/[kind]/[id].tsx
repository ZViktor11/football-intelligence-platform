import { router, useLocalSearchParams } from 'expo-router';
import { PublicDetail, type DetailKind } from '../../../PublicDetail';

export default function DetailRoute() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const validKind = kind === 'player' || kind === 'team' || kind === 'competition';
  return <PublicDetail key={kind + ':' + id} kind={validKind ? kind as DetailKind : null} id={Number(id)}
    onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />;
}
