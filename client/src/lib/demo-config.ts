// Demo configuration and sample data
export const DEMO_CONFIG = {
  isDemoMode: import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true',
  demoUser: {
    id: 'demo-user-1',
    email: 'demo@newagefotografie.com',
    name: 'Demo Photographer',
    isAdmin: true
  },
  restrictions: {
    maxClients: 50,
    maxGalleries: 20,
    maxInvoices: 25,
    canDelete: false,
    canExport: false,
    paymentsEnabled: false
  }
};

export const DEMO_SAMPLE_DATA = {
  clients: [
    {
      id: '1',
      name: 'Maria & Johann Schmidt',
      email: 'maria.schmidt@email.com',
      phone: '+43 664 123 4567',
      status: 'active',
      totalValue: 1250.00,
      lastSession: '2024-12-15',
      notes: 'Family portraits, expecting second child in spring',
      address: 'Mariahilfer Str. 45, 1060 Wien'
    },
    {
      id: '2', 
      name: 'Lisa & David Weber',
      email: 'lisa.weber@email.com',
      phone: '+43 699 987 6543',
      status: 'lead',
      totalValue: 0,
      lastSession: null,
      notes: 'Interested in wedding photography package',
      address: 'Praterstraße 12, 1020 Wien'
    },
    {
      id: '3',
      name: 'Anna Müller',
      email: 'anna.mueller@email.com', 
      phone: '+43 676 555 1234',
      status: 'active',
      totalValue: 890.00,
      lastSession: '2024-11-28',
      notes: 'Newborn session, very happy with results',
      address: 'Leopoldsgasse 8, 1020 Wien'
    }
  ],
  
  galleries: [
    {
      id: '1',
      title: 'Schmidt Family Winter Session',
      description: 'Beautiful winter family portraits in Schönbrunn Gardens',
      clientId: '1',
      isPublic: true,
      password: null,
      imageCount: 24,
      createdAt: '2024-12-15',
      coverImage: '/demo-images/schmidt-family-cover.jpg'
    },
    {
      id: '2',
      title: 'Baby Anna - Newborn Session',
      description: 'Sweet newborn photos with family',
      clientId: '3', 
      isPublic: false,
      password: 'anna2024',
      imageCount: 18,
      createdAt: '2024-11-28',
      coverImage: '/demo-images/newborn-anna-cover.jpg'
    }
  ],

  invoices: [
    {
      id: '1',
      clientId: '1',
      number: 'INV-2024-001',
      amount: 650.00,
      status: 'paid',
      dueDate: '2024-12-30',
      description: 'Family Portrait Session + Digital Gallery',
      items: [
        { description: 'Family Portrait Session (2 hours)', amount: 350.00 },
        { description: 'Digital Gallery (25 edited photos)', amount: 300.00 }
      ]
    },
    {
      id: '2',
      clientId: '3',
      number: 'INV-2024-002', 
      amount: 890.00,
      status: 'paid',
      dueDate: '2024-12-15',
      description: 'Newborn Session + Premium Package',
      items: [
        { description: 'Newborn Session (3 hours)', amount: 450.00 },
        { description: 'Premium Editing (20 photos)', amount: 290.00 },
        { description: 'Print Package (5x7 prints)', amount: 150.00 }
      ]
    }
  ],

  sessions: [
    {
      id: '1',
      title: 'Schmidt Family Portraits',
      clientId: '1',
      date: '2024-12-15',
      time: '14:00',
      duration: 120,
      location: 'Schönbrunn Gardens',
      type: 'family',
      status: 'completed',
      photographer: 'Demo Photographer',
      notes: 'Beautiful natural light, family was very cooperative'
    },
    {
      id: '2',
      title: 'Weber Wedding Consultation', 
      clientId: '2',
      date: '2025-01-10',
      time: '16:00',
      duration: 60,
      location: 'Studio',
      type: 'consultation',
      status: 'scheduled',
      photographer: 'Demo Photographer',
      notes: 'Discuss wedding package options and timeline'
    }
  ]
};

export const getDemoData = (type: keyof typeof DEMO_SAMPLE_DATA) => {
  return DEMO_CONFIG.isDemoMode ? DEMO_SAMPLE_DATA[type] : [];
};

export const isDemoRestricted = (action: string): boolean => {
  if (!DEMO_CONFIG.isDemoMode) return false;
  
  const restrictions = DEMO_CONFIG.restrictions;
  
  switch (action) {
    case 'delete':
      return !restrictions.canDelete;
    case 'export':
      return !restrictions.canExport;
    case 'payment':
      return !restrictions.paymentsEnabled;
    default:
      return false;
  }
};