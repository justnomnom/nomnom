/**
 * Product-feature catalog. Every user-facing string is copied from
 * src/locales/langs/pt.json (landing, discover, roulette, table).
 * Do not paraphrase.
 */
export const FEATURES = [
  {
    id: 'feed',
    kicker: 'Descobrir', // navigation.discover
    title: 'O teu feed, as tuas pessoas', // landing.features.vibe.title
    titleLines: ['O teu feed,', 'as tuas pessoas'],
    hook: 'Segue pessoas em quem confias.', // landing.features.sectionSubtitle (1st sentence)
    body: 'Segue os locais e criadores em quem confias. Vê onde comem mesmo, com as fotos e notas deles.', // vibe.body
    beats: [
      'Segue os locais e criadores em quem confias',
      'Vê onde comem mesmo',
      'Com as fotos e notas deles',
    ],
    cta: 'Vamos NomNom!', // home.hero.getStarted
    mockKind: 'feed',
    caption:
      'O teu feed, as tuas pessoas.\n\nSegue os locais e criadores em quem confias. Vê onde comem mesmo, com as fotos e notas deles.\n\nVamos NomNom! → justnomnom.com\n\n#nomnom #lisboa #ondecomer',
  },
  {
    id: 'lists',
    kicker: 'Listas', // navigation.lists
    title: 'Segue as listas deles', // landing.features.roulette.title
    titleLines: ['Segue as', 'listas deles'],
    hook: 'Explora as listas delas.', // landing.features.sectionSubtitle (2nd sentence)
    body: 'Locais e criadores criam listas por bairro, ocasião ou cozinha. Explora uma, guarda qualquer sítio, ou segue-a para receberes as novas sugestões.', // roulette.body
    beats: [
      'Explora uma',
      'Guarda qualquer sítio',
      'Segue-a para receberes as novas sugestões',
    ],
    cta: 'Seguir', // landing.features.visuals.follow
    mockKind: 'lists',
    caption:
      'Segue as listas deles.\n\nLocais e criadores criam listas por bairro, ocasião ou cozinha. Explora uma, guarda qualquer sítio, ou segue-a para receberes as novas sugestões.\n\nVamos NomNom! → justnomnom.com\n\n#nomnom #listas #lisboa',
  },
  {
    id: 'map',
    kicker: 'Mapa', // navigation.map
    title: 'No mapa, depois decide', // landing.features.creator.title
    titleLines: ['No mapa,', 'depois decide'],
    hook: 'Percorre o bairro, toca num pin, mete na lista.', // landing.builtFor.checklist.maps.body (1st sentence)
    body: 'Percorre o bairro, guarda os pins numa lista e envia um link de Mesa para votarem — mesmo sem a app. Empatados? A NomNom Roulette escolhe nesse mesmo conjunto.', // creator.body
    beats: [
      'Percorre o bairro',
      'Guarda os pins numa lista',
      'Envia um link de Mesa para votarem',
    ],
    cta: 'Vamos NomNom!',
    mockKind: 'map',
    caption:
      'No mapa, depois decide.\n\nPercorre o bairro, guarda os pins numa lista e envia um link de Mesa para votarem — mesmo sem a app.\n\nVamos NomNom! → justnomnom.com\n\n#nomnom #mapa #ondecomer',
  },
  {
    id: 'roulette',
    kicker: 'NomNom Roulette', // navigation.feature_roulette / pages.roulette.title
    title: 'NomNom Roulette', // pages.roulette.title
    titleLines: ['NomNom', 'Roulette'],
    hook: 'Sem ideias?', // pages.roulette.nav_promo_kicker
    body: 'Indeciso? Gira para uma sugestão de quem segues. Só NomNomming.', // roulette.subtitle_before + subtitle_highlight
    beats: [
      'Gira para uma sugestão de quem segues',
      'Girar a NomNom Roulette',
      'Recomendado por pessoas que segues',
    ],
    cta: 'Girar a NomNom Roulette', // pages.roulette.cta_spin
    mockKind: 'roulette',
    caption:
      'Sem ideias? NomNom Roulette.\n\nIndeciso? Gira para uma sugestão de quem segues. Só NomNomming.\n\nGirar a NomNom Roulette → justnomnom.com\n\n#nomnom #roleta #lisboa',
  },
  {
    id: 'table',
    kicker: 'Mesa', // table.default_title
    title: 'Abrir uma Mesa', // lists.start_table_title / discover.table_promo_title
    titleLines: ['Abrir', 'uma Mesa'],
    hook: 'Não sabes onde comer?', // home.discover.decide_group_kicker
    body: 'Escolhe alguns sítios, partilha o link e votem juntos', // home.discover.table_promo_sub
    beats: [
      'Escolhe alguns sítios',
      'Partilha o link',
      'Votem juntos',
    ],
    cta: 'Abrir uma Mesa', // lists.start_table_cta
    mockKind: 'table',
    caption:
      'Não sabes onde comer? Abrir uma Mesa.\n\nEscolhe alguns sítios, partilha o link e votem juntos. Os amigos votam sem instalar a app.\n\nAbrir uma Mesa → justnomnom.com\n\n#nomnom #mesa #grupos',
  },
];

export const FEATURE_IDS = FEATURES.map((f) => f.id);

/** Resolve a feature by id. Unknown ids fall back to feed so a render never blanks. */
export function getFeature(featureId) {
  return FEATURES.find((f) => f.id === featureId) || FEATURES[0];
}
