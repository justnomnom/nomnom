'use client';

import dynamic from 'next/dynamic';

import MainLayout from 'src/layouts/main';

import HomeHero from '../home-hero';

const HomeBelowFold = dynamic(() => import('../home-below-fold'));

// ----------------------------------------------------------------------

export default function HomeView() {
  return (
    <MainLayout>
      <HomeHero />

      <HomeBelowFold />
    </MainLayout>
  );
}
