import { Category, Order, Partner, User, Voucher } from '../types';

// Partner data
export const partners: Partner[] = [
  {
    id: '1',
    title: 'New Age Fotografie',
    logo: 'https://imgur.com/jvVH1ja.jpg',
    description: 'Professionelle Fotoshootings für jeden Anlass.'
  },
  {
    id: '2',
    title: 'Dreams Hotel',
    logo: 'https://imgur.com/gTX0qyn.jpg',
    description: 'Luxuriöse Unterkünfte für Ihren perfekten Aufenthalt.'
  },
  {
    id: '3',
    title: 'EventWorks',
    logo: 'https://imgur.com/2EsZmcP.jpg',
    description: 'Full-Service Eventplanung und Management.'
  }
];

// Categories
export const categories: Category[] = [
  'Familie',
  'Baby',
  'Schwangerschaft',
  'Hochzeit',
  'Business',
  'Event',
  'Immobilien'
];

// Voucher data
export const vouchers: Voucher[] = [
  {
    id: '1',
    title: "Vatertag Spezial Familienshooting",
    category: 'Familie',
    partner: partners[0],
    description: 'Spezielles Vatertag-Fotoshooting, das die besondere Bindung zwischen Vätern und ihren Kindern feiert. Inklusive Outdoor-Location mit natürlichem Licht und authentischen Momenten.',
    price: 295,
    discountPrice: 195,
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
    image: 'https://imgur.com/EOgBzhL.jpg',
    terms: '2 Jahre ab Kaufdatum gültig. Vatertag-Spezialpaket beinhaltet 15 bearbeitete Fotos und einen Premium-Print.',
    stock: 20,
    slug: 'vatertag-spezial'
  },
  {
    id: '2',
    title: 'Babybauch bis Baby Paket',
    category: 'Baby',
    partner: partners[0],
    description: 'Begleiten Sie Ihre Reise von der Schwangerschaft bis zum Neugeborenen mit zwei professionellen Fotoshootings. Beinhaltet ein Schwangerschaftsshooting (32.-36. Woche) und ein Neugeborenen-Shooting (innerhalb der ersten 14 Tage).',
    price: 295,
    discountPrice: 195,
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
    image: 'https://imgur.com/QcHVj4A.jpg',
    terms: '18 Monate ab Kaufdatum gültig. Beinhaltet sowohl Schwangerschafts- als auch Neugeborenen-Shooting mit je 20 bearbeiteten Fotos.',
    stock: 15,
    slug: 'babybauch-bis-baby'
  },
  {
    id: '3',
    title: 'Erster Geburtstag & Großeltern Spezial',
    category: 'Baby',
    partner: partners[0],
    description: 'Feiern Sie den ersten Geburtstag Ihres Kleinen mit einem besonderen Fotoshooting zusammen mit den Großeltern. Perfekt um drei Generationen und diese kostbaren Meilenstein-Momente festzuhalten.',
    price: 295,
    discountPrice: 195,
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
    image: 'https://imgur.com/puVF0cD.jpg',
    terms: '2 Jahre ab Kaufdatum gültig. Beinhaltet Cake-Smash-Setup und Familienporträts mit Großeltern. 25 bearbeitete Fotos inklusive.',
    stock: 25,
    slug: 'erster-geburtstag-grosseltern'
  }
];

// Orders data
export const orders: Order[] = [
  {
    id: '1',
    voucher: vouchers[0],
    quantity: 1,
    totalPrice: vouchers[0].discountPrice,
    purchaserName: 'John Doe',
    purchaserEmail: 'john@example.com',
    status: 'paid',
    voucherCode: 'FAM12345',
    createdAt: '2025-01-15'
  },
  {
    id: '2',
    voucher: vouchers[1],
    quantity: 1,
    totalPrice: vouchers[1].discountPrice,
    purchaserName: 'Jane Smith',
    purchaserEmail: 'jane@example.com',
    status: 'pending',
    voucherCode: 'ROM67890',
    createdAt: '2025-01-20'
  }
];

// User data
export const user: User = {
  id: '1',
  email: 'user@example.com',
  name: 'Demo User'
};