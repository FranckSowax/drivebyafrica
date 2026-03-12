'use client';

import Link from 'next/link';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { useFavorites } from '@/lib/hooks/useFavorites';
import type { Vehicle } from '@/types/vehicle';

interface FAQItem {
  question: string;
  answer: string;
}

interface CountryLandingContentProps {
  vehicles: Vehicle[];
  sourceFilter: string;
  countryName: string;
  flag: string;
  intro: string[];
  faqs: FAQItem[];
  otherCountries: { slug: string; name: string; flag: string }[];
}

function FAQAccordion({ faqs }: { faqs: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className="border border-[var(--card-border)] rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-4 text-left font-medium text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
          >
            <span>{faq.question}</span>
            {openIndex === i ? (
              <ChevronUp className="w-4 h-4 flex-shrink-0 text-mandarin" />
            ) : (
              <ChevronDown className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" />
            )}
          </button>
          {openIndex === i && (
            <div className="px-4 pb-4 text-[var(--text-muted)] text-sm leading-relaxed">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CountryLandingContent({
  vehicles,
  sourceFilter,
  countryName,
  flag,
  intro,
  faqs,
  otherCountries,
}: CountryLandingContentProps) {
  const { favorites, toggleFavorite } = useFavorites();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[var(--surface)] to-transparent py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <p className="text-mandarin font-semibold mb-2">{flag} Importation depuis {countryName}</p>
          <h1 className="text-3xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4 max-w-3xl">
            Achat de véhicules d&apos;occasion depuis {countryName}
          </h1>
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mb-6">
            {intro[0]}
          </p>
          <div className="flex gap-3">
            <Link
              href={`/cars?source=${sourceFilter}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-mandarin text-white font-semibold rounded-lg hover:bg-mandarin/90 transition-colors"
            >
              Voir tous les véhicules
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--card-border)] text-[var(--text-primary)] font-semibold rounded-lg hover:bg-[var(--surface)] transition-colors"
            >
              Comment importer ?
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-16">
        {/* Content */}
        <div className="max-w-3xl mb-12">
          {intro.slice(1).map((paragraph, i) => (
            <p key={i} className="text-[var(--text-muted)] mb-4 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Vehicle Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            Véhicules disponibles depuis {countryName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isFavorite={favorites.includes(vehicle.id)}
                onFavorite={toggleFavorite}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={`/cars?source=${sourceFilter}`}
              className="inline-flex items-center gap-2 px-8 py-3 bg-mandarin text-white font-semibold rounded-lg hover:bg-mandarin/90 transition-colors"
            >
              Voir tous les véhicules depuis {countryName}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16 max-w-3xl">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
            Questions fréquentes sur l&apos;importation depuis {countryName}
          </h2>
          <FAQAccordion faqs={faqs} />
        </section>

        {/* Internal links */}
        <section>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
            Importez aussi depuis
          </h2>
          <div className="flex flex-wrap gap-4">
            {otherCountries.map((c) => (
              <Link
                key={c.slug}
                href={`/import/${c.slug}`}
                className="inline-flex items-center gap-2 px-5 py-3 border border-[var(--card-border)] rounded-lg hover:bg-[var(--surface)] transition-colors font-medium text-[var(--text-primary)]"
              >
                {c.flag} Véhicules depuis {c.name}
              </Link>
            ))}
            <Link
              href="/calculator"
              className="inline-flex items-center gap-2 px-5 py-3 border border-[var(--card-border)] rounded-lg hover:bg-[var(--surface)] transition-colors font-medium text-[var(--text-primary)]"
            >
              Estimer les frais d&apos;importation
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
