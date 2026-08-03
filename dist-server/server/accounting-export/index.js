"use strict";
/**
 * Accounting Export Module - Main Index
 * Entry point for the TogNinja Accounting Export (AEX) system
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountingExportRouter = exports.DATEVCSVAdapter = exports.XeroCSVAdapter = exports.AccountingExportManager = exports.CLSTransformer = void 0;
__exportStar(require("./types"), exports);
var transformer_1 = require("./transformer");
Object.defineProperty(exports, "CLSTransformer", { enumerable: true, get: function () { return transformer_1.CLSTransformer; } });
var manager_1 = require("./manager");
Object.defineProperty(exports, "AccountingExportManager", { enumerable: true, get: function () { return manager_1.AccountingExportManager; } });
var csv_xero_1 = require("./adapters/csv-xero");
Object.defineProperty(exports, "XeroCSVAdapter", { enumerable: true, get: function () { return csv_xero_1.XeroCSVAdapter; } });
var csv_datev_1 = require("./adapters/csv-datev");
Object.defineProperty(exports, "DATEVCSVAdapter", { enumerable: true, get: function () { return csv_datev_1.DATEVCSVAdapter; } });
// Export router as default
var routes_1 = require("./routes");
Object.defineProperty(exports, "accountingExportRouter", { enumerable: true, get: function () { return __importDefault(routes_1).default; } });
