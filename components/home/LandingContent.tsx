'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Car, Shield, Truck, Headphones, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { SearchFilterBar } from '@/components/home/SearchFilterBar';
import { useTranslation } from '@/components/providers/LocaleProvider';
import type { Vehicle } from '@/types/vehicle';

const featureIcons = {
  verified: Car,
  secure: Shield,
  delivery: Truck,
  support: Headphones,
};

const featureKeys = ['verified', 'secure', 'delivery', 'support'] as const;

const stepKeys = ['choose', 'estimate', 'reserve', 'receive'] as const;
const stepNumbers = ['01', '02', '03', '04'];

const statValues = ['15,000+', '2,500+', '12', '98%'];
const statKeys = ['vehicles', 'clients', 'countries', 'satisfaction'] as const;

interface LandingContentProps {
  featuredVehicles: Vehicle[];
}

export function LandingContent({ featuredVehicles }: LandingContentProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  // Force video play on mount (needed for some mobile browsers)
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Set attributes programmatically for better iOS support
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');

      // Try to play the video
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // Autoplay was prevented, user needs to interact
            setIsPlaying(false);
          });
      }
    }
  }, []);

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            poster="/banner driveby.jpg"
          >
            {/* MP4 first for better mobile compatibility */}
            <source src="/hero-video.mp4" type="video/mp4" />
            <source src="/hero-video.webm" type="video/webm" />
          </video>
          {/* Overlay - adjusted for mobile readability */}
          <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-l from-black/80 via-black/60 to-black/40 lg:from-black/70 lg:via-black/50 lg:to-transparent" />
        </div>

        {/* Video Play/Pause Button */}
        <button
          onClick={toggleVideo}
          className="absolute bottom-6 left-6 z-20 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full border border-white/20 transition-all duration-200 group"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white group-hover:text-mandarin transition-colors" />
          ) : (
            <Play className="w-5 h-5 text-white group-hover:text-mandarin transition-colors" />
          )}
        </button>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex justify-center lg:justify-end">
            <div className="max-w-2xl text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-mandarin/20 backdrop-blur-sm rounded-full border border-mandarin/30 mb-4 lg:mb-6">
                <span className="text-mandarin font-medium text-sm">
                  {t('landing.hero.badge')}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-4 lg:mb-6">
                {t('landing.hero.title')}{' '}
                <span className="text-mandarin">{t('landing.hero.titleHighlight')}</span>
              </h1>

              <p className="text-base lg:text-lg text-white/80 mb-6 lg:mb-8 max-w-xl mx-auto lg:ml-auto lg:mr-0">
                {t('landing.hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-end">
                <Link href="/cars">
                  <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                    {t('landing.hero.cta')}
                  </Button>
                </Link>
              </div>

              {/* Source Badges - responsive layout */}
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 mt-8 lg:mt-12 justify-center lg:justify-end">
                <p className="text-sm text-white/60">{t('landing.hero.sources')}:</p>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <span className="text-base sm:text-xl">🇰🇷</span>
                    <span className="text-xs sm:text-sm text-white">Korea</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <span className="text-base sm:text-xl">🇨🇳</span>
                    <span className="text-xs sm:text-sm text-white">China</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <span className="text-base sm:text-xl">🇦🇪</span>
                    <span className="text-xs sm:text-sm text-white">Dubai</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Filter Bar */}
      <section className="relative z-20 -mt-8 mb-8">
        <div className="container mx-auto px-4">
          <SearchFilterBar />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[var(--surface)]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statKeys.map((key, index) => (
              <div key={key} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-mandarin">{statValues[index]}</p>
                <p className="text-[var(--text-muted)] mt-1">{t(`landing.stats.${key}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vehicles */}
      {featuredVehicles && featuredVehicles.length > 0 && (
        <section className="py-20 bg-[var(--background)]">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  {t('landing.featured.title')} <span className="text-mandarin">{t('landing.featured.titleHighlight')}</span>
                </h2>
                <p className="text-[var(--text-muted)]">
                  {t('landing.featured.subtitle')}
                </p>
              </div>
              <Link href="/cars">
                <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  {t('landing.featured.viewAll')}
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-[var(--background)] to-[var(--surface)]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              {t('landing.howItWorks.title')} <span className="text-mandarin">{t('landing.howItWorks.titleHighlight')}</span>
            </h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              {t('landing.howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stepKeys.map((key, index) => (
              <div key={key} className="relative">
                {/* Connector line */}
                {index < stepKeys.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-mandarin to-transparent" />
                )}

                <div className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 hover:border-mandarin/50 transition-colors shadow-sm">
                  <span className="text-5xl font-bold text-mandarin/20">{stepNumbers[index]}</span>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mt-4 mb-2">
                    {t(`landing.howItWorks.steps.${key}.title`)}
                  </h3>
                  <p className="text-[var(--text-muted)] text-sm">
                    {t(`landing.howItWorks.steps.${key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[var(--background)]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              {t('landing.features.title')} <span className="text-mandarin">{t('landing.features.titleHighlight')}</span>
            </h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureKeys.map((key) => {
              const Icon = featureIcons[key];
              return (
                <Card key={key} hover className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-mandarin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                      {t(`landing.features.${key}.title`)}
                    </h3>
                    <p className="text-[var(--text-muted)] text-sm">
                      {t(`landing.features.${key}.description`)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-r from-mandarin to-orange-600 rounded-2xl p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Text Content */}
              <div className="relative z-10">
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                  {t('landing.cta.title')}
                </h2>
                <p className="text-white/80 mb-8">
                  {t('landing.cta.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/register">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="bg-white text-mandarin hover:bg-white/90"
                    >
                      {t('landing.cta.register')}
                    </Button>
                  </Link>
                  <Link href="/cars">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-white text-white hover:bg-white/10"
                    >
                      {t('landing.cta.browse')}
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Vehicle Image */}
              <div className="hidden lg:flex justify-center items-center relative z-10">
                <Image
                  src="/imgi_88_yu7-steel-550x350.png"
                  alt="Premium vehicle"
                  width={550}
                  height={350}
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-white/10 rounded-full translate-y-1/2" />
          </div>
        </div>
      </section>
    </div>
  );
}
