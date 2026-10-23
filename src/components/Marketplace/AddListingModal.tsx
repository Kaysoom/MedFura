import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Upload, 
  Send, 
  Phone, 
  Tag, 
  Sparkles, 
  AlertCircle,
  Check,
  ShoppingBag,
  Image as ImageIcon
} from 'lucide-react';
import { MarketplaceItem } from '../../types';
import { InAppSelect } from '../Common/InAppSelect';

interface AddListingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddListingModal: React.FC<AddListingModalProps> = ({ isOpen, onClose }) => {
  const { user, addMarketplaceItem, setIsAuthModalOpen } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'جامعية' | 'غير جامعية'>('جامعية');
  const [academicYear, setAcademicYear] = useState('السنة الثالثة');
  const [dealType, setDealType] = useState<MarketplaceItem['dealType']>('بيع');
  const [price, setPrice] = useState('50,000 ل.س');
  const [isFree, setIsFree] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Optional image file change
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('حجم الصورة كبير جداً (الأقصى 2 ميجابايت).');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setErrorMsg('تعذر قراءة ملف الصورة.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!title.trim()) {
      setErrorMsg('يرجى إدخال عنوان الإعلان.');
      return;
    }

    if (!telegramUsername.trim() && !whatsappNumber.trim()) {
      setErrorMsg('يرجى إدخال وسيلة تواصل واحدة على الأقل (واتساب أو تليجرام).');
      return;
    }

    setSubmitting(true);
    try {
      const finalPrice = dealType === 'إهداء' ? 'إهداء مجاني' : (isFree ? 'مجاناً' : price.trim());

      await addMarketplaceItem({
        title: title.trim(),
        description: description.trim() || 'نوط ومستلزمات دراسية نظيفة، يرجى التواصل للمزيد من التفاصيل.',
        category,
        academicYear,
        dealType,
        price: finalPrice,
        status: 'متاح',
        imageUrl: imageUrl.trim() || undefined, // completely optional
        telegramUsername: telegramUsername.replace('@', '').trim() || undefined,
        whatsappNumber: whatsappNumber.trim() || undefined,
        sellerId: user.uid,
        sellerName: user.displayName || 'طالب جامعي',
        sellerEmail: user.email,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'تعذر نشر الإعلان. يرجى المحاولة ثانية.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#0E172A] rounded-3xl shadow-2xl border border-slate-800 overflow-hidden my-6 text-white">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-5 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/15 backdrop-blur-md flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-950">
                إضافة إعلان في سوق المستلزمات
              </h3>
              <p className="text-xs text-slate-900 font-semibold">
                بيع، إيجار، أو إعارة الكتب والنوط والمعدات لزملائك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-slate-950 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="m-4 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              عنوان المستلزم / النوطة / الأداة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: نوط تشريح عصبية كاملة، أو سماعة Littmann أصلية..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Categories: ONLY [جامعي / غير جامعي] */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                التصنيف <span className="text-rose-500">*</span>
              </label>
              <InAppSelect<'جامعية' | 'غير جامعية'>
                value={category}
                onChange={(val) => setCategory(val)}
                size="sm"
                options={[
                  { value: 'جامعية', label: 'جامعي (كتب ونوط ومعدات دراسية)' },
                  { value: 'غير جامعية', label: 'غير جامعي (كتب وروايات ومستلزمات عامة)' },
                ]}
              />
            </div>

            {/* Deal Type: [بيع / إيجار / إعارة / إهداء] */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                نوع العرض <span className="text-rose-500">*</span>
              </label>
              <InAppSelect<MarketplaceItem['dealType']>
                value={dealType}
                onChange={(val) => {
                  setDealType(val);
                  if (val === 'إهداء') setIsFree(true);
                  if (val === 'إيجار' && !price.includes('شهري')) setPrice('20,000 / شهرياً');
                }}
                size="sm"
                options={[
                  { value: 'بيع', label: 'بيع (مادي)' },
                  { value: 'إيجار', label: 'إيجار (فترة مؤقتة / شهري)' },
                  { value: 'إعارة', label: 'إعارة (استعارة واسترجاع)' },
                  { value: 'إهداء', label: 'إهداء (مجاني لوجه الله)' },
                ]}
              />
            </div>
          </div>

          {/* Price & Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                السعر أو المقابل
              </label>
              <input
                type="text"
                disabled={dealType === 'إهداء'}
                placeholder={dealType === 'إيجار' ? '25,000 / شهرياً' : '70,000 ل.س'}
                value={dealType === 'إهداء' ? 'مجاني' : price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-white focus:outline-hidden focus:border-amber-500 disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                السنة الدراسية المستهدفة
              </label>
              <InAppSelect
                value={academicYear}
                onChange={(val) => setAcademicYear(val)}
                size="sm"
                options={[
                  { value: 'سنة أولى', label: 'السنة الأولى (التحضيرية)' },
                  { value: 'سنة ثانية', label: 'السنة الثانية' },
                  { value: 'سنة ثالثة', label: 'السنة الثالثة' },
                  { value: 'سنة رابعة', label: 'السنة الرابعة' },
                  { value: 'سنة خامسة', label: 'السنة الخامسة' },
                  { value: 'سنة سادسة', label: 'السنة السادسة' },
                  { value: 'عام', label: 'لجميع السنوات' },
                ]}
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                رقم الواتساب
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="0999123456"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500 font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                يوزر التليجرام (بدون @)
              </label>
              <div className="relative">
                <Send className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="username"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500 font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              وصف المستلزم وحالته (اختياري)
            </label>
            <textarea
              rows={2}
              placeholder="مثال: حالة النوطة جديدة بدون خطوط، أو السماعة استعمال فصل واحد مع الغيار الأصلي..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-hidden focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* Image Upload: COMPLETELY OPTIONAL */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
              <span>صورة المستلزم (اختيارية تماماً):</span>
              <span className="text-[11px] text-slate-400">إذا لم ترفع صورة، ستظهر أيقونة أنيقة تلقائياً</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-3 border border-dashed border-slate-700 hover:border-amber-500 rounded-2xl bg-slate-900 text-xs font-bold text-slate-300 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{isUploading ? 'جاري تحميل الصورة...' : imageUrl ? 'تغيير الصورة المرفقة' : 'رفع صورة من جهازك (اختياري)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>

              {imageUrl && (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                  <img src={imageUrl} alt="معاينة" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-xs"
                    title="حذف الصورة"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'جاري النشر...' : 'نشر الإعلان الآن'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
