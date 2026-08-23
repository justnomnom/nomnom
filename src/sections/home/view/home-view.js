'use client';

import dynamic from 'next/dynamic';

import MainLayout from 'src/layouts/main';

import HomeHero from '../home-hero';
import { homePageWashSx } from '../home-page-wash';

const HomeBelowFold = dynamic(() => import('../home-below-fold'));

// ----------------------------------------------------------------------

export default function HomeView() {
  return (
    <MainLayout mainSx={homePageWashSx}>
      <HomeHero />

      <HomeBelowFold />
    </MainLayout>
  );
}
