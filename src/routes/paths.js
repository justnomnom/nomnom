// ----------------------------------------------------------------------

const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
};

// ----------------------------------------------------------------------

export const paths = {
  /** Public marketing homepage (`/`). */
  home: '/',
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  contact: '/contact-us',
  faqs: '/faqs',
  privacy: '/privacy',
  terms: '/terms',

  /** Public SEO roulette (PT path kept for Lisbon SEO). Product UI: `dashboard.roulette`. */
  site: {
    countries: '/countries',
    about: '/about',
    pricing: '/pricing',
    resourcePlanningTrip: '/resources/planning-a-food-trip',
    useCaseFoodies: '/use-cases/foodies',
    useCaseCreators: '/use-cases/creators',
    useCaseRestaurants: '/use-cases/restaurants',
    portugal: '/countries/portugal',
    lisbon: '/countries/portugal/lisbon',
    /** Public PT SEO URL — do not rename; pairs with `dashboard.roulette`. */
    rouletteLisboa: '/roleta/lisboa',
    lisbonRestaurants: '/countries/portugal/lisbon/restaurants',
    portugalInfluencers: '/countries/portugal/influencers',
    resourcesRoot: '/resources',
    useCasesRoot: '/use-cases',
  },
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  /** Post-auth multi-step wizard (single route). */
  onboarding: '/onboarding',
  /** Published list (share / SEO). Pass { username, slug } to get the human-readable URL. */
  listPublic: (id, opts) =>
    opts?.username && opts?.slug ? `/lists/${opts.username}/${opts.slug}` : `/lists/${id}`,
  /** Table share page (auth-free: vote, add places, settle). */
  table: (id) => `/table/${id}`,
  /** Name-before-vote gate. Unnamed guests land here from {@link table}. */
  tableJoin: (id) => `/table/${id}/join`,
  /** Supabase restaurant (share link; readable without signing in). */
  restaurantPublic: (id) => `/restaurants/${id}`,
  /** Public profile by @handle. */
  userPublic: (username) => `/u/${String(username ?? '').replace(/^@/, '')}`,

  // AUTH
  auth: {
    supabase: {
      login: `${ROOTS.AUTH}/login`,
      callback: `${ROOTS.AUTH}/callback`,
      verify: `${ROOTS.AUTH}/verify`,
      register: `${ROOTS.AUTH}/register`,
      newPassword: `${ROOTS.AUTH}/new-password`,
      forgotPassword: `${ROOTS.AUTH}/forgot-password`,
    },
  },
  // DASHBOARD
  dashboard: {
    /** Section prefix; use `discover` for the signed-in home. */
    root: ROOTS.DASHBOARD,
    discover: `${ROOTS.DASHBOARD}/discover`,
    map: `${ROOTS.DASHBOARD}/map`,
    restaurant: (id) => `${ROOTS.DASHBOARD}/restaurants/${id}`,
    /** My NomNom lists hub (was historically called “Saved”; `/dashboard/saved` redirects here). */
    lists: `${ROOTS.DASHBOARD}/lists`,
    /**
     * Lists hub with the "open a list, then pick any restaurants" hint. Starting a
     * Table lives on a single owned public list (`StartTableSheet`), so this is the
     * closest the hub can deep-link.
     */
    listsTable: `${ROOTS.DASHBOARD}/lists?table=1`,
    settings: `${ROOTS.DASHBOARD}/settings`,
    settingsEdit: `${ROOTS.DASHBOARD}/settings/profile/edit`,
    settingsAppearance: `${ROOTS.DASHBOARD}/settings/appearance`,
    settingsPreferences: `${ROOTS.DASHBOARD}/settings/preferences`,
    settingsNotifications: `${ROOTS.DASHBOARD}/settings/notifications`,
    settingsBilling: `${ROOTS.DASHBOARD}/settings/billing`,
    /** Paid-list subscribers (creator): list and cancel Stripe subscriptions. */
    settingsSubscribers: `${ROOTS.DASHBOARD}/settings/subscribers`,
    /** Active subscriptions the current user pays for (subscriber view). */
    settingsMySubscriptions: `${ROOTS.DASHBOARD}/settings/my-subscriptions`,
    settingsDeleteAccount: `${ROOTS.DASHBOARD}/settings/delete-account`,
    /** Same content as `/faqs`, inside settings drill shell. */
    settingsFaqs: `${ROOTS.DASHBOARD}/settings/faqs`,
    /** Same content as `/contact-us`, inside settings drill shell. */
    settingsSupport: `${ROOTS.DASHBOARD}/settings/support`,
    /**
     * Public profile UI inside dashboard (AuthGuard): same content as `/u/:handle`,
     * with profile-style drill header.
     */
    userPublic: (username) => `${ROOTS.DASHBOARD}/u/${String(username ?? '').replace(/^@/, '')}`,
    feedback: `${ROOTS.DASHBOARD}/feedback`,
    notifications: `${ROOTS.DASHBOARD}/notifications`,
    /** In-app roulette (EN). Public SEO twin: `site.rouletteLisboa` (`/roleta/lisboa`). */
    roulette: `${ROOTS.DASHBOARD}/roulette`,
    listDetails: (id) => `${ROOTS.DASHBOARD}/lists/${id}`,
    /** Edit list (metadata, members, places) — owners, editors, and members. */
    listManage: (id) => `${ROOTS.DASHBOARD}/lists/${id}/manage`,
    /** Ops: `ADMIN_USER_IDS` allowlist; layout under `dashboard/admin`. */
    admin: `${ROOTS.DASHBOARD}/admin`,
    adminSponsoredPlacements: `${ROOTS.DASHBOARD}/admin/sponsored-placements`,
  },
};
