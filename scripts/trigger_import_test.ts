import { storage } from '../server/storage';

(async () => {
  try {
    const session = {
      id: 'debug-test-001',
      title: 'Debug Test',
      description: 'Trigger createPhotographySession for diagnostics',
      sessionType: 'imported',
      status: 'confirmed',
      startTime: '2025-09-13T09:00:00.000Z',
      endTime: '2025-09-13T10:00:00.000Z',
      locationName: 'Studio',
      locationAddress: 'Studio Address',
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      clientPhone: '',
      basePrice: 0,
      depositAmount: 0,
      depositPaid: false,
      finalPayment: 0,
      finalPaymentPaid: false,
      paymentStatus: 'pending',
      conflictDetected: false,
      weatherDependent: false,
      goldenHourOptimized: false,
      portfolioWorthy: false,
      editingStatus: 'pending',
      deliveryStatus: 'pending',
      isRecurring: false,
      reminderSent: false,
      confirmationSent: false,
      followUpSent: false,
      isOnlineBookable: false,
      availabilityStatus: 'booked',
      priority: 'medium',
      isPublic: false,
      photographerId: 'imported',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    console.log('Calling storage.createPhotographySession with test session...');
    const res = await storage.createPhotographySession(session);
    console.log('Result:', res);
  } catch (err) {
    console.error('Error from createPhotographySession:', err);
  }
})();
