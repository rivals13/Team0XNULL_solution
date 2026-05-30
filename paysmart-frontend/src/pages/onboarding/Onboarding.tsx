import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { billerAccountsApi } from '../../api';
import Spinner from '../../components/Spinner';
import type { BillerCategory } from '../../types';

// ──────────────────────────────────────────────────────────────────────────────
// Onboarding flow — welcome → category → provider → details → success
// Routes:
//   /onboarding             → start at welcome screen (first-time users)
//   /onboarding?step=category → skip welcome (used by Dashboard "Add New Bill")
// localStorage key 'paysmart_onboarded' = 'true' once user clicks Get Started
// or Maybe Later from the welcome screen.
// ──────────────────────────────────────────────────────────────────────────────

const ONBOARDING_KEY = 'paysmart_onboarded';

type Step = 'welcome' | 'category' | 'provider' | 'details' | 'success';

interface Provider {
  slug: string;
  name: string;
  description: string;
}

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
      { slug: 'worldlink',      name: 'WorldLink',        description: 'WorldLink Communications Pvt. Ltd.' },
      { slug: 'cgnet',          name: 'CG Net',            description: 'CG Digital / CG Communications' },
      { slug: 'subisu',         name: 'Subisu',            description: 'Subisu CableNet Pvt. Ltd.' },
      { slug: 'vianet',         name: 'Vianet',            description: 'Vianet Communications Pvt. Ltd.' },
      { slug: 'dishome-fiber',  name: 'DishHome Fiber',    description: 'DishHome Broadband (Fiber)' },
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
      { slug: 'school-fee', name: 'School Fee Payment', description: 'Primary / Secondary schools' },
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
      { slug: 'nepal-life',  name: 'Nepal Life Insurance',    description: 'Nepal Life Insurance Company Ltd.' },
      { slug: 'prime-life',  name: 'Prime Life Insurance',    description: 'Prime Life Insurance Company Ltd.' },
      { slug: 'nlic',        name: 'NLIC',                    description: 'National Life Insurance Co. Ltd.' },
      { slug: 'prabhu-life', name: 'Prabhu Life Insurance',   description: 'Prabhu Life Insurance Co. Ltd.' },
      { slug: 'other-insurance', name: 'Other Insurance',     description: 'Any other insurance company' },
    ],
  },
];

const FISCAL_YEARS = ['2080/81', '2081/82', '2082/83'];
const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];

// ──────────────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialStep: Step = (params.get('step') as Step) ?? 'welcome';

  const [step, setStep]           = useState<Step>(initialStep);
  const [category, setCategory]   = useState<BillerCategory | null>(null);
  const [provider, setProvider]   = useState<Provider | null>(null);
  const [form, setForm]           = useState<Record<string, string>>({});
  const [trafficResult, setTrafficResult] = useState<{ violation: string; amount: number } | null>(null);
  const [trafficChecking, setTrafficChecking] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [savedBillerName, setSavedBillerName] = useState('');

  const reset = () => {
    setCategory(null); setProvider(null); setForm({});
    setTrafficResult(null); setError(''); setSavedBillerName('');
  };

  const markOnboarded = () => localStorage.setItem(ONBOARDING_KEY, 'true');

  // ── Step handlers ──
  const goToCategory = () => { markOnboarded(); setStep('category'); };
  const goToDashboard = () => { markOnboarded(); navigate('/dashboard'); };

  const pickCategory = (c: BillerCategory) => {
    setCategory(c);
    const cat = CATEGORIES.find(x => x.id === c)!;
    // If category has only 1 provider, skip the provider step
    if (cat.providers.length === 1) {
      setProvider(cat.providers[0]);
      setStep('details');
    } else {
      setStep('provider');
    }
  };

  const pickProvider = (p: Provider) => { setProvider(p); setStep('details'); };

  // ── Traffic fine "Check Fine" simulator ──
  const checkTrafficFine = () => {
    setError('');
    if (!form.chitNumber?.trim())   return setError('Chit number is required');
    if (!form.fiscalYear)            return setError('Please select fiscal year');
    if (!form.province)              return setError('Please select province');

    setTrafficChecking(true);
    setTimeout(() => {
      // Deterministic mock based on chit number
      const seed = form.chitNumber.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const violations = [
        'Riding without helmet', 'Over-speeding', 'Lane indiscipline',
        'Signal violation', 'No-parking zone',
      ];
      setTrafficResult({
        violation: violations[seed % violations.length],
        amount: 500 + (seed % 5) * 500,  // NPR 500 – 2500
      });
      setTrafficChecking(false);
    }, 1200);
  };

  // ── Save ──
  const save = async () => {
    setError('');
    if (!validate()) return;
    if (!provider || !category) return;

    setSaving(true);
    try {
      const { customerId, ...details } = form;
      // Include the traffic-fine lookup result in details if present
      const fullDetails: Record<string, unknown> = { ...details };
      if (trafficResult) {
        fullDetails.violation = trafficResult.violation;
        fullDetails.fineAmount = trafficResult.amount;
      }

      // For rent, store extra details so the dashboard Rent card can display them
      if (category === 'rent') {
        fullDetails.landlordName    = form.landlordName;
        fullDetails.propertyAddress = form.propertyAddress;
        fullDetails.rentAmount      = Number(form.rentAmount);
        fullDetails.dueDay          = form.dueDay || '1';
      }

      const created = await billerAccountsApi.create({
        billerName:    category === 'rent' ? `Rent — ${form.propertyAddress}` : provider.name,
        billerSlug:    provider.slug,
        billerCategory: category,
        customerId:    customerId || form.landlordName || form.policyNumber
                        || form.chitNumber || form.studentId || form.clientCode || '',
        details:       fullDetails,
      });
      setSavedBillerName(created.billerName);
      setStep('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to save. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  /** Category-specific validation with Nepal-English error messages. */
  const validate = (): boolean => {
    setError('');
    if (category === 'electricity') {
      if (!form.customerId?.trim()) { setError('SC No. is required for NEA payment'); return false; }
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
      if (!form.landlordName?.trim())    { setError('Landlord name is required'); return false; }
      if (!form.propertyAddress?.trim()) { setError('Property address is required'); return false; }
      if (!form.rentAmount?.trim() || Number(form.rentAmount) <= 0) {
        setError('Please enter monthly rent amount (NPR)'); return false;
      }
    } else if (category === 'insurance') {
      if (!form.policyNumber?.trim()) { setError('Policy number is required'); return false; }
    }
    return true;
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-white">
      {step === 'welcome'  && <Welcome  onStart={goToCategory} onLater={goToDashboard} />}
      {step === 'category' && <CategoryGrid onPick={pickCategory} onBack={() => navigate('/dashboard')} />}
      {step === 'provider' && <ProviderList category={category!} onPick={pickProvider} onBack={() => setStep('category')} />}
      {step === 'details'  && (
        <DetailsForm
          category={category!} provider={provider!}
          form={form} setForm={setForm}
          error={error} saving={saving}
          trafficResult={trafficResult} trafficChecking={trafficChecking}
          onCheckFine={checkTrafficFine}
          onBack={() => { reset(); setStep('category'); }}
          onSave={save}
        />
      )}
      {step === 'success'  && (
        <Success
          billerName={savedBillerName}
          onAddAnother={() => { reset(); setStep('category'); }}
          onDone={() => navigate('/dashboard')}
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
        <button
          onClick={onStart}
          className="w-full py-4 bg-white text-primary font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-transform mb-3"
        >
          Get Started
        </button>
        <button
          onClick={onLater}
          className="w-full py-3 text-white/80 text-sm font-medium hover:text-white"
        >
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
        <button onClick={onBack} className="text-2xl text-gray-700">←</button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">What do you pay?</h2>
          <p className="text-gray-500 text-sm mt-0.5">Select a service category to set up smart bills</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 ${c.color} active:scale-95 transition-transform`}
          >
            <span className="text-5xl">{c.emoji}</span>
            <span className="font-bold text-sm text-gray-800 text-center leading-tight">{c.label}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 mt-10">
        Same green & white grid layout as eSewa
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Provider list (for categories with >1 provider)
// ─────────────────────────────────────────────────────────────────────────────
function ProviderList({
  category, onPick, onBack,
}: { category: BillerCategory; onPick: (p: Provider) => void; onBack: () => void }) {
  const cat = CATEGORIES.find(c => c.id === category)!;
  return (
    <div className="min-h-screen bg-white px-5 pt-12 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-2xl text-gray-700">←</button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Select provider</h2>
          <p className="text-gray-500 text-sm mt-0.5">{cat.label}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {cat.providers.map(p => (
          <button
            key={p.slug}
            onClick={() => onPick(p)}
            className="w-full p-5 rounded-2xl border border-gray-200 bg-gray-50 hover:border-primary hover:bg-green-50 text-left active:scale-[0.98] transition-all flex items-center gap-4"
          >
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
// Step 4: Details form (varies by category)
// ─────────────────────────────────────────────────────────────────────────────
function DetailsForm({
  category, provider, form, setForm, error, saving,
  trafficResult, trafficChecking, onCheckFine, onBack, onSave,
}: {
  category: BillerCategory; provider: Provider;
  form: Record<string, string>; setForm: (f: Record<string, string>) => void;
  error: string; saving: boolean;
  trafficResult: { violation: string; amount: number } | null;
  trafficChecking: boolean;
  onCheckFine: () => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  return (
    <div className="min-h-screen bg-white px-5 pt-12 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-2xl text-gray-700">←</button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800">{provider.name}</h2>
          <p className="text-gray-500 text-xs mt-0.5">{provider.description}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* ───────── NEA Electricity ───────── */}
        {category === 'electricity' && (
          <>
            <Field label="Customer ID / SC No." required>
              <Input value={form.customerId ?? ''} onChange={v => set('customerId', v)} placeholder="e.g. 1234567" />
            </Field>
            <Field label="Office Code" required>
              <Input value={form.officeCode ?? ''} onChange={v => set('officeCode', v)} placeholder="e.g. 01" />
            </Field>
          </>
        )}

        {/* ───────── KUKL Khanepani ───────── */}
        {category === 'water' && (
          <>
            <Field label="Client Code" required>
              <Input value={form.clientCode ?? ''} onChange={v => set('clientCode', v)} placeholder="Your KUKL client code" />
            </Field>
            <Field label="Area Code" hint="Optional">
              <Input value={form.areaCode ?? ''} onChange={v => set('areaCode', v)} placeholder="e.g. 02" />
            </Field>
          </>
        )}

        {/* ───────── Internet ───────── */}
        {category === 'internet' && (
          <>
            <Field label="Customer ID / Username" required>
              <Input
                value={form.customerId ?? ''}
                onChange={v => set('customerId', v)}
                placeholder="e.g. WL-12345 or your login username"
              />
            </Field>
            <Field label="Registered Phone Number" required>
              <Input
                value={form.phone ?? ''}
                onChange={v => set('phone', v)}
                placeholder="e.g. 9801234567"
              />
            </Field>
            <Field label="Internet Package" hint="Optional">
              <Select
                value={form.package ?? ''}
                onChange={v => set('package', v)}
                placeholder="Select your package"
                options={['25 Mbps Unlimited', '50 Mbps Unlimited', '100 Mbps Unlimited', '200 Mbps Business', 'Other']}
              />
            </Field>
            <Field label="Nickname" hint="Optional">
              <Input
                value={form.nickname ?? ''}
                onChange={v => set('nickname', v)}
                placeholder='e.g. "Home WiFi" or "Office Internet"'
              />
            </Field>
          </>
        )}

        {/* ───────── TV / Cable ───────── */}
        {category === 'tv' && (
          <>
            <Field label="Smart Card No. / Subscriber ID" required>
              <Input
                value={form.customerId ?? ''}
                onChange={v => set('customerId', v)}
                placeholder="e.g. 1234567890 (on your set-top box)"
              />
            </Field>
            <Field label="Registered Phone Number" hint="Optional">
              <Input
                value={form.phone ?? ''}
                onChange={v => set('phone', v)}
                placeholder="e.g. 9801234567"
              />
            </Field>
            <Field label="TV Package" hint="Optional">
              <Select
                value={form.package ?? ''}
                onChange={v => set('package', v)}
                placeholder="Select your package"
                options={['Family Pack', 'Sports Pack', 'Premium Pack', 'Basic Pack', 'Other']}
              />
            </Field>
            <Field label="Nickname" hint="Optional">
              <Input
                value={form.nickname ?? ''}
                onChange={v => set('nickname', v)}
                placeholder='e.g. "Home TV" or "Living Room"'
              />
            </Field>
          </>
        )}

        {/* ───────── School / College Fee ───────── */}
        {category === 'education' && (
          <>
            <Field
              label={provider.slug === 'school-fee' ? 'School Name' : 'College Name'}
              required
            >
              <Input
                value={form.institutionName ?? ''}
                onChange={v => set('institutionName', v)}
                placeholder={provider.slug === 'school-fee' ? 'e.g. Himalayan Whitehouse' : 'e.g. LBEF, Tribhuvan Univ.'}
              />
            </Field>
            <Field label="Student ID / Registration Number" required>
              <Input value={form.studentId ?? ''} onChange={v => set('studentId', v)} placeholder="e.g. STU-2024-1234" />
            </Field>
            <Field
              label={provider.slug === 'school-fee' ? 'Class / Grade' : 'Program / Faculty'}
              required
            >
              <Input
                value={form.classOrProgram ?? ''}
                onChange={v => set('classOrProgram', v)}
                placeholder={provider.slug === 'school-fee' ? 'e.g. Grade 10' : 'e.g. BSc IT, BBA'}
              />
            </Field>
          </>
        )}

        {/* ───────── House Rent ───────── */}
        {category === 'rent' && (
          <>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex gap-3 items-start mb-1">
              <span className="text-orange-500 text-xl">🏠</span>
              <div>
                <p className="text-orange-700 text-sm font-bold">Monthly Rent Tracker</p>
                <p className="text-orange-600 text-xs mt-0.5">
                  You'll get a reminder 3 days before rent is due each month.
                </p>
              </div>
            </div>
            <Field label="Landlord Name" required>
              <Input value={form.landlordName ?? ''} onChange={v => set('landlordName', v)} placeholder="e.g. Ram Prasad Sharma" />
            </Field>
            <Field label="Property Address" required>
              <Input value={form.propertyAddress ?? ''} onChange={v => set('propertyAddress', v)} placeholder="e.g. Baluwatar-4, Kathmandu" />
            </Field>
            <Field label="Monthly Rent Amount (NPR)" required>
              <input
                type="number" min="1" step="1"
                value={form.rentAmount ?? ''}
                onChange={e => set('rentAmount', e.target.value)}
                placeholder="e.g. 15000"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 text-base focus:outline-none focus:border-primary focus:bg-white"
              />
            </Field>
            <Field label="Rent Due Day of Month" hint="Optional">
              <Select
                value={form.dueDay ?? ''}
                onChange={v => set('dueDay', v)}
                placeholder="Select due day"
                options={['1st', '5th', '7th', '10th', '15th', '20th', '25th', 'Last day']}
              />
            </Field>
            <Field label="Landlord's eSewa / Bank No." hint="Optional">
              <Input value={form.landlordPayment ?? ''} onChange={v => set('landlordPayment', v)} placeholder="Landlord eSewa number or bank account" />
            </Field>
          </>
        )}

        {/* ───────── Insurance ───────── */}
        {category === 'insurance' && (
          <>
            <Field label="Policy Number" required>
              <Input value={form.policyNumber ?? ''} onChange={v => set('policyNumber', v)} placeholder="e.g. NLI-2026-001234" />
            </Field>
            <Field label="Sum Assured / Plan Name" hint="Optional">
              <Input value={form.planName ?? ''} onChange={v => set('planName', v)} placeholder="e.g. Endowment Plan, 15-year term" />
            </Field>
            <Field label="Premium Amount (NPR)" hint="Optional">
              <input
                type="number" min="1" step="1"
                value={form.premiumAmount ?? ''}
                onChange={e => set('premiumAmount', e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 text-base focus:outline-none focus:border-primary focus:bg-white"
              />
            </Field>
            <Field label="Premium Frequency" hint="Optional">
              <Select
                value={form.premiumFrequency ?? ''}
                onChange={v => set('premiumFrequency', v)}
                placeholder="Select frequency"
                options={['Monthly', 'Quarterly', 'Half-yearly', 'Annually']}
              />
            </Field>
            <Field label="Registered Phone Number" hint="Optional">
              <Input value={form.phone ?? ''} onChange={v => set('phone', v)} placeholder="e.g. 9801234567" />
            </Field>
          </>
        )}

        {/* ───────── Traffic Fine (e-Challan) ───────── */}
        {category === 'traffic' && (
          <>
            <Field label="Chit Number / Slip Number" required>
              <Input
                value={form.chitNumber ?? ''}
                onChange={v => set('chitNumber', v)}
                placeholder="Enter chit number from traffic police slip"
              />
            </Field>
            <Field label="Fiscal Year" required>
              <Select
                value={form.fiscalYear ?? ''}
                onChange={v => set('fiscalYear', v)}
                placeholder="Select fiscal year"
                options={FISCAL_YEARS}
              />
            </Field>
            <Field label="Province" required>
              <Select
                value={form.province ?? ''}
                onChange={v => set('province', v)}
                placeholder="Select province"
                options={PROVINCES}
              />
            </Field>

            {!trafficResult ? (
              <button
                onClick={onCheckFine}
                disabled={trafficChecking}
                className="w-full py-3.5 bg-red-500 text-white font-bold rounded-2xl mt-1 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
              >
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
                <p className="text-amber-700 text-[11px] mt-2 leading-relaxed">
                  ⚠ Pay within 60 days to avoid additional penalties.
                </p>
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
        {saving ? <><Spinner size={20} /> Saving...</> :
          category === 'traffic'   ? '💾 Save & Track Fine' :
          category === 'rent'      ? '🏠 Save Rent Account' :
          category === 'insurance' ? '🛡️ Save Insurance'   :
          '✓ Verify & Save'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Success
// ─────────────────────────────────────────────────────────────────────────────
function Success({
  billerName, onAddAnother, onDone,
}: { billerName: string; onAddAnother: () => void; onDone: () => void }) {
  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-8 text-center">
      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <span className="text-5xl">✅</span>
      </div>
      <h2 className="text-white font-bold text-3xl mb-2">Account added successfully!</h2>
      <p className="text-white/80 text-base">{billerName}</p>
      <p className="text-white/60 text-sm mt-3">You'll get smart reminders before each bill is due.</p>

      <div className="w-full max-w-md mt-10 flex flex-col gap-3">
        <button onClick={onAddAnother} className="w-full py-4 bg-white/15 border border-white/30 text-white font-bold rounded-2xl">
          + Add Another
        </button>
        <button onClick={onDone} className="w-full py-4 bg-white text-primary font-bold rounded-2xl shadow-lg">
          Done
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable form bits
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-gray-400 text-xs font-normal">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 text-base focus:outline-none focus:border-primary focus:bg-white"
    />
  );
}

function Select({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-800 text-base focus:outline-none focus:border-primary focus:bg-white"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper used by other pages: did the user finish (or skip) onboarding?
// ─────────────────────────────────────────────────────────────────────────────
export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
