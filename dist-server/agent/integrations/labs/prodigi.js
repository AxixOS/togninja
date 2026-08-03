"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitProdigiOrder = submitProdigiOrder;
exports.getProdigiOrder = getProdigiOrder;
exports.mapProductToProdigi = mapProductToProdigi;
const node_fetch_1 = __importDefault(require("node-fetch"));
const base = process.env.PRODIGI_ENDPOINT || "https://api.sandbox.prodigi.com/v4.0";
const key = process.env.PRODIGI_API_KEY;
async function submitProdigiOrder(order) {
    if (!key) {
        throw new Error("PRODIGI_API_KEY environment variable is required");
    }
    console.log('🖨️ Submitting Prodigi order:', order.idempotencyKey);
    const res = await (0, node_fetch_1.default)(`${base}/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": key
        },
        body: JSON.stringify(order)
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Prodigi API error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    const response = await res.json();
    console.log('✅ Prodigi order created:', response.id, 'status:', response.status);
    return response;
}
async function getProdigiOrder(orderId) {
    if (!key) {
        throw new Error("PRODIGI_API_KEY environment variable is required");
    }
    const res = await (0, node_fetch_1.default)(`${base}/orders/${orderId}`, {
        method: "GET",
        headers: {
            "X-API-Key": key
        }
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Prodigi API error: ${res.status} ${res.statusText} - ${errorText}`);
    }
    return res.json();
}
// Map gallery products to Prodigi SKUs
function mapProductToProdigi(productSku) {
    const skuMapping = {
        'PRINT-A4': 'GLOBAL-PHO-210X297-0350-GLOSS', // A4 Photo Print
        'PRINT-A3': 'GLOBAL-PHO-297X420-0350-GLOSS', // A3 Photo Print
        'CANVAS-40x60': 'GLOBAL-CAN-400X600-0380-1', // Canvas 40x60cm
        'CANVAS-50x70': 'GLOBAL-CAN-500X700-0380-1', // Canvas 50x70cm
        'PRINT-20x30': 'GLOBAL-PHO-200X300-0350-GLOSS', // 20x30cm Photo Print
        'FRAME-A4-WOOD': 'GLOBAL-FRA-210X297-WOOD-BLK', // A4 Wooden Frame
        'DIGITAL-PACK-10': 'DIGITAL' // Digital delivery (not physical)
    };
    return skuMapping[productSku] || productSku;
}
