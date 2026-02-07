import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, Plus, Check, Loader2, Trash2, Package, Truck, Hash, ReceiptText, Edit2, ShoppingBag, XCircle, Save, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { submitToGoogleSheets } from '../../services/googleSheets';
import { toast } from 'react-hot-toast';
import { OrderItem, Order } from '../../types';
import { BRANCHES, CATEGORIES, UOMS, BRANCH_SALES_PERSONS } from '../../constants';
import { User } from '@supabase/supabase-js';

interface ItemState {
  category: string;
  grade: string;
  itemName: string;
  manualItem: boolean;
  color: string;
  width: string;
  uom: string;
  quantity: string;
  rate: string;
  discount: string;
  dispatchDate: string;
  remark: string;
}

const CATEGORY_DB_MAP: Record<string, string> = {
  'CKU': 'cku', 'CRO': 'cro', 'CUP': 'cup', 'DELHI': 'delhi', 'ELASTIC': 'elastic', 'EMBROIDARY': 'embroidary',
  'EYE_N_HOOK': 'eye_n_hook', 'PRINTING': 'printing', 'TLU': 'tlu', 'VAU': 'vau', 'WARP(UDHANA)': 'warp'
};

const GRADES = ['Grade I', 'Grade II', 'Grade III'];

const DRAFT_KEY = 'ginza_order_draft';

const generateOrderId = () => {
  const random = Math.floor(1000 + Math.random() * 9000);
  const time = Date.now().toString().slice(-4);
  return `GNZ-${random}-${time}`;
};

export const OrderForm: React.FC = () => {
  const getInitialState = () => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const draft = getInitialState();

  const [orderId, setOrderId] = useState(draft?.orderId || generateOrderId());
  const [branch, setBranch] = useState(draft?.branch || '');
  const [salesPerson, setSalesPerson] = useState(draft?.salesPerson || '');
  const [salesPersonsList, setSalesPersonsList] = useState<string[]>([]);
  const [customerPONo, setCustomerPONo] = useState(draft?.customerPONo || '');
  const [transporterName, setTransporterName] = useState(draft?.transporterName || '');
  const [accountStatus, setAccountStatus] = useState(draft?.accountStatus || '');

  const [customerSearch, setCustomerSearch] = useState(draft?.customerSearch || '');
  const [customerEmail, setCustomerEmail] = useState(draft?.customerEmail || '');
  const [customerContact, setCustomerContact] = useState(draft?.customerContact || '');
  const [billingAddress, setBillingAddress] = useState(draft?.billingAddress || '');
  const [deliveryAddress, setDeliveryAddress] = useState(draft?.deliveryAddress || '');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<boolean>(draft?.selectedCustomer || false);

  const [currentItem, setCurrentItem] = useState<ItemState>(draft?.currentItem || {
    category: '', grade: '', itemName: '', manualItem: false, color: '', width: '', uom: '', 
    quantity: '', rate: '', discount: '', 
    dispatchDate: new Date().toISOString().split('T')[0], remark: ''
  });
  
  const [items, setItems] = useState<OrderItem[]>(draft?.items || []);
  const [itemSearch, setItemSearch] = useState(draft?.itemSearch || '');
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  useEffect(() => {
    const dataToSave = {
      orderId, branch, salesPerson, customerPONo, transporterName, accountStatus,
      customerSearch, customerEmail, customerContact, billingAddress, deliveryAddress,
      selectedCustomer, currentItem, items, itemSearch
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(dataToSave));
    setLastSaved(Date.now());
  }, [
    orderId, branch, salesPerson, customerPONo, transporterName, accountStatus,
    customerSearch, customerEmail, customerContact, billingAddress, deliveryAddress,
    selectedCustomer, currentItem, items, itemSearch
  ]);

  useEffect(() => {
    if (!branch || !salesPerson) {
      supabase.auth.getUser().then(({ data: { user } }: { data: { user: User | null } }) => {
        if (!branch) {
          const uBranch = user?.user_metadata?.branch;
          if (uBranch && uBranch !== 'N/A') setBranch(uBranch);
        }
        
        if (!salesPerson) {
          const firstName = user?.user_metadata?.first_name || '';
          const lastName = user?.user_metadata?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName) setSalesPerson(fullName);
        }
      });
    }
  }, []);

  useEffect(() => {
    const fetchSales = async () => {
      if (!branch) { setSalesPersonsList([]); return; }
      
      try {
        const { data, error } = await supabase
          .from('sales_persons')
          .select('name')
          .eq('branch', branch);
        
        if (error) throw error;

        const hardcoded = BRANCH_SALES_PERSONS[branch] || [];
        const dbNames = data?.map((d: { name: string }) => d.name) || [];
        
        const combined = Array.from(new Set([
          ...hardcoded.map((n: string) => n.trim()), 
          ...dbNames.map((n: string) => n.trim())
        ]))
        .filter((n: string) => n.length > 0)
        .sort((a, b: string) => a.localeCompare(b));
        
        setSalesPersonsList(combined);
      } catch (err) {
        setSalesPersonsList(BRANCH_SALES_PERSONS[branch] || []);
      }
    };
    fetchSales();
  }, [branch]);

  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 1 || selectedCustomer || !branch) { 
        if (customerSearch.length === 0) setCustomers([]);
        return; 
      }
      
      setIsSearchingCustomer(true);
      try {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('branch', branch)
          .or(`customer_name.ilike.%${customerSearch}%,mob_no.ilike.%${customerSearch}%`)
          .limit(15);
        setCustomers(data || []);
      } finally {
        setIsSearchingCustomer(false);
      }
    };
    const timer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, branch, selectedCustomer]);

  useEffect(() => {
    const fetchProducts = async () => {
      const dbCol = CATEGORY_DB_MAP[currentItem.category];
      if (!dbCol || itemSearch.length === 0) { setSuggestedProducts([]); return; }
      setIsSearchingProduct(true);
      const { data } = await supabase
        .from('products')
        .select('*')
        .not(dbCol, 'is', null)
        .neq(dbCol, '')
        .ilike(dbCol, `%${itemSearch}%`)
        .order(dbCol, { ascending: true })
        .limit(50);
      setSuggestedProducts(data || []);
      setIsSearchingProduct(false);
    };
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [itemSearch, currentItem.category]);

  const onSelectCustomer = (c: any) => {
    setCustomerSearch(c.customer_name);
    setCustomerEmail(c.email_id || '');
    setCustomerContact(c.mob_no || '');
    setBillingAddress(c.address || c.billing_address || c.full_address || '');
    setAccountStatus(c.account_status || ''); 
    setSelectedCustomer(true);
    setCustomers([]);
  };

  const onSelectProduct = (product: any) => {
    const category = currentItem.category;
    if (!category) return;
    const dbCol = CATEGORY_DB_MAP[category];
    if (!dbCol) return;
    const pName = product[dbCol] || '';
    const pWidth = product[`width_${dbCol}`] || product.width || '';
    setCurrentItem({ ...currentItem, itemName: pName, width: String(pWidth), uom: product.uom || '' });
    setItemSearch(pName);
    setShowProductSuggestions(false);
  };

  const addItemToPreview = () => {
    let finalItemName = currentItem.itemName || itemSearch;
    
    if (!currentItem.category) { toast.error('Unit/Category selection required'); return; }
    if (!finalItemName.trim()) { toast.error('Item Name cannot be empty'); return; }
    if (currentItem.category === 'ELASTIC' && !currentItem.grade) { toast.error('Grade selection required for ELASTIC'); return; }
    if (!currentItem.uom) { toast.error('UOM selection required'); return; }
    if (!currentItem.quantity || Number(currentItem.quantity) <= 0) { toast.error('Quantity must be greater than 0'); return; }
    if (!currentItem.rate || Number(currentItem.rate) <= 0) { toast.error('Rate must be greater than 0'); return; }

    // Automated formatting for ELASTIC
    if (currentItem.category === 'ELASTIC') {
      finalItemName = `${finalItemName.trim()} - ${currentItem.grade}`;
    }

    const qty = Number(currentItem.quantity);
    const rate = Number(currentItem.rate);
    const disc = Number(currentItem.discount) || 0;
    
    const newItem: OrderItem = {
      id: editingId || crypto.randomUUID(),
      category: currentItem.category,
      itemName: finalItemName.trim(),
      manualItem: currentItem.manualItem,
      color: currentItem.color.trim() || 'STD',
      width: currentItem.width.trim() || 'STD',
      uom: currentItem.uom,
      quantity: qty,
      rate: rate,
      discount: disc,
      dispatchDate: currentItem.dispatchDate,
      transportName: transporterName,
      remark: currentItem.remark,
      total: (qty * rate) * (1 - (disc / 100))
    };

    if (editingId) {
      setItems(items.map((it: OrderItem) => it.id === editingId ? newItem : it));
      setEditingId(null);
      toast.success('Entry updated');
    } else {
      setItems(prev => [...prev, newItem]);
      toast.success('Added to preview batch');
    }

    setItemSearch('');
    setCurrentItem({ 
      ...currentItem, 
      itemName: '', 
      color: '', 
      width: '', 
      quantity: '', 
      rate: '', 
      discount: '', 
      remark: '',
      grade: currentItem.category === 'ELASTIC' ? currentItem.grade : '' 
    });
  };

  const handleEditItem = (item: OrderItem) => {
    setEditingId(item.id);
    
    let baseName = item.itemName;
    let gradeFound = '';
    if (item.category === 'ELASTIC') {
      const parts = item.itemName.split(' - ');
      if (parts.length > 1) {
        gradeFound = parts.pop() || '';
        baseName = parts.join(' - ');
      }
    }

    setCurrentItem({
      category: item.category,
      grade: gradeFound,
      itemName: baseName,
      manualItem: item.manualItem,
      color: item.color,
      width: item.width,
      uom: item.uom,
      quantity: String(item.quantity),
      rate: String(item.rate),
      discount: String(item.discount),
      dispatchDate: item.dispatchDate,
      remark: item.remark
    });
    setItemSearch(baseName);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleSubmitOrder = async () => {
    if (!customerSearch || !branch || !salesPerson || items.length === 0) {
      toast.error('Mandatory data missing'); 
      return;
    }
    setIsSubmitting(true);
    const order: Order = {
      id: orderId, 
      orderDate: new Date().toLocaleDateString('en-GB'),
      branch, 
      salesPerson, 
      customerPONo,
      customer: { id: '', name: customerSearch, email: customerEmail, contact_no: customerContact, address: billingAddress },
      billingAddress, 
      deliveryAddress, 
      accountStatus,
      items: items.map((it: OrderItem) => ({ ...it, transportName: transporterName })), 
      timestamp: Date.now()
    };
    
    const success = await submitToGoogleSheets(order);
    if (success) {
      const history = JSON.parse(localStorage.getItem('ginza_order_history') || '[]');
      localStorage.setItem('ginza_order_history', JSON.stringify([order, ...history]));
      toast.success('Order Batch Synced Successfully');
      localStorage.removeItem(DRAFT_KEY);
      setItems([]); 
      setCustomerPONo(''); 
      setTransporterName(''); 
      setAccountStatus(''); 
      setCustomerSearch(''); 
      setSelectedCustomer(false);
      setBillingAddress(''); 
      setDeliveryAddress(''); 
      setCustomerContact(''); 
      setCustomerEmail('');
      setOrderId(generateOrderId());
    } else {
      toast.error('Sync failed. Check connection.');
    }
    setIsSubmitting(false);
  };

  const clearDraft = () => {
    if (confirm('Clear current draft and start fresh?')) {
      localStorage.removeItem(DRAFT_KEY);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 relative">
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-slate-400" />
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Order Identity</h3>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
              <Save className="h-2.5 w-2.5 text-emerald-500" /> Draft Auto-Saved
            </div>
          )}
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Order ID</label>
            <div className="bg-indigo-600 border border-indigo-700 rounded-xl px-4 py-3 text-sm font-black text-white tracking-widest shadow-inner flex items-center justify-between">
              {orderId}
              <RefreshCw className="h-3 w-3 opacity-30" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Branch Select</label>
            <select value={branch} onChange={(e) => { setBranch(e.target.value); setSalesPerson(''); setCustomerSearch(''); setSelectedCustomer(false); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option value="">-- Choose Branch --</option>
              {BRANCHES.map((b: string) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Sales Personnel</label>
            <select value={salesPerson} onChange={(e) => setSalesPerson(e.target.value)} disabled={!branch} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
              <option value="">-- Select Staff --</option>
              {salesPersonsList.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Customer PO Ref</label>
            <input type="text" value={customerPONo} onChange={(e) => setCustomerPONo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="PO Number" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-indigo-500" />
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Customer & Shipping</h3>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Customer Search (Name/Mobile)*</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type="text" value={customerSearch} onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(false); }} disabled={!branch} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={branch ? "Search..." : "Select branch first"} />
                {isSearchingCustomer && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-indigo-500" />}
              </div>
              <AnimatePresence>
                {customers.length > 0 && !selectedCustomer && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {customers.map((c: any) => (
                      <button key={c.id} onClick={() => onSelectCustomer(c)} className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex flex-col group transition-colors">
                        <span className="text-sm font-black text-slate-800 group-hover:text-indigo-700">{c.customer_name}</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{c.mob_no || 'No Contact'}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{c.branch}</span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Contact No</label>
                <input type="text" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Email</label>
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Billing Address</label>
              <textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm h-16 resize-none outline-none font-bold" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-0.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Delivery Address</label>
                <button onClick={() => setDeliveryAddress(billingAddress)} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Same as Billing</button>
              </div>
              <textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm h-16 resize-none outline-none font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5">Account Status</label>
              <input type="text" value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Credit / Outstanding info" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-0.5 flex items-center gap-1"><Truck className="h-4 w-4 text-indigo-500" /> Transporter</label>
              <input type="text" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="Transporter Details" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-indigo-600">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-600" />
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{editingId ? 'Modify Selection' : 'Product Selection'}</h3>
          </div>
          {editingId && <button onClick={() => { setEditingId(null); setItemSearch(''); }} className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancel Edit</button>}
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Unit / Category</label>
              <select value={currentItem.category} onChange={(e) => { setCurrentItem({...currentItem, category: e.target.value, itemName: '', grade: ''}); setItemSearch(''); setShowProductSuggestions(!!e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                <option value="">Select Category</option>
                {CATEGORIES.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            
            {currentItem.category === 'ELASTIC' && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-1.5">
                <label className="text-[11px] font-black text-indigo-600 uppercase tracking-wider ml-0.5">Elastic Grade*</label>
                <select value={currentItem.grade} onChange={(e) => setCurrentItem({...currentItem, grade: e.target.value})} className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5 text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  <option value="">-- Select Grade --</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </motion.div>
            )}

            <div className={`${currentItem.category === 'ELASTIC' ? 'md:col-span-1' : 'md:col-span-2'} relative space-y-1.5`}>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-indigo-600">Product Search*</label>
              <div className="relative">
                <input type="text" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} onFocus={() => currentItem.category && setShowProductSuggestions(true)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all" placeholder={currentItem.category ? `Search in ${currentItem.category}...` : "Choose category first"} disabled={!currentItem.category} />
                {isSearchingProduct && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
              </div>
              <AnimatePresence>
                {!currentItem.manualItem && showProductSuggestions && suggestedProducts.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute z-40 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {suggestedProducts.map((p: any, idx: number) => {
                      const category = currentItem.category;
                      const dbCol = CATEGORY_DB_MAP[category];
                      return (
                        <button key={p.id || idx} onClick={() => onSelectProduct(p)} className="w-full px-4 py-3 text-left hover:bg-indigo-50 text-sm font-bold text-slate-700">{p[dbCol]}</button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">UOM</label>
              <select value={currentItem.uom} onChange={(e) => setCurrentItem({...currentItem, uom: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold">
                <option value="">Select UOM</option>
                {UOMS.map((u: string) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
            <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Color</label><input type="text" value={currentItem.color} onChange={(e) => setCurrentItem({...currentItem, color: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="STD" /></div>
            <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Width</label><input type="text" value={currentItem.width} onChange={(e) => setCurrentItem({...currentItem, width: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" placeholder="STD" /></div>
            <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-indigo-600">Quantity*</label><input type="number" value={currentItem.quantity} onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" /></div>
            <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-indigo-600">Rate (₹)*</label><input type="number" value={currentItem.rate} onChange={(e) => setCurrentItem({...currentItem, rate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold" /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
            <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Discount %</label><input type="number" value={currentItem.discount} onChange={(e) => setCurrentItem({...currentItem, discount: e.target.value})} className="w-full bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 text-sm font-bold text-emerald-700" placeholder="0" /></div>
            <div className="space-y-1.5"><label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Dispatch Date</label><input type="date" value={currentItem.dispatchDate} onChange={(e) => setCurrentItem({...currentItem, dispatchDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700" /></div>
            <div className="space-y-1.5 md:col-span-1"><label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Remark</label><input type="text" value={currentItem.remark} onChange={(e) => setCurrentItem({...currentItem, remark: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Instructions..." /></div>
            <div>
              <button onClick={addItemToPreview} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-md">
                {editingId ? <><Edit2 className="h-4 w-4" /> Update Entry</> : <><Plus className="h-4 w-4" /> Add To Summary</>}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-3" id="order-summary-box">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden min-h-[220px]">
          <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 text-indigo-400" />
              <h3 className="text-white font-black text-[11px] uppercase tracking-widest">Order Summary Batch ({items.length})</h3>
            </div>
            {items.length > 0 && (
              <div className="flex items-center gap-5">
                <button onClick={() => { if(confirm('Clear all items?')) setItems([]); }} className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest">Clear All</button>
                <div className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="text-slate-500 font-bold text-[10px]">Total:</span> ₹{items.reduce((sum: number, item: OrderItem) => sum + item.total, 0).toLocaleString()}
                </div>
              </div>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-4">
                <div className="p-6 bg-slate-50 rounded-full">
                  <ShoppingBag className="h-12 w-12 opacity-10" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">Summary Basket is Empty</p>
                  <p className="text-[10px] font-bold opacity-20 mt-1 uppercase">Select Products to Build Batch</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Product Details</th>
                    <th className="px-6 py-4 text-right">Qty/Rate</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((i: OrderItem) => (
                    <tr key={i.id} className="text-sm hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900 text-sm">{i.itemName}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-tight mt-0.5">
                          {i.category} • {i.color} • {i.width}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-slate-800">{i.quantity.toLocaleString()} {i.uom}</p>
                        <p className="text-[10px] text-slate-400 font-black">@ ₹{i.rate.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-slate-900 text-sm">₹{i.total.toLocaleString()}</p>
                        {i.discount > 0 && <span className="block text-[10px] text-emerald-600 font-black">-{i.discount}% Off</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleEditItem(i)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => setItems(items.filter((x: OrderItem) => x.id !== i.id))} className="p-2.5 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 py-10">
          {items.length > 0 && (
            <button onClick={handleSubmitOrder} disabled={isSubmitting} className="group relative flex items-center gap-5 px-20 py-5 bg-indigo-600 text-white rounded-[2rem] shadow-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-[0.97]">
              {isSubmitting ? (
                <><Loader2 className="h-6 w-6 animate-spin" /><span className="text-sm font-black uppercase tracking-widest">Processing Sync...</span></>
              ) : (
                <><p className="text-base font-black uppercase tracking-widest">Final Cloud Sync</p><Check className="h-6 w-6" /></>
              )}
            </button>
          )}
          
          {(items.length > 0 || customerSearch || billingAddress) && (
            <button 
              onClick={clearDraft}
              className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Clear Current Draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
};