import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  Plus, 
  Send, 
  Phone, 
  Tag, 
  Calendar, 
  Trash2, 
  ShoppingBag,
  MessagesSquare,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { MarketplaceItem } from '../../types';
import { AddListingModal } from './AddListingModal';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';

export const MarketplaceView: React.FC = () => {
  const { 
    marketplaceItems, 
    user, 
    isAdmin, 
    updateMarketplaceItemStatus, 
    deleteMarketplaceItem,
    openDirectChatWithUser,
    setIsAuthModalOpen,
    setActiveSection
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<MarketplaceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'متاح' | 'تم البيع'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'جامعية' | 'غير جامعية'>('all');
  const [filterDealType, setFilterDealType] = useState<string>('all');

  // Filter items
  const filteredItems = useMemo(() => {
    return marketplaceItems.filter(item => {
      // Search
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sellerName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;

      // Category: strictly 'جامعية' or 'غير جامعية'
      if (filterCategory !== 'all') {
        const itemCat = item.category === 'جامعية' || item.category === ('جامعي' as any) ? 'جامعية' : 'غير جامعية';
        if (itemCat !== filterCategory) return false;
      }

      // Deal Type: بيع, إيجار, إعارة, إهداء
      if (filterDealType !== 'all' && item.dealType !== filterDealType) return false;

      return true;
    });
  }, [marketplaceItems, searchQuery, filterStatus, filterCategory, filterDealType]);

  const handleOpenWhatsApp = (item: MarketplaceItem) => {
    if (!item.whatsappNumber) return;
    let cleanPhone = item.whatsappNumber.replace(/[^0-9]/g, '');
    if (!cleanPhone.startsWith('963') && cleanPhone.startsWith('09')) {
      cleanPhone = '963' + cleanPhone.substring(1);
    }
    const message = encodeURIComponent(`مرحباً زميلي ${item.sellerName}، أنا مهتم بعرضك في سوق المستلزمات الجامعي بخصوص: "${item.title}". هل ما زال متاحاً؟`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleOpenTelegram = (item: MarketplaceItem) => {
    if (!item.telegramUsername) return;
    const cleanUsername = item.telegramUsername.replace('@', '').trim();
    window.open(`https://t.me/${cleanUsername}`, '_blank');
  };

  const isOwnerOrAdmin = (item: MarketplaceItem) => {
    return isAdmin || (user && user.uid === item.sellerId);
  };

  return (
    <div className="w-full max-w-md mx-auto sm:max-w-3xl lg:max-w-4xl px-3.5 py-3.5 space-y-4 overflow-x-hidden">
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveSection('home')}
          className="p-1.5 rounded-xl text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0"
          title="العودة للرئيسية"
        >
          <ChevronRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>

        <h1 className="text-sm sm:text-lg font-black text-emerald-400 text-center truncate">
          سوق المستلزمات والكتب
        </h1>

        <button
          onClick={() => {
            if (!user) {
              setIsAuthModalOpen(true);
            } else {
              setIsAddModalOpen(true);
            }
          }}
          className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] sm:text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>إضافة إعلان</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="ابحث عن نوطة، كتاب، سماعة طبية، أدوات، أو اسم البائع..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2 bg-[#131D2E] border border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3.5 top-2 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            مسح
          </button>
        )}
      </div>

      {/* Filter Buttons Strip: Categories [الكل / جامعي / غير جامعي] & Deal Type [الكل / بيع / إيجار / إعارة] */}
      <div className="space-y-2 bg-[#131D2E] p-3 rounded-2xl border border-slate-800">
        
        {/* Category Toggles: Strictly [جامعي / غير جامعي] */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-slate-300">
          <span>التصنيف:</span>
          <div className="flex flex-wrap bg-[#0E172A] p-1 rounded-xl gap-1">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterCategory('جامعية')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterCategory === 'جامعية'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              جامعي
            </button>
            <button
              onClick={() => setFilterCategory('غير جامعية')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterCategory === 'غير جامعية'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              غير جامعي
            </button>
          </div>
        </div>

        {/* Deal Types Toggles: [الكل / بيع / إيجار / إعارة / إهداء] */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-slate-300 pt-2 border-t border-slate-800">
          <span>نوع العرض:</span>
          <div className="flex flex-wrap bg-[#0E172A] p-1 rounded-xl gap-1">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'بيع', label: 'بيع' },
              { id: 'إيجار', label: 'إيجار' },
              { id: 'إعارة', label: 'إعارة' },
              { id: 'إهداء', label: 'إهداء' },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setFilterDealType(type.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterDealType === type.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Toggles: [الكل / متاح / تم البيع] */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-slate-300 pt-2 border-t border-slate-800">
          <span>الحالة:</span>
          <div className="flex flex-wrap bg-[#0E172A] p-1 rounded-xl gap-1">
            {(['all', 'متاح', 'تم البيع'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'all' ? 'الكل' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
        <span>العروض المتاحة ({filteredItems.length}):</span>
        <span>تحديث فوري للبيانات</span>
      </div>

      {/* Items List matching Screenshot 5 */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#131D2E] rounded-3xl border border-slate-800 p-8 space-y-2">
          <ShoppingBag className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="font-bold text-sm text-white">لا توجد عروض تطابق التصفية الحالية</h3>
          <p className="text-xs text-slate-400">
            يمكنك نشر أول إعلان الآن لمشاركة مستلزماتك أو تغيير خيارات البحث.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map((item) => {
            const isSold = item.status === 'تم البيع';
            const canManage = isOwnerOrAdmin(item);

            return (
              <div
                key={item.id}
                className={`bg-[#131D2E] hover:bg-[#162238] border ${
                  isSold ? 'border-slate-800 opacity-60' : 'border-slate-800/90 hover:border-amber-500/40'
                } rounded-3xl p-4 sm:p-5 transition-all shadow-md flex flex-col justify-between space-y-4`}
              >
                {/* Top Section: Header & Badge */}
                <div className="flex items-start justify-between gap-3 text-right">
                  {/* Left: Badges */}
                  <div className="flex flex-col items-start gap-1 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                      isSold 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {item.status}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                      {item.dealType}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                      {item.category === 'جامعية' || (item.category as any) === 'جامعي' ? 'جامعي' : 'غير جامعي'}
                    </span>
                  </div>

                  {/* Right: Title and description */}
                  <div className="flex-1">
                    <h3 className="font-black text-sm sm:text-base text-white hover:text-amber-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 font-semibold">
                      <span>{item.sellerName}</span>
                      <span>•</span>
                      <span>{item.createdAt}</span>
                    </div>
                  </div>

                  {/* Image or Clean Silhouette Placeholder (matching Screenshot 5) */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#1A263D] border border-slate-700/60 overflow-hidden flex items-center justify-center shrink-0">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.title}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-amber-400/80">
                        <BookOpen className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & Action Row */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                  
                  {/* Price */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold">السعر / المقابل:</span>
                    <span className="text-sm sm:text-base font-black text-emerald-400">
                      {item.price}
                    </span>
                  </div>

                  {/* Contact Buttons: In-App Chat, WhatsApp, Telegram */}
                  <div className="flex items-center gap-2">
                    {/* Direct Chat inside App */}
                    <button
                      onClick={() => {
                        if (!user) {
                          setIsAuthModalOpen(true);
                        } else {
                          openDirectChatWithUser({
                            uid: item.sellerId,
                            displayName: item.sellerName,
                            email: item.sellerEmail
                          });
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="محادثة مباشرة داخل الموقع"
                    >
                      <MessagesSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">مراسلة</span>
                    </button>

                    {/* WhatsApp */}
                    {item.whatsappNumber && (
                      <button
                        onClick={() => handleOpenWhatsApp(item)}
                        className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="واتساب"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">واتساب</span>
                      </button>
                    )}

                    {/* Telegram */}
                    {item.telegramUsername && (
                      <button
                        onClick={() => handleOpenTelegram(item)}
                        className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="تليجرام"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">تليجرام</span>
                      </button>
                    )}

                    {/* Owner / Admin Management */}
                    {canManage && (
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          onClick={() => updateMarketplaceItemStatus(
                            item.id, 
                            item.status === 'متاح' ? 'تم البيع' : 'متاح'
                          )}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer"
                        >
                          {item.status === 'متاح' ? 'تحديد كـ مباع' : 'إعادة إتاحة'}
                        </button>

                        <button
                          onClick={() => setConfirmDeleteItem(item)}
                          className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                          title="حذف الإعلان"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
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
        message={confirmDeleteItem ? `هل أنت متأكد من حذف إعلان "${confirmDeleteItem.title}"؟` : ''}
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
