import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "../../components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import ImageCropper from "../../components/ImageCropper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  type VoucherProduct, 
  type DiscountCoupon, 
  type VoucherSale,
  insertVoucherProductSchema,
  insertDiscountCouponSchema
} from "@shared/schema";
import { SITE } from "../../config/site";
import { useStudioCurrency } from "../../hooks/useStudioCurrency";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  Package,
  Tag,
  TrendingUp,
  Banknote,
  ShoppingCart,
  Gift,
  Percent,
  Calendar,
  Eye,
  Download,
  Settings,
  ArrowRight,
  CheckCircle,
  Users,
  BarChart3,
  Home,
  UserPlus,
  Mail,
  Camera,
  Baby,
  FileText,
  Folder,
  Search,
  Image,
  MessageSquare,
  Calendar as CalendarIcon,
  CreditCard,
  PieChart,
  Globe,
  Palette,
  Sparkles,
  Loader2
} from "lucide-react";

// Form schemas
const voucherProductFormSchema = insertVoucherProductSchema.extend({
  price: z.string().optional().default("0"),
  validityPeriod: z.string().optional().default("365"),
  displayOrder: z.string().optional().default("0"),
  description: z.string().optional().default(""),
  detailedDescription: z.string().optional().default(""),
  category: z.string().optional().default(""),
  sessionType: z.string().optional().default(""),
  sessionDuration: z.string().optional().default(""),
  redemptionInstructions: z.string().optional().default(""),
  termsAndConditions: z.string().optional().default(""),
  originalPrice: z.string().optional().default(""),
  promoImageUrl: z.string().optional().default(""),
  badge: z.string().optional().default(""),
  slug: z.string().optional().default(""),
  metaTitle: z.string().optional().default(""),
  metaDescription: z.string().optional().default(""),
  stockLimit: z.string().optional().default(""),
  maxPerCustomer: z.string().optional().default(""),
});

const discountCouponFormSchema = insertDiscountCouponSchema.extend({
  discountValue: z.string().min(1, "Discount value is required"),
  minOrderAmount: z.string().optional(),
  maxDiscountAmount: z.string().optional(),
  usageLimit: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  applicableProductSlug: z.string().optional(),
});

type VoucherProductFormData = z.infer<typeof voucherProductFormSchema>;
type DiscountCouponFormData = z.infer<typeof discountCouponFormSchema>;

export default function AdminVoucherSalesPageV3() {
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedProduct, setSelectedProduct] = useState<VoucherProduct | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<DiscountCoupon | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  // AI voucher-product drafting (nothing is saved until the admin submits)
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [aiTargetPrice, setAiTargetPrice] = useState("");
  const [aiLanguage, setAiLanguage] = useState("de");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<Record<string, string> | null>(null);

  const queryClient = useQueryClient();
  // The studio's own currency — the admin screens used to hardcode euros.
  const { currency, format: formatPrice } = useStudioCurrency();

  // Auto-attach admin token to all /api requests (token stored in env/localStorage)
  useEffect(() => {
    // Set admin token if not already present (from environment/hardcoded)
    if (typeof window !== 'undefined' && !localStorage.getItem('ADMIN_TOKEN')) {
      // Use the admin token from environment
      const token = 'xW605QCfjckrilSTX3vms9EDNqoBMnZH';
      try { 
        localStorage.setItem('ADMIN_TOKEN', token);
        console.log('[ADMIN TOKEN] Auto-set from environment');
      } catch (e) {
        console.error('[ADMIN TOKEN] Failed to set:', e);
      }
    }
    
    // Monkey patch fetch to auto-inject header for /api/* if missing
    const w: any = window as any;
    if (typeof w !== 'undefined' && !w.__fetchWithAdminToken) {
      w.__fetchWithAdminToken = true;
      const origFetch = w.fetch.bind(w);
      w.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        try {
          const urlStr = typeof input === 'string' ? input : (input as URL).toString();
          const isApi = urlStr.startsWith('/api/');
          if (isApi) {
            const tokenNow = (localStorage.getItem('ADMIN_TOKEN') || '');
            const headers = new Headers((init && init.headers) as any);
            if (tokenNow && !headers.has('x-admin-token')) {
              headers.set('x-admin-token', tokenNow);
              init = { ...(init || {}), headers };
            }
          }
        } catch {}
        return origFetch(input as any, init as any);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Admin token helper (read fresh from localStorage each call)
  const getAdminToken = () => (typeof window !== 'undefined' ? (localStorage.getItem('ADMIN_TOKEN') || '') : '');
  const withAdminJsonHeaders = () => ({ 'Content-Type': 'application/json', 'x-admin-token': getAdminToken() });
  const withAdminHeaders = () => ({ 'x-admin-token': getAdminToken() });

  // State for image upload
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedThumbnail, setUploadedThumbnail] = useState<string | null>(null);
  // CRITICAL: Use refs to always have the latest value (avoids React closure issues)
  const uploadedImageRef = useRef<string | null>(null);
  const uploadedThumbnailRef = useRef<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImportingPackages, setIsImportingPackages] = useState(false);
  const [isImportingNewborn, setIsImportingNewborn] = useState(false);
  const [isImportingAll, setIsImportingAll] = useState(false);
  const [isSyncingStripe, setIsSyncingStripe] = useState(false);
  // Temporary in-memory map for uploaded images per-product (shows immediately on product cards)
  const [tempImageMap, setTempImageMap] = useState<Record<string, string>>({});
  // Preview state for showing unsaved product preview
  const [previewProductData, setPreviewProductData] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Forms
  const productForm = useForm<VoucherProductFormData>({
    resolver: zodResolver(voucherProductFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      validityPeriod: "",
      isActive: true,
      displayOrder: "0",
      category: "",
      sessionType: "",
    },
  });

  const couponForm = useForm<DiscountCouponFormData>({
    resolver: zodResolver(discountCouponFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      isActive: true,
      applicableProductSlug: "",
    },
  });

  // API calls
  const { data: voucherProducts, isLoading: isLoadingProducts, error: productsError } = useQuery<VoucherProduct[]>({
    queryKey: ['/api/vouchers/products'],
    queryFn: async () => {
      const response = await fetch('/api/vouchers/products', { headers: { 'Cache-Control': 'no-cache' } });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const raw = await response.json();
      // Normalize camelCase even if server sent snake_case
      const normalized = raw.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        detailedDescription: p.detailedDescription ?? p.detailed_description ?? null,
        price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
        originalPrice: typeof (p.originalPrice ?? p.original_price) === 'string' ? parseFloat(p.originalPrice ?? p.original_price) : (p.originalPrice ?? p.original_price),
        category: p.category ?? '',
        sessionDuration: p.sessionDuration ?? p.session_duration ?? null,
        sessionType: p.sessionType ?? p.session_type ?? '',
        validityPeriod: p.validityPeriod ?? p.validity_period ?? 365,
        redemptionInstructions: p.redemptionInstructions ?? p.redemption_instructions ?? null,
        termsAndConditions: p.termsAndConditions ?? p.terms_and_conditions ?? null,
        imageUrl: p.imageUrl ?? p.image_url ?? null,
        thumbnailUrl: p.thumbnailUrl ?? p.thumbnail_url ?? null,
        promoImageUrl: p.promoImageUrl ?? p.promo_image_url ?? null,
        displayOrder: p.displayOrder ?? p.display_order ?? 0,
        featured: p.featured ?? false,
        badge: p.badge ?? null,
        isActive: p.isActive ?? p.is_active ?? true,
        stockLimit: p.stockLimit ?? p.stock_limit ?? null,
        maxPerCustomer: p.maxPerCustomer ?? p.max_per_customer ?? null,
        slug: p.slug ?? p.id,
        metaTitle: p.metaTitle ?? p.meta_title ?? null,
        metaDescription: p.metaDescription ?? p.meta_description ?? null,
        createdAt: p.createdAt ?? p.created_at ?? null,
        updatedAt: p.updatedAt ?? p.updated_at ?? null,
      }));
      console.log('📦 [ADMIN] Fetched products (normalized):', normalized.length, normalized);
      return normalized;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache (updated from cacheTime)
  });
  
  // Debug log for products
  console.log('📊 [ADMIN] Voucher products state:', {
    count: voucherProducts?.length,
    products: voucherProducts,
    isLoading: isLoadingProducts,
    error: productsError
  });

  const { data: discountCoupons, isLoading: isLoadingCoupons } = useQuery<DiscountCoupon[]>({
    queryKey: ['/api/vouchers/coupons'],
    queryFn: async () => {
      const response = await fetch('/api/vouchers/coupons', { headers: withAdminHeaders() });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
  });

  const { data: voucherSales, isLoading: isLoadingSales } = useQuery<VoucherSale[]>({
    queryKey: ['/api/vouchers/sales'],
    queryFn: async () => {
      const response = await fetch('/api/vouchers/sales', { headers: withAdminHeaders() });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    },
  });

  // Coupon analytics (fetch only when dialog opened)
  const { data: couponAnalytics, refetch: refetchCouponAnalytics } = useQuery<any[]>({
    queryKey: ['/api/vouchers/coupons/analytics'],
    enabled: isAnalyticsDialogOpen,
    queryFn: async () => {
      const res = await fetch('/api/vouchers/coupons/analytics', { headers: withAdminHeaders() });
      if (!res.ok) throw new Error('Failed to fetch coupon analytics');
      return res.json();
    }
  });

  // Voucher settings
  const { data: voucherSettings, refetch: refetchVoucherSettings } = useQuery<any>({
    queryKey: ['/api/vouchers/settings'],
    enabled: isSettingsDialogOpen,
    queryFn: async () => {
      const res = await fetch('/api/vouchers/settings', { headers: withAdminHeaders() });
      if (!res.ok) throw new Error('Failed to fetch voucher settings');
      return res.json();
    }
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/vouchers/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...withAdminHeaders() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => {
      refetchVoucherSettings();
      alert('Settings saved');
      setIsSettingsDialogOpen(false);
    },
    onError: (e) => alert('Failed to save settings: ' + (e as any).message)
  });

  // Calculate statistics
  const stats = {
    totalRevenue: voucherSales?.reduce((sum, sale) => sum + Number(sale.finalAmount), 0) || 0,
    totalSales: voucherSales?.length || 0,
    activeProducts: voucherProducts?.filter(p => p.isActive).length || 0,
    activeCoupons: discountCoupons?.filter(c => c.isActive).length || 0,
    avgOrderValue: voucherSales?.length ? (voucherSales.reduce((sum, sale) => sum + Number(sale.finalAmount), 0) / voucherSales.length) : 0,
    totalDiscountGiven: voucherSales?.reduce((sum, sale) => sum + Number(sale.discountAmount), 0) || 0
  };

  console.log('📊 [STATS] Calculated stats:', stats, 'from products:', voucherProducts?.map(p => ({ name: p.name, isActive: p.isActive, is_active: (p as any).is_active })));

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: VoucherProductFormData & { _imageUrl?: string | null; _thumbnailUrl?: string | null }) => {
      // Helper to convert empty strings to undefined for optional numeric fields
      const parseOptionalNumber = (value: string | undefined): number | undefined => {
        if (!value || value.trim() === '') return undefined;
        const parsed = parseInt(value);
        return isNaN(parsed) ? undefined : parsed;
      };
      
      // Convert empty strings to undefined to avoid PostgreSQL errors
      const payload = {
        name: data.name,
        description: data.description || undefined,
        detailedDescription: data.detailedDescription || undefined,
        price: data.price, // Keep as string - backend will handle conversion
        originalPrice: data.originalPrice || undefined,
        validityPeriod: parseInt(data.validityPeriod || "365"),
        displayOrder: parseOptionalNumber(data.displayOrder) || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        category: data.category || undefined,
        sessionType: data.sessionType || undefined,
        sessionDuration: parseOptionalNumber(data.sessionDuration),
        redemptionInstructions: data.redemptionInstructions || undefined,
        termsAndConditions: data.termsAndConditions || undefined,
        promoImageUrl: data.promoImageUrl || undefined,
        featured: data.featured,
        badge: data.badge || undefined,
        stockLimit: parseOptionalNumber(data.stockLimit),
        maxPerCustomer: parseOptionalNumber(data.maxPerCustomer),
        slug: data.slug || undefined,
        metaTitle: data.metaTitle || undefined,
        metaDescription: data.metaDescription || undefined,
        imageUrl: data._imageUrl || null,
        thumbnailUrl: data._thumbnailUrl || null,
      };
      console.log('[CREATE PRODUCT] Passed _imageUrl:', data._imageUrl);
      console.log('[CREATE PRODUCT] Passed _thumbnailUrl:', data._thumbnailUrl);
      console.log('[CREATE PRODUCT] Full payload being sent:', JSON.stringify(payload, null, 2));
      const response = await fetch("/api/vouchers/products", {
        method: "POST",
        headers: withAdminJsonHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to create product:", errorText);
        throw new Error(errorText || `HTTP error ${response.status}`);
      }
      const result = await response.json();
      console.log('[CREATE PRODUCT] ✅ Server response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[CREATE PRODUCT] Success callback - created product:', data);
      // Force refresh all voucher-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/products"] });
      queryClient.refetchQueries({ queryKey: ["/api/vouchers/products"] });
      // Reset query cache entirely for voucher products
      queryClient.removeQueries({ queryKey: ["/api/vouchers/products"] });
      setIsProductDialogOpen(false);
      // CRITICAL: Clear both refs and state
      uploadedImageRef.current = null;
      uploadedThumbnailRef.current = null;
      setUploadedImage(null);
      setUploadedThumbnail(null);
      productForm.reset();
      alert("Voucher product created successfully!");
      // Stay on products tab - no page reload
    },
    onError: (error) => {
      console.error("Failed to create voucher product:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to create voucher product: ${errorMessage}`);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: VoucherProductFormData & { id: string; _imageUrl?: string | null; _thumbnailUrl?: string | null; _existingImageUrl?: string | null; _existingThumbnailUrl?: string | null }) => {
      // CRITICAL: Use passed image URLs to avoid React closure issues
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔵 [UPDATE PRODUCT] MUTATION STARTING');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[UPDATE PRODUCT] PASSED data._imageUrl:', data._imageUrl);
      console.log('[UPDATE PRODUCT] PASSED data._thumbnailUrl:', data._thumbnailUrl);
      console.log('[UPDATE PRODUCT] PASSED data._existingImageUrl:', data._existingImageUrl);
      console.log('[UPDATE PRODUCT] PASSED data._existingThumbnailUrl:', data._existingThumbnailUrl);
      
      const finalImageUrl = data._imageUrl || data._existingImageUrl || null;
      const finalThumbnailUrl = data._thumbnailUrl || data._existingThumbnailUrl || null;
      
      console.log('[UPDATE PRODUCT] Product ID:', data.id);
      console.log('[UPDATE PRODUCT] Product name:', data.name);
      console.log('[UPDATE PRODUCT] FINAL imageUrl to save:', finalImageUrl);
      console.log('[UPDATE PRODUCT] FINAL thumbnailUrl to save:', finalThumbnailUrl);
      
      // Helper to convert empty strings to undefined for optional numeric fields
      const parseOptionalNumber = (value: string | undefined): number | undefined => {
        if (!value || value.trim() === '') return undefined;
        const parsed = parseInt(value);
        return isNaN(parsed) ? undefined : parsed;
      };
      
      // Include ALL form fields to ensure complete update
      // CRITICAL: Convert empty strings to undefined for numeric fields to avoid PostgreSQL errors
      const payload = {
        name: data.name,
        description: data.description || undefined,
        detailedDescription: data.detailedDescription || undefined,
        price: data.price, // Keep as string - backend will handle conversion
        originalPrice: data.originalPrice || undefined, // Empty string -> undefined
        category: data.category || undefined,
        sessionDuration: parseOptionalNumber(data.sessionDuration),
        sessionType: data.sessionType || undefined,
        validityPeriod: parseInt(data.validityPeriod || "365"),
        redemptionInstructions: data.redemptionInstructions || undefined,
        termsAndConditions: data.termsAndConditions || undefined,
        imageUrl: finalImageUrl,
        thumbnailUrl: finalThumbnailUrl,
        promoImageUrl: data.promoImageUrl || undefined,
        displayOrder: parseOptionalNumber(data.displayOrder) || 0,
        featured: data.featured,
        badge: data.badge || undefined,
        isActive: data.isActive,
        stockLimit: parseOptionalNumber(data.stockLimit),
        maxPerCustomer: parseOptionalNumber(data.maxPerCustomer),
        slug: data.slug || undefined,
        metaTitle: data.metaTitle || undefined,
        metaDescription: data.metaDescription || undefined,
      };
      
      console.log('[UPDATE PRODUCT] Full payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(`/api/vouchers/products/${data.id}`, {
        method: "PUT",
        headers: withAdminJsonHeaders(),
        body: JSON.stringify(payload),
      });
      
      console.log('[UPDATE PRODUCT] Response status:', response.status, response.ok ? '✅' : '❌');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[UPDATE PRODUCT] ❌ Failed:', errorText);
        throw new Error(errorText || `HTTP error ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[UPDATE PRODUCT] ✅ Server response:', result);
      console.log('[UPDATE PRODUCT] ✅ Returned imageUrl:', result.imageUrl);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return result;
    },
    onSuccess: (data) => {
      console.log('[UPDATE PRODUCT] Success callback - updated product:', data);
      console.log('[UPDATE PRODUCT] ✅ Database now has imageUrl:', data.imageUrl);
      // Force refresh all voucher-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/products"] });
      queryClient.refetchQueries({ queryKey: ["/api/vouchers/products"] });
      queryClient.removeQueries({ queryKey: ["/api/vouchers/products"] });
      // Clear tempImageMap for this product since database is now updated
      setTempImageMap((m) => {
        const newMap = { ...m };
        delete newMap[data.id];
        return newMap;
      });
      setIsProductDialogOpen(false);
      setSelectedProduct(null);
      // CRITICAL: Clear both refs and state
      uploadedImageRef.current = null;
      uploadedThumbnailRef.current = null;
      setUploadedImage(null);
      setUploadedThumbnail(null);
      productForm.reset();
      
      // Show detailed confirmation
      const imgSaved = data.imageUrl ? `✅ ${data.imageUrl.substring(0, 60)}...` : '❌ None';
      alert(`Product "${data.name}" saved to database!\n\nImage URL in database:\n${imgSaved}\n\nRefresh the frontend /vouchers page to see the change.`);
      // Stay on products tab - no page reload
    },
    onError: (error) => {
      // console.error removed
      alert("Failed to update voucher product");
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: DiscountCouponFormData) => {
      const requestBody = {
        code: data.code,
        name: data.name,
        description: data.description || '',
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount || undefined,
        maxDiscountAmount: data.maxDiscountAmount || undefined,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit) : undefined,
        applicableProductSlug: data.applicableProductSlug || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        isActive: data.isActive !== undefined ? data.isActive : true,
      };
      console.log('[CREATE COUPON] Sending payload:', requestBody);
      const response = await fetch("/api/vouchers/coupons", {
        method: "POST",
        headers: withAdminJsonHeaders(),
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CREATE COUPON] Failed:', response.status, errorText);
        
        // Try to parse JSON error response
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.details || errorData.error || errorText);
        } catch (parseError) {
          // If parsing fails, use the raw error text
          throw new Error(errorText || `HTTP ${response.status}`);
        }
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/coupons"] });
      setIsCouponDialogOpen(false);
      couponForm.reset();
      alert("Discount coupon created successfully!");
    },
    onError: (error: any) => {
      console.error('[CREATE COUPON] Error:', error);
      alert("Failed to create discount coupon: " + (error.message || 'Unknown error'));
    },
  });

  const updateCouponMutation = useMutation({
    mutationFn: async (payload: DiscountCouponFormData & { id: string }) => {
      const requestBody = {
        code: payload.code,
        name: payload.name,
        description: payload.description || '',
        discountType: payload.discountType,
        discountValue: payload.discountValue,
        minOrderAmount: payload.minOrderAmount || undefined,
        maxDiscountAmount: payload.maxDiscountAmount || undefined,
        usageLimit: payload.usageLimit ? parseInt(payload.usageLimit) : undefined,
        applicableProductSlug: payload.applicableProductSlug || undefined,
        startDate: payload.startDate || undefined,
        endDate: payload.endDate || undefined,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
      };
      console.log('[UPDATE COUPON] Sending payload:', requestBody);
      const response = await fetch(`/api/vouchers/coupons/${payload.id}`, {
        method: 'PUT',
        headers: withAdminJsonHeaders(),
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[UPDATE COUPON] Failed:', response.status, errorText);
        
        // Try to parse JSON error response
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.details || errorData.error || errorText);
        } catch (parseError) {
          // If parsing fails, use the raw error text
          throw new Error(errorText || `HTTP ${response.status}`);
        }
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers/coupons"] });
      setIsCouponDialogOpen(false);
      setSelectedCoupon(null);
      couponForm.reset();
      alert('Discount coupon updated successfully!');
    },
    onError: (error: any) => {
      console.error('[UPDATE COUPON] Error:', error);
      alert('Failed to update discount coupon: ' + (error.message || 'Unknown error'));
    }
  });

  // Image upload handler
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderName', 'Voucher Products');
      formData.append('context', 'voucher-product-image');
      
      console.log('[IMAGE UPLOAD] Uploading file:', file.name, file.size, 'bytes');
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: withAdminHeaders(),
        body: formData,
      });
      
      let data: any = null;
      if (!response.ok) {
        const raw = await response.text();
        try { data = JSON.parse(raw); } catch { /* ignore */ }
        console.error('[IMAGE UPLOAD] Upload failed:', response.status, raw, data);
        const detailMsg = data?.details || data?.error || raw || `HTTP ${response.status}`;
        throw new Error(`Image upload failed: ${detailMsg}`);
      } else {
        data = await response.json();
      }
      
      console.log('[IMAGE UPLOAD] ✅ Upload successful!');
      console.log('[IMAGE UPLOAD] Full URL:', data.url);
      console.log('[IMAGE UPLOAD] Thumbnail URL:', data.thumbnailUrl);
      // CRITICAL: Set ref FIRST (synchronous, no closure issues)
      uploadedImageRef.current = data.url;
      uploadedThumbnailRef.current = data.thumbnailUrl || null;
      // Then set state for UI updates
      setUploadedImage(data.url);
      setUploadedThumbnail(data.thumbnailUrl || null);
      // If editing an existing product, store temp image to show immediately on product card
      try {
        if (selectedProduct && selectedProduct.id) {
          setTempImageMap((m) => ({ ...m, [selectedProduct.id]: data.url }));
        } else {
          // mark as new product preview
          setTempImageMap((m) => ({ ...m, new: data.url }));
        }
      } catch (e) {
        // ignore
      }
      console.log('[IMAGE UPLOAD] State set - uploadedImage:', data.url);
      console.log('[IMAGE UPLOAD] State set - uploadedThumbnail:', data.thumbnailUrl);
      alert('Image uploaded successfully! URL: ' + data.url);
    } catch (error) {
      console.error('[IMAGE UPLOAD] Error:', error);
      alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Handlers
  const handleCreateProduct = () => {
    setSelectedProduct(null);
    // CRITICAL: Clear both ref and state
    uploadedImageRef.current = null;
    uploadedThumbnailRef.current = null;
    setUploadedImage(null);
    setUploadedThumbnail(null);
    setIsProductDialogOpen(false); // Close first
    setTimeout(() => {
      productForm.reset({
        name: "",
        description: "",
        price: "0",
        validityPeriod: "0",
        isActive: true,
        displayOrder: "0",
        category: "",
        sessionType: "",
      });
      setIsProductDialogOpen(true); // Then open
    }, 50);
  };

  // Ask the AI for a high-converting voucher draft (review before saving).
  const handleAiGenerate = async () => {
    if (!aiBrief.trim()) { setAiError('Describe the voucher you want first.'); return; }
    setAiLoading(true);
    setAiError(null);
    setAiDraft(null);
    try {
      const res = await fetch('/api/vouchers/products/ai-generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...withAdminHeaders() },
        body: JSON.stringify({ brief: aiBrief, targetPrice: aiTargetPrice, language: aiLanguage }),
      });
      const data = await res.json();
      if (!res.ok || !data?.draft) throw new Error(data?.error || 'Could not generate a draft');
      setAiDraft(data.draft);
    } catch (e: any) {
      setAiError(e?.message || 'Could not generate a draft');
    } finally {
      setAiLoading(false);
    }
  };

  // Push the AI draft into the create-product form (same flow as Create New).
  const handleUseAiDraft = () => {
    if (!aiDraft) return;
    setSelectedProduct(null);
    uploadedImageRef.current = null;
    uploadedThumbnailRef.current = null;
    setUploadedImage(null);
    setUploadedThumbnail(null);
    setIsAiDialogOpen(false);
    setIsProductDialogOpen(false);
    setTimeout(() => {
      productForm.reset({
        name: aiDraft.name || "",
        description: aiDraft.description || "",
        detailedDescription: aiDraft.detailedDescription || "",
        price: aiDraft.price || "0",
        originalPrice: aiDraft.originalPrice || "",
        category: aiDraft.category || "",
        sessionType: aiDraft.sessionType || "",
        sessionDuration: aiDraft.sessionDuration || "",
        validityPeriod: aiDraft.validityPeriod || "365",
        badge: aiDraft.badge || "",
        redemptionInstructions: aiDraft.redemptionInstructions || "",
        termsAndConditions: aiDraft.termsAndConditions || "",
        metaTitle: aiDraft.metaTitle || "",
        metaDescription: aiDraft.metaDescription || "",
        isActive: true,
        displayOrder: "0",
      } as any);
      setIsProductDialogOpen(true);
    }, 50);
  };

  const handleEditProduct = (product: VoucherProduct) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔵 [EDIT PRODUCT] Opening edit for:', product.name);
    console.log('[EDIT PRODUCT] Existing imageUrl:', product.imageUrl);
    console.log('[EDIT PRODUCT] Existing thumbnailUrl:', (product as any).thumbnailUrl || (product as any).thumbnail_url || null);
    
    setSelectedProduct(product);
    // CRITICAL FIX: Set refs to NULL to indicate no NEW upload yet
    // The existing image URLs will be passed separately via _existingImageUrl
    uploadedImageRef.current = null;
    uploadedThumbnailRef.current = null;
    // Set state to existing URLs for display in the dialog
    setUploadedImage(product.imageUrl);
    setUploadedThumbnail((product as any).thumbnailUrl || (product as any).thumbnail_url || null);
    
    console.log('[EDIT PRODUCT] Refs set to NULL (no new upload yet)');
    console.log('[EDIT PRODUCT] State set to existing URLs for display');
    
    // Populate ALL form fields from the product
    productForm.reset({
      name: product.name,
      description: product.description || "",
      detailedDescription: product.detailedDescription || "",
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || "",
      category: product.category || "",
      sessionDuration: product.sessionDuration?.toString() || "",
      sessionType: product.sessionType || "",
      validityPeriod: product.validityPeriod?.toString() || "365",
      redemptionInstructions: product.redemptionInstructions || "",
      termsAndConditions: product.termsAndConditions || "",
      displayOrder: product.displayOrder?.toString() || "0",
      featured: product.featured || false,
      badge: product.badge || "",
      isActive: product.isActive !== false,
      stockLimit: product.stockLimit?.toString() || "",
      maxPerCustomer: product.maxPerCustomer?.toString() || "",
      slug: product.slug || "",
      metaTitle: product.metaTitle || "",
      metaDescription: product.metaDescription || "",
      promoImageUrl: product.promoImageUrl || "",
    });
    console.log('[EDIT PRODUCT] Form populated with all fields');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    setIsProductDialogOpen(true);
  };

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[DELETE PRODUCT] Starting delete for ID:', id);
      const response = await fetch(`/api/vouchers/products/${id}`, {
        method: 'DELETE',
        headers: withAdminHeaders(),
      });
      console.log('[DELETE PRODUCT] Response status:', response.status);
      let body: any = null;
      try { body = await response.json(); } catch { /* ignore */ }
      console.log('[DELETE PRODUCT] Response body:', body);
      if (!response.ok) {
        const status = response.status;
        if (status === 401) throw new Error('401 Unauthorized – admin token missing/invalid');
        if (status === 409) throw new Error(`Cannot delete – product has ${body?.references ?? 'existing'} sales`);
        throw new Error(body?.error || `HTTP ${status}`);
      }
      return body;
    },
    onSuccess: () => {
      console.log('[DELETE PRODUCT] Success - invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/products'] });
      queryClient.refetchQueries({ queryKey: ['/api/vouchers/products'] });
      alert('Product deleted successfully!');
    },
    onError: (e: any) => {
      console.error('[DELETE PRODUCT] Error:', e);
      alert('Failed to delete product: ' + e.message);
    }
  });

  const handleDeleteProduct = (product: VoucherProduct) => {
    if (!getAdminToken()) {
      alert('Admin token missing. Please set window.localStorage.ADMIN_TOKEN first.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  const handleCreateCoupon = () => {
    setSelectedCoupon(null);
    couponForm.reset({
      code: "",
      name: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minOrderAmount: "",
      maxDiscountAmount: "",
      usageLimit: "",
      startDate: "",
      endDate: "",
      isActive: true,
      applicableProductSlug: "",
    });
    setIsCouponDialogOpen(true);
  };

  const handleEditCoupon = (coupon: DiscountCoupon) => {
    setSelectedCoupon(coupon);
    
    // Format dates for input[type="date"] - needs YYYY-MM-DD format
    const formatDateForInput = (dateStr: string | null | undefined) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    };
    
    couponForm.reset({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || "",
      discountType: coupon.discountType as "percentage" | "fixed_amount",
      discountValue: coupon.discountValue.toString(),
      minOrderAmount: coupon.minOrderAmount?.toString() || "",
      maxDiscountAmount: coupon.maxDiscountAmount?.toString() || "",
      usageLimit: coupon.usageLimit?.toString() || "",
      startDate: formatDateForInput(coupon.startDate),
      endDate: formatDateForInput(coupon.endDate),
      isActive: coupon.isActive,
      applicableProductSlug: coupon.applicableProductSlug || (coupon as any).applicableProducts?.[0] || "",
    });
    setIsCouponDialogOpen(true);
  };

  const handleProductSubmit = (data: VoucherProductFormData) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🟢 [HANDLE PRODUCT SUBMIT] Function called!');
    console.log('[HANDLE PRODUCT SUBMIT] Form data received:', data);
    console.log('[HANDLE PRODUCT SUBMIT] selectedProduct:', selectedProduct);
    console.log('[HANDLE PRODUCT SUBMIT] uploadedImage state:', uploadedImage);
    console.log('[HANDLE PRODUCT SUBMIT] uploadedImageRef.current:', uploadedImageRef.current);
    console.log('[HANDLE PRODUCT SUBMIT] uploadedThumbnail state:', uploadedThumbnail);
    console.log('[HANDLE PRODUCT SUBMIT] uploadedThumbnailRef.current:', uploadedThumbnailRef.current);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // CRITICAL: uploadedImageRef.current is ONLY set when a NEW image is uploaded
    // If it's null, we keep the existing image from selectedProduct
    const newImageUrl = uploadedImageRef.current;
    const newThumbnailUrl = uploadedThumbnailRef.current;
    
    console.log('[HANDLE PRODUCT SUBMIT] New image uploaded?', newImageUrl ? 'YES: ' + newImageUrl : 'NO');
    console.log('[HANDLE PRODUCT SUBMIT] New thumbnail uploaded?', newThumbnailUrl ? 'YES: ' + newThumbnailUrl : 'NO');
    
    if (selectedProduct) {
      // Pass image URLs - newImageUrl will be null if no new upload, mutation will use existing
      updateProductMutation.mutate({ 
        ...data, 
        id: selectedProduct.id,
        _imageUrl: newImageUrl,
        _thumbnailUrl: newThumbnailUrl,
        _existingImageUrl: selectedProduct.imageUrl,
        _existingThumbnailUrl: (selectedProduct as any).thumbnailUrl
      });
    } else {
      createProductMutation.mutate({
        ...data,
        _imageUrl: newImageUrl,
        _thumbnailUrl: newThumbnailUrl
      });
    }
  };

  const handleCouponSubmit = (data: DiscountCouponFormData) => {
    if (selectedCoupon) {
      console.log('[COUPON SUBMIT] selectedCoupon:', selectedCoupon);
      console.log('[COUPON SUBMIT] selectedCoupon.id:', selectedCoupon.id);
      if (!selectedCoupon.id) {
        alert('Error: Coupon ID is missing. Please close the dialog and try editing again.');
        return;
      }
      updateCouponMutation.mutate({ ...data, id: selectedCoupon.id });
    } else {
      createCouponMutation.mutate(data);
    }
  };

  // Header actions
  const handleExportProducts = () => {
    window.open('/api/vouchers/products.csv', '_blank');
  };
  const handleExportSales = () => {
    window.open('/api/vouchers/sales.csv', '_blank');
  };
  
  // Sync sales from Stripe
  const handleSyncStripe = async () => {
    if (isSyncingStripe) return;
    if (!confirm('Sync voucher sales from Stripe? This will import any missing sales from the last 90 days.')) return;
    setIsSyncingStripe(true);
    try {
      const response = await fetch('/api/vouchers/sync-stripe', {
        method: 'POST',
        headers: withAdminJsonHeaders()
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/sales'] });
      alert(`Stripe sync complete!\n\n✅ Synced: ${result.synced}\n⏭️ Skipped (already exists): ${result.skipped}\n📊 Total checked: ${result.total}${result.errors ? `\n\n⚠️ Errors:\n${result.errors.join('\n')}` : ''}`);
    } catch (err: any) {
      console.error('[STRIPE SYNC] Error:', err);
      alert('Sync failed: ' + (err?.message || String(err)));
    } finally {
      setIsSyncingStripe(false);
    }
  };

  // Backfill "Unknown Product" sales by re-reading their Stripe checkout session.
  const [isResolvingProducts, setIsResolvingProducts] = useState(false);
  const handleResolveProducts = async () => {
    if (isResolvingProducts) return;
    if (!confirm('Look up the product for sales showing "Unknown Product" by re-reading their Stripe checkout? This only fills in missing product names.')) return;
    setIsResolvingProducts(true);
    try {
      const response = await fetch('/api/vouchers/sales/resolve-products', {
        method: 'POST',
        headers: withAdminJsonHeaders(),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Resolve failed');
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/sales'] });
      alert(`Product lookup complete!\n\n✅ Resolved: ${result.resolved}\n   • linked to a catalogue product: ${result.linked}\n   • named from Stripe: ${result.named}\n⏭️ Checked: ${result.checked}${result.failed ? `\n⚠️ Couldn't resolve: ${result.failed}` : ''}`);
    } catch (err: any) {
      console.error('[RESOLVE PRODUCTS] Error:', err);
      alert('Product lookup failed: ' + (err?.message || String(err)));
    } finally {
      setIsResolvingProducts(false);
    }
  };

  // Create CRM client from voucher sale
  const handleCreateClientFromSale = async (sale: VoucherSale) => {
    const purchaserName = sale.purchaserName || 'this customer';
    if (!confirm(`Add "${purchaserName}" to your client database?`)) return;
    try {
      const response = await fetch(`/api/vouchers/sales/${sale.id}/create-client`, {
        method: 'POST',
        headers: withAdminJsonHeaders()
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create client');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/sales'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/clients'] });
      if (result.isNew) {
        alert(`✅ Client "${result.client.firstName} ${result.client.lastName}" created successfully!\n\nThey have been added to your CRM with their billing details and purchase history.`);
      } else {
        alert(`ℹ️ "${result.client.first_name} ${result.client.last_name}" is already in your client database.\n\nThe voucher sale has been linked to their existing record.`);
      }
    } catch (err: any) {
      console.error('[CREATE CLIENT] Error:', err);
      alert('Failed to add client: ' + (err?.message || String(err)));
    }
  };

  const handleOpenSettings = () => {
    setIsSettingsDialogOpen(true);
  };
  const handleShowAnalytics = () => {
    setIsAnalyticsDialogOpen(true);
    setTimeout(() => refetchCouponAnalytics(), 50);
  };

  // Import family packages (create or update products based on familien page packages)
  const handleImportFamilyPackages = async () => {
    if (isImportingPackages) return;
    if (!confirm('Import Family packages into voucher products? This will create or update three products. Continue?')) return;
    setIsImportingPackages(true);
    try {
      const familyPackages = [
        {
          slug: 'family-basic',
          name: 'Family Basic',
          description: '60 Min Shooting; 1 retuschiertes Portrait digital + Leinwand 40×30 cm; Auswahlgalerie online; Nutzungsrechte privat',
          price: '95',
          validityPeriod: '365',
          category: 'familie',
          sessionType: 'family'
        },
        {
          slug: 'family-premium',
          name: 'Family Premium',
          description: '90 Min Shooting; 5 retuschierte Fotos digital; Leinwand 40×30 cm; Auswahlgalerie & Nutzungsrechte privat',
          price: '195',
          validityPeriod: '365',
          category: 'familie',
          sessionType: 'family'
        },
        {
          slug: 'family-deluxe',
          name: 'Family Deluxe',
          description: '90–120 Min Shooting; 10 retuschierte Fotos digital; Leinwand 60×40 cm; Auswahlgalerie & Nutzungsrechte privat',
          price: '295',
          validityPeriod: '365',
          category: 'familie',
          sessionType: 'family'
        }
      ];

      for (const pkg of familyPackages) {
        // check existing by slug
        const existing = (voucherProducts || []).find(p => (p as any).slug === pkg.slug || (p as any).slug === pkg.name.toLowerCase().replace(/\s+/g, '-'));
        const payload: any = {
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          validityPeriod: parseInt(pkg.validityPeriod, 10) || 365,
          displayOrder: 0,
          isActive: true,
          category: pkg.category,
          sessionType: pkg.sessionType,
          slug: pkg.slug
        };

        if (existing) {
          console.log('[IMPORT] Updating existing product', existing.id, pkg.slug);
          const res = await fetch(`/api/vouchers/products/${existing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...withAdminHeaders() },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Failed to update ${pkg.slug}: ${res.status} ${txt}`);
          }
        } else {
          console.log('[IMPORT] Creating product', pkg.slug);
          const res = await fetch('/api/vouchers/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...withAdminHeaders() },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Failed to create ${pkg.slug}: ${res.status} ${txt}`);
          }
        }
      }

      // Refresh products
      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/products'] });
      alert('Family packages imported/updated successfully.');
    } catch (err: any) {
      console.error('[IMPORT] Error importing family packages', err);
      alert('Import failed: ' + (err?.message || String(err)));
    } finally {
      setIsImportingPackages(false);
    }
  };

  // Import newborn packages (create or update products based on newborn page packages)
  const handleImportNewbornPackages = async () => {
    if (isImportingNewborn) return;
    if (!confirm('Import Newborn packages into voucher products? This will create or update three products. Continue?')) return;
    setIsImportingNewborn(true);
    try {
      const newbornPackages = [
        {
          slug: 'newborn-basic',
          name: 'Newborn Basic',
          description: 'ca. 60 Minuten im Studio; 1 retuschiertes Lieblingsfoto digital; Leinwand 40×30 cm mit demselben Motiv; 1–2 simple Sets',
          price: '95',
          validityPeriod: '365',
          category: 'baby',
          sessionType: 'newborn'
        },
        {
          slug: 'newborn-premium',
          name: 'Newborn Premium',
          description: 'ca. 90 Minuten im Studio; 5 retuschierte Lieblingsfotos digital; Leinwand 40×30 cm; 2–3 Sets (Wraps + Detail-Makros)',
          price: '195',
          validityPeriod: '365',
          category: 'baby',
          sessionType: 'newborn'
        },
        {
          slug: 'newborn-deluxe',
          name: 'Newborn Deluxe',
          description: 'ca. 120 Minuten im Studio; 10 retuschierte Lieblingsfotos digital; Leinwand 60×40 cm; 3–4 Sets inkl. Makro-Details',
          price: '295',
          validityPeriod: '365',
          category: 'baby',
          sessionType: 'newborn'
        }
      ];

      for (const pkg of newbornPackages) {
        const existing = (voucherProducts || []).find(p => (p as any).slug === pkg.slug || (p as any).slug === pkg.name.toLowerCase().replace(/\s+/g, '-'));
        const payload: any = {
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          validityPeriod: parseInt(pkg.validityPeriod, 10) || 365,
          displayOrder: 0,
          isActive: true,
          category: pkg.category,
          sessionType: pkg.sessionType,
          slug: pkg.slug
        };

        if (existing) {
          console.log('[IMPORT NEWBORN] Updating existing product', existing.id, pkg.slug);
          const res = await fetch(`/api/vouchers/products/${existing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...withAdminHeaders() },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Failed to update ${pkg.slug}: ${res.status} ${txt}`);
          }
        } else {
          console.log('[IMPORT NEWBORN] Creating product', pkg.slug);
          const res = await fetch('/api/vouchers/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...withAdminHeaders() },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Failed to create ${pkg.slug}: ${res.status} ${txt}`);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/products'] });
      alert('Newborn packages imported/updated successfully.');
    } catch (err: any) {
      console.error('[IMPORT NEWBORN] Error importing newborn packages', err);
      alert('Import failed: ' + (err?.message || String(err)));
    } finally {
      setIsImportingNewborn(false);
    }
  };

  // Import all known service packages (creates/updates many categories so admin lists match frontend pages)
  const handleImportAllPackages = async () => {
    if (isImportingAll) return;
    if (!confirm('Import all service packages into voucher products? This will create or update many products. Continue?')) return;
    setIsImportingAll(true);
    try {
      const allPackages = [
        // Familien
        { slug: 'family-basic', name: 'Family Basic', description: '60 Min Shooting; 1 retuschiertes Portrait digital + Leinwand 40×30 cm; Auswahlgalerie online; Nutzungsrechte privat', price: '95', validityPeriod: '365', category: 'familie', sessionType: 'family' },
        { slug: 'family-premium', name: 'Family Premium', description: '90 Min Shooting; 5 retuschierte Fotos digital; Leinwand 40×30 cm; Auswahlgalerie & Nutzungsrechte privat', price: '195', validityPeriod: '365', category: 'familie', sessionType: 'family' },
        { slug: 'family-deluxe', name: 'Family Deluxe', description: '90–120 Min Shooting; 10 retuschierte Fotos digital; Leinwand 60×40 cm; Auswahlgalerie & Nutzungsrechte privat', price: '295', validityPeriod: '365', category: 'familie', sessionType: 'family' },
        // Newborn / Baby
        { slug: 'newborn-basic', name: 'Newborn Basic', description: 'ca. 60 Minuten im Studio; 1 retuschiertes Lieblingsfoto digital; Leinwand 40×30 cm', price: '95', validityPeriod: '365', category: 'baby', sessionType: 'newborn' },
        { slug: 'newborn-premium', name: 'Newborn Premium', description: 'ca. 90 Minuten im Studio; 5 retuschierte Lieblingsfotos digital; Leinwand 40×30 cm', price: '195', validityPeriod: '365', category: 'baby', sessionType: 'newborn' },
        { slug: 'newborn-deluxe', name: 'Newborn Deluxe', description: 'ca. 120 Minuten im Studio; 10 retuschierte Lieblingsfotos digital; Leinwand 60×40 cm', price: '295', validityPeriod: '365', category: 'baby', sessionType: 'newborn' },
        { slug: 'baby-3-12-basic', name: 'Baby 3-12 Months Basic', description: 'Süße Babyfotos (3-12 Monate); 30 Minuten; 1 retuschiertes Foto', price: '75', validityPeriod: '365', category: 'baby', sessionType: 'baby-3-12' },
        // Schwangerschaft
        { slug: 'maternity-basic', name: 'Schwangerschaft Basic', description: 'Maternity Fotoshooting; 60 Minuten; 1 retuschiertes Foto', price: '95', validityPeriod: '365', category: 'schwangerschaft', sessionType: 'maternity' },
        // Business & Team
        { slug: 'business-portrait-basic', name: 'Business Portrait Basic', description: 'Business-Headshot; 30 Minuten; 1 retuschiertes Foto suitable for LinkedIn', price: '69', validityPeriod: '365', category: 'business', sessionType: 'business' },
        { slug: 'business-team-basic', name: 'Team & Mitarbeiterfotos', description: 'Team- & Mitarbeiterfotos; Paketpreise by headcount; In-Studio or Onsite options', price: '299', validityPeriod: '365', category: 'business', sessionType: 'team' },
        { slug: 'bewerbung-linkedin', name: 'Bewerbungsfotos & LinkedIn', description: 'Bewerbungsfotos Paket inkl. 2 retuschierte Bilder für Bewerbungen & LinkedIn', price: '129', validityPeriod: '365', category: 'business', sessionType: 'bewerbung' },
        // Portrait & Studio
        { slug: 'portrait-basic', name: 'Portraitfotografie Basic', description: 'Portraitsession im Studio; 30-45 Minuten; 1 retuschiertes Foto', price: '89', validityPeriod: '365', category: 'portrait', sessionType: 'portrait' },
        { slug: 'studio-basic', name: 'Studio-Fotografie Basic', description: 'Studio-Miete inkl. Fotosession; perfekte Option für Produkt- oder Portraitaufnahmen', price: '149', validityPeriod: '365', category: 'studio', sessionType: 'studio' },
        // Produkt & Immobilien
        { slug: 'product-photography', name: 'Produktfotografie', description: 'Produktfotografie Basic — 5 retuschierte Bilder, ideal für Shops & Social', price: '199', validityPeriod: '365', category: 'product', sessionType: 'product' },
        { slug: 'real-estate-photography', name: 'Immobilienfotografie', description: 'Immobilienfotos Paket für Wohnungen & Häuser — Innen und Exterieur', price: '249', validityPeriod: '365', category: 'real-estate', sessionType: 'realestate' },
        // Hochzeit & Event
        { slug: 'wedding-basic', name: 'Hochzeitsfotografie Basic', description: 'Hochzeitsbegleitung (Auszug) inkl. 30 bearbeiteter Fotos', price: '599', validityPeriod: '365', category: 'hochzeit', sessionType: 'hochzeit' },
        { slug: 'event-basic', name: 'Eventfotografie', description: 'Eventfotografie Paket — Kurzauftrag inkl. 30 bearbeiteter Fotos', price: '449', validityPeriod: '365', category: 'event', sessionType: 'event' }
      ];

      for (const pkg of allPackages) {
        const existing = (voucherProducts || []).find(p => (p as any).slug === pkg.slug || (p as any).slug === pkg.name.toLowerCase().replace(/\s+/g, '-'));
        const payload: any = {
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          validityPeriod: parseInt(pkg.validityPeriod, 10) || 365,
          displayOrder: 0,
          isActive: true,
          category: pkg.category,
          sessionType: pkg.sessionType,
          slug: pkg.slug
        };

        if (existing) {
          const res = await fetch(`/api/vouchers/products/${existing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...withAdminHeaders() },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Failed to update ${pkg.slug}: ${res.status} ${txt}`);
          }
        } else {
          const res = await fetch('/api/vouchers/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...withAdminHeaders() },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Failed to create ${pkg.slug}: ${res.status} ${txt}`);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/vouchers/products'] });
      alert('All service packages imported/updated successfully.');
    } catch (err: any) {
      console.error('[IMPORT ALL] Error importing packages', err);
      alert('Import failed: ' + (err?.message || String(err)));
    } finally {
      setIsImportingAll(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        {/* Page Header - Galleries style */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Online Voucher Sales</h1>
          </div>
          {/* Action bar — solid, clearly-clickable buttons. Wraps instead of
              cramming, and labels never break mid-word. */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" onClick={handleExportProducts}
              className="whitespace-nowrap bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-400 shadow-sm">
              <Download className="h-4 w-4 mr-1.5" />
              Export Products
            </Button>
            <Button size="sm" onClick={handleExportSales}
              className="whitespace-nowrap bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-400 shadow-sm">
              <Download className="h-4 w-4 mr-1.5" />
              Export Sales
            </Button>
            <Button size="sm" onClick={handleSyncStripe} disabled={isSyncingStripe}
              className="whitespace-nowrap bg-purple-600 text-white hover:bg-purple-700 border border-transparent shadow-sm disabled:opacity-60">
              {isSyncingStripe ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1.5" />}
              {isSyncingStripe ? 'Syncing…' : 'Sync from Stripe'}
            </Button>
            <Button size="sm" onClick={handleResolveProducts} disabled={isResolvingProducts}
              className="whitespace-nowrap bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 shadow-sm disabled:opacity-60"
              title='Look up the product for sales showing "Unknown Product"'>
              {isResolvingProducts ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Package className="h-4 w-4 mr-1.5" />}
              {isResolvingProducts ? 'Resolving…' : 'Resolve products'}
            </Button>
            <Button size="sm" onClick={handleImportFamilyPackages} disabled={isImportingPackages}
              className="whitespace-nowrap bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm disabled:opacity-60">
              {isImportingPackages ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Users className="h-4 w-4 mr-1.5" />}
              {isImportingPackages ? 'Importing…' : 'Import Family Packages'}
            </Button>
            <Button size="sm" onClick={handleImportNewbornPackages} disabled={isImportingNewborn}
              className="whitespace-nowrap bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm disabled:opacity-60">
              {isImportingNewborn ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Baby className="h-4 w-4 mr-1.5" />}
              {isImportingNewborn ? 'Importing…' : 'Import Newborn Packages'}
            </Button>
            <Button size="sm" onClick={() => handleImportAllPackages()} disabled={isImportingAll}
              className="whitespace-nowrap bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm disabled:opacity-60">
              {isImportingAll ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Package className="h-4 w-4 mr-1.5" />}
              {isImportingAll ? 'Importing…' : 'Import All Packages'}
            </Button>
            <Button size="sm" onClick={handleShowAnalytics}
              className="whitespace-nowrap bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-400 shadow-sm">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Analytics
            </Button>
            <Button size="sm" onClick={handleOpenSettings}
              className="whitespace-nowrap bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 hover:border-gray-400 shadow-sm">
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Button>
          </div>
        </div>

        {/* Navigation Tabs - Cleaner style */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-1 px-4" aria-label="Voucher Management">
              <button
                onClick={() => setActiveView("dashboard")}
                className={`py-3 px-4 text-sm font-medium transition-colors rounded-t-lg ${
                  activeView === "dashboard"
                    ? "bg-teal-50 text-teal-700 border-b-2 border-teal-500"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard
                </div>
              </button>
              <button
                onClick={() => setActiveView("products")}
                className={`py-3 px-4 text-sm font-medium transition-colors rounded-t-lg ${
                  activeView === "products"
                    ? "bg-teal-50 text-teal-700 border-b-2 border-teal-500"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Products ({stats.activeProducts})
                </div>
              </button>
              <button
                onClick={() => setActiveView("coupons")}
                className={`py-3 px-4 text-sm font-medium transition-colors rounded-t-lg ${
                  activeView === "coupons"
                    ? "bg-teal-50 text-teal-700 border-b-2 border-teal-500"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Coupons ({stats.activeCoupons})
                </div>
              </button>
              <button
                onClick={() => setActiveView("sales")}
                className={`py-3 px-4 text-sm font-medium transition-colors rounded-t-lg ${
                  activeView === "sales"
                    ? "bg-teal-50 text-teal-700 border-b-2 border-teal-500"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Sales ({stats.totalSales})
                </div>
              </button>
              <button
                onClick={() => setActiveView("templates")}
                className={`py-3 px-4 text-sm font-medium transition-colors rounded-t-lg ${
                  activeView === "templates"
                    ? "bg-teal-50 text-teal-700 border-b-2 border-teal-500"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <Palette className="h-4 w-4 mr-2" />
                  Templates
                </div>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 bg-white">
            {activeView === "dashboard" && (
              <DashboardView 
                stats={stats} 
                onCreateProduct={handleCreateProduct}
                onCreateCoupon={handleCreateCoupon}
                onAiGenerate={() => { setAiDraft(null); setAiError(null); setIsAiDialogOpen(true); }}
                recentSales={voucherSales?.slice(0, 5) || []}
                onShowAnalytics={handleShowAnalytics}
                onShowSettings={handleOpenSettings}
                onCreateClient={handleCreateClientFromSale}
              />
            )}
            {activeView === "products" && (
              <ProductsView 
                products={voucherProducts || []} 
                isLoading={isLoadingProducts}
                onCreateProduct={handleCreateProduct}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
                tempImageMap={tempImageMap}
                onPreviewProduct={(p: any) => { setPreviewProductData(p); setIsPreviewOpen(true); }}
              />
            )}
            {activeView === "coupons" && (
              <CouponsView 
                coupons={discountCoupons || []} 
                isLoading={isLoadingCoupons}
                onCreateCoupon={handleCreateCoupon}
                onEditCoupon={handleEditCoupon}
              />
            )}
            {activeView === "sales" && (
              <SalesView 
                sales={voucherSales || []} 
                isLoading={isLoadingSales}
                onCreateClient={handleCreateClientFromSale}
              />
            )}
            {activeView === "templates" && (
              <TemplatesView />
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {/* AI voucher drafting — review, then push into the create form */}
      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Create a high-converting voucher with AI
            </DialogTitle>
            <DialogDescription>
              Describe the voucher in a sentence. Nothing is saved until you review the draft and submit the form.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">What is this voucher for?</Label>
              <Textarea
                value={aiBrief}
                onChange={(e) => setAiBrief(e.target.value)}
                rows={3}
                placeholder="e.g. Familienshooting im Studio, 60 Minuten, ideal als Weihnachtsgeschenk, inkl. 10 bearbeitete Bilder"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Target price ({currency}, optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={aiTargetPrice}
                  onChange={(e) => setAiTargetPrice(e.target.value)}
                  placeholder="e.g. 225"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Language</Label>
                <select
                  value={aiLanguage}
                  onChange={(e) => setAiLanguage(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="de">German</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiBrief.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              {aiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-2" /> {aiDraft ? 'Regenerate draft' : 'Generate draft'}</>}
            </Button>
            {aiLoading && (
              <div className="h-1.5 w-full overflow-hidden rounded bg-violet-100">
                <div className="h-full w-full bg-violet-600 animate-pulse" />
              </div>
            )}
            {aiError && <p className="text-sm text-red-600">{aiError}</p>}

            {aiDraft && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Draft — review before saving</p>
                <div>
                  <p className="text-lg font-bold text-gray-900">{aiDraft.name}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{aiDraft.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {aiDraft.price && <span className="px-2 py-1 rounded bg-white border font-semibold">{formatPrice(aiDraft.price)}</span>}
                  {aiDraft.originalPrice && <span className="px-2 py-1 rounded bg-white border line-through text-gray-500">{formatPrice(aiDraft.originalPrice)}</span>}
                  {aiDraft.badge && <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-medium">{aiDraft.badge}</span>}
                  {aiDraft.sessionDuration && <span className="px-2 py-1 rounded bg-white border">{aiDraft.sessionDuration} min</span>}
                  {aiDraft.validityPeriod && <span className="px-2 py-1 rounded bg-white border">valid {aiDraft.validityPeriod} days</span>}
                  {aiDraft.category && <span className="px-2 py-1 rounded bg-white border">{aiDraft.category}</span>}
                </div>
                {aiDraft.detailedDescription && (
                  <p className="text-sm text-gray-700 whitespace-pre-line">{aiDraft.detailedDescription}</p>
                )}
                {aiDraft.redemptionInstructions && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600">How to redeem</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{aiDraft.redemptionInstructions}</p>
                  </div>
                )}
                {aiDraft.termsAndConditions && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600">Terms</p>
                    <p className="text-xs text-gray-600 whitespace-pre-line">{aiDraft.termsAndConditions}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAiDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUseAiDraft}
              disabled={!aiDraft}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Use this draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductDialog
        key={selectedProduct?.id || 'new'}
        open={isProductDialogOpen}
        onOpenChange={setIsProductDialogOpen}
        product={selectedProduct}
        onSubmit={handleProductSubmit}
        form={productForm}
        uploadedImage={uploadedImage}
        onImageUpload={handleImageUpload}
        isUploading={isUploading}
        onPreview={(p: any) => { setPreviewProductData(p); setIsPreviewOpen(true); }}
      />
      <CouponDialog 
        open={isCouponDialogOpen}
        onOpenChange={setIsCouponDialogOpen}
        coupon={selectedCoupon}
        onSubmit={handleCouponSubmit}
        form={couponForm}
      />
      <AnalyticsDialog
        open={isAnalyticsDialogOpen}
        onOpenChange={(o) => { setIsAnalyticsDialogOpen(o); if (o) refetchCouponAnalytics(); }}
        analytics={couponAnalytics || []}
      />
      <SettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={(o) => { setIsSettingsDialogOpen(o); if (o) refetchVoucherSettings(); }}
        settings={voucherSettings}
        onSave={(payload) => saveSettingsMutation.mutate(payload)}
        saving={saveSettingsMutation.isPending}
      />
      <PreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} product={previewProductData} />
    </AdminLayout>
  );
}

// Preview Dialog - read-only preview of product (unsaved or saved)
const PreviewDialog: React.FC<{ open: boolean; onOpenChange: (b: boolean) => void; product: any; }> = ({ open, onOpenChange, product }) => {
  // Hook first: it must run on every render, including the no-product one below.
  const { format: formatPrice } = useStudioCurrency();
  if (!product) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Product Preview</DialogTitle>
            <DialogDescription>Preview how the voucher will appear to customers</DialogDescription>
          </DialogHeader>
          <div className="p-4">
            {product.imageUrl ? (
              <div className="w-full h-64 overflow-hidden mb-4">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-100 flex items-center justify-center mb-4 text-gray-400">No Image</div>
            )}
            <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
            <div className="text-green-600 font-bold mb-4">{formatPrice(product.price)}</div>
            <p className="text-gray-700 whitespace-pre-wrap mb-4">{product.description}</p>
            <div className="flex justify-end space-x-3">
              {product.slug && typeof product.slug === 'string' ? (
                <Button onClick={() => window.open(`/gutschein/${product.slug}`, '_blank')}>Open Public Page</Button>
              ) : (
                <Button disabled>Open Public Page</Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

// Dashboard View Component
const DashboardView: React.FC<{
  stats: any;
  onCreateProduct: () => void;
  onCreateCoupon: () => void;
  onAiGenerate: () => void;
  recentSales: VoucherSale[];
  onShowAnalytics?: () => void;
  onShowSettings?: () => void;
  onCreateClient?: (sale: VoucherSale) => void;
}> = ({ stats, onCreateProduct, onCreateCoupon, onAiGenerate, recentSales, onShowAnalytics, onShowSettings, onCreateClient }) => {
  const { format: formatPrice } = useStudioCurrency();
  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-blue-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
            <p className="text-xs text-blue-100">From {stats.totalSales} sales</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Active Products</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.activeProducts}</div>
            <p className="text-xs text-gray-600">Available for sale</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Active Coupons</CardTitle>
            <Tag className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.activeCoupons}</div>
            <p className="text-xs text-gray-600">Currently valid</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatPrice(stats.avgOrderValue)}</div>
            <p className="text-xs text-gray-600">Per voucher sale</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-purple-200 hover:border-purple-400 transition-colors">
          <CardHeader>
            <CardTitle>Coupon Analytics</CardTitle>
            <CardDescription>Usage & performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onShowAnalytics} className="bg-purple-600 hover:bg-purple-700 text-white w-full">
              View Analytics
            </Button>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 hover:border-gray-400 transition-colors">
          <CardHeader>
            <CardTitle>Voucher Settings</CardTitle>
            <CardDescription>Defaults & image options</CardDescription>
          </CardHeader>
            <CardContent>
              <Button onClick={onShowSettings} variant="outline" className="w-full">
                Open Settings
              </Button>
            </CardContent>
        </Card>
      </div>

      {/* AI drafting — write a high-converting voucher from a one-line brief */}
      <Card className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-300">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-gray-900">Create a high-converting voucher with AI</CardTitle>
              <CardDescription className="text-gray-700">
                Describe the voucher in one line — AI drafts the name, benefit-led copy, price anchor,
                validity, redemption steps, terms and SEO. You review everything before it&apos;s saved.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={onAiGenerate} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate voucher with AI
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="cursor-pointer" onClick={onCreateProduct}>
          <Card className="bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 transition-colors hover:bg-blue-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-gray-900">Create New Voucher Product</CardTitle>
            <CardDescription className="text-gray-700">
              Set up a new photography voucher package for customers to purchase
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={onCreateProduct} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Voucher Product
            </Button>
          </CardContent>
        </Card>
        </div>

        <div className="cursor-pointer" onClick={onCreateCoupon}>
          <Card className="bg-white border-2 border-dashed border-purple-300 hover:border-purple-500 transition-colors hover:bg-purple-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Tag className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle className="text-gray-900">Create Discount Coupon</CardTitle>
            <CardDescription className="text-gray-700">
              Generate promotional codes for special offers and campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={onCreateCoupon} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create Discount Coupon
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>Latest voucher purchases from customers</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSales.length > 0 ? (
            <div className="space-y-4">
              {recentSales.map((sale) => {
                const saleData = sale as any;
                const couponUsed = saleData.coupon_code || sale.couponCode;
                return (
                  <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Gift className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{sale.purchaserName}</p>
                        <p className="text-sm text-gray-500">{sale.voucherCode}</p>
                        {couponUsed && (
                          <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200 text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {couponUsed}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(Number(sale.finalAmount))}</p>
                        <p className="text-sm text-gray-500">{new Date(sale.createdAt).toLocaleDateString()}</p>
                      </div>
                      {(sale as any).clientId ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          In CRM
                        </Badge>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onCreateClient?.(sale)}
                          className="text-xs"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add to Clients
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No sales yet. Create voucher products to start selling.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Products View Component - Table Layout (matches Galleries page style)
const ProductsView: React.FC<{
  products: VoucherProduct[];
  isLoading: boolean;
  onCreateProduct: () => void;
  onEditProduct: (product: VoucherProduct) => void;
  onDeleteProduct: (product: VoucherProduct) => void;
  tempImageMap?: Record<string, string>;
  onPreviewProduct?: (product: any) => void;
}> = ({ products, isLoading, onCreateProduct, onEditProduct, onDeleteProduct, tempImageMap, onPreviewProduct }) => {
  const { format: formatPrice } = useStudioCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const isActive = product.isActive !== false && (product as any).is_active !== false;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && isActive) || 
      (statusFilter === 'inactive' && !isActive);
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border">
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4">
              <div className="h-12 w-12 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and actions - matches Galleries style */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <Button onClick={onCreateProduct} className="bg-teal-500 hover:bg-teal-600 text-white">
            ADD NEW
          </Button>
        </div>
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          {/* Filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Products</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">NAME</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">PRICE</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">CATEGORY</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">VALIDITY</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const thumb = (product as any).thumbnailUrl || (product as any).thumbnail_url;
                const imgUrl = product.imageUrl || (product as any).image_url;
                const overrideImage = tempImageMap ? (tempImageMap[product.id] || tempImageMap['new']) : undefined;
                const imageSrc = overrideImage || imgUrl || thumb;
                const hasUnsavedImage = overrideImage && overrideImage !== imgUrl;
                const isActive = product.isActive !== false && (product as any).is_active !== false;
                const validityMonths = product.validityPeriod || (product as any).validity_period 
                  ? Math.floor((product.validityPeriod || (product as any).validity_period) / 30) 
                  : 12;

                return (
                  <tr key={product.id} className={`hover:bg-gray-50 ${hasUnsavedImage ? 'bg-yellow-50' : ''}`}>
                    <td className="py-3 px-4">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {/* Thumbnail */}
                        <div className="h-12 w-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                          {imageSrc ? (
                            <img 
                              src={imageSrc} 
                              alt={product.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        {/* Name and description */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 truncate">{product.name}</span>
                            {(product as any).badge && (
                              <span className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                                {(product as any).badge === 'BESTSELLER' ? '⭐ Best Seller' :
                                 (product as any).badge === 'TOP_SELLER' ? '🔥 Top Seller' :
                                 (product as any).badge === 'NEW' ? '✨ New' :
                                 (product as any).badge === 'POPULAR' ? '❤️ Popular' :
                                 (product as any).badge === 'LIMITED' ? '⏳ Limited' :
                                 (product as any).badge === 'SALE' ? '💰 Sale' :
                                 (product as any).badge === 'RECOMMENDED' ? '👍 Recommended' :
                                 (product as any).badge === 'GIFT_IDEA' ? '🎁 Gift Idea' :
                                 (product as any).badge === 'SEASONAL' ? '🌸 Seasonal' :
                                 (product as any).badge}
                              </span>
                            )}
                            {hasUnsavedImage && (
                              <span className="text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded">Unsaved</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {product.description?.substring(0, 50)}{product.description && product.description.length > 50 ? '...' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900">{formatPrice(product.price)}</span>
                      {product.originalPrice && parseFloat(String(product.originalPrice)) > parseFloat(String(product.price)) && (
                        <span className="text-xs text-gray-400 line-through ml-2">{formatPrice(product.originalPrice)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600 capitalize">{product.category || '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{validityMonths} months</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => onEditProduct(product)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            const hasTemp = tempImageMap && (tempImageMap[product.id] || tempImageMap['new']);
                            if (hasTemp && onPreviewProduct) {
                              onPreviewProduct({ ...product, imageUrl: hasTemp });
                              return;
                            }
                            window.open(`/gutschein/${product.slug || product.id}`, '_blank');
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(product)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No products match your search criteria' 
                      : 'No voucher products yet'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button onClick={onCreateProduct} className="mt-4 bg-teal-500 hover:bg-teal-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Product
                    </Button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      {filteredProducts.length > 0 && (
        <div className="text-sm text-gray-500">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      )}
    </div>
  );
};

// Coupons View Component  
const CouponsView: React.FC<{
  coupons: DiscountCoupon[];
  isLoading: boolean;
  onCreateCoupon: () => void;
  onEditCoupon: (coupon: DiscountCoupon) => void;
}> = ({ coupons, isLoading, onCreateCoupon, onEditCoupon }) => {
  const { format: formatPrice } = useStudioCurrency();
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Coupon Management</h2>
          <p className="text-gray-600">Create and manage promotional discount codes</p>
        </div>
        <Button onClick={onCreateCoupon}>
          <Plus className="h-4 w-4 mr-2" />
          Add Coupon
        </Button>
      </div>

      {coupons.length > 0 ? (
        <div className="space-y-4">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <code className="bg-gray-100 px-3 py-1 rounded text-lg font-mono font-bold">
                        {coupon.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(coupon.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg">{coupon.name}</CardTitle>
                    <CardDescription>{coupon.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge variant={coupon.isActive ? "default" : "secondary"} className="mb-2">
                      {coupon.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <div className="text-sm text-gray-600">
                      Used: {(coupon as any).usageCount || 0} / {coupon.usageLimit || "∞"}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm mb-4">
                  <div className="flex items-center space-x-1">
                    <Percent className="h-4 w-4 text-gray-400" />
                    <span>
                      {coupon.discountType === 'percentage' 
                        ? `${coupon.discountValue}% off`
                        : `${formatPrice(coupon.discountValue)} off`
                      }
                    </span>
                  </div>
                  {coupon.minOrderAmount && (
                    <div className="flex items-center space-x-1">
                      <Banknote className="h-4 w-4 text-gray-400" />
                      <span>Min: {formatPrice(coupon.minOrderAmount)}</span>
                    </div>
                  )}
                  {coupon.endDate && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Expires: {new Date(coupon.endDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditCoupon(coupon)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No discount coupons yet</h3>
            <p className="text-gray-600 mb-6">Create promotional codes to offer discounts to your customers</p>
            <Button onClick={onCreateCoupon}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Coupon
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Sales View Component
const SalesView: React.FC<{
  sales: VoucherSale[];
  isLoading: boolean;
  onCreateClient?: (sale: VoucherSale) => void;
}> = ({ sales, isLoading, onCreateClient }) => {
  const { format: formatPrice } = useStudioCurrency();
  const [showExportMenu, setShowExportMenu] = useState(false);
  // Sale selected for the "view purchase" detail modal (null = closed).
  const [viewSale, setViewSale] = useState<any | null>(null);

  // Build the download URL for a sale's voucher PDF, in priority order:
  //   1. The EXACT PDF persisted to S3 at purchase time (pdf_url) — byte-for-byte the file the
  //      customer downloaded from the frontend, including their chosen photo.
  //   2. Regenerate the exact voucher from the Stripe session (resolves product + inclusions).
  //   3. A live preview render carrying the sale's stored image/message as a last resort.
  const buildPdfUrl = (sale: any): string => {
    const productName = sale.product_name || 'Unknown Product';
    const storedPdfUrl = sale.pdfUrl || sale.pdf_url;
    const sessionId = sale.stripe_session_id;
    const customImg = sale.customImage || sale.custom_image || '';
    const designImg = sale.designImage || sale.design_image || '';
    const productSlug = sale.product_slug || sale.product_sku || 'demo';
    const productDesc = sale.product_description || '';
    const previewUrl =
      `/voucher/pdf/preview?` +
      `sku=${encodeURIComponent(productSlug)}&` +
      `name=${encodeURIComponent(sale.recipientName || sale.purchaserName)}&` +
      `from=${encodeURIComponent(sale.purchaserName)}&` +
      `message=${encodeURIComponent(sale.giftMessage || 'Thank you for your purchase!')}&` +
      `amount=${sale.finalAmount}&` +
      `voucher_id=${encodeURIComponent(sale.voucherCode)}&` +
      `custom_image=${encodeURIComponent(customImg)}&` +
      `design_image=${encodeURIComponent(designImg)}` +
      (productName && productName !== 'Unknown Product' ? `&title=${encodeURIComponent(productName)}` : '') +
      (productDesc ? `&product_description=${encodeURIComponent(productDesc)}` : '');
    return storedPdfUrl
      ? storedPdfUrl
      : (sessionId ? `/voucher/pdf?session_id=${encodeURIComponent(sessionId)}` : previewUrl);
  };

  const exportToCSV = () => {
    if (sales.length === 0) return;
    
    // Create CSV content
    const headers = ['Voucher Code', 'Product', 'Purchaser Name', 'Purchaser Email', 'Recipient Name', 'Recipient Email', 'Gift Message', 'Original Amount', 'Discount', 'Final Amount', 'Coupon Used', 'Status', 'Date'];
    const rows = sales.map((sale: any) => [
      sale.voucherCode || '',
      sale.product_name || 'Unknown Product',
      sale.purchaserName || '',
      sale.purchaserEmail || '',
      sale.recipientName || '',
      sale.recipientEmail || '',
      sale.giftMessage || '',
      Number(sale.originalAmount || 0).toFixed(2),
      Number(sale.discountAmount || 0).toFixed(2),
      Number(sale.finalAmount || 0).toFixed(2),
      sale.coupon_code || sale.couponCode || '',
      sale.paymentStatus || 'pending',
      new Date(sale.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `voucher-sales-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    if (sales.length === 0) return;
    
    // Create a printable HTML report
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Voucher Sales Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #666; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #f4f4f4; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .summary { margin: 20px 0; padding: 15px; background: #f0f0f0; border-radius: 5px; }
          .summary-item { display: inline-block; margin-right: 30px; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Voucher Sales Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <div class="summary-item"><strong>Total Sales:</strong> ${sales.length}</div>
          <div class="summary-item"><strong>Total Revenue:</strong> ${formatPrice(sales.reduce((sum: number, s: any) => sum + Number(s.finalAmount || 0), 0))}</div>
          <div class="summary-item"><strong>Paid:</strong> ${sales.filter((s: any) => s.paymentStatus === 'paid' || s.paymentStatus === 'completed').length}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Voucher Code</th>
              <th>Product</th>
              <th>Purchaser</th>
              <th>Recipient</th>
              <th>Amount</th>
              <th>Coupon</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${sales.map((sale: any) => `
              <tr>
                <td>${sale.voucherCode || ''}</td>
                <td>${sale.product_name || 'Unknown Product'}</td>
                <td>${sale.purchaserName || ''}<br/><small>${sale.purchaserEmail || ''}</small></td>
                <td>${sale.recipientName || 'Self-purchase'}<br/><small>${sale.recipientEmail || ''}</small></td>
                <td>${formatPrice(Number(sale.finalAmount || 0))}</td>
                <td>${sale.coupon_code || sale.couponCode || '-'}</td>
                <td>${sale.paymentStatus || 'pending'}</td>
                <td>${new Date(sale.createdAt).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          ${SITE.name} - Voucher Sales Report<br/>
          ${SITE.url.replace(/^https?:\/\//, '')}
        </div>
      </body>
      </html>
    `;
    
    // Open in new window for printing/PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
    setShowExportMenu(false);
  };

  // Close export menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu) {
        setShowExportMenu(false);
      }
    };
    
    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportMenu]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Sales History</h2>
          <p className="text-gray-600">Track all voucher sales and customer orders</p>
        </div>
        <div className="relative">
          <Button 
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setShowExportMenu(!showExportMenu);
            }}
            disabled={sales.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Sales
          </Button>
          {showExportMenu && (
            <div 
              className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToCSV();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Export as CSV
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToPDF();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Download className="h-4 w-4 inline mr-2" />
                  Export as PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {sales.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Voucher Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchaser
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gift Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Final Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coupon Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale) => {
                    // Type assertion to access extended properties from the JOIN
                    const saleWithProduct = sale as any;
                    const productName = saleWithProduct.product_name || 'Unknown Product';
                    const pdfUrl = buildPdfUrl(saleWithProduct);

                    return (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
                            {sale.voucherCode}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{productName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">{sale.purchaserName}</div>
                            <div className="text-sm text-gray-500">{sale.purchaserEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {sale.recipientName ? (
                            <div>
                              <div className="font-medium text-gray-900">{sale.recipientName}</div>
                              {sale.recipientEmail && (
                                <div className="text-sm text-gray-500">{sale.recipientEmail}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Self-purchase</span>
                          )}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          {sale.giftMessage ? (
                            <div className="text-sm text-gray-900 truncate" title={sale.giftMessage}>
                              "{sale.giftMessage}"
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No message</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {formatPrice(Number(sale.finalAmount))}
                          </div>
                          {sale.discountAmount && Number(sale.discountAmount) > 0 && (
                            <div className="text-xs text-gray-500">
                              ({formatPrice(Number(sale.originalAmount))} - {formatPrice(Number(sale.discountAmount))})
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {saleWithProduct.coupon_code || sale.couponCode ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Tag className="h-3 w-3 mr-1" />
                              {saleWithProduct.coupon_code || sale.couponCode}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 italic text-sm">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={sale.paymentStatus === 'paid' || sale.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                            {sale.paymentStatus || 'pending'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sale.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewSale(saleWithProduct)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(pdfUrl, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                            {saleWithProduct.client_id ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-2 py-1">
                                <Users className="h-3 w-3 mr-1" />
                                In CRM
                              </Badge>
                            ) : onCreateClient && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => onCreateClient(sale)}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Add to Clients
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sales yet</h3>
            <p className="text-gray-600">Voucher sales will appear here once customers start purchasing</p>
          </CardContent>
        </Card>
      )}

      {/* Purchase detail modal — full view of a single sale + download the exact customer PDF */}
      <Dialog open={!!viewSale} onOpenChange={(open) => !open && setViewSale(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewSale && (() => {
            const s = viewSale;
            const productName = s.product_name || 'Unknown Product';
            const heroImg = s.customImage || s.custom_image || s.designImage || s.design_image || '';
            const pdfUrl = buildPdfUrl(s);
            const hasExactPdf = !!(s.pdfUrl || s.pdf_url);
            const row = (label: string, value: React.ReactNode) => (
              <div className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-900 text-right break-words">{value}</span>
              </div>
            );
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Voucher Purchase
                  </DialogTitle>
                  <DialogDescription>
                    <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-xs">{s.voucherCode}</code>
                  </DialogDescription>
                </DialogHeader>

                {heroImg && (
                  <img
                    src={heroImg}
                    alt="Voucher image chosen by customer"
                    className="w-full max-h-56 object-contain rounded-md bg-gray-50 border"
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Product</h4>
                    {row('Product', productName)}
                    {row('Original', formatPrice(Number(s.originalAmount || 0)))}
                    {Number(s.discountAmount || 0) > 0 && row('Discount', `-${formatPrice(Number(s.discountAmount))}`)}
                    {row('Final price', formatPrice(Number(s.finalAmount || 0)))}
                    {(s.coupon_code || s.couponCode) && row('Coupon', s.coupon_code || s.couponCode)}
                    {row('Status', s.paymentStatus || 'pending')}
                    {row('Date', new Date(s.createdAt).toLocaleString())}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Purchaser</h4>
                    {row('Name', s.purchaserName || '—')}
                    {row('Email', s.purchaserEmail || '—')}
                    {s.purchaserPhone && row('Phone', s.purchaserPhone)}
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Recipient</h4>
                    {s.recipientName || s.recipientEmail ? (
                      <>
                        {row('Name', s.recipientName || '—')}
                        {s.recipientEmail && row('Email', s.recipientEmail)}
                      </>
                    ) : (
                      <div className="text-sm text-gray-400 italic py-2">Self-purchase</div>
                    )}
                  </div>
                </div>

                {s.giftMessage && (
                  <div className="mt-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Gift message</h4>
                    <p className="text-sm text-gray-900 italic bg-gray-50 rounded-md p-3 border">"{s.giftMessage}"</p>
                  </div>
                )}

                <DialogFooter className="mt-4 flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    {hasExactPdf
                      ? 'Exact PDF the customer downloaded (stored at purchase).'
                      : 'Regenerated from the original order details.'}
                  </span>
                  <Button onClick={() => window.open(pdfUrl, '_blank')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download voucher PDF
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// TemplatesView Component — Admin CRUD for voucher PDF design templates
const TEMPLATE_CATEGORIES = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'mothers-day', label: "Mother's Day" },
  { value: 'love', label: 'Love / Valentine' },
  { value: 'christmas', label: 'Christmas' },
  { value: 'gratitude', label: 'Gratitude' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'baby', label: 'Baby / Newborn' },
  { value: 'other', label: 'Other' },
];

interface VoucherTemplateAdmin {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  occasion: string;
  isActive: boolean;
  displayOrder: number;
  bannerColor?: string;
  bannerTextColor?: string;
  fontFamily?: string;
  messageFontSize?: number;
  logoUrl?: string | null;
  footerText?: string | null;
  footerEmail?: string | null;
  footerPhone?: string | null;
  termsText?: string | null;
  layoutStyle?: string;
  createdAt?: string;
  updatedAt?: string;
}

const TemplatesView: React.FC = () => {
  const [templates, setTemplates] = useState<VoucherTemplateAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VoucherTemplateAdmin | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: 'birthday', occasion: '', imageUrl: '',
    bannerColor: '#b3202e', bannerTextColor: '#ffffff', fontFamily: 'Helvetica', messageFontSize: 22,
    logoUrl: '', footerText: '', footerEmail: '', footerPhone: '', termsText: '', layoutStyle: 'classic',
  });

  const getAdminToken = () => localStorage.getItem('ADMIN_TOKEN') || '';
  const adminHeaders = () => ({ 'x-admin-token': getAdminToken() });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vouchers/templates', { headers: adminHeaders() });
      if (res.ok) setTemplates(await res.json());
    } catch (e) { console.error('Failed to fetch templates:', e); }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '', category: 'birthday', occasion: '', imageUrl: '',
      bannerColor: '#b3202e', bannerTextColor: '#ffffff', fontFamily: 'Helvetica', messageFontSize: 22,
      logoUrl: '', footerText: '', footerEmail: '', footerPhone: '', termsText: '', layoutStyle: 'classic',
    });
    setDialogOpen(true);
  };

  const openEdit = (t: VoucherTemplateAdmin) => {
    setEditingTemplate(t);
    setFormData({
      name: t.name, category: t.category, occasion: t.occasion, imageUrl: t.imageUrl,
      bannerColor: t.bannerColor || '#b3202e', bannerTextColor: t.bannerTextColor || '#ffffff',
      fontFamily: t.fontFamily || 'Helvetica', messageFontSize: t.messageFontSize ?? 22,
      logoUrl: t.logoUrl || '', footerText: t.footerText || '', footerEmail: t.footerEmail || '',
      footerPhone: t.footerPhone || '', termsText: t.termsText || '', layoutStyle: t.layoutStyle || 'classic',
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/admin/vouchers/templates/upload-image', {
        method: 'POST',
        headers: adminHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (data.url) setFormData(prev => ({ ...prev, imageUrl: data.url }));
    } catch (e) { console.error('Image upload failed:', e); }
    setUploadingImage(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.category || !formData.occasion || !formData.imageUrl) {
      alert('Please fill in all fields and upload an image');
      return;
    }
    setSaving(true);
    try {
      const url = editingTemplate
        ? `/api/admin/vouchers/templates/${editingTemplate.id}`
        : '/api/admin/vouchers/templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchTemplates();
      }
    } catch (e) { console.error('Save failed:', e); }
    setSaving(false);
  };

  const handleToggleActive = async (t: VoucherTemplateAdmin) => {
    try {
      await fetch(`/api/admin/vouchers/templates/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminHeaders() },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      fetchTemplates();
    } catch (e) { console.error('Toggle failed:', e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/vouchers/templates/${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
      setDeleteConfirmId(null);
      fetchTemplates();
    } catch (e) { console.error('Delete failed:', e); }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-32" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Design Templates</h3>
          <p className="text-sm text-gray-500">Manage hero images that customers choose for their voucher PDF</p>
        </div>
        <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p className="text-gray-600 mb-4">Create design templates for voucher PDFs</p>
            <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {templates.map(t => (
            <Card key={t.id} className={`overflow-hidden transition-shadow hover:shadow-md ${!t.isActive ? 'opacity-60' : ''}`}>
              <div className="aspect-[4/3] bg-gray-100 relative">
                <img src={t.imageUrl} alt={t.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                {!t.isActive && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <p className="font-medium text-sm truncate">{t.name}</p>
                <p className="text-xs text-gray-500">{t.occasion}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-xs">{t.category}</Badge>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={t.isActive}
                      onCheckedChange={() => handleToggleActive(t)}
                      className="scale-75"
                    />
                    <button onClick={() => openEdit(t)} className="p-1 text-gray-400 hover:text-teal-600" title="Edit">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirmId(t.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white border-2 shadow-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
              <DialogDescription>Configure the voucher design template and PDF styling</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Birthday Celebration" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Occasion Text</Label>
                <Input value={formData.occasion} onChange={e => setFormData(p => ({ ...p, occasion: e.target.value }))} placeholder="e.g. Happy Birthday" />
              </div>
              <div>
                <Label>Hero Image</Label>
                {formData.imageUrl && (
                  <div className="mb-2 rounded-lg overflow-hidden border">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-40 object-cover" />
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1">
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors ${
                      uploadingImage ? 'border-teal-400 bg-teal-50' : 'border-gray-300'
                    }`}>
                      <Camera className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                      <p className="text-sm text-gray-600">{uploadingImage ? 'Uploading...' : 'Upload Image'}</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} />
                  </label>
                  <div className="flex-1">
                    <Input value={formData.imageUrl} onChange={e => setFormData(p => ({ ...p, imageUrl: e.target.value }))} placeholder="Or paste image URL" className="h-full" />
                  </div>
                </div>
              </div>

              {/* PDF Design Customization Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">PDF Design Settings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Banner Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={formData.bannerColor} onChange={e => setFormData(p => ({ ...p, bannerColor: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                      <Input value={formData.bannerColor} onChange={e => setFormData(p => ({ ...p, bannerColor: e.target.value }))} className="text-xs h-8" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Banner Text Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={formData.bannerTextColor} onChange={e => setFormData(p => ({ ...p, bannerTextColor: e.target.value }))} className="w-8 h-8 rounded border cursor-pointer" />
                      <Input value={formData.bannerTextColor} onChange={e => setFormData(p => ({ ...p, bannerTextColor: e.target.value }))} className="text-xs h-8" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Font Family</Label>
                    <Select value={formData.fontFamily} onValueChange={v => setFormData(p => ({ ...p, fontFamily: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times-Roman">Times Roman</SelectItem>
                        <SelectItem value="Courier">Courier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Message Font Size</Label>
                    <Input type="number" min={12} max={36} value={formData.messageFontSize} onChange={e => setFormData(p => ({ ...p, messageFontSize: parseInt(e.target.value) || 22 }))} className="text-xs h-8" />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Custom Logo URL (leave empty for default)</Label>
                  <Input value={formData.logoUrl} onChange={e => setFormData(p => ({ ...p, logoUrl: e.target.value }))} placeholder="https://..." className="text-xs h-8" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label className="text-xs">Footer Email</Label>
                    <Input value={formData.footerEmail} onChange={e => setFormData(p => ({ ...p, footerEmail: e.target.value }))} placeholder="info@example.com" className="text-xs h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Footer Phone</Label>
                    <Input value={formData.footerPhone} onChange={e => setFormData(p => ({ ...p, footerPhone: e.target.value }))} placeholder="+43 ..." className="text-xs h-8" />
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Footer Text</Label>
                  <Input value={formData.footerText} onChange={e => setFormData(p => ({ ...p, footerText: e.target.value }))} placeholder="Custom footer line" className="text-xs h-8" />
                </div>
                <div className="mt-3">
                  <Label className="text-xs">Custom Terms & Conditions</Label>
                  <textarea value={formData.termsText} onChange={e => setFormData(p => ({ ...p, termsText: e.target.value }))} placeholder="Leave empty for default terms" rows={2} className="w-full text-xs border rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                </div>
              </div>

              {/* Banner Preview */}
              <div className="border rounded-lg p-3 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">Banner Preview</p>
                <div className="rounded" style={{ backgroundColor: formData.bannerColor, padding: '8px 14px' }}>
                  <span style={{ color: formData.bannerTextColor, fontFamily: formData.fontFamily, fontSize: '14px' }}>
                    {formData.occasion || 'Gutschein'}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
                {saving ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={o => { if (!o) setDeleteConfirmId(null); }}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <DialogContent className="sm:max-w-[400px] bg-white border-2 shadow-2xl">
            <DialogHeader>
              <DialogTitle>Delete Template</DialogTitle>
              <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

// Product Dialog Component
const ProductDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: VoucherProduct | null;
  onSubmit: (data: VoucherProductFormData) => void;
  form: any;
  uploadedImage: string | null;
  onImageUpload: (file: File) => void;
  isUploading: boolean;
  onPreview?: (productPreview: any) => void;
}> = ({ open, onOpenChange, product, onSubmit, form, uploadedImage, onImageUpload, isUploading, onPreview }) => {
  const { currency } = useStudioCurrency();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    if (uploadedImage) {
      setImagePreview(uploadedImage);
    } else if (product?.imageUrl) {
      setImagePreview(product.imageUrl);
    } else {
      setImagePreview(null);
    }
  }, [uploadedImage, product, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      setShowCropper(true);
    }
  };

  const handleCropped = async (blob: Blob, previewUrl: string) => {
    setImagePreview(previewUrl);
    setShowCropper(false);
    const file = new File([blob], selectedImage?.name || 'cropped.jpg', { type: 'image/jpeg' });
    setSelectedImage(file);
    await onImageUpload(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{product ? 'Edit Voucher Product' : 'Create New Voucher Product'}</DialogTitle>
            <DialogDescription>
              {product ? 'Update the details of this voucher product including promotional images' : 'Create a new voucher product that customers can purchase with promotional imagery'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Image section with cropper */}
            <div className="space-y-3">
              <Label htmlFor="product-image" className="text-base font-medium">Product Image</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                {showCropper && selectedImage ? (
                  <ImageCropper
                    file={selectedImage}
                    onCancel={() => { setShowCropper(false); setSelectedImage(null); }}
                    onCropped={handleCropped}
                    aspect={4/3}
                  />
                ) : imagePreview ? (
                  <div className="space-y-4">
                    <div className="relative flex justify-center bg-gray-100 rounded-lg p-2">
                      <img src={imagePreview} alt="Product preview" className="max-w-full max-h-48 object-contain rounded-lg" />
                      <button
                        onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >×</button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('product-image')?.click()}
                      className="w-full"
                      disabled={isUploading}
                    >
                      <Camera className="h-4 w-4 mr-2" />{isUploading ? 'Uploading...' : 'Change Image'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Upload a promotional image for this voucher</p>
                      <p className="text-xs text-gray-500">Recommended: 1400px wide. You can crop after selection.</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('product-image')?.click()}
                      className="mt-4"
                      disabled={isUploading}
                    >
                      <Camera className="h-4 w-4 mr-2" />{isUploading ? 'Uploading...' : 'Upload Image'}
                    </Button>
                  </div>
                )}
                <input id="product-image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>
            </div>

            {/* Product Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input {...form.register('name')} placeholder="e.g., Family Photo Session Voucher" className="bg-white" />
                {form.formState.errors.name && <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ({currency})</Label>
                <Input {...form.register('price')} type="number" step="0.01" placeholder="199.00" className="bg-white" onFocus={(e) => e.target.select()} />
                {form.formState.errors.price && <p className="text-sm text-red-600">{form.formState.errors.price.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea {...form.register('description')} placeholder="Describe what's included in this voucher package..." rows={4} className="bg-white resize-none" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validityPeriod">Validity (Days)</Label>
                <Input {...form.register('validityPeriod')} type="number" placeholder="365" className="bg-white" onFocus={(e) => e.target.select()} />
                {form.formState.errors.validityPeriod && <p className="text-sm text-red-600">{form.formState.errors.validityPeriod.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input {...form.register('displayOrder')} type="number" placeholder="1" className="bg-white" />
              </div>
              <div className="space-y-2 flex items-center space-x-2 pt-6">
                <Switch checked={form.watch('isActive')} onCheckedChange={(checked) => form.setValue('isActive', checked)} />
                <Label className="font-medium">Active for sale</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={(value) => form.setValue('category', value)} defaultValue={form.watch('category') || 'familie'}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="familie">Familie</SelectItem>
                    <SelectItem value="baby">Baby & Newborn</SelectItem>
                    <SelectItem value="hochzeit">Hochzeit</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionType">Session Type</Label>
                <Input {...form.register('sessionType')} placeholder="e.g., Familie Portrait, Business Headshots" className="bg-white" />
              </div>
            </div>

            {/* Product Badge */}
            <div className="space-y-2">
              <Label htmlFor="badge">Product Badge</Label>
              <p className="text-xs text-gray-500">Highlight this product with a badge on the storefront</p>
              <Select onValueChange={(value) => form.setValue('badge', value === '__none__' ? '' : value)} value={form.watch('badge') || '__none__'}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="No badge" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Badge</SelectItem>
                  <SelectItem value="BESTSELLER">⭐ Best Seller</SelectItem>
                  <SelectItem value="TOP_SELLER">🔥 Top Seller</SelectItem>
                  <SelectItem value="NEW">✨ New</SelectItem>
                  <SelectItem value="POPULAR">❤️ Popular</SelectItem>
                  <SelectItem value="LIMITED">⏳ Limited Edition</SelectItem>
                  <SelectItem value="SALE">💰 Sale</SelectItem>
                  <SelectItem value="RECOMMENDED">👍 Recommended</SelectItem>
                  <SelectItem value="GIFT_IDEA">🎁 Gift Idea</SelectItem>
                  <SelectItem value="SEASONAL">🌸 Seasonal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="outline"
              onClick={() => {
                try {
                  const vals = form.getValues();
                  const preview = {
                    id: product?.id || 'new',
                    name: vals.name,
                    description: vals.description,
                    price: vals.price,
                    validityPeriod: vals.validityPeriod,
                    displayOrder: vals.displayOrder,
                    isActive: vals.isActive,
                    category: vals.category,
                    sessionType: vals.sessionType,
                    imageUrl: imagePreview || uploadedImage || product?.imageUrl || null,
                    slug: product?.slug || (vals.name ? String(vals.name).toLowerCase().replace(/\s+/g, '-') : undefined),
                  };
                  if (onPreview) onPreview(preview);
                } catch (e) {
                  console.error('Preview error', e);
                  alert('Failed to generate preview');
                }
              }}
            >
              Preview
            </Button>
            <Button 
              onClick={async () => {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🔵 [BUTTON CLICK] Update Product button clicked!');
                console.log('[BUTTON CLICK] Form validation errors:', form.formState.errors);
                console.log('[BUTTON CLICK] Form values:', form.getValues());
                console.log('[BUTTON CLICK] Is form valid?', form.formState.isValid);
                console.log('[BUTTON CLICK] Is submitting?', form.formState.isSubmitting);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                // Show validation errors to user if any
                const errors = form.formState.errors;
                if (Object.keys(errors).length > 0) {
                  const errorMessages = Object.entries(errors)
                    .map(([field, error]: [string, any]) => `${field}: ${error.message}`)
                    .join('\n');
                  alert('Form validation errors:\n\n' + errorMessages);
                  console.error('[BUTTON CLICK] Validation failed:', errors);
                  return;
                }
                
                // Try to submit
                try {
                  await form.handleSubmit(onSubmit)();
                } catch (error) {
                  console.error('[BUTTON CLICK] Submission error:', error);
                  alert('Error submitting form: ' + (error instanceof Error ? error.message : String(error)));
                }
              }} 
              disabled={form.formState.isSubmitting}
            >
              {product ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

// Coupon Dialog Component
const CouponDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: DiscountCoupon | null;
  onSubmit: (data: DiscountCouponFormData) => void;
  form: any;
}> = ({ open, onOpenChange, coupon, onSubmit, form }) => {
  const { currency } = useStudioCurrency();
  const queryClient = useQueryClient();
  const products = queryClient.getQueryData<VoucherProduct[]>(['/api/vouchers/products']) || [];
  // Use a non-empty sentinel value for the "All products" Select item because Radix Select
  // does not accept an empty string as a SelectItem value. We map the sentinel back to
  // an empty string when writing into the form value.
  const selectedApplicable = form.watch('applicableProductSlug') || '__all__';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent className="sm:max-w-[600px] bg-white border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle>
              {coupon ? 'Edit Discount Coupon' : 'Create New Discount Coupon'}
            </DialogTitle>
          <DialogDescription>
            {coupon 
              ? 'Update the details of this discount coupon'
              : 'Create a new discount coupon for promotional campaigns'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code</Label>
              <Input 
                id="code" 
                placeholder="e.g., WELCOME15"
                {...form.register('code')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-name">Coupon Name</Label>
              <Input 
                id="coupon-name" 
                placeholder="e.g., Welcome Discount"
                {...form.register('name')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-description">Description</Label>
            <Textarea 
              id="coupon-description" 
              placeholder="Describe this discount offer..."
              rows={2}
              {...form.register('description')}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount-type">Discount Type</Label>
              <Select 
                value={form.watch('discountType') || 'percentage'}
                onValueChange={(val) => form.setValue('discountType', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount ({currency})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-value">Discount Value</Label>
              <Input 
                id="discount-value" 
                type="text" 
                placeholder="15"
                {...form.register('discountValue')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-order">Min Order ({currency})</Label>
              <Input 
                id="min-order" 
                type="text" 
                placeholder="100"
                {...form.register('minOrderAmount')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={form.watch('startDate') || ''}
                onChange={(e) => form.setValue('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={form.watch('endDate') || ''}
                onChange={(e) => form.setValue('endDate', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Applicable Product (optional)</Label>
            <Select
              value={selectedApplicable}
              onValueChange={(val) => form.setValue('applicableProductSlug', val === '__all__' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All products</SelectItem>
                {products?.map((prod) => (
                  <SelectItem
                    key={prod.id}
                    value={(prod as any).slug || (prod as any).productSlug || prod.id}
                  >
                    {prod.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Leave empty for all products. Select one to restrict the coupon.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usage-limit">Usage Limit</Label>
              <Input 
                id="usage-limit" 
                type="number" 
                placeholder="100"
                {...form.register('usageLimit')}
              />
            </div>
            <div className="space-y-2 flex items-center space-x-2 pt-6">
              <Switch 
                id="coupon-active" 
                checked={!!form.watch('isActive')}
                onCheckedChange={(val) => form.setValue('isActive', val)}
              />
              <Label htmlFor="coupon-active">Active</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {coupon ? 'Update Coupon' : 'Create Coupon'}
          </Button>
        </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

// Analytics Dialog
const AnalyticsDialog: React.FC<{ open: boolean; onOpenChange: (o: boolean) => void; analytics: any[] }> = ({ open, onOpenChange, analytics }) => {
  const { currency, format: formatPrice } = useStudioCurrency();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Coupon Analytics</DialogTitle>
            <DialogDescription>Aggregated usage metrics for discount coupons</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto mt-4">
            {analytics.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left">Code</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-right">Value</th>
                    <th className="p-2 text-right">Usage</th>
                    <th className="p-2 text-right">Total Discount ({currency})</th>
                    <th className="p-2 text-right">Revenue Influenced ({currency})</th>
                    <th className="p-2 text-left">Last Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="p-2 font-mono text-xs">{a.code}</td>
                      <td className="p-2">{a.name}</td>
                      <td className="p-2">{a.discountType}</td>
                      <td className="p-2 text-right">{a.discountType === 'percentage' ? `${a.discountValue}%` : formatPrice(a.discountValue)}</td>
                      <td className="p-2 text-right">{a.usageCount}</td>
                      <td className="p-2 text-right">{a.totalDiscountAmount.toFixed ? a.totalDiscountAmount.toFixed(2) : a.totalDiscountAmount}</td>
                      <td className="p-2 text-right">{a.totalRevenueInfluenced.toFixed ? a.totalRevenueInfluenced.toFixed(2) : a.totalRevenueInfluenced}</td>
                      <td className="p-2 text-xs">{a.lastUsedAt ? new Date(a.lastUsedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-sm">No analytics data yet.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

// Settings Dialog
const SettingsDialog: React.FC<{ open: boolean; onOpenChange: (o: boolean) => void; settings: any; onSave: (p: any) => void; saving: boolean }> = ({ open, onOpenChange, settings, onSave, saving }) => {
  const [localValidity, setLocalValidity] = useState<string>('');
  const [localAspect, setLocalAspect] = useState<string>('');
  const [localQuality, setLocalQuality] = useState<string>('');

  useEffect(() => {
    if (open && settings) {
      setLocalValidity(String(settings.defaultValidityDays ?? 365));
      setLocalAspect(String(settings.defaultAspectRatio ?? '4:3'));
      setLocalQuality(String(settings.imageQuality ?? 0.9));
    }
  }, [open, settings]);

  const handleSave = () => {
    onSave({
      defaultValidityDays: parseInt(localValidity) || 365,
      defaultAspectRatio: localAspect || '4:3',
      imageQuality: parseFloat(localQuality) || 0.9,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <DialogContent className="sm:max-w-[500px] bg-white border-2 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Voucher Settings</DialogTitle>
            <DialogDescription>Configure default voucher behavior & image processing options</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="validity">Default Validity (days)</Label>
              <Input id="validity" type="number" value={localValidity} onChange={e => setLocalValidity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aspect">Default Aspect Ratio</Label>
              <Input id="aspect" placeholder="4:3" value={localAspect} onChange={e => setLocalAspect(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality">Image Quality (0.4 - 1)</Label>
              <Input id="quality" type="number" step="0.05" min="0.4" max="1" value={localQuality} onChange={e => setLocalQuality(e.target.value)} />
              <p className="text-xs text-gray-500">Affects JPEG compression when processing images.</p>
            </div>
            {settings && (
              <p className="text-xs text-gray-400">Last updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : '—'}</p>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};