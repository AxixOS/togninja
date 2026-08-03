"use strict";
/**
 * Trigger Listener
 *
 * Monitors CRM events and automatically starts workflows based on triggers:
 * - new_client: When a new client is created
 * - booking_confirmed: When a booking is confirmed
 * - invoice_sent: When an invoice is sent
 * - gallery_uploaded: When a gallery is uploaded
 * - time_based: Scheduled workflows (cron-like)
 *
 * Integrates with WorkflowExecutionService to start workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerListener = void 0;
const events_1 = require("events");
const WorkflowExecutionService_1 = require("./WorkflowExecutionService");
class TriggerListener extends events_1.EventEmitter {
    constructor() {
        super();
        this.setupEventListeners();
    }
    /**
     * Set up event listeners for all trigger types
     */
    setupEventListeners() {
        // Listen for new client events
        this.on('new_client', async (data) => {
            console.log('[TriggerListener] New client trigger:', data.clientId);
            await WorkflowExecutionService_1.workflowExecutionService.handleTrigger('new_client', data);
        });
        // Listen for booking confirmed events
        this.on('booking_confirmed', async (data) => {
            console.log('[TriggerListener] Booking confirmed trigger:', data.bookingId);
            await WorkflowExecutionService_1.workflowExecutionService.handleTrigger('booking_confirmed', data);
        });
        // Listen for invoice sent events
        this.on('invoice_sent', async (data) => {
            console.log('[TriggerListener] Invoice sent trigger:', data.invoiceId);
            await WorkflowExecutionService_1.workflowExecutionService.handleTrigger('invoice_sent', data);
        });
        // Listen for gallery uploaded events
        this.on('gallery_uploaded', async (data) => {
            console.log('[TriggerListener] Gallery uploaded trigger:', data.galleryId);
            await WorkflowExecutionService_1.workflowExecutionService.handleTrigger('gallery_uploaded', data);
        });
        console.log('[TriggerListener] Event listeners initialized');
    }
    /**
     * Trigger a workflow event
     */
    trigger(type, data) {
        console.log(`[TriggerListener] Emitting ${type} event`);
        this.emit(type, data);
    }
    /**
     * Helper methods for common triggers
     */
    triggerNewClient(clientId) {
        this.trigger('new_client', { clientId });
    }
    triggerBookingConfirmed(bookingId, clientId) {
        this.trigger('booking_confirmed', { bookingId, clientId });
    }
    triggerInvoiceSent(invoiceId, clientId) {
        this.trigger('invoice_sent', { invoiceId, clientId });
    }
    triggerGalleryUploaded(galleryId, clientId) {
        this.trigger('gallery_uploaded', { galleryId, clientId });
    }
}
// Export singleton instance
exports.triggerListener = new TriggerListener();
/**
 * INTEGRATION GUIDE
 *
 * To integrate triggers into existing routes, add these calls:
 *
 * 1. In client creation route (server/routes.ts or CRM routes):
 *    ```typescript
 *    import { triggerListener } from './services/TriggerListener';
 *
 *    // After creating client
 *    const newClient = await db.insert(clients).values(...).returning();
 *    triggerListener.triggerNewClient(newClient[0].id);
 *    ```
 *
 * 2. In booking confirmation route:
 *    ```typescript
 *    // After confirming booking
 *    await db.update(bookings).set({ status: 'confirmed' }).where(...);
 *    triggerListener.triggerBookingConfirmed(bookingId, clientId);
 *    ```
 *
 * 3. In invoice send route:
 *    ```typescript
 *    // After sending invoice
 *    await emailService.sendInvoice(invoiceId);
 *    triggerListener.triggerInvoiceSent(invoiceId, clientId);
 *    ```
 *
 * 4. In gallery upload route:
 *    ```typescript
 *    // After uploading gallery
 *    const gallery = await db.insert(galleries).values(...).returning();
 *    triggerListener.triggerGalleryUploaded(gallery[0].id, clientId);
 *    ```
 */
