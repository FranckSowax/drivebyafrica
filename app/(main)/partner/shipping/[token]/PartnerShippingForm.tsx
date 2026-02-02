'use client';

import { useState, useEffect, useMemo } from 'react';
import { Ship, Save, Loader2, AlertCircle, Search, CheckCircle, Clock, Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ─── Translations ───────────────────────────────────────────
type Lang = 'fr' | 'en' | 'zh' | 'ko';

const LANG_LABELS: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  zh: '中文',
  ko: '한국어',
};

const T: Record<Lang, Record<string, string>> = {
  fr: {
    title: 'Devis Transport Maritime',
    subtitle: 'Soumettez vos tarifs de transport pour la période en cours',
    contactInfo: 'Informations de contact',
    companyName: 'Nom de la société',
    contactPerson: 'Personne de contact',
    email: 'Email',
    phone: 'Téléphone',
    country: 'Pays',
    shippingRates: 'Tarifs de transport (USD)',
    destination: 'Destination',
    korea: '🇰🇷 Corée',
    china: '🇨🇳 Chine',
    dubai: '🇦🇪 Dubaï',
    active: 'Actif',
    notes: 'Notes supplémentaires',
    notesPlaceholder: 'Commentaires, conditions particulières...',
    submit: 'Soumettre le devis',
    submitting: 'Envoi en cours...',
    success: 'Votre devis a été soumis avec succès !',
    successDetail: 'Merci pour votre contribution. Nous reviendrons vers vous si nous avons des questions.',
    alreadySubmitted: 'Vous avez déjà soumis un devis pour cette période',
    lastSubmission: 'Dernière soumission',
    nextCycle: 'Prochaine soumission possible dans le prochain cycle de 15 jours.',
    invalidLink: 'Ce lien est invalide ou a expiré',
    invalidDetail: 'Veuillez contacter Driveby Africa pour obtenir un nouveau lien.',
    search: 'Rechercher une destination...',
    destinations: 'destinations',
    of: 'sur',
    infoTitle: 'Tarifs FOB → CIF',
    infoDesc: 'Indiquez vos prix en USD pour le transport maritime depuis le port d\'origine jusqu\'au port de destination. Laissez vide les origines que vous ne couvrez pas.',
    loading: 'Chargement...',
    error: 'Une erreur est survenue',
    required: 'Ce champ est requis',
  },
  en: {
    title: 'Maritime Shipping Quote',
    subtitle: 'Submit your shipping rates for the current period',
    contactInfo: 'Contact Information',
    companyName: 'Company Name',
    contactPerson: 'Contact Person',
    email: 'Email',
    phone: 'Phone',
    country: 'Country',
    shippingRates: 'Shipping Rates (USD)',
    destination: 'Destination',
    korea: '🇰🇷 Korea',
    china: '🇨🇳 China',
    dubai: '🇦🇪 Dubai',
    active: 'Active',
    notes: 'Additional Notes',
    notesPlaceholder: 'Comments, special conditions...',
    submit: 'Submit Quote',
    submitting: 'Submitting...',
    success: 'Your quote has been submitted successfully!',
    successDetail: 'Thank you for your contribution. We will get back to you if we have questions.',
    alreadySubmitted: 'You have already submitted a quote for this period',
    lastSubmission: 'Last submission',
    nextCycle: 'Next submission available in the next 15-day cycle.',
    invalidLink: 'This link is invalid or has expired',
    invalidDetail: 'Please contact Driveby Africa for a new link.',
    search: 'Search a destination...',
    destinations: 'destinations',
    of: 'of',
    infoTitle: 'FOB → CIF Rates',
    infoDesc: 'Enter your prices in USD for maritime shipping from origin port to destination port. Leave blank for origins you don\'t cover.',
    loading: 'Loading...',
    error: 'An error occurred',
    required: 'This field is required',
  },
  zh: {
    title: '海运报价',
    subtitle: '提交当前周期的运输费率',
    contactInfo: '联系信息',
    companyName: '公司名称',
    contactPerson: '联系人',
    email: '电子邮件',
    phone: '电话',
    country: '国家',
    shippingRates: '运输费率 (美元)',
    destination: '目的地',
    korea: '🇰🇷 韩国',
    china: '🇨🇳 中国',
    dubai: '🇦🇪 迪拜',
    active: '激活',
    notes: '备注',
    notesPlaceholder: '备注、特殊条件...',
    submit: '提交报价',
    submitting: '提交中...',
    success: '您的报价已成功提交！',
    successDetail: '感谢您的贡献。如有问题我们会联系您。',
    alreadySubmitted: '您已在本期提交过报价',
    lastSubmission: '上次提交',
    nextCycle: '下一次提交将在下一个15天周期内开放。',
    invalidLink: '此链接无效或已过期',
    invalidDetail: '请联系 Driveby Africa 获取新链接。',
    search: '搜索目的地...',
    destinations: '个目的地',
    of: '/',
    infoTitle: 'FOB → CIF 费率',
    infoDesc: '请以美元输入从起运港到目的港的海运价格。不覆盖的起运地请留空。',
    loading: '加载中...',
    error: '发生错误',
    required: '此字段为必填项',
  },
  ko: {
    title: '해상 운송 견적',
    subtitle: '현재 기간의 운송 요금을 제출해 주세요',
    contactInfo: '연락처 정보',
    companyName: '회사명',
    contactPerson: '담당자',
    email: '이메일',
    phone: '전화번호',
    country: '국가',
    shippingRates: '운송 요금 (USD)',
    destination: '목적지',
    korea: '🇰🇷 한국',
    china: '🇨🇳 중국',
    dubai: '🇦🇪 두바이',
    active: '활성',
    notes: '추가 메모',
    notesPlaceholder: '코멘트, 특별 조건...',
    submit: '견적 제출',
    submitting: '제출 중...',
    success: '견적이 성공적으로 제출되었습니다!',
    successDetail: '감사합니다. 질문이 있으면 연락드리겠습니다.',
    alreadySubmitted: '이번 기간에 이미 견적을 제출하셨습니다',
    lastSubmission: '마지막 제출',
    nextCycle: '다음 제출은 다음 15일 주기에 가능합니다.',
    invalidLink: '이 링크는 유효하지 않거나 만료되었습니다',
    invalidDetail: '새 링크를 받으시려면 Driveby Africa에 문의해 주세요.',
    search: '목적지 검색...',
    destinations: '개 목적지',
    of: '/',
    infoTitle: 'FOB → CIF 요금',
    infoDesc: '출발항에서 목적항까지의 해상 운송 가격을 USD로 입력해 주세요. 커버하지 않는 출발지는 비워 두세요.',
    loading: '로딩 중...',
    error: '오류가 발생했습니다',
    required: '필수 항목입니다',
  },
};

// ─── Types ──────────────────────────────────────────────────
interface PartnerInfo {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
}

interface Destination {
  destination_id: string;
  destination_name: string;
  destination_country: string;
  destination_flag: string;
}

interface RouteEntry {
  destination_id: string;
  destination_name: string;
  destination_country: string;
  destination_flag: string;
  korea_cost_usd: number | null;
  china_cost_usd: number | null;
  dubai_cost_usd: number | null;
  is_active: boolean;
}

// ─── Component ──────────────────────────────────────────────
export default function PartnerShippingForm({ token }: { token: string }) {
  const [lang, setLang] = useState<Lang>('fr');
  const t = T[lang];

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(true);
  const [lastSubmission, setLastSubmission] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');

  // Partner info
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo>({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    country: '',
  });

  // Route entries
  const [routes, setRoutes] = useState<RouteEntry[]>([]);

  // Filtered routes
  const filteredRoutes = useMemo(
    () =>
      routes.filter(
        (r) =>
          r.destination_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.destination_country.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [routes, searchQuery]
  );

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/partner/shipping?token=${token}`);
        if (!res.ok) {
          setError(res.status === 404 ? 'invalid' : 'error');
          return;
        }
        const data = await res.json();

        setPartnerInfo(data.partner);
        setCanSubmit(data.canSubmit);
        setLastSubmission(data.lastSubmission);

        // Initialize routes from destinations (empty prices)
        const initialRoutes: RouteEntry[] = (data.destinations || []).map(
          (d: Destination) => ({
            destination_id: d.destination_id,
            destination_name: d.destination_name,
            destination_country: d.destination_country,
            destination_flag: d.destination_flag,
            korea_cost_usd: null,
            china_cost_usd: null,
            dubai_cost_usd: null,
            is_active: true,
          })
        );
        setRoutes(initialRoutes);
      } catch {
        setError('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleRouteChange = (
    destId: string,
    field: 'korea_cost_usd' | 'china_cost_usd' | 'dubai_cost_usd' | 'is_active',
    value: number | null | boolean
  ) => {
    setRoutes((prev) =>
      prev.map((r) =>
        r.destination_id === destId ? { ...r, [field]: value } : r
      )
    );
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!partnerInfo.company_name || !partnerInfo.contact_person || !partnerInfo.email || !partnerInfo.phone) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/partner/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          partner_info: partnerInfo,
          routes: routes.filter((r) => r.is_active),
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          setCanSubmit(false);
          return;
        }
        throw new Error(data.error || 'Failed');
      }

      setIsSubmitted(true);
    } catch {
      setError('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-mandarin" />
          <p className="text-[var(--text-muted)]">{t.loading}</p>
        </div>
      </div>
    );
  }

  // ─── Invalid link ───────────────────────────────────────
  if (error === 'invalid') {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t.invalidLink}</h2>
          <p className="text-[var(--text-muted)]">{t.invalidDetail}</p>
        </Card>
      </div>
    );
  }

  // ─── Already submitted ─────────────────────────────────
  if (!canSubmit && !isSubmitted) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <LangSelector lang={lang} setLang={setLang} />
          <Card className="text-center mt-6">
            <Clock className="w-12 h-12 text-mandarin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {t.alreadySubmitted}
            </h2>
            {lastSubmission && (
              <p className="text-[var(--text-muted)] mb-2">
                {t.lastSubmission}: {new Date(lastSubmission).toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'ko' ? 'ko-KR' : lang === 'zh' ? 'zh-CN' : 'en-US')}
              </p>
            )}
            <p className="text-[var(--text-muted)]">{t.nextCycle}</p>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Success ────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <CheckCircle className="w-12 h-12 text-jewel mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t.success}</h2>
          <p className="text-[var(--text-muted)]">{t.successDetail}</p>
        </Card>
      </div>
    );
  }

  // ─── Main form ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--background)] py-8">
      <div className="container mx-auto px-4">
        {/* Header + Lang Selector */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">
              <Ship className="inline-block w-8 h-8 text-mandarin mr-2 -mt-1" />
              {t.title}
            </h1>
            <p className="text-[var(--text-muted)] mt-1">{t.subtitle}</p>
          </div>
          <LangSelector lang={lang} setLang={setLang} />
        </div>

        {/* Contact Info */}
        <Card className="mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t.contactInfo}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                {t.companyName} *
              </label>
              <input
                type="text"
                value={partnerInfo.company_name}
                onChange={(e) => setPartnerInfo((p) => ({ ...p, company_name: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                {t.contactPerson} *
              </label>
              <input
                type="text"
                value={partnerInfo.contact_person}
                onChange={(e) => setPartnerInfo((p) => ({ ...p, contact_person: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                {t.email} *
              </label>
              <input
                type="email"
                value={partnerInfo.email}
                onChange={(e) => setPartnerInfo((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                {t.phone} *
              </label>
              <input
                type="tel"
                value={partnerInfo.phone}
                onChange={(e) => setPartnerInfo((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
                {t.country}
              </label>
              <input
                type="text"
                value={partnerInfo.country}
                onChange={(e) => setPartnerInfo((p) => ({ ...p, country: e.target.value }))}
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
              />
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="mb-6 bg-royal-blue/10 border-royal-blue/20">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-royal-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[var(--text-primary)] font-medium">{t.infoTitle}</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">{t.infoDesc}</p>
            </div>
          </div>
        </Card>

        {/* Source Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-lg">
            <span className="text-xl">🇰🇷</span>
            <span className="text-sm text-[var(--text-primary)]">{t.korea.replace(/🇰🇷\s?/, '')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-lg">
            <span className="text-xl">🇨🇳</span>
            <span className="text-sm text-[var(--text-primary)]">{t.china.replace(/🇨🇳\s?/, '')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] rounded-lg">
            <span className="text-xl">🇦🇪</span>
            <span className="text-sm text-[var(--text-primary)]">{t.dubai.replace(/🇦🇪\s?/, '')}</span>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none"
            />
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {filteredRoutes.length} {t.of} {routes.length} {t.destinations}
          </p>
        </div>

        {/* Routes Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    {t.destination}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    {t.korea}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    {t.china}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    {t.dubai}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                    {t.active}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => (
                  <tr
                    key={route.destination_id}
                    className={`border-b border-[var(--card-border)]/50 hover:bg-[var(--surface)]/50 transition-colors ${
                      !route.is_active ? 'opacity-40' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{route.destination_flag}</span>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {route.destination_name}
                          </p>
                          <p className="text-sm text-[var(--text-muted)]">
                            {route.destination_country}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                          <input
                            type="number"
                            placeholder="—"
                            value={route.korea_cost_usd ?? ''}
                            onChange={(e) =>
                              handleRouteChange(
                                route.destination_id,
                                'korea_cost_usd',
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            disabled={!route.is_active}
                            className="w-28 pl-7 pr-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-center text-[var(--text-primary)] focus:border-mandarin focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                          <input
                            type="number"
                            placeholder="—"
                            value={route.china_cost_usd ?? ''}
                            onChange={(e) =>
                              handleRouteChange(
                                route.destination_id,
                                'china_cost_usd',
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            disabled={!route.is_active}
                            className="w-28 pl-7 pr-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-center text-[var(--text-primary)] focus:border-mandarin focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                          <input
                            type="number"
                            placeholder="—"
                            value={route.dubai_cost_usd ?? ''}
                            onChange={(e) =>
                              handleRouteChange(
                                route.destination_id,
                                'dubai_cost_usd',
                                e.target.value ? parseInt(e.target.value) : null
                              )
                            }
                            disabled={!route.is_active}
                            className="w-28 pl-7 pr-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-center text-[var(--text-primary)] focus:border-mandarin focus:outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() =>
                            handleRouteChange(route.destination_id, 'is_active', !route.is_active)
                          }
                          className={`w-12 h-6 rounded-full transition-colors ${
                            route.is_active ? 'bg-jewel' : 'bg-[var(--card-border)]'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              route.is_active ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Notes */}
        <Card className="mt-6">
          <h3 className="font-bold text-[var(--text-primary)] mb-3">{t.notes}</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            rows={3}
            className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-mandarin focus:outline-none resize-none"
          />
        </Card>

        {/* Submit */}
        <div className="mt-8 flex justify-end">
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !partnerInfo.company_name || !partnerInfo.contact_person || !partnerInfo.email || !partnerInfo.phone}
            leftIcon={
              isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )
            }
            className="px-8"
          >
            {isSubmitting ? t.submitting : t.submit}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Language Selector ────────────────────────────────────
function LangSelector({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-[var(--text-muted)]" />
      <div className="flex gap-1">
        {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              lang === l
                ? 'bg-mandarin text-white'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
