'use client';

import { BookOpen, Download, FileText, Globe, Users, Shield } from 'lucide-react';

const collaboratorGuides = [
  {
    lang: 'Français',
    flag: '🇫🇷',
    file: '/guides/Guide-Collaborateur-Driveby-Africa.pdf',
    filename: 'Guide-Collaborateur-Driveby-Africa.pdf',
  },
  {
    lang: 'English',
    flag: '🇬🇧',
    file: '/guides/Guide-Collaborateur-Driveby-Africa-EN.pdf',
    filename: 'Guide-Collaborateur-Driveby-Africa-EN.pdf',
  },
  {
    lang: '中文',
    flag: '🇨🇳',
    file: '/guides/Guide-Collaborateur-Driveby-Africa-ZH.pdf',
    filename: 'Guide-Collaborateur-Driveby-Africa-ZH.pdf',
  },
];

const adminGuides = [
  {
    lang: 'Français',
    flag: '🇫🇷',
    file: '/guides/Guide-Admin-Driveby-Africa.pdf',
    filename: 'Guide-Admin-Driveby-Africa.pdf',
  },
  {
    lang: 'English',
    flag: '🇬🇧',
    file: '/guides/Guide-Admin-Driveby-Africa-EN.pdf',
    filename: 'Guide-Admin-Driveby-Africa-EN.pdf',
  },
  {
    lang: '中文',
    flag: '🇨🇳',
    file: '/guides/Guide-Admin-Driveby-Africa-ZH.pdf',
    filename: 'Guide-Admin-Driveby-Africa-ZH.pdf',
  },
];

export default function AdminGuidesPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-orange-500" />
          <h1 className="text-2xl font-bold text-gray-900">Guides et documentation</h1>
        </div>
        <p className="text-gray-500">
          Téléchargez les guides d&apos;utilisation pour les collaborateurs et administrateurs.
        </p>
      </div>

      {/* Collaborator Guide Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-800">Guide Collaborateur</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Guide complet pour la gestion des commandes, le workflow des 14 étapes, l&apos;upload de documents et le suivi des livraisons.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          {collaboratorGuides.map((guide) => (
            <a
              key={guide.lang}
              href={guide.file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="text-3xl">{guide.flag}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                  {guide.lang}
                </div>
                <div className="text-xs text-gray-400 truncate">{guide.filename}</div>
              </div>
              <Download className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Admin Guide Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-800">Guide Administrateur</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Guide complet pour l&apos;administration de la plateforme : gestion des utilisateurs, véhicules, devis, transport, et configuration.
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          {adminGuides.map((guide) => (
            <a
              key={guide.lang}
              href={guide.file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="text-3xl">{guide.flag}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                  {guide.lang}
                </div>
                <div className="text-xs text-gray-400 truncate">{guide.filename}</div>
              </div>
              <Download className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-orange-800 mb-1">À propos des guides</h3>
            <p className="text-sm text-orange-700">
              Les guides sont disponibles en PDF et peuvent être partagés avec les nouveaux collaborateurs
              lors de leur intégration. Version 2.0 - Février 2026.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
