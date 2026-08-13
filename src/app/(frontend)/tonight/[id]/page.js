import NightDecideView from 'src/sections/tonight/night-decide-view';

// ----------------------------------------------------------------------

/**
 * `/tonight/[id]` — auth-free Night join + Decide.
 */
export default async function TonightPage({ params }) {
  const { id } = await params;
  return <NightDecideView nightId={id} />;
}
