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
    hook: 'Segue pessoas com bom gosto.', // landing.features.sectionSubtitle (1st sentence)
    body: 'Segue os locais e criadores em quem confias. Vê onde comem mesmo, com as fotos e notas deles.', // vibe.body
    beats: [
      'Segue os locais e criadores em quem confias',
      'Vê onde comem mesmo',
      'Com as fotos e notas deles',
    ],
    cta: 'Vamos nom nom!', // home.hero.getStarted
    mockKind: 'feed',
    caption:
      'O teu feed, as tuas pessoas.\n\nSegue os locais e criadores em quem confias. Vê onde comem mesmo, com as fotos e notas deles.\n\nVamos nom nom! → justnomnom.com\n\n#nomnom #lisboa #ondecomer',
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
      'Segue as listas deles.\n\nLocais e criadores criam listas por bairro, ocasião ou cozinha. Explora uma, guarda qualquer sítio, ou segue-a para receberes as novas sugestões.\n\nVamos nom nom! → justnomnom.com\n\n#nomnom #listas #lisboa',
  },
  {
    id: 'map',
    kicker: 'Mapa', // navigation.map
    title: 'No mapa, na lista, partilhado', // landing.features.creator.title
    titleLines: ['No mapa, na lista,', 'partilhado'],
    hook: 'Percorre o bairro, toca num pin, mete na lista.', // landing.builtFor.checklist.maps.body (1st sentence)
    body: 'Percorre o mapa para encontrar sítios perto de ti, guarda os que queres visitar e envia a tua shortlist a quem vai contigo.', // creator.body
    beats: [
      'Percorre o mapa para encontrar sítios perto de ti',
      'Guarda os que queres visitar',
      'Envia a tua shortlist a quem vai contigo',
    ],
    cta: 'Vamos nom nom!',
    mockKind: 'map',
    caption:
      'No mapa, na lista, partilhado.\n\nPercorre o mapa para encontrar sítios perto de ti, guarda os que queres visitar e envia a tua shortlist a quem vai contigo.\n\nVamos nom nom! → justnomnom.com\n\n#nomnom #mapa #ondecomer',
  },
  {
    id: 'roulette',
    kicker: 'Roleta', // home.discover.roulette_promo_title
    title: 'Roleta NomNom', // pages.roulette.title
    titleLines: ['Roleta', 'NomNom'],
    hook: 'Sem ideias?', // pages.roulette.nav_promo_kicker
    body: 'Mexe para um sabor ao acaso. Sem pensar, só NomNomming!', // roulette.subtitle_before + subtitle_highlight
    beats: [
      'Mexe para um sabor ao acaso',
      'Gira os Noms!',
      'Recomendado por pessoas que segues',
    ],
    cta: 'Gira os Noms!', // pages.roulette.cta_spin
    mockKind: 'roulette',
    caption:
      'Sem ideias? Experimenta a Roleta NomNom.\n\nMexe para um sabor ao acaso. Sem pensar, só NomNomming!\n\nGira os Noms! → justnomnom.com\n\n#nomnom #roleta #lisboa',
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
