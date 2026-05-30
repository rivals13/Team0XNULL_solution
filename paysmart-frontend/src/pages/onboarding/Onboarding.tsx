import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { billerAccountsApi, billInquiryApi } from '../../api';
import Spinner from '../../components/Spinner';
import type { BillerAccount, BillerCategory } from '../../types';
import { IoChevronBack } from 'react-icons/io5';

// ──────────────────────────────────────────────────────────────────────────────
// Onboarding — welcome → category → provider → details → success
// Routes:
//   /onboarding             → welcome screen
//   /onboarding?step=category → skip welcome (Dashboard "Add New Bill")
// ──────────────────────────────────────────────────────────────────────────────

const ONBOARDING_KEY = 'paysmart_onboarded';

type Step = 'welcome' | 'category' | 'provider' | 'details' | 'success';

interface Provider {
  slug: string;
  name: string;
  description: string;
}

// ── Providers that have a mock merchant API — validation is enforced ──────────
// Maps Onboarding provider slug → mock merchant slug
const VALIDATABLE: Record<string, string> = {
  'nea-electricity':     'nea-electricity',
  'kukl-water':          'kukl-water',
  'worldlink':           'worldlink',
  'vianet':              'vianet',
  'subisu':              'subisu',
  'dishhome':            'dishhome',
  'nepal-traffic-police':'nepal-traffic-police',
  'college-fee':         'himalayan-college',
};

const CATEGORIES: Array<{
  id: BillerCategory; label: string; emoji: string;
  color: string; providers: Provider[];
}> = [
  {
    id: 'electricity', label: 'Electricity', emoji: '⚡', color: 'bg-amber-50 border-amber-200',
    providers: [
      { slug: 'nea-electricity', name: 'NEA', description: 'Nepal Electricity Authority' },
    ],
  },
  {
    id: 'water', label: 'Khanepani (Water)', emoji: '💧', color: 'bg-sky-50 border-sky-200',
    providers: [
      { slug: 'kukl-water', name: 'KUKL', description: 'Kathmandu Upatyaka Khanepani Limited' },
    ],
  },
  {
    id: 'internet', label: 'Internet', emoji: '🌐', color: 'bg-blue-50 border-blue-200',
    providers: [
      { slug: 'worldlink',     name: 'WorldLink',     description: 'WorldLink Communications Pvt. Ltd.' },
      { slug: 'cgnet',         name: 'CG Net',         description: 'CG Digital / CG Communications' },
      { slug: 'subisu',        name: 'Subisu',         description: 'Subisu CableNet Pvt. Ltd.' },
      { slug: 'vianet',        name: 'Vianet',         description: 'Vianet Communications Pvt. Ltd.' },
      { slug: 'dishome-fiber', name: 'DishHome Fiber', description: 'DishHome Broadband (Fiber)' },
    ],
  },
  {
    id: 'tv', label: 'TV / Cable', emoji: '📺', color: 'bg-purple-50 border-purple-200',
    providers: [
      { slug: 'dishhome',  name: 'DishHome',  description: 'DishHome DTH / Cable TV' },
      { slug: 'tataplay',  name: 'TataPlay',  description: 'TataPlay (formerly Tata Sky)' },
      { slug: 'simtv',     name: 'Sim TV',    description: 'Sim TV Cable Network' },
      { slug: 'nettv',     name: 'NetTV',     description: 'NetTV Nepal (OTT / Cable)' },
    ],
  },
  {
    id: 'education', label: 'Education Fee', emoji: '🎓', color: 'bg-violet-50 border-violet-200',
    providers: [
      { slug: 'school-fee',  name: 'School Fee Payment',  description: 'Primary / Secondary schools' },
      { slug: 'college-fee', name: 'College Fee Payment', description: 'Bachelors / Masters programs' },
    ],
  },
  {
    id: 'traffic', label: 'Traffic Fine', emoji: '🚔', color: 'bg-red-50 border-red-200',
    providers: [
      { slug: 'nepal-traffic-police', name: 'Nepal Traffic Police', description: 'e-Challan system' },
    ],
  },
  {
    id: 'rent', label: 'House Rent', emoji: '🏠', color: 'bg-orange-50 border-orange-200',
    providers: [
      { slug: 'house-rent', name: 'Monthly Rent', description: 'Track & pay monthly house rent' },
    ],
  },
  {
    id: 'insurance', label: 'Insurance', emoji: '🛡️', color: 'bg-green-50 border-green-200',
    providers: [
      { slug: 'nepal-life',      name: 'Nepal Life Insurance',  description: 'Nepal Life Insurance Co. Ltd.' },
      { slug: 'prime-life',      name: 'Prime Life Insurance',  description: 'Prime Life Insurance Co. Ltd.' },
      { slug: 'nlic',            name: 'NLIC',                  description: 'National Life Insurance Co. Ltd.' },
      { slug: 'prabhu-life',     name: 'Prabhu Life Insurance', description: 'Prabhu Life Insurance Co. Ltd.' },
      { slug: 'other-insurance', name: 'Other Insurance',       description: 'Any other insurance company' },
    ],
  },
];

const FISCAL_YEARS = ['2080/81', '2081/82', '2082/83'];
const PROVINCES    = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];

// ──────────────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialStep: Step = (params.get('step') as Step) ?? 'welcome';

  const [step,            setStep]            = useState<Step>(initialStep);
  const [category,        setCategory]        = useState<BillerCategory | null>(null);
  const [provider,        setProvider]        = useState<Provider | null>(null);
  const [form,            setForm]            = useState<Record<string, string>>({});
  const [trafficResult,   setTrafficResult]   = useState<{ violation: string; amount: number } | null>(null);
  const [trafficChecking, setTrafficChecking] = useState(false);
  const [validating,      setValidating]      = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');
  const [savedAccount,    setSavedAccount]    = useState<BillerAccount | null>(null);
  const [previewBill,     setPreviewBill]     = useState<{ amount: number; dueDate: string; description: string } | null>(null);

  const reset = () => {
    setCategory(null); setProvider(null); setForm({});
    setTrafficResult(null); setError(''); setSavedAccount(null); setPreviewBill(null);
  };

  const markOnboarded = () => localStorage.setItem(ONBOARDING_KEY, 'true');

  // ── Step handlers ──────────────────────────────────────────────────────────
  const goToCategory  = () => { markOnboarded(); setStep('category'); };
  const goToDashboard = () => { markOnboarded(); navigate('/dashboard'); };

  const pickCategory = (c: BillerCategory) => {
    setCategory(c);
    const cat = CATEGORIES.find(x => x.id === c)!;
    if (cat.providers.length === 1) { setProvider(cat.providers[0]); setStep('details'); }
    else                             { setStep('provider'); }
  };

  const pickProvider = (p: Provider) => { setProvider(p); setStep('details'); };

  // ── Traffic fine mock check ────────────────────────────────────────────────
  const checkTrafficFine = () => {
    setError('');
    if (!form.chitNumber?.trim()) return setError('Chit number is required');
    if (!form.fiscalYear)          return setError('Please select fiscal year');
    if (!form.province)            return setError('Please select province');
    setTrafficChecking(true);
    setTimeout(() => {
      const seed = form.chitNumber.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const violations = ['Riding without helmet','Over-speeding','Lane indiscipline','Signal violation','No-parking zone'];
      setTrafficResult({ violation: violations[seed % violations.length], amount: 500 + (seed % 5) * 500 });
      setTrafficChecking(false);
    }, 1200);
  };

  // ── Get the "customer ID" from the form based on category ─────────────────
  const getCustomerId = (): string => {
    if (!category) return '';
    switch (category) {
      case 'electricity': return form.customerId ?? '';
      case 'water':       return form.clientCode  ?? '';
      case 'internet':    return form.customerId  ?? '';
      case 'tv':          return form.customerId  ?? '';
      case 'traffic':     return form.chitNumber  ?? '';
      case 'education':   return form.studentId   ?? '';
      default:            return form.customerId  ?? '';
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    setError('');
    if (category === 'electricity') {
      if (!form.customerId?.trim()) { setError('SC No. / Customer ID is required for NEA payment'); return false; }
      if (!form.officeCode?.trim()) { setError('Office code is required'); return false; }
    } else if (category === 'water') {
      if (!form.clientCode?.trim()) { setError('Client code is required for KUKL'); return false; }
    } else if (category === 'internet') {
      if (!form.customerId?.trim()) { setError('Customer ID / username is required'); return false; }
      if (!form.phone?.trim())      { setError('Registered phone number is required'); return false; }
    } else if (category === 'tv') {
      if (!form.customerId?.trim()) { setError('Smart Card No. / Subscriber ID is required'); return false; }
    } else if (category === 'education') {
      if (!form.institutionName?.trim()) { setError('Please enter your school / college name'); return false; }
      if (!form.studentId?.trim())       { setError('Student ID / Registration Number is required'); return false; }
      if (!form.classOrProgram?.trim())  { setError(provider?.slug === 'school-fee' ? 'Class / Grade is required' : 'Program / Faculty is required'); return false; }
    } else if (category === 'traffic') {
      if (!form.chitNumber?.trim()) { setError('Chit number is required'); return false; }
      if (!form.fiscalYear)          { setError('Please select fiscal year'); return false; }
      if (!form.province)            { setError('Please select province'); return false; }
    } else if (category === 'rent') {
      if (!form.landlordName?.trim())      { setError('Landlord name is required'); return false; }
      if (!form.propertyAddress?.trim())   { setError('Property address is required'); return false; }
      if (!form.landlordPayment?.trim())   { setError("Landlord's eSewa / bank number is required for payment"); return false; }
      if (!form.rentAmount?.trim() || Number(form.rentAmount) <= 0) {
        setError('Please enter monthly rent amount (NPR)'); return false;
      }
    } else if (category === 'insurance') {
      if (!form.policyNumber?.trim())     { setError('Policy number is required'); return false; }
      if (!form.planName?.trim())         { setError('Plan name is required'); return false; }
      if (!form.premiumAmount?.trim() || Number(form.premiumAmount) <= 0) {
        setError('Premium amount is required'); return false;
      }
      if (!form.premiumFrequency)         { setError('Please select premium frequency'); return false; }
    }
    return true;
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = async () => {
    setError('');
    if (!validate())          return;
    if (!provider || !category) return;

    const customerId   = getCustomerId();
    const merchantSlug = provider ? VALIDATABLE[provider.slug] : null;

    // ── Step 1: Validate with merchant API (blocks save if invalid) ──────────
    if (merchantSlug && customerId) {
      setValidating(true);
      try {
        const result = await billInquiryApi.validate(merchantSlug, customerId);

        if (!result.valid) {
          // Hard block — customer ID genuinely not in merchant DB
          setError(
            `Customer ID "${customerId}" was not found in ${provider.name}'s database.\n` +
            `Please double-check and try again.`,
          );
          return;
        }

        // valid: true — either a real bill came back or merchant has no inquiry URL
        if (result.bill) {
          setPreviewBill({
            amount:      result.bill.amount      as number,
            dueDate:     result.bill.dueDate     as string,
            description: (result.bill.description as string) ?? '',
          });
        }
      } catch {
        // Network error — allow save with a warning (graceful degradation)
        setPreviewBill(null);
      } finally {
        setValidating(false);
      }
    }

    // ── Step 2: Save the account ─────────────────────────────────────────────
    setSaving(true);
    try {
      const { customerId: _cid, ...details } = form;
      const fullDetails: Record<string, unknown> = { ...details };
      if (trafficResult) { fullDetails.violation = trafficResult.violation; fullDetails.fineAmount = trafficResult.amount; }
      if (category === 'rent') {
        fullDetails.landlordName    = form.landlordName;
        fullDetails.propertyAddress = form.propertyAddress;
        fullDetails.rentAmount      = Number(form.rentAmount);
        fullDetails.dueDay          = form.dueDay || '1';
      }

      const billerName = category === 'rent'
        ? `Rent — ${form.propertyAddress}`
        : provider.name;

      const created = await billerAccountsApi.create({
        billerName,
        billerSlug:     provider.slug,
        billerCategory: category,
        customerId:     customerId || form.landlordName || form.policyNumber || form.chitNumber || form.studentId || '',
        details:        fullDetails,
      });

      setSavedAccount(created);
      setStep('success');

      // Notify SocketProvider to refresh billerAccounts (so popup can find customerId)
      window.dispatchEvent(new CustomEvent('billerAccountSaved', { detail: created }));

      // ── Auto-trigger bill in background so it appears in SmartBills fast ──
      if (merchantSlug) {
        setTimeout(() => {
          billerAccountsApi.checkBill(created.id).catch(() => {});
        }, 2000); // fires after 2 seconds → notification within ~5s total
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  // ── Navigate from success screen ──────────────────────────────────────────
  const goPayNow = () => {
    if (!savedAccount) return;
    navigate(`/smart-bills?openPay=${savedAccount.id}`);
  };

  const goSchedule = () => {
    if (!savedAccount) return;
    const q = new URLSearchParams({
      fromSmartBill:   'true',
      name:            `${savedAccount.billerName} — Bill`,
      amount:          previewBill ? String(previewBill.amount) : '',
      billerName:      savedAccount.billerName,
      merchantSlug:    savedAccount.billerSlug,
      customerId:      savedAccount.customerId,
      billerAccountId: savedAccount.id,
      billerCategory:  (savedAccount.billerCategory ?? '').toUpperCase(),
      description:     previewBill?.description ?? '',
      ...(previewBill?.dueDate ? { dueDate: previewBill.dueDate } : {}),
    });
    navigate(`/schedules/new?${q}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {step === 'welcome'  && <Welcome  onStart={goToCategory} onLater={goToDashboard} />}
      {step === 'category' && <CategoryGrid onPick={pickCategory} onBack={() => navigate('/dashboard')} />}
      {step === 'provider' && <ProviderList category={category!} onPick={pickProvider} onBack={() => setStep('category')} />}
      {step === 'details'  && (
        <DetailsForm
          category={category!}  provider={provider!}
          form={form}            setForm={setForm}
          error={error}          saving={saving || validating}
          trafficResult={trafficResult} trafficChecking={trafficChecking}
          onCheckFine={checkTrafficFine}
          onBack={() => { reset(); setStep('category'); }}
          onSave={save}
          isValidating={validating}
        />
      )}
      {step === 'success'  && (
        <Success
          billerName={savedAccount?.billerName ?? ''}
          previewBill={previewBill}
          onAddAnother={() => { reset(); setStep('category'); }}
          onGoToSmartBills={() => navigate('/smart-bills')}
          onPayNow={goPayNow}
          onSchedule={goSchedule}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Welcome
// ─────────────────────────────────────────────────────────────────────────────
function Welcome({ onStart, onLater }: { onStart: () => void; onLater: () => void }) {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-between px-8 py-16">
      <div />
      <div className="text-center">
        <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-8 shadow-xl">
          <span className="text-5xl">💚</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">PaySmart</h1>
        <p className="text-white/85 text-xl font-medium leading-relaxed">Smart Bills, Zero Stress</p>
        <p className="text-white/60 text-sm mt-3">Nepal's intelligent bill payment companion</p>
      </div>
      <div className="w-full max-w-md">
        <button onClick={onStart} className="w-full py-4 bg-white text-primary font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-transform mb-3">
          Get Started
        </button>
        <button onClick={onLater} className="w-full py-3 text-white/80 text-sm font-medium hover:text-white">
          Maybe Later
        </button>
        <p className="text-white/50 text-xs text-center mt-4">Powered by eSewa</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Category grid
// ─────────────────────────────────────────────────────────────────────────────
function CategoryGrid({ onPick, onBack }: { onPick: (c: BillerCategory) => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white px-5 pt-12 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 active:bg-gray-200">
          <IoChevronBack className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">What do you pay?</h2>
          <p className="text-gray-500 text-sm mt-0.5">Select a service to set up smart bills</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => onPick(c.id)}
            className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 ${c.color} active:scale-95 transition-transform`}>
            <span className="text-5xl">{c.emoji}</span>
            <span className="font-bold text-sm text-gray-800 text-center leading-tight">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Provider list
// ─────────────────────────────────────────────────────────────────────────────
function ProviderList({ category, onPick, onBack }: { category: BillerCategory; onPick: (p: Provider) => void; onBack: () => void }) {
  const cat = CATEGORIES.find(c => c.id === category)!;
  return (
    <div className="min-h-screen bg-white px-5 pt-12 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 active:bg-gray-200">
          <IoChevronBack className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Select provider</h2>
          <p className="text-gray-500 text-sm mt-0.5">{cat.label}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {cat.providers.map(p => (
          <button key={p.slug} onClick={() => onPick(p)}
            className="w-full p-5 rounded-2xl border border-gray-200 bg-gray-50 hover:border-primary hover:bg-green-50 text-left active:scale-[0.98] transition-all flex items-center gap-4">
            <span className="text-3xl">{cat.emoji}</span>
            <div className="flex-1">
              <p className="font-bold text-gray-800">{p.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
            </div>
            <span className="text-primary text-xl">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Details form
// ─────────────────────────────────────────────────────────────────────────────
function DetailsForm({
  category, provider, form, setForm, error, saving,
  trafficResult, trafficChecking, onCheckFine, onBack, onSave, isValidating,
}: {
  category: BillerCategory; provider: Provider;
  form: Record<string, string>; setForm: (f: Record<string, string>) => void;
  error: string; saving: boolean; isValidating: boolean;
  trafficResult: { violation: string; amount: number } | null;
  trafficChecking: boolean;
  onCheckFine: () => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });
  const isValidatable = VALIDATABLE[provider.slug];

  return (
    <div className="min-h-screen bg-white px-5 pt-12 pb-10">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 active:bg-gray-200 flex-shrink-0">
          <IoChevronBack className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800">{provider.name}</h2>
          <p className="text-gray-500 text-xs mt-0.5">{provider.description}</p>
        </div>
      </div>

      {/* Validation notice for supported merchants */}
      {isValidatable && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex gap-2 items-start">
          <span className="text-blue-500 text-base flex-shrink-0">🔒</span>
          <p className="text-blue-700 text-xs leading-relaxed">
            <strong>Live validation:</strong> Your Customer ID will be verified with {provider.name}'s database before saving. Only valid IDs are accepted.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4 whitespace-pre-line">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">

        {/* ───── NEA Electricity ───── */}
        {category === 'electricity' && (
          <>
            <Field label="Customer ID / SC No." required>
              <Input value={form.customerId ?? ''} onChange={v => set('customerId', v)} placeholder="e.g. SC-001, 123456 (on your NEA bill)" />
            </Field>
            <Field label="Office Code" required>
              <Input value={form.officeCode ?? ''} onChange={v => set('officeCode', v)} placeholder="e.g. 01" />
            </Field>
          </>
        )}

        {/* ───── KUKL Water ───── */}
        {category === 'water' && (
          <>
            <Field label="Client Code" required>
              <Input value={form.clientCode ?? ''} onChange={v => set('clientCode', v)} placeholder="e.g. KUKL-1234" />
            </Field>
            <Field label="Area Code">
              <Input value={form.areaCode ?? ''} onChange={v => set('areaCode', v)} placeholder="e.g. 02 (optional)" />
            </Field>
          </>
        )}

        {/* ───── Internet ───── */}
        {category === 'internet' && (
          <>
            <Field label="Customer ID / Username" required>
              <Input value={form.customerId ?? ''} onChange={v => set('customerId', v)} placeholder="e.g. WL-12345 or VNT-001" />
            </Field>
            <Field label="Registered Phone Number" required>
              <Input value={form.phone ?? ''} onChange={v => set('phone', v)} placeholder="e.g. 9801234567" />
            </Field>
            <Field label="Internet Package">
              <Select value={form.package ?? ''} onChange={v => set('package', v)} placeholder="Select your package (optional)"
                options={['25 Mbps Unlimited','50 Mbps Unlimited','100 Mbps Unlimited','200 Mbps Business','Other']} />
            </Field>
            <Field label="Nickname">
              <Input value={form.nickname ?? ''} onChange={v => set('nickname', v)} placeholder='e.g. "Home WiFi" (optional)' />
            </Field>
          </>
        )}

        {/* ───── TV / Cable ───── */}
        {category === 'tv' && (
          <>
            <Field label="Smart Card No. / Subscriber ID" required>
              <Input value={form.customerId ?? ''} onChange={v => set('customerId', v)} placeholder="e.g. DH-001234 (on your set-top box)" />
            </Field>
            <Field label="Registered Phone Number">
              <Input value={form.phone ?? ''} onChange={v => set('phone', v)} placeholder="e.g. 9801234567 (optional)" />
            </Field>
            <Field label="TV Package">
              <Select value={form.package ?? ''} onChange={v => set('package', v)} placeholder="Select your package (optional)"
                options={['Family Pack','Sports Pack','Premium Pack','Basic Pack','Other']} />
            </Field>
            <Field label="Nickname">
              <Input value={form.nickname ?? ''} onChange={v => set('nickname', v)} placeholder='e.g. "Living Room TV" (optional)' />
            </Field>
          </>
        )}

        {/* ───── Education ───── */}
        {category === 'education' && (
          <>
            <Field label={provider.slug === 'school-fee' ? 'School Name' : 'College Name'} required>
              <Input value={form.institutionName ?? ''} onChange={v => set('institutionName', v)}
                placeholder={provider.slug === 'school-fee' ? 'e.g. Himalayan Whitehouse' : 'e.g. Himalayan College (use exact name)'} />
            </Field>
            <Field label="Student ID / Registration Number" required>
              <Input value={form.studentId ?? ''} onChange={v => set('studentId', v)} placeholder="e.g. 2024001, 2024002" />
            </Field>
            <Field label={provider.slug === 'school-fee' ? 'Class / Grade' : 'Program / Faculty'} required>
              <Input value={form.classOrProgram ?? ''} onChange={v => set('classOrProgram', v)}
                placeholder={provider.slug === 'school-fee' ? 'e.g. Grade 10' : 'e.g. BSc IT, BBA'} />
            </Field>
          </>
        )}

        {/* ───── House Rent ───── */}
        {category === 'rent' && (
          <>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex gap-3 items-start mb-1">
              <span className="text-orange-500 text-xl">🏠</span>
              <div>
                <p className="text-orange-700 text-sm font-bold">Monthly Rent Tracker</p>
                <p className="text-orange-600 text-xs mt-0.5">You'll get a reminder 3 days before rent is due each month.</p>
              </div>
            </div>
            <Field label="Landlord Name" required>
              <Input value={form.landlordName ?? ''} onChange={v => set('landlordName', v)} placeholder="e.g. Ram Prasad Sharma" />
            </Field>
            <Field label="Property Address" required>
              <Input value={form.propertyAddress ?? ''} onChange={v => set('propertyAddress', v)} placeholder="e.g. Baluwatar-4, Kathmandu" />
            </Field>
            <Field label="Monthly Rent Amount (NPR)" required>
              <input type="number" min="1" step="1" value={form.rentAmount ?? ''} onChange={e => set('rentAmount', e.target.value)}
                placeholder="e.g. 15000"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 text-base focus:outline-none focus:border-primary focus:bg-white" />
            </Field>
            <Field label="Landlord's eSewa / Bank No." required>
              <Input value={form.landlordPayment ?? ''} onChange={v => set('landlordPayment', v)} placeholder="Landlord's eSewa number or bank account" />
            </Field>
            <Field label="Rent Due Day of Month">
              <Select value={form.dueDay ?? ''} onChange={v => set('dueDay', v)} placeholder="Select due day (optional)"
                options={['1st','5th','7th','10th','15th','20th','25th','Last day']} />
            </Field>
          </>
        )}

        {/* ───── Insurance ───── */}
        {category === 'insurance' && (
          <>
            <Field label="Policy Number" required>
              <Input value={form.policyNumber ?? ''} onChange={v => set('policyNumber', v)} placeholder="e.g. NLI-2026-001234" />
            </Field>
            <Field label="Plan Name" required>
              <Input value={form.planName ?? ''} onChange={v => set('planName', v)} placeholder="e.g. Endowment Plan, 15-year term" />
            </Field>
            <Field label="Premium Amount (NPR)" required>
              <input type="number" min="1" step="1" value={form.premiumAmount ?? ''} onChange={e => set('premiumAmount', e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 text-base focus:outline-none focus:border-primary focus:bg-white" />
            </Field>
            <Field label="Premium Frequency" required>
              <Select value={form.premiumFrequency ?? ''} onChange={v => set('premiumFrequency', v)} placeholder="Select frequency"
                options={['Monthly','Quarterly','Half-yearly','Annually']} />
            </Field>
            <Field label="Registered Phone Number">
              <Input value={form.phone ?? ''} onChange={v => set('phone', v)} placeholder="e.g. 9801234567 (optional)" />
            </Field>
          </>
        )}

        {/* ───── Traffic Fine ───── */}
        {category === 'traffic' && (
          <>
            <Field label="Chit Number / Slip Number" required>
              <Input value={form.chitNumber ?? ''} onChange={v => set('chitNumber', v)} placeholder="e.g. KTM-2026-100 (from traffic police slip)" />
            </Field>
            <Field label="Fiscal Year" required>
              <Select value={form.fiscalYear ?? ''} onChange={v => set('fiscalYear', v)} placeholder="Select fiscal year" options={FISCAL_YEARS} />
            </Field>
            <Field label="Province" required>
              <Select value={form.province ?? ''} onChange={v => set('province', v)} placeholder="Select province" options={PROVINCES} />
            </Field>

            {!trafficResult ? (
              <button onClick={onCheckFine} disabled={trafficChecking}
                className="w-full py-3.5 bg-red-500 text-white font-bold rounded-2xl mt-1 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform">
                {trafficChecking ? <><Spinner size={18} /> Checking with traffic police...</> : '🔍 Check Fine'}
              </button>
            ) : (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mt-1">
                <p className="text-red-700 text-xs font-bold uppercase tracking-wide mb-2">Fine Details</p>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600 text-sm">Violation:</span>
                  <span className="text-gray-800 text-sm font-semibold">{trafficResult.violation}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600 text-sm">Amount Due:</span>
                  <span className="text-red-600 text-base font-bold">NPR {trafficResult.amount.toLocaleString()}</span>
                </div>
                <p className="text-amber-700 text-[11px] mt-2">⚠ Pay within 60 days to avoid additional penalties.</p>
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={onSave}
        disabled={saving || (category === 'traffic' && !trafficResult)}
        className="w-full py-4 bg-primary text-white font-bold rounded-2xl mt-8 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
      >
        {isValidating ? <><Spinner size={20} /> Verifying with {provider.name}...</> :
         saving       ? <><Spinner size={20} /> Saving...</>                         :
         category === 'traffic'   ? '💾 Save & Track Fine' :
         category === 'rent'      ? '🏠 Save Rent Account' :
         category === 'insurance' ? '🛡️ Save Insurance'   :
         isValidatable            ? '🔍 Verify & Save'     :
                                    '✓ Save Account'}
      </button>
      <p className="text-center text-gray-400 text-xs mt-3">
        {isValidatable
          ? 'Your Customer ID will be checked against the live merchant database'
          : 'Fields marked * are required'}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Success — 3 action buttons
// ─────────────────────────────────────────────────────────────────────────────
function Success({
  billerName, previewBill,
  onAddAnother, onGoToSmartBills, onPayNow, onSchedule,
}: {
  billerName: string;
  previewBill: { amount: number; dueDate: string; description: string } | null;
  onAddAnother:    () => void;
  onGoToSmartBills:() => void;
  onPayNow:        () => void;
  onSchedule:      () => void;
}) {
  const dueDate   = previewBill ? new Date(previewBill.dueDate) : null;
  const daysLeft  = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000) : null;
  const dueLabel  = daysLeft === null ? '' : daysLeft <= 0 ? '🔴 Overdue' : daysLeft === 1 ? '🟠 Due tomorrow' : `🟡 Due in ${daysLeft} days`;

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-5 animate-bounce">
        <span className="text-4xl">✅</span>
      </div>
      <h2 className="text-white font-bold text-2xl mb-1">Account verified!</h2>
      <p className="text-white/80 text-base font-semibold">{billerName}</p>

      {/* Bill preview from merchant */}
      {previewBill && (
        <div className="mt-5 bg-white/15 rounded-2xl px-5 py-4 w-full max-w-xs text-left">
          <p className="text-white/60 text-[10px] font-bold uppercase tracking-wide mb-2">Current Bill</p>
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/70 text-sm">Amount Due</span>
            <span className="text-white font-bold text-lg">NPR {previewBill.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/70 text-sm">Due Date</span>
            <span className="text-white font-semibold text-sm">
              {new Date(previewBill.dueDate).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {dueLabel && (
            <p className="text-white/80 text-xs mt-2 font-medium">{dueLabel}</p>
          )}
          <p className="text-white/50 text-[10px] mt-2 leading-relaxed">{previewBill.description}</p>
        </div>
      )}

      <p className="text-white/60 text-xs mt-4">
        You'll receive smart reminders before each bill is due.{'\n'}
        Bill notification will appear in ~20 seconds.
      </p>

      {/* ── 3 action buttons ── */}
      <div className="w-full max-w-xs mt-6 flex flex-col gap-3">
        {/* Pay Now — only if we have a bill to pay */}
        {previewBill && (
          <button
            onClick={onPayNow}
            className="w-full py-4 bg-white text-primary font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            ⚡ Pay Now  <span className="text-primary/70 text-sm font-normal">NPR {previewBill.amount.toLocaleString()}</span>
          </button>
        )}

        {/* Schedule */}
        <button
          onClick={onSchedule}
          className="w-full py-3.5 bg-white/20 border border-white/40 text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          📅 Schedule Payment
        </button>

        {/* Go to Smart Bills */}
        <button
          onClick={onGoToSmartBills}
          className="w-full py-3.5 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl active:scale-95 transition-transform"
        >
          📋 View in Smart Bills
        </button>

        <button
          onClick={onAddAnother}
          className="w-full py-3 text-white/70 text-sm font-medium"
        >
          + Add Another Account
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable form components
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 text-base focus:outline-none focus:border-primary focus:bg-white" />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 text-base focus:outline-none focus:border-primary focus:bg-white">
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
