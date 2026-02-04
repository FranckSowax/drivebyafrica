'use client';

import { BookOpen, Download, FileText, Loader2 } from 'lucide-react';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorSidebar } from '@/components/collaborator/CollaboratorSidebar';
import { CollaboratorTopBar } from '@/components/collaborator/CollaboratorTopBar';
import { useCollaboratorAuth } from '@/lib/hooks/useCollaboratorAuth';
import { Card } from '@/components/ui/Card';

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

const guideContents = [
  { fr: 'Connexion au portail', en: 'Portal Login', zh: '登录门户' },
  { fr: 'Tableau de bord', en: 'Dashboard', zh: '仪表板' },
  { fr: 'Gestion des commandes', en: 'Order Management', zh: '订单管理' },
  { fr: 'Workflow 14 étapes', en: '14-Step Workflow', zh: '14步工作流程' },
  { fr: 'Mise à jour des statuts', en: 'Status Updates', zh: '状态更新' },
  { fr: 'Upload de documents', en: 'Document Upload', zh: '文档上传' },
  { fr: 'Étapes spéciales', en: 'Special Steps', zh: '特殊步骤' },
  { fr: 'Contact WhatsApp', en: 'WhatsApp Contact', zh: 'WhatsApp联系' },
  { fr: 'Véhicules et lots', en: 'Vehicles & Batches', zh: '车辆和批次' },
  { fr: 'Notifications temps réel', en: 'Real-time Notifications', zh: '实时通知' },
];

export default function CollaboratorGuidesPage() {
  const { t, locale } = useCollaboratorLocale();
  const { isChecking, isAuthorized, userName, userEmail, signOut } = useCollaboratorAuth();

  const getLocalizedContent = (item: { fr: string; en: string; zh: string }) => {
    if (locale === 'zh') return item.zh;
    if (locale === 'en') return item.en;
    return item.fr;
  };

  if (isChecking || !isAuthorized) {
    return (
      <div className="min-h-screen bg-cod-gray flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-mandarin animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cod-gray">
      <CollaboratorSidebar onLogout={signOut} />

      <div className="lg:pl-64">
        <CollaboratorTopBar
          title={locale === 'zh' ? '指南' : locale === 'en' ? 'Guides' : 'Guides'}
          userName={userName}
          userEmail={userEmail}
          onLogout={signOut}
        />

        <main className="p-4 lg:p-6 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-mandarin/10 rounded-xl">
                <BookOpen className="w-6 h-6 text-mandarin" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {locale === 'zh' ? '协作者指南' : locale === 'en' ? 'Collaborator Guide' : 'Guide du collaborateur'}
                </h1>
                <p className="text-gray-400 text-sm">
                  {locale === 'zh' ? '下载您所用语言的使用指南' : locale === 'en' ? 'Download the user guide in your language' : "Téléchargez le guide d'utilisation dans votre langue"}
                </p>
              </div>
            </div>
          </div>

          {/* Guide Downloads */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-400 mb-4">
              {locale === 'zh' ? '下载指南' : locale === 'en' ? 'Download Guide' : 'Télécharger le guide'}
            </h2>

            <div className="grid sm:grid-cols-3 gap-4">
              {collaboratorGuides.map((guide) => (
                <a
                  key={guide.lang}
                  href={guide.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-cod-gray border border-nobel/20 rounded-xl hover:border-mandarin/50 hover:bg-mandarin/5 transition-all group"
                >
                  <div className="text-3xl">{guide.flag}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white group-hover:text-mandarin transition-colors">
                      {guide.lang}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{guide.filename}</div>
                  </div>
                  <Download className="w-5 h-5 text-gray-500 group-hover:text-mandarin transition-colors flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>

          {/* Guide Contents Summary */}
          <Card className="bg-cod-gray border-nobel/20 p-5 mb-8">
            <h3 className="font-medium text-white mb-3">
              {locale === 'zh' ? '指南内容' : locale === 'en' ? 'Guide Contents' : 'Contenu du guide'}
            </h3>
            <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-300">
              {guideContents.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-mandarin/20 text-mandarin rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  {getLocalizedContent(item)}
                </div>
              ))}
            </div>
          </Card>

          {/* Info Box */}
          <Card className="bg-mandarin/5 border-mandarin/20 p-5">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-mandarin mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-mandarin mb-1">
                  {locale === 'zh' ? '版本 2.0 - 2026年2月' : 'Version 2.0 - Février 2026'}
                </h3>
                <p className="text-sm text-gray-400">
                  {locale === 'zh'
                    ? '本指南涵盖协作者门户的所有功能，包括新的14步工作流程和运输合作伙伴分配。'
                    : locale === 'en'
                      ? 'This guide covers all features of the collaborator portal, including the new 14-step workflow with shipping partner assignment.'
                      : "Ce guide couvre toutes les fonctionnalités du portail collaborateur, y compris le nouveau workflow à 14 étapes avec l'attribution de partenaires de transport."}
                </p>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
