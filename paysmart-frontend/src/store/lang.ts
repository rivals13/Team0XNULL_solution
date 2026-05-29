/**
 * Language store — English ↔ Nepali toggle
 * Persisted to localStorage under key 'ps_lang'
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Lang = 'en' | 'ne';

interface LangStore {
  lang:    Lang;
  toggle:  () => void;
  setLang: (l: Lang) => void;
  t:       (key: string) => string;
}

// ── Translation dictionary ────────────────────────────────────────────────────
const NE: Record<string, string> = {
  // Navigation
  'Home':          'गृहपृष्ठ',
  'Statement':     'विवरण',
  'Smart Bills':   'स्मार्ट बिल',
  'Schedules':     'तालिका',
  'More':          'थप',

  // Dashboard
  'Good morning,': 'शुभ प्रभात,',
  'Good afternoon,':'शुभ दिन,',
  'Good evening,': 'शुभ साँझ,',
  'Hi,':           'नमस्ते,',
  'NPR Balance':   'रु. ब्यालेन्स',
  'Fonepoints':    'फोनपोइन्ट',
  'Reward History':'पुरस्कार इतिहास',
  'Upcoming Payments': 'आगामी भुक्तानी',
  'View All':      'सबै हेर्नुहोस्',
  'Add Schedule':  '+ तालिका थप्नुहोस्',
  'No pending bills': 'कुनै बाँकी बिल छैन',
  'Utility & Bill Payments': 'उपयोगिता र बिल भुक्तानी',
  'AI INSIGHT':    'एआई सुझाव',
  'Automate Now ✓':'अभी स्वचालित गर्नुहोस् ✓',
  'Dismiss':       'हटाउनुहोस्',

  // Smart Bills
  'Smart Utility Management Platform': 'स्मार्ट उपयोगिता व्यवस्थापन प्लेटफर्म',
  '+ Add':               '+ थप्नुहोस्',
  'View All →':          'सबै हेर्नुहोस् →',
  'No smart bills yet':  'अहिलेसम्म कुनै स्मार्ट बिल छैन',
  'Fetch Current Bill':  'हालको बिल ल्याउनुहोस्',
  'Schedule':            'तालिका',
  'Refresh Bill':        'बिल रिफ्रेस गर्नुहोस्',
  'Due Date':            'म्याद',
  'Bill Period':         'बिलिङ अवधि',
  'Units Used':          'खपत एकाइ',
  'Total Payable':       'कुल तिर्नुपर्ने',
  'OVERDUE':             'म्याद गुज्रिएको',
  'DUE TOMORROW':        'भोलि म्याद',
  'PAID':                'तिरिएको',

  // BillAlert / Payment (and shared keys)
  'Amount Due':          'बाँकी रकम',
  'Pay Now':             'अहिले तिर्नुहोस्',
  'Pay via':             'यसबाट तिर्नुहोस्',
  'Confirm Payment':     'भुक्तानी पुष्टि गर्नुहोस्',
  'Choose Payment Method': 'भुक्तानी विधि छान्नुहोस्',
  'Paying to':           'तिर्ने ठेगाना',
  'Payment Account':     'भुक्तानी खाता',
  'Schedule for Later':  'पछि तालिका गर्नुहोस्',
  'Remind Me Tomorrow':  'भोलि सम्झाउनुहोस्',
  'Processing...':       'प्रक्रिया भइरहेको छ...',
  'Payment Successful!': 'भुक्तानी सफल!',
  'Back to Home':        'गृहपृष्ठमा फर्कनुहोस्',

  // Schedule form
  'New Schedule':        'नयाँ तालिका',
  'Schedule Payment':    'भुक्तानी तालिका',
  'What do you want to schedule?': 'के तालिका गर्नुहुन्छ?',
  'Electricity':         'विद्युत',
  'Water':               'खानेपानी',
  'Internet':            'इन्टरनेट',
  'TV / Cable':          'टिभी / केबल',
  'Education':           'शिक्षा',
  'Traffic Fine':        'ट्राफिक जरिवाना',
  'Other':               'अन्य',
  'Schedule Name':       'तालिका नाम',
  'Amount (NPR)':        'रकम (रु.)',
  'Frequency':           'आवृत्ति',
  'Once':                'एकपटक',
  'One-time':            'एकपटक',
  'Monthly':             'मासिक',
  'Weekly':              'साप्ताहिक',
  'Quarterly':           'त्रैमासिक',
  'Yearly':              'वार्षिक',
  'Payment Preferences': 'भुक्तानी प्राथमिकता',
  'Enable Auto-Payment': 'स्वतः भुक्तानी सक्षम गर्नुहोस्',
  'SMS Reminder':        'एसएमएस सम्झाउने',
  'Due-Date Notifications': 'म्याद सूचना',
  'Allow Partial Payment': 'आंशिक भुक्तानी अनुमति',
  'Create Schedule':     'तालिका बनाउनुहोस्',
  'Schedule Created!':   'तालिका बनाइयो!',

  // Notifications
  'Notifications':       'सूचनाहरू',
  'Mark all read':       'सबै पढिएको चिन्ह लगाउनुहोस्',
  'All caught up!':      'सबै ठीक छ!',
  'Payment done':        'भुक्तानी भयो',
  'Scheduled for auto-payment': 'स्वतः भुक्तानीको लागि तालिका भयो',

  // Merchant
  'Merchant Dashboard':  'व्यापारी ड्यासबोर्ड',
  'Push Bill to Student': 'विद्यार्थीलाई बिल पठाउनुहोस्',
  'Push Bill':           'बिल पठाउनुहोस्',
  'Payment Settings':    'भुक्तानी सेटिङ',
  'eSewa ID':            'ईसेवा नम्बर',
  'Khalti ID':           'खल्ती नम्बर',
  'Bank Accounts':       'बैंक खाताहरू',
  'Add Bank Account':    'बैंक खाता थप्नुहोस्',
  'Save Settings':       'सेटिङ सुरक्षित गर्नुहोस्',

  // Misc
  'Loading...':          'लोड भइरहेको छ...',
  'Logout':              'लग आउट',
  'Register':            'दर्ता गर्नुहोस्',
  'Login':               'लग इन',
  'Back':                'फर्कनुहोस्',
  'Save':                'सुरक्षित गर्नुहोस्',
  'Cancel':              'रद्द गर्नुहोस्',
  'Verified':            'प्रमाणित',
};

function translate(key: string, lang: Lang): string {
  if (lang === 'en') return key;
  return NE[key] ?? key;
}

export const useLangStore = create<LangStore>()(
  persist(
    (set, get) => ({
      lang:   'en',
      toggle: () => set(s => ({ lang: s.lang === 'en' ? 'ne' : 'en' })),
      setLang:(l) => set({ lang: l }),
      t:      (key) => translate(key, get().lang),
    }),
    { name: 'ps_lang' },
  ),
);

/** Convenience hook — returns translator function t() and current lang */
export function useLang() {
  const { lang, toggle, t } = useLangStore();
  return { lang, toggle, t, isNepali: lang === 'ne' };
}
