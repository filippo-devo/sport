import { Redirect } from 'expo-router';

// The app opens on Train; "/" exists only so deep links and back fallbacks land somewhere.
export default function Index() {
  return <Redirect href="/train" />;
}
