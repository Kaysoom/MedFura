import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Plus,
  Send,
  Phone,
  Trash2,
  ShoppingBag,
  MessagesSquare,
  BookOpen,
  ArrowRight,
  SlidersHorizontal,
  User,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { MarketplaceItem } from '../../types';
import { AddListingModal } from './AddListingModal';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import {
  filterMarketplaceListings,
  normalizeDealTypeLabel,
  normalizeMarketplaceStatusLabel,
} from '../../utils/redesignStructureLogic';

export const MarketplaceView: React.FC = () => {
  const {
    marketplaceItems,
    user,
    isAdmin,
    isGuest,
    updateMarketplaceItemStatus,
    deleteMarketplaceItem,
    openDirectChatWithUser,
    setIsAuthModalOpen,
    setActiveSection,
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] =
    useState<MarketplaceItem | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] =
    useState<MarketplaceItem | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyListings, setOnlyMyListings] = useState(false);

  // Filters matching Page 10 & Page 12
  const [filterDealType, setFilterDealType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('all');

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterAcademicYear !== 'all') count++;
    return count;
  }, [filterStatus, filterCategory, filterAcademicYear]);

  const filteredItems = useMemo(() => {
    return filterMarketplaceListings(marketplaceItems, {
      searchQuery,
      dealType: filterDealType,
      status: filterStatus,
      category: filterCategory,
      academicYear: filterAcademicYear,
      onlySellerId: onlyMyListings && user ? user.uid : null,
    });
  }, [
    marketplaceItems,
    searchQuery,
    filterDealType,
    filterStatus,
    filterCategory,
    filterAcademicYear,
    onlyMyListings,
    user,
  ]);

  const availableTotalCount = useMemo(
    () =>
      marketplaceItems.filter(
        (i) => normalizeMarketplaceStatusLabel(i.status) === 'متاح'
      ).length,
    [marketplaceItems]
  );

  const myListingsCount = useMemo(
    () =>
      user && !isGuest
        ? marketplaceItems.filter((i) => i.sellerId === user.uid).length
        : 0,
    [marketplaceItems, user, isGuest]
  );

  const handleOpenWhatsApp = (item: MarketplaceItem) => {
    if (!item.whatsappNumber) return;
    let cleanPhone = item.whatsappNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('963') && cleanPhone.startsWith('09')) {
      cleanPhone = '963' + cleanPhone.substring(1);
    }
    const message = encodeURIComponent(
      `مرحباً زميلي ${item.sellerName}، أنا مهتم بعرضك في سوق المستلزمات الجامعي بخصوص: "${item.title}". هل ما زال متاحاً؟`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleOpenTelegram = (item: MarketplaceItem) => {
    if (!item.telegramUsername) return;
    const cleanUsername = item.telegramUsername.replace('@', '').trim();
    window.open(`https://t.me/${cleanUsername}`, '_blank');
  };

  const isOwnerOrAdmin = (item: MarketplaceItem) => {
    return isAdmin || Boolean(user && !isGuest && user.uid === item.sellerId);
  };

  const dealTypePills = [
    { id: 'all', label: 'الكل', icon: '' },
    { id: 'بيع', label: 'بيع', icon: '💰' },
    { id: 'إعارة', label: 'إعارة', icon: '🤝' },
    { id: 'هبة', label: 'هبة', icon: '🎁' },
    { id: 'إيجار', label: 'إيجار', icon: '🔄' },
  ];

  const getDealBadgeStyle = (dealType: string) => {
    const norm = normalizeDealTypeLabel(dealType);
    if (norm === 'هبة') {
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    }
    if (norm === 'إعارة') {
      return 'bg-purple-500/15 text-purple-300 border border-purple-500/30';
    }
    if (norm === 'إيجار') {
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    }
    return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
  };

  // Sync selectedDetailItem with latest state from marketplaceItems
  const currentDetailItem = useMemo(() => {
    if (!selectedDetailItem) return null;
    return (
      marketplaceItems.find((i) => i.id === selectedDetailItem.id) ||
      selectedDetailItem
    );
  }, [marketplaceItems, selectedDetailItem]);

  return (
    <div
      dir="rtl"
      className="w-full max-w-4xl mx-auto px-3 sm:px-5 py-3 sm:py-4 space-y-3.5 text-right overflow-x-hidden"
    >
      {/* 1. EMERALD HEADER CARD (Matching Pages 10, 11, 14) */}
      <div className="bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5 dark-surface-preserve">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveSection('home')}
              aria-label="رجوع للرئيسية"
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            >
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                سوق المستلزمات
              </h1>
              <p className="text-xs text-emerald-50/90 font-bold truncate mt-0.5">
                بيع وإعارة وهبة الكتب بين الطلاب
              </p>
            </div>
          </div>

          {/* Left: إعلاناتي Button + إضافة إعلان */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!user || isGuest) {
                  setIsAuthModalOpen(true);
                } else {
                  setOnlyMyListings((prev) => !prev);
                }
              }}
              className={`px-3 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                onlyMyListings
                  ? 'bg-white text-emerald-700 shadow-md'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>إعلاناتي</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!user || isGuest) {
                  setIsAuthModalOpen(true);
                } else {
                  setIsAddModalOpen(true);
                }
              }}
              title="إضافة إعلان جديد"
              aria-label="إضافة إعلان جديد"
              className="w-9 h-9 rounded-full bg-white text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Bottom Stat Pills: X إعلان | Y متاح | إعلاناتك Z */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums">
            <BookOpen className="w-3.5 h-3.5 text-emerald-200" />
            <span>{marketplaceItems.length} إعلان</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums">
            <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />
            <span>{availableTotalCount} متاح</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-black/20 text-white text-xs font-black flex items-center gap-1.5 tabular-nums">
            <span>إعلاناتك {myListingsCount}</span>
          </div>
        </div>
      </div>

      {/* 2. SEARCH BAR + FILTER BUTTON + DEAL TYPE PILLS (Pages 10, 11, 14) */}
      <div className="bg-[#161F30] border border-slate-800/80 rounded-3xl p-3 space-y-2.5 shadow-sm">
        {/* Row 1: Search Input + Green Filter Sheet Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث عن كتاب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-8 py-2.5 bg-[#0F1726] border border-slate-800 rounded-2xl text-xs sm:text-sm font-bold text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            aria-label="تصفية الإعلانات"
            className="relative w-11 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-md"
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-emerald-700 text-[10px] font-black flex items-center justify-center shadow-md tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Deal Type Pills (الكل | بيع | إعارة | هبة | إيجار) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {dealTypePills.map((pill) => {
            const active = filterDealType === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterDealType(pill.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-[#0F1726] text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                {pill.icon && <span>{pill.icon}</span>}
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 2-COLUMN LISTING CARDS GRID (Matching Pages 10, 11, 14) */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-14 bg-[#161F30] rounded-3xl border border-slate-800/80 p-8 space-y-2.5">
          <ShoppingBag className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="font-black text-xs sm:text-sm text-white">
            لا توجد إعلانات تطابق التصفية الحالية
          </h3>
          <p className="text-xs text-slate-400">
            جرب تغيير خيارات التصفية أو أضف إعلاناً جديداً الآن.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => {
            const normStatus = normalizeMarketplaceStatusLabel(item.status);
            const isSold = normStatus === 'مباع';
            const normDeal = normalizeDealTypeLabel(item.dealType);
            const itemYear =
              (item as MarketplaceItem & { academicYear?: string }).academicYear ||
              (item.category === 'جامعية' || (item.category as string) === 'جامعي'
                ? 'سنة ثالثة'
                : 'عام');

            return (
              <div
                key={item.id}
                onClick={() => setSelectedDetailItem(item)}
                className="group bg-[#161F30] hover:bg-[#1B263B] border border-slate-800/80 hover:border-emerald-500/40 rounded-3xl overflow-hidden transition-all cursor-pointer flex flex-col justify-between shadow-sm"
              >
                {/* Top Cover / Image Box */}
                <div className="relative aspect-[4/3] w-full bg-[#1E293B] overflow-hidden flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-emerald-400/70">
                      <BookOpen className="w-10 h-10" />
                    </div>
                  )}

                  {/* Top-Right Status Badge: متاح ✓ | مباع ✕ | محجوز */}
                  <span
                    className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-md ${
                      isSold
                        ? 'bg-rose-500 text-white'
                        : normStatus === 'محجوز'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-white'
                    }`}
                  >
                    <span>{isSold ? '✕' : '✓'}</span>
                    <span>{normStatus}</span>
                  </span>

                  {/* Bottom-Right Year Badge */}
                  <span className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-lg bg-black/65 backdrop-blur-xs text-white text-[10px] font-bold">
                    {itemYear}
                  </span>
                </div>

                {/* Bottom Card Details */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <h3 className="font-black text-xs sm:text-sm text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>

                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${getDealBadgeStyle(
                        item.dealType
                      )}`}
                    >
                      {normDeal}
                    </span>

                    <span className="text-xs sm:text-sm font-black text-emerald-400 truncate">
                      {normDeal === 'هبة' && (!item.price || item.price === '0')
                        ? 'مجاني'
                        : item.price}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. BOTTOM SHEET FILTER MODAL (تصفية الإعلانات — Page 12)  */}
      {/* ======================================================== */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsFilterSheetOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#161F30] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 space-y-5 text-right shadow-2xl"
          >
            {/* Sheet Handle & Header */}
            <div className="w-10 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">تصفية الإعلانات</h3>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterCategory('all');
                      setFilterAcademicYear('all');
                    }}
                    className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                  >
                    إعادة تعيين
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter 1: الحالة */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 block">
                الحالة
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'متاح', label: '✓ متاح' },
                  { id: 'محجوز', label: '⏳ محجوز' },
                  { id: 'مباع', label: '✕ مباع' },
                ].map((st) => {
                  const active = filterStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFilterStatus(st.id)}
                      className={`py-2.5 px-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-[#0F1726] text-slate-300 border border-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter 2: التصنيف */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 block">
                التصنيف
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'جامعية', label: 'جامعية' },
                  { id: 'غير جامعية', label: 'غير جامعية' },
                ].map((cat) => {
                  const active = filterCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFilterCategory(cat.id)}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-[#0F1726] text-slate-300 border border-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter 3: السنة الدراسية */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 block">
                السنة الدراسية
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'تحضيرية', label: 'تحضيرية' },
                  { id: 'ثانية', label: 'ثانية' },
                  { id: 'ثالثة', label: 'ثالثة' },
                  { id: 'رابعة', label: 'رابعة' },
                  { id: 'خامسة', label: 'خامسة' },
                  { id: 'سادسة', label: 'سادسة' },
                ].map((yr) => {
                  const active = filterAcademicYear === yr.id;
                  return (
                    <button
                      key={yr.id}
                      type="button"
                      onClick={() => setFilterAcademicYear(yr.id)}
                      className={`py-2.5 px-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-[#0F1726] text-slate-300 border border-slate-800'
                      }`}
                    >
                      {yr.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(false)}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>تم</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. ITEM DETAIL MODAL / SHEET (Matching Page 13)          */}
      {/* ======================================================== */}
      {currentDetailItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedDetailItem(null)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-[#161F30] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 space-y-4 text-right shadow-2xl max-h-[92dvh] overflow-y-auto"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <span className="text-xs font-black text-slate-400">
                تفاصيل الإعلان
              </span>
            </div>

            {/* Large Image Box */}
            <div className="relative aspect-[16/10] w-full rounded-2xl bg-[#0F1726] overflow-hidden flex items-center justify-center border border-slate-800">
              {currentDetailItem.imageUrl ? (
                <img
                  src={currentDetailItem.imageUrl}
                  alt={currentDetailItem.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <BookOpen className="w-14 h-14 text-emerald-400/60" />
              )}

              {(() => {
                const st = normalizeMarketplaceStatusLabel(
                  currentDetailItem.status
                );
                const sold = st === 'مباع';
                return (
                  <span
                    className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-md ${
                      sold
                        ? 'bg-rose-500 text-white'
                        : st === 'محجوز'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-white'
                    }`}
                  >
                    <span>{sold ? '✕' : '✓'}</span>
                    <span>{st}</span>
                  </span>
                );
              })()}
            </div>

            {/* Title & Seller Info */}
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                {currentDetailItem.title}
              </h2>
              {currentDetailItem.description && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentDetailItem.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs font-bold text-slate-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentDetailItem.sellerName}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{currentDetailItem.createdAt}</span>
                </span>
              </div>
            </div>

            {/* 2x2 Info Grid (السعر | النوع | السنة | التصنيف — Page 13) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#0F1726] border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">
                  السعر
                </span>
                <span className="text-sm font-black text-emerald-400 block">
                  {normalizeDealTypeLabel(currentDetailItem.dealType) === 'هبة' &&
                  (!currentDetailItem.price || currentDetailItem.price === '0')
                    ? 'مجاني'
                    : currentDetailItem.price}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#0F1726] border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">
                  النوع
                </span>
                <span className="text-sm font-black text-white block">
                  {normalizeDealTypeLabel(currentDetailItem.dealType)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#0F1726] border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">
                  السنة
                </span>
                <span className="text-sm font-black text-white block">
                  {(
                    currentDetailItem as MarketplaceItem & {
                      academicYear?: string;
                    }
                  ).academicYear || 'سنة ثالثة'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#0F1726] border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">
                  التصنيف
                </span>
                <span className="text-sm font-black text-white block">
                  {currentDetailItem.category === 'جامعية' ||
                  (currentDetailItem.category as string) === 'جامعي'
                    ? 'جامعية'
                    : 'غير جامعية'}
                </span>
              </div>
            </div>

            {/* Bottom Contact / Sold Banner */}
            {normalizeMarketplaceStatusLabel(currentDetailItem.status) ===
            'مباع' ? (
              <div className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm font-black text-center">
                ✕ هذا الإعلان مباع — التواصل غير متاح
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      setIsAuthModalOpen(true);
                    } else {
                      setSelectedDetailItem(null);
                      openDirectChatWithUser({
                        uid: currentDetailItem.sellerId,
                        displayName: currentDetailItem.sellerName,
                        email: currentDetailItem.sellerEmail,
                      });
                    }
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <MessagesSquare className="w-4 h-4" />
                  <span>مراسلة داخل التطبيق</span>
                </button>

                {currentDetailItem.whatsappNumber && (
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(currentDetailItem)}
                    className="py-3 px-4 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>واتساب</span>
                  </button>
                )}

                {currentDetailItem.telegramUsername && (
                  <button
                    type="button"
                    onClick={() => handleOpenTelegram(currentDetailItem)}
                    className="py-3 px-4 rounded-2xl bg-sky-600/20 border border-sky-500/40 text-sky-300 hover:bg-sky-600/30 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>تلجرام</span>
                  </button>
                )}
              </div>
            )}

            {/* Owner / Admin Management inside Detail Sheet */}
            {isOwnerOrAdmin(currentDetailItem) && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateMarketplaceItemStatus(
                      currentDetailItem.id,
                      currentDetailItem.status === 'متاح' ? 'تم البيع' : 'متاح'
                    )
                  }
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black cursor-pointer"
                >
                  {currentDetailItem.status === 'متاح'
                    ? 'تحديد كـ مباع'
                    : 'إعادة إتاحة الإعلان'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteItem(currentDetailItem);
                    setSelectedDetailItem(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Listing Modal */}
      <AddListingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Confirmation Dialog for deleting listing */}
      <ConfirmationDialog
        isOpen={Boolean(confirmDeleteItem)}
        title="تأكيد حذف العرض"
        message={
          confirmDeleteItem
            ? `هل أنت متأكد من حذف إعلان "${confirmDeleteItem.title}"؟`
            : ''
        }
        onConfirm={() => {
          if (confirmDeleteItem) {
            deleteMarketplaceItem(confirmDeleteItem.id);
            setConfirmDeleteItem(null);
          }
        }}
        onCancel={() => setConfirmDeleteItem(null)}
      />
    </div>
  );
};

