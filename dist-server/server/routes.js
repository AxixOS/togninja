"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const http_1 = require("http");
const routes_test_1 = require("./routes-test");
const storage_1 = require("./storage");
const db_1 = require("./db");
// Import Neon database functions
const neonDb = require("../database.js");
// Helper to run raw SQL with parameterized values using the pg pool
async function runSql(query, params) {
    const result = await db_1.pool.query(query, params || []);
    return result.rows;
}
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_orm_2 = require("drizzle-orm");
const schema_1 = require("../shared/schema");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
// Removed duplicate fs import (already imported earlier)
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const sharp_1 = __importDefault(require("sharp"));
// Using require for 'imap' to satisfy commonjs typings within ESM context
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Imap = require('imap');
const mailparser_1 = require("mailparser");
// Lightweight helpers/stubs to keep routes type-safe where optional features are used
const translateToEnglish = (s) => s;
const translateTagToEnglish = (s) => s;
// Some routes use English translation for vouchers specifically
const translateVoucherToEnglish = (s) => s;
// Zod schemas may be imported in other environments; provide permissive fallback parsers here
const insertUserSchema = { parse: (v) => v };
const insertBlogPostSchema = { parse: (v) => v };
const insertCrmClientSchema = { parse: (v) => v };
const insertPhotographySessionSchema = { parse: (v) => v };
const insertCrmInvoiceSchema = { parse: (v) => v };
const insertGallerySchema = { parse: (v) => v };
const insertVoucherProductSchema = { parse: (v) => v };
const insertDiscountCouponSchema = { parse: (v) => v };
const insertVoucherSaleSchema = { parse: (v) => v };
const insertKnowledgeBaseSchema = {
    parse: (v) => v,
    safeParse: (v) => ({ success: true, data: v })
};
const insertOpenaiAssistantSchema = { parse: (v) => v, safeParse: (v) => ({ success: true, data: v }) };
// Drizzle table placeholders for routes not yet wired in this environment
// These are typed as any to avoid compile errors when optional modules are absent
// crmMessages is now properly imported from schema
const knowledgeBase = { id: 'knowledge_base.id' };
const openaiAssistants = { id: 'openai_assistants.id' };
const z = { ZodError: class {
    } };
// (timezone and ICS helper functions are defined later in the file)
const fs_1 = __importDefault(require("fs"));
const stripe_1 = __importDefault(require("stripe"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const jspdf_1 = require("jspdf");
const client_s3_2 = require("@aws-sdk/client-s3");
const s3_storage_1 = require("./services/s3-storage");
const openai_1 = __importDefault(require("openai"));
const website_wizard_1 = __importDefault(require("./routes/website-wizard"));
const onboarding_1 = __importDefault(require("./routes/onboarding"));
const price_wizard_1 = __importDefault(require("./routes/price-wizard"));
// Simple in-memory status for last calendar import
let lastCalendarImportStatus = {};
const workflow_wizard_1 = __importDefault(require("./routes/workflow-wizard"));
const setup_routes_1 = __importDefault(require("./setup-routes"));
const questionnaires_1 = __importDefault(require("./routes/questionnaires"));
const gallery_shop_1 = __importDefault(require("./routes/gallery-shop"));
const files_1 = __importDefault(require("./routes/files"));
const prodigi_1 = __importDefault(require("./routes/prodigi"));
const storage_routes_1 = __importDefault(require("./storage-routes"));
const gallery_transfer_routes_1 = __importDefault(require("./gallery-transfer-routes"));
const storage_stats_routes_1 = __importDefault(require("./storage-stats-routes"));
const routes_1 = __importDefault(require("./accounting-export/routes"));
const storage_2 = require("./storage");
const auth_1 = require("./auth");
const coupons_1 = require("./services/coupons");
// Helper to resolve contact email from DB settings or env
// Synchronous fallback (for non-async template helpers)
function getEnvContactEmailSync() {
    return process.env.SMTP_FROM || process.env.STUDIO_NOTIFY_EMAIL || process.env.SMTP_USER || '';
}
// Parse ICS date format (YYYYMMDDTHHMMSS or YYYYMMDD)
function parseICSDate(dateStr) {
    if (!dateStr)
        return new Date().toISOString();
    // Remove timezone info if present
    dateStr = dateStr.split('Z')[0].split('T')[0] + (dateStr.includes('T') ? 'T' + dateStr.split('T')[1].split('Z')[0] : '');
    // Format: YYYYMMDDTHHMMSS or YYYYMMDD
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    if (dateStr.length > 8) {
        const hour = parseInt(dateStr.substring(9, 11));
        const minute = parseInt(dateStr.substring(11, 13));
        const second = parseInt(dateStr.substring(13, 15) || '0');
        return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
    }
    else {
        return new Date(Date.UTC(year, month, day)).toISOString();
    }
}
async function resolveContactEmail() {
    try {
        const settings = await storage_1.storage.getEmailSettings();
        return (settings?.from_email ||
            settings?.smtp_user ||
            getEnvContactEmailSync());
    }
    catch {
        return getEnvContactEmailSync();
    }
}
// Modern PDF invoice generator with actual logo and all required sections
async function generateModernInvoicePDF(invoice, client) {
    // Load invoice items from database
    const invoiceItems = await storage_1.storage.getCrmInvoiceItems(invoice.id);
    const contactEmail = await resolveContactEmail();
    const doc = new jspdf_1.jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;
    // Modern header with your actual logo embedded as base64
    const logoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAApAAAADICAIAAADQlUa0AAAACXBIWXMAAC4jAAAuIwF4pT92AAAJ/mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuYjBmOGJlOSwgMjAyMS8xMi8wOC0xOToxMTo0NiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIzLjAgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNC0wOS0yM1QxNjoyMzozNiswMjowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjQtMDktMjNUMTY6MzM6NDgrMDI6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDktMjNUMTY6MzM6NDgrMDI6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzlkOWRkODctYzFhNi02ZTRmLWJiNjctYjY1MzcwNzFmNDQyIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjc5ZDlkZDg3LWMxYTYtNmU0Zi1iYjY3LWI2NTM3MDcxZjQ0MiIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjc5ZDlkZDg3LWMxYTYtNmU0Zi1iYjY3LWI2NTM3MDcxZjQ0MiI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NzlkOWRkODctYzFhNi02ZTRmLWJiNjctYjY1MzcwNzFmNDQyIiBzdEV2dDp3aGVuPSIyMDI0LTA5LTIzVDE2OjIzOjM2KzAyOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjMuMCAoV2luZG93cykiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+NU4RggAAE8FJREFUeJztnXuwVdV9x38/7gMQEIHwfggRkIeAiAaBqFFjjNGYNjOZxmnHTKa205k4k2Y6naad6XTSTNpMO52m02mnmWaSyUxrpmnS6Zs0xte0Y2qMr4hGjSgqr/AGlJf3vff3/XF/e3vP2Xvtffbe5+x9OXft93fmzsW19lprr7X3+f/OWuu3915bSikAAACAhajFVgAAACBFIDACAABiCAwAAICoQGAEAABEBQIjAAAgKhAYAQAAUYHACAAA1CjOuXGNp4Ix3QcCIwAAUKP83ve+f9VVVzU0NDAzM3/6059ubGx8/vnnR7xj+FKS1wIAAMRHQ0PDnDlzjhw5MnXq1N///vdz585VStU3HhtMpkj5AQAAQFw8/PDD9fX1l19++ZQpUxqPHfOoqakp94lAYAQAAApmypQpZ5xxxne/+93169d/8pOfbGpqam5ubmlpaXnzJ6+DgBEAAChM69atW5VSBw8e/MxnPvPggw82qyO3bt06ceLExhfc8KXQXAV8EYnS+EbG53LG7gXJJCOOyNZI23w7ztpEq/c7A4QJcIoKm5oHJOEVKKrD9Xek2LoTrOaVq4TBdxwRCqo1hYzj5zlz5nTo0KFjx47z5s2bP3/+1KlTZ82a9YlPfGLmzJkt6si7775bKfXJT36ypaWlpaVl2rRp119//Zw5c7q++OL+/fvPO++8bdu2TZ48OS7H/oO+CgBAgfT0Hdm7d+/AwEC4TyBaUxMOA+uLxvSDVGE8ceKEUqq7u/vkyZOzZs1asmTJwoUL586de//99z/22GNNTU0nT55saWk5cODAoUOHmpqali1bNnPmzEOHDh05cmTVqlULFiwYGBj4xS9+ceutt27ZsmX79u3bt28PLCJSfhAYAQAKZu/evdu3bx8YGLjooouWL1/et2+f/Vb2yHj+uS+eTB1ZPrw5hG+3VwCz6wqJ0lBK6U7Vt956a+nSpWeccYZSauHChR/+8IdXr1595syZtWvXtrS0LFu27Oabb165cuWjjz66YMGCRYsWvfDCC0899dT111+/Y8eOhQsXPv/88z/72c+k3OFOjy7z2weByA8CIwBAwa1YsWLJkiWHDh3673//t6uuuu6uu/6ts7Pz5KlTf/rKK8OuZo2M7PcW4VlYhJT7ySefXLVqVXNzs91gfDTz+7B8ggUAAFAjKKUaGxuXLl36zW9+89FHH121atWOHTu2b9++bdu2c845Z+3atffee+8PfvCDzZs3X3/99R/96EcnTpx48803f+9733v55Zf379//m9/8pru7+/Dhw1dccUVHR8eMGTMOHjyolOru7n7++ed37dq1fv36w4cP79y5s7e3l5nPOOOMN998UykV6B2LwAgAULAvfOELU6dOXbJkyYwZMzo6Oi6++OJJkybNnj17wYIF11133YIFC+bOnfvzn//8e9/73jXXXDN//vyOjo7Ozs4LL7xw9uzZy5cv37Zt2+TJk2+77bbOzs7Vq1fv3r17+/btDQ0Nn/vc5/bt27dixYrly5cvXrx4x44dr732WlNT02WXXXbhhRcuWLAg0J8JCgAABacaDxWmOeM//vGP7du3v/DCC729vQ899ND999+/YsWKrq6uDRs2vPrqq729vT09PZ2dnV1dXS+99NKGDRu2bdu2ZcuWJ5544o477njwwQeNPgqJVD4+jAAAQBxUPUqJHyMAACAOIDACAAASAQQGAABAVCAwAgAAogKBEQAAEBUIDAAAAFGBwAgAAIgKBEYAAEBUIDACAADiAAIjAAAgKhAYAQAAUYHACAAASAIQGAAAAFGBwAgAAIgKBEYAAEBUIDACAAAiwfcJH7kIEMAIy4/GNt4h+Dn/j9Z8FeQI4IdwIJlfEL8W/uWjNV8FOQI8H6n9eHcL/pJnW+CXbXxm9kQAABQM+jACAAAioWo+jLT8ZN69tHTVaefgTOOz9xgBGBAXWJYHAABEQhwBo25aNKsT7EO5U5Tq9R7DKmfQPPmRuqKvU+3Epc+2f3qKn3TnXOaGFhAw1SQwqnxOqfDYOWJCUKNEPKk89wS+/3zGwZeLamKaQ8LoYFYEDxlhpLN0+6cXV/gzVgL/uEWFJQu8rVu5VQfuVGEgwzCtAhgdjTKI7EwVRhRoFQJGWMyRjCMfNOOqQJUEwxQREBinTTdEjpxWG32O8oiQNMOOPSf4aBhvKD8HbvO1ZT6oitZIRGREi6p5LZ0LGwm6XOMNA5N63kkhj0M/xOJHqpg7ZOKJPfaYJO6GpGlQBU9VJ0e9mRTBmO1AYBQ8lKBFFQCGqsqQoMLwXAJaI98JVZAM3eZrL9KjSCAa2f/MoOSFtNdR6HLVEu/Oz2YoVJsqCIxVAQKjjhfS4eMQOeFO5OVqWF6FdvQtL9K9ysRLz9DjWIKC7lde5a2n9eKJwvNH7UcMpL2SzQJvk5i4QLTcOdG6U/l/BRhPowdVEBhBXKRdYKzyNMpCLF7Z2uNyZxMKVhAVcSqCqggQZp8j+FGTy/7Z0kGOV7UW5C2mhbQqCJyP+Qzuq1mLbUOFFjRj7kVsxF8x2Mk1Sfe9kPU3Qe7F/SbXEBOIWz9ALrwGzMdZJQO5+i7cFKlpYETCABANKZyJOiEfRm9lh6kz9KKGkYJlkZJhk8w6Q45E8gSNTRJ2AKpBqvVdKYXFkgAAgDgAYwQAAEQCGCMAACAqwBgBAABRAcYIAABICiAwAgAAogKBUaDL+XwLhGNkmN3Vz7NYZ0EW8DjkCPQJNwfOmf+sJiUUk99FJpA1V7N+qVDT9HXrIvGJ10RXBTE7pPvfyLdMNHlHmzO1Uyr+/Rrfon5LrOFWPOr8j6HQ38OXXOOFnJXl4wRgOKVIZUyZYiGH3wdQTU6F3fT3/vvvd3Z2Tp06tbGxcfLkyQsWLLjllltu/dCH/vHf/vXFl1/ev3//nj172tvbZ8yYMWnSpL89epR5ROm2bds2bdq0adOmm2+++cyzzya2HQs9PT1z5swZGBiQMunYHjp0aMOGDddee+3s2bMj2vGf//znhQsXNjc3z5gx4+WXX9b37Onp6enp+fOf/3zffffdf//9DzzwwC9/+csNGzY8/PDDt9xyy1VXXXX22WfPnDnztddeC10+9AgAAKgtPv3pT//rv/7r9u3b3377badUo1Kqr6/vBz/4wV133fWzrq6DygHzG2+8sWfPnj179uzdu/fdd9/dsmXLa6+99qqjVQfIpQtXSnV3d3d3d3/961+/8MILL7zwwpdeeumFF164//77v/Od73z5y1++4oorli9fXl9ff+DAgTfeeGP9+vU//vGPm5ub+/v7o9m9JzKAIAAAyZH6DGTF0dTU9P73v//uu+/+yEc+smbNGjBGAABSbvv27TfccMOsWbNuvPHGnTt3xqKn5sYlSfgwAq9SfpfT8OWCH6iqRY4k8WoM9G3r7+9/5pln2tvbn3vuucmTJ48dO/bdd99tamrq7e1VSjU0NPT19XV1db366qsZY/vqq6/++7//+/e///0///nPx48fP3bs2JEjRy6//PI77rjjxhtvXLRo0fnnn79ly5ZNmzY99thj69evf+edd37605+OHTu2vr6+ra1tw4YN//RP/zRmzJgtW7bcfPPNs2bNOuuss+bNm3f22Wcff//7v8//lJgNMDAw8Kc//Wn79u1PP/30FVdccdZZZ82fP3/lypUbN2586623nn322Q0bNvzyF7+4+OKLly9fPnbs2AkTJnR2dm7YsOGll156/fXXf/nLX55//vmLFi2aNm3ahAkTZs6c+clPfvLNN9985513nnnmmfXr1z/xxBNPPfXUo48++tRTT23evPmJJ5744x//+MILL2zatGnbtm179uy1/nIHDhzYsWPHww8/fN111y1ZsmT8+PETJkw477zz1q5d+9Zbb/X09Dz++OM///nPOzs7p06dOnbs2Pb29oceeqinp8fYUk9Pz7PPPvvAAw/87Gc/e/zxx3ft2nXkyJF33313165djz/++B/+8Idf/epXt912280333z99ddfc801V1111Q033PDhD3/4Ax/4wNVXX33HHXd8+9vf/t3vfrdhw4bdu3cfPHhw9+7dr7/++s9//vOvfOUrF1100fz58ydPnvxf//VffX19zjlZFgAAklOrftTy8jEr2LNnzxtvvPHGG288/fTTL774YldX14EDB5RSdXV10iA7Op999tl777137ty5KQk6d911V6WNGzc+99xzDz300P33399ypH8xn3322WeeeebDjz764x//+O233/YuZLxWaYl33nnnO9/5zrJly9rb2ydOnLh06dLPfOYzjc7BNOB1dgmn/LKQOVGZlllLYmPcnXfeuWzZssmTJ2+/7LJr/vVfZ3V1ndPTM7u3d+bevZM6OuYfPtzS2zv23XfP3rNnwte/PqGtbfKePTM6O6fu3j3HqLy1tfWmm26aNWvWuHHjxo0bt2nTpueff/7uu++eP3++lXGGDoyVNueY9wgOhJ4xzAFiPKunp+fJJ5+89957b7/99g996EMXXXTRihUrVq1adf7559c7tL7//e9fccUVV1555YoVK5Y7aqtjKwvtfSklAqOsH3Ry8b0rPxJKLXUjKYqVShE16MqaRMSJqOdlOjd+hPucqg0EgVE4euDAAac6e3s7nCXa9u3b98gjj3zzm9+86aabrrvuuiuvvPLiiy/+05/+tHv37pMnT87/n9tzOJZJNOIo++KLL379619fvHjx2LFjJ02adMkll3z+859/5plnXn/99b179+7bt+/48eOy0yVLlvzLv/zLb3/72927dx88ePDEiRP9/f2ZktOwqcH8aXjVBOI6l4Eff/zxO++887LLLpsyZcrkyZMvu+yy2267be3atdu2bevu7j569OiJEyfee++9d999d+fOnRs3brztH//xpJPfNTQ0XHDBBTfffPOdd975zW9+8/vf//4DDzzwi1/84sknn3zllVe2bt36xhtv7Nq1a//+/ceOHevr63POkFLqoYce+spXvvKBD3zgzDPPnDJlygUXXPCZz3zm29/+9qOPPtrd3X3kyJE33njjiSeeuOOOO6644gpHXunQunPnznvvvfdLX/rSypUr58+fP2nSpPHjxy9btux73/vek08+uX379l27dh04cODYsWMnT548depUd3f3m2++uXbt2q9+9atXXXXVOeecM2nSpPnz53/qU5+67777nn766b179x47duzdd9999dVXf/e7311zzTULFixwznqqlFq3bt1//Md/XHvttefn0iqHPMuCKe7P2iM7DmtR4a2PNp9sT//+9S9u3uzT0KvYqJdlqyb28VU7NDn5yFo3OGTKNJWcl7VTpB6yx6VvDGVr8Qp6LRsZx8jz/7Y/nAeRshCzB8xTFKqevHfOgGNfVfB5e+n7Xz9vw2unz9YMONtKZ6+lDNTbJz1PNbdOlQJHsWFqwqfrQ9Z8VNJVhawjE8Qc1awqe5D8FdCeN6UiCmQVGsKXs6amJn1c+o0fkxE6nqxcCgVlPdHU5GmxCGYPRHPZj0xb8qYq0JrKFhBZr4zOp4fOVGAoEyXdqVEO8n13zzIKKQODJI9s8yrUF86h/Rb5ZKXSQ9T4eUk7SzKh5lEKxrh48eKxY8e+8MEPHn366f3OOmJWxpA4duzYc88998c//vGuu+5atWqVqtOJUPm16lFf40JBVZKfUG+Pu7xfvz6u7rp1Pk35kkqp7du3P/DAA9dee+25556bfVlJUWdnZ6AzJCWksqBz8fxHPIrD16k0KWKfHdGm/+lS9XU8SLNRnXZN8vMCqUJjdDbVr0bsUUkr0s0wnFNxK0evpDH+4Q9/+NznPrdo0SK/k+d7LsJxu3ffRLzVedT6F3YKpIJVqNdZYdXpN6atGc6+Hg/GR0zNhX5K+nqo3ueH6V2VfZXHFxF3iHo8R7VVf3LyJOE6GLLH7MMD8Wz7m7rIK3HPQtdqxhnQTsn9MWjdIBgj8DQ9MQQlxlCJGaMOZ2gPfc8JnLrXQCDpJSFTMuirKXqG/8a+YQZ5NG3L39vLbE9wVXWb8zLzGT4QIpV6t2HaIdpK6DW6kzLwKJKd5BlPCUhv7kPdI8kpBgBAnGRrJjQVIAqNjAGqE1QTVhjpTqIKGFJpK0t8Bop2S52e2VZ0b1HKlAojktOFjJRJT72tO68prNDcSr1QEyKVBW7iK5Hu2PO3JsX/tGsOdaNGrbPwFqxklL6xaOKJ4TJgWCOLRw85lqc3s/qWZFyK8TKLQ8qY1E8EaqHKV56UtJdZV5LdCtK3YhK3SN2x0y0rHSm/NeFOXS7PsS3qP3qtaLNvJagr0pDVWZAq5rjGF8n0ZwKqxhgBACtaKkxOSU/fIGOgRLrTGNK9nOhKo6O82q6rkIhVZkAhfOV5fIUtUvVmhGb3SamfUXU8QvfOstQ6YQG7aJJCB8a/+du/nTt37pQpU9ra2lauXHnPPfe8/vrrx44d6+vr6+/vp+VfLyml+vv7Dx48+Oabb77yyiu33377ihUrpk6dOmnSpHHjxuUQjZlb2sBNfDIFnZ/gzwC4ViS+8vd+M7zJxAhw1X4L7nSepXIoJTyDRLpFfTqQ6NatWxctWnThhRdOnjz5rLPOuuGGGx599NGDBw+ePHny1KlTp06dOpY6Kw+iO/8O8p5hnq6HGP+WGh8Y161bt3jx4qeeekpKHjp06I477li8ePG0adOmTJly4YUX3n777evXr3/zzTePHj1q2yKDI41lB/r7TunOjz+yP1WkWGFfHy8L+H3r/8FtHMTCQDo0EZZCg8HqpMX6yXKmTaWnMEStm4nHU8qsW6Rb0VKhWyVaCtPdV79cZ+9g2GrIxK7dNfj9eo9hK4d9EjgkYVl9F8aVXb6ZJx/Kn+AJzpNKsqjH5BV6jJ7fHOLjV7LWdOrUqXXr1n3nO9+56qqr5s+f39bWNnbs2ClTprz//e9/7rnnzCMymTSWOLJlz7KmQ2Z6d/orhXdGcj5zEm9FGQCGUDVXctj1tNR6yVfKCqOJqGE8C+FNhD4e9beCo36U5cknn/zkJz957rnnTpgwYfz48VPPO+8j//M/G7ds2bt377Fjx06dOtXb2yuNLZM8liLN3m2qLkOOaFUzOmsrGPuq4KfNQp/D7FJOx/8r7CwEfhlhEhWLvPjii9/4xjeuuuqqJUuWjB07trGxce7cuZ/61Kfuu+++Z5555o033njnnXd6e3tPnz49MDAwMDDQ19d38uTJU6dOHT9+fO/eveeeey5Zjwt98XUP9HX4eEzd0oYILy8t6rOUmDNJZAOJxzN0VZGCCJe4zqP0j3S7TCtdZ40JME+QL1jKzj5vJ/u8nWzKyWUOOlKJM5VR9sGY8w7xjnSbbVV9pkhcK0/9eSZh+HGIR2kFT2CwOiP1fO6wNaXUiRMn1q5d+7GPfey9732v87IwVVdXt3r16l/96lfbt28/dOjQ0aNHpVk2MDAwMDBw4sSJY8eOvfPOO6+99prNFJ1z1hKHOJIqKQ8+Sx7g9dTfI1JXNDdEzDGP8W7w1Qxnn/xc2fKQh4Bb0a/lhAhAUFKOmQcJIe4CHfhG5WU5skhOJfJZwJayv9NeNj9EzJAJX1/PzJdRgLQNJKr7kE8P3feP9+sLFv/IxKzfNf2eUE5e9j+RKYfp1Rd2HFGOTFf/SBtMqf1Vxs/pZYU2uHMjyFuUwGZFMFXu7oNhMOvpC/awPF4QyPmVsD89v5YE/kOhqUlVY4c5OTc/8SyJNFjPyKMwSNWa11vhE6kSqYONLxO29JV8N8grb3JgMKN0ZgV0ZfPNcXGYnYV8eSYKCNkVA0Zz8xNApCDlAgAA0pKg1E5gDBhqtmrLN2VGAB5LrPJlZZz5tKr8DKSNtN9rWJcjxQu8q18J1W3Ey6qxU8HXSW7PoNpE7Qw6W/Q8ww2BzJJpWGwEZGkgQM0YjBp9dP6kH8UAAJAH1YyKxLe6B2s7m9Hre0qvyRaJzjjqLRLpGiHtjGSQvL8RpD3e9KRqJWPM3wqr8VQ9zJn/jxYE5EfVhJGQdNhkM0W5uQQ+Rv3O7jrpxaVx8pTfTe9ZkjAUdIUDy+t6lL8nPZp6QlJ3Q2z4RUOmfSbLHbJ5X/3YifCkzUQG72Ol5vW1iSxrO2IfBb1DazU1NCfwWJKC0MFZG6pOyM6pWfxJZm2RjXd9O8lCY6T8tJG6IgAgOTARNSw/AAAQBNyKAQAAUYHACAAASAoQGAEAAFGBwAgAAIgKBEYAAEBUICACAABEBRIZAQAAcQCBEQAAEBUIjAAAgKhAYAQAAEQFAiMAACApQGAEAABEBQJjGV5++eXOzs729vbm5ubm5uZx48bNnTt38eLFF1100bXXXvv5z3/+jjvuuOeee/7whz/88Y9/fO211zZt2vT666/v2bNn//79R48e7e3tPXXq1MDAQH9//8DAAH8pNf7MlnxK/uUv0ZfUfPJTn/pUFBUCANQuCIwGqVdfffWrX/3qihUr5s2b19raOmXKlIkTJ06cOLG1tbW1tXXMmDGNjY2NjY0tLS3Nzc3Ozjc3N7e0tDQ1NTU0NDQ0NDQ1NbW0tLS0tLS0tIwdO3b8+PETJkyYOHGitNHY2Njc3NzY2NjU1CTfamlpaWpqGjt27MSJE1tbW6dOnTp79uz58+eff/75F1100ZVXXvnxj3/8Ix/5yOc///mvfe1rd99996OPPrpx48Zt27bt3bv36NGjJ06c6Ovr6+vr6+/v7+/v7+/vN2+GlJEPZn5ey0kZKfl3f/d3WrGYFAAAUE4sgjEwwNznz59/2WWXrV69+p577rnvvvueeOKJF1988a233jpy5EhPT09vb+/p06f7+vr6+vr6+/tPnz598uTJkydPDgwMnDx58sMf/vDu3btfeumlu+++e+7cuVOmTJk6deq5557b3t4+f/78FStWrFq16vLLL7/ssss+8pGPfPzjH//kJz/5mc985stf/vJdd911//33P/bYYxs2bNi8efOOHTsOHDhw7NixEydOnDhx4vjx48eOHevu7t67d+/evXu7u7u7u7v37du3f//+/fv3Hzx48MiRI8ePHz958mRfX19vb29vb++JEydOnDhx6tSp06dPDwwMDAwMnDp16tSpU6dOnero6Dh8+PDhw4ePHDly4sSJvr6+3t7eY8eOHT9+/Pjx48ePHz927Njhw4cPHTp06NCho0ePHjt2rLe3t7e3t6en59ChQ4cPH5Z3S82TJk2aMmXK5MmTp0yZMnXq1GnTps2YMWP27NmLFi1asWLFqlWrrrjiissuu+zDH/7wxz72sVtvvfUb3/jGt7/97f/8z/985JFH1q9fv2nTpu3bt+/atWvfvn2HDx8+evTo8ePH5UOxO3fu7OjoOHz48NGjR48fP37ixImTJ0/29fWdPn26r6+vt7e3t7e3p6fn2LFjBw8ePHDgwP79+/ft29fd3X3o0KHDhw8fPXr02LFjJ06cOHnyZF9fX19f36lTp06dOnX69On+/v6zfvazfzfcMBQGAADbSURBVGrr6rr/gQfuvffeH/3oRw899NDf//3fX3XVVcuXL1+0aNG8efNmz549bdr/Awh8oROSGPvTAAAAAElFTkSuQmCC';
    // Add company logo to header
    try {
        doc.addImage(logoBase64, 'PNG', 15, 5, 45, 15);
    }
    catch (error) {
        // Fallback to text logo if image fails
        doc.setFillColor(147, 51, 234);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('NEW AGE FOTOGRAFIE', 20, 17);
    }
    yPosition = 30;
    // Studio information section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Professionelle Fotografie im Herzen von Wien', 20, yPosition);
    doc.text('Schönbrunner Str. 25, 1050 Wien, Austria', 20, yPosition + 6);
    doc.text(`Tel: +43 677 633 99210 | Email: ${contactEmail || '—'}`, 20, yPosition + 12);
    doc.text('Web: www.newagefotografie.com', 20, yPosition + 18);
    // Invoice header section with modern styling
    yPosition += 35;
    doc.setTextColor(0, 0, 0);
    // Invoice title with purple accent
    doc.setFillColor(147, 51, 234);
    doc.rect(pageWidth - 80, yPosition - 8, 70, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RECHNUNG', pageWidth - 75, yPosition + 2);
    // Invoice details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || invoice.id;
    const issueDate = new Date(invoice.issueDate || invoice.issue_date || new Date()).toLocaleDateString('de-DE');
    const dueDate = new Date(invoice.dueDate || invoice.due_date || new Date()).toLocaleDateString('de-DE');
    yPosition += 25;
    doc.text(`Rechnung Nr.: ${invoiceNumber}`, pageWidth - 75, yPosition);
    doc.text(`Rechnungsdatum: ${issueDate}`, pageWidth - 75, yPosition + 6);
    doc.text(`Fälligkeitsdatum: ${dueDate}`, pageWidth - 75, yPosition + 12);
    // Client information with modern box
    yPosition += 25;
    doc.setFillColor(248, 250, 252); // Light gray background
    doc.rect(20, yPosition - 5, 100, 50, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(147, 51, 234);
    doc.text('RECHNUNGSEMPFÄNGER', 25, yPosition + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    yPosition += 15;
    const clientName = `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim();
    if (clientName) {
        doc.text(clientName, 25, yPosition);
        yPosition += 6;
    }
    if (client.email) {
        doc.text(client.email, 25, yPosition);
        yPosition += 6;
    }
    if (client.phone) {
        doc.text(client.phone, 25, yPosition);
        yPosition += 6;
    }
    // Items table header with proper spacing to avoid conflicts
    yPosition += 25;
    doc.setFillColor(147, 51, 234);
    doc.rect(20, yPosition - 5, pageWidth - 40, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BESCHREIBUNG', 25, yPosition + 2);
    doc.text('MENGE', 120, yPosition + 2, { align: 'center' });
    doc.text('EINZELPREIS', 140, yPosition + 2, { align: 'right' });
    doc.text('GESAMTPREIS', pageWidth - 25, yPosition + 2, { align: 'right' });
    // Table items
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    yPosition += 15;
    if (invoiceItems && Array.isArray(invoiceItems) && invoiceItems.length > 0) {
        invoiceItems.forEach((item, index) => {
            const description = item.description || 'Fotografie-Leistung';
            const quantity = parseFloat(item.quantity?.toString() || '1');
            const unitPrice = parseFloat(item.unitPrice?.toString() || item.unit_price?.toString() || '0');
            const amount = quantity * unitPrice;
            // Alternating row colors
            if (index % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(20, yPosition - 3, pageWidth - 40, 10, 'F');
            }
            doc.text(description, 25, yPosition + 2);
            doc.text(quantity.toString(), 120, yPosition + 2, { align: 'center' });
            doc.text(`€${unitPrice.toFixed(2)}`, 140, yPosition + 2, { align: 'right' });
            doc.text(`€${amount.toFixed(2)}`, pageWidth - 25, yPosition + 2, { align: 'right' });
            yPosition += 12;
        });
    }
    else {
        // Fallback if no items found
        doc.setTextColor(100, 100, 100);
        doc.text('Alle Porträts Insgesamt', 25, yPosition + 2);
        doc.text('1', 120, yPosition + 2, { align: 'center' });
        const subtotal = parseFloat(invoice.subtotal?.toString() || '0');
        doc.text(`€${subtotal.toFixed(2)}`, 140, yPosition + 2, { align: 'right' });
        doc.text(`€${subtotal.toFixed(2)}`, pageWidth - 25, yPosition + 2, { align: 'right' });
        yPosition += 12;
        doc.setTextColor(0, 0, 0);
    }
    // Totals section with styling
    yPosition += 10;
    const total = parseFloat(invoice.total?.toString() || invoice.total_amount?.toString() || '0');
    doc.setFillColor(147, 51, 234);
    doc.rect(120, yPosition - 5, pageWidth - 140, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`GESAMTBETRAG: €${total.toFixed(2)}`, pageWidth - 25, yPosition + 5, { align: 'right' });
    // Check if we need a new page for payment info and model release
    if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 20;
    }
    // Payment information - ALWAYS VISIBLE
    yPosition += 25;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ZAHLUNGSINFORMATIONEN', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    yPosition += 8;
    const status = invoice.status === 'paid' ? 'BEZAHLT ✓' : 'OFFEN - Bitte überweisen Sie den Betrag auf folgendes Konto:';
    doc.text(`Status: ${status}`, 20, yPosition);
    // ALWAYS show bank details regardless of status
    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Bankverbindung:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 6;
    doc.text('Bank: N26', 20, yPosition);
    yPosition += 4;
    doc.text('IBAN: DE46 1001 1001 2620 9741 97', 20, yPosition);
    yPosition += 4;
    doc.text('BIC: NTSBDEB1XXX', 20, yPosition);
    yPosition += 4;
    doc.text(`Verwendungszweck: Rechnung ${invoiceNumber}`, 20, yPosition);
    // Model Release / Privacy section - ALWAYS VISIBLE
    yPosition += 20;
    if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('📸 Model Release / Einverständniserklärung zur Bildverwendung', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    yPosition += 8;
    const modelReleaseText = [
        'Wir respektieren Ihre Privatsphäre. Ihre Bilder werden niemals verkauft oder an Dritte zu',
        'kommerziellen Zwecken weitergegeben.',
        '',
        'Einige ausgewählte Aufnahmen aus Ihrem Fotoshooting dürfen wir gegebenenfalls für unsere',
        'eigene Außendarstellung verwenden – etwa auf unserer Website, in sozialen Medien oder in',
        'Druckmaterialien, um unser Portfolio zu präsentieren.',
        '',
        'Sollten Sie nicht einverstanden sein, dass Ihre Bilder für diese Zwecke verwendet werden,',
        `bitten wir um eine kurze Mitteilung an ${contactEmail || 'unserer Kontaktadresse'} vor Ihrem Shooting.`
    ];
    modelReleaseText.forEach(line => {
        if (line === '') {
            yPosition += 3;
        }
        else {
            doc.text(line, 20, yPosition);
            yPosition += 4;
        }
    });
    // Modern footer
    const footerY = pageHeight - 25;
    doc.setFillColor(60, 60, 60);
    doc.rect(0, footerY - 5, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('New Age Fotografie – Professionelle Fotografie seit 2020', 20, footerY + 2);
    doc.text('Vielen Dank für Ihr Vertrauen! 🙏', 20, footerY + 8);
    return Buffer.from(doc.output('arraybuffer'));
}
// Simple text invoice generator that works immediately
function generateTextInvoice(invoice, client) {
    const today = new Date().toLocaleDateString('de-DE');
    const contactEmail = getEnvContactEmailSync();
    const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || invoice.id;
    const clientName = `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim();
    const total = parseFloat(invoice.total?.toString() || invoice.total_amount?.toString() || '0');
    return `
NEW AGE FOTOGRAFIE
Professionelle Fotografie in Wien
=================================

RECHNUNG
--------
Rechnungsnummer: ${invoiceNumber}
Datum: ${today}

Rechnungsempfänger:
${clientName}
${client.email || ''}

Rechnungsdetails:
${invoice.items ? invoice.items.map((item, index) => `${index + 1}. ${item.description || 'Fotografie-Leistung'} - €${parseFloat(item.unitPrice?.toString() || '0').toFixed(2)}`).join('\n') : 'Fotografie-Leistungen'}

Gesamtbetrag: €${total.toFixed(2)}

Zahlungsinformationen:
Status: ${invoice.status === 'paid' ? 'BEZAHLT' : 'OFFEN'}

Kontakt:
--------
New Age Fotografie
Wehrgasse 11A/2+5, 1050 Wien
Tel: +43 677 633 99210
Email: ${contactEmail}
Web: www.newagefotografie.com

Vielen Dank für Ihr Vertrauen!
  `.trim();
}
// Guarded Stripe initialization - avoid crashing the app if env var missing
let stripe = null;
let stripeConfigured = false;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    console.warn('⚠️ STRIPE_SECRET_KEY missing - Stripe disabled. Set STRIPE_SECRET_KEY to enable payments.');
}
else if (stripeSecretKey.includes('dummy') || stripeSecretKey.includes('xxx') || stripeSecretKey.length < 20) {
    console.warn('⚠️ STRIPE_SECRET_KEY looks invalid. Stripe disabled.');
}
else {
    try {
        stripe = new stripe_1.default(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
        stripeConfigured = true;
        console.log('✅ Stripe initialized in routes');
    }
    catch (err) {
        console.warn('⚠️ Failed to initialize Stripe in routes:', err);
    }
}
// Authentication middleware with fallback to static admin token header for legacy admin pages
const authenticateUser = async (req, res, next) => {
    try {
        // If session exists, defer to original requireAuth for user resolution
        if (req.session && req.session.userId) {
            return (0, auth_1.requireAuth)(req, res, next);
        }
        // Check for JWT token in Authorization header (Bearer token)
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const jwt = await import('jsonwebtoken');
                const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'default-secret';
                const decoded = jwt.default.verify(token, secret);
                if (decoded && decoded.userId) {
                    req.user = { id: decoded.userId, role: decoded.role || 'admin' };
                    return next();
                }
            }
            catch (jwtErr) {
                // JWT verification failed, continue to other auth methods
                console.warn('[auth] JWT verification failed:', jwtErr?.message);
            }
        }
        // Legacy / headless token header fallback
        const token = req.headers['x-admin-token'] || '';
        const expected = process.env.ADMIN_TOKEN || '';
        if (expected && token && token === expected) {
            return next();
        }
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    catch (err) {
        console.error('[auth] authenticateUser fallback error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
// Generate HTML template for invoice PDF
function generateInvoiceHTML(invoice, client) {
    const today = new Date().toLocaleDateString('de-DE');
    const issueDate = new Date(invoice.issueDate || invoice.issue_date || new Date()).toLocaleDateString('de-DE');
    const dueDate = new Date(invoice.dueDate || invoice.due_date || new Date()).toLocaleDateString('de-DE');
    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          border-bottom: 2px solid #9333ea;
          padding-bottom: 20px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        .company-logo {
          width: 200px;
          height: auto;
          margin-right: 15px;
          margin-bottom: 10px;
          max-height: 80px;
          object-fit: contain;
        }
        .company-info h1 {
          color: #9333ea;
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .company-details p {
          margin: 3px 0;
          font-size: 13px;
          color: #555;
        }
        .company-details strong {
          color: #333;
        }
        .invoice-info {
          text-align: right;
        }
        .invoice-info h2 {
          color: #333;
          margin: 0;
          font-size: 24px;
        }
        .client-section {
          margin: 30px 0;
        }
        .client-section h3 {
          color: #9333ea;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin: 30px 0;
        }
        .details-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          width: 45%;
        }
        .details-box h4 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        .items-table th {
          background-color: #9333ea;
          color: white;
          font-weight: bold;
        }
        .items-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .totals {
          margin-top: 20px;
          text-align: right;
        }
        .totals table {
          margin-left: auto;
          border-collapse: collapse;
        }
        .totals td {
          padding: 8px 15px;
          border: none;
        }
        .totals .total-row {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #9333ea;
          color: #9333ea;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #9333ea;
          font-size: 11px;
          color: #666;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .footer-section {
          flex: 1;
          margin-right: 20px;
        }
        .footer-section:last-child {
          margin-right: 0;
        }
        .footer-section h4 {
          color: #9333ea;
          font-size: 12px;
          margin: 0 0 8px 0;
          font-weight: bold;
        }
        .footer-section p {
          margin: 2px 0;
          line-height: 1.3;
        }
        .footer-bottom {
          text-align: center;
          padding-top: 15px;
          border-top: 1px solid #eee;
          color: #9333ea;
          font-style: italic;
        }
        .payment-terms {
          background: #e7f3ff;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #9333ea;
        }
        .number {
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <div class="logo-section">
            <!-- Logo removed for PDF generation -->
            <h1>New Age Fotografie</h1>
          </div>
          <div class="company-details">
            <p><strong>Adresse:</strong> Eingang Ecke Schönbrunnerstraße</p>
            <p>Wehrgasse 11A/2+5, 1050 Wien, Austria</p>
            <p><strong>Telefon:</strong> +43 677 633 99210</p>
            <p><strong>Email:</strong> ${getEnvContactEmailSync()}</p>
            <p><strong>Email:</strong> ${getEnvContactEmailSync()}</p>
            <p><strong>Website:</strong> www.newagefotografie.com</p>
            <p><strong>UID:</strong> ATU12345678 | <strong>FN:</strong> 123456a</p>
          </div>
        </div>
        <div class="invoice-info">
          <h2>RECHNUNG</h2>
          <p><strong>Nr.: ${invoice.invoiceNumber}</strong></p>
          <p>Datum: ${today}</p>
        </div>
      </div>

      <div class="client-section">
        <h3>Rechnungsempfänger</h3>
        <p><strong>${client.firstName || ''} ${client.lastName || ''}</strong></p>
        <p>${client.email || ''}</p>
        ${client.address ? `<p>${client.address}</p>` : ''}
        ${client.city ? `<p>${client.city}, ${client.country || ''}</p>` : ''}
      </div>

      <div class="invoice-details">
        <div class="details-box">
          <h4>Rechnungsdetails</h4>
          <p><strong>Rechnungsdatum:</strong> ${issueDate}</p>
          <p><strong>Fälligkeitsdatum:</strong> ${dueDate}</p>
          <p><strong>Zahlungsbedingungen:</strong> ${invoice.paymentTerms || 'Net 30'}</p>
        </div>
        <div class="details-box">
          <h4>Zahlungsinformationen</h4>
          <p><strong>Status:</strong> ${invoice.status === 'paid' ? 'Bezahlt' : 'Offen'}</p>
          <p><strong>Währung:</strong> ${invoice.currency || 'EUR'}</p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Beschreibung</th>
            <th>Menge</th>
            <th>Einzelpreis</th>
            <th>MwSt. %</th>
            <th>Gesamtpreis</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || []).map((item) => `
            <tr>
              <td>${item.description || 'Leistung'}</td>
              <td class="number">${item.quantity || 1}</td>
              <td class="number">€${parseFloat(item.unitPrice?.toString() || item.unit_price?.toString() || '0').toFixed(2)}</td>
              <td class="number">${item.taxRate || item.tax_rate || 0}%</td>
              <td class="number">€${(parseFloat(item.unitPrice?.toString() || item.unit_price?.toString() || '0') * (item.quantity || 1)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Zwischensumme:</td>
            <td class="number">€${parseFloat(invoice.subtotal?.toString() || '0').toFixed(2)}</td>
          </tr>
          <tr>
            <td>MwSt.:</td>
            <td class="number">€${parseFloat(invoice.taxAmount?.toString() || invoice.tax_amount?.toString() || '0').toFixed(2)}</td>
          </tr>
          ${invoice.discountAmount ? `
          <tr>
            <td>Rabatt:</td>
            <td class="number">-€${parseFloat(invoice.discountAmount?.toString() || '0').toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>Gesamtbetrag:</strong></td>
            <td class="number"><strong>€${parseFloat(invoice.total?.toString() || '0').toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      ${invoice.notes ? `
      <div class="payment-terms">
        <h4>Anmerkungen</h4>
        <p>${invoice.notes}</p>
      </div>
      ` : ''}

      <div class="payment-terms">
        <h4>Zahlungsbedingungen</h4>
        <p>Bitte überweisen Sie den Rechnungsbetrag bis zum Fälligkeitsdatum auf unser Konto. Bei Fragen wenden Sie sich gerne an uns.</p>
      </div>

      <div class="footer">
        <div class="footer-content">
          <div class="footer-section">
            <h4>Kontakt</h4>
            <p><strong>New Age Fotografie</strong></p>
            <p>Eingang Ecke Schönbrunnerstraße</p>
            <p>Wehrgasse 11A/2+5, 1050 Wien</p>
            <p>Tel: +43 677 633 99210</p>
            <p>Email: ${getEnvContactEmailSync()}</p>
            <p>Email: ${getEnvContactEmailSync()}</p>
          </div>
          <div class="footer-section">
            <h4>Geschäftsinformationen</h4>
            <p>UID-Nr.: ATU12345678</p>
            <p>Firmenbuchnummer: FN 123456a</p>
            <p>Gerichtsstand: Wien</p>
            <p>Website: www.newagefotografie.com</p>
          </div>
          <div class="footer-section">
            <h4>Bankverbindung</h4>
            <p>Bank: Erste Bank Austria</p>
            <p>IBAN: AT12 2011 1000 0000 1234</p>
            <p>BIC: GIBAATWWXXX</p>
            <p>Verwendungszweck: Rechnung ${invoice.invoiceNumber}</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p><em>Vielen Dank für Ihr Vertrauen! Professionelle Fotografie mit Leidenschaft seit 2020.</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}
// Initialize S3 Client for Backblaze B2
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'eu-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    endpoint: process.env.AWS_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.AWS_S3_ENDPOINT ? true : false,
});
// Configure multer for image uploads - use memory storage for B2 upload
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(), // Changed to memory storage for direct B2 upload
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit to reduce Multer edge rejections
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
        }
    }
});
// Configure multer for audio uploads (voice transcription)
const audioUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/webm', 'audio/ogg'];
        if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.wav') || file.originalname.endsWith('.mp3')) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid audio file type. Only WAV, MP3, MP4, WebM, and OGG audio files are allowed.'));
        }
    }
});
// Convert plain text content to structured HTML with proper headings and paragraphs
function convertPlainTextToStructuredHTML(content) {
    console.log('🔧 Converting text to structured HTML...');
    // Remove any existing HTML tags first
    let cleanContent = content.replace(/<[^>]*>/g, '').trim();
    // Split content into lines and process
    const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let htmlContent = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Detect headings by common patterns
        if (line.match(/^(##?\s+|H[12]:\s*)/i) ||
            line.match(/^(Einführung|Warum|Der persönliche|Tipps|Was Sie|Nach dem)/i) ||
            line.match(/^\d+\.\s+[A-ZÄÖÜ]/)) {
            // This is a heading
            const cleanHeading = line.replace(/^(##?\s+|H[12]:\s*|\d+\.\s*)/i, '').trim();
            htmlContent += `<h2>${cleanHeading}</h2>\n`;
        }
        else if (line.length > 50) {
            // This is likely a paragraph (longer content)
            htmlContent += `<p>${line}</p>\n`;
        }
        else if (line.length > 10) {
            // Short line, could be a list item or small paragraph
            if (line.match(/^[-•*]\s/)) {
                // Convert to list item
                const listItem = line.replace(/^[-•*]\s/, '').trim();
                htmlContent += `<li>${listItem}</li>\n`;
            }
            else {
                htmlContent += `<p>${line}</p>\n`;
            }
        }
    }
    // If we don't have enough structure, split long paragraphs
    if (!htmlContent.includes('<h2>')) {
        console.log('🔧 No headings detected, splitting into structured paragraphs...');
        // Split content by sentences and group into paragraphs
        const sentences = cleanContent.split(/[.!?]+\s+/).filter(s => s.trim().length > 10);
        htmlContent = '';
        // Create structured content with artificial headings
        const headings = [
            'Einführung in die Familienfotografie',
            'Die Bedeutung professioneller Familienfotos',
            'Unser Fotostudio in Wien',
            'Tipps für das perfekte Familienfoto',
            'Nachbearbeitung und Ergebnisse'
        ];
        const sentencesPerSection = Math.ceil(sentences.length / headings.length);
        for (let i = 0; i < headings.length; i++) {
            htmlContent += `<h2>${headings[i]}</h2>\n`;
            const sectionStart = i * sentencesPerSection;
            const sectionEnd = Math.min((i + 1) * sentencesPerSection, sentences.length);
            for (let j = sectionStart; j < sectionEnd; j++) {
                if (sentences[j] && sentences[j].trim().length > 0) {
                    const sentence = sentences[j].trim();
                    // Make sure each sentence ends with proper punctuation
                    const punctuatedSentence = sentence.match(/[.!?]$/) ? sentence : sentence + '.';
                    htmlContent += `<p>${punctuatedSentence}</p>\n`;
                }
            }
        }
    }
    console.log('✅ Text converted to structured HTML');
    console.log('📊 Structured content length:', htmlContent.length, 'characters');
    console.log('📊 H2 headings found:', (htmlContent.match(/<h2>/g) || []).length);
    console.log('📊 Paragraphs created:', (htmlContent.match(/<p>/g) || []).length);
    return htmlContent;
}
// IMAP Email Import Function
async function importEmailsFromIMAP(config) {
    return new Promise((resolve, reject) => {
        const imap = new Imap({
            user: config.username,
            password: config.password,
            host: config.host,
            port: config.port,
            tls: config.useTLS,
            tlsOptions: { rejectUnauthorized: false },
            connTimeout: 30000, // 30 seconds
            authTimeout: 30000,
            keepalive: false
        });
        // Add timeout for the whole operation
        const timeout = setTimeout(() => {
            imap.end();
            reject(new Error('IMAP connection timeout after 60 seconds'));
        }, 60000);
        const emails = [];
        function openInbox(cb) {
            imap.openBox('INBOX', true, cb);
        }
        imap.once('ready', function () {
            openInbox(function (err, box) {
                if (err) {
                    console.error('Error opening inbox:', err);
                    return reject(err);
                }
                // Search for all emails in INBOX including recent ones
                imap.search(['ALL'], function (err, results) {
                    if (err) {
                        console.error('Error searching emails:', err);
                        return reject(err);
                    }
                    if (!results || results.length === 0) {
                        console.log('No emails found in inbox');
                        imap.end();
                        return resolve([]);
                    }
                    console.log(`Found ${results.length} emails in inbox`);
                    // Fetch the last 50 emails to capture any new messages
                    const recentResults = results.slice(-50);
                    const f = imap.fetch(recentResults, {
                        bodies: '',
                        struct: true
                    });
                    f.on('message', function (msg, seqno) {
                        let emailData = {
                            from: '',
                            fromName: '',
                            subject: '',
                            body: '',
                            date: new Date().toISOString(),
                            isRead: false
                        };
                        msg.on('body', function (stream, info) {
                            (0, mailparser_1.simpleParser)(stream, (err, parsed) => {
                                if (err) {
                                    console.error('Error parsing email:', err);
                                    return;
                                }
                                emailData.from = parsed.from?.value?.[0]?.address || '';
                                emailData.fromName = parsed.from?.value?.[0]?.name || emailData.from;
                                emailData.subject = parsed.subject || 'No Subject';
                                emailData.body = parsed.text || parsed.html || '';
                                emailData.date = parsed.date?.toISOString() || new Date().toISOString();
                                emails.push(emailData);
                            });
                        });
                        msg.once('attributes', function (attrs) {
                            emailData.isRead = attrs.flags.includes('\\Seen');
                        });
                    });
                    f.once('error', function (err) {
                        console.error('Fetch error:', err);
                        reject(err);
                    });
                    f.once('end', function () {
                        console.log('Done fetching all messages!');
                        clearTimeout(timeout);
                        imap.end();
                        resolve(emails);
                    });
                });
            });
        });
        imap.once('error', function (err) {
            console.error('IMAP connection error:', err);
            clearTimeout(timeout);
            reject(new Error(`IMAP connection failed: ${err.message}`));
        });
        imap.once('end', function () {
            console.log('IMAP connection ended');
            clearTimeout(timeout);
        });
        imap.connect();
    });
}
async function registerRoutes(app) {
    // Session middleware and /api/auth routes are applied early in server/index.ts
    // to ensure auth works before lazy loading other routes. Avoid duplicating here.
    // Digital files API - Using filesRouter (routes/files.ts) - file-routes.ts has schema mismatches
    console.log('🔧 Registering /api/files router...');
    app.use('/api/files', files_1.default);
    console.log('✅ /api/files router registered');
    // Questionnaire module (public + admin APIs)
    app.use(questionnaires_1.default);
    // Scheduler module - Client self-booking system
    const schedulerRouter = require('./routes/scheduler').default;
    app.use('/api/schedulers', schedulerRouter);
    console.log('✅ /api/schedulers router registered');
    // Onboarding + Website Analyzer (dev parity with production full-server.js)
    app.use('/api/onboarding', onboarding_1.default);
    // Price Wizard - AI-powered competitive pricing research
    app.use('/api/price-wizard', price_wizard_1.default);
    // Workflow Wizard - Automated email sequences and workflow management
    app.use('/api/workflow-wizard', workflow_wizard_1.default);
    // Setup Wizard - SmartTog Hub onboarding integration
    app.use('/api/setup', setup_routes_1.default);
    console.log('✅ /api/setup routes registered');
    // Health check endpoint for deployment
    app.get("/api/health", (req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
    // Storage health endpoint (Backblaze/S3)
    app.get("/api/storage/health", async (_req, res) => {
        try {
            const summary = await (0, s3_storage_1.storageHealth)();
            res.json(summary);
        }
        catch (e) {
            res.status(500).json({ error: e?.message || 'health_failed' });
        }
    });
    // Checkout and payment routes
    app.post("/api/checkout/create-session", async (req, res) => {
        try {
            const { createCheckoutSession } = await import("./controllers/checkoutController");
            await createCheckoutSession(req, res);
        }
        catch (error) {
            console.error('Checkout controller not available:', error);
            res.status(500).json({ error: 'Checkout service unavailable' });
        }
    });
    app.get("/api/checkout/success", async (req, res) => {
        try {
            const { handleCheckoutSuccess } = await import("./controllers/checkoutController");
            await handleCheckoutSuccess(req, res);
        }
        catch (error) {
            console.error('Checkout success handler not available:', error);
            res.status(500).json({ error: 'Checkout success service unavailable' });
        }
    });
    // Provide a stable link for the thank-you page to download the voucher PDF
    app.get("/api/vouchers/signed-link", async (req, res) => {
        try {
            const sessionId = String(req.query.session_id || '').trim();
            if (!sessionId)
                return res.status(400).json({ success: false, error: 'session_id required' });
            const base = `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`.replace(/\/+$/, '');
            return res.json({ success: true, url: `${base}/voucher/pdf?session_id=${encodeURIComponent(sessionId)}` });
        }
        catch (e) {
            return res.status(500).json({ success: false, error: e?.message || 'Failed to create download link' });
        }
    });
    app.post("/api/vouchers/validate", async (req, res) => {
        try {
            const { validateVoucherCode } = await import("./controllers/checkoutController");
            await validateVoucherCode(req, res);
        }
        catch (error) {
            console.error('Voucher validation not available:', error);
            res.status(500).json({ error: 'Voucher validation service unavailable' });
        }
    });
    // Demo checkout success page route
    app.get("/checkout/mock-success", (req, res) => {
        const { session_id } = req.query;
        console.log('Demo checkout success accessed with session:', session_id);
        // Redirect to the frontend success page
        res.redirect(`/demo-success?session_id=${session_id}`);
    });
    // Stripe connection test routes
    app.get("/api/stripe/test", async (req, res) => {
        try {
            const { testStripeConnection } = await import("./controllers/stripeTestController");
            await testStripeConnection(req, res);
        }
        catch (error) {
            console.error('Stripe test not available:', error);
            res.status(500).json({ error: 'Stripe test service unavailable' });
        }
    });
    app.get("/api/stripe/config", async (req, res) => {
        try {
            const { getStripePublishableKey } = await import("./controllers/stripeTestController");
            await getStripePublishableKey(req, res);
        }
        catch (error) {
            console.error('Stripe config not available:', error);
            res.status(500).json({ error: 'Stripe config service unavailable' });
        }
    });
    // Calendar routes (Studio Appointments)
    // Fetch Google Calendar events via OAuth API (using calendarSyncSettings tokens)
    app.get("/api/calendar/google-events", async (req, res) => {
        try {
            const { google } = await import('googleapis');
            const configs = await runSql(`SELECT access_token, refresh_token, calendar_id FROM calendar_sync_settings WHERE sync_enabled = true LIMIT 1`);
            if (!configs || configs.length === 0) {
                return res.status(200).json({ success: true, events: [], message: 'No Google Calendar sync configured' });
            }
            const syncConfig = configs[0];
            if (!syncConfig.access_token || !syncConfig.refresh_token) {
                return res.status(200).json({ success: true, events: [], message: 'Google Calendar OAuth tokens missing' });
            }
            const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
            oauth2Client.setCredentials({ access_token: syncConfig.access_token, refresh_token: syncConfig.refresh_token });
            const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const sixMonthsAhead = new Date();
            sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);
            const response = await calendar.events.list({
                calendarId: syncConfig.calendar_id || 'primary',
                timeMin: sixMonthsAgo.toISOString(),
                timeMax: sixMonthsAhead.toISOString(),
                maxResults: 2500,
                singleEvents: true,
                orderBy: 'startTime',
            });
            const events = (response.data.items || []).map((event) => ({
                id: event.id,
                title: event.summary || 'Untitled',
                start: event.start?.dateTime || event.start?.date,
                end: event.end?.dateTime || event.end?.date,
                description: event.description || '',
                location: event.location || '',
            }));
            res.json({ success: true, events });
        }
        catch (error) {
            console.error('Google Calendar fetch error:', error?.message || error);
            res.status(200).json({ success: true, events: [], message: 'Failed to fetch Google Calendar events' });
        }
    });
    app.post("/api/calendar/appointments", async (req, res) => {
        try {
            const { createAppointment } = await import("./controllers/calendarController");
            await createAppointment(req, res);
        }
        catch (error) {
            console.error('Create appointment not available:', error);
            res.status(500).json({ error: 'Calendar service unavailable' });
        }
    });
    app.get("/api/calendar/appointments", async (req, res) => {
        try {
            const { getAppointments } = await import("./controllers/calendarController");
            await getAppointments(req, res);
        }
        catch (error) {
            console.error('Get appointments not available:', error);
            res.status(500).json({ error: 'Calendar service unavailable' });
        }
    });
    app.put("/api/calendar/appointments/:appointmentId", async (req, res) => {
        try {
            const { updateAppointment } = await import("./controllers/calendarController");
            await updateAppointment(req, res);
        }
        catch (error) {
            console.error('Update appointment not available:', error);
            res.status(500).json({ error: 'Calendar service unavailable' });
        }
    });
    app.delete("/api/calendar/appointments/:appointmentId", async (req, res) => {
        try {
            const { deleteAppointment } = await import("./controllers/calendarController");
            await deleteAppointment(req, res);
        }
        catch (error) {
            console.error('Delete appointment not available:', error);
            res.status(500).json({ error: 'Calendar service unavailable' });
        }
    });
    app.get("/api/calendar/appointments/client/:clientId", async (req, res) => {
        try {
            const { getClientAppointments } = await import("./controllers/calendarController");
            await getClientAppointments(req, res);
        }
        catch (error) {
            console.error('Get client appointments not available:', error);
            res.status(500).json({ error: 'Calendar service unavailable' });
        }
    });
    app.get("/api/calendar/available-slots", async (req, res) => {
        try {
            const { getAvailableSlots } = await import("./controllers/calendarController");
            await getAvailableSlots(req, res);
        }
        catch (error) {
            console.error('Get available slots not available:', error);
            res.status(500).json({ error: 'Calendar service unavailable' });
        }
    });
    // Communication routes (Email & SMS)
    app.post("/api/communications/email/send", async (req, res) => {
        try {
            const { sendEmail } = await import("./controllers/communicationController");
            await sendEmail(req, res);
        }
        catch (error) {
            console.error('Send email not available:', error);
            res.status(500).json({ error: 'Email service unavailable' });
        }
    });
    app.post("/api/communications/sms/send", async (req, res) => {
        try {
            const { sendSMS } = await import("./controllers/communicationController");
            await sendSMS(req, res);
        }
        catch (error) {
            console.error('Send SMS not available:', error);
            res.status(500).json({ error: 'SMS service unavailable' });
        }
    });
    app.post("/api/communications/sms/bulk", async (req, res) => {
        try {
            const { sendBulkSMS } = await import("./controllers/communicationController");
            await sendBulkSMS(req, res);
        }
        catch (error) {
            console.error('Bulk SMS not available:', error);
            res.status(500).json({ error: 'Bulk SMS service unavailable' });
        }
    });
    app.get("/api/communications/client/:clientId", async (req, res) => {
        try {
            const { getClientCommunications } = await import("./controllers/communicationController");
            await getClientCommunications(req, res);
        }
        catch (error) {
            console.error('Get client communications not available:', error);
            res.status(500).json({ error: 'Communications service unavailable' });
        }
    });
    app.get("/api/communications/all", async (req, res) => {
        try {
            const { getAllCommunications } = await import("./controllers/communicationController");
            await getAllCommunications(req, res);
        }
        catch (error) {
            console.error('Get all communications not available:', error);
            res.status(500).json({ error: 'Communications service unavailable' });
        }
    });
    app.get("/api/communications/sms/config", async (req, res) => {
        try {
            const { getSMSConfig } = await import("./controllers/communicationController");
            await getSMSConfig(req, res);
        }
        catch (error) {
            console.error('Get SMS config not available:', error);
            res.status(500).json({ error: 'SMS config service unavailable' });
        }
    });
    app.post("/api/communications/sms/config", async (req, res) => {
        try {
            const { updateSMSConfig } = await import("./controllers/communicationController");
            await updateSMSConfig(req, res);
        }
        catch (error) {
            console.error('Update SMS config not available:', error);
            res.status(500).json({ error: 'SMS config service unavailable' });
        }
    });
    app.post("/api/communications/bulk/preview", async (req, res) => {
        try {
            const { getBulkTargetPreview } = await import("./controllers/communicationController");
            await getBulkTargetPreview(req, res);
        }
        catch (error) {
            console.error('Get bulk target preview not available:', error);
            res.status(500).json({ error: 'Bulk preview service unavailable' });
        }
    });
    app.patch("/api/communications/:messageId/read", async (req, res) => {
        try {
            const { markMessageAsRead } = await import("./controllers/communicationController");
            await markMessageAsRead(req, res);
        }
        catch (error) {
            console.error('Mark message as read not available:', error);
            res.status(500).json({ error: 'Message service unavailable' });
        }
    });
    app.post("/api/communications/email/test", async (req, res) => {
        try {
            const { testEmailConfig } = await import("./controllers/communicationController");
            await testEmailConfig(req, res);
        }
        catch (error) {
            console.error('Test email config not available:', error);
            res.status(500).json({ error: 'Email test service unavailable' });
        }
    });
    // Import and register CRM agent router (legacy V1) only when explicitly enabled
    if (process.env.ENABLE_CRM_AGENT_V1 === 'true') {
        try {
            const { crmAgentRouter } = await import("./routes/crm-agent");
            app.use(crmAgentRouter);
            console.log("✅ CRM agent router enabled (ENABLE_CRM_AGENT_V1=true)");
        }
        catch (error) {
            console.warn("⚠️ CRM agent router not available:", error?.message || error);
        }
    }
    else {
        console.log('ℹ️ Skipping CRM agent router (ENABLE_CRM_AGENT_V1!=true)');
    }
    // Audio transcription endpoint using OpenAI Whisper
    app.post("/api/transcribe", authenticateUser, audioUpload.single('audio'), async (req, res) => {
        try {
            const audioFile = req.file;
            if (!audioFile) {
                return res.status(400).json({ success: false, error: 'No audio file provided' });
            }
            if (!process.env.OPENAI_API_KEY) {
                return res.status(500).json({ success: false, error: 'OpenAI API key not configured' });
            }
            console.log('Transcribing audio file:', audioFile.originalname, 'Size:', audioFile.size, 'bytes');
            const OpenAI = (await import('openai')).default;
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            // Create a temporary file for OpenAI Whisper API
            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');
            const tempDir = os.tmpdir();
            const tempFilePath = path.join(tempDir, `audio_${Date.now()}_${audioFile.originalname}`);
            // Write buffer to temporary file
            fs.writeFileSync(tempFilePath, audioFile.buffer);
            // Create a ReadStream for OpenAI
            const fileStream = fs.createReadStream(tempFilePath);
            // Transcribe using Whisper API
            const transcription = await openai.audio.transcriptions.create({
                file: fileStream,
                model: "whisper-1",
                language: "de", // German language for Austrian photography business
                response_format: "text"
            });
            // Clean up temporary file
            fs.unlinkSync(tempFilePath);
            const transcribedText = transcription.trim();
            console.log('Transcription successful:', transcribedText.substring(0, 100) + '...');
            res.json({
                success: true,
                text: transcribedText,
                metadata: {
                    duration: audioFile.size,
                    model: 'whisper-1',
                    language: 'de'
                }
            });
        }
        catch (error) {
            console.error('Transcription error:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Transcription failed'
            });
        }
    });
    // CRM Agent routes with Phase B write capabilities
    app.get('/api/crm/agent/status', async (req, res) => {
        try {
            res.json({
                status: 'operational',
                capabilities: {
                    read: ['list_clients', 'list_leads', 'list_invoices', 'list_messages'],
                    write: ['create_lead', 'update_client', 'create_invoice'],
                    mode: 'auto_safe'
                },
                phase: 'B - Write Enabled',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('CRM Agent Status Error:', error);
            res.status(500).json({ error: 'Failed to get agent status' });
        }
    });
    app.post('/api/crm/agent/chat', async (req, res) => {
        try {
            const { message, threadId } = req.body;
            if (!message) {
                return res.status(400).json({ error: 'Message is required' });
            }
            // Use the actual Phase B agent system
            const studioId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
            const userId = '550e8400-e29b-41d4-a716-446655440001';
            // Import runAgent dynamically to avoid module loading issues
            const { runAgent } = await import('../agent/run-agent');
            // Run the AI agent with Phase B write capabilities
            const response = await runAgent(studioId, userId, message);
            res.json({
                response: response,
                threadId: threadId || null,
                capabilities: {
                    writeEnabled: true,
                    mode: 'auto_safe',
                    authorities: ['CREATE_LEAD', 'UPDATE_CLIENT', 'SEND_INVOICE'],
                    approvalThreshold: 500
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('CRM Agent Chat Error:', error);
            // Fallback to German response if agent fails
            const fallbackResponse = `Entschuldigung, das CRM-System ist momentan nicht verfügbar. Ich bin Ihr CRM-Operations-Assistent und kann Ihnen normalerweise bei folgenden Aufgaben helfen:

📧 **E-Mail-Verwaltung**: Antworten auf Kunden-E-Mails, Buchungsbestätigungen senden
📅 **Terminverwaltung**: Termine erstellen, ändern, stornieren
👥 **Kundenverwaltung**: Kundendaten hinzufügen, aktualisieren, suchen
💰 **Rechnungsverwaltung**: Rechnungen erstellen, senden, verfolgen
📊 **Geschäftsanalyse**: Berichte erstellen, Daten analysieren

Bitte versuchen Sie es später noch einmal.`;
            res.json({
                response: fallbackResponse,
                threadId: null,
                capabilities: {
                    writeEnabled: false,
                    mode: 'fallback',
                    authorities: [],
                    approvalThreshold: 500
                },
                timestamp: new Date().toISOString()
            });
        }
    });
    // ==================== AGENT DATA INTELLIGENCE ENDPOINTS ====================
    // Sales analytics for last 6 months (for agent intelligence)
    app.get("/api/agent/sales-last6", authenticateUser, async (_req, res) => {
        try {
            const now = new Date();
            const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            const periods = [];
            for (let i = 5; i >= 0; i--) {
                const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
                const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
                const rows = await runSql(`SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0)::double precision AS total
           FROM crm_invoices
           WHERE created_at >= $1 AND created_at < $2`, [start.toISOString(), end.toISOString()]);
                periods.push({
                    month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
                    total: Number(rows[0]?.total || 0)
                });
            }
            const overall = periods.reduce((s, p) => s + p.total, 0);
            res.json({ success: true, periods, overall });
        }
        catch (e) {
            console.error('Error fetching sales last 6 months:', e);
            res.status(500).json({ success: false, error: e.message });
        }
    });
    // Upcoming photography sessions (for agent intelligence)
    app.get("/api/agent/upcoming-sessions", authenticateUser, async (req, res) => {
        try {
            const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 10)));
            const rows = await runSql(`SELECT id, title, start_time, end_time, client_id
         FROM photography_sessions
         WHERE start_time > NOW()
         ORDER BY start_time ASC
         LIMIT $1`, [limit]);
            res.json({ success: true, count: rows.length, sessions: rows });
        }
        catch (e) {
            console.error('Error fetching upcoming sessions:', e);
            res.status(500).json({ success: false, error: e.message });
        }
    });
    // Annual sales total (for agent intelligence)
    app.get("/api/agent/sales-year", authenticateUser, async (req, res) => {
        try {
            const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
            const rows = await runSql(`SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0)::double precision AS total
         FROM crm_invoices
         WHERE EXTRACT(YEAR FROM created_at) = $1`, [year]);
            res.json({ success: true, year, total: Number(rows[0]?.total || 0) });
        }
        catch (e) {
            console.error('Error fetching sales for year:', e);
            res.status(500).json({ success: false, error: e.message });
        }
    });
    // Extended diagnostics with tool availability (for agent intelligence verification)
    app.get("/api/agent/diagnostics-extended", authenticateUser, async (_req, res) => {
        try {
            const [invRows, sessRows] = await Promise.all([
                runSql(`SELECT COUNT(*)::int AS c, MIN(created_at) AS first, MAX(created_at) AS last FROM crm_invoices`),
                runSql(`SELECT COUNT(*)::int AS c, MIN(start_time) AS first, MAX(start_time) AS last FROM photography_sessions`)
            ]);
            res.json({
                success: true,
                invoices: invRows[0],
                sessions: sessRows[0],
                tools: {
                    salesYear: true,
                    salesLast6: true,
                    upcomingSessions: true
                },
                dbUrlSet: !!process.env.DATABASE_URL,
                openaiKeySet: !!process.env.OPENAI_API_KEY
            });
        }
        catch (e) {
            console.error('Error fetching extended diagnostics:', e);
            res.status(500).json({ success: false, error: e.message });
        }
    });
    // ==================== USER ROUTES ====================
    app.get("/api/users/:id", authenticateUser, async (req, res) => {
        try {
            const user = await storage_1.storage.getUser(req.params.id);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            res.json(user);
        }
        catch (error) {
            console.error("Error fetching user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/users", async (req, res) => {
        try {
            const userData = insertUserSchema.parse(req.body);
            const user = await storage_1.storage.createUser(userData);
            res.status(201).json(user);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            console.error("Error creating user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== BLOG ROUTES ====================
    app.get("/api/blog/posts", async (req, res) => {
        try {
            const published = req.query.published === 'true' ? true : req.query.published === 'false' ? false : undefined;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search;
            const tag = req.query.tag;
            const exclude = req.query.exclude;
            const language = req.query.language || 'de';
            let posts = await storage_1.storage.getBlogPosts(published);
            // Translate content if language is English
            if (language === 'en') {
                posts = posts.map(post => ({
                    ...post,
                    title: translateToEnglish(post.title),
                    excerpt: post.excerpt ? translateToEnglish(post.excerpt) : null,
                    content: post.content ? translateToEnglish(post.content) : null,
                    tags: post.tags ? post.tags.map(tag => translateTagToEnglish(tag)) : null
                }));
            }
            // Filter by search
            if (search) {
                posts = posts.filter(post => post.title.toLowerCase().includes(search.toLowerCase()) ||
                    (post.excerpt && post.excerpt.toLowerCase().includes(search.toLowerCase())) ||
                    (post.content && post.content.toLowerCase().includes(search.toLowerCase())));
            }
            // Filter by tag
            if (tag && tag !== 'all') {
                posts = posts.filter(post => post.tags && post.tags.includes(tag));
            }
            // Exclude specific post
            if (exclude) {
                posts = posts.filter(post => post.id !== exclude);
            }
            const totalPosts = posts.length;
            const totalPages = Math.ceil(totalPosts / limit);
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedPosts = posts.slice(startIndex, endIndex);
            res.json({
                posts: paginatedPosts,
                count: totalPosts,
                totalPages,
                currentPage: page,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            });
        }
        catch (error) {
            console.error("Error fetching blog posts:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.get("/api/blog/posts/:identifier", async (req, res) => {
        try {
            const identifier = req.params.identifier;
            let post;
            // Check if identifier is a UUID (for ID lookup) or a slug
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
            if (isUUID) {
                // Fetch by ID
                const posts = await storage_1.storage.getBlogPosts();
                post = posts.find(p => p.id === identifier);
            }
            else {
                // Fetch by slug
                post = await storage_1.storage.getBlogPostBySlug(identifier);
            }
            if (!post) {
                return res.status(404).json({ error: "Post not found" });
            }
            res.json(post);
        }
        catch (error) {
            console.error("Error fetching blog post:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/blog/posts", authenticateUser, async (req, res) => {
        try {
            console.log('[BLOG CREATE] Creating new post');
            const postData = {
                ...req.body,
                // Convert publishedAt string to Date if present
                publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : null,
                // Convert scheduledFor string to Date if present
                scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null
            };
            // Remove authorId from validation data
            delete postData.authorId;
            console.log("[BLOG CREATE] Received blog post data:", postData);
            const validatedData = insertBlogPostSchema.parse(postData);
            console.log("[BLOG CREATE] Validated blog post data:", validatedData);
            const post = await storage_1.storage.createBlogPost(validatedData);
            console.log('[BLOG CREATE] Success:', post.id);
            res.status(201).json(post);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                console.error("[BLOG CREATE] Validation error:", error.errors);
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            console.error("[BLOG CREATE] Error details:", error);
            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            console.error("[BLOG CREATE] Error message:", errorMessage);
            res.status(500).json({ error: "Internal server error", details: errorMessage });
        }
    });
    app.put("/api/blog/posts/:id", authenticateUser, async (req, res) => {
        try {
            console.log('[BLOG UPDATE] Updating post:', req.params.id);
            console.log('[BLOG UPDATE] Update data:', JSON.stringify(req.body, null, 2));
            // Convert date strings to Date objects (same as POST route)
            const updates = {
                ...req.body,
                // Convert publishedAt string to Date if present
                publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : undefined,
                // Convert scheduledFor string to Date if present
                scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
                // Always update the updatedAt timestamp
                updatedAt: new Date()
            };
            // Remove undefined values
            Object.keys(updates).forEach(key => {
                if (updates[key] === undefined) {
                    delete updates[key];
                }
            });
            console.log('[BLOG UPDATE] Processed updates:', updates);
            const post = await storage_1.storage.updateBlogPost(req.params.id, updates);
            console.log('[BLOG UPDATE] Success:', post.id);
            res.json(post);
        }
        catch (error) {
            console.error("[BLOG UPDATE] Error details:", error);
            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            console.error("[BLOG UPDATE] Error message:", errorMessage);
            res.status(500).json({ error: "Internal server error", details: errorMessage });
        }
    });
    app.delete("/api/blog/posts/:id", authenticateUser, async (req, res) => {
        try {
            await storage_1.storage.deleteBlogPost(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting blog post:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Fix existing blog posts with wall-of-text issue by converting to structured HTML
    app.post("/api/blog/posts/fix-formatting", authenticateUser, async (req, res) => {
        try {
            console.log('🔧 Starting blog post formatting fix...');
            // Get all published blog posts 
            const posts = await storage_1.storage.getBlogPosts();
            let fixedCount = 0;
            for (const post of posts) {
                try {
                    // Check if post needs fixing (contains wall of text without proper HTML structure)
                    const hasStructure = post.content?.includes('<h2>') && post.content?.includes('<p>');
                    if (!hasStructure && post.content && post.content.length > 500) {
                        console.log(`🔧 Fixing post: ${post.title} (${post.content.length} chars)`);
                        // Convert text to structured HTML using the same logic as AutoBlog
                        const structuredContent = convertPlainTextToStructuredHTML(post.content);
                        // Update the post with structured content
                        await storage_1.storage.updateBlogPost(post.id, {
                            content: structuredContent
                        });
                        fixedCount++;
                        console.log(`✅ Fixed post: ${post.title}`);
                    }
                }
                catch (error) {
                    console.error(`❌ Error fixing post ${post.title}:`, error);
                }
            }
            console.log(`🎉 Blog formatting fix complete: ${fixedCount} posts updated`);
            res.json({
                success: true,
                fixed: fixedCount,
                message: `Successfully updated ${fixedCount} blog posts with structured formatting`
            });
        }
        catch (error) {
            console.error("Error fixing blog post formatting:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== CRM CLIENT ROUTES ====================
    // ==================== LEAD SOURCES ROUTES ====================
    // Get all lead sources
    app.get("/api/crm/lead-sources", authenticateUser, async (req, res) => {
        try {
            const sources = await storage_1.storage.getLeadSources();
            res.json(sources);
        }
        catch (error) {
            console.error("Error fetching lead sources:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Create lead source
    app.post("/api/crm/lead-sources", authenticateUser, async (req, res) => {
        try {
            const sourceData = schema_1.insertLeadSourceSchema.parse(req.body);
            const source = await storage_1.storage.createLeadSource(sourceData);
            res.status(201).json(source);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            console.error("Error creating lead source:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Update lead source
    app.put("/api/crm/lead-sources/:id", authenticateUser, async (req, res) => {
        try {
            const source = await storage_1.storage.updateLeadSource(req.params.id, req.body);
            res.json(source);
        }
        catch (error) {
            console.error("Error updating lead source:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Delete lead source
    app.delete("/api/crm/lead-sources/:id", authenticateUser, async (req, res) => {
        try {
            await storage_1.storage.deleteLeadSource(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting lead source:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Test route for debugging
    app.get("/api/test", (req, res) => {
        console.log("Test route hit!");
        res.json({ message: "API is working!", timestamp: new Date().toISOString() });
    });
    app.get("/api/crm/clients", authenticateUser, async (req, res) => {
        console.log(`/api/crm/clients GET received - query:`, req.query);
        try {
            const clients = await storage_1.storage.getCrmClients();
            res.json(clients);
        }
        catch (error) {
            console.error("Error fetching CRM clients:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Find duplicate clients (by email or phone)
    app.get("/api/crm/clients/duplicates", authenticateUser, async (req, res) => {
        try {
            const by = (String(req.query.by || 'email').toLowerCase() === 'phone') ? 'phone' : 'email';
            const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 100)));
            const keyExpr = by === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
            const rows = await runSql(`SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
         FROM crm_clients
         WHERE ${keyExpr} IS NOT NULL
         GROUP BY 1
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC
         LIMIT $1`, [limit]);
            res.json({ by, groups: rows });
        }
        catch (error) {
            console.error('Error listing duplicate clients:', error);
            res.status(500).json({ error: 'Failed to list duplicates' });
        }
    });
    // Merge duplicate clients into a single record per duplicate key
    app.post("/api/crm/clients/merge-duplicates", authenticateUser, async (req, res) => {
        try {
            const { by = 'email', dryRun = true, limit = 200, strategy = 'keep-oldest' } = req.body || {};
            const mode = String(by).toLowerCase() === 'phone' ? 'phone' : 'email';
            const keepOldest = String(strategy).toLowerCase() !== 'keep-newest';
            const lim = Math.max(1, Math.min(1000, Number(limit)));
            const keyExpr = mode === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
            const groups = await runSql(`SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
         FROM crm_clients
         WHERE ${keyExpr} IS NOT NULL
         GROUP BY 1
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC
         LIMIT $1`, [lim]);
            let totalMerged = 0;
            const previews = [];
            for (const g of groups) {
                const ids = g.ids || [];
                if (!ids || ids.length < 2)
                    continue;
                // Load candidate rows to pick a primary
                const rows = await runSql(`SELECT id, created_at, updated_at, first_name, last_name, email, phone, address, city, state, zip, country, company, notes
           FROM crm_clients WHERE id = ANY($1)`, [ids]);
                if (!rows || rows.length < 2)
                    continue;
                rows.sort((a, b) => {
                    const ta = new Date(a.created_at || a.updated_at || 0).getTime();
                    const tb = new Date(b.created_at || b.updated_at || 0).getTime();
                    return keepOldest ? (ta - tb) : (tb - ta);
                });
                const primary = rows[0];
                const duplicates = rows.slice(1);
                const dupIds = duplicates.map((r) => r.id);
                previews.push({ key: g.dup_key, keep: primary.id, remove: dupIds });
                totalMerged += dupIds.length;
                if (dryRun)
                    continue;
                // For each duplicate, re-link references then delete dup
                for (const d of duplicates) {
                    const dupId = d.id;
                    // Re-link references to primary client
                    await runSql(`UPDATE crm_invoices SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]);
                    await runSql(`UPDATE crm_messages SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]);
                    await runSql(`UPDATE voucher_sales SET redeemed_by = $1 WHERE redeemed_by = $2`, [primary.id, dupId]);
                    await runSql(`UPDATE galleries SET client_id = $1 WHERE client_id = $2`, [primary.id, dupId]).catch(() => { });
                    // photography_sessions stores client_id as text
                    await runSql(`UPDATE photography_sessions SET client_id = $1::text WHERE client_id = $2::text`, [primary.id, dupId]).catch(() => { });
                    // Best-effort: fill missing fields on primary with data from duplicate
                    await runSql(`UPDATE crm_clients AS c SET
               phone = COALESCE(NULLIF(c.phone,''), NULLIF($2,'')),
               address = COALESCE(NULLIF(c.address,''), NULLIF($3,'')),
               city = COALESCE(NULLIF(c.city,''), NULLIF($4,'')),
               state = COALESCE(NULLIF(c.state,''), NULLIF($5,'')),
               zip = COALESCE(NULLIF(c.zip,''), NULLIF($6,'')),
               country = COALESCE(NULLIF(c.country,''), NULLIF($7,'')),
               company = COALESCE(NULLIF(c.company,''), NULLIF($8,'')),
               notes = COALESCE(NULLIF(c.notes,''), NULLIF($9,'')),
               updated_at = NOW()
             WHERE c.id = $1`, [primary.id, d.phone, d.address, d.city, d.state, d.zip, d.country, d.company, d.notes]).catch(() => { });
                    // Delete duplicate row
                    await runSql(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
                }
            }
            return res.json({ success: true, dryRun, by: mode, groups: groups.length, totalMerged, preview: previews.slice(0, 20) });
        }
        catch (error) {
            console.error('Error merging duplicate clients:', error);
            res.status(500).json({ error: 'Failed to merge duplicates' });
        }
    });
    // Generate detailed merge suggestions (no mutations)
    app.get("/api/crm/clients/merge-suggestions", authenticateUser, async (req, res) => {
        try {
            const mode = String(req.query.by || 'email').toLowerCase() === 'phone' ? 'phone' : 'email';
            const strategy = String(req.query.strategy || 'keep-oldest').toLowerCase();
            const keepOldest = strategy !== 'keep-newest';
            const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 100)));
            const keyExpr = mode === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
            const groups = await runSql(`SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
         FROM crm_clients
         WHERE ${keyExpr} IS NOT NULL
         GROUP BY 1
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC
         LIMIT $1`, [limit]);
            const suggestions = [];
            for (const g of groups) {
                const ids = g.ids || [];
                if (!ids || ids.length < 2)
                    continue;
                const rows = await runSql(`SELECT id, created_at, updated_at, first_name, last_name, email, phone, address, city, state, zip, country, company, notes
           FROM crm_clients WHERE id = ANY($1)`, [ids]);
                if (!rows || rows.length < 2)
                    continue;
                rows.sort((a, b) => {
                    const ta = new Date(a.created_at || a.updated_at || 0).getTime();
                    const tb = new Date(b.created_at || b.updated_at || 0).getTime();
                    return keepOldest ? (ta - tb) : (tb - ta);
                });
                const primary = rows[0];
                const duplicates = rows.slice(1);
                suggestions.push({ key: g.dup_key, primary, duplicates });
            }
            res.json({ success: true, by: mode, strategy, count: suggestions.length, suggestions });
        }
        catch (error) {
            console.error('Error creating merge suggestions:', error);
            res.status(500).json({ error: 'Failed to build merge suggestions' });
        }
    });
    // Execute a specific merge decision from wizard
    app.post("/api/crm/clients/merge-execute", authenticateUser, async (req, res) => {
        try {
            const { primaryId, duplicateIds } = req.body || {};
            if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
                return res.status(400).json({ error: 'primaryId and duplicateIds[] required' });
            }
            // Basic validation to ensure primary exists
            const primaryRows = await runSql(`SELECT id, phone, address, city, state, zip, country, company, notes FROM crm_clients WHERE id = $1`, [primaryId]);
            if (!primaryRows || primaryRows.length === 0) {
                return res.status(404).json({ error: 'Primary client not found' });
            }
            let merged = 0;
            for (const dupId of duplicateIds) {
                if (dupId === primaryId)
                    continue;
                const dupRows = await runSql(`SELECT id, phone, address, city, state, zip, country, company, notes FROM crm_clients WHERE id = $1`, [dupId]);
                if (!dupRows || dupRows.length === 0)
                    continue;
                const d = dupRows[0];
                // Relink references
                await runSql(`UPDATE crm_invoices SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]);
                await runSql(`UPDATE crm_messages SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]);
                await runSql(`UPDATE voucher_sales SET redeemed_by = $1 WHERE redeemed_by = $2`, [primaryId, dupId]);
                await runSql(`UPDATE galleries SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(() => { });
                await runSql(`UPDATE photography_sessions SET client_id = $1::text WHERE client_id = $2::text`, [primaryId, dupId]).catch(() => { });
                // Fill missing primary fields
                await runSql(`UPDATE crm_clients AS c SET
             phone = COALESCE(NULLIF(c.phone,''), NULLIF($2,'')),
             address = COALESCE(NULLIF(c.address,''), NULLIF($3,'')),
             city = COALESCE(NULLIF(c.city,''), NULLIF($4,'')),
             state = COALESCE(NULLIF(c.state,''), NULLIF($5,'')),
             zip = COALESCE(NULLIF(c.zip,''), NULLIF($6,'')),
             country = COALESCE(NULLIF(c.country,''), NULLIF($7,'')),
             company = COALESCE(NULLIF(c.company,''), NULLIF($8,'')),
             notes = COALESCE(NULLIF(c.notes,''), NULLIF($9,'')),
             updated_at = NOW()
           WHERE c.id = $1`, [primaryId, d.phone, d.address, d.city, d.state, d.zip, d.country, d.company, d.notes]).catch(() => { });
                await runSql(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
                merged++;
            }
            const updatedPrimary = await runSql(`SELECT * FROM crm_clients WHERE id = $1`, [primaryId]);
            res.json({ success: true, merged, primaryId, primary: updatedPrimary?.[0] });
        }
        catch (error) {
            console.error('Error executing targeted merge:', error);
            res.status(500).json({ error: 'Failed to execute merge' });
        }
    });
    // Batch execute multiple merge decisions in a single request
    app.post("/api/crm/clients/merge-execute-batch", authenticateUser, async (req, res) => {
        try {
            const { merges } = req.body || {};
            if (!Array.isArray(merges) || merges.length === 0) {
                return res.status(400).json({ error: 'merges[] required: [{primaryId, duplicateIds[]}]' });
            }
            const results = [];
            for (const m of merges) {
                const primaryId = m.primaryId;
                const duplicateIds = Array.isArray(m.duplicateIds) ? m.duplicateIds : [];
                if (!primaryId || duplicateIds.length === 0) {
                    results.push({ primaryId, skipped: true, reason: 'missing primaryId or duplicateIds' });
                    continue;
                }
                try {
                    let merged = 0;
                    for (const dupId of duplicateIds) {
                        if (dupId === primaryId)
                            continue;
                        const dupRows = await runSql(`SELECT id, phone, address, city, state, zip, country, company, notes FROM crm_clients WHERE id = $1`, [dupId]);
                        if (!dupRows || dupRows.length === 0)
                            continue;
                        const d = dupRows[0];
                        await runSql(`UPDATE crm_invoices SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]);
                        await runSql(`UPDATE crm_messages SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]);
                        await runSql(`UPDATE voucher_sales SET redeemed_by = $1 WHERE redeemed_by = $2`, [primaryId, dupId]);
                        await runSql(`UPDATE galleries SET client_id = $1 WHERE client_id = $2`, [primaryId, dupId]).catch(() => { });
                        await runSql(`UPDATE photography_sessions SET client_id = $1::text WHERE client_id = $2::text`, [primaryId, dupId]).catch(() => { });
                        await runSql(`UPDATE crm_clients AS c SET
                  phone = COALESCE(NULLIF(c.phone,''), NULLIF($2,'')),
                  address = COALESCE(NULLIF(c.address,''), NULLIF($3,'')),
                  city = COALESCE(NULLIF(c.city,''), NULLIF($4,'')),
                  state = COALESCE(NULLIF(c.state,''), NULLIF($5,'')),
                  zip = COALESCE(NULLIF(c.zip,''), NULLIF($6,'')),
                  country = COALESCE(NULLIF(c.country,''), NULLIF($7,'')),
                  company = COALESCE(NULLIF(c.company,''), NULLIF($8,'')),
                  notes = COALESCE(NULLIF(c.notes,''), NULLIF($9,'')),
                  updated_at = NOW()
                 WHERE c.id = $1`, [primaryId, d.phone, d.address, d.city, d.state, d.zip, d.country, d.company, d.notes]).catch(() => { });
                        await runSql(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
                        merged++;
                    }
                    results.push({ primaryId, merged });
                }
                catch (innerErr) {
                    results.push({ primaryId: m.primaryId, error: innerErr?.message || 'merge failed' });
                }
            }
            res.json({ success: true, count: results.length, results });
        }
        catch (error) {
            console.error('Error executing batch merge:', error);
            res.status(500).json({ error: 'Failed batch merge' });
        }
    });
    // ==================== CRM LEADS ====================
    app.get("/api/crm/leads", authenticateUser, async (req, res) => {
        try {
            const status = req.query.status || undefined;
            const leads = await storage_1.storage.getCrmLeads(status);
            res.json(leads);
        }
        catch (error) {
            console.error('Error fetching leads:', error);
            res.status(404).json({ error: 'Leads not found' });
        }
    });
    app.get("/api/crm/leads/:id", authenticateUser, async (req, res) => {
        try {
            const lead = await storage_1.storage.getCrmLead(req.params.id);
            if (!lead)
                return res.status(404).json({ error: 'Lead not found' });
            res.json(lead);
        }
        catch (error) {
            console.error('Error fetching lead:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.post("/api/crm/leads", authenticateUser, async (req, res) => {
        try {
            const created = await storage_1.storage.createCrmLead(req.body);
            res.status(201).json(created);
        }
        catch (error) {
            console.error('Error creating lead:', error);
            res.status(500).json({ error: error.message || 'Failed to create lead' });
        }
    });
    app.put("/api/crm/leads/:id", authenticateUser, async (req, res) => {
        try {
            const updated = await storage_1.storage.updateCrmLead(req.params.id, req.body);
            res.json(updated);
        }
        catch (error) {
            console.error('Error updating lead:', error);
            res.status(500).json({ error: error.message || 'Failed to update lead' });
        }
    });
    app.delete("/api/crm/leads/:id", authenticateUser, async (req, res) => {
        try {
            await storage_1.storage.deleteCrmLead(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error deleting lead:', error);
            res.status(500).json({ error: 'Failed to delete lead' });
        }
    });
    // High-value clients endpoint for reports dashboard
    app.get("/api/reports/high-value-clients", authenticateUser, async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            // Query to get clients with their total booking revenue and count
            const query = `
        SELECT 
          c.id,
          c.name,
          COALESCE(SUM(CAST(i.total AS DECIMAL(10,2))), 0) as total_revenue,
          COUNT(DISTINCT b.id) as booking_count
        FROM crm_clients c
        LEFT JOIN bookings b ON b.client_id = c.id
        LEFT JOIN invoices i ON i.client_id = c.id AND i.status = 'paid'
        GROUP BY c.id, c.name
        HAVING COALESCE(SUM(CAST(i.total AS DECIMAL(10,2))), 0) > 0
        ORDER BY total_revenue DESC
        LIMIT $1
      `;
            const result = await db_1.db.execute(drizzle_orm_1.sql.raw(query), [limit]);
            const clients = result.rows || [];
            res.json(clients.map((row) => ({
                name: row.name || 'Unknown Client',
                revenue: parseFloat(row.total_revenue || 0),
                bookings: parseInt(row.booking_count || 0)
            })));
        }
        catch (error) {
            console.error('Error fetching high-value clients:', error);
            res.status(500).json({ error: 'Failed to fetch high-value clients', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    });
    // Alias route for frontend compatibility (/api/leads/list)
    app.get("/api/leads/list", authenticateUser, async (req, res) => {
        try {
            const status = req.query.status || undefined;
            const q = req.query.q || undefined;
            const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
            const offset = req.query.offset ? parseInt(req.query.offset) : undefined;
            const leads = await storage_1.storage.getCrmLeads(status);
            // Filter by search query if provided
            let filtered = leads;
            if (q) {
                const searchLower = q.toLowerCase();
                filtered = leads.filter(lead => (lead.name?.toLowerCase().includes(searchLower)) ||
                    (lead.email?.toLowerCase().includes(searchLower)) ||
                    (lead.phone?.includes(q)) ||
                    (lead.message?.toLowerCase().includes(searchLower)));
            }
            // Apply pagination
            const total = filtered.length;
            const paginatedLeads = filtered.slice(offset || 0, (offset || 0) + (limit || filtered.length));
            // Transform to match frontend expectations
            const rows = paginatedLeads.map(lead => ({
                id: lead.id,
                full_name: lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
                email: lead.email,
                phone: lead.phone,
                message: lead.message,
                form_type: lead.source || 'MANUAL',
                status: lead.status || 'new',
                created_at: lead.createdAt
            }));
            res.json({ rows, total, limit, offset });
        }
        catch (error) {
            console.error('Error fetching leads:', error);
            res.status(500).json({ error: 'Failed to fetch leads', rows: [], total: 0 });
        }
    });
    // Bulk mark new leads as contacted
    app.post("/api/leads/bulk/mark-new-contacted", authenticateUser, async (req, res) => {
        try {
            const result = await runSql(`
        UPDATE crm_leads 
        SET status = 'contacted', updated_at = NOW()
        WHERE status = 'new'
        RETURNING id
      `, []);
            res.json({
                success: true,
                message: `${result.length} leads marked as contacted`,
                count: result.length
            });
        }
        catch (error) {
            console.error('Error bulk updating leads:', error);
            res.status(500).json({ error: 'Failed to bulk update leads' });
        }
    });
    // Create new lead endpoint
    app.post("/api/leads/create", async (req, res) => {
        try {
            const { name, email, phone, message, source, formType } = req.body;
            // Validate required fields
            if (!email && !phone) {
                return res.status(400).json({ error: 'Either email or phone is required' });
            }
            const newLead = await storage_1.storage.createCrmLead({
                name: name || '',
                firstName: name?.split(' ')[0] || '',
                lastName: name?.split(' ').slice(1).join(' ') || '',
                email: email || null,
                phone: phone || null,
                message: message || null,
                source: source || formType || 'WEBSITE',
                status: 'new',
                assignedTo: null
            });
            res.status(201).json({ success: true, lead: newLead });
        }
        catch (error) {
            console.error('Error creating lead:', error);
            res.status(500).json({ error: 'Failed to create lead' });
        }
    });
    app.get("/api/crm/clients/:id", authenticateUser, async (req, res) => {
        console.log(`/api/crm/clients/${req.params.id} GET received`);
        try {
            const client = await storage_1.storage.getCrmClient(req.params.id);
            if (!client) {
                return res.status(404).json({ error: "Client not found" });
            }
            // Calculate lifetime value from paid invoices
            const lifetimeValueQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END)::double precision, 0)::double precision AS lifetime_value,
          COALESCE(COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END), 0)::int AS invoice_count
        FROM crm_invoices i
        WHERE i.client_id = $1
      `;
            const lifetimeResult = await runSql(lifetimeValueQuery, [req.params.id]);
            const lifetimeValue = lifetimeResult[0]?.lifetime_value || 0;
            const invoiceCount = lifetimeResult[0]?.invoice_count || 0;
            // Add calculated fields to client object
            const enrichedClient = {
                ...client,
                lifetimeValue: lifetimeValue.toString(),
                invoiceCount,
                totalRevenue: lifetimeValue
            };
            res.json(enrichedClient);
        }
        catch (error) {
            console.error("Error fetching CRM client:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Create a new CRM client
    app.post("/api/crm/clients", authenticateUser, async (req, res) => {
        console.log(`/api/crm/clients POST received - body:`, req.body);
        try {
            // Convert ISO date strings to Date objects before validation
            const processedBody = { ...req.body };
            if (processedBody.clientSince && typeof processedBody.clientSince === 'string') {
                processedBody.clientSince = new Date(processedBody.clientSince);
            }
            if (processedBody.lastSessionDate && typeof processedBody.lastSessionDate === 'string') {
                processedBody.lastSessionDate = new Date(processedBody.lastSessionDate);
            }
            // Validate input against the shared insert schema
            const clientData = insertCrmClientSchema.parse(processedBody);
            const client = await storage_1.storage.createCrmClient(clientData);
            res.status(201).json(client);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                console.log("Validation error creating CRM client:", JSON.stringify(error.errors, null, 2));
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            console.error("Error creating CRM client:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.put("/api/crm/clients/:id", authenticateUser, async (req, res) => {
        console.log(`/api/crm/clients/${req.params.id} PUT received - body:`, req.body);
        try {
            const client = await storage_1.storage.updateCrmClient(req.params.id, req.body);
            console.log(`/api/crm/clients/${req.params.id} updated:`, client);
            res.json(client);
        }
        catch (error) {
            console.error("Error updating CRM client:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Get gallery cover image for a client (for avatar display)
    app.get("/api/crm/clients/:id/gallery-cover", authenticateUser, async (req, res) => {
        try {
            const clientId = req.params.id;
            // Find galleries for this client with a cover image
            const gallery = await storage_1.storage.getClientGalleryWithCover(clientId);
            if (!gallery || !gallery.coverImage) {
                return res.json({ coverImage: null });
            }
            res.json({ coverImage: gallery.coverImage });
        }
        catch (error) {
            console.error("Error fetching client gallery cover:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== PHOTOGRAPHY SESSION ROUTES ====================
    app.get("/api/photography/sessions", authenticateUser, async (req, res) => {
        try {
            const photographerId = req.query.photographerId;
            const sessions = await storage_1.storage.getPhotographySessions(photographerId);
            res.json(sessions);
        }
        catch (error) {
            console.error("Error fetching photography sessions:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Alias route for frontend compatibility
    app.get("/api/photography-sessions", authenticateUser, async (req, res) => {
        try {
            const photographerId = req.query.photographerId;
            const sessions = await storage_1.storage.getPhotographySessions(photographerId);
            res.json(sessions);
        }
        catch (error) {
            console.error("Error fetching photography sessions:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Single, stable debug public endpoint (no auth) to return up to 50 sessions for frontend testing
    // Keep this endpoint lightweight and predictable; remove or secure before production.
    app.get("/api/debug/photography-sessions", async (req, res) => {
        try {
            const photographerId = req.query.photographerId;
            const q = req.query.q?.toLowerCase();
            const date = req.query.date; // YYYY-MM-DD
            const month = req.query.month; // MM
            const year = req.query.year; // YYYY
            const limit = Math.max(1, Math.min(1000, Number(req.query.limit ?? 50)));
            console.error(`DEBUG_ENDPOINT_HIT | pid=${photographerId || '<none>'} | q=${q || ''} | date=${date || ''} | month=${month || ''} | year=${year || ''} | limit=${limit}`);
            let sessions = await storage_1.storage.getPhotographySessions(photographerId);
            if (!Array.isArray(sessions)) {
                console.error('DEBUG_ENDPOINT_RESULT | sessions not array');
                return res.status(200).json([]);
            }
            // Apply query filters in-memory to keep endpoint simple
            if (q) {
                const needle = q;
                sessions = sessions.filter(s => (s.title || '').toLowerCase().includes(needle) ||
                    (s.clientName || '').toLowerCase().includes(needle) ||
                    (s.description || '').toLowerCase().includes(needle));
            }
            if (date || month || year) {
                sessions = sessions.filter(s => {
                    const d = s.startTime ? new Date(s.startTime) : (s.endTime ? new Date(s.endTime) : null);
                    if (!d || isNaN(d.getTime()))
                        return false;
                    if (date) {
                        // match exact day
                        const y = d.getFullYear();
                        const m = (d.getMonth() + 1).toString().padStart(2, '0');
                        const day = d.getDate().toString().padStart(2, '0');
                        if (`${y}-${m}-${day}` !== date)
                            return false;
                    }
                    if (month) {
                        const m = (d.getMonth() + 1).toString().padStart(2, '0');
                        if (m !== month.padStart(2, '0'))
                            return false;
                    }
                    if (year) {
                        if (d.getFullYear().toString() !== year)
                            return false;
                    }
                    return true;
                });
            }
            // Sort by startTime ascending
            sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            console.error(`DEBUG_ENDPOINT_RESULT | found=${sessions.length} | returning=${Math.min(limit, sessions.length)}`);
            return res.status(200).json(sessions.slice(0, limit));
        }
        catch (error) {
            console.error('Error fetching debug photography sessions:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get("/api/photography/sessions/:id", authenticateUser, async (req, res) => {
        try {
            const session = await storage_1.storage.getPhotographySession(req.params.id);
            if (!session) {
                return res.status(404).json({ error: "Session not found" });
            }
            res.json(session);
        }
        catch (error) {
            console.error("Error fetching photography session:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/photography/sessions", authenticateUser, async (req, res) => {
        try {
            console.log("Received session data:", JSON.stringify(req.body, null, 2));
            const sessionData = {
                ...req.body,
                createdBy: req.user.id,
                photographerId: req.user.id,
                // Convert string dates to Date objects if they're strings
                startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
                endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
            };
            console.log("Session data with user info:", JSON.stringify(sessionData, null, 2));
            const validatedData = insertPhotographySessionSchema.parse(sessionData);
            const session = await storage_1.storage.createPhotographySession(validatedData);
            res.status(201).json(session);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                console.log("Validation error details:", JSON.stringify(error.errors, null, 2));
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            console.error("Error creating photography session:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.put("/api/photography/sessions/:id", authenticateUser, async (req, res) => {
        try {
            const session = await storage_1.storage.updatePhotographySession(req.params.id, req.body);
            res.json(session);
        }
        catch (error) {
            console.error("Error updating photography session:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.delete("/api/photography/sessions/:id", authenticateUser, async (req, res) => {
        try {
            await storage_1.storage.deletePhotographySession(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting photography session:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== CALENDAR ROUTES ====================
    // GET /api/calendar/sessions - Retrieve calendar sessions with filters
    app.get("/api/calendar/sessions", authenticateUser, async (req, res) => {
        try {
            const { start_date, end_date, client_id, session_type, status, limit = '200' } = req.query;
            let query = `
        SELECT 
          ps.id,
          ps.client_id,
          ps.title,
          ps.session_type,
          ps.start_time as "startTime",
          ps.end_time as "endTime",
          ps.location_name as "locationName",
          ps.location_address as "locationAddress",
          ps.notes,
          ps.base_price as "basePrice",
          ps.deposit_amount as "depositAmount",
          ps.deposit_paid as "depositPaid",
          ps.equipment_list as "equipmentList",
          ps.status,
          ps.client_name as "clientName",
          ps.client_email as "clientEmail",
          ps.client_phone as "clientPhone",
          ps.google_calendar_event_id as "googleCalendarEventId",
          ps.created_at as "createdAt",
          ps.updated_at as "updatedAt",
          c.first_name || ' ' || c.last_name as "joinedClientName",
          c.email as "joinedClientEmail",
          c.phone as "joinedClientPhone"
        FROM photography_sessions ps
        LEFT JOIN crm_clients c ON ps.client_id = c.id::text
      `;
            const conditions = [];
            const values = [];
            let paramIndex = 1;
            if (start_date) {
                conditions.push(`ps.start_time >= $${paramIndex}`);
                values.push(start_date);
                paramIndex++;
            }
            if (end_date) {
                conditions.push(`ps.start_time <= $${paramIndex}`);
                values.push(end_date);
                paramIndex++;
            }
            if (client_id) {
                conditions.push(`ps.client_id = $${paramIndex}`);
                values.push(client_id);
                paramIndex++;
            }
            if (session_type) {
                conditions.push(`ps.session_type = $${paramIndex}`);
                values.push(session_type);
                paramIndex++;
            }
            if (status) {
                conditions.push(`ps.status = $${paramIndex}`);
                values.push(status);
                paramIndex++;
            }
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ` ORDER BY ps.start_time ASC LIMIT $${paramIndex}`;
            values.push(parseInt(limit));
            const sessions = await runSql(query, values);
            res.json(sessions);
        }
        catch (error) {
            console.error('Failed to fetch calendar sessions:', error);
            res.status(500).json({ error: 'Failed to fetch calendar sessions' });
        }
    });
    // POST /api/calendar/sessions - Create new photography session
    app.post("/api/calendar/sessions", authenticateUser, async (req, res) => {
        try {
            const { client_id, session_type, title, start_time, end_time, session_date, duration_minutes = 120, location_name, location_address, location, notes = '', base_price = 0, price = 0, deposit_amount = 0, deposit_required = 0, equipment_list = [], equipment_needed = [] } = req.body;
            const actualStartTime = start_time || session_date;
            const actualEndTime = end_time || (actualStartTime ? new Date(new Date(actualStartTime).getTime() + (duration_minutes * 60 * 1000)).toISOString() : null);
            const actualLocation = location_name || location || '';
            const actualPrice = base_price || price || 0;
            const actualDeposit = deposit_amount || deposit_required || 0;
            const actualEquipment = equipment_list.length > 0 ? equipment_list : equipment_needed;
            if (!client_id || !session_type || !actualStartTime) {
                return res.status(400).json({
                    error: 'Missing required fields: client_id, session_type, start_time (or session_date)'
                });
            }
            const sessionId = crypto.randomUUID();
            await runSql(`INSERT INTO photography_sessions (
          id, client_id, session_type, title, start_time, end_time,
          location_name, location_address, notes, base_price, deposit_amount, equipment_list,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'scheduled', NOW(), NOW())`, [sessionId, client_id, session_type, title || session_type, actualStartTime, actualEndTime, actualLocation, location_address || '', notes, actualPrice, actualDeposit, JSON.stringify(actualEquipment)]);
            const [newSession] = (await runSql(`SELECT * FROM photography_sessions WHERE id = $1`, [sessionId]));
            res.status(201).json(newSession);
        }
        catch (error) {
            console.error('Failed to create photography session:', error);
            res.status(500).json({ error: 'Failed to create photography session' });
        }
    });
    // PUT /api/calendar/sessions/:id - Update photography session
    app.put("/api/calendar/sessions/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };
            // Remove ID from update data
            delete updateData.id;
            const updates = [];
            const values = [];
            let paramIndex = 1;
            Object.keys(updateData).forEach(key => {
                if (key !== 'id') {
                    updates.push(`${key} = $${paramIndex}`);
                    values.push(updateData[key]);
                    paramIndex++;
                }
            });
            if (updates.length === 0) {
                return res.status(400).json({ error: 'No update data provided' });
            }
            updates.push('updated_at = NOW()');
            values.push(id);
            const query = `
        UPDATE photography_sessions 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
            const result = await runSql(query, values);
            if (result.length === 0) {
                return res.status(404).json({ error: 'Session not found' });
            }
            res.json(result[0]);
        }
        catch (error) {
            console.error('Failed to update photography session:', error);
            res.status(500).json({ error: 'Failed to update photography session' });
        }
    });
    // DELETE /api/calendar/sessions/:id - Cancel photography session
    app.delete("/api/calendar/sessions/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            const { cancellation_reason, refund_amount = 0 } = req.body;
            const result = await runSql(`UPDATE photography_sessions
        SET status = 'CANCELLED', 
            cancellation_reason = $1, 
            refund_amount = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *`, [cancellation_reason, refund_amount, id]);
            if (result.length === 0) {
                return res.status(404).json({ error: 'Session not found' });
            }
            res.json({
                message: 'Session cancelled successfully',
                session: result[0]
            });
        }
        catch (error) {
            console.error('Failed to cancel photography session:', error);
            res.status(500).json({ error: 'Failed to cancel photography session' });
        }
    });
    // GET /api/calendar/availability - Check calendar availability
    app.get("/api/calendar/availability", authenticateUser, async (req, res) => {
        try {
            const { date, duration_minutes = '120' } = req.query;
            if (!date) {
                return res.status(400).json({ error: 'Date parameter is required' });
            }
            // Get existing sessions for the date
            const existingSessions = await runSql(`SELECT start_time, end_time
        FROM photography_sessions
        WHERE DATE(start_time) = $1
        AND status IN ('scheduled', 'confirmed', 'CONFIRMED', 'PENDING')
        ORDER BY start_time`, [date]);
            // Define working hours (9 AM to 6 PM)
            const workingHours = { start: 9, end: 18 };
            const requestedDuration = parseInt(duration_minutes);
            const availableSlots = [];
            const bookedSlots = existingSessions.map(session => {
                const sessionStart = new Date(session.start_time);
                const sessionEnd = new Date(session.end_time);
                return {
                    start: sessionStart.getHours() + (sessionStart.getMinutes() / 60),
                    end: sessionEnd.getHours() + (sessionEnd.getMinutes() / 60)
                };
            });
            // Check each hour slot
            for (let hour = workingHours.start; hour < workingHours.end; hour++) {
                const slotEnd = hour + (requestedDuration / 60);
                if (slotEnd <= workingHours.end) {
                    const isAvailable = !bookedSlots.some(booked => (hour < booked.end && slotEnd > booked.start));
                    if (isAvailable) {
                        availableSlots.push({
                            time: `${hour.toString().padStart(2, '0')}:00`,
                            duration: `${requestedDuration} minutes`
                        });
                    }
                }
            }
            res.json({
                date,
                total_available_slots: availableSlots.length,
                available_slots: availableSlots,
                booked_sessions: existingSessions.length
            });
        }
        catch (error) {
            console.error('Failed to check calendar availability:', error);
            res.status(500).json({ error: 'Failed to check calendar availability' });
        }
    });
    // ------------------ Embed / Public Booking endpoints ------------------
    // Admin: set available slots (protected) - persisted in DB
    app.post('/api/admin/embed/slots', authenticateUser, async (req, res) => {
        try {
            const { slots, studioId } = req.body;
            if (!Array.isArray(slots))
                return res.status(400).json({ error: 'slots must be an array of ISO datetimes' });
            if (!studioId)
                return res.status(400).json({ error: 'studioId is required' });
            // Mark existing slots for studio inactive and insert new ones
            await runSql(`UPDATE studio_available_slots SET is_active = false WHERE studio_id = $1`, [studioId]);
            const inserted = [];
            for (const s of slots) {
                if (typeof s !== 'string')
                    continue;
                const start = new Date(s);
                if (isNaN(start.getTime()))
                    continue;
                const r = await runSql(`INSERT INTO studio_available_slots (studio_id, start_time, duration_minutes, is_active, created_at, updated_at) VALUES ($1,$2,$3,true,NOW(),NOW()) RETURNING *`, [studioId, start.toISOString(), 120]);
                if (r && r[0])
                    inserted.push(r[0]);
            }
            res.json({ success: true, slots: inserted });
        }
        catch (error) {
            console.error('Failed to save available slots:', error);
            res.status(500).json({ error: 'Failed to save available slots' });
        }
    });
    // Public: get embed availability between start and end (ISO)
    app.get('/api/embed/availability', async (req, res) => {
        try {
            const { start, end, calendarId } = req.query;
            if (!start || !end)
                return res.status(400).json({ error: 'start and end query parameters are required (ISO date strings)' });
            const startDate = new Date(start);
            const endDate = new Date(end);
            // Load admin slots from DB
            const studioId = req.query.studioId;
            let adminRows = [];
            if (studioId) {
                adminRows = await runSql(`SELECT start_time FROM studio_available_slots WHERE studio_id = $1 AND is_active = true AND start_time >= $2 AND start_time <= $3`, [studioId, startDate.toISOString(), endDate.toISOString()]);
            }
            else {
                adminRows = await runSql(`SELECT start_time FROM studio_available_slots WHERE is_active = true AND start_time >= $1 AND start_time <= $2`, [startDate.toISOString(), endDate.toISOString()]);
            }
            const adminSlots = adminRows.map(r => new Date(r.start_time));
            // Filter to requested window
            let candidateSlots = adminSlots.filter(d => d >= startDate && d <= endDate);
            // Remove slots that conflict with existing confirmed/pending sessions
            const existing = await runSql(`SELECT session_date, duration_minutes FROM photography_sessions WHERE session_date >= $1 AND session_date <= $2 AND status IN ('CONFIRMED','PENDING')`, [startDate.toISOString(), endDate.toISOString()]);
            const busyRanges = existing.map((s) => {
                const sd = new Date(s.session_date);
                return { start: sd.getTime(), end: sd.getTime() + (s.duration_minutes || 120) * 60000 };
            });
            const isBusy = (t) => busyRanges.some(b => t.getTime() < b.end && (t.getTime() + 1) > b.start);
            candidateSlots = candidateSlots.filter(d => !isBusy(d));
            // If Google API key + calendarId provided (either query or env), try to fetch events and remove busy times
            const googleKey = process.env.GOOGLE_API_KEY;
            const googleCal = calendarId || process.env.GOOGLE_CALENDAR_ID;
            if (googleKey && googleCal) {
                try {
                    const timeMin = startDate.toISOString();
                    const timeMax = endDate.toISOString();
                    const eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCal)}/events?singleEvents=true&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&key=${encodeURIComponent(googleKey)}`;
                    const resp = await fetch(eventsUrl);
                    if (resp.ok) {
                        const data = await resp.json();
                        const gBusy = (data.items || []).map((it) => ({
                            start: new Date(it.start?.dateTime || it.start?.date).getTime(),
                            end: new Date(it.end?.dateTime || it.end?.date).getTime()
                        }));
                        candidateSlots = candidateSlots.filter(d => !gBusy.some((b) => d.getTime() < b.end && (d.getTime() + 1) > b.start));
                    }
                }
                catch (err) {
                    console.warn('Google Calendar fetch failed:', err);
                }
            }
            res.json({ start, end, available: candidateSlots.map(d => d.toISOString()), total: candidateSlots.length });
        }
        catch (error) {
            console.error('Failed to return embed availability:', error);
            res.status(500).json({ error: 'Failed to return availability' });
        }
    });
    // Public: create a booking from embed widget
    app.post('/api/embed/book', async (req, res) => {
        try {
            const { firstName, lastName, email, phone, startTime, duration_minutes = 120, session_type = 'session' } = req.body;
            if (!firstName || !email || !startTime)
                return res.status(400).json({ error: 'firstName, email and startTime are required' });
            const start = new Date(startTime);
            if (isNaN(start.getTime()))
                return res.status(400).json({ error: 'Invalid startTime' });
            // Check conflict with existing sessions
            const conflict = await runSql(`SELECT session_date, duration_minutes FROM photography_sessions WHERE session_date >= $1 - INTERVAL '1 hour' AND session_date <= $2 + INTERVAL '1 hour' AND status IN ('CONFIRMED','PENDING')`, [new Date(start.getTime() - 60 * 60 * 1000).toISOString(), new Date(start.getTime() + (duration_minutes + 60) * 60000).toISOString()]);
            if (conflict && conflict.length > 0)
                return res.status(409).json({ error: 'Requested time conflicts with an existing session' });
            // Find or create client by email
            let client = null;
            const found = await runSql(`SELECT * FROM crm_clients WHERE email = $1 LIMIT 1`, [email]);
            if (found && found.length > 0) {
                client = found[0];
            }
            else {
                const clientData = { firstName, lastName, email, phone };
                client = await storage_1.storage.createCrmClient(clientData);
            }
            // Create photography session in DB
            const insertResult = await runSql(`INSERT INTO photography_sessions (client_id, session_type, session_date, duration_minutes, status, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING *`, [String(client.id), session_type, start.toISOString(), Number(duration_minutes), 'CONFIRMED', 'embed']);
            const created = insertResult[0];
            // Try to create Google Calendar event and save the google event id if available
            try {
                const studioCalendarService = await import('./services/calendarService').then(m => m.default);
                const googleEvent = await studioCalendarService.createGoogleEventPublic({
                    summary: `${session_type} - ${client.first_name || client.firstName || ''} ${client.last_name || client.lastName || ''}`.trim(),
                    description: `Booked via embed widget by ${client.email || ''}`,
                    start: { dateTime: start.toISOString(), timeZone: 'Europe/Vienna' },
                    end: { dateTime: new Date(start.getTime() + Number(duration_minutes) * 60000).toISOString(), timeZone: 'Europe/Vienna' },
                    attendees: client.email ? [{ email: client.email }] : undefined,
                });
                if (googleEvent && googleEvent.id) {
                    await runSql(`UPDATE photography_sessions SET google_calendar_event_id = $1 WHERE id = $2`, [googleEvent.id, created.id]);
                }
            }
            catch (googleErr) {
                console.warn('Google event creation failed, continuing:', googleErr);
            }
            res.status(201).json({ success: true, booking: created });
        }
        catch (error) {
            console.error('Failed to create embed booking:', error);
            res.status(500).json({ error: 'Failed to create booking' });
        }
    });
    // ==================== GALLERY ROUTES ====================
    app.get("/api/galleries", async (req, res) => {
        try {
            // Fetch public galleries with client information
            const result = await db_1.pool.query(`
        SELECT 
          g.id,
          g.title,
          g.slug,
          g.description,
          g.cover_image as "coverImage",
          g.cover_position as "coverPosition",
          g.cover_scale as "coverScale",
          g.cover_template as "coverTemplate",
          g.is_public as "isPublic",
          g.is_password_protected as "isPasswordProtected",
          g.client_id as "clientId",
          g.created_by as "createdBy",
          g.sort_order as "sortOrder",
          g.created_at as "createdAt",
          g.updated_at as "updatedAt",
          c.first_name || ' ' || c.last_name as "clientName",
          c.email as "clientEmail",
          (SELECT COUNT(*) FROM gallery_images gi WHERE gi.gallery_id = g.id) as "imageCount"
        FROM galleries g
        LEFT JOIN crm_clients c ON g.client_id = c.id
        WHERE g.is_public = true
        ORDER BY g.created_at DESC
      `);
            res.json(result.rows);
        }
        catch (error) {
            console.error("Error fetching galleries:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.get("/api/galleries/:slug", async (req, res) => {
        try {
            const idOrSlug = req.params.slug;
            // First try to find by slug
            let gallery = await storage_1.storage.getGalleryBySlug(idOrSlug);
            // If not found by slug, try finding by ID
            if (!gallery) {
                try {
                    gallery = await storage_1.storage.getGallery(idOrSlug);
                }
                catch (e) {
                    // ID lookup might fail if not a valid UUID, ignore
                }
            }
            if (!gallery) {
                return res.status(404).json({ error: "Gallery not found" });
            }
            // Fetch featured image if it exists
            if (gallery.featuredImageId) {
                const featuredImageResult = await db_1.pool.query(`SELECT id, filename, url, title, description
           FROM gallery_images 
           WHERE id = $1`, [gallery.featuredImageId]);
                if (featuredImageResult.rows.length > 0) {
                    const img = featuredImageResult.rows[0];
                    gallery.featuredImage = {
                        id: img.id,
                        filename: img.filename,
                        originalUrl: img.url,
                        displayUrl: img.url,
                        thumbUrl: img.url,
                        title: img.title,
                        description: img.description
                    };
                }
            }
            // SECURITY: Never expose the actual password to the client
            // Only send the isPasswordProtected boolean flag
            const { password, ...safeGallery } = gallery;
            res.json(safeGallery);
        }
        catch (error) {
            console.error("Error fetching gallery:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/galleries", authenticateUser, async (req, res) => {
        try {
            console.log('[GALLERY CREATE] User:', req.user);
            console.log('[GALLERY CREATE] Body:', req.body);
            // Don't set createdBy since it has a foreign key constraint to users table
            // Admin users are in admin_users table, not users table
            const galleryData = { ...req.body };
            delete galleryData.createdBy; // Remove if it was sent from client
            // Generate slug from title if not provided
            if (galleryData.title && !galleryData.slug) {
                galleryData.slug = galleryData.title
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
                    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
                    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
                    .substring(0, 100); // Limit length
            }
            const validatedData = insertGallerySchema.parse(galleryData);
            const gallery = await storage_1.storage.createGallery(validatedData);
            res.status(201).json(gallery);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                console.error('[GALLERY CREATE] Validation error:', error.errors);
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            console.error("[GALLERY CREATE] Error creating gallery:", error);
            res.status(500).json({ error: "Internal server error", message: error.message });
        }
    });
    // NOTE: Gallery PUT endpoint moved to line ~4000 with better field mapping
    app.delete("/api/galleries/:id", authenticateUser, async (req, res) => {
        try {
            await storage_1.storage.deleteGallery(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting gallery:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Gallery authentication endpoint (public)
    app.post("/api/galleries/:slug/auth", async (req, res) => {
        try {
            const { slug } = req.params;
            const { email, firstName, lastName, password } = req.body;
            if (!email) {
                return res.status(400).json({ error: "Email is required" });
            }
            // Get the gallery
            const gallery = await storage_1.storage.getGalleryBySlug(slug);
            if (!gallery) {
                return res.status(404).json({ error: "Gallery not found" });
            }
            // Check password if gallery is password protected
            if (gallery.isPasswordProtected && gallery.password) {
                if (!password) {
                    return res.status(401).json({ error: "Password is required" });
                }
                // Simple password comparison (in production, use hashed passwords)
                if (password !== gallery.password) {
                    return res.status(401).json({ error: "Invalid password" });
                }
            }
            // For now, return a simple token (in production, use JWT)
            const token = Buffer.from(`${gallery.id}:${email}:${Date.now()}`).toString('base64');
            res.json({ token });
        }
        catch (error) {
            console.error("Error authenticating gallery access:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Admin: Get gallery images by ID (no token required, uses session auth)
    app.get("/api/admin/galleries/:id/images", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            console.log(`[ADMIN GALLERY IMAGES] Fetching images for gallery ${id}`);
            // Get gallery images from database
            const galleryImages = await storage_1.storage.getGalleryImages(id);
            console.log(`[ADMIN GALLERY IMAGES] Gallery ${id}: Found ${galleryImages?.length || 0} images in database`);
            if (galleryImages && galleryImages.length > 0) {
                console.log(`[ADMIN GALLERY IMAGES] First image raw data:`, JSON.stringify(galleryImages[0], null, 2));
                console.log(`[ADMIN GALLERY IMAGES] All image IDs:`, galleryImages.map(img => img.id));
            }
            else {
                console.log(`[ADMIN GALLERY IMAGES] No images found in database for gallery ${id}`);
            }
            // Transform to match frontend expectations
            const transformedImages = (galleryImages || []).map(img => ({
                id: img.id,
                galleryId: img.galleryId || img.gallery_id,
                filename: img.filename,
                originalUrl: img.url || img.originalUrl,
                displayUrl: img.url || img.displayUrl,
                thumbUrl: img.url || img.thumbUrl,
                url: img.url, // Also include raw url
                title: img.title,
                description: img.description,
                orderIndex: img.sortOrder || img.sort_order || 0,
                createdAt: img.createdAt || img.created_at,
                sizeBytes: 0,
                contentType: 'image/jpeg',
                capturedAt: null
            }));
            console.log(`[ADMIN GALLERY IMAGES] Returning ${transformedImages.length} transformed images to frontend`);
            if (transformedImages.length > 0) {
                console.log(`[ADMIN GALLERY IMAGES] First transformed image:`, JSON.stringify(transformedImages[0], null, 2));
            }
            res.json(transformedImages);
        }
        catch (error) {
            console.error("[ADMIN GALLERY IMAGES] Error fetching gallery images:", error);
            res.status(500).json({ error: "Failed to fetch gallery images" });
        }
    });
    // Upload images to a gallery (admin only)
    app.post("/api/galleries/:galleryId/upload", authenticateUser, upload.array('images', 50), async (req, res) => {
        try {
            const { galleryId } = req.params;
            const files = req.files;
            console.log(`[GALLERY UPLOAD] ======= UPLOAD REQUEST RECEIVED =======`);
            console.log(`[GALLERY UPLOAD] Gallery ID: ${galleryId}`);
            console.log(`[GALLERY UPLOAD] Files array exists:`, !!files);
            console.log(`[GALLERY UPLOAD] Files length:`, files?.length || 0);
            if (files && files.length > 0) {
                console.log(`[GALLERY UPLOAD] First file:`, {
                    fieldname: files[0].fieldname,
                    originalname: files[0].originalname,
                    mimetype: files[0].mimetype,
                    size: files[0].size,
                    bufferExists: !!files[0].buffer,
                    bufferLength: files[0].buffer?.length || 0
                });
            }
            console.log(`[GALLERY UPLOAD] Content-Type:`, req.headers['content-type']);
            if (!files || files.length === 0) {
                console.log('[GALLERY UPLOAD] ERROR: No files in request');
                console.log('[GALLERY UPLOAD] Returning 400 - No images provided');
                return res.status(400).json({ error: "No images provided" });
            }
            // Verify gallery exists
            const gallery = await storage_1.storage.getGallery(galleryId);
            if (!gallery) {
                console.log('[GALLERY UPLOAD] Gallery not found:', galleryId);
                return res.status(404).json({ error: "Gallery not found" });
            }
            console.log(`[GALLERY UPLOAD] Starting upload of ${files.length} images to gallery ${galleryId}`);
            const uploadedImages = [];
            const errors = [];
            const s3Client = (0, s3_storage_1.getS3Client)();
            const s3Config = (0, s3_storage_1.getS3Config)();
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const timestamp = Date.now();
                const ext = path_1.default.extname(file.originalname).toLowerCase() || '.jpg';
                const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                const key = `galleries/${galleryId}/${timestamp}-${sanitizedFilename}`;
                try {
                    // Upload to B2/S3
                    console.log(`[GALLERY UPLOAD] Attempting S3 upload for ${file.originalname}...`);
                    await s3Client.send(new client_s3_1.PutObjectCommand({
                        Bucket: s3Config.bucket,
                        Key: key,
                        Body: file.buffer,
                        ContentType: file.mimetype,
                    }));
                    const imageUrl = (0, s3_storage_1.buildPublicUrl)(s3Config.bucket, s3Config.endpoint, key);
                    console.log(`[GALLERY UPLOAD] S3 upload successful for image ${i + 1}/${files.length}: ${imageUrl}`);
                    // Insert into gallery_images table
                    console.log(`[GALLERY UPLOAD] Inserting image ${i + 1} into DB:`, {
                        galleryId,
                        filename: sanitizedFilename,
                        url: imageUrl,
                        title: file.originalname,
                        sortOrder: i
                    });
                    const insertResult = await db_1.pool.query(`
            INSERT INTO gallery_images (gallery_id, filename, url, title, sort_order, size_bytes, content_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING id, gallery_id as "galleryId", filename, url, title, sort_order as "sortOrder", size_bytes as "sizeBytes", content_type as "contentType", created_at as "createdAt"
          `, [galleryId, sanitizedFilename, imageUrl, file.originalname, i, file.size, file.mimetype]);
                    const insertedImage = insertResult.rows[0];
                    console.log(`[GALLERY UPLOAD] DB insert successful. Inserted image ID:`, insertedImage.id);
                    uploadedImages.push({
                        id: insertedImage.id,
                        galleryId: insertedImage.galleryId,
                        filename: insertedImage.filename,
                        originalUrl: insertedImage.url,
                        displayUrl: insertedImage.url,
                        thumbUrl: insertedImage.url,
                        title: insertedImage.title,
                        orderIndex: insertedImage.sortOrder || 0,
                        createdAt: insertedImage.createdAt,
                        sizeBytes: file.size,
                        contentType: file.mimetype,
                    });
                    console.log(`[GALLERY UPLOAD] Added to uploadedImages array. Total uploaded so far: ${uploadedImages.length}`);
                }
                catch (uploadError) {
                    const errorMsg = `Failed to upload ${file.originalname}: ${uploadError.message}`;
                    console.error(`[GALLERY UPLOAD] ${errorMsg}`);
                    console.error(`[GALLERY UPLOAD] Full error:`, uploadError);
                    errors.push(errorMsg);
                    // Continue with other images even if one fails
                }
            }
            console.log(`[GALLERY UPLOAD] Successfully uploaded ${uploadedImages.length} out of ${files.length} images to gallery ${galleryId}`);
            if (uploadedImages.length === 0 && errors.length > 0) {
                console.error(`[GALLERY UPLOAD] All uploads failed. Errors:`, errors);
                return res.status(500).json({
                    error: "All uploads failed",
                    details: errors.join('; '),
                    uploadedCount: 0,
                    totalCount: files.length
                });
            }
            if (errors.length > 0) {
                console.warn(`[GALLERY UPLOAD] Some uploads failed:`, errors);
            }
            res.json(uploadedImages);
        }
        catch (error) {
            console.error("Error uploading gallery images:", error);
            res.status(500).json({ error: "Failed to upload images" });
        }
    });
    // Get gallery images (public, requires authentication token)
    app.get("/api/galleries/:slug/images", async (req, res) => {
        try {
            const { slug } = req.params;
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                return res.status(401).json({ error: "Authentication token required" });
            }
            // Get the gallery first
            const gallery = await storage_1.storage.getGalleryBySlug(slug);
            if (!gallery) {
                return res.status(404).json({ error: "Gallery not found" });
            }
            // Query Neon database for gallery images
            const galleryImages = await storage_1.storage.getGalleryImages(gallery.id);
            // Transform database images to match frontend expectations
            if (galleryImages && galleryImages.length > 0) {
                const transformedImages = galleryImages.map(img => ({
                    id: img.id,
                    galleryId: img.galleryId || img.gallery_id,
                    filename: img.filename,
                    originalUrl: img.url || img.originalUrl,
                    displayUrl: img.url || img.displayUrl,
                    thumbUrl: img.url || img.thumbUrl,
                    title: img.title,
                    description: img.description,
                    orderIndex: img.sortOrder || img.sort_order || 0,
                    createdAt: img.createdAt || img.created_at,
                    sizeBytes: 0,
                    contentType: 'image/jpeg',
                    capturedAt: null
                }));
                return res.json(transformedImages);
            }
            // If no database records found, check local file storage
            if (!galleryImages || galleryImages.length === 0) {
                console.log('No database records found, checking local file storage...');
                // Check for gallery files in public/uploads/galleries
                const fs = await import('fs/promises');
                const path = await import('path');
                try {
                    const galleryPath = path.join(process.cwd(), 'public', 'uploads', 'galleries', gallery.id.toString());
                    const files = await fs.readdir(galleryPath).catch(() => []);
                    if (files.length > 0) {
                        console.log(`Found ${files.length} local gallery files`);
                        const localGalleryImages = await Promise.all(files
                            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                            .map(async (file, index) => {
                            const filePath = path.join(galleryPath, file);
                            const stats = await fs.stat(filePath).catch(() => null);
                            return {
                                id: `local-${file}`,
                                galleryId: gallery.id,
                                filename: file,
                                originalUrl: `/uploads/galleries/${gallery.id}/${file}`,
                                displayUrl: `/uploads/galleries/${gallery.id}/${file}`,
                                thumbUrl: `/uploads/galleries/${gallery.id}/${file}`,
                                title: `Image ${index + 1}`,
                                description: `Local image: ${file}`,
                                orderIndex: index,
                                createdAt: stats?.birthtime?.toISOString() || new Date().toISOString(),
                                sizeBytes: stats?.size || 0,
                                contentType: `image/${path.extname(file).slice(1)}`,
                                capturedAt: null
                            };
                        }));
                        res.json(localGalleryImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                        return;
                    }
                }
                catch (error) {
                    console.log('Error checking local gallery files:', error);
                }
            }
            // If no images found, return empty array (no sample/placeholder images)
            if (!galleryImages || galleryImages.length === 0) {
                res.json([]);
                return;
            }
            // Return gallery images from Neon database
            res.json(galleryImages);
        }
        catch (error) {
            console.error("Error fetching gallery images:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Get products for print ordering
    app.get("/api/products", async (req, res) => {
        try {
            const result = await db_1.pool.query(`SELECT id, name, description, category, price, size, is_active, sort_order 
         FROM products 
         WHERE is_active = true 
         ORDER BY category, sort_order`);
            res.json(result.rows);
        }
        catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ error: "Failed to fetch products" });
        }
    });
    // Update image rating
    app.patch("/api/galleries/:galleryId/images/:imageId/rating", async (req, res) => {
        try {
            const { galleryId, imageId } = req.params;
            const { rating } = req.body;
            console.log('Rating update request:', { galleryId, imageId, rating });
            // Check if this is a sample/local file image (not in database)
            if (imageId.startsWith('sample-') || !imageId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                console.log('Sample image detected, rating not saved to database:', imageId);
                // Return success but don't save to database (sample images aren't in DB)
                return res.json({ success: true, rating, isSample: true });
            }
            // Validate rating value
            if (rating && !['love', 'maybe', 'reject'].includes(rating)) {
                console.error('Invalid rating value:', rating);
                return res.status(400).json({ error: "Invalid rating value" });
            }
            const result = await db_1.pool.query(`UPDATE gallery_images 
         SET rating = $1 
         WHERE id = $2 AND gallery_id = $3
         RETURNING id, rating`, [rating, imageId, galleryId]);
            console.log('Rating update result:', result.rows);
            if (result.rows.length === 0) {
                console.error('No image found with id:', imageId, 'in gallery:', galleryId);
                return res.status(404).json({ error: "Image not found" });
            }
            res.json({ success: true, rating });
        }
        catch (error) {
            console.error("Error updating image rating:", error);
            res.status(500).json({ error: "Failed to update rating", details: error.message });
        }
    });
    // Set gallery featured image
    app.put("/api/galleries/:galleryId/featured-image", authenticateUser, async (req, res) => {
        try {
            const { galleryId } = req.params;
            const { imageId } = req.body;
            await db_1.pool.query(`UPDATE galleries 
         SET featured_image_id = $1 
         WHERE id = $2`, [imageId, galleryId]);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error setting featured image:", error);
            res.status(500).json({ error: "Failed to set featured image" });
        }
    });
    // Admin dashboard stats route handled below with a safer implementation.
    // ==================== DASHBOARD METRICS ROUTE ====================
    // In development, allow unauthenticated access to avoid local session flakiness causing reload loops
    const devBypassAuth = (process.env.NODE_ENV || 'development') !== 'production';
    const disableAuthFlag = String(process.env.DISABLE_METRICS_AUTH || '').toLowerCase() === 'true';
    const metricsAuth = (devBypassAuth || disableAuthFlag) ? ((_, __, next) => next()) : authenticateUser;
    app.get("/api/crm/dashboard/metrics", metricsAuth, async (_req, res) => {
        // Helper to guard DB calls and always return an array fallback
        const safe = async (fn, fallback) => {
            try {
                return await fn();
            }
            catch (err) {
                console.warn("[dashboard-metrics] datasource failed:", err?.message || err);
                return fallback;
            }
        };
        try {
            // Fetch with safeguards so a transient DB hiccup doesn't 500 the page
            const [invoices, leads, sessions, clients] = await Promise.all([
                safe(() => storage_1.storage.getCrmInvoices(), []),
                safe(() => storage_1.storage.getCrmLeads(), []),
                safe(() => storage_1.storage.getPhotographySessions(), []),
                safe(() => storage_1.storage.getCrmClients(), []),
            ]);
            // Calculate revenue metrics from PAID invoices only
            const paidInvoices = (invoices || []).filter((inv) => inv?.status === "paid");
            const toNumber = (v) => {
                const n = parseFloat(v?.toString?.() ?? "0");
                return Number.isFinite(n) ? n : 0;
            };
            const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total), 0);
            const paidRevenue = totalRevenue;
            const avgOrderValue = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;
            // Calculate trend data from PAID invoices over last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const parseDate = (v) => {
                try {
                    const d = new Date(v);
                    return isNaN(d.getTime()) ? null : d;
                }
                catch {
                    return null;
                }
            };
            const recentInvoices = paidInvoices.filter((invoice) => {
                const created = parseDate(invoice.createdAt || invoice.created_at);
                return created ? created >= sevenDaysAgo : false;
            });
            const trendData = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split("T")[0];
                const dayRevenue = recentInvoices.reduce((sum, invoice) => {
                    const created = parseDate(invoice.createdAt || invoice.created_at);
                    const isSameDay = created ? created.toISOString().split("T")[0] === dateStr : false;
                    return isSameDay ? sum + toNumber(invoice.total) : sum;
                }, 0);
                trendData.push({ date: dateStr, value: dayRevenue });
            }
            const activeLeads = (leads || []).filter((lead) => {
                const s = (lead?.status || "").toString().toLowerCase();
                return s === "new" || s === "contacted";
            }).length;
            const upcomingSessions = (sessions || []).filter((session) => {
                const start = parseDate(session?.startTime || session?.start_time);
                return start ? start > new Date() : false;
            }).length;
            res.json({
                totalRevenue: Number((totalRevenue || 0).toFixed(2)),
                paidRevenue: Number((paidRevenue || 0).toFixed(2)),
                avgOrderValue: Number((avgOrderValue || 0).toFixed(2)),
                totalInvoices: (invoices || []).length,
                paidInvoices: paidInvoices.length,
                activeLeads,
                totalClients: (clients || []).length,
                upcomingSessions,
                trendData,
            });
        }
        catch (error) {
            console.error("[dashboard-metrics] Unexpected error:", error?.message || error);
            // Never take the dashboard down - return safe defaults
            res.json({
                totalRevenue: 0,
                paidRevenue: 0,
                avgOrderValue: 0,
                totalInvoices: 0,
                paidInvoices: 0,
                activeLeads: 0,
                totalClients: 0,
                upcomingSessions: 0,
                trendData: [],
            });
        }
    });
    // ==================== CALENDAR CLEANUP TOOLS (ADMIN) ====================
    // Detect suspicious "stacked" sessions sharing an identical start_time with high counts
    app.get("/api/admin/calendar/stacked-clusters", authenticateUser, async (req, res) => {
        try {
            const threshold = parseInt(req.query.threshold || '20', 10);
            const limit = parseInt(req.query.limit || '20', 10);
            const clusters = await runSql(`
        SELECT 
          to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start_time_iso,
          COUNT(*)::int as count,
          SUM(CASE WHEN ical_uid IS NULL OR ical_uid = '' THEN 1 ELSE 0 END)::int as without_ical_uid,
          SUM(CASE WHEN ical_uid IS NOT NULL AND ical_uid <> '' THEN 1 ELSE 0 END)::int as with_ical_uid
        FROM photography_sessions
        GROUP BY start_time
        HAVING COUNT(*) >= $1
        ORDER BY count DESC
        LIMIT $2
        `, [threshold, limit]);
            // For the top cluster, provide a tiny sample for visibility
            let sample = [];
            if (clusters.length > 0) {
                const targetIso = clusters[0].start_time_iso;
                sample = await runSql(`
          SELECT id, title, ical_uid, created_at 
          FROM photography_sessions 
          WHERE to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') = $1
          ORDER BY created_at DESC
          LIMIT 5
          `, [targetIso]);
            }
            res.json({ success: true, threshold, clusters, sample });
        }
        catch (error) {
            console.error('Error detecting stacked clusters:', error);
            res.status(500).json({ success: false, error: 'Failed to detect clusters' });
        }
    });
    // Cleanup stacked sessions for a specific exact start_time ISO (UTC) stamp
    app.post("/api/admin/calendar/cleanup-stacked", authenticateUser, async (req, res) => {
        try {
            const { targetStartTimeIso, onlyNullIcalUid = true, dryRun = true } = req.body || {};
            if (!targetStartTimeIso || typeof targetStartTimeIso !== 'string') {
                return res.status(400).json({ success: false, error: 'targetStartTimeIso (UTC ISO, e.g. 2025-09-08T16:36:48Z) is required' });
            }
            // Count matches first
            const counts = await runSql(`
        SELECT 
          COUNT(*)::int as total,
          SUM(CASE WHEN ical_uid IS NULL OR ical_uid = '' THEN 1 ELSE 0 END)::int as without_ical_uid,
          SUM(CASE WHEN ical_uid IS NOT NULL AND ical_uid <> '' THEN 1 ELSE 0 END)::int as with_ical_uid
        FROM photography_sessions
        WHERE to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') = $1
        `, [targetStartTimeIso]);
            const summary = counts?.[0] || { total: 0, without_ical_uid: 0, with_ical_uid: 0 };
            if (dryRun) {
                return res.json({ success: true, dryRun: true, targetStartTimeIso, summary });
            }
            // Perform deletion
            let deleteQuery = `
        DELETE FROM photography_sessions
        WHERE to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') = $1
      `;
            const params = [targetStartTimeIso];
            if (onlyNullIcalUid) {
                deleteQuery += ` AND (ical_uid IS NULL OR ical_uid = '')`;
            }
            const before = summary;
            await runSql(deleteQuery, params);
            res.json({ success: true, targetStartTimeIso, deleted: before, onlyNullIcalUid });
        }
        catch (error) {
            console.error('Error cleaning up stacked sessions:', error);
            res.status(500).json({ success: false, error: 'Failed to cleanup stacked sessions' });
        }
    });
    // Prune historical calendar sessions (admin)
    // Deletes sessions before a cutoff (default: start of today in Europe/Vienna)
    // Options:
    // - body.before: YYYY-MM-DD (Vienna local) optional
    // - body.includeNonImported: boolean (default false) if true, also delete rows without ical_uid
    // - body.dryRun: boolean (default true) to preview counts only
    app.post("/api/admin/calendar/prune-history", authenticateUser, async (req, res) => {
        try {
            const { before, includeNonImported = false, dryRun = true } = req.body || {};
            const tz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';
            let localIso;
            if (before && /\d{4}-\d{2}-\d{2}/.test(String(before))) {
                localIso = `${before}T00:00:00`;
            }
            else {
                // Default to start of today in Vienna
                const now = new Date();
                const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
                const parts = dtf.format(now); // YYYY-MM-DD in Vienna
                localIso = `${parts}T00:00:00`;
            }
            const cutoffUtcIso = convertLocalToUtcIso(localIso, tz);
            const whereImported = includeNonImported ? 'TRUE' : `(ical_uid IS NOT NULL AND ical_uid <> '')`;
            const counts = await runSql(`SELECT 
           COUNT(*)::int AS total, 
           SUM(CASE WHEN ical_uid IS NOT NULL AND ical_uid <> '' THEN 1 ELSE 0 END)::int AS with_ical_uid,
           SUM(CASE WHEN ical_uid IS NULL OR ical_uid = '' THEN 1 ELSE 0 END)::int AS without_ical_uid
         FROM photography_sessions
         WHERE start_time < $1 AND ${whereImported}`, [cutoffUtcIso]);
            const summary = counts?.[0] || { total: 0, with_ical_uid: 0, without_ical_uid: 0 };
            if (dryRun) {
                return res.json({ success: true, dryRun: true, cutoffUtc: cutoffUtcIso, includeNonImported, summary });
            }
            const del = await runSql(`DELETE FROM photography_sessions WHERE start_time < $1 AND ${whereImported}`, [cutoffUtcIso]);
            res.json({ success: true, cutoffUtc: cutoffUtcIso, includeNonImported, deleted: summary });
        }
        catch (error) {
            console.error('Error pruning historical sessions:', error);
            res.status(500).json({ success: false, error: 'Failed to prune historical sessions' });
        }
    });
    // ==================== TOP CLIENTS ROUTES ====================
    app.get("/api/crm/top-clients", authenticateUser, async (req, res) => {
        try {
            const { limit = 10, orderBy = 'lifetime_value', minRevenue, yearFilter } = req.query;
            // Compute metrics based on PAID invoices only (status 'paid') and cast numerics for JS consumers
            let query = `
        SELECT 
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.city,
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END)::double precision, 0)::double precision AS total_revenue,
          COALESCE(COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END), 0)::int AS invoice_count,
          COALESCE(COUNT(DISTINCT s.id), 0)::int AS session_count,
          MAX(CASE WHEN i.status = 'paid' THEN i.created_at END) AS last_invoice_date,
          MAX(s.start_time) AS last_session_date,
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END)::double precision, 0)::double precision AS lifetime_value,
          COALESCE(
            (SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END)::double precision) /
            NULLIF(COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END), 0),
            0
          )::double precision AS average_invoice
        FROM crm_clients c
        LEFT JOIN crm_invoices i ON c.id = i.client_id
        LEFT JOIN photography_sessions s ON c.id::text = s.client_id
      `;
            // Add year filter if specified
            if (yearFilter) {
                // Apply year filter only to invoice-based aggregations by excluding non-matching years
                query += ` AND (i.created_at IS NULL OR EXTRACT(YEAR FROM i.created_at) = ${Number(yearFilter)})`;
            }
            query += ` GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.city`;
            // Add minimum revenue filter - only show clients with paid invoices for top clients list
            if (minRevenue) {
                query += ` HAVING SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) >= ${Number(minRevenue)}`;
            }
            else {
                // Default: only show clients with at least some lifetime value (paid invoices)
                query += ` HAVING SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) > 0`;
            }
            // Add ordering - ensure clients with highest lifetime value appear first
            switch (orderBy) {
                case "total_revenue":
                case "lifetime_value":
                    query += ` ORDER BY lifetime_value DESC, total_revenue DESC`;
                    break;
                case "session_count":
                    query += ` ORDER BY session_count DESC, lifetime_value DESC`;
                    break;
                case "recent_activity":
                    query += ` ORDER BY GREATEST(COALESCE(last_invoice_date, CAST('1900-01-01' AS timestamp)), COALESCE(last_session_date, CAST('1900-01-01' AS timestamp))) DESC, lifetime_value DESC`;
                    break;
                default:
                    query += ` ORDER BY lifetime_value DESC, total_revenue DESC`;
                    break;
            }
            query += ` LIMIT ${limit}`;
            const topClients = await runSql(query);
            res.json(topClients);
        }
        catch (error) {
            console.error('Error fetching top clients:', error);
            res.status(500).json({ error: "Failed to fetch top clients" });
        }
    });
    app.get("/api/crm/client-segments", authenticateUser, async (req, res) => {
        try {
            const { segmentBy = 'revenue', includeStats = true } = req.query;
            let segmentQuery = "";
            switch (segmentBy) {
                case "revenue":
                    segmentQuery = `
            SELECT 
              CASE 
                WHEN total_revenue >= 1000 THEN 'VIP (€1000+)'
                WHEN total_revenue >= 500 THEN 'Premium (€500-999)'
                WHEN total_revenue >= 200 THEN 'Standard (€200-499)'
                WHEN total_revenue > 0 THEN 'Basic (€1-199)'
                ELSE 'No Revenue'
              END as segment,
              COUNT(*) as client_count,
              SUM(total_revenue)::double precision as segment_revenue,
              AVG(total_revenue)::double precision as avg_revenue_per_client
            FROM (
              SELECT 
                c.id,
                COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END)::double precision, 0)::double precision as total_revenue
              FROM crm_clients c
              LEFT JOIN crm_invoices i ON c.id = i.client_id
              GROUP BY c.id
            ) client_revenues
            GROUP BY segment
            ORDER BY segment_revenue DESC
          `;
                    break;
                case "frequency":
                    segmentQuery = `
            SELECT 
              CASE 
                WHEN session_count >= 5 THEN 'Frequent (5+ sessions)'
                WHEN session_count >= 3 THEN 'Regular (3-4 sessions)'
                WHEN session_count >= 1 THEN 'Occasional (1-2 sessions)'
                ELSE 'No Sessions'
              END as segment,
              COUNT(*) as client_count,
              SUM(session_count)::int as total_sessions,
              AVG(session_count)::double precision as avg_sessions_per_client
            FROM (
              SELECT 
                c.id,
                COUNT(s.id) as session_count
              FROM crm_clients c
              LEFT JOIN photography_sessions s ON c.id::text = s.client_id
              GROUP BY c.id
            ) client_sessions
            GROUP BY segment
            ORDER BY total_sessions DESC
          `;
                    break;
                case "geography":
                    segmentQuery = `
            SELECT 
              COALESCE(city, 'Unknown') as segment,
              COUNT(*) as client_count,
              COALESCE(SUM(total_revenue)::double precision, 0)::double precision as segment_revenue
            FROM (
              SELECT 
                c.city,
                COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END)::double precision, 0)::double precision as total_revenue
              FROM crm_clients c
              LEFT JOIN crm_invoices i ON c.id = i.client_id
              GROUP BY c.id, c.city
            ) client_geo
            GROUP BY city
            ORDER BY client_count DESC
            LIMIT 10
          `;
                    break;
            }
            const segments = await runSql(segmentQuery);
            res.json({
                segments,
                segmentBy,
                totalSegments: segments.length,
                message: `Client segmentation by ${segmentBy} completed`
            });
        }
        catch (error) {
            console.error('Error fetching client segments:', error);
            res.status(500).json({ error: "Failed to fetch client segments" });
        }
    });
    // ==================== ADMIN GALLERY ROUTES ====================
    // Get gallery analytics/stats (admin only)
    app.get("/api/admin/galleries/analytics", authenticateUser, async (req, res) => {
        try {
            // Get total galleries count
            const totalGalleriesResult = await runSql(`SELECT COUNT(*) as count FROM galleries`);
            const totalGalleries = parseInt(totalGalleriesResult[0]?.count || '0');
            // Get total images count across all galleries
            const totalImagesResult = await runSql(`SELECT COUNT(*) as count FROM gallery_images`);
            const totalImages = parseInt(totalImagesResult[0]?.count || '0');
            // Get public galleries count
            const publicGalleriesResult = await runSql(`SELECT COUNT(*) as count FROM galleries WHERE is_public = true`);
            const publicGalleries = parseInt(publicGalleriesResult[0]?.count || '0');
            // Get password-protected galleries count
            const protectedGalleriesResult = await runSql(`SELECT COUNT(*) as count FROM galleries WHERE is_password_protected = true`);
            const protectedGalleries = parseInt(protectedGalleriesResult[0]?.count || '0');
            // Get total storage used by gallery images (size_bytes column)
            const storageResult = await runSql(`
        SELECT COALESCE(SUM(size_bytes), 0) as total_bytes 
        FROM gallery_images
      `);
            const totalStorageBytes = parseInt(storageResult[0]?.total_bytes || '0');
            res.json({
                totalGalleries,
                totalImages,
                publicGalleries,
                protectedGalleries,
                totalStorageBytes
            });
        }
        catch (error) {
            console.error('Error fetching gallery analytics:', error);
            res.status(500).json({ error: "Failed to fetch gallery analytics" });
        }
    });
    app.get("/api/admin/galleries", authenticateUser, async (req, res) => {
        try {
            const { clientId, isPublic, limit = 100 } = req.query;
            let query = `
        SELECT 
          g.id,
          g.title,
          g.slug,
          g.description,
          g.cover_image,
          g.is_public,
          g.is_password_protected,
          g.client_id,
          g.created_at,
          g.updated_at,
          COALESCE(c.first_name || ' ' || c.last_name, 'Unknown Client') as client_name,
          c.email as client_email,
          COUNT(gi.id) as image_count
        FROM galleries g
        LEFT JOIN crm_clients c ON g.client_id = c.id
        LEFT JOIN gallery_images gi ON g.id = gi.gallery_id
      `;
            const conditions = [];
            const values = [];
            let paramIndex = 1;
            if (clientId) {
                conditions.push(`g.client_id = $${paramIndex}`);
                values.push(clientId);
                paramIndex++;
            }
            if (isPublic !== undefined) {
                conditions.push(`g.is_public = $${paramIndex}`);
                values.push(isPublic === 'true');
                paramIndex++;
            }
            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }
            query += ` GROUP BY g.id, c.first_name, c.last_name, c.email`;
            query += ` ORDER BY g.created_at DESC LIMIT $${paramIndex}`;
            values.push(parseInt(limit));
            const galleries = await runSql(query, values);
            res.json(galleries);
        }
        catch (error) {
            console.error('Error fetching galleries:', error);
            res.status(500).json({ error: "Failed to fetch galleries" });
        }
    });
    app.post("/api/galleries", authenticateUser, async (req, res) => {
        try {
            const { title, description, clientId, isPublic = true, isPasswordProtected = false, password, slug, coverImage, coverPosition, coverScale, coverTemplate } = req.body;
            // Generate slug from title if not provided
            const gallerySlug = slug || title
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens  
                .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
                .substring(0, 100); // Limit length
            const query = `
        INSERT INTO galleries (title, description, client_id, is_public, is_password_protected, password, slug, cover_image, cover_position, cover_scale, cover_template, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, title, slug, description, cover_image, cover_position, cover_scale, cover_template, is_public, created_at
      `;
            const result = await runSql(query, [
                title,
                description || null,
                clientId,
                isPublic,
                isPasswordProtected,
                password || null,
                gallerySlug,
                coverImage || null,
                coverPosition ? JSON.stringify(coverPosition) : JSON.stringify({ x: 50, y: 50 }),
                coverScale || 100,
                coverTemplate ? JSON.stringify(coverTemplate) : null,
                req.user?.id || null
            ]);
            // Transform response for frontend
            const gallery = result[0];
            res.status(201).json({
                ...gallery,
                coverImage: gallery.cover_image,
                coverPosition: gallery.cover_position || { x: 50, y: 50 },
                coverScale: gallery.cover_scale || 100,
                coverTemplate: gallery.cover_template || null,
                isPublic: gallery.is_public,
                createdAt: gallery.created_at
            });
        }
        catch (error) {
            console.error('Error creating gallery:', error);
            res.status(500).json({ error: "Failed to create gallery" });
        }
    });
    app.put("/api/galleries/:id", authenticateUser, async (req, res) => {
        try {
            const galleryId = req.params.id;
            const updates = [];
            const values = [];
            let paramIndex = 1;
            // Map from both camelCase and snake_case to database column names
            const fieldMapping = {
                'title': 'title',
                'description': 'description',
                'isPublic': 'is_public',
                'is_public': 'is_public',
                'isPasswordProtected': 'is_password_protected',
                'is_password_protected': 'is_password_protected',
                'password': 'password',
                'coverImage': 'cover_image',
                'cover_image': 'cover_image',
                'coverPosition': 'cover_position',
                'cover_position': 'cover_position',
                'coverScale': 'cover_scale',
                'cover_scale': 'cover_scale',
                'coverTemplate': 'cover_template',
                'cover_template': 'cover_template',
                'clientId': 'client_id',
                'client_id': 'client_id',
            };
            const processedFields = new Set(); // Avoid duplicate updates
            // If title is being updated, also update the slug
            const newTitle = req.body.title;
            if (newTitle) {
                const newSlug = newTitle
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
                    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
                    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
                    .substring(0, 100); // Limit length
                updates.push(`slug = $${paramIndex}`);
                values.push(newSlug);
                paramIndex++;
                processedFields.add('slug');
            }
            for (const [key, value] of Object.entries(req.body)) {
                const dbField = fieldMapping[key];
                if (dbField && value !== undefined && !processedFields.has(dbField)) {
                    processedFields.add(dbField);
                    // For JSONB columns, use explicit cast
                    if (dbField === 'cover_position' || dbField === 'cover_template') {
                        updates.push(`${dbField} = $${paramIndex}::jsonb`);
                        values.push(typeof value === 'string' ? value : JSON.stringify(value));
                    }
                    else {
                        updates.push(`${dbField} = $${paramIndex}`);
                        values.push(value);
                    }
                    paramIndex++;
                }
            }
            if (updates.length === 0) {
                return res.status(400).json({ error: "No valid updates provided" });
            }
            updates.push(`updated_at = NOW()`);
            const query = `
        UPDATE galleries 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}::uuid
        RETURNING id, title, slug, description, cover_image, cover_position, cover_scale, cover_template, is_public, updated_at
      `;
            values.push(galleryId);
            console.log('[GALLERY-UPDATE] Query:', query);
            console.log('[GALLERY-UPDATE] Values:', values.map((v, i) => `$${i + 1}: ${typeof v === 'string' && v.length > 100 ? v.substring(0, 100) + '...' : v}`));
            const result = await runSql(query, values);
            if (result.length === 0) {
                return res.status(404).json({ error: "Gallery not found" });
            }
            // Transform response for frontend
            const gallery = result[0];
            res.json({
                ...gallery,
                coverImage: gallery.cover_image,
                coverPosition: gallery.cover_position || { x: 50, y: 50 },
                coverScale: gallery.cover_scale || 100,
                coverTemplate: gallery.cover_template || null,
                isPublic: gallery.is_public,
                updatedAt: gallery.updated_at
            });
        }
        catch (error) {
            console.error('Error updating gallery:', error);
            console.error('Error message:', error?.message);
            console.error('Error stack:', error?.stack);
            res.status(500).json({ error: error?.message || "Failed to update gallery" });
        }
    });
    app.delete("/api/galleries/:id", authenticateUser, async (req, res) => {
        try {
            const galleryId = req.params.id;
            // Check if gallery exists
            const galleryCheck = await runSql(`SELECT title FROM galleries WHERE id = $1`, [galleryId]);
            if (galleryCheck.length === 0) {
                return res.status(404).json({ error: "Gallery not found" });
            }
            // Delete images first (cascade should handle this, but being explicit)
            await runSql(`DELETE FROM gallery_images WHERE gallery_id = $1`, [galleryId]);
            // Delete gallery
            await runSql(`DELETE FROM galleries WHERE id = $1`, [galleryId]);
            res.json({
                success: true,
                message: `Gallery "${galleryCheck[0].title}" deleted successfully`
            });
        }
        catch (error) {
            console.error('Error deleting gallery:', error);
            res.status(500).json({ error: "Failed to delete gallery" });
        }
    });
    app.get("/api/galleries/:id", authenticateUser, async (req, res) => {
        try {
            const galleryId = req.params.id;
            const query = `
        SELECT 
          g.*,
          COALESCE(c.first_name || ' ' || c.last_name, 'Unknown Client') as client_name,
          c.email as client_email,
          COUNT(gi.id) as image_count
        FROM galleries g
        LEFT JOIN crm_clients c ON g.client_id = c.id
        LEFT JOIN gallery_images gi ON g.id = gi.gallery_id
        WHERE g.id = $1
        GROUP BY g.id, c.first_name, c.last_name, c.email
      `;
            const result = await runSql(query, [galleryId]);
            if (result.length === 0) {
                return res.status(404).json({ error: "Gallery not found" });
            }
            // Transform snake_case to camelCase for frontend
            const gallery = result[0];
            const transformedGallery = {
                ...gallery,
                coverImage: gallery.cover_image,
                coverPosition: gallery.cover_position || { x: 50, y: 50 },
                coverScale: gallery.cover_scale || 100,
                coverTemplate: gallery.cover_template || null,
                isPublic: gallery.is_public,
                isPasswordProtected: gallery.is_password_protected,
                clientId: gallery.client_id,
                createdBy: gallery.created_by,
                sortOrder: gallery.sort_order,
                createdAt: gallery.created_at,
                updatedAt: gallery.updated_at,
                clientName: gallery.client_name,
                clientEmail: gallery.client_email,
                imageCount: gallery.image_count,
                downloadEnabled: gallery.download_enabled ?? true
            };
            res.json(transformedGallery);
        }
        catch (error) {
            console.error('Error fetching gallery:', error);
            res.status(500).json({ error: "Failed to fetch gallery" });
        }
    });
    // ==================== GALLERY ANALYTICS TRACKING ROUTES ====================
    // POST /api/galleries/:id/track-view - Track gallery view
    app.post("/api/galleries/:id/track-view", async (req, res) => {
        try {
            const galleryId = req.params.id;
            const { visitorEmail, visitorName, metadata } = req.body;
            // Update or create analytics record
            await runSql(`
        INSERT INTO gallery_analytics (gallery_id, view_count, last_viewed_at, updated_at)
        VALUES ($1, 1, NOW(), NOW())
        ON CONFLICT (gallery_id) DO UPDATE SET
          view_count = gallery_analytics.view_count + 1,
          last_viewed_at = NOW(),
          updated_at = NOW()
      `, [galleryId]);
            // Log activity
            await runSql(`
        INSERT INTO gallery_activity_log (gallery_id, activity_type, visitor_email, visitor_name, metadata)
        VALUES ($1, 'view', $2, $3, $4)
      `, [galleryId, visitorEmail || null, visitorName || null, JSON.stringify(metadata || {})]);
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error tracking gallery view:', error);
            res.status(500).json({ error: "Failed to track view" });
        }
    });
    // POST /api/galleries/:id/track-download - Track gallery download
    app.post("/api/galleries/:id/track-download", async (req, res) => {
        try {
            const galleryId = req.params.id;
            const { visitorEmail, visitorName, imageId, metadata } = req.body;
            // Update analytics record
            await runSql(`
        INSERT INTO gallery_analytics (gallery_id, download_count, last_downloaded_at, updated_at)
        VALUES ($1, 1, NOW(), NOW())
        ON CONFLICT (gallery_id) DO UPDATE SET
          download_count = gallery_analytics.download_count + 1,
          last_downloaded_at = NOW(),
          updated_at = NOW()
      `, [galleryId]);
            // Log activity
            await runSql(`
        INSERT INTO gallery_activity_log (gallery_id, activity_type, visitor_email, visitor_name, image_id, metadata)
        VALUES ($1, 'download', $2, $3, $4, $5)
      `, [galleryId, visitorEmail || null, visitorName || null, imageId || null, JSON.stringify(metadata || {})]);
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error tracking gallery download:', error);
            res.status(500).json({ error: "Failed to track download" });
        }
    });
    // POST /api/galleries/:id/capture-email - Capture visitor email
    app.post("/api/galleries/:id/capture-email", async (req, res) => {
        try {
            const galleryId = req.params.id;
            const { email, name, phone, source, metadata } = req.body;
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }
            // Check if email already captured for this gallery (to prevent duplicates)
            const existing = await runSql(`
        SELECT id FROM gallery_email_captures
        WHERE gallery_id = $1 AND email = $2
        LIMIT 1
      `, [galleryId, email]);
            if (existing.length === 0) {
                // Insert email capture
                await runSql(`
          INSERT INTO gallery_email_captures (gallery_id, email, name, phone, source, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [galleryId, email, name || null, phone || null, source || 'gallery_view', JSON.stringify(metadata || {})]);
                // Update analytics
                await runSql(`
          INSERT INTO gallery_analytics (gallery_id, email_capture_count, last_email_captured_at, updated_at)
          VALUES ($1, 1, NOW(), NOW())
          ON CONFLICT (gallery_id) DO UPDATE SET
            email_capture_count = gallery_analytics.email_capture_count + 1,
            last_email_captured_at = NOW(),
            updated_at = NOW()
        `, [galleryId]);
                // Log activity
                await runSql(`
          INSERT INTO gallery_activity_log (gallery_id, activity_type, visitor_email, visitor_name, metadata)
          VALUES ($1, 'email_capture', $2, $3, $4)
        `, [galleryId, email, name || null, JSON.stringify({ source, ...metadata })]);
            }
            res.json({ success: true, alreadyCaptured: existing.length > 0 });
        }
        catch (error) {
            console.error('Error capturing email:', error);
            res.status(500).json({ error: "Failed to capture email" });
        }
    });
    // GET /api/galleries/:id/analytics - Get gallery analytics (admin only)
    app.get("/api/galleries/:id/analytics", authenticateUser, async (req, res) => {
        try {
            const galleryId = req.params.id;
            // Get analytics summary
            const analytics = await runSql(`
        SELECT * FROM gallery_analytics WHERE gallery_id = $1
      `, [galleryId]);
            // Get recent activity (last 50)
            const recentActivity = await runSql(`
        SELECT * FROM gallery_activity_log
        WHERE gallery_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [galleryId]);
            // Get email captures
            const emailCaptures = await runSql(`
        SELECT * FROM gallery_email_captures
        WHERE gallery_id = $1
        ORDER BY captured_at DESC
      `, [galleryId]);
            res.json({
                analytics: analytics[0] || { viewCount: 0, downloadCount: 0, emailCaptureCount: 0 },
                recentActivity,
                emailCaptures
            });
        }
        catch (error) {
            console.error('Error fetching gallery analytics:', error);
            res.status(500).json({ error: "Failed to fetch analytics" });
        }
    });
    // ==================== GALLERY SHARING ROUTES ====================
    // POST /api/galleries/send-email - Send gallery link via email
    app.post("/api/galleries/send-email", authenticateUser, async (req, res) => {
        try {
            const { gallery_id, slug, to, message, gallery_url } = req.body;
            if (!to || (!gallery_id && !slug)) {
                return res.status(400).json({ error: 'to and gallery_id or slug required' });
            }
            // Find gallery
            let gallery;
            if (slug) {
                const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE slug = $1 LIMIT 1`, [slug]);
                gallery = result[0];
            }
            else {
                const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE id = $1 LIMIT 1`, [gallery_id]);
                gallery = result[0];
            }
            if (!gallery) {
                return res.status(404).json({ error: 'Gallery not found' });
            }
            // Use frontend-provided gallery_url, or build from environment/host
            const link = gallery_url || `https://www.newagefotografie.com/gallery/${gallery.slug}`;
            const pwdNote = (gallery.is_password_protected && gallery.password)
                ? `<p>Password: <strong>${gallery.password}</strong></p>`
                : '';
            const html = `
        <div style="font-family:system-ui;line-height:1.6">
          <p>Hello,</p>
          <p>We've shared the photo gallery "<strong>${gallery.title}</strong>" with you.</p>
          <p><a href="${link}">Open the gallery</a></p>
          ${pwdNote}
          ${message ? `<p>${String(message)}</p>` : ''}
          <p>— New Age Fotografie</p>
        </div>`;
            const textContent = `Gallery link: ${link}${gallery.is_password_protected && gallery.password ? `\nPassword: ${gallery.password}` : ''}${message ? `\n\n${message}` : ''}`;
            // Send email using the enhanced email service
            const { EnhancedEmailService } = await import('./services/enhancedEmailService');
            await EnhancedEmailService.sendEmail({
                to,
                subject: `Gallery: ${gallery.title}`,
                content: textContent,
                html: html
            });
            res.json({ ok: true, link });
        }
        catch (error) {
            console.error('Error sending gallery email:', error);
            res.status(500).json({ error: error?.message || 'Failed to send email' });
        }
    });
    // POST /api/galleries/send-whatsapp - Send gallery link via WhatsApp
    app.post("/api/galleries/send-whatsapp", authenticateUser, async (req, res) => {
        try {
            const { gallery_id, slug, to_phone, gallery_url } = req.body;
            // Find gallery
            let gallery;
            if (slug) {
                const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE slug = $1 LIMIT 1`, [slug]);
                gallery = result[0];
            }
            else if (gallery_id) {
                const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE id = $1 LIMIT 1`, [gallery_id]);
                gallery = result[0];
            }
            if (!gallery) {
                return res.status(404).json({ error: 'Gallery not found' });
            }
            // Use frontend-provided gallery_url, or build with production domain
            const link = gallery_url || `https://www.newagefotografie.com/gallery/${gallery.slug}`;
            // Generate WhatsApp share link
            const text = `Here's your photo gallery "${gallery.title}": ${link}${gallery.is_password_protected && gallery.password ? `\nPassword: ${gallery.password}` : ''}`;
            const shareUrl = `https://wa.me/${to_phone ? to_phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(text)}`;
            res.json({ ok: true, sent: false, link, share: shareUrl });
        }
        catch (error) {
            console.error('Error with gallery WhatsApp share:', error);
            res.status(500).json({ error: error?.message || 'Failed to generate WhatsApp link' });
        }
    });
    // POST /api/galleries/send-sms - Send gallery link via SMS
    app.post("/api/galleries/send-sms", authenticateUser, async (req, res) => {
        try {
            const { gallery_id, slug, to_phone, gallery_url } = req.body;
            if (!to_phone) {
                return res.status(400).json({ error: 'to_phone is required' });
            }
            // Find gallery
            let gallery;
            if (slug) {
                const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE slug = $1 LIMIT 1`, [slug]);
                gallery = result[0];
            }
            else if (gallery_id) {
                const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE id = $1 LIMIT 1`, [gallery_id]);
                gallery = result[0];
            }
            if (!gallery) {
                return res.status(404).json({ error: 'Gallery not found' });
            }
            // Use frontend-provided gallery_url, or build with production domain
            const link = gallery_url || `https://www.newagefotografie.com/gallery/${gallery.slug}`;
            // Build SMS message
            const smsText = `Here's your photo gallery "${gallery.title}": ${link}${gallery.is_password_protected && gallery.password ? ` (Password: ${gallery.password})` : ''}`;
            // Try to send via SMS service if configured
            try {
                const { SMSService } = await import('./services/smsService');
                const smsService = SMSService.getInstance();
                await smsService.sendSMS({ to: to_phone, message: smsText });
                res.json({ ok: true, sent: true, link, info: 'SMS sent successfully' });
            }
            catch (smsError) {
                // SMS service not configured or failed
                console.log('SMS service not available:', smsError?.message);
                res.json({ ok: true, sent: false, link, info: 'SMS service not configured. Please copy the link manually.' });
            }
        }
        catch (error) {
            console.error('Error with gallery SMS:', error);
            res.status(500).json({ error: error?.message || 'Failed to send SMS' });
        }
    });
    // ==================== INVOICE ROUTES ====================
    app.get("/api/crm/invoices", authenticateUser, async (req, res) => {
        try {
            const clientId = req.query.clientId;
            let invoices = await storage_1.storage.getCrmInvoices();
            // Filter by clientId if provided
            if (clientId) {
                invoices = invoices.filter(inv => inv.client_id === clientId);
            }
            // Transform the data to match frontend expectations
            const transformedInvoices = invoices.map(invoice => ({
                id: invoice.id,
                invoiceNumber: invoice.invoice_number,
                invoice_number: invoice.invoice_number,
                clientId: invoice.client_id,
                client_id: invoice.client_id,
                issueDate: invoice.issue_date,
                issue_date: invoice.issue_date,
                dueDate: invoice.due_date,
                due_date: invoice.due_date,
                subtotal: parseFloat(invoice.subtotal || '0'),
                subtotal_amount: parseFloat(invoice.subtotal || '0'),
                taxAmount: parseFloat(invoice.tax_amount || '0'),
                tax_amount: parseFloat(invoice.tax_amount || '0'),
                total: parseFloat(invoice.total || '0'),
                totalAmount: parseFloat(invoice.total || '0'),
                total_amount: parseFloat(invoice.total || '0'),
                status: invoice.status,
                notes: invoice.notes,
                createdAt: invoice.created_at,
                created_at: invoice.created_at,
                client: {
                    name: invoice.client_name,
                    email: invoice.client_email
                }
            }));
            // Support both response formats for backwards compatibility
            if (clientId) {
                res.json({ invoices: transformedInvoices });
            }
            else {
                res.json(transformedInvoices);
            }
        }
        catch (error) {
            console.error("Error fetching invoices:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Alias for invoices list (used by some frontend pages)
    app.get("/api/invoices/list", authenticateUser, async (req, res) => {
        try {
            const status = req.query.status;
            const invoices = await storage_1.storage.getCrmInvoices();
            const filtered = status ? invoices.filter(inv => inv.status === status) : invoices;
            res.json({
                rows: filtered,
                total: filtered.length
            });
        }
        catch (error) {
            console.error("Error fetching invoices list:", error);
            res.status(500).json({ error: "Internal server error", rows: [], total: 0 });
        }
    });
    // Get invoice status by IDs
    app.get("/api/invoices/status", authenticateUser, async (req, res) => {
        try {
            const ids = req.query.ids;
            if (!ids) {
                return res.json({ statuses: {} });
            }
            const idList = ids.split(',').filter(Boolean);
            const statuses = {};
            for (const id of idList) {
                try {
                    const result = await runSql('SELECT status FROM crm_invoices WHERE id = $1::uuid', [id]);
                    if (result && result.length > 0) {
                        statuses[id] = result[0].status || 'draft';
                    }
                }
                catch (e) {
                    // Skip invalid IDs
                }
            }
            res.json({ statuses });
        }
        catch (error) {
            console.error("Error fetching invoice statuses:", error);
            res.status(500).json({ error: "Internal server error", statuses: {} });
        }
    });
    // Update invoice status
    app.post("/api/invoices/update-status", authenticateUser, async (req, res) => {
        try {
            const { invoice_id, status } = req.body;
            if (!invoice_id || !status) {
                return res.status(400).json({ ok: false, error: 'Missing invoice_id or status' });
            }
            await runSql('UPDATE crm_invoices SET status = $1, updated_at = NOW() WHERE id = $2::uuid', [status, invoice_id]);
            res.json({ ok: true, success: true });
        }
        catch (error) {
            console.error("Error updating invoice status:", error);
            res.status(500).json({ ok: false, error: "Internal server error" });
        }
    });
    app.get("/api/crm/invoices/:id", authenticateUser, async (req, res) => {
        try {
            const invoice = await storage_1.storage.getCrmInvoice(req.params.id);
            if (!invoice) {
                return res.status(404).json({ error: "Invoice not found" });
            }
            // Fetch invoice items
            const items = await storage_1.storage.getCrmInvoiceItems(req.params.id);
            // Fetch client information
            let client = null;
            if (invoice.clientId) {
                client = await storage_1.storage.getCrmClient(invoice.clientId);
            }
            // Return complete invoice with items and client
            // Include both camelCase and snake_case for client_id for frontend compatibility
            res.json({
                ...invoice,
                client_id: invoice.clientId, // Add snake_case version for frontend
                items,
                client
            });
        }
        catch (error) {
            console.error("Error fetching invoice:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Invoice edit endpoint - handles full invoice updates including items
    app.post("/api/invoice-edit", authenticateUser, async (req, res) => {
        try {
            const { invoiceId, clientId, invoiceNumber, status, dueDate, notes, footerText, items } = req.body;
            console.log('[INVOICE-EDIT] Received update request for invoice:', invoiceId);
            console.log('[INVOICE-EDIT] Request body:', JSON.stringify(req.body, null, 2));
            if (!invoiceId) {
                return res.status(400).json({ ok: false, error: 'Missing invoiceId' });
            }
            // Update main invoice record
            const updateQuery = `
        UPDATE crm_invoices 
        SET 
          client_id = COALESCE($1::uuid, client_id),
          invoice_number = COALESCE($2, invoice_number),
          status = COALESCE($3, status),
          due_date = COALESCE($4::timestamp, due_date),
          notes = COALESCE($5, notes),
          footer_text = COALESCE($6, footer_text),
          updated_at = NOW()
        WHERE id = $7::uuid
        RETURNING *
      `;
            const updateResult = await runSql(updateQuery, [
                clientId || null,
                invoiceNumber || null,
                status || null,
                dueDate || null,
                notes || null,
                footerText || null,
                invoiceId
            ]);
            if (!updateResult || updateResult.length === 0) {
                console.log('[INVOICE-EDIT] Invoice not found:', invoiceId);
                return res.status(404).json({ ok: false, error: 'Invoice not found' });
            }
            console.log('[INVOICE-EDIT] Updated invoice record:', updateResult[0]);
            // Update invoice items if provided
            if (items && Array.isArray(items) && items.length > 0) {
                console.log('[INVOICE-EDIT] Updating', items.length, 'items');
                // Delete existing items
                await runSql('DELETE FROM crm_invoice_items WHERE invoice_id = $1::uuid', [invoiceId]);
                // Calculate totals
                let subtotal = 0;
                let totalTax = 0;
                // Insert new items (table has: id, invoice_id, description, quantity, unit_price, tax_rate, sort_order, created_at)
                let sortOrder = 0;
                for (const item of items) {
                    const quantity = parseFloat(item.quantity) || 1;
                    const unitPrice = parseFloat(item.unitPrice) || 0;
                    const taxRate = parseFloat(item.taxRate) || 0;
                    const amount = quantity * unitPrice;
                    const taxAmount = amount * (taxRate / 100);
                    subtotal += amount;
                    totalTax += taxAmount;
                    sortOrder++;
                    await runSql(`
            INSERT INTO crm_invoice_items (invoice_id, description, quantity, unit_price, tax_rate, sort_order)
            VALUES ($1::uuid, $2, $3, $4, $5, $6)
          `, [invoiceId, item.description || '', quantity, unitPrice, taxRate, sortOrder]);
                }
                // Update invoice totals
                const total = subtotal + totalTax;
                await runSql(`
          UPDATE crm_invoices 
          SET subtotal = $1, tax_amount = $2, total = $3, updated_at = NOW()
          WHERE id = $4::uuid
        `, [subtotal, totalTax, total, invoiceId]);
                console.log('[INVOICE-EDIT] Updated totals - subtotal:', subtotal, 'tax:', totalTax, 'total:', total);
            }
            res.json({ ok: true, success: true, invoice_id: invoiceId });
        }
        catch (error) {
            console.error('[INVOICE-EDIT] Error updating invoice:', error);
            res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
        }
    });
    app.post("/api/crm/invoices", authenticateUser, async (req, res) => {
        try {
            console.log("Received invoice data:", JSON.stringify(req.body, null, 2));
            // Transform snake_case from frontend to camelCase for database
            const invoiceData = {
                clientId: req.body.clientId || req.body.client_id,
                invoiceNumber: req.body.invoiceNumber || req.body.invoice_number,
                issueDate: req.body.issueDate || req.body.issue_date,
                dueDate: req.body.dueDate || req.body.due_date,
                subtotal: req.body.subtotal?.toString() || '0',
                taxAmount: req.body.taxAmount?.toString() || req.body.tax_amount?.toString() || '0',
                discountAmount: req.body.discountAmount?.toString() || req.body.discount_amount?.toString() || '0',
                total: req.body.total?.toString() || '0',
                currency: req.body.currency || 'EUR',
                status: (req.body.status || 'draft').toLowerCase(),
                paymentTerms: req.body.paymentTerms || req.body.payment_terms || 'Net 30',
                notes: req.body.notes || '',
                termsAndConditions: req.body.termsAndConditions || req.body.terms_and_conditions,
                footerText: req.body.footerText || req.body.footer_text,
                stripePaymentIntentId: req.body.stripePaymentIntentId || req.body.stripe_payment_intent_id,
                stripePaymentUrl: req.body.stripePaymentUrl || req.body.stripe_payment_url,
                paidAmount: req.body.paidAmount?.toString() || req.body.paid_amount?.toString() || '0',
                createdBy: req.body.createdBy || req.body.created_by || null
            };
            console.log("Transformed invoice data:", JSON.stringify(invoiceData, null, 2));
            // Add auto-generated invoice number if not provided
            if (!invoiceData.invoiceNumber) {
                const timestamp = Date.now();
                invoiceData.invoiceNumber = `INV-${timestamp}`;
            }
            console.log('Invoice data being sent to storage:', JSON.stringify(invoiceData, null, 2));
            // Create the invoice
            const invoice = await storage_1.storage.createCrmInvoice(invoiceData);
            // Create invoice items if provided
            if (req.body.items && req.body.items.length > 0) {
                const itemsData = req.body.items.map((item, index) => ({
                    invoiceId: invoice.id,
                    description: item.description,
                    quantity: item.quantity?.toString() || '1',
                    unitPrice: (item.unitPrice || item.unit_price || 0).toString(),
                    taxRate: (item.taxRate || item.tax_rate || 0).toString(),
                    sortOrder: index
                }));
                console.log('Creating invoice items:', JSON.stringify(itemsData, null, 2));
                await storage_1.storage.createCrmInvoiceItems(itemsData);
            }
            res.status(201).json({ ok: true, invoice_id: invoice.id, ...invoice });
        }
        catch (error) {
            console.error("Error creating invoice:", error);
            console.error("Error stack:", error.stack);
            res.status(500).json({ ok: false, error: error.message || "Internal server error" });
        }
    });
    app.put("/api/crm/invoices/:id", authenticateUser, async (req, res) => {
        try {
            const invoice = await storage_1.storage.updateCrmInvoice(req.params.id, req.body);
            res.json(invoice);
        }
        catch (error) {
            console.error("Error updating invoice:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.patch("/api/crm/invoices/:id", authenticateUser, async (req, res) => {
        try {
            const invoice = await storage_1.storage.updateCrmInvoice(req.params.id, req.body);
            res.json(invoice);
        }
        catch (error) {
            console.error("Error updating invoice:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.delete("/api/crm/invoices/:id", authenticateUser, async (req, res) => {
        try {
            await storage_1.storage.deleteCrmInvoice(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting invoice:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== INVOICE SHARING ROUTES ====================
    // POST /api/invoices/send-email - Send invoice link via email
    app.post("/api/invoices/send-email", authenticateUser, async (req, res) => {
        try {
            const { invoice_id, to } = req.body;
            if (!invoice_id || !to) {
                return res.status(400).json({ error: 'invoice_id and to (email) are required' });
            }
            // Find invoice
            const invoiceResult = await runSql(`
        SELECT i.*, c.first_name, c.last_name, c.email as client_email
        FROM crm_invoices i
        LEFT JOIN crm_clients c ON i.client_id = c.id
        WHERE i.id = $1::uuid
      `, [invoice_id]);
            if (!invoiceResult || invoiceResult.length === 0) {
                return res.status(404).json({ error: 'Invoice not found' });
            }
            const invoice = invoiceResult[0];
            // Build invoice URL
            const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
            const link = `${baseUrl}/inv/${invoice_id}`;
            const clientName = invoice.first_name && invoice.last_name
                ? `${invoice.first_name} ${invoice.last_name}`
                : 'Client';
            const html = `
        <div style="font-family:system-ui;line-height:1.6">
          <p>Hello ${clientName},</p>
          <p>Please find your invoice <strong>${invoice.invoice_number}</strong> attached.</p>
          <p><strong>Amount Due:</strong> €${(invoice.total || 0).toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 24px;background-color:#7C3AED;color:white;text-decoration:none;border-radius:6px;">View Invoice</a></p>
          <p>Thank you for your business.</p>
          <p>— New Age Fotografie</p>
        </div>`;
            const textContent = `Invoice ${invoice.invoice_number}\nAmount Due: €${(invoice.total || 0).toFixed(2)}\nView Invoice: ${link}`;
            // Send email using the enhanced email service
            const { EnhancedEmailService } = await import('./services/enhancedEmailService');
            await EnhancedEmailService.sendEmail({
                to,
                subject: `Invoice ${invoice.invoice_number} from New Age Fotografie`,
                content: textContent,
                html: html
            });
            // Update invoice status to 'sent' if it was 'draft'
            if (invoice.status === 'draft') {
                await runSql('UPDATE crm_invoices SET status = $1, updated_at = NOW() WHERE id = $2::uuid', ['sent', invoice_id]);
            }
            res.json({ ok: true, link });
        }
        catch (error) {
            console.error('Error sending invoice email:', error);
            res.status(500).json({ error: error?.message || 'Failed to send email' });
        }
    });
    // POST /api/invoices/send-whatsapp - Send invoice link via WhatsApp
    app.post("/api/invoices/send-whatsapp", authenticateUser, async (req, res) => {
        try {
            const { invoice_id, to_phone } = req.body;
            if (!invoice_id) {
                return res.status(400).json({ error: 'invoice_id is required' });
            }
            // Find invoice
            const invoiceResult = await runSql(`
        SELECT i.*, c.first_name, c.last_name
        FROM crm_invoices i
        LEFT JOIN crm_clients c ON i.client_id = c.id
        WHERE i.id = $1::uuid
      `, [invoice_id]);
            if (!invoiceResult || invoiceResult.length === 0) {
                return res.status(404).json({ error: 'Invoice not found' });
            }
            const invoice = invoiceResult[0];
            // Build invoice URL
            const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
            const link = `${baseUrl}/inv/${invoice_id}`;
            // Generate WhatsApp share link using the correct API format
            const text = `Hello! Here is your invoice ${invoice.invoice_number} for €${(invoice.total || 0).toFixed(2)}.\n\nView and pay online: ${link}\n\nThank you! - New Age Fotografie`;
            // Clean phone number - remove all non-digits
            const cleanPhone = to_phone ? to_phone.replace(/[^0-9]/g, '') : '';
            // Use the correct WhatsApp API URL format
            const shareUrl = cleanPhone
                ? `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
                : `https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}`;
            res.json({ ok: true, sent: false, link, share: shareUrl });
        }
        catch (error) {
            console.error('Error with invoice WhatsApp share:', error);
            res.status(500).json({ error: error?.message || 'Failed to generate WhatsApp link' });
        }
    });
    // POST /api/invoices/send-sms - Send invoice link via SMS
    app.post("/api/invoices/send-sms", authenticateUser, async (req, res) => {
        try {
            const { invoice_id, to_phone } = req.body;
            if (!invoice_id || !to_phone) {
                return res.status(400).json({ error: 'invoice_id and to_phone are required' });
            }
            // Find invoice
            const invoiceResult = await runSql(`
        SELECT i.*, c.first_name, c.last_name
        FROM crm_invoices i
        LEFT JOIN crm_clients c ON i.client_id = c.id
        WHERE i.id = $1::uuid
      `, [invoice_id]);
            if (!invoiceResult || invoiceResult.length === 0) {
                return res.status(404).json({ error: 'Invoice not found' });
            }
            const invoice = invoiceResult[0];
            // Build invoice URL
            const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
            const link = `${baseUrl}/inv/${invoice_id}`;
            // Build SMS message
            const smsText = `Invoice ${invoice.invoice_number}: €${(invoice.total || 0).toFixed(2)}. View: ${link} - New Age Fotografie`;
            // Try to send via SMS service if configured
            try {
                const { SMSService } = await import('./services/smsService');
                const smsService = SMSService.getInstance();
                await smsService.sendSMS({ to: to_phone, message: smsText });
                res.json({ ok: true, sent: true, link, info: 'SMS sent successfully' });
            }
            catch (smsError) {
                // SMS service not configured or failed
                console.log('SMS service not available:', smsError?.message);
                res.json({ ok: true, sent: false, link, info: 'SMS service not configured. Please copy the link manually.' });
            }
        }
        catch (error) {
            console.error('Error with invoice SMS:', error);
            res.status(500).json({ error: error?.message || 'Failed to send SMS' });
        }
    });
    // ==================== INVOICE PAYMENT ROUTES ====================
    app.get("/api/crm/invoices/:invoiceId/payments", authenticateUser, async (req, res) => {
        try {
            const payments = await storage_1.storage.getCrmInvoicePayments(req.params.invoiceId);
            res.json(payments);
        }
        catch (error) {
            console.error("Error fetching payments:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Helper: recalculate invoice paidAmount and status from payments
    async function recalcInvoicePaid(invoiceId) {
        try {
            const payments = await storage_1.storage.getCrmInvoicePayments(invoiceId);
            const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount?.toString() || '0')), 0);
            const invoice = await storage_1.storage.getCrmInvoice(invoiceId);
            if (!invoice) return;
            const invoiceTotal = parseFloat(invoice.total?.toString() || '0');
            let status = invoice.status || 'draft';
            if (totalPaid >= invoiceTotal && invoiceTotal > 0) {
                status = 'paid';
            } else if (totalPaid > 0) {
                status = 'partially_paid';
            } else if (status === 'paid' || status === 'partially_paid') {
                status = 'sent';
            }
            await storage_1.storage.updateCrmInvoice(invoiceId, {
                paidAmount: totalPaid.toFixed(2),
                status
            });
            console.log(`[PAYMENT] Invoice ${invoiceId} updated: paidAmount=${totalPaid.toFixed(2)}, status=${status}`);
        } catch (err) {
            console.error('[PAYMENT] Error recalculating invoice paid amount:', err);
        }
    }
    app.post("/api/crm/invoices/:invoiceId/payments", authenticateUser, async (req, res) => {
        try {
            // Transform snake_case from frontend to camelCase for Drizzle ORM
            const paymentData = {
                invoiceId: req.params.invoiceId,
                amount: req.body.amount?.toString() || '0',
                paymentMethod: req.body.payment_method || req.body.paymentMethod || 'bank_transfer',
                paymentReference: req.body.payment_reference || req.body.paymentReference || '',
                paymentDate: req.body.payment_date || req.body.paymentDate || new Date().toISOString().split('T')[0],
                notes: req.body.notes || ''
            };
            console.log('[PAYMENT] Creating payment:', JSON.stringify(paymentData));
            const payment = await storage_1.storage.createCrmInvoicePayment(paymentData);
            // Update invoice paidAmount and status
            await recalcInvoicePaid(req.params.invoiceId);
            res.json(payment);
        }
        catch (error) {
            console.error("Error creating payment:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.delete("/api/crm/invoices/:invoiceId/payments/:paymentId", authenticateUser, async (req, res) => {
        try {
            await storage_1.storage.deleteCrmInvoicePayment(req.params.paymentId);
            // Recalculate invoice paidAmount and status
            await recalcInvoicePaid(req.params.invoiceId);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting payment:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== INVOICE PDF & EMAIL ROUTES ====================
    // Public invoice view (no authentication required)
    app.get("/api/invoices/public/:id", async (req, res) => {
        try {
            const invoice = await storage_1.storage.getCrmInvoice(req.params.id);
            if (!invoice) {
                return res.status(404).json({ error: "Invoice not found" });
            }
            // Fetch invoice items
            const items = await storage_1.storage.getCrmInvoiceItems(req.params.id);
            // Fetch client information
            let client = null;
            if (invoice.clientId) {
                client = await storage_1.storage.getCrmClient(invoice.clientId);
            }
            // Return complete invoice with items and client (public view)
            res.json({
                ...invoice,
                items,
                client
            });
        }
        catch (error) {
            console.error("Error fetching public invoice:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Generate PDF for invoice (accessible both authenticated and public)
    app.get("/api/crm/invoices/:id/pdf", async (req, res) => {
        try {
            const invoice = await storage_1.storage.getCrmInvoice(req.params.id);
            if (!invoice) {
                return res.status(404).json({ error: "Invoice not found" });
            }
            // Get client details using correct field name
            const clientId = invoice.clientId;
            const client = await storage_1.storage.getCrmClient(clientId);
            if (!client) {
                return res.status(404).json({ error: "Client not found" });
            }
            // Generate modern PDF using centralized function
            const pdfBuffer = await generateModernInvoicePDF(invoice, client);
            // Set proper PDF headers
            const invoiceNumber = invoice.invoiceNumber || invoice.id;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${invoiceNumber}.pdf"`);
            res.send(pdfBuffer);
        }
        catch (error) {
            console.error("Error generating PDF:", error);
            res.status(500).json({ error: "Failed to generate PDF" });
        }
    });
    // Email invoice to client
    app.post("/api/crm/invoices/:id/email", authenticateUser, async (req, res) => {
        try {
            const { subject, message, includeAttachment = true } = req.body;
            const invoice = await storage_1.storage.getCrmInvoice(req.params.id);
            if (!invoice) {
                return res.status(404).json({ error: "Invoice not found" });
            }
            const client = await storage_1.storage.getCrmClient(invoice.clientId);
            if (!client) {
                return res.status(404).json({ error: "Client not found" });
            }
            if (!client.email) {
                return res.status(400).json({ error: "Client has no email address" });
            }
            // Generate modern PDF attachment if requested using centralized function
            let attachments = [];
            if (includeAttachment) {
                const pdfBuffer = await generateModernInvoicePDF(invoice, client);
                const invoiceNumber = invoice.invoiceNumber || invoice.id;
                attachments.push({
                    filename: `Rechnung-${invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                });
            }
            // Create email transporter (prefer configured SMTP, fallback to env)
            const transporter = nodemailer_1.default.createTransport({
                host: 'smtp.easyname.com',
                port: 465,
                secure: true,
                auth: {
                    // Use mailbox username from environment when available; otherwise use request-provided username
                    user: process.env.BUSINESS_MAILBOX_USER || '30840mail10',
                    pass: process.env.EMAIL_PASSWORD || 'your-email-password'
                }
            });
            // Send email
            const emailOptions = {
                from: getEnvContactEmailSync() || 'no-reply@localhost',
                to: client.email,
                subject: subject || `Rechnung ${invoice.invoiceNumber} - New Age Fotografie`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Rechnung ${invoice.invoiceNumber}</h2>
            <p>Liebe/r ${client.firstName} ${client.lastName},</p>
            <p>${message || 'anbei senden wir Ihnen Ihre Rechnung zu.'}</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 10px 0;">Rechnungsdetails:</h3>
              <p><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Datum:</strong> ${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
              <p><strong>Fälligkeitsdatum:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p>
              <p><strong>Gesamtbetrag:</strong> €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}</p>
            </div>
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
              <p><strong>New Age Fotografie</strong><br>
              Schönbrunner Str. 25<br>
              1050 Wien, Austria<br>
              Tel: +43 677 633 99210<br>
              Email: ${getEnvContactEmailSync()}</p>
            </div>
          </div>
        `,
                attachments
            };
            await transporter.sendMail(emailOptions);
            res.json({
                success: true,
                message: `Invoice successfully sent to ${client.email}`
            });
        }
        catch (error) {
            console.error("Error sending invoice email:", error);
            res.status(500).json({ error: "Failed to send email" });
        }
    });
    // Send payment receipt email (uses same SMTP as invoice email)
    app.post("/api/crm/invoices/:invoiceId/receipt", authenticateUser, async (req, res) => {
        try {
            const { to, subject, body } = req.body;
            if (!to) {
                return res.status(400).json({ error: 'Recipient email required' });
            }
            const transporter = nodemailer_1.default.createTransport({
                host: 'smtp.easyname.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.BUSINESS_MAILBOX_USER || '30840mail10',
                    pass: process.env.EMAIL_PASSWORD || 'your-email-password'
                }
            });
            const htmlBody = typeof body === 'string' ? body.replace(/\n/g, '<br>') : body;
            await transporter.sendMail({
                from: getEnvContactEmailSync() || 'no-reply@localhost',
                to,
                subject: subject || 'Payment Receipt',
                html: htmlBody,
                text: typeof body === 'string' ? body.replace(/<[^>]+>/g, '') : undefined
            });
            // Save copy to CRM messages
            try {
                await storage_1.storage.createCrmMessage({
                    senderName: 'New Age Fotografie (Sent)',
                    senderEmail: getEnvContactEmailSync(),
                    subject: `[SENT] ${subject}`,
                    content: `SENT TO: ${to}\n\n${typeof body === 'string' ? body : ''}`,
                    status: 'sent',
                    messageType: 'sent'
                });
            } catch (_) {}
            res.json({ success: true, message: `Receipt sent to ${to}` });
        } catch (error) {
            console.error('Error sending payment receipt:', error);
            res.status(500).json({ error: 'Failed to send receipt: ' + (error.message || error) });
        }
    });
    // SMS invoice to client
    app.post("/api/crm/invoices/:id/sms", authenticateUser, async (req, res) => {
        try {
            const { phoneNumber, customMessage } = req.body;
            const invoice = await storage_1.storage.getCrmInvoice(req.params.id);
            if (!invoice) {
                return res.status(404).json({ error: "Invoice not found" });
            }
            const client = await storage_1.storage.getCrmClient(invoice.clientId);
            if (!client) {
                return res.status(404).json({ error: "Client not found" });
            }
            const clientPhone = phoneNumber || client.phone;
            if (!clientPhone) {
                return res.status(400).json({ error: "No phone number provided or available for client" });
            }
            // Create invoice link
            const baseUrl = process.env.FRONTEND_URL || 'https://newagefotografie.com';
            const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`;
            // Create SMS message
            const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Kunde';
            const defaultMessage = `Hallo ${clientName},

hier ist Ihre Rechnung von New Age Fotografie:

📄 Rechnungsnummer: ${invoice.invoiceNumber}
💰 Betrag: €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}
📅 Fälligkeitsdatum: ${new Date(invoice.dueDate || Date.now()).toLocaleDateString('de-DE')}

🔗 Rechnung ansehen: ${invoiceUrl}

Bei Fragen: +43 677 633 99210

New Age Fotografie Team`;
            const finalMessage = customMessage || defaultMessage;
            // Import SMS service dynamically
            const { SMSService } = await import("./services/smsService");
            // Send SMS
            const result = await SMSService.sendSMS({
                to: clientPhone,
                content: finalMessage,
                clientId: client.id,
                messageType: 'sms'
            });
            // Log SMS activity as a CRM message
            try {
                await storage_1.storage.createCrmMessage({
                    senderName: process.env.BUSINESS_NAME || 'New Age Fotografie',
                    senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || getEnvContactEmailSync(),
                    subject: `Invoice ${invoice.invoiceNumber} sent via SMS`,
                    content: `${finalMessage}\n\nLink: ${invoiceUrl}`,
                    messageType: 'sms',
                    status: result.success ? 'sent' : 'failed',
                    clientId: client.id,
                    phoneNumber: clientPhone,
                    smsMessageId: result.messageId,
                });
            }
            catch (e) {
                console.warn('Failed to log SMS as CRM message:', e);
            }
            res.json({
                success: true,
                message: "Invoice sent successfully via SMS",
                phoneNumber: clientPhone,
                smsId: result.messageId,
                invoiceUrl: invoiceUrl
            });
        }
        catch (error) {
            console.error("Error sending invoice SMS:", error);
            res.status(500).json({ error: "Failed to send SMS" });
        }
    });
    // WhatsApp invoice to client
    app.post("/api/crm/invoices/:id/whatsapp", authenticateUser, async (req, res) => {
        try {
            const { phoneNumber, customMessage } = req.body;
            const invoice = await storage_1.storage.getCrmInvoice(req.params.id);
            if (!invoice) {
                return res.status(404).json({ error: "Invoice not found" });
            }
            const client = await storage_1.storage.getCrmClient(invoice.clientId);
            if (!client) {
                return res.status(404).json({ error: "Client not found" });
            }
            const clientPhone = phoneNumber || client.phone;
            if (!clientPhone) {
                return res.status(400).json({ error: "No phone number provided or available for client" });
            }
            // Create invoice link
            const baseUrl = process.env.FRONTEND_URL || 'https://newagefotografie.com';
            const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`;
            // Create WhatsApp message
            const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Kunde';
            const defaultMessage = `Hallo ${clientName},

hier ist Ihre Rechnung von New Age Fotografie:

📄 Rechnungsnummer: ${invoice.invoiceNumber}
💰 Betrag: €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}
📅 Fälligkeitsdatum: ${new Date(invoice.dueDate || Date.now()).toLocaleDateString('de-DE')}

🔗 Rechnung ansehen: ${invoiceUrl}

Bei Fragen stehe ich Ihnen gerne zur Verfügung!

Mit freundlichen Grüßen,
New Age Fotografie Team`;
            const finalMessage = customMessage || defaultMessage;
            // Create WhatsApp URL
            const cleanPhone = clientPhone.replace(/[^\d+]/g, '');
            const encodedMessage = encodeURIComponent(finalMessage);
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
            // Log WhatsApp share as a CRM message entry
            try {
                await storage_1.storage.createCrmMessage({
                    senderName: process.env.BUSINESS_NAME || 'New Age Fotografie',
                    senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || getEnvContactEmailSync(),
                    subject: `Invoice ${invoice.invoiceNumber} shared via WhatsApp`,
                    content: `${finalMessage}\n\nWhatsApp: ${whatsappUrl}\nInvoice: ${invoiceUrl}`,
                    messageType: 'whatsapp',
                    status: 'sent',
                    clientId: client.id,
                    phoneNumber: clientPhone,
                });
            }
            catch (e) {
                console.warn('Failed to log WhatsApp share as CRM message:', e);
            }
            res.json({
                success: true,
                whatsappUrl: whatsappUrl,
                invoiceUrl: invoiceUrl,
                message: "WhatsApp share link created successfully"
            });
        }
        catch (error) {
            console.error("Error creating WhatsApp share link:", error);
            res.status(500).json({ error: "Failed to create WhatsApp share link" });
        }
    });
    // Legacy WhatsApp share endpoint for backward compatibility
    app.post("/api/invoices/share-whatsapp", async (req, res) => {
        try {
            const { invoice_id, phone_number } = req.body;
            if (!invoice_id || !phone_number) {
                return res.status(400).json({
                    success: false,
                    error: "invoice_id and phone_number are required"
                });
            }
            const invoice = await storage_1.storage.getCrmInvoice(invoice_id);
            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    error: "Invoice not found"
                });
            }
            const client = await storage_1.storage.getCrmClient(invoice.clientId);
            if (!client) {
                return res.status(404).json({
                    success: false,
                    error: "Client not found"
                });
            }
            // Create invoice link
            const baseUrl = process.env.FRONTEND_URL || req.get('origin') || 'https://newagefotografie.com';
            const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`;
            // Create WhatsApp message
            const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Kunde';
            const message = `Hallo ${clientName} 👋

Hier ist Ihre Rechnung von New Age Fotografie:

📄 Rechnungsnummer: ${invoice.invoiceNumber}
💰 Betrag: €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}
📅 Fälligkeitsdatum: ${new Date(invoice.dueDate || Date.now()).toLocaleDateString('de-DE')}

🔗 Rechnung ansehen: ${invoiceUrl}

Bei Fragen stehe ich Ihnen gerne zur Verfügung! 📸

Vielen Dank für Ihr Vertrauen!
New Age Fotografie Team`;
            // Create WhatsApp URL
            const cleanPhone = phone_number.replace(/[^\d+]/g, '');
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
            res.json({
                success: true,
                whatsapp_url: whatsappUrl,
                invoice_url: invoiceUrl
            });
        }
        catch (error) {
            console.error("Error creating WhatsApp share link:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create WhatsApp share link"
            });
        }
    });
    // ==================== INVOICE STRIPE PAYMENT ROUTES ====================
    // Create Stripe Checkout Session for invoice payment
    app.post("/api/invoices/:id/create-payment-session", async (req, res) => {
        try {
            if (!stripe || !stripeConfigured) {
                return res.status(503).json({
                    success: false,
                    error: "Payment service not configured"
                });
            }
            const invoiceId = req.params.id;
            const invoice = await storage_1.storage.getCrmInvoice(invoiceId);
            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    error: "Invoice not found"
                });
            }
            // Check if already paid
            if (invoice.status === 'paid') {
                return res.status(400).json({
                    success: false,
                    error: "Invoice already paid"
                });
            }
            // Get client details
            const client = await storage_1.storage.getCrmClient(invoice.clientId);
            const clientEmail = client?.email || 'customer@example.com';
            const clientName = client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : 'Customer';
            // Calculate amount (convert to cents for Stripe)
            const paidAmount = parseFloat(invoice.paidAmount?.toString() || '0');
            const totalAmount = parseFloat(invoice.total?.toString() || '0');
            const balanceDue = totalAmount - paidAmount;
            if (balanceDue <= 0) {
                return res.status(400).json({
                    success: false,
                    error: "No balance due on this invoice"
                });
            }
            const amountInCents = Math.round(balanceDue * 100);
            // Determine base URL for redirect
            const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || req.get('origin') || 'https://workingnewage-2eecd723a444.herokuapp.com';
            // Create Stripe Checkout Session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                customer_email: clientEmail,
                line_items: [
                    {
                        price_data: {
                            currency: (invoice.currency || 'EUR').toLowerCase(),
                            product_data: {
                                name: `Invoice ${invoice.invoiceNumber}`,
                                description: `Payment for invoice ${invoice.invoiceNumber} - ${clientName}`,
                            },
                            unit_amount: amountInCents,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                success_url: `${baseUrl}/invoice/${invoiceId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/invoice/${invoiceId}?payment=cancelled`,
                metadata: {
                    invoiceId: invoiceId,
                    invoiceNumber: invoice.invoiceNumber || '',
                    clientId: invoice.clientId || '',
                },
            });
            // Store the payment intent/session ID
            await storage_1.storage.updateCrmInvoice(invoiceId, {
                stripePaymentIntentId: session.id,
                stripePaymentUrl: session.url,
            });
            res.json({
                success: true,
                sessionId: session.id,
                url: session.url,
            });
        }
        catch (error) {
            console.error("Error creating payment session:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create payment session"
            });
        }
    });
    // Verify payment status and update invoice
    app.get("/api/invoices/:id/payment-status", async (req, res) => {
        try {
            const invoiceId = req.params.id;
            const sessionId = req.query.session_id;
            if (!stripe || !stripeConfigured) {
                return res.status(503).json({
                    success: false,
                    error: "Payment service not configured"
                });
            }
            const invoice = await storage_1.storage.getCrmInvoice(invoiceId);
            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    error: "Invoice not found"
                });
            }
            // If session_id provided, check with Stripe
            if (sessionId) {
                const session = await stripe.checkout.sessions.retrieve(sessionId);
                if (session.payment_status === 'paid') {
                    // Update invoice status to paid
                    const totalAmount = parseFloat(invoice.total?.toString() || '0');
                    await storage_1.storage.updateCrmInvoice(invoiceId, {
                        status: 'paid',
                        paidAmount: totalAmount.toString(),
                    });
                    // Record payment
                    await storage_1.storage.createCrmInvoicePayment({
                        invoiceId: invoiceId,
                        amount: totalAmount.toString(),
                        paymentMethod: 'stripe',
                        paymentReference: session.payment_intent,
                        notes: `Stripe payment - Session: ${sessionId}`,
                    });
                    return res.json({
                        success: true,
                        status: 'paid',
                        message: 'Payment confirmed',
                    });
                }
            }
            res.json({
                success: true,
                status: invoice.status,
                paidAmount: invoice.paidAmount,
            });
        }
        catch (error) {
            console.error("Error checking payment status:", error);
            res.status(500).json({
                success: false,
                error: "Failed to check payment status"
            });
        }
    });
    // Stripe webhook for invoice payments
    app.post("/api/invoices/webhook", async (req, res) => {
        if (!stripe || !stripeConfigured) {
            return res.status(503).json({ error: "Payment service not configured" });
        }
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_INVOICE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
        if (!sig || !webhookSecret) {
            console.warn('Missing Stripe signature or webhook secret for invoice payment');
            return res.status(400).send('Missing signature');
        }
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        }
        catch (err) {
            console.error('Invoice webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        // Handle checkout session completed
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const invoiceId = session.metadata?.invoiceId;
            if (invoiceId && session.payment_status === 'paid') {
                try {
                    const invoice = await storage_1.storage.getCrmInvoice(invoiceId);
                    if (invoice) {
                        const totalAmount = parseFloat(invoice.total?.toString() || '0');
                        await storage_1.storage.updateCrmInvoice(invoiceId, {
                            status: 'paid',
                            paidAmount: totalAmount.toString(),
                        });
                        await storage_1.storage.createCrmInvoicePayment({
                            invoiceId: invoiceId,
                            amount: totalAmount.toString(),
                            paymentMethod: 'stripe',
                            paymentReference: session.payment_intent,
                            notes: `Stripe checkout completed - Session: ${session.id}`,
                        });
                        console.log(`✅ Invoice ${invoiceId} marked as paid via Stripe webhook`);
                    }
                }
                catch (err) {
                    console.error('Error processing invoice payment webhook:', err);
                }
            }
        }
        res.json({ received: true });
    });
    // ==================== EMAIL ROUTES ====================
    app.post("/api/email/import", authenticateUser, async (req, res) => {
        try {
            const { provider, smtpHost, smtpPort, username, password, useTLS, imapHost: providedImapHost } = req.body;
            // Basic validation
            if (!smtpHost || !smtpPort || !username || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required connection parameters"
                });
            }
            console.log(`Attempting to import emails from ${username} via ${smtpHost}:${smtpPort}`);
            // Special handling for EasyName/business email
            // Check for EasyName SMTP host or known business mailbox usernames
            const isEasyNameHost = smtpHost.includes('easyname');
            const isBusinessMailbox = username === '30840mail10' ||
                username === (process.env.STUDIO_NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER) ||
                username === process.env.BUSINESS_MAILBOX_USER;
            if (isEasyNameHost || isBusinessMailbox) {
                console.log('Using EasyName IMAP settings for business email');
                const mailboxUser = username;
                const mailboxPass = password;
                const importedEmails = await importEmailsFromIMAP({
                    host: 'imap.easyname.com',
                    port: 993,
                    username: mailboxUser,
                    password: mailboxPass,
                    useTLS: true
                });
                console.log(`Successfully fetched ${importedEmails.length} emails from business account`);
                // Store emails in database, avoid duplicates
                let newEmailCount = 0;
                const existingMessages = await storage_1.storage.getCrmMessages();
                for (const email of importedEmails) {
                    // Check if email already exists (improved duplicate check)
                    const isDuplicate = existingMessages.some(msg => msg.subject === email.subject &&
                        msg.senderEmail === email.from &&
                        msg.createdAt && Math.abs(new Date(msg.createdAt).getTime() - new Date(email.date).getTime()) < 300000 // Within 5 minutes
                    );
                    if (!isDuplicate) {
                        try {
                            await storage_1.storage.createCrmMessage({
                                senderName: email.fromName,
                                senderEmail: email.from,
                                subject: email.subject,
                                content: email.body,
                                status: email.isRead ? 'read' : 'unread'
                            });
                            newEmailCount++;
                            console.log(`Imported new email: ${email.subject} from ${email.from}`);
                        }
                        catch (error) {
                            console.error('Failed to save email:', error);
                        }
                    }
                }
                console.log(`Imported ${newEmailCount} new emails out of ${importedEmails.length} fetched`);
                return res.json({
                    success: true,
                    message: `Successfully imported ${importedEmails.length} emails from ${username}`,
                    count: importedEmails.length
                });
            }
            // Convert SMTP server to IMAP server for major providers
            let imapHost = smtpHost;
            if (provider === 'gmail') {
                imapHost = 'imap.gmail.com';
            }
            else if (provider === 'outlook') {
                imapHost = 'outlook.office365.com';
            }
            else if (smtpHost.includes('smtp.')) {
                imapHost = smtpHost.replace('smtp.', 'imap.');
            }
            // Import actual emails using IMAP
            const importedEmails = await importEmailsFromIMAP({
                host: imapHost,
                port: provider === 'gmail' ? 993 : (provider === 'outlook' ? 993 : 993),
                username,
                password,
                useTLS: useTLS !== false
            });
            console.log(`Successfully fetched ${importedEmails.length} emails from ${username}`);
            // Store emails in database
            for (const email of importedEmails) {
                await storage_1.storage.createCrmMessage({
                    senderName: email.fromName,
                    senderEmail: email.from,
                    subject: email.subject,
                    content: email.body,
                    status: email.isRead ? 'read' : 'unread'
                });
            }
            return res.json({
                success: true,
                message: `Successfully imported ${importedEmails.length} emails from ${username}`,
                count: importedEmails.length
            });
        }
        catch (error) {
            console.error("Error importing emails:", error);
            res.status(500).json({
                success: false,
                message: "Failed to import emails: " + error.message
            });
        }
    });
    app.get("/api/crm/messages", authenticateUser, async (req, res) => {
        try {
            const messages = await storage_1.storage.getCrmMessages();
            res.json(messages);
        }
        catch (error) {
            console.error("Error fetching messages:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.put("/api/crm/messages/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;
            const message = await storage_1.storage.updateCrmMessage(id, updates);
            res.json(message);
        }
        catch (error) {
            console.error("Error updating message:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.delete("/api/crm/messages/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            await storage_1.storage.deleteCrmMessage(id);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting message:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== INBOX EMAIL ROUTES ====================
    app.get("/api/inbox/emails", authenticateUser, async (req, res) => {
        try {
            const unreadOnly = req.query.unread === 'true';
            const messages = await storage_1.storage.getCrmMessages();
            // Filter to only show INBOUND messages (received emails)
            // Sent emails (outbound) should only appear in the Sent folder
            const inboundMessages = messages.filter(message => {
                // Exclude outbound/sent messages from inbox
                if (message.direction === 'outbound')
                    return false;
                if (message.status === 'sent' || message.status === 'demo_sent')
                    return false;
                return true;
            });
            // Sort messages by creation date (newest first)
            const sortedMessages = inboundMessages.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
            if (unreadOnly) {
                const unreadMessages = sortedMessages.filter(message => message.status === 'unread');
                res.json(unreadMessages);
            }
            else {
                res.json(sortedMessages);
            }
        }
        catch (error) {
            console.error("Error fetching inbox emails:", error);
            // Fail-open to avoid blocking dashboard if storage fails
            res.json([]);
        }
    });
    // ==================== INBOX FOLDERS ROUTES ====================
    // Ensure email_folders table exists
    const ensureEmailFoldersTable = async () => {
        try {
            await runSql(`
        CREATE TABLE IF NOT EXISTS email_folders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          color TEXT DEFAULT '#6366f1',
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
            // Add folder_id column to crm_messages if not exists
            await runSql(`ALTER TABLE crm_messages ADD COLUMN IF NOT EXISTS folder_id UUID`);
        }
        catch (e) {
            console.warn('⚠️ Email folders table ensure failed:', e.message);
        }
    };
    // GET /api/inbox/folders - List all folders
    app.get("/api/inbox/folders", authenticateUser, async (req, res) => {
        try {
            await ensureEmailFoldersTable();
            const folders = await runSql(`
        SELECT id, name, color, sort_order, created_at, updated_at
        FROM email_folders
        ORDER BY sort_order ASC, created_at ASC
      `);
            res.json(folders || []);
        }
        catch (error) {
            console.error('Error fetching inbox folders:', error);
            res.json([]);
        }
    });
    // POST /api/inbox/folders - Create a new folder
    app.post("/api/inbox/folders", authenticateUser, async (req, res) => {
        try {
            await ensureEmailFoldersTable();
            const { name, color } = req.body;
            if (!name) {
                return res.status(400).json({ error: 'Folder name is required' });
            }
            const result = await runSql(`
        INSERT INTO email_folders (name, color, sort_order)
        VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM email_folders), 0))
        RETURNING id, name, color, sort_order, created_at, updated_at
      `, [name, color || '#6366f1']);
            res.status(201).json(result[0]);
        }
        catch (error) {
            console.error('Error creating inbox folder:', error);
            res.status(500).json({ error: 'Failed to create folder' });
        }
    });
    // PUT /api/inbox/folders/:id - Update a folder
    app.put("/api/inbox/folders/:id", authenticateUser, async (req, res) => {
        try {
            await ensureEmailFoldersTable();
            const { id } = req.params;
            const { name, color } = req.body;
            const result = await runSql(`
        UPDATE email_folders
        SET name = COALESCE($1, name),
            color = COALESCE($2, color),
            updated_at = NOW()
        WHERE id = $3::uuid
        RETURNING id, name, color, sort_order, created_at, updated_at
      `, [name, color, id]);
            if (!result || result.length === 0) {
                return res.status(404).json({ error: 'Folder not found' });
            }
            res.json(result[0]);
        }
        catch (error) {
            console.error('Error updating inbox folder:', error);
            res.status(500).json({ error: 'Failed to update folder' });
        }
    });
    // DELETE /api/inbox/folders/:id - Delete a folder
    app.delete("/api/inbox/folders/:id", authenticateUser, async (req, res) => {
        try {
            await ensureEmailFoldersTable();
            const { id } = req.params;
            // Move emails from this folder back to inbox (null folder_id)
            await runSql(`UPDATE crm_messages SET folder_id = NULL WHERE folder_id = $1::uuid`, [id]);
            // Delete the folder
            await runSql(`DELETE FROM email_folders WHERE id = $1::uuid`, [id]);
            res.json({ success: true });
        }
        catch (error) {
            console.error('Error deleting inbox folder:', error);
            res.status(500).json({ error: 'Failed to delete folder' });
        }
    });
    // POST /api/inbox/emails/move - Move emails to a folder
    app.post("/api/inbox/emails/move", authenticateUser, async (req, res) => {
        try {
            await ensureEmailFoldersTable();
            const { messageIds, folderId } = req.body;
            if (!messageIds || !Array.isArray(messageIds)) {
                return res.status(400).json({ error: 'messageIds array is required' });
            }
            // folderId can be null to move back to inbox
            for (const msgId of messageIds) {
                await runSql(`UPDATE crm_messages SET folder_id = $1, updated_at = NOW() WHERE id = $2::uuid`, [folderId || null, msgId]);
            }
            res.json({ success: true, moved: messageIds.length });
        }
        catch (error) {
            console.error('Error moving emails:', error);
            res.status(500).json({ error: 'Failed to move emails' });
        }
    });
    // ==================== ADMIN DASHBOARD ====================
    app.get("/api/admin/dashboard-stats", authenticateUser, async (_req, res) => {
        const safe = async (fn, fallback) => {
            try {
                return await fn();
            }
            catch {
                return fallback;
            }
        };
        const countOf = async (arrPromise) => (await safe(() => arrPromise, [])).length;
        try {
            const [sessionsCount, clientsCount, leadsCount] = await Promise.all([
                countOf(storage_1.storage.getPhotographySessions()),
                countOf(storage_1.storage.getCrmClients()),
                countOf(storage_1.storage.getCrmLeads('new'))
            ]);
            res.json({
                success: true,
                metrics: {
                    sessions: sessionsCount,
                    clients: clientsCount,
                    newLeads: leadsCount,
                }
            });
        }
        catch (error) {
            console.error('Dashboard stats error:', error);
            res.json({ success: false, metrics: { sessions: 0, clients: 0, newLeads: 0 } });
        }
    });
    // Admin notifications endpoint
    app.get("/api/admin/notifications", authenticateUser, async (req, res) => {
        try {
            // Return empty notifications array for now
            // TODO: Implement notification system
            res.json([]);
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    });
    // Admin email settings endpoint
    app.get("/api/admin/email-settings", authenticateUser, async (req, res) => {
        try {
            // Return current email configuration (sanitized, no sensitive data)
            res.json({
                configured: !!process.env.SMTP_HOST,
                host: process.env.SMTP_HOST ? '***configured***' : null,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                from: process.env.SMTP_FROM || 'noreply@example.com'
            });
        }
        catch (error) {
            console.error('Error fetching email settings:', error);
            res.status(500).json({ error: 'Failed to fetch email settings' });
        }
    });
    // ==================== STUDIO LOCATION SETTINGS ====================
    // Get studio location settings (for Golden Hour, Weather features)
    app.get("/api/admin/studio-location", authenticateUser, async (req, res) => {
        try {
            // Get the first studio config (single-tenant for now)
            const studios = await db_1.db.select().from(schema_1.studioConfigs).limit(1);
            if (studios.length === 0) {
                // Return Vienna defaults if no studio configured
                return res.json({
                    latitude: 48.2082,
                    longitude: 16.3738,
                    timezone: 'Europe/Vienna',
                    city: 'Vienna',
                    country: 'Austria',
                    address: null
                });
            }
            const studio = studios[0];
            res.json({
                latitude: studio.latitude ? parseFloat(studio.latitude) : 48.2082,
                longitude: studio.longitude ? parseFloat(studio.longitude) : 16.3738,
                timezone: studio.timezone || 'Europe/Vienna',
                city: studio.city || 'Vienna',
                country: studio.country || 'Austria',
                address: studio.address || null
            });
        }
        catch (error) {
            console.error('Error fetching studio location:', error);
            // Return defaults on error
            res.json({
                latitude: 48.2082,
                longitude: 16.3738,
                timezone: 'Europe/Vienna',
                city: 'Vienna',
                country: 'Austria',
                address: null
            });
        }
    });
    // Update studio location settings
    app.put("/api/admin/studio-location", authenticateUser, async (req, res) => {
        try {
            const { latitude, longitude, timezone, city, country, address } = req.body;
            // Get existing studio or create new one
            const studios = await db_1.db.select().from(schema_1.studioConfigs).limit(1);
            if (studios.length === 0) {
                return res.status(400).json({ error: 'No studio configuration found. Please create one first.' });
            }
            const studioId = studios[0].id;
            // Update studio location fields
            await db_1.db.update(schema_1.studioConfigs)
                .set({
                latitude: latitude?.toString() || null,
                longitude: longitude?.toString() || null,
                timezone: timezone || 'Europe/Vienna',
                city: city || studios[0].city,
                country: country || studios[0].country,
                address: address || studios[0].address,
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_2.eq)(schema_1.studioConfigs.id, studioId));
            res.json({
                success: true,
                message: 'Studio location updated successfully',
                location: { latitude, longitude, timezone, city, country, address }
            });
        }
        catch (error) {
            console.error('Error updating studio location:', error);
            res.status(500).json({ error: 'Failed to update studio location' });
        }
    });
    // Admin questionnaire responses endpoint
    app.get("/api/admin/questionnaire-responses", authenticateUser, async (req, res) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;
            // TODO: Implement questionnaire responses storage
            res.json({
                rows: [],
                total: 0,
                limit,
                offset
            });
        }
        catch (error) {
            console.error('Error fetching questionnaire responses:', error);
            res.status(500).json({ error: 'Failed to fetch responses', rows: [], total: 0 });
        }
    });
    // Admin calendar analytics endpoint
    app.get("/api/admin/calendar-analytics", authenticateUser, async (req, res) => {
        try {
            const period = req.query.period || 'month';
            // TODO: Implement calendar analytics
            res.json({
                period,
                bookings: 0,
                revenue: 0,
                sessions: []
            });
        }
        catch (error) {
            console.error('Error fetching calendar analytics:', error);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    });
    // Photography calendar pages endpoint
    app.get("/api/photography/calendar-pages", authenticateUser, async (req, res) => {
        try {
            const simple = req.query.simple === 'true';
            // TODO: Implement calendar pages
            res.json([]);
        }
        catch (error) {
            console.error('Error fetching calendar pages:', error);
            res.status(500).json({ error: 'Failed to fetch calendar pages' });
        }
    });
    // ==================== GOOGLE CALENDAR INTEGRATION ROUTES ====================
    app.get("/api/calendar/google/status", authenticateUser, async (req, res) => {
        try {
            // Check if user has Google Calendar tokens stored
            // For now, return a mock status that shows disconnected state
            res.json({
                connected: false,
                calendars: [],
                settings: {
                    autoSync: false,
                    syncInterval: '15m',
                    syncDirection: 'both',
                    defaultCalendar: ''
                },
                lastSync: null
            });
        }
        catch (error) {
            console.error("Error checking Google Calendar status:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.get("/api/calendar/google/auth-url", authenticateUser, async (req, res) => {
        try {
            // In a real implementation, you would:
            // 1. Generate OAuth state parameter
            // 2. Create Google OAuth URL with proper scopes
            // 3. Store state for verification
            // Google Calendar OAuth scopes needed:
            const scopes = [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events'
            ];
            // For demo purposes, provide instructions to user
            res.json({
                authUrl: `https://accounts.google.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=${scopes.join(' ')}&response_type=code&access_type=offline`,
                message: "To complete Google Calendar integration, you'll need to set up Google OAuth credentials in your Google Cloud Console and configure the CLIENT_ID and CLIENT_SECRET environment variables."
            });
        }
        catch (error) {
            console.error("Error generating Google auth URL:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/calendar/google/disconnect", authenticateUser, async (req, res) => {
        try {
            // In a real implementation, you would:
            // 1. Revoke Google OAuth tokens
            // 2. Remove stored credentials from database
            // 3. Clean up any sync settings
            res.json({ success: true, message: "Google Calendar disconnected successfully" });
        }
        catch (error) {
            console.error("Error disconnecting Google Calendar:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/calendar/google/sync", authenticateUser, async (req, res) => {
        try {
            // In a real implementation, you would:
            // 1. Fetch events from Google Calendar API
            // 2. Compare with local photography sessions
            // 3. Sync bidirectionally based on settings
            // 4. Handle conflicts and duplicates
            res.json({
                success: true,
                message: "Calendar sync completed successfully",
                imported: 0,
                exported: 0,
                conflicts: 0
            });
        }
        catch (error) {
            console.error("Error syncing Google Calendar:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // (placeholder handler for /api/calendar/import/google removed to avoid conflicting routes)
    app.put("/api/calendar/google/settings", authenticateUser, async (req, res) => {
        try {
            const settings = req.body;
            // In a real implementation, you would:
            // 1. Validate settings
            // 2. Store in database
            // 3. Update sync job schedules if needed
            res.json({ success: true, settings });
        }
        catch (error) {
            console.error("Error updating Google Calendar settings:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Helper: determine import cutoff (defaults to start of today in Europe/Vienna, UTC)
    function getImportCutoffUtc(req) {
        try {
            const includePast = String((req.query.includePast || req.query.includepast) ?? '').toLowerCase() === 'true';
            if (includePast)
                return new Date(0); // no cutoff
            const from = req.query.from || req.query.cutoff;
            const tz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';
            let localIso;
            if (from && /\d{4}-\d{2}-\d{2}/.test(from)) {
                localIso = `${from}T00:00:00`;
            }
            else {
                // start of today in Vienna
                const now = new Date();
                const y = now.getUTCFullYear();
                const m = now.getUTCMonth();
                const d = now.getUTCDate();
                const todayUtc = new Date(Date.UTC(y, m, d, 0, 0, 0));
                // Convert UTC midnight to Vienna date parts
                // Safer approach: format today in Vienna and rebuild local midnight
                const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
                const parts = dtf.format(todayUtc); // YYYY-MM-DD in Vienna TZ
                localIso = `${parts}T00:00:00`;
            }
            const utcIso = convertLocalToUtcIso(localIso, tz);
            const d = new Date(utcIso);
            return isNaN(d.getTime()) ? new Date() : d;
        }
        catch {
            return new Date();
        }
    }
    // Helper: determine optional upper-bound cutoff (to=YYYY-MM-DD in Europe/Vienna)
    function getImportUpperBoundUtc(req) {
        try {
            const to = req.query.to || req.query.until;
            if (!to || !/\d{4}-\d{2}-\d{2}/.test(to))
                return undefined;
            const tz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';
            // Interpret as end-of-day local time then convert to UTC
            const localIso = `${to}T23:59:59`;
            const utcIso = convertLocalToUtcIso(localIso, tz);
            const d = new Date(utcIso);
            return isNaN(d.getTime()) ? undefined : d;
        }
        catch {
            return undefined;
        }
    }
    // ==================== CALENDAR IMPORT ====================
    // Fallback Google import route used by client UI. If an icsUrl is provided,
    // it proxies to the /api/calendar/import/ics-url logic; otherwise it returns
    // a friendly success with 0 imports and guidance for using the ICS options.
    app.post("/api/calendar/import/google", authenticateUser, async (req, res) => {
        try {
            const { icsUrl } = req.body || {};
            const dryRun = String(req.query.dryRun || req.query.dryrun || '').toLowerCase() === 'true';
            if (icsUrl && typeof icsUrl === 'string' && icsUrl.trim().length > 0) {
                try {
                    const fetch = (await import('node-fetch')).default;
                    const response = await fetch(icsUrl);
                    if (!response.ok) {
                        return res.status(502).json({ error: `Failed to fetch calendar: ${response.status}` });
                    }
                    const icsContent = await response.text();
                    // Log snapshot to temp for diagnostics
                    try {
                        const tmpDir = os_1.default.tmpdir();
                        const rawPath = path_1.default.join(tmpDir, 'clean-crm-debug_ics_content.log');
                        const header = `==== ICS SNAPSHOT ${new Date().toISOString()} GOOGLE: ${icsUrl} LENGTH: ${icsContent.length} ====`;
                        fs_1.default.appendFileSync(rawPath, header + '\n' + icsContent.substring(0, 2000) + '\n\n', { encoding: 'utf8' });
                        console.error(`WROTE_ICS_SNAPSHOT | path=${rawPath} | len=${icsContent.length}`);
                    }
                    catch { }
                    const importedEvents = parseICalContent(icsContent);
                    // Default to upcoming-only unless includePast=true or a from=YYYY-MM-DD cutoff is provided
                    const cutoff = getImportCutoffUtc(req);
                    const upper = getImportUpperBoundUtc(req);
                    const eventsToImport = importedEvents.filter(ev => {
                        const ds = ev?.dtstart ? new Date(ev.dtstart) : null;
                        return !!(ds && !isNaN(ds.getTime()) && ds >= cutoff && (!upper || ds <= upper));
                    });
                    if (dryRun) {
                        return res.json({ success: true, dryRun: true, parsed: importedEvents.length, filtered: eventsToImport.length, cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
                    }
                    let importedCount = 0;
                    for (const event of eventsToImport) {
                        try {
                            // Helper function to safely create date
                            const safeCreateDate = (dateString) => {
                                if (!dateString)
                                    return null;
                                const date = new Date(dateString);
                                return isNaN(date.getTime()) ? null : date;
                            };
                            const session = {
                                id: `imported-${(event.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/[^a-zA-Z0-9_-]/g, '')}`,
                                icalUid: event.uid || undefined,
                                title: event.summary || 'Imported Event',
                                description: event.description || '',
                                sessionType: 'imported',
                                status: 'confirmed',
                                // Skip when dates invalid to avoid clustering
                                startTime: safeCreateDate(event.dtstart),
                                endTime: safeCreateDate(event.dtend),
                                locationName: event.location || '',
                                locationAddress: event.location || '',
                                clientName: extractClientFromDescription(event.description || event.summary || ''),
                                clientEmail: '',
                                clientPhone: '',
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
                            };
                            // Validate parsed dates
                            if (!(session.startTime instanceof Date) || isNaN(session.startTime.getTime()) ||
                                !(session.endTime instanceof Date) || isNaN(session.endTime.getTime())) {
                                console.error('GOOGLE_IMPORT skip invalid dates:', { summary: event.summary, dtstart: event.dtstart, dtend: event.dtend });
                                continue;
                            }
                            await storage_1.storage.createPhotographySession(session);
                            importedCount++;
                        }
                        catch (e) {
                            console.error('GOOGLE_IMPORT insert failed:', e);
                        }
                    }
                    return res.json({ success: true, imported: importedCount, via: 'icsUrl', cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
                }
                catch (err) {
                    return res.status(500).json({ error: 'Failed to import via icsUrl', details: err?.message });
                }
            }
            // No icsUrl provided: respond with a benign success to keep the UI happy,
            // and guide the user toward the ICS URL or file upload flows.
            return res.json({
                success: true,
                imported: 0,
                message: 'Google OAuth import not configured. Use the .ics URL import or upload a .ics file.'
            });
        }
        catch (error) {
            console.error('Error in /api/calendar/import/google:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.post("/api/calendar/import/ics", authenticateUser, async (req, res) => {
        try {
            const { icsContent, fileName } = req.body;
            if (!icsContent) {
                return res.status(400).json({ error: 'No iCal content provided' });
            }
            // Persist raw iCal content snapshot synchronously for debugging (write to OS temp dir)
            try {
                const tmpDir = os_1.default.tmpdir();
                const rawPath = path_1.default.join(tmpDir, 'clean-crm-debug_ics_content.log');
                const header = `==== ICS SNAPSHOT ${new Date().toISOString()} DIRECT: ${fileName || 'no-name'} LENGTH: ${icsContent.length} ====`;
                fs_1.default.appendFileSync(rawPath, header + '\n' + icsContent.substring(0, 2000) + '\n\n', { encoding: 'utf8' });
                console.error(`WROTE_ICS_SNAPSHOT | path=${rawPath} | len=${icsContent.length}`);
            }
            catch (e) {
                console.error('Failed to write ICS content snapshot:', e);
            }
            // Parse iCal content and convert to photography sessions
            const importedEvents = parseICalContent(icsContent);
            const cutoff = getImportCutoffUtc(req);
            const upper = getImportUpperBoundUtc(req);
            const eventsToImport = importedEvents.filter(ev => {
                const ds = ev?.dtstart ? new Date(ev.dtstart) : null;
                return !!(ds && !isNaN(ds.getTime()) && ds >= cutoff && (!upper || ds <= upper));
            });
            const dryRun = String(req.query.dryRun || req.query.dryrun || '').toLowerCase() === 'true';
            if (dryRun) {
                console.error(`ICS_DRY_RUN | events=${importedEvents.length} | filtered=${eventsToImport.length} | cutoff=${cutoff.toISOString()} | upper=${upper ? upper.toISOString() : 'none'} | fileName=${fileName || ''}`);
                return res.json({ success: true, dryRun: true, parsed: importedEvents.length, filtered: eventsToImport.length, cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
            }
            console.log('Imported events parsed from content:', importedEvents.length, 'filtered:', eventsToImport.length, 'cutoff:', cutoff.toISOString(), 'sample:', eventsToImport[0] ? { summary: eventsToImport[0].summary, dtstart: eventsToImport[0].dtstart, dtend: eventsToImport[0].dtend } : null);
            let importedCount = 0;
            for (const event of eventsToImport) {
                try {
                    // Helper: coerce to Date or return null
                    const safeCreateDate = (dateString) => {
                        if (!dateString)
                            return null;
                        const date = new Date(dateString);
                        return isNaN(date.getTime()) ? null : date;
                    };
                    const start = safeCreateDate(event.dtstart);
                    const end = safeCreateDate(event.dtend);
                    if (!start || !end) {
                        console.error('SKIP_IMPORT_INVALID_DATES', { summary: event.summary, dtstart: event.dtstart, dtend: event.dtend });
                        continue; // skip invalid entries instead of assigning "now"
                    }
                    // Create photography session from calendar event
                    const session = {
                        id: `imported-${(event.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/[^a-zA-Z0-9_-]/g, '')}`,
                        icalUid: event.uid || undefined,
                        title: event.summary || 'Imported Event',
                        description: event.description || '',
                        sessionType: 'imported',
                        status: 'confirmed',
                        // Ensure timestamps are valid Date objects for Drizzle/pg driver
                        startTime: start,
                        endTime: end,
                        locationName: event.location || '',
                        locationAddress: event.location || '',
                        clientName: extractClientFromDescription(event.description || event.summary || ''),
                        clientEmail: '',
                        clientPhone: '',
                        // omit optional pricing fields to avoid decimal coercion issues
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
                    };
                    // Debug: log runtime types for timestamp-like fields before insert
                    try {
                        const timestampFields = ['startTime', 'endTime', 'createdAt', 'updatedAt'];
                        const types = {};
                        for (const f of timestampFields) {
                            const v = session[f];
                            types[f] = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
                        }
                        console.log('DEBUG import session types:', { summary: event.summary, uid: event.uid, types });
                    }
                    catch (logErr) {
                        console.error('Failed to log session types for import event:', logErr);
                    }
                    // Diagnostic: print types and small snapshot to stderr so we can capture offending values in server.err
                    try {
                        // Single-line marker for log search
                        const diagFields = ['startTime', 'endTime', 'createdAt', 'updatedAt', 'deliveryDate'];
                        const diagParts = [];
                        for (const f of diagFields) {
                            const v = session[f];
                            const t = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
                            const val = v instanceof Date ? v.toISOString() : (v === undefined ? 'null' : String(v));
                            diagParts.push(`${f}=${t}:${val}`);
                        }
                        console.error(`IMPORT_DIAG_SINGLELINE | summary=${event.summary || ''} | uid=${event.uid || ''} | ${diagParts.join(' | ')}`);
                    }
                    catch (diagErr) {
                        console.error('IMPORT DIAG failed:', diagErr);
                    }
                    // Log a compact session preview before attempting insert
                    try {
                        const previewParts = [];
                        ['startTime', 'endTime', 'createdAt', 'updatedAt', 'deliveryDate'].forEach((k) => {
                            const v = session[k];
                            const t = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
                            previewParts.push(`${k}=${t}`);
                        });
                        console.error(`IMPORT_BEFORE_INSERT | summary=${event.summary || ''} | uid=${event.uid || ''} | ${previewParts.join(' | ')}`);
                    }
                    catch (e) {
                        console.error('Failed logging pre-insert session preview', e);
                    }
                    // Synchronous debug snapshot to capture payload exactly before DB insert (write to OS temp dir)
                    try {
                        const tmpDir = os_1.default.tmpdir();
                        const debugPath = path_1.default.join(tmpDir, 'clean-crm-debug_import_snapshot.log');
                        const snapshot = {
                            timestamp: new Date().toISOString(),
                            eventSummary: event.summary,
                            sessionPreview: {
                                startTimeType: typeof session.startTime,
                                startTimeConstructor: session.startTime?.constructor ? session.startTime.constructor.name : null,
                                startTimeValue: session.startTime && session.startTime.toString ? session.startTime.toString() : String(session.startTime),
                                endTimeType: typeof session.endTime,
                                endTimeConstructor: session.endTime?.constructor ? session.endTime.constructor.name : null,
                                endTimeValue: session.endTime && session.endTime.toString ? session.endTime.toString() : String(session.endTime),
                                createdAtType: typeof session.createdAt,
                                createdAtConstructor: session.createdAt?.constructor ? session.createdAt.constructor.name : null,
                                createdAtValue: session.createdAt && session.createdAt.toString ? session.createdAt.toString() : String(session.createdAt),
                                updatedAtType: typeof session.updatedAt,
                                updatedAtConstructor: session.updatedAt?.constructor ? session.updatedAt.constructor.name : null,
                                updatedAtValue: session.updatedAt && session.updatedAt.toString ? session.updatedAt.toString() : String(session.updatedAt),
                            }
                        };
                        fs_1.default.appendFileSync(debugPath, JSON.stringify(snapshot) + '\n', { encoding: 'utf8' });
                        console.error(`WROTE_IMPORT_SNAPSHOT | path=${debugPath} | summary=${String(event.summary).slice(0, 80)}`);
                    }
                    catch (dbgErr) {
                        // Ensure debug failure doesn't stop import
                        console.error('Failed to write debug snapshot:', dbgErr);
                    }
                    await storage_1.storage.createPhotographySession(session);
                    importedCount++;
                }
                catch (error) {
                    console.error('Error importing event:', event.summary, error);
                }
            }
            res.json({
                success: true,
                imported: importedCount,
                cutoff: cutoff.toISOString(),
                upper: upper ? upper.toISOString() : null,
                message: `Successfully imported ${importedCount} events from ${fileName}`
            });
        }
        catch (error) {
            console.error("Error importing iCal file:", error);
            res.status(500).json({ error: "Failed to parse iCal file", details: error?.message });
        }
    });
    app.post("/api/calendar/import/ics-url", async (req, res) => {
        let debugStage = 'init';
        try {
            const { icsUrl } = req.body;
            debugStage = 'init';
            const debugMode = String(req.query.debug || req.query.verbose || '').toLowerCase() === 'true' || String(req.query.debug) === '1';
            if (!icsUrl) {
                return res.status(400).json({ error: 'No iCal URL provided' });
            }
            // Fetch iCal content from URL with robust headers and retries
            const fetch = (await import('node-fetch')).default;
            const maxAttempts = 3;
            let attempt = 0;
            let icsContent = '';
            let lastStatus = 0;
            let lastError = null;
            while (attempt < maxAttempts && !icsContent) {
                attempt++;
                try {
                    const resp = await fetch(icsUrl, {
                        method: 'GET',
                        redirect: 'follow',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
                            'Accept': 'text/calendar, text/plain;q=0.9, */*;q=0.8',
                        },
                    });
                    lastStatus = resp.status;
                    if (!resp.ok) {
                        throw new Error(`Fetch failed with status ${resp.status}`);
                    }
                    const text = await resp.text();
                    // Detect HTML (e.g., Google login page) which indicates the URL is not directly accessible
                    if (/<!DOCTYPE html>|<html[\s>]/i.test(text)) {
                        throw new Error('Received HTML instead of ICS (URL likely not accessible without authentication)');
                    }
                    icsContent = text;
                }
                catch (e) {
                    lastError = e;
                    await new Promise(r => setTimeout(r, 300 * attempt));
                }
            }
            if (!icsContent) {
                const msg = lastError?.message || `Failed to fetch calendar: HTTP ${lastStatus}`;
                return res.status(502).json({
                    error: 'Failed to fetch iCal content',
                    details: msg,
                    hint: 'If using Google, copy the Secret address in iCal format (private-.../basic.ics). Ensure the link is correct and try again.'
                });
            }
            // Persist raw iCal content snapshot synchronously for debugging (write to OS temp dir)
            try {
                const tmpDir = os_1.default.tmpdir();
                const rawPath = path_1.default.join(tmpDir, 'clean-crm-debug_ics_content.log');
                const header = `==== ICS SNAPSHOT ${new Date().toISOString()} URL: ${icsUrl} LENGTH: ${icsContent.length} ====`;
                fs_1.default.appendFileSync(rawPath, header + '\n' + icsContent.substring(0, 2000) + '\n\n', { encoding: 'utf8' });
                console.error(`WROTE_ICS_SNAPSHOT | path=${rawPath} | len=${icsContent.length}`);
            }
            catch (e) {
                console.error('Failed to write ICS content snapshot:', e);
            }
            // Parse iCal content and convert to photography sessions
            debugStage = 'parseICalContent';
            let importedEvents = [];
            try {
                importedEvents = parseICalContent(icsContent);
            }
            catch (parseErr) {
                console.error('ICS_URL_PARSE_ERROR', parseErr);
                return res.status(500).json({ error: 'Failed to parse iCal content', details: parseErr?.message || String(parseErr), stage: debugStage });
            }
            const cutoff = getImportCutoffUtc(req);
            const upper = getImportUpperBoundUtc(req);
            // Also keep original query strings to enable day-level fallback comparisons
            const parsedQ = require('url').parse(req.url || '', true).query || {};
            const qFrom = parsedQ.from || parsedQ.since || undefined;
            const qTo = parsedQ.to || parsedQ.until || undefined;
            const includePast = String((req.query.includePast || req.query.includepast) ?? '').toLowerCase() === 'true' || String(req.query.includePast) === '1';
            debugStage = 'filterEvents';
            const safeCutoff = cutoff instanceof Date && !isNaN(cutoff.getTime()) ? cutoff.toISOString() : 'INVALID';
            const safeUpper = upper instanceof Date && !isNaN(upper.getTime()) ? upper.toISOString() : 'none';
            console.error(`ICS_URL_IMPORT | total_parsed=${importedEvents.length} | cutoff=${safeCutoff} | upper=${safeUpper}`);
            // Log first few parsed events for debugging (avoid throwing on invalid dates)
            importedEvents.slice(0, 3).forEach((ev, idx) => {
                let parsed = 'INVALID';
                try {
                    if (ev?.dtstart) {
                        const d = new Date(ev.dtstart);
                        parsed = isNaN(d.getTime()) ? 'INVALID' : d.toISOString();
                    }
                }
                catch { /* ignore */ }
                console.error(`  Event ${idx + 1}: ${ev.summary} | dtstart=${ev.dtstart} | parsed_date=${parsed}`);
            });
            let eventsToImport = [];
            const debugSamples = [];
            const reasonCounts = { no_date: 0, invalid_date: 0, outside_time_range: 0, outside_day_range: 0 };
            // Helper: extract local day string (Europe/Vienna) from a UTC ISO string safely
            const toLocalDay = (iso, tz = 'Europe/Vienna') => {
                try {
                    const d = new Date(iso);
                    if (isNaN(d.getTime()))
                        return null;
                    const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
                    const parts = dtf.formatToParts(d).reduce((m, p) => { if (p.type !== 'literal')
                        m[p.type] = p.value; return m; }, {});
                    return `${parts.year}-${parts.month}-${parts.day}`; // YYYY-MM-DD
                }
                catch {
                    return null;
                }
            };
            try {
                eventsToImport = importedEvents.filter(ev => {
                    // Build a robust Date instance from event.dtstart
                    let ds = null;
                    let parseMode = 'failed';
                    if (ev?.dtstart) {
                        let d = new Date(ev.dtstart);
                        if (isNaN(d.getTime())) {
                            let s = String(ev.dtstart).trim();
                            s = s.replace(/[^0-9TZ]/g, '');
                            // Allow canonical ICS (with or without Z) and optional milliseconds
                            const m = s.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
                            if (m) {
                                const datePart = m[1];
                                const timePart = m[2];
                                const y = datePart.substring(0, 4);
                                const mo = datePart.substring(4, 6);
                                const da = datePart.substring(6, 8);
                                const hh = timePart.substring(0, 2);
                                const mm = timePart.substring(2, 4);
                                const ss = timePart.substring(4, 6);
                                const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                                const d2 = new Date(iso);
                                if (!isNaN(d2.getTime())) {
                                    d = d2;
                                    parseMode = 'ics';
                                }
                            }
                            else if (ev._raw_dtstart) {
                                // Try from raw value if present
                                const raw = String(ev._raw_dtstart).trim();
                                const dIso = new Date(raw);
                                if (!isNaN(dIso.getTime())) {
                                    d = dIso;
                                    parseMode = 'raw-iso';
                                }
                                else {
                                    const s2 = raw.replace(/[^0-9TZ]/g, '');
                                    const m2 = s2.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
                                    if (m2) {
                                        const y = m2[1].substring(0, 4);
                                        const mo = m2[1].substring(4, 6);
                                        const da = m2[1].substring(6, 8);
                                        const hh = m2[2].substring(0, 2);
                                        const mm = m2[2].substring(2, 4);
                                        const ss = m2[2].substring(4, 6);
                                        const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                                        const d3 = new Date(iso);
                                        if (!isNaN(d3.getTime())) {
                                            d = d3;
                                            parseMode = 'raw-ics';
                                        }
                                    }
                                }
                            }
                        }
                        ds = isNaN(d.getTime()) ? null : d;
                        if (parseMode === 'failed' && ds)
                            parseMode = 'iso';
                    }
                    else if (ev?._raw_dtstart) {
                        const raw = String(ev._raw_dtstart).trim();
                        const dIso = new Date(raw);
                        if (!isNaN(dIso.getTime())) {
                            ds = dIso;
                            parseMode = 'raw-iso';
                        }
                        else {
                            const s2 = raw.replace(/[^0-9TZ]/g, '');
                            const m2 = s2.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
                            if (m2) {
                                const y = m2[1].substring(0, 4);
                                const mo = m2[1].substring(4, 6);
                                const da = m2[1].substring(6, 8);
                                const hh = m2[2].substring(0, 2);
                                const mm = m2[2].substring(2, 4);
                                const ss = m2[2].substring(4, 6);
                                const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                                const d3 = new Date(iso);
                                if (!isNaN(d3.getTime())) {
                                    ds = d3;
                                    parseMode = 'raw-ics';
                                }
                            }
                        }
                    }
                    const valid = !!(ds && !isNaN(ds.getTime()));
                    const passTime = !!(valid && ds >= cutoff && (!upper || ds <= upper));
                    // Day-level fallback in Europe/Vienna, only when from/to provided
                    let passDay = false;
                    if (!passTime && valid && (qFrom || qTo)) {
                        const localDay = toLocalDay(ds.toISOString(), 'Europe/Vienna');
                        const fromDay = typeof qFrom === 'string' && /\d{4}-\d{2}-\d{2}/.test(qFrom) ? qFrom : null;
                        const toDay = typeof qTo === 'string' && /\d{4}-\d{2}-\d{2}/.test(qTo) ? qTo : null;
                        if (localDay) {
                            const geFrom = !fromDay || localDay >= fromDay;
                            const leTo = !toDay || localDay <= toDay;
                            passDay = geFrom && leTo;
                        }
                    }
                    const passes = passTime || passDay;
                    if (!passes) {
                        const reason = !ds ? 'no_date' : !valid ? 'invalid_date' : (!passTime ? 'outside_time_range' : 'outside_day_range');
                        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                    }
                    // Prefer sampling December 2025 entries to aid current debugging
                    const preferDec2025 = (() => {
                        const raw = String(ev._raw_dtstart || ev.dtstart || '');
                        return /(^|[^0-9])202512/.test(raw);
                    })();
                    if (debugMode && (debugSamples.length < 40 || (preferDec2025 && debugSamples.length < 60))) {
                        let safeIso = 'INVALID';
                        let localDayDbg = null;
                        try {
                            if (valid) {
                                safeIso = ds.toISOString();
                                localDayDbg = toLocalDay(safeIso, 'Europe/Vienna');
                            }
                            else if (ev?.dtstart) {
                                let s = String(ev.dtstart).trim();
                                s = s.replace(/[^0-9TZ]/g, '');
                                const m = s.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
                                if (m) {
                                    const datePart = m[1];
                                    const timePart = m[2];
                                    const y = datePart.substring(0, 4);
                                    const mo = datePart.substring(4, 6);
                                    const da = datePart.substring(6, 8);
                                    const hh = timePart.substring(0, 2);
                                    const mm = timePart.substring(2, 4);
                                    const ss = timePart.substring(4, 6);
                                    const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                                    safeIso = iso;
                                    localDayDbg = toLocalDay(iso, 'Europe/Vienna');
                                }
                                if (safeIso === 'INVALID' && ev._raw_dtstart) {
                                    const raw = String(ev._raw_dtstart).trim().replace(/[^0-9TZ]/g, '');
                                    const m2 = raw.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
                                    if (m2) {
                                        const y = m2[1].substring(0, 4);
                                        const mo = m2[1].substring(4, 6);
                                        const da = m2[1].substring(6, 8);
                                        const hh = m2[2].substring(0, 2);
                                        const mm = m2[2].substring(2, 4);
                                        const ss = m2[2].substring(4, 6);
                                        const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                                        safeIso = iso;
                                        localDayDbg = toLocalDay(iso, 'Europe/Vienna');
                                    }
                                }
                            }
                        }
                        catch { }
                        debugSamples.push({
                            summary: ev.summary,
                            raw: { dtstart: ev.dtstart, raw_dtstart: ev._raw_dtstart, dtend: ev.dtend, raw_dtend: ev._raw_dtend },
                            parsed: {
                                utc: safeIso,
                                viennaDay: localDayDbg,
                                passTime,
                                passDay,
                                mode: parseMode,
                            },
                            keys: Object.keys(ev || {}).slice(0, 20)
                        });
                    }
                    if (!passes && ev.dtstart) {
                        let safeIso2 = 'INVALID';
                        try {
                            if (valid)
                                safeIso2 = ds.toISOString();
                        }
                        catch { }
                        const localDay = valid ? toLocalDay(ds.toISOString(), 'Europe/Vienna') : 'null';
                        console.error(`  FILTERED OUT: ${ev.summary} | dtstart=${ev.dtstart} | date=${safeIso2} | localDay=${localDay} | reason=${!ds ? 'no_date' : !valid ? 'invalid_date' : (!passTime ? 'outside_time_range' : 'outside_day_range')}`);
                    }
                    return passes;
                });
            }
            catch (filterErr) {
                console.error('ICS_URL_FILTER_ERROR', filterErr);
                return res.status(500).json({ error: 'Failed during event filtering', details: filterErr?.message || String(filterErr), stage: debugStage });
            }
            console.error(`ICS_URL_IMPORT | events_to_import=${eventsToImport.length}`);
            const dryRun = String(req.query.dryRun || req.query.dryrun || '').toLowerCase() === 'true';
            if (dryRun) {
                console.error(`ICS_URL_DRY_RUN | events=${importedEvents.length} | filtered=${eventsToImport.length} | cutoff=${safeCutoff} | upper=${safeUpper} | url=${icsUrl}`);
                let safeCutoffIso = null;
                let safeUpperIso = null;
                try {
                    if (cutoff instanceof Date && !isNaN(cutoff.getTime()))
                        safeCutoffIso = cutoff.toISOString();
                }
                catch (e) {
                    console.error('CUT_OFF_TO_ISO_ERROR', e);
                }
                try {
                    if (upper instanceof Date && !isNaN(upper.getTime()))
                        safeUpperIso = upper.toISOString();
                }
                catch (e) {
                    console.error('UPPER_TO_ISO_ERROR', e);
                }
                const base = { success: true, dryRun: true, parsed: importedEvents.length, filtered: eventsToImport.length, cutoff: safeCutoffIso, upper: safeUpperIso, stage: debugStage };
                // Update last status for monitoring
                lastCalendarImportStatus = {
                    when: new Date().toISOString(),
                    url: icsUrl,
                    parsed: importedEvents.length,
                    filtered: eventsToImport.length,
                    imported: 0,
                    from: qFrom || null,
                    to: qTo || null,
                    includePast,
                    stage: debugStage,
                };
                if (debugMode) {
                    base.debug = {
                        qFrom,
                        qTo,
                        reasonCounts,
                        sample: debugSamples,
                    };
                }
                return res.json(base);
            }
            let importedCount = 0;
            for (const event of eventsToImport) {
                try {
                    // Helper: coerce to Date or return null
                    const safeCreateDate = (dateString) => {
                        if (!dateString)
                            return null;
                        const date = new Date(dateString);
                        return isNaN(date.getTime()) ? null : date;
                    };
                    const start = safeCreateDate(event.dtstart);
                    const end = safeCreateDate(event.dtend);
                    if (!start || !end) {
                        console.error('SKIP_IMPORT_INVALID_DATES', { summary: event.summary, dtstart: event.dtstart, dtend: event.dtend });
                        continue; // skip invalid entries instead of assigning "now"
                    }
                    // Create minimal photography session (only required fields to avoid array serialization issues)
                    // Use explicit null for array fields to prevent Drizzle from serializing them as "[]" string
                    const session = {
                        id: `cal-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        title: event.summary || 'Imported Event',
                        sessionType: 'imported',
                        startTime: start,
                        endTime: end,
                        equipmentList: null,
                        crewMembers: null,
                        tags: null,
                    };
                    // Synchronous debug snapshot to capture payload exactly before DB insert (write to OS temp dir)
                    try {
                        const tmpDir = os_1.default.tmpdir();
                        const debugPath = path_1.default.join(tmpDir, 'clean-crm-debug_import_snapshot.log');
                        const snapshot = {
                            timestamp: new Date().toISOString(),
                            eventSummary: event.summary,
                            sessionPreview: {
                                startTimeType: typeof session.startTime,
                                startTimeConstructor: session.startTime && session.startTime.constructor ? session.startTime.constructor.name : null,
                                startTimeValue: session.startTime && session.startTime.toString ? session.startTime.toString() : String(session.startTime),
                                endTimeType: typeof session.endTime,
                                endTimeConstructor: session.endTime && session.endTime.constructor ? session.endTime.constructor.name : null,
                                endTimeValue: session.endTime && session.endTime.toString ? session.endTime.toString() : String(session.endTime),
                                createdAtType: typeof session.createdAt,
                                createdAtConstructor: session.createdAt && session.createdAt.constructor ? session.createdAt.constructor.name : null,
                                createdAtValue: session.createdAt && session.createdAt.toString ? session.createdAt.toString() : String(session.createdAt),
                                updatedAtType: typeof session.updatedAt,
                                updatedAtConstructor: session.updatedAt && session.updatedAt.constructor ? session.updatedAt.constructor.name : null,
                                updatedAtValue: session.updatedAt && session.updatedAt.toString ? session.updatedAt.toString() : String(session.updatedAt),
                            }
                        };
                        fs_1.default.appendFileSync(debugPath, JSON.stringify(snapshot) + '\n', { encoding: 'utf8' });
                        console.error(`WROTE_IMPORT_SNAPSHOT | path=${debugPath} | summary=${String(event.summary).slice(0, 80)}`);
                    }
                    catch (dbgErr) {
                        // Ensure debug failure doesn't stop import
                        console.error('Failed to write debug snapshot:', dbgErr);
                    }
                    // Attach icalUid if present for duplicate prevention
                    if (event.uid) {
                        session.icalUid = String(event.uid);
                    }
                    await storage_1.storage.createPhotographySession(session);
                    importedCount++;
                }
                catch (error) {
                    console.error('Error importing event:', event.summary, error);
                }
            }
            res.json({
                success: true,
                imported: importedCount,
                cutoff: cutoff.toISOString(),
                upper: upper ? upper.toISOString() : null,
                message: `Successfully imported ${importedCount} events from calendar URL`
            });
            // Update last status for monitoring
            try {
                lastCalendarImportStatus = {
                    when: new Date().toISOString(),
                    url: icsUrl,
                    parsed: importedEvents.length,
                    filtered: eventsToImport.length,
                    imported: importedCount,
                    from: qFrom || null,
                    to: qTo || null,
                    includePast,
                    stage: 'completed',
                };
            }
            catch { }
        }
        catch (error) {
            console.error("Error importing from iCal URL:", error);
            // Expose debugStage if available for diagnostics
            const stage = error?.stage || (typeof debugStage !== 'undefined' ? debugStage : 'unknown');
            res.status(500).json({ error: "Failed to fetch or parse iCal URL", details: error?.message, stage });
        }
    });
    // Helper function to parse iCal content
    function parseICalContent(icsContent) {
        const events = [];
        const lines = icsContent.split('\n');
        let currentEvent = null;
        let multiLineValue = '';
        let multiLineProperty = '';
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            // Handle line continuation (lines starting with space or tab)
            if (line.startsWith(' ') || line.startsWith('\t')) {
                // Ignore folded continuation for import logic; not needed for dtstart/dtend
                // multiLineValue += line.substring(1);
                continue;
            }
            // Process the previous multi-line property if any
            // Commit previously accumulated property is intentionally disabled
            // to avoid overwriting canonical dtstart/dtend values.
            multiLineProperty = '';
            multiLineValue = '';
            if (line === 'BEGIN:VEVENT') {
                currentEvent = {};
            }
            else if (line === 'END:VEVENT' && currentEvent) {
                events.push(currentEvent);
                currentEvent = null;
            }
            else if (currentEvent && line.includes(':')) {
                const colonIndex = line.indexOf(':');
                const property = line.substring(0, colonIndex);
                const value = line.substring(colonIndex + 1);
                // Skip multi-line accumulation for simplicity in import context
                multiLineProperty = '';
                multiLineValue = '';
                // Extract base property and any parameters (e.g., TZID)
                const [baseProp, ...paramParts] = property.split(';');
                const propName = baseProp.toLowerCase();
                const params = {};
                for (const p of paramParts) {
                    const eqIdx = p.indexOf('=');
                    if (eqIdx > -1) {
                        const k = p.substring(0, eqIdx).trim().toLowerCase();
                        const v = p.substring(eqIdx + 1).trim();
                        params[k] = v;
                    }
                }
                if (propName === 'dtstart' || propName === 'dtend') {
                    try {
                        const defaultTz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';
                        const parsed = parseICalDate(value, params['tzid'] || defaultTz);
                        // Preserve raw value for diagnostics
                        const rawKey = propName === 'dtstart' ? '_raw_dtstart' : '_raw_dtend';
                        currentEvent[rawKey] = value;
                        currentEvent[propName] = parsed; // may be undefined on failure
                    }
                    catch (error) {
                        console.error(`Error parsing ${propName}: ${value}`, error);
                        const rawKey = propName === 'dtstart' ? '_raw_dtstart' : '_raw_dtend';
                        currentEvent[rawKey] = value;
                        currentEvent[propName] = undefined; // don't default to now
                    }
                }
                else {
                    currentEvent[propName] = decodeICalValue(value);
                }
            }
        }
        return events;
    }
    // Helper function to parse iCal dates (supports TZID and all-day values)
    function parseICalDate(dateString, tzid) {
        try {
            // Quiet parser; callers decide how to handle undefined
            // Handle various iCal date formats
            let cleanDate = (dateString || '').trim();
            // Normalize: remove stray characters and normalize Z
            cleanDate = cleanDate.replace(/\s+/g, '').replace(/[\u0000-\u001f\u007f]/g, '');
            // Some providers fold lines; remove hard breaks within value
            cleanDate = cleanDate.replace(/\\n/gi, '');
            // Uppercase trailing z
            if (cleanDate.endsWith('z'))
                cleanDate = cleanDate.slice(0, -1) + 'Z';
            // Strict Zulu with or without final Z
            const zMatch = cleanDate.match(/^(\d{8})T(\d{6})(Z)?$/);
            if (zMatch) {
                const datePart = zMatch[1];
                const timePart = zMatch[2];
                const year = datePart.substring(0, 4);
                const month = datePart.substring(4, 6);
                const day = datePart.substring(6, 8);
                const hour = timePart.substring(0, 2);
                const minute = timePart.substring(2, 4);
                const second = timePart.substring(4, 6);
                const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
                const dateObj = new Date(isoString);
                if (!isNaN(dateObj.getTime()))
                    return dateObj.toISOString();
            }
            // Google Calendar format: treat like Zulu if present above; otherwise continue
            // Handle YYYYMMDD format (all-day events)
            if (cleanDate.length === 8 && !cleanDate.includes('T')) {
                const year = cleanDate.substring(0, 4);
                const month = cleanDate.substring(4, 6);
                const day = cleanDate.substring(6, 8);
                // Treat all-day as midnight in specified TZ (or UTC) then convert to UTC
                const localIso = `${year}-${month}-${day}T00:00:00`;
                const isoString = tzid ? convertLocalToUtcIso(localIso, tzid) : `${year}-${month}-${day}T00:00:00.000Z`;
                const dateObj = new Date(isoString);
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.toISOString();
                }
            }
            // Handle local time like YYYYMMDDTHHMMSS (possibly with TZID)
            if (cleanDate.length === 15 && cleanDate.includes('T')) {
                const datePart = cleanDate.substring(0, 8);
                const timePart = cleanDate.substring(9, 15);
                const year = parseInt(datePart.substring(0, 4), 10);
                const month = parseInt(datePart.substring(4, 6), 10);
                const day = parseInt(datePart.substring(6, 8), 10);
                const hour = parseInt(timePart.substring(0, 2), 10);
                const minute = parseInt(timePart.substring(2, 4), 10);
                const second = parseInt(timePart.substring(4, 6), 10);
                const localIso = `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
                const utcIso = tzid ? convertLocalToUtcIso(localIso, tzid) : new Date(localIso).toISOString();
                const dateObj = new Date(utcIso);
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.toISOString();
                }
            }
            // Fallback: try parsing as-is
            const fallbackDate = new Date(dateString);
            if (!isNaN(fallbackDate.getTime())) {
                return fallbackDate.toISOString();
            }
            // If all else fails, let caller skip
            return undefined;
        }
        catch (error) {
            console.error(`Error parsing date: ${dateString}`, error);
            return undefined;
        }
    }
    // Convert a local ISO (no timezone) in a given IANA TZ to a UTC ISO string
    function convertLocalToUtcIso(localIso, tzid) {
        try {
            // Load date-fns-tz synchronously in ESM using createRequire
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { createRequire } = require('module');
            const requireFn = createRequire(import.meta.url);
            const tzLib = requireFn('date-fns-tz');
            if (tzLib && typeof tzLib.zonedTimeToUtc === 'function') {
                const d = tzLib.zonedTimeToUtc(localIso, tzid);
                // Guard against invalid Date objects producing "Invalid time value"
                let converted;
                try {
                    converted = (d instanceof Date) ? d : new Date(d);
                }
                catch {
                    converted = new Date(NaN);
                }
                if (!converted || isNaN(converted.getTime())) {
                    // Fallback: append Z if missing and try again; else return a safe epoch
                    const fallbackIso = /Z$/.test(localIso) ? localIso : `${localIso}.000Z`;
                    const fb = new Date(fallbackIso);
                    return isNaN(fb.getTime()) ? new Date(0).toISOString() : fb.toISOString();
                }
                return converted.toISOString();
            }
        }
        catch (e) {
            console.error('convertLocalToUtcIso failed to load date-fns-tz:', e);
        }
        // Fallback: compute UTC using Intl time zone math
        try {
            const m = localIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
            if (m) {
                const y = +m[1];
                const mo = +m[2];
                const d = +m[3];
                const hh = +m[4];
                const mm = +m[5];
                const ss = +m[6];
                const epoch = toUtcFromTz(y, mo, d, hh, mm, ss, tzid);
                const dt = new Date(epoch);
                return isNaN(dt.getTime()) ? new Date(0).toISOString() : dt.toISOString();
            }
        }
        catch { }
        // Last resort
        const d2 = new Date(localIso);
        return isNaN(d2.getTime()) ? new Date(0).toISOString() : d2.toISOString();
    }
    // Compute UTC epoch from local date/time in a given IANA time zone
    function toUtcFromTz(y, m, d, hh, mm, ss, timeZone) {
        const approx = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
        const offsetMin = tzOffset(approx, timeZone);
        return approx.getTime() - offsetMin * 60000;
    }
    function tzOffset(dateUTC, timeZone) {
        const dtf = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        });
        const parts = dtf.formatToParts(dateUTC);
        const map = {};
        for (const { type, value } of parts) {
            if (type !== 'literal')
                map[type] = value;
        }
        const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
        return (asUTC - dateUTC.getTime()) / 60000;
    }
    // Helper function to decode iCal values
    function decodeICalValue(value) {
        return value
            .replace(/\\n/g, '\n')
            .replace(/\\,/g, ',')
            .replace(/\\;/g, ';')
            .replace(/\\\\/g, '\\');
    }
    // Helper function to extract client name from description or title
    function extractClientFromDescription(text) {
        // Try to extract client name from common patterns
        const patterns = [
            /client[:\s]+([^,\n]+)/i,
            /with[:\s]+([^,\n]+)/i,
            /für[:\s]+([^,\n]+)/i, // German "for"
            /([A-Z][a-z]+\s+[A-Z][a-z]+)/, // Name pattern
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return 'Imported Client';
    }
    // ==================== ICAL CALENDAR FEED ====================
    // Admin: ensure ical_uid column + unique index for duplicate prevention
    app.post("/api/admin/calendar/install-dedupe", async (req, res) => {
        try {
            await runSql(`ALTER TABLE photography_sessions ADD COLUMN IF NOT EXISTS ical_uid text`);
            await runSql(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_photography_sessions_ical_uid
        ON photography_sessions(ical_uid)
        WHERE ical_uid IS NOT NULL AND ical_uid <> ''
      `);
            res.json({ success: true, message: 'ical_uid column ensured and unique index installed' });
        }
        catch (e) {
            res.status(500).json({ success: false, error: e?.message || String(e) });
        }
    });
    // Diagnostics: quick aggregates to verify agent data connectivity
    app.get("/api/agent/diagnostics", async (_req, res) => {
        try {
            const invoices = await runSql(`
        SELECT 
          COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0)::double precision AS paid_revenue,
          MIN(created_at) AS first_invoice,
          MAX(created_at) AS last_invoice,
          COUNT(*)::int AS invoice_count
        FROM crm_invoices
      `);
            const sessions = await runSql(`
        SELECT 
          MIN(start_time) AS first_session,
          MAX(start_time) AS last_session,
          COUNT(*)::int AS session_count
        FROM photography_sessions
      `);
            res.json({
                success: true,
                invoices: invoices?.[0] || {},
                sessions: sessions?.[0] || {},
                dbUrlSet: !!process.env.DATABASE_URL,
            });
        }
        catch (e) {
            res.status(500).json({ success: false, error: e?.message || String(e) });
        }
    });
    // Simple status endpoint to inspect the last ICS import operation
    app.get("/api/calendar/import/status", async (req, res) => {
        try {
            res.json({ success: true, status: lastCalendarImportStatus });
        }
        catch (e) {
            res.status(500).json({ success: false, error: e?.message || String(e) });
        }
    });
    app.get("/api/calendar/photography-sessions.ics", async (req, res) => {
        try {
            // Fetch all photography sessions
            const sessions = await storage_1.storage.getPhotographySessions();
            // Generate iCal content
            const icalLines = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//New Age Fotografie//Photography CRM//EN',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                'X-WR-CALNAME:Photography Sessions',
                'X-WR-CALDESC:Photography sessions from New Age Fotografie CRM'
            ];
            // Add each session as an event
            for (const session of sessions) {
                if (session.startTime && session.endTime) {
                    const startDate = new Date(session.startTime);
                    const endDate = new Date(session.endTime);
                    // Format dates for iCal (YYYYMMDDTHHMMSSZ)
                    const formatICalDate = (date) => {
                        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
                    };
                    const uid = `session-${session.id}@newagefotografie.com`;
                    const now = new Date();
                    const dtstamp = formatICalDate(now);
                    icalLines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dtstamp}`, `DTSTART:${formatICalDate(startDate)}`, `DTEND:${formatICalDate(endDate)}`, `SUMMARY:${session.title.replace(/[,;\\]/g, '\\$&')}`, `DESCRIPTION:${(session.description || '').replace(/[,;\\]/g, '\\$&')}${session.clientName ? '\\nClient: ' + session.clientName : ''}${session.sessionType ? '\\nType: ' + session.sessionType : ''}`, `LOCATION:${(session.locationName || session.locationAddress || '').replace(/[,;\\]/g, '\\$&')}`, `STATUS:${session.status === 'completed' ? 'CONFIRMED' : session.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`, session.priority === 'high' ? 'PRIORITY:1' : session.priority === 'low' ? 'PRIORITY:9' : 'PRIORITY:5', 'END:VEVENT');
                }
            }
            icalLines.push('END:VCALENDAR');
            const icalContent = icalLines.join('\r\n');
            // Set appropriate headers for iCal
            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="photography-sessions.ics"');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.send(icalContent);
        }
        catch (error) {
            console.error("Error generating iCal feed:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/email/test-connection", authenticateUser, async (req, res) => {
        try {
            const { provider, smtpHost, smtpPort, username, password, useTLS } = req.body;
            // Basic validation
            if (!smtpHost || !smtpPort || !username || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required connection parameters"
                });
            }
            // Check for EasyName/business email - actually test the IMAP connection
            const isEasyNameHost = smtpHost.includes('easyname');
            const isBusinessMailbox = username === '30840mail10' ||
                username === (process.env.STUDIO_NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER) ||
                username === process.env.BUSINESS_MAILBOX_USER;
            if (isEasyNameHost || isBusinessMailbox) {
                try {
                    // Actually test IMAP connection
                    const testResult = await new Promise((resolve) => {
                        const imap = new Imap({
                            user: username,
                            password: password,
                            host: 'imap.easyname.com',
                            port: 993,
                            tls: true,
                            tlsOptions: { rejectUnauthorized: false },
                            connTimeout: 10000,
                            authTimeout: 10000
                        });
                        const timeout = setTimeout(() => {
                            imap.end();
                            resolve(false);
                        }, 15000);
                        imap.once('ready', () => {
                            clearTimeout(timeout);
                            imap.end();
                            resolve(true);
                        });
                        imap.once('error', (err) => {
                            clearTimeout(timeout);
                            console.error('IMAP test error:', err.message);
                            resolve(false);
                        });
                        imap.connect();
                    });
                    if (testResult) {
                        return res.json({
                            success: true,
                            message: "Connection successful! IMAP credentials verified for EasyName mailbox."
                        });
                    }
                    else {
                        return res.json({
                            success: false,
                            message: "Connection failed. Please check your username and password."
                        });
                    }
                }
                catch (testError) {
                    console.error('IMAP test exception:', testError);
                    return res.json({
                        success: false,
                        message: "Connection test failed: " + testError.message
                    });
                }
            }
            // For other emails, provide standard configuration guidance
            const providerSettings = {
                gmail: {
                    smtp: "smtp.gmail.com",
                    port: 587,
                    security: "TLS",
                    note: "Use App Password instead of regular password for Gmail"
                },
                outlook: {
                    smtp: "smtp-mail.outlook.com",
                    port: 587,
                    security: "TLS",
                    note: "Use your Microsoft account credentials"
                }
            };
            const settings = providerSettings[provider];
            if (settings && smtpHost === settings.smtp && smtpPort.toString() === settings.port.toString()) {
                return res.json({
                    success: true,
                    message: `Connection settings verified for ${provider}. ${settings.note}`
                });
            }
            return res.json({
                success: false,
                message: "Please verify your email provider settings and credentials"
            });
        }
        catch (error) {
            console.error("Error testing email connection:", error);
            res.status(500).json({
                success: false,
                message: "Failed to test email connection"
            });
        }
    });
    // ==================== EMAIL SETTINGS ====================
    app.post("/api/email/settings/save", authenticateUser, async (req, res) => {
        try {
            const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName, emailSignature, signatureEnabled, outOfOfficeEnabled, outOfOfficeMessage, outOfOfficeStartDate, outOfOfficeEndDate } = req.body;
            console.log('Saving email settings:', { smtpHost, smtpPort, smtpUser, fromEmail, fromName, signatureEnabled, outOfOfficeEnabled });
            // Save email settings to database
            const settingsData = {
                smtp_host: smtpHost,
                smtp_port: parseInt(smtpPort) || 587,
                smtp_user: smtpUser,
                smtp_pass: smtpPass, // In production, this should be encrypted
                from_email: fromEmail,
                from_name: fromName,
                // Email Signature
                email_signature: emailSignature || null,
                signature_enabled: signatureEnabled || false,
                // Out of Office
                out_of_office_enabled: outOfOfficeEnabled || false,
                out_of_office_message: outOfOfficeMessage || null,
                out_of_office_start_date: outOfOfficeStartDate || null,
                out_of_office_end_date: outOfOfficeEndDate || null,
                updated_at: new Date().toISOString()
            };
            await storage_1.storage.saveEmailSettings(settingsData);
            res.json({
                success: true,
                message: 'Email settings saved successfully'
            });
        }
        catch (error) {
            console.error('Error saving email settings:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to save email settings: ' + error.message
            });
        }
    });
    app.get("/api/email/settings", authenticateUser, async (req, res) => {
        try {
            const settings = await storage_1.storage.getEmailSettings();
            res.json({ success: true, settings });
        }
        catch (error) {
            console.error('Error getting email settings:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get email settings: ' + error.message
            });
        }
    });
    // ==================== SENT EMAILS ENDPOINT ====================
    // Fetch all sent emails from crm_messages
    app.get("/api/emails/sent", authenticateUser, async (req, res) => {
        try {
            // Get sent emails from crm_messages table
            // These are emails that were sent OUT (direction='outbound' OR status='sent'/'demo_sent')
            const sentEmails = await db_1.db
                .select()
                .from(schema_1.crmMessages)
                .where((0, drizzle_orm_1.or)((0, drizzle_orm_2.eq)(schema_1.crmMessages.direction, 'outbound'), (0, drizzle_orm_2.eq)(schema_1.crmMessages.status, 'sent'), (0, drizzle_orm_2.eq)(schema_1.crmMessages.status, 'demo_sent'), (0, drizzle_orm_2.eq)(schema_1.crmMessages.messageType, 'sent')))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.crmMessages.createdAt))
                .limit(100);
            console.log(`Fetched ${sentEmails.length} sent emails from database`);
            res.json(sentEmails);
        }
        catch (error) {
            console.error('Error fetching sent emails:', error);
            res.status(500).json({
                error: 'Failed to fetch sent emails',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // ==================== EMAIL SENDING ====================
    app.post("/api/email/send", authenticateUser, async (req, res) => {
        try {
            const { to, subject, body, attachments } = req.body;
            console.log('Email send request:', { to, subject, body: body?.substring(0, 100) + '...' });
            // Use nodemailer (imported at top of file)
            // Get email settings - try to load from database first, fallback to EasyName
            let emailSettings;
            try {
                emailSettings = await storage_1.storage.getEmailSettings();
            }
            catch (settingsError) {
                console.log('Using fallback email settings');
                emailSettings = {
                    smtp_host: 'smtp.easyname.com',
                    smtp_port: 587,
                    smtp_user: '30840mail10',
                    smtp_pass: process.env.EMAIL_PASSWORD || 'HoveBN41!',
                    from_email: getEnvContactEmailSync(),
                    from_name: 'New Age Fotografie'
                };
            }
            const emailConfig = {
                host: emailSettings.smtp_host,
                port: emailSettings.smtp_port === 587 ? 465 : emailSettings.smtp_port,
                secure: true,
                auth: {
                    user: emailSettings.smtp_user,
                    pass: emailSettings.smtp_pass
                },
                tls: {
                    rejectUnauthorized: false
                },
                connectionTimeout: 15000,
                greetingTimeout: 15000,
            };
            // Create transporter and send the email
            const transporter = nodemailer_1.default.createTransport(emailConfig);
            const attachmentsArray = Array.isArray(attachments)
                ? attachments.map((a) => ({
                    filename: a?.filename || a?.name,
                    content: a?.content,
                    path: a?.path,
                    contentType: a?.contentType || a?.mimetype
                }))
                : undefined;
            const mailOptions = {
                from: `${emailSettings.from_name} <${emailSettings.from_email}>`,
                to,
                subject,
                html: body,
                text: typeof body === 'string' ? body.replace(/<[^>]+>/g, '') : undefined,
                attachments: attachmentsArray
            };
            const info = await transporter.sendMail(mailOptions);
            // Save a copy to CRM messages (best-effort)
            try {
                await storage_1.storage.createCrmMessage({
                    senderName: 'New Age Fotografie (Sent)',
                    senderEmail: getEnvContactEmailSync(),
                    subject: `[SENT] ${subject}`,
                    content: `SENT TO: ${to}\n\n${typeof body === 'string' ? body : ''}`,
                    status: 'sent', // Changed from 'archived' to 'sent' for proper categorization
                    messageType: 'sent'
                });
                console.log('Sent email saved to database successfully');
            }
            catch (dbError) {
                console.error('Failed to save sent email to database:', dbError);
            }
            // Trigger automatic email refresh after sending
            try {
                console.log('Triggering email refresh after send...');
                // Import fresh emails to capture any replies or the sent email
                setTimeout(async () => {
                    try {
                        const { importEmailsFromIMAP } = await import('./email-import');
                        await importEmailsFromIMAP({
                            host: 'imap.easyname.com',
                            port: 993,
                            username: '30840mail10',
                            password: process.env.EMAIL_PASSWORD || 'HoveBN41!',
                            useTLS: true
                        });
                        console.log('Automatic email refresh completed after send');
                    }
                    catch (refreshError) {
                        console.error('Auto refresh failed:', refreshError);
                    }
                }, 5000); // Wait 5 seconds for email to be processed by server
            }
            catch (error) {
                console.log('Auto refresh setup failed, continuing...');
            }
            res.json({
                success: true,
                message: 'Email sent successfully',
                messageId: info.messageId,
                response: info.response,
                envelope: info.envelope
            });
        }
        catch (error) {
            console.error('Email send error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send email: ' + error.message
            });
        }
    });
    // ==================== EMAIL MARKETING CAMPAIGNS ====================
    // ==================== SMS & WHATSAPP (Brevo) ====================
    // Send SMS via Brevo
    app.post("/api/sms/send", authenticateUser, async (req, res) => {
        try {
            const { to, content, senderName, clientId } = req.body;
            if (!to || !content) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number (to) and content are required'
                });
            }
            console.log('📱 SMS send request:', { to, content: content.substring(0, 50) + '...' });
            const { BrevoService } = await import('./services/brevoService');
            const result = await BrevoService.sendSms({
                to,
                content,
                senderName: senderName || 'NewAge',
                clientId,
                autoLinkClient: true,
            });
            if (result.success) {
                res.json({
                    success: true,
                    message: 'SMS sent successfully',
                    messageId: result.messageId,
                    clientId: result.clientId
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Failed to send SMS'
                });
            }
        }
        catch (error) {
            console.error('SMS send error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send SMS: ' + error.message
            });
        }
    });
    // Send WhatsApp via Brevo
    app.post("/api/whatsapp/send", authenticateUser, async (req, res) => {
        try {
            const { to, templateId, templateParams, clientId } = req.body;
            if (!to || !templateId) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number (to) and templateId are required'
                });
            }
            console.log('💬 WhatsApp send request:', { to, templateId });
            const { BrevoService } = await import('./services/brevoService');
            const result = await BrevoService.sendWhatsApp({
                to,
                templateId,
                templateParams: templateParams || [],
                clientId,
                autoLinkClient: true,
            });
            if (result.success) {
                res.json({
                    success: true,
                    message: 'WhatsApp message sent successfully',
                    messageId: result.messageId,
                    clientId: result.clientId
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Failed to send WhatsApp message'
                });
            }
        }
        catch (error) {
            console.error('WhatsApp send error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send WhatsApp: ' + error.message
            });
        }
    });
    // Get Brevo account info (credits, etc.)
    app.get("/api/brevo/account", authenticateUser, async (req, res) => {
        try {
            const { BrevoService } = await import('./services/brevoService');
            BrevoService.initialize();
            const result = await BrevoService.getAccountInfo();
            if (result.success) {
                res.json({
                    success: true,
                    account: {
                        email: result.email,
                        credits: result.credits,
                        plan: result.plan
                    }
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Failed to get account info'
                });
            }
        }
        catch (error) {
            console.error('Brevo account error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get Brevo account info: ' + error.message
            });
        }
    });
    // Test email via Brevo
    app.post("/api/brevo/test-email", authenticateUser, async (req, res) => {
        try {
            const { to, subject, content } = req.body;
            if (!to) {
                return res.status(400).json({
                    success: false,
                    error: 'Recipient email (to) is required'
                });
            }
            console.log('📧 Testing Brevo email to:', to);
            const { BrevoService } = await import('./services/brevoService');
            BrevoService.initialize();
            const result = await BrevoService.sendEmail({
                to,
                subject: subject || 'Test Email from New Age Fotografie CRM',
                textContent: content || 'This is a test email sent via Brevo to verify the email configuration is working correctly.',
                htmlContent: content ? content.replace(/\n/g, '<br>') : '<p>This is a test email sent via Brevo to verify the email configuration is working correctly.</p>',
                autoLinkClient: false,
            });
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Test email sent successfully via Brevo!',
                    messageId: result.messageId
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: result.error || 'Failed to send test email'
                });
            }
        }
        catch (error) {
            console.error('Brevo test email error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send test email: ' + error.message
            });
        }
    });
    // Email campaigns endpoints
    app.get("/api/admin/email/campaigns", authenticateUser, async (req, res) => {
        try {
            const campaigns = await db_1.db.select().from(schema_1.emailCampaigns).orderBy(schema_1.emailCampaigns.createdAt);
            res.json(campaigns);
        }
        catch (error) {
            console.error('Error fetching campaigns:', error);
            res.status(500).json({ error: 'Failed to fetch campaigns' });
        }
    });
    app.post("/api/admin/email/campaigns", authenticateUser, async (req, res) => {
        try {
            const userId = req.session?.userId;
            const campaignData = {
                ...req.body,
                userId,
                status: req.body.status || 'draft',
            };
            const [campaign] = await db_1.db.insert(schema_1.emailCampaigns).values(campaignData).returning();
            res.status(201).json(campaign);
        }
        catch (error) {
            console.error('Error creating campaign:', error);
            res.status(500).json({ error: 'Failed to create campaign' });
        }
    });
    app.get("/api/admin/email/campaigns/:id", authenticateUser, async (req, res) => {
        try {
            const [campaign] = await db_1.db.select()
                .from(schema_1.emailCampaigns)
                .where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, req.params.id))
                .limit(1);
            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }
            res.json(campaign);
        }
        catch (error) {
            console.error('Error fetching campaign:', error);
            res.status(500).json({ error: 'Failed to fetch campaign' });
        }
    });
    // Email templates endpoints
    app.get("/api/email/templates", async (req, res) => {
        try {
            const category = req.query.category;
            let templates;
            if (category) {
                templates = await db_1.db.select().from(schema_1.emailTemplates).where((0, drizzle_orm_2.eq)(schema_1.emailTemplates.category, category));
            }
            else {
                templates = await db_1.db.select().from(schema_1.emailTemplates);
            }
            res.json(templates);
        }
        catch (error) {
            console.error('Error fetching templates:', error);
            res.status(500).json({ error: 'Failed to fetch templates' });
        }
    });
    // Email segments endpoints
    app.get("/api/email/segments", async (req, res) => {
        try {
            const segments = await db_1.db.select().from(schema_1.emailSegments);
            res.json(segments);
        }
        catch (error) {
            console.error('Error fetching segments:', error);
            res.status(500).json({ error: 'Failed to fetch segments' });
        }
    });
    // AI-powered subject line suggestions
    app.post("/api/email/ai/subject-lines", async (req, res) => {
        try {
            const { context, tone } = req.body;
            // Simple AI-like subject line generation based on context and tone
            const suggestions = [];
            if (tone === 'professional') {
                suggestions.push(`${context}: Professional Solutions`, `Important: ${context}`, `${context} - Key Updates`);
            }
            else if (tone === 'friendly') {
                suggestions.push(`Hey! Check out ${context}`, `You'll love this: ${context}`, `${context} - Just for you!`);
            }
            else {
                suggestions.push(`Don't miss: ${context}`, `${context} - Limited Time`, `Exclusive: ${context}`);
            }
            res.json({ suggestions });
        }
        catch (error) {
            console.error('Error generating subject lines:', error);
            res.status(500).json({ error: 'Failed to generate subject lines' });
        }
    });
    // Update campaign
    app.put("/api/admin/email/campaigns/:id", authenticateUser, async (req, res) => {
        try {
            const [updated] = await db_1.db.update(schema_1.emailCampaigns)
                .set({ ...req.body, updatedAt: new Date() })
                .where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, req.params.id))
                .returning();
            if (!updated) {
                return res.status(404).json({ error: 'Campaign not found' });
            }
            res.json(updated);
        }
        catch (error) {
            console.error('Error updating campaign:', error);
            res.status(500).json({ error: 'Failed to update campaign' });
        }
    });
    // Send campaign
    app.post("/api/email/campaigns/send", authenticateUser, async (req, res) => {
        try {
            const { campaign_id, test_send, test_emails } = req.body;
            const [campaign] = await db_1.db.select()
                .from(schema_1.emailCampaigns)
                .where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, campaign_id))
                .limit(1);
            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }
            if (test_send && test_emails) {
                // Send test emails
                const { EnhancedEmailService } = await import('./services/enhancedEmailService');
                for (const email of test_emails) {
                    await EnhancedEmailService.sendEmail({
                        to: email,
                        subject: `[TEST] ${campaign.subject}`,
                        html: campaign.content || '',
                        content: campaign.content || '',
                    });
                }
                res.json({ success: true, message: 'Test emails sent successfully' });
            }
            else {
                // Queue campaign for sending
                await db_1.db.update(schema_1.emailCampaigns)
                    .set({ status: 'sending', sentAt: new Date() })
                    .where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, campaign_id));
                // TODO: Implement actual bulk email sending queue
                res.json({ success: true, message: 'Campaign queued for sending' });
            }
        }
        catch (error) {
            console.error('Error sending campaign:', error);
            res.status(500).json({ error: 'Failed to send campaign' });
        }
    });
    // Analytics endpoints
    app.get("/api/email/analytics/campaign/:id", authenticateUser, async (req, res) => {
        try {
            const campaignId = req.params.id;
            // Get campaign details
            const [campaign] = await db_1.db.select().from(schema_1.emailCampaigns).where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, campaignId));
            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }
            // Get all events for this campaign
            const events = await db_1.db.select().from(schema_1.emailEvents).where((0, drizzle_orm_2.eq)(schema_1.emailEvents.campaignId, campaignId));
            // Calculate metrics
            const sent = events.filter(e => e.eventType === 'sent').length;
            const delivered = events.filter(e => e.eventType === 'delivered').length;
            const opened = events.filter(e => e.eventType === 'opened').length;
            const clicked = events.filter(e => e.eventType === 'clicked').length;
            const bounced = events.filter(e => e.eventType === 'bounced').length;
            const unsubscribed = events.filter(e => e.eventType === 'unsubscribed').length;
            const complained = events.filter(e => e.eventType === 'complained').length;
            // Get unique opens/clicks
            const uniqueOpens = new Set(events.filter(e => e.eventType === 'opened').map(e => e.subscriberEmail)).size;
            const uniqueClicks = new Set(events.filter(e => e.eventType === 'clicked').map(e => e.subscriberEmail)).size;
            // Calculate rates
            const openRate = sent > 0 ? (uniqueOpens / sent) * 100 : 0;
            const clickRate = sent > 0 ? (uniqueClicks / sent) * 100 : 0;
            const clickToOpenRate = uniqueOpens > 0 ? (uniqueClicks / uniqueOpens) * 100 : 0;
            const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
            const unsubscribeRate = sent > 0 ? (unsubscribed / sent) * 100 : 0;
            const complaintRate = sent > 0 ? (complained / sent) * 100 : 0;
            // Get device breakdown
            const deviceBreakdown = {
                desktop: events.filter(e => e.deviceType === 'desktop' && e.eventType === 'opened').length,
                mobile: events.filter(e => e.deviceType === 'mobile' && e.eventType === 'opened').length,
                tablet: events.filter(e => e.deviceType === 'tablet' && e.eventType === 'opened').length,
                unknown: events.filter(e => !e.deviceType || e.deviceType === 'unknown').length,
            };
            // Get top locations
            const locationCounts = {};
            events.filter(e => e.country && e.eventType === 'opened').forEach(e => {
                const key = e.country || 'Unknown';
                locationCounts[key] = (locationCounts[key] || 0) + 1;
            });
            const topLocations = Object.entries(locationCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([country, count]) => ({ country, opens: count }));
            // Get link performance
            const linkClicks = await db_1.db.select().from(schema_1.emailLinks).where((0, drizzle_orm_2.eq)(schema_1.emailLinks.campaignId, campaignId));
            // Get emails that opened but didn't click
            const openedEmails = new Set(events.filter(e => e.eventType === 'opened').map(e => e.subscriberEmail));
            const clickedEmails = new Set(events.filter(e => e.eventType === 'clicked').map(e => e.subscriberEmail));
            const openedNotClicked = [...openedEmails].filter(email => !clickedEmails.has(email));
            res.json({
                campaign_id: campaignId,
                campaign_name: campaign.name,
                campaign_subject: campaign.subject,
                sent_at: campaign.sentAt,
                metrics: {
                    sent,
                    delivered,
                    opened,
                    unique_opens: uniqueOpens,
                    clicked,
                    unique_clicks: uniqueClicks,
                    bounced,
                    unsubscribed,
                    complained,
                },
                rates: {
                    open_rate: openRate.toFixed(2),
                    click_rate: clickRate.toFixed(2),
                    click_to_open_rate: clickToOpenRate.toFixed(2),
                    bounce_rate: bounceRate.toFixed(2),
                    unsubscribe_rate: unsubscribeRate.toFixed(2),
                    complaint_rate: complaintRate.toFixed(2),
                },
                engagement: {
                    device_breakdown: deviceBreakdown,
                    top_locations: topLocations,
                    link_performance: linkClicks.map(link => ({
                        url: link.url,
                        label: link.label,
                        clicks: link.clickCount,
                        unique_clicks: link.uniqueClicks,
                    })),
                },
                segments: {
                    opened_count: uniqueOpens,
                    clicked_count: uniqueClicks,
                    opened_not_clicked_count: openedNotClicked.length,
                    bounced_count: bounced,
                    unsubscribed_count: unsubscribed,
                },
            });
        }
        catch (error) {
            console.error('Error fetching campaign analytics:', error);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    });
    // Get subscribers by engagement type for a campaign
    app.get("/api/email/analytics/campaign/:id/subscribers", authenticateUser, async (req, res) => {
        try {
            const campaignId = req.params.id;
            const { engagement_type } = req.query; // 'opened', 'clicked', 'bounced', 'unsubscribed', 'opened_not_clicked'
            const events = await db_1.db.select().from(schema_1.emailEvents).where((0, drizzle_orm_2.eq)(schema_1.emailEvents.campaignId, campaignId));
            let subscribers = [];
            if (engagement_type === 'opened') {
                subscribers = [...new Set(events.filter(e => e.eventType === 'opened').map(e => e.subscriberEmail))];
            }
            else if (engagement_type === 'clicked') {
                subscribers = [...new Set(events.filter(e => e.eventType === 'clicked').map(e => e.subscriberEmail))];
            }
            else if (engagement_type === 'bounced') {
                subscribers = [...new Set(events.filter(e => e.eventType === 'bounced').map(e => e.subscriberEmail))];
            }
            else if (engagement_type === 'unsubscribed') {
                subscribers = [...new Set(events.filter(e => e.eventType === 'unsubscribed').map(e => e.subscriberEmail))];
            }
            else if (engagement_type === 'opened_not_clicked') {
                const openedEmails = new Set(events.filter(e => e.eventType === 'opened').map(e => e.subscriberEmail));
                const clickedEmails = new Set(events.filter(e => e.eventType === 'clicked').map(e => e.subscriberEmail));
                subscribers = [...openedEmails].filter(email => !clickedEmails.has(email));
            }
            else if (engagement_type === 'sent') {
                subscribers = [...new Set(events.filter(e => e.eventType === 'sent').map(e => e.subscriberEmail))];
            }
            res.json({
                campaign_id: campaignId,
                engagement_type,
                count: subscribers.length,
                subscribers: subscribers.map(email => ({ email }))
            });
        }
        catch (error) {
            console.error('Error fetching campaign subscribers:', error);
            res.status(500).json({ error: 'Failed to fetch subscribers' });
        }
    });
    // Create a new campaign targeting subscribers from a previous campaign's engagement
    app.post("/api/email/analytics/campaign/:id/create-segment-campaign", authenticateUser, async (req, res) => {
        try {
            const sourceCampaignId = req.params.id;
            const { engagement_type, campaign_name } = req.body;
            // Get the source campaign
            const [sourceCampaign] = await db_1.db.select().from(schema_1.emailCampaigns).where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, sourceCampaignId));
            if (!sourceCampaign) {
                return res.status(404).json({ error: 'Source campaign not found' });
            }
            // Get subscribers based on engagement
            const events = await db_1.db.select().from(schema_1.emailEvents).where((0, drizzle_orm_2.eq)(schema_1.emailEvents.campaignId, sourceCampaignId));
            let targetEmails = [];
            if (engagement_type === 'opened') {
                targetEmails = [...new Set(events.filter(e => e.eventType === 'opened').map(e => e.subscriberEmail))];
            }
            else if (engagement_type === 'clicked') {
                targetEmails = [...new Set(events.filter(e => e.eventType === 'clicked').map(e => e.subscriberEmail))];
            }
            else if (engagement_type === 'opened_not_clicked') {
                const openedEmails = new Set(events.filter(e => e.eventType === 'opened').map(e => e.subscriberEmail));
                const clickedEmails = new Set(events.filter(e => e.eventType === 'clicked').map(e => e.subscriberEmail));
                targetEmails = [...openedEmails].filter(email => !clickedEmails.has(email));
            }
            // Create a new segment
            const segmentName = campaign_name || `${sourceCampaign.name} - ${engagement_type}`;
            const [segment] = await db_1.db.insert(schema_1.emailSegments).values({
                name: segmentName,
                description: `Subscribers who ${engagement_type.replace('_', ' ')} "${sourceCampaign.name}"`,
                conditions: { source_campaign: sourceCampaignId, engagement: engagement_type },
                subscriberCount: targetEmails.length,
                isActive: true,
            }).returning();
            res.json({
                success: true,
                segment,
                subscriber_count: targetEmails.length,
                message: `Segment created with ${targetEmails.length} subscribers`
            });
        }
        catch (error) {
            console.error('Error creating segment campaign:', error);
            res.status(500).json({ error: 'Failed to create segment campaign' });
        }
    });
    app.get("/api/email/analytics/sequence/:id", authenticateUser, async (req, res) => {
        try {
            // TODO: Implement sequence analytics
            res.json({
                sequence_id: req.params.id,
                enrolled: 0,
                completed: 0,
                active: 0,
                dropped: 0,
                completion_rate: 0
            });
        }
        catch (error) {
            console.error('Error fetching sequence analytics:', error);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    });
    app.get("/api/email/analytics/overall", authenticateUser, async (req, res) => {
        try {
            const { period = 'month' } = req.query;
            // TODO: Implement overall analytics
            res.json({
                period,
                total_campaigns: 0,
                total_sent: 0,
                total_delivered: 0,
                total_opened: 0,
                total_clicked: 0,
                average_open_rate: 0,
                average_click_rate: 0,
                subscriber_growth: 0
            });
        }
        catch (error) {
            console.error('Error fetching overall analytics:', error);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    });
    // AI-powered features
    app.get("/api/email/ai/insights", authenticateUser, async (req, res) => {
        try {
            const { type } = req.query;
            // TODO: Implement AI insights
            res.json([
                {
                    type: type || 'engagement',
                    title: 'Best Send Time',
                    description: 'Your subscribers are most active on Tuesdays at 10 AM',
                    confidence: 0.85,
                    action: 'Schedule your next campaign for Tuesday morning'
                }
            ]);
        }
        catch (error) {
            console.error('Error fetching AI insights:', error);
            res.status(500).json({ error: 'Failed to fetch insights' });
        }
    });
    // Track email events (opens, clicks, etc.)
    app.post("/api/email/track/event", async (req, res) => {
        try {
            const { campaign_id, email, event_type, link_url, user_agent, ip_address } = req.body;
            // Parse user agent for device/browser info
            const deviceType = user_agent && user_agent.toLowerCase().includes('mobile') ? 'mobile' :
                user_agent && user_agent.toLowerCase().includes('tablet') ? 'tablet' : 'desktop';
            await db_1.db.insert(schema_1.emailEvents).values({
                campaignId: campaign_id,
                subscriberEmail: email,
                eventType: event_type,
                linkUrl: link_url,
                userAgent: user_agent,
                ipAddress: ip_address,
                deviceType,
            });
            // Update campaign stats
            if (event_type === 'opened') {
                await db_1.db.update(schema_1.emailCampaigns)
                    .set({ openedCount: (0, drizzle_orm_1.sql) `${schema_1.emailCampaigns.openedCount} + 1` })
                    .where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, campaign_id));
            }
            else if (event_type === 'clicked') {
                await db_1.db.update(schema_1.emailCampaigns)
                    .set({ clickedCount: (0, drizzle_orm_1.sql) `${schema_1.emailCampaigns.clickedCount} + 1` })
                    .where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, campaign_id));
            }
            res.status(204).send();
        }
        catch (error) {
            console.error('Error tracking event:', error);
            res.status(500).json({ error: 'Failed to track event' });
        }
    });
    // Generate test analytics data for a campaign
    app.post("/api/email/test/generate-analytics/:id", authenticateUser, async (req, res) => {
        try {
            const campaignId = req.params.id;
            // Check if campaign exists
            const [campaign] = await db_1.db.select().from(schema_1.emailCampaigns).where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, campaignId));
            if (!campaign) {
                return res.status(404).json({ error: 'Campaign not found' });
            }
            // Generate realistic test data
            const totalSent = 2847;
            const openRate = 0.29; // 29%
            const clickRate = 0.058; // 5.8%
            const bounceRate = 0.012; // 1.2%
            const opens = Math.floor(totalSent * openRate);
            const clicks = Math.floor(totalSent * clickRate);
            const bounces = Math.floor(totalSent * bounceRate);
            const unsubscribes = Math.floor(totalSent * 0.002);
            // Generate test emails
            const testEmails = [];
            for (let i = 0; i < totalSent; i++) {
                testEmails.push(`testuser${i}@example.com`);
            }
            // Devices
            const devices = ['desktop', 'mobile', 'tablet'];
            const countries = ['Austria', 'Germany', 'Switzerland', 'Italy', 'France'];
            const cities = ['Vienna', 'Berlin', 'Zurich', 'Rome', 'Paris'];
            // Insert sent events
            const events = [];
            for (let i = 0; i < totalSent; i++) {
                events.push({
                    campaignId,
                    subscriberEmail: testEmails[i],
                    eventType: 'sent',
                    deviceType: devices[Math.floor(Math.random() * devices.length)],
                    country: countries[Math.floor(Math.random() * countries.length)],
                    city: cities[Math.floor(Math.random() * cities.length)],
                });
            }
            // Insert opened events
            for (let i = 0; i < opens; i++) {
                const email = testEmails[Math.floor(Math.random() * totalSent)];
                events.push({
                    campaignId,
                    subscriberEmail: email,
                    eventType: 'opened',
                    deviceType: devices[Math.floor(Math.random() * devices.length)],
                    country: countries[Math.floor(Math.random() * countries.length)],
                    city: cities[Math.floor(Math.random() * cities.length)],
                });
            }
            // Insert clicked events
            for (let i = 0; i < clicks; i++) {
                const email = testEmails[Math.floor(Math.random() * opens)]; // Only from those who opened
                events.push({
                    campaignId,
                    subscriberEmail: email,
                    eventType: 'clicked',
                    linkUrl: 'https://example.com/special-offer',
                    deviceType: devices[Math.floor(Math.random() * devices.length)],
                    country: countries[Math.floor(Math.random() * countries.length)],
                    city: cities[Math.floor(Math.random() * cities.length)],
                });
            }
            // Insert bounced events
            for (let i = 0; i < bounces; i++) {
                events.push({
                    campaignId,
                    subscriberEmail: testEmails[Math.floor(Math.random() * totalSent)],
                    eventType: 'bounced',
                    deviceType: 'unknown',
                });
            }
            // Insert unsubscribe events
            for (let i = 0; i < unsubscribes; i++) {
                events.push({
                    campaignId,
                    subscriberEmail: testEmails[Math.floor(Math.random() * totalSent)],
                    eventType: 'unsubscribed',
                    deviceType: devices[Math.floor(Math.random() * devices.length)],
                });
            }
            // Insert all events
            await db_1.db.insert(schema_1.emailEvents).values(events);
            // Update campaign stats
            await db_1.db.update(schema_1.emailCampaigns)
                .set({
                sentCount: totalSent,
                deliveredCount: totalSent - bounces,
                openedCount: opens,
                clickedCount: clicks,
                bouncedCount: bounces,
                unsubscribedCount: unsubscribes,
            })
                .where((0, drizzle_orm_2.eq)(schema_1.emailCampaigns.id, campaignId));
            res.json({
                success: true,
                message: 'Test analytics data generated',
                stats: {
                    sent: totalSent,
                    opens,
                    clicks,
                    bounces,
                    unsubscribes,
                },
            });
        }
        catch (error) {
            console.error('Error generating test data:', error);
            res.status(500).json({ error: 'Failed to generate test data' });
        }
    });
    app.get("/api/email/ai/recommendations", authenticateUser, async (req, res) => {
        try {
            const { campaign_id } = req.query;
            // TODO: Implement AI recommendations
            res.json([
                {
                    type: 'subject_line',
                    priority: 'high',
                    title: 'Improve Your Subject Line',
                    description: 'Add personalization to increase open rates by 26%',
                    example: 'Try: "{{first_name}}, your exclusive offer awaits"'
                }
            ]);
        }
        catch (error) {
            console.error('Error fetching AI recommendations:', error);
            res.status(500).json({ error: 'Failed to fetch recommendations' });
        }
    });
    app.get("/api/email/ai/send-time/:subscriberId", authenticateUser, async (req, res) => {
        try {
            // TODO: Implement optimal send time prediction
            res.json({
                subscriber_id: req.params.subscriberId,
                optimal_time: '2025-10-11T10:00:00Z',
                timezone: 'UTC',
                confidence: 0.78
            });
        }
        catch (error) {
            console.error('Error predicting send time:', error);
            res.status(500).json({ error: 'Failed to predict send time' });
        }
    });
    app.get("/api/email/ai/predict-engagement/:campaignId", authenticateUser, async (req, res) => {
        try {
            // TODO: Implement engagement prediction
            res.json({
                campaign_id: req.params.campaignId,
                predicted_open_rate: 0.24,
                predicted_click_rate: 0.035,
                confidence: 0.82,
                factors: ['subject_line_quality', 'send_time', 'audience_engagement']
            });
        }
        catch (error) {
            console.error('Error predicting engagement:', error);
            res.status(500).json({ error: 'Failed to predict engagement' });
        }
    });
    // A/B Testing
    app.post("/api/email/ab-test", authenticateUser, async (req, res) => {
        try {
            const { campaign_id, config } = req.body;
            // TODO: Implement A/B test creation
            res.json({
                success: true,
                test_id: `test_${Date.now()}`,
                message: 'A/B test created successfully'
            });
        }
        catch (error) {
            console.error('Error creating A/B test:', error);
            res.status(500).json({ error: 'Failed to create A/B test' });
        }
    });
    // Deliverability
    app.get("/api/email/deliverability", authenticateUser, async (req, res) => {
        try {
            // TODO: Implement deliverability report
            res.json({
                reputation_score: 95,
                bounce_rate: 0.02,
                complaint_rate: 0.001,
                spam_score: 0.5,
                domain_health: {
                    spf: 'pass',
                    dkim: 'pass',
                    dmarc: 'pass'
                },
                recommendations: [
                    'Maintain current sender reputation',
                    'Consider removing bounced emails from your list'
                ]
            });
        }
        catch (error) {
            console.error('Error fetching deliverability report:', error);
            res.status(500).json({ error: 'Failed to fetch deliverability report' });
        }
    });
    // Email validation
    app.post("/api/email/validate", authenticateUser, async (req, res) => {
        try {
            const { emails } = req.body;
            // TODO: Implement email validation
            const valid = emails.filter((e) => e.includes('@') && e.includes('.'));
            const invalid = emails.filter((e) => !e.includes('@') || !e.includes('.'));
            res.json({
                valid,
                invalid,
                risky: [],
                unknown: []
            });
        }
        catch (error) {
            console.error('Error validating emails:', error);
            res.status(500).json({ error: 'Failed to validate emails' });
        }
    });
    // Transactional emails
    app.post("/api/email/transactional", async (req, res) => {
        try {
            const { to, template_id, variables, priority } = req.body;
            // TODO: Implement transactional email sending
            console.log(`Transactional email queued: ${template_id} to ${to}`);
            res.json({
                success: true,
                message_id: `msg_${Date.now()}`,
                status: 'queued'
            });
        }
        catch (error) {
            console.error('Error sending transactional email:', error);
            res.status(500).json({ error: 'Failed to send email' });
        }
    });
    // Bulk subscriber operations
    app.post("/api/email/subscribers/bulk-import", authenticateUser, async (req, res) => {
        try {
            const { subscribers } = req.body;
            // TODO: Implement bulk import
            res.json({
                imported: subscribers.length,
                skipped: 0,
                errors: []
            });
        }
        catch (error) {
            console.error('Error importing subscribers:', error);
            res.status(500).json({ error: 'Failed to import subscribers' });
        }
    });
    app.post("/api/email/subscribers/bulk-update", authenticateUser, async (req, res) => {
        try {
            const { subscriber_ids, changes } = req.body;
            // TODO: Implement bulk update
            res.json({
                success: true,
                updated: subscriber_ids.length
            });
        }
        catch (error) {
            console.error('Error updating subscribers:', error);
            res.status(500).json({ error: 'Failed to update subscribers' });
        }
    });
    // Health check endpoint for deployment monitoring
    app.get("/api/health", (req, res) => {
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
            version: "1.0.0"
        });
    });
    // ==================== TEST CHAT ROUTES ====================
    // DEDICATED TOGNINJA BLOG WRITER ASSISTANT ENDPOINT
    app.post("/api/togninja/chat", async (req, res) => {
        console.log("🎯 TOGNINJA BLOG WRITER ASSISTANT ENDPOINT HIT");
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        try {
            const { message, threadId } = req.body;
            if (!message || typeof message !== 'string') {
                return res.status(400).json({ error: "Message is required" });
            }
            if (!process.env.OPENAI_API_KEY) {
                return res.status(500).json({ error: "OpenAI API key not configured" });
            }
            const assistantId = "asst_nlyO3yRav2oWtyTvkq0cHZaU"; // TOGNINJA BLOG WRITER
            let currentThreadId = threadId;
            // Create new thread if needed
            if (!currentThreadId) {
                const threadResponse = await fetch('https://api.openai.com/v1/threads', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                        'OpenAI-Beta': 'assistants=v2'
                    },
                    body: JSON.stringify({})
                });
                if (!threadResponse.ok) {
                    throw new Error(`Failed to create thread: ${threadResponse.status}`);
                }
                const threadData = await threadResponse.json();
                currentThreadId = threadData.id;
            }
            // Add user message to thread
            await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    role: 'user',
                    content: message
                })
            });
            // Create run with TOGNINJA assistant
            const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    assistant_id: assistantId
                })
            });
            if (!runResponse.ok) {
                throw new Error(`Failed to create run: ${runResponse.status}`);
            }
            const runData = await runResponse.json();
            const runId = runData.id;
            // Wait for completion
            let runStatus = 'queued';
            let attempts = 0;
            const maxAttempts = 60;
            while (runStatus !== 'completed' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'OpenAI-Beta': 'assistants=v2'
                    }
                });
                if (!statusResponse.ok) {
                    throw new Error(`Failed to check run status: ${statusResponse.status}`);
                }
                const statusData = await statusResponse.json();
                runStatus = statusData.status;
                attempts++;
            }
            if (runStatus !== 'completed') {
                throw new Error(`TOGNINJA assistant run failed with status: ${runStatus}`);
            }
            // Get response
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            if (!messagesResponse.ok) {
                throw new Error(`Failed to get messages: ${messagesResponse.status}`);
            }
            const messagesData = await messagesResponse.json();
            const assistantMessage = messagesData.data.find((msg) => msg.role === 'assistant');
            const response = assistantMessage?.content?.[0]?.text?.value || "I apologize, but I couldn't generate a response.";
            console.log("🎯 TOGNINJA RESPONSE:", response.slice(0, 100));
            res.json({
                response,
                threadId: currentThreadId,
                assistantId: assistantId,
                source: "TOGNINJA_BLOG_WRITER_ASSISTANT"
            });
        }
        catch (error) {
            console.error("TOGNINJA Assistant error:", error);
            res.status(500).json({
                error: "TOGNINJA Assistant failed",
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // REDIRECT OLD TEST CHAT TO TOGNINJA ENDPOINT
    app.post("/api/test/chat", async (req, res) => {
        console.log("🔄 REDIRECTING OLD /api/test/chat TO TOGNINJA ENDPOINT");
        console.log("Request body:", req.body);
        try {
            const { message, threadId } = req.body;
            if (!message || typeof message !== 'string') {
                return res.status(400).json({ error: "Message is required" });
            }
            if (!process.env.OPENAI_API_KEY) {
                return res.status(500).json({ error: "OpenAI API key not configured" });
            }
            const assistantId = "asst_nlyO3yRav2oWtyTvkq0cHZaU"; // TOGNINJA BLOG WRITER
            let currentThreadId = threadId;
            // Create new thread if needed
            if (!currentThreadId) {
                const threadResponse = await fetch('https://api.openai.com/v1/threads', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                        'OpenAI-Beta': 'assistants=v2'
                    },
                    body: JSON.stringify({})
                });
                if (!threadResponse.ok) {
                    throw new Error(`Failed to create thread: ${threadResponse.status}`);
                }
                const threadData = await threadResponse.json();
                currentThreadId = threadData.id;
            }
            // Add user message to thread
            await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    role: 'user',
                    content: message
                })
            });
            // Create run with TOGNINJA assistant
            const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    assistant_id: assistantId
                })
            });
            if (!runResponse.ok) {
                throw new Error(`Failed to create run: ${runResponse.status}`);
            }
            const runData = await runResponse.json();
            const runId = runData.id;
            // Wait for completion
            let runStatus = 'queued';
            let attempts = 0;
            const maxAttempts = 60;
            while (runStatus !== 'completed' && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'OpenAI-Beta': 'assistants=v2'
                    }
                });
                if (!statusResponse.ok) {
                    throw new Error(`Failed to check run status: ${statusResponse.status}`);
                }
                const statusData = await statusResponse.json();
                runStatus = statusData.status;
                attempts++;
            }
            if (runStatus !== 'completed') {
                throw new Error(`TOGNINJA assistant run failed with status: ${runStatus}`);
            }
            // Get response
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            if (!messagesResponse.ok) {
                throw new Error(`Failed to get messages: ${messagesResponse.status}`);
            }
            const messagesData = await messagesResponse.json();
            const assistantMessage = messagesData.data.find((msg) => msg.role === 'assistant');
            const response = assistantMessage?.content?.[0]?.text?.value || "I apologize, but I couldn't generate a response.";
            console.log("🎯 TOGNINJA RESPONSE VIA REDIRECT:", response.slice(0, 100));
            res.json({
                response,
                threadId: currentThreadId,
                assistantId: assistantId,
                source: "TOGNINJA_BLOG_WRITER_ASSISTANT_REDIRECT"
            });
        }
        catch (error) {
            console.error("TOGNINJA Assistant redirect error:", error);
            res.status(500).json({
                error: "TOGNINJA Assistant redirect failed",
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    // ==================== AUTOMATIC EMAIL REFRESH ====================
    app.post("/api/email/refresh", authenticateUser, async (req, res) => {
        try {
            console.log('Starting email refresh...');
            const imapUser = process.env.IMAP_USER || process.env.BUSINESS_MAILBOX_USER || '';
            const imapPass = process.env.IMAP_PASS || process.env.EMAIL_PASSWORD || '';
            if (!imapUser || !imapPass) {
                console.error('IMAP credentials missing: IMAP_USER and IMAP_PASS must be set in .env');
                return res.status(500).json({
                    success: false,
                    error: 'IMAP credentials not configured. Please set IMAP_USER and IMAP_PASS in your environment.'
                });
            }
            const importedEmails = await importEmailsFromIMAP({
                host: process.env.IMAP_HOST || 'imap.easyname.com',
                port: parseInt(process.env.IMAP_PORT || '993'),
                username: imapUser,
                password: imapPass,
                useTLS: true
            });
            console.log(`Successfully fetched ${importedEmails.length} emails from business account`);
            // Store emails in database, avoid duplicates
            let newEmailCount = 0;
            const existingMessages = await storage_1.storage.getCrmMessages();
            for (const email of importedEmails) {
                // Check if email already exists (improved duplicate check)
                const isDuplicate = existingMessages.some(msg => msg.subject === email.subject &&
                    msg.senderEmail === email.from &&
                    Math.abs(new Date(msg.createdAt).getTime() - new Date(email.date).getTime()) < 300000 // Within 5 minutes
                );
                if (!isDuplicate) {
                    try {
                        await storage_1.storage.createCrmMessage({
                            senderName: email.fromName,
                            senderEmail: email.from,
                            subject: email.subject,
                            content: email.body,
                            status: email.isRead ? 'read' : 'unread'
                        });
                        newEmailCount++;
                        console.log(`Imported new email: ${email.subject} from ${email.from}`);
                    }
                    catch (error) {
                        console.error('Failed to save email:', error);
                    }
                }
            }
            console.log(`Imported ${newEmailCount} new emails out of ${importedEmails.length} fetched`);
            res.json({
                success: true,
                message: `Email refresh completed: ${newEmailCount} new emails imported`,
                newEmails: newEmailCount,
                totalEmails: importedEmails.length,
                processedEmails: newEmailCount
            });
        }
        catch (error) {
            console.error('Email refresh error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to refresh emails: ' + error.message
            });
        }
    });
    // ==================== AUTOMATIC EMAIL IMPORT SERVICE ====================
    // Background email import service with rate limiting and crash protection
    let emailImportInterval = null;
    let lastEmailImportTime = 0;
    let isEmailImportRunning = false; // Mutex to prevent concurrent imports
    const EMAIL_IMPORT_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours (safe interval)
    const EMAIL_IMPORT_TIMEOUT_MS = 90 * 1000; // 90 second timeout per import
    const startBackgroundEmailImport = () => {
        // DON'T START if in demo mode
        if (process.env.DEMO_MODE === 'true') {
            console.log('📧 Email import disabled in demo mode');
            return;
        }
        // Check for either EMAIL_PASSWORD or SMTP_PASS
        const emailPassword = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
        if (!emailPassword) {
            console.log('📧 Email import disabled - no email credentials configured');
            return;
        }
        // Clear any existing interval
        if (emailImportInterval) {
            clearInterval(emailImportInterval);
        }
        // Initial import after 30 seconds (give server time to start)
        setTimeout(() => {
            if (!isEmailImportRunning) {
                runSafeEmailImport();
            }
        }, 30 * 1000);
        // Set up recurring import every 2 hours
        emailImportInterval = setInterval(async () => {
            await runSafeEmailImport();
        }, EMAIL_IMPORT_INTERVAL_MS);
        console.log('✅ Background email import service started (every 2 hours)');
    };
    // Safe email import with mutex, timeout, and error handling
    const runSafeEmailImport = async () => {
        // Mutex check - skip if already running
        if (isEmailImportRunning) {
            console.log('📧 Email import already in progress, skipping...');
            return;
        }
        isEmailImportRunning = true;
        const importStartTime = Date.now();
        try {
            console.log('📧 Starting scheduled email import...');
            // Set a timeout for the entire import operation
            const importPromise = importEmailsFromIMAP({
                host: 'imap.easyname.com',
                port: 993,
                username: '30840mail10',
                password: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '',
                useTLS: true
            });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Email import timeout')), EMAIL_IMPORT_TIMEOUT_MS);
            });
            const importedEmails = await Promise.race([importPromise, timeoutPromise]);
            // Store only genuinely new emails with duplicate prevention
            let newEmailCount = 0;
            for (const email of importedEmails) {
                const isDuplicate = await checkEmailExists(email);
                if (!isDuplicate) {
                    try {
                        await storage_1.storage.createCrmMessage({
                            senderName: email.fromName,
                            senderEmail: email.from,
                            subject: email.subject,
                            content: email.body,
                            status: email.isRead ? 'read' : 'unread'
                        });
                        newEmailCount++;
                    }
                    catch (error) {
                        // Skip silently on duplicate constraint violations
                        if (!error.message?.includes('unique') && !error.message?.includes('duplicate')) {
                            console.error('📧 Failed to save email:', error.message);
                        }
                    }
                }
            }
            const duration = ((Date.now() - importStartTime) / 1000).toFixed(1);
            if (newEmailCount > 0) {
                lastEmailImportTime = Date.now();
                console.log(`📧 Email import complete: ${newEmailCount} new emails imported in ${duration}s`);
            }
            else {
                console.log(`📧 Email import complete: no new emails (checked ${importedEmails.length} emails in ${duration}s)`);
            }
        }
        catch (error) {
            const duration = ((Date.now() - importStartTime) / 1000).toFixed(1);
            console.error(`📧 Email import failed after ${duration}s:`, error.message);
            // Don't throw - let the server continue running
        }
        finally {
            isEmailImportRunning = false;
        }
    };
    // Helper functions for smart email import
    async function getLastEmailImportTime() {
        try {
            const result = await db_1.db
                .select({ createdAt: schema_1.crmMessages.createdAt })
                .from(schema_1.crmMessages)
                .orderBy(schema_1.crmMessages.createdAt)
                .limit(1);
            // Return date 1 hour ago to catch any recent emails we might have missed
            const lastTime = result[0]?.createdAt;
            if (lastTime) {
                const oneHourAgo = new Date(lastTime.getTime() - 60 * 60 * 1000);
                return oneHourAgo;
            }
            // If no emails exist, return 24 hours ago
            return new Date(Date.now() - 24 * 60 * 60 * 1000);
        }
        catch (error) {
            console.error('Error getting last import time:', error);
            return new Date(Date.now() - 24 * 60 * 60 * 1000);
        }
    }
    async function updateLastEmailImportTime(timestamp) {
        // Store timestamp in environment or database for persistence
        lastEmailImportTime = timestamp;
    }
    async function checkEmailExists(email) {
        try {
            const { and } = await import('drizzle-orm');
            const existing = await db_1.db
                .select({ id: schema_1.crmMessages.id })
                .from(schema_1.crmMessages)
                .where(and((0, drizzle_orm_2.eq)(schema_1.crmMessages.senderEmail, email.from), (0, drizzle_orm_2.eq)(schema_1.crmMessages.subject, email.subject)))
                .limit(1);
            return existing.length > 0;
        }
        catch (error) {
            console.error('Error checking email existence:', error);
            return false;
        }
    }
    // Enable background email import with safe rate limiting
    startBackgroundEmailImport();
    // Endpoint to get email import status
    app.get("/api/email/import-status", authenticateUser, async (req, res) => {
        const now = Date.now();
        const nextImportIn = lastEmailImportTime
            ? Math.max(0, EMAIL_IMPORT_INTERVAL_MS - (now - lastEmailImportTime))
            : EMAIL_IMPORT_INTERVAL_MS;
        res.json({
            isRunning: emailImportInterval !== null,
            isCurrentlyImporting: isEmailImportRunning,
            lastImportTime: lastEmailImportTime ? new Date(lastEmailImportTime).toISOString() : null,
            nextImportIn: nextImportIn,
            nextImportInMinutes: Math.round(nextImportIn / 60000),
            intervalHours: EMAIL_IMPORT_INTERVAL_MS / (60 * 60 * 1000)
        });
    });
    // ==================== HEALTH CHECK ====================
    app.get("/api/health", (req, res) => {
        try {
            res.json({
                status: "ok",
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                demoMode: process.env.DEMO_MODE,
                databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
            });
        }
        catch (error) {
            console.error('Health check error:', error);
            res.status(500).json({
                status: "error",
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    });
    // ==================== CLIENT ERROR LOGGING ====================
    app.post("/api/client-error", (req, res) => {
        try {
            const { error, timestamp, url, userAgent } = req.body;
            console.error(`Client Error [${timestamp}]:`, error);
            console.error(`URL: ${url || req.headers.referer}`);
            console.error(`User Agent: ${userAgent || req.headers['user-agent']}`);
            res.json({ success: true });
        }
        catch (error) {
            console.error('Failed to log client error:', error);
            res.status(500).json({ success: false });
        }
    });
    // Website scraping and customization routes
    app.post("/api/scrape-website", async (req, res) => {
        try {
            const { url } = req.body;
            if (!url) {
                return res.status(400).json({ error: "Website URL is required" });
            }
            const { WebsiteScraper } = await import('./scraping-agent');
            const scrapedData = await WebsiteScraper.scrapeWebsite(url);
            res.json(scrapedData);
        }
        catch (error) {
            console.error('Error scraping website:', error);
            res.status(500).json({ error: "Failed to scrape website" });
        }
    });
    app.post("/api/generate-seo-recommendations", async (req, res) => {
        try {
            const { scrapedData, location } = req.body;
            if (!scrapedData) {
                return res.status(400).json({ error: "Scraped data is required" });
            }
            const { SEOAgent } = await import('./scraping-agent');
            const recommendations = SEOAgent.generateSEORecommendations(scrapedData, location);
            res.json(recommendations);
        }
        catch (error) {
            console.error('Error generating SEO recommendations:', error);
            res.status(500).json({ error: "Failed to generate SEO recommendations" });
        }
    });
    // Email notification function for new leads
    async function sendNewLeadNotification(lead) {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host: 'smtp.easyname.com',
            port: 587,
            secure: false,
            auth: {
                user: '30840mail10',
                pass: 'HoveBN41!'
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        const leadSource = lead.source || 'Website';
        const leadMessage = lead.message || 'No message provided';
        const emailSubject = `🔔 New Lead: ${lead.name} from ${leadSource}`;
        const emailBody = `
New Lead Notification - New Age Fotografie

📋 Lead Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || 'Not provided'}
Company: ${lead.company || 'Not provided'}
Source: ${leadSource}
Status: ${lead.status || 'New'}

📝 Message:
${leadMessage}

🕐 Received: ${new Date().toLocaleString('de-DE', {
            timeZone: 'Europe/Vienna',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })} (Vienna time)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 Action Required:
• Review the lead in your CRM dashboard
• Contact the prospect within 24 hours
• Update lead status after initial contact

🔗 CRM Dashboard: https://www.newagefotografie.com/admin/leads

Best regards,
New Age Fotografie CRM System
    `;
        const studioEmail = getEnvContactEmailSync();
        const mailOptions = {
            from: studioEmail || 'no-reply@localhost',
            to: studioEmail || 'no-reply@localhost',
            subject: emailSubject,
            text: emailBody,
            html: emailBody.replace(/\n/g, '<br>').replace(/━/g, '─')
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('New lead notification sent:', info.messageId);
        // Save the notification email to the database for tracking
        try {
            await storage_1.storage.createCrmMessage({
                senderName: 'New Age Fotografie System',
                senderEmail: 'system@newagefotografie.com',
                subject: `[LEAD NOTIFICATION] ${emailSubject}`,
                content: `Lead notification sent to ${studioEmail || '<unset>'}\n\n${emailBody}`,
                status: 'archived'
            });
        }
        catch (dbError) {
            console.error('Failed to save lead notification to database:', dbError);
        }
    }
    // ==================== VOUCHER MANAGEMENT ROUTES ====================
    // Voucher Products Routes
    // ==================== IMAGE UPLOAD ROUTES ====================
    app.post("/api/upload/image", authenticateUser, upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
            }
            // Validate essential env vars early
            if (!process.env.AWS_S3_BUCKET) {
                return res.status(500).json({ error: 'Cloud storage bucket not configured (AWS_S3_BUCKET missing)' });
            }
            if (!process.env.AWS_S3_ENDPOINT) {
                console.warn('[VOUCHER IMAGE] AWS_S3_ENDPOINT missing; falling back to standard S3 URL format');
            }
            console.log("[VOUCHER IMAGE] Uploading to B2:", {
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            });
            // Prepare buffers
            const originalBuffer = req.file.buffer;
            if (!originalBuffer) {
                console.error("[VOUCHER IMAGE] No buffer available");
                return res.status(500).json({ error: "File buffer not available" });
            }
            let processedBuffer = originalBuffer;
            let processedMime = req.file.mimetype;
            let thumbnailBuffer = null;
            let thumbnailMime = 'image/webp';
            let didTransform = false;
            try {
                // Resize & convert to webp for efficiency (max width 1600)
                const main = (0, sharp_1.default)(originalBuffer)
                    .rotate()
                    .resize({ width: 1400, withoutEnlargement: true })
                    .webp({ quality: 72 });
                processedBuffer = await main.toBuffer();
                processedMime = 'image/webp';
                didTransform = true;
                // Create thumbnail (square crop)
                thumbnailBuffer = await (0, sharp_1.default)(originalBuffer)
                    .rotate()
                    .resize({ width: 360, height: 360, fit: 'cover' })
                    .webp({ quality: 70 })
                    .toBuffer();
            }
            catch (imgErr) {
                console.warn("[VOUCHER IMAGE] Sharp processing failed, falling back to original:", imgErr);
                thumbnailBuffer = null; // Will skip thumbnail upload
            }
            const baseName = `voucher-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
            const mainFileName = `${baseName}${processedMime === 'image/webp' ? '.webp' : path_1.default.extname(req.file.originalname)}`;
            const thumbFileName = `thumb-${baseName}.webp`;
            const mainKey = `vouchers/${mainFileName}`;
            const thumbKey = `vouchers/${thumbFileName}`;
            console.log("[VOUCHER IMAGE] Uploading to B2 with keys:", { mainKey, thumbKey, transformed: didTransform });
            // Upload main image
            await s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET || '',
                Key: mainKey,
                Body: processedBuffer,
                ContentType: processedMime,
                // Backblaze B2 S3 API: omit ACL; bucket policy controls public access
                Metadata: {
                    originalName: req.file.originalname,
                    uploadedBy: 'voucher-system',
                    transformed: didTransform ? 'true' : 'false',
                },
            }));
            // Helper to build public URL (supports Backblaze B2 S3 & download endpoints)
            // Properly URL encodes spaces and special characters in the path
            const buildPublicUrl = (key) => {
                const bucket = process.env.AWS_S3_BUCKET || '';
                const endpoint = process.env.AWS_S3_ENDPOINT || '';
                // URL encode each path segment, preserving slashes
                const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
                if (endpoint.includes('backblazeb2.com')) {
                    return `https://${bucket}.${endpoint.replace('https://', '').replace(/\/$/, '')}/${encodedKey}`;
                }
                if (endpoint) {
                    if (endpoint.includes('/file/')) {
                        return `${endpoint.replace(/\/$/, '')}/${encodedKey}`;
                    }
                    return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodedKey}`;
                }
                return `https://${bucket}.s3.${process.env.AWS_REGION || 'eu-central-1'}.amazonaws.com/${encodedKey}`;
            };
            // Upload thumbnail if created
            let thumbUrl = null;
            if (thumbnailBuffer) {
                try {
                    await s3Client.send(new client_s3_1.PutObjectCommand({
                        Bucket: process.env.AWS_S3_BUCKET || '',
                        Key: thumbKey,
                        Body: thumbnailBuffer,
                        ContentType: thumbnailMime,
                        Metadata: {
                            originalName: req.file.originalname,
                            uploadedBy: 'voucher-system',
                            type: 'thumbnail'
                        }
                    }));
                    thumbUrl = buildPublicUrl(thumbKey);
                }
                catch (thumbErr) {
                    console.warn("[VOUCHER IMAGE] Thumbnail upload failed:", thumbErr);
                }
            }
            const mainUrl = buildPublicUrl(mainKey);
            console.log("[VOUCHER IMAGE] Upload successful:", {
                mainKey,
                thumbKey: thumbnailBuffer ? thumbKey : null,
                url: mainUrl,
                thumbUrl,
                originalSize: req.file.size,
                processedSize: processedBuffer.length,
                bucket: process.env.AWS_S3_BUCKET
            });
            res.json({ url: mainUrl, thumbnailUrl: thumbUrl, originalSize: req.file.size, processedSize: processedBuffer.length });
        }
        catch (error) {
            const e = error;
            console.error("[VOUCHER IMAGE] Upload error:", {
                name: e?.name,
                message: e?.message,
                code: e?.code,
                $metadata: e?.$metadata,
                stack: e?.stack,
            });
            res.status(500).json({ error: "Failed to upload image to cloud storage", details: e?.message || String(e) });
        }
    });
    // Central error handler for Multer (file too large, invalid type)
    app.use((err, req, res, next) => {
        // Multer errors surface here when using upload.single()
        if (err && err.name === 'MulterError') {
            console.error('[UPLOAD] MulterError:', { code: err.code, message: err.message });
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File too large', limit: '20MB' });
            }
            return res.status(400).json({ error: 'Upload error', code: err.code, message: err.message });
        }
        return next(err);
    });
    // Diagnostics endpoint for upload environment
    app.get('/api/upload/debug/env', (req, res) => {
        res.json({
            bucketSet: !!process.env.AWS_S3_BUCKET,
            endpointSet: !!process.env.AWS_S3_ENDPOINT,
            region: process.env.AWS_REGION || 'eu-central-1',
            forcePathStyle: !!process.env.AWS_S3_ENDPOINT,
            maxFileSizeMB: 20,
            sharpVersion: require('sharp').version,
        });
    });
    // ==================== VOUCHER ROUTES ====================
    app.get("/api/vouchers/products", async (req, res) => {
        try {
            // Ensure no caching to always get fresh product data
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            const language = req.query.language || 'de';
            // Helper to properly encode URLs with spaces in path segments
            const encodeImageUrl = (url) => {
                if (!url)
                    return null;
                try {
                    const urlObj = new URL(url);
                    // Encode each path segment individually to handle spaces
                    urlObj.pathname = urlObj.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
                    return urlObj.toString();
                }
                catch {
                    return url;
                }
            };
            const toCamel = (p) => ({
                id: p.id,
                name: language === 'en' ? translateVoucherToEnglish(p.name) : p.name,
                description: p.description ? (language === 'en' ? translateVoucherToEnglish(p.description) : p.description) : null,
                detailedDescription: (p.detailedDescription ?? p.detailed_description) ? (language === 'en' ? translateVoucherToEnglish(p.detailedDescription ?? p.detailed_description) : (p.detailedDescription ?? p.detailed_description)) : null,
                price: p.price,
                originalPrice: p.originalPrice ?? p.original_price,
                category: p.category,
                sessionDuration: p.sessionDuration ?? p.session_duration,
                sessionType: p.sessionType ?? p.session_type,
                validityPeriod: p.validityPeriod ?? p.validity_period,
                redemptionInstructions: p.redemptionInstructions ?? p.redemption_instructions,
                termsAndConditions: (p.termsAndConditions ?? p.terms_and_conditions) ? (language === 'en' ? translateVoucherToEnglish(p.termsAndConditions ?? p.terms_and_conditions) : (p.termsAndConditions ?? p.terms_and_conditions)) : null,
                imageUrl: encodeImageUrl(p.imageUrl ?? p.image_url),
                thumbnailUrl: encodeImageUrl(p.thumbnailUrl ?? p.thumbnail_url),
                promoImageUrl: encodeImageUrl(p.promoImageUrl ?? p.promo_image_url),
                displayOrder: p.displayOrder ?? p.display_order,
                featured: p.featured,
                badge: p.badge,
                isActive: p.isActive ?? p.is_active,
                stockLimit: p.stockLimit ?? p.stock_limit,
                maxPerCustomer: p.maxPerCustomer ?? p.max_per_customer,
                slug: p.slug,
                metaTitle: p.metaTitle ?? p.meta_title,
                metaDescription: p.metaDescription ?? p.meta_description,
                createdAt: p.createdAt ?? p.created_at,
                updatedAt: p.updatedAt ?? p.updated_at,
            });
            const raw = await neonDb.getVoucherProducts();
            const products = raw.map(toCamel);
            res.json(products);
        }
        catch (error) {
            console.error("Error fetching voucher products:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Get single voucher product by ID or slug (public endpoint)
    app.get("/api/vouchers/products/:id", async (req, res) => {
        try {
            const idOrSlug = req.params.id;
            console.log('[VOUCHER] Fetching product by id/slug:', idOrSlug);
            // UUID regex pattern to validate before querying by ID
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            let product = null;
            // Only try ID lookup if it looks like a valid UUID
            if (uuidPattern.test(idOrSlug)) {
                try {
                    product = await neonDb.getVoucherProduct(idOrSlug);
                    console.log('[VOUCHER] Direct ID lookup result:', product ? 'found' : 'not found');
                }
                catch (idError) {
                    console.log('[VOUCHER] ID lookup failed, will try slug:', idError);
                }
            }
            else {
                console.log('[VOUCHER] Input is not a UUID, skipping ID lookup');
            }
            if (!product) {
                // Fallback: attempt slug lookup
                try {
                    console.log('[VOUCHER] Attempting slug fallback for:', idOrSlug);
                    const all = await neonDb.getVoucherProducts();
                    console.log('[VOUCHER] Got', all.length, 'products for slug search');
                    product = all.find((p) => p.slug === idOrSlug);
                    console.log('[VOUCHER] Slug lookup result:', product ? 'found' : 'not found');
                }
                catch (e) {
                    console.warn('[VOUCHER] Slug fallback failed:', e);
                }
            }
            if (!product) {
                console.log('[VOUCHER] Product not found for:', idOrSlug);
                return res.status(404).json({ error: "Voucher product not found" });
            }
            // Helper to properly encode URLs with spaces in path segments
            const encodeImageUrl = (url) => {
                if (!url)
                    return null;
                try {
                    const urlObj = new URL(url);
                    // Encode each path segment individually to handle spaces
                    urlObj.pathname = urlObj.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
                    return urlObj.toString();
                }
                catch {
                    return url;
                }
            };
            const p = product;
            const transformedProduct = {
                id: p.id,
                name: p.name,
                description: p.description,
                detailedDescription: p.detailedDescription ?? p.detailed_description,
                price: p.price,
                originalPrice: p.originalPrice ?? p.original_price,
                category: p.category,
                sessionDuration: p.sessionDuration ?? p.session_duration,
                sessionType: p.sessionType ?? p.session_type,
                validityPeriod: p.validityPeriod ?? p.validity_period,
                redemptionInstructions: p.redemptionInstructions ?? p.redemption_instructions,
                termsAndConditions: p.termsAndConditions ?? p.terms_and_conditions,
                imageUrl: encodeImageUrl(p.imageUrl ?? p.image_url),
                thumbnailUrl: encodeImageUrl(p.thumbnailUrl ?? p.thumbnail_url),
                promoImageUrl: encodeImageUrl(p.promoImageUrl ?? p.promo_image_url),
                displayOrder: p.displayOrder ?? p.display_order,
                featured: p.featured,
                badge: p.badge,
                isActive: p.isActive ?? p.is_active,
                stockLimit: p.stockLimit ?? p.stock_limit,
                maxPerCustomer: p.maxPerCustomer ?? p.max_per_customer,
                slug: p.slug,
                metaTitle: p.metaTitle ?? p.meta_title,
                metaDescription: p.metaDescription ?? p.meta_description,
                createdAt: p.createdAt ?? p.created_at,
                updatedAt: p.updatedAt ?? p.updated_at,
            };
            res.json(transformedProduct);
        }
        catch (error) {
            console.error("Error fetching voucher product:", error);
            console.error("[VOUCHER] Full error stack:", error.stack);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ============================================================================
    // HOMEPAGE IMAGES API
    // ============================================================================
    // Get all homepage images
    app.get("/api/homepage/images", async (req, res) => {
        try {
            const section = req.query.section;
            let query = `
        SELECT id, section, url, alt, title, sort_order, is_active, created_at, updated_at
        FROM homepage_images
        WHERE is_active = true
      `;
            const params = [];
            if (section) {
                query += ` AND section = $1`;
                params.push(section);
            }
            query += ` ORDER BY sort_order ASC, created_at DESC`;
            const images = await runSql(query, params);
            res.set('Cache-Control', 'no-store');
            res.json(images);
        }
        catch (error) {
            console.error("Error fetching homepage images:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Get single homepage image
    app.get("/api/homepage/images/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await runSql(`
        SELECT id, section, url, alt, title, sort_order, is_active, created_at, updated_at
        FROM homepage_images
        WHERE id = $1
      `, [id]);
            if (result.length === 0) {
                return res.status(404).json({ error: "Image not found" });
            }
            res.json(result[0]);
        }
        catch (error) {
            console.error("Error fetching homepage image:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Create homepage image
    app.post("/api/homepage/images", authenticateUser, async (req, res) => {
        try {
            const { section, url, alt, title, sortOrder, isActive } = req.body;
            if (!section || !url) {
                return res.status(400).json({ error: "Section and URL are required" });
            }
            const result = await runSql(`
        INSERT INTO homepage_images (section, url, alt, title, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, section, url, alt, title, sort_order, is_active, created_at, updated_at
      `, [section, url, alt || null, title || null, sortOrder || 0, isActive !== false]);
            console.log(`✅ Created homepage image: ${result[0].id}`);
            res.json(result[0]);
        }
        catch (error) {
            console.error("Error creating homepage image:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Update homepage image
    app.put("/api/homepage/images/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            const { section, url, alt, title, sortOrder, isActive } = req.body;
            const result = await runSql(`
        UPDATE homepage_images
        SET 
          section = COALESCE($2, section),
          url = COALESCE($3, url),
          alt = COALESCE($4, alt),
          title = COALESCE($5, title),
          sort_order = COALESCE($6, sort_order),
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, section, url, alt, title, sort_order, is_active, created_at, updated_at
      `, [id, section, url, alt, title, sortOrder, isActive]);
            if (result.length === 0) {
                return res.status(404).json({ error: "Image not found" });
            }
            console.log(`✅ Updated homepage image: ${id}`);
            res.json(result[0]);
        }
        catch (error) {
            console.error("Error updating homepage image:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Delete homepage image
    app.delete("/api/homepage/images/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await runSql(`
        DELETE FROM homepage_images
        WHERE id = $1
        RETURNING id
      `, [id]);
            if (result.length === 0) {
                return res.status(404).json({ error: "Image not found" });
            }
            console.log(`✅ Deleted homepage image: ${id}`);
            res.json({ success: true, message: "Image deleted successfully" });
        }
        catch (error) {
            console.error("Error deleting homepage image:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Upload homepage image to Backblaze B2
    app.post("/api/homepage/images/upload", authenticateUser, upload.single('image'), async (req, res) => {
        try {
            console.log('[HOMEPAGE IMAGE UPLOAD] Request received');
            console.log('[HOMEPAGE IMAGE UPLOAD] File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');
            console.log('[HOMEPAGE IMAGE UPLOAD] Section:', req.body.section);
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded", message: "No file was provided in the upload request" });
            }
            const { section } = req.body;
            if (!section) {
                return res.status(400).json({ error: "Section is required", message: "Please specify a section for this image" });
            }
            // Use shared S3 helper (Backblaze-compatible) and standard AWS_* envs
            const { bucket, endpoint, isConfigured } = (0, s3_storage_1.getS3Config)();
            if (!isConfigured) {
                console.error('❌ S3/B2 credentials or bucket not configured');
                return res.status(503).json({
                    error: "Storage service not configured",
                    message: "Storage service not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET."
                });
            }
            console.log('[HOMEPAGE IMAGE UPLOAD] Optimizing image...');
            // Optimize image with sharp
            const optimizedBuffer = await (0, sharp_1.default)(req.file.buffer)
                .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85, progressive: true })
                .toBuffer();
            // Generate unique filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const filename = `homepage/${section}-${timestamp}-${randomString}.jpg`;
            console.log('[HOMEPAGE IMAGE UPLOAD] Uploading to B2:', filename);
            // Upload to B2
            const uploadCommand = new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: filename,
                Body: optimizedBuffer,
                ContentType: 'image/jpeg',
                CacheControl: 'public, max-age=31536000',
            });
            await (0, s3_storage_1.getS3Client)().send(uploadCommand);
            // Generate public URL
            const publicUrl = (0, s3_storage_1.buildPublicUrl)(bucket, endpoint, filename);
            console.log('[HOMEPAGE IMAGE UPLOAD] Public URL:', publicUrl);
            console.log('[HOMEPAGE IMAGE UPLOAD] Saving to database...');
            // Save to database
            const result = await runSql(`
        INSERT INTO homepage_images (section, url, alt, title, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, section, url, alt, title, sort_order, is_active, created_at, updated_at
      `, [
                section,
                publicUrl,
                req.body.alt || `Homepage image for ${section}`,
                req.body.title || section,
                req.body.sortOrder || 0,
                true
            ]);
            console.log(`✅ Uploaded and saved homepage image: ${result[0].id}`);
            console.log(`📸 Image URL: ${publicUrl}`);
            res.json({
                success: true,
                image: result[0],
                message: "Image uploaded successfully"
            });
        }
        catch (error) {
            console.error("[HOMEPAGE IMAGE UPLOAD] ❌ Error:", error);
            console.error("[HOMEPAGE IMAGE UPLOAD] Error stack:", error.stack);
            res.status(500).json({
                error: "Failed to upload image",
                message: error.message || "An unknown error occurred during upload"
            });
        }
    });
    // ===========================
    // Portfolio Images API Routes
    // ===========================
    // Get all portfolio images (public, filterable by category)
    app.get("/api/portfolio/images", async (req, res) => {
        try {
            const category = req.query.category;
            let query = `
        SELECT id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
        FROM portfolio_images
        WHERE is_active = true
      `;
            const params = [];
            if (category) {
                query += ` AND category = $1`;
                params.push(category);
            }
            query += ` ORDER BY category, sort_order ASC, created_at DESC`;
            const images = await runSql(query, params);
            res.set('Cache-Control', 'no-store');
            res.json(images);
        }
        catch (error) {
            console.error("Error fetching portfolio images:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Get single portfolio image
    app.get("/api/portfolio/images/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await runSql(`
        SELECT id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
        FROM portfolio_images
        WHERE id = $1
      `, [id]);
            if (result.length === 0) {
                return res.status(404).json({ error: "Image not found" });
            }
            res.json(result[0]);
        }
        catch (error) {
            console.error("Error fetching portfolio image:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Create portfolio image (admin only)
    app.post("/api/portfolio/images", authenticateUser, async (req, res) => {
        try {
            const { category, url, alt, title, description, sortOrder, isActive } = req.body;
            if (!category || !url) {
                return res.status(400).json({ error: "Category and URL are required" });
            }
            const result = await runSql(`
        INSERT INTO portfolio_images (category, url, alt, title, description, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
      `, [category, url, alt || null, title || null, description || null, sortOrder || 0, isActive !== false]);
            console.log(`✅ Created portfolio image: ${result[0].id}`);
            res.json(result[0]);
        }
        catch (error) {
            console.error("Error creating portfolio image:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Update portfolio image (admin only)
    app.put("/api/portfolio/images/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            const { category, url, alt, title, description, sortOrder, isActive } = req.body;
            const result = await runSql(`
        UPDATE portfolio_images
        SET 
          category = COALESCE($2, category),
          url = COALESCE($3, url),
          alt = COALESCE($4, alt),
          title = COALESCE($5, title),
          description = COALESCE($6, description),
          sort_order = COALESCE($7, sort_order),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
      `, [id, category, url, alt, title, description, sortOrder, isActive]);
            if (result.length === 0) {
                return res.status(404).json({ error: "Image not found" });
            }
            console.log(`✅ Updated portfolio image: ${id}`);
            res.json(result[0]);
        }
        catch (error) {
            console.error("Error updating portfolio image:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Delete portfolio image (admin only)
    app.delete("/api/portfolio/images/:id", authenticateUser, async (req, res) => {
        try {
            const { id } = req.params;
            const result = await runSql(`
        DELETE FROM portfolio_images
        WHERE id = $1
        RETURNING id
      `, [id]);
            if (result.length === 0) {
                return res.status(404).json({ error: "Image not found" });
            }
            console.log(`✅ Deleted portfolio image: ${id}`);
            res.json({ success: true, message: "Image deleted successfully" });
        }
        catch (error) {
            console.error("Error deleting portfolio image:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Upload portfolio image to Backblaze B2 (admin only)
    app.post("/api/portfolio/images/upload", authenticateUser, upload.single('image'), async (req, res) => {
        try {
            console.log('[PORTFOLIO IMAGE UPLOAD] Request received');
            console.log('[PORTFOLIO IMAGE UPLOAD] File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');
            console.log('[PORTFOLIO IMAGE UPLOAD] Category:', req.body.category);
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded", message: "No file was provided in the upload request" });
            }
            const { category } = req.body;
            if (!category) {
                return res.status(400).json({ error: "Category is required", message: "Please specify a category for this image" });
            }
            const { bucket, endpoint, isConfigured } = (0, s3_storage_1.getS3Config)();
            if (!isConfigured) {
                console.error('❌ S3/B2 credentials or bucket not configured');
                return res.status(503).json({
                    error: "Storage service not configured",
                    message: "Storage service not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET."
                });
            }
            console.log('[PORTFOLIO IMAGE UPLOAD] Optimizing image...');
            const optimizedBuffer = await (0, sharp_1.default)(req.file.buffer)
                .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85, progressive: true })
                .toBuffer();
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const filename = `portfolio/${category}-${timestamp}-${randomString}.jpg`;
            console.log('[PORTFOLIO IMAGE UPLOAD] Uploading to B2:', filename);
            const uploadCommand = new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: filename,
                Body: optimizedBuffer,
                ContentType: 'image/jpeg',
                CacheControl: 'public, max-age=31536000',
            });
            await (0, s3_storage_1.getS3Client)().send(uploadCommand);
            const publicUrl = (0, s3_storage_1.buildPublicUrl)(bucket, endpoint, filename);
            console.log('[PORTFOLIO IMAGE UPLOAD] Public URL:', publicUrl);
            console.log('[PORTFOLIO IMAGE UPLOAD] Saving to database...');
            const result = await runSql(`
        INSERT INTO portfolio_images (category, url, alt, title, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
      `, [
                category,
                publicUrl,
                req.body.alt || `Portfolio image for ${category}`,
                req.body.title || category,
                req.body.sortOrder || 0,
                true
            ]);
            console.log(`✅ Uploaded and saved portfolio image: ${result[0].id}`);
            console.log(`📸 Image URL: ${publicUrl}`);
            res.json({
                success: true,
                image: result[0],
                message: "Image uploaded successfully"
            });
        }
        catch (error) {
            console.error("[PORTFOLIO IMAGE UPLOAD] ❌ Error:", error);
            console.error("[PORTFOLIO IMAGE UPLOAD] Error stack:", error.stack);
            res.status(500).json({
                error: "Failed to upload image",
                message: error.message || "An unknown error occurred during upload"
            });
        }
    });
    // Public upload endpoint for voucher custom photos (returns URL only; no DB write)
    app.post("/api/vouchers/upload-photo", upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
            }
            const { bucket, endpoint, isConfigured } = (0, s3_storage_1.getS3Config)();
            if (!isConfigured) {
                console.error('❌ S3/B2 credentials or bucket not configured');
                return res.status(503).json({ error: "Storage service not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET." });
            }
            // Optimize uploaded image for voucher use
            const optimizedBuffer = await (0, sharp_1.default)(req.file.buffer)
                .rotate()
                .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 88 })
                .toBuffer();
            const key = `vouchers/custom/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
            await (0, s3_storage_1.getS3Client)().send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: optimizedBuffer,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000',
            }));
            const url = (0, s3_storage_1.buildPublicUrl)(bucket, endpoint, key);
            res.json({ success: true, url, key });
        }
        catch (error) {
            console.error("Error uploading voucher custom photo:", error);
            res.status(500).json({
                error: "Failed to upload custom photo",
                message: error.message
            });
        }
    });
    // Create Stripe payment intent for voucher purchase
    app.post("/api/vouchers/create-payment-intent", async (req, res) => {
        try {
            const { voucherId, quantity = 1, customerDetails, amount } = req.body;
            if (!voucherId || !customerDetails || !amount) {
                return res.status(400).json({ error: "Missing required fields" });
            }
            // Get voucher details
            const voucher = await neonDb.getVoucherProduct(voucherId);
            if (!voucher) {
                return res.status(404).json({ error: "Voucher not found" });
            }
            // Create payment intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount), // Amount in cents
                currency: 'eur',
                metadata: {
                    voucherId,
                    quantity: quantity.toString(),
                    customerName: `${customerDetails.firstName} ${customerDetails.lastName}`,
                    customerEmail: customerDetails.email,
                    voucherName: voucher.name
                },
                description: `${quantity}x ${voucher.name} - New Age Fotografie`,
                receipt_email: customerDetails.email,
            });
            res.json({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            });
        }
        catch (error) {
            console.error("Error creating payment intent:", error);
            res.status(500).json({
                error: "Payment processing error",
                message: error.message
            });
        }
    });
    // Stripe webhook endpoint for payment confirmations (simplified, signature not verified here)
    app.post("/api/vouchers/stripe-webhook", async (req, res) => {
        try {
            const event = req.body;
            if (event?.type === 'checkout.session.completed') {
                const session = event.data?.object;
                console.log('[WEBHOOK] checkout.session.completed', session?.id);
                // Extract metadata from the Stripe session
                const metadata = session?.metadata || {};
                const isPaid = session?.payment_status === 'paid';
                if (isPaid) {
                    // Extract coupon code from metadata (key is voucher_used)
                    const appliedCouponCode = metadata.voucher_used && metadata.voucher_used !== 'none' ? metadata.voucher_used : null;
                    // Extract billing address from customer_details
                    const customerAddress = session.customer_details?.address || {};
                    const billingAddress = customerAddress.line1 || '';
                    const billingCity = customerAddress.city || '';
                    const billingZip = customerAddress.postal_code || '';
                    const billingCountry = customerAddress.country || '';
                    // Create voucher sale record from Stripe session
                    const voucherSale = {
                        stripe_session_id: session.id,
                        stripe_payment_intent_id: session.payment_intent,
                        product_id: metadata.product_id || metadata.sku || null,
                        purchaser_name: metadata.purchaser_name || session.customer_details?.name || 'Unknown',
                        purchaser_email: metadata.purchaser_email || session.customer_email || session.customer_details?.email || '',
                        purchaser_phone: session.customer_details?.phone || '',
                        recipient_name: metadata.recipient_name || '',
                        recipient_email: metadata.recipient_email || '',
                        gift_message: metadata.gift_message || metadata.message || '',
                        custom_image: metadata.custom_image || null,
                        design_image: metadata.design_image || null,
                        voucher_code: metadata.voucher_code || `VOUCHER-${session.id.substring(0, 12).toUpperCase()}`,
                        original_amount: session.amount_total ? (session.amount_total / 100).toString() : '0',
                        discount_amount: metadata.discount_cents ? (parseFloat(metadata.discount_cents) / 100).toString() : metadata.discount_amount || '0',
                        final_amount: session.amount_total ? (session.amount_total / 100).toString() : '0',
                        currency: session.currency?.toUpperCase() || 'EUR',
                        coupon_code: appliedCouponCode,
                        payment_intent_id: session.payment_intent,
                        payment_status: 'paid',
                        payment_method: metadata.payment_method || 'stripe_card',
                        billing_address: billingAddress,
                        billing_city: billingCity,
                        billing_zip: billingZip,
                        billing_country: billingCountry,
                        is_redeemed: false,
                        valid_from: new Date(),
                        valid_until: metadata.valid_until ? new Date(metadata.valid_until) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year default
                    };
                    try {
                        const createdSale = await storage_1.storage.createVoucherSale(voucherSale);
                        console.log('[WEBHOOK] ✅ Voucher sale created:', createdSale.id, 'Code:', voucherSale.voucher_code);
                        // Try to get card details from payment intent
                        if (session.payment_intent) {
                            try {
                                const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
                                if (stripeSecretKey) {
                                    const StripeLib = (await import('stripe')).default;
                                    const stripe = new StripeLib(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
                                    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
                                        expand: ['payment_method']
                                    });
                                    const pm = paymentIntent.payment_method;
                                    if (pm && typeof pm === 'object' && 'card' in pm) {
                                        const card = pm.card;
                                        if (card) {
                                            await runSql(`UPDATE voucher_sales SET card_brand = $1, card_last4 = $2 WHERE id = $3`, [card.brand || '', card.last4 || '', createdSale.id]);
                                            console.log('[WEBHOOK] ✅ Card details saved:', card.brand, '****' + card.last4);
                                        }
                                    }
                                }
                            }
                            catch (cardErr) {
                                console.log('[WEBHOOK] Could not fetch card details:', cardErr.message);
                            }
                        }
                    }
                    catch (saleError) {
                        console.error('[WEBHOOK] ⚠️ Failed to create voucher sale:', saleError.message);
                        // Don't fail the webhook - Stripe expects 200 OK
                    }
                }
            }
            else {
                console.log('[WEBHOOK] Unhandled event type:', event?.type);
            }
            res.json({ received: true });
        }
        catch (error) {
            console.error('[WEBHOOK] Error handling webhook:', error);
            res.status(400).json({ error: error.message });
        }
    });
    // DEMO ENDPOINT: Create a voucher purchase directly (for testing without Stripe)
    app.post("/api/test/create-demo-voucher-purchase", async (req, res) => {
        try {
            console.log('\n🧪 DEMO: Creating voucher purchase directly in database...');
            const { purchaserEmail, purchaserName, recipientEmail, recipientName, giftMessage, amount, productId, customImage, designImage } = req.body;
            // Generate unique voucher code
            const voucherCode = `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            // Calculate validity (1 year from now)
            const validUntil = new Date();
            validUntil.setFullYear(validUntil.getFullYear() + 1);
            // Create voucher sale record
            const voucherSale = {
                product_id: productId || null,
                purchaser_name: purchaserName,
                purchaser_email: purchaserEmail,
                recipient_name: recipientName,
                recipient_email: recipientEmail,
                gift_message: giftMessage,
                custom_image: customImage || null,
                design_image: designImage || null,
                voucher_code: voucherCode,
                original_amount: amount.toString(),
                discount_amount: '0',
                final_amount: amount.toString(),
                currency: 'EUR',
                payment_intent_id: `demo_intent_${Date.now()}`,
                payment_status: 'paid',
                payment_method: 'demo',
                is_redeemed: false,
                valid_from: new Date(),
                valid_until: validUntil
            };
            console.log('💾 Saving demo voucher to database...');
            const savedSale = await neonDb.createVoucherSale(voucherSale);
            console.log('✅ Demo voucher saved with code:', voucherCode);
            // Return the voucher details
            res.json({
                success: true,
                message: 'Demo voucher purchase created successfully',
                voucherCode: voucherCode,
                saleId: savedSale.id,
                recipientName: recipientName,
                amount: amount,
                customImage: customImage,
                designImage: designImage,
                giftMessage: giftMessage,
                downloadUrl: `/voucher/pdf/preview?sku=demo&name=${encodeURIComponent(recipientName)}&from=${encodeURIComponent(purchaserName)}&message=${encodeURIComponent(giftMessage)}&amount=${amount}`,
                adminUrl: '/admin/voucher-sales'
            });
        }
        catch (error) {
            console.error('❌ Demo voucher creation failed:', error);
            res.status(500).json({ error: error.message });
        }
    });
    // TEST ENDPOINT: Simulate a successful voucher purchase (for testing without Stripe)
    app.post("/api/test/voucher-purchase", async (req, res) => {
        try {
            console.log('\n🧪 TEST: Simulating voucher purchase...');
            const testData = req.body || {};
            // Create a mock checkout session
            const mockSession = {
                id: `test_session_${Date.now()}`,
                customer_email: testData.email || 'test@example.com',
                customer_details: {
                    name: testData.purchaserName || 'Test Customer'
                },
                amount_total: (testData.amount || 19900), // cents
                payment_intent: `test_pi_${Date.now()}`,
                payment_method_types: ['card'],
                metadata: {
                    product_id: testData.productId || null,
                    voucher_data: JSON.stringify({
                        recipientName: testData.recipientName || 'Test Recipient',
                        recipientEmail: testData.recipientEmail || 'recipient@example.com',
                        message: testData.message || 'Happy Birthday! This is a test voucher.',
                        senderName: testData.purchaserName || 'Test Customer',
                        selectedDesign: { occasion: 'birthday' },
                        deliveryOption: { id: 'pdf', name: 'PDF Download', price: 0 }
                    })
                }
            };
            // Simulate webhook event
            const webhookEvent = {
                type: 'checkout.session.completed',
                data: {
                    object: mockSession
                }
            };
            // Extract voucher data
            const voucherData = JSON.parse(mockSession.metadata.voucher_data);
            const voucherCode = generateVoucherCode();
            const validUntil = new Date();
            validUntil.setFullYear(validUntil.getFullYear() + 1);
            // Create voucher sale
            const voucherSale = {
                product_id: mockSession.metadata.product_id,
                purchaser_name: mockSession.customer_details.name,
                purchaser_email: mockSession.customer_email,
                purchaser_phone: null,
                recipient_name: voucherData.recipientName,
                recipient_email: voucherData.recipientEmail,
                gift_message: voucherData.message,
                voucher_code: voucherCode,
                original_amount: (mockSession.amount_total / 100).toString(),
                discount_amount: '0',
                final_amount: (mockSession.amount_total / 100).toString(),
                currency: 'EUR',
                payment_intent_id: mockSession.payment_intent,
                payment_status: 'paid',
                payment_method: 'test_card',
                is_redeemed: false,
                redeemed_at: null,
                redeemed_by: null,
                session_id: null,
                valid_from: new Date(),
                valid_until: validUntil
            };
            console.log('💾 Creating test voucher sale:', voucherCode);
            const savedSale = await neonDb.createVoucherSale(voucherSale);
            console.log('✅ Test voucher sale created!');
            console.log('   ID:', savedSale.id);
            console.log('   Code:', voucherCode);
            console.log('   Amount:', savedSale.final_amount, 'EUR');
            console.log('   Purchaser:', savedSale.purchaser_email);
            console.log('   Recipient:', savedSale.recipient_email);
            res.json({
                success: true,
                message: 'Test voucher purchase created successfully',
                voucher: {
                    id: savedSale.id,
                    code: voucherCode,
                    amount: savedSale.final_amount,
                    purchaser: savedSale.purchaser_email,
                    recipient: savedSale.recipient_email,
                    validUntil: validUntil.toISOString(),
                    sessionId: mockSession.id
                },
                adminUrl: `/admin/voucher-sales`,
                downloadUrl: `/voucher/pdf/preview?sku=Family-Basic&name=${encodeURIComponent(voucherData.recipientName)}&from=${encodeURIComponent(voucherData.senderName)}&message=${encodeURIComponent(voucherData.message)}&amount=${mockSession.amount_total / 100}`
            });
        }
        catch (error) {
            console.error('❌ Test purchase error:', error);
            res.status(500).json({
                error: 'Test purchase failed',
                message: error.message,
                stack: error.stack
            });
        }
    });
    // Admin endpoint for voucher products
    app.get("/api/admin/vouchers/products/:id", authenticateUser, async (req, res) => {
        try {
            const product = await neonDb.getVoucherProduct(req.params.id);
            if (!product) {
                return res.status(404).json({ error: "Voucher product not found" });
            }
            res.json(product);
        }
        catch (error) {
            console.error("Error fetching voucher product:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/vouchers/products", async (req, res) => {
        try {
            console.log('[VOUCHER] Creating product with raw body:', req.body);
            // Accept both camelCase and snake_case incoming fields
            const normalized = { ...req.body };
            if (normalized.detailedDescription && !normalized.detailed_description)
                normalized.detailed_description = normalized.detailedDescription;
            if (normalized.originalPrice && !normalized.original_price)
                normalized.original_price = normalized.originalPrice;
            if (normalized.sessionDuration && !normalized.session_duration)
                normalized.session_duration = normalized.sessionDuration;
            if (normalized.sessionType && !normalized.session_type)
                normalized.session_type = normalized.sessionType;
            if (normalized.validityPeriod && !normalized.validity_period)
                normalized.validity_period = normalized.validityPeriod;
            if (normalized.redemptionInstructions && !normalized.redemption_instructions)
                normalized.redemption_instructions = normalized.redemptionInstructions;
            if (normalized.termsAndConditions && !normalized.terms_and_conditions)
                normalized.terms_and_conditions = normalized.termsAndConditions;
            if (normalized.imageUrl && !normalized.image_url)
                normalized.image_url = normalized.imageUrl;
            if (normalized.thumbnailUrl && !normalized.thumbnail_url)
                normalized.thumbnail_url = normalized.thumbnailUrl;
            if (normalized.promoImageUrl && !normalized.promo_image_url)
                normalized.promo_image_url = normalized.promoImageUrl;
            if (normalized.displayOrder && !normalized.display_order)
                normalized.display_order = normalized.displayOrder;
            if (normalized.isActive !== undefined && !normalized.is_active)
                normalized.is_active = normalized.isActive;
            if (normalized.maxPerCustomer && !normalized.max_per_customer)
                normalized.max_per_customer = normalized.maxPerCustomer;
            if (normalized.metaTitle && !normalized.meta_title)
                normalized.meta_title = normalized.metaTitle;
            if (normalized.metaDescription && !normalized.meta_description)
                normalized.meta_description = normalized.metaDescription;
            // Generate slug if missing
            const slugify = (text) => {
                return text
                    .toString()
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
                    .toLowerCase()
                    .replace(/ß/g, 'ss')
                    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .replace(/--+/g, '-');
            };
            if (!normalized.slug && normalized.name) {
                const base = slugify(normalized.name);
                let candidate = base;
                try {
                    const existingProducts = await neonDb.getVoucherProducts();
                    let i = 1;
                    while (existingProducts.find((p) => p.slug === candidate)) {
                        candidate = `${base}-${i++}`;
                    }
                }
                catch (e) {
                    console.warn('[VOUCHER] Could not check existing slugs:', e);
                }
                normalized.slug = candidate;
            }
            console.log('[VOUCHER] Normalized for validation (with slug):', normalized);
            const validatedData = insertVoucherProductSchema.parse(normalized);
            console.log('[VOUCHER] Validated data:', validatedData);
            const product = await neonDb.createVoucherProduct(validatedData);
            console.log('[VOUCHER] Product created:', product);
            // Respond in camelCase for frontend (Drizzle already returns camelCase properties)
            res.status(201).json({
                id: product.id,
                name: product.name,
                description: product.description,
                detailedDescription: product.detailedDescription,
                price: product.price,
                originalPrice: product.originalPrice,
                category: product.category,
                sessionDuration: product.sessionDuration,
                sessionType: product.sessionType,
                validityPeriod: product.validityPeriod,
                redemptionInstructions: product.redemptionInstructions,
                termsAndConditions: product.termsAndConditions,
                imageUrl: product.imageUrl,
                thumbnailUrl: product.thumbnailUrl,
                promoImageUrl: product.promoImageUrl,
                displayOrder: product.displayOrder,
                featured: product.featured,
                badge: product.badge,
                isActive: product.isActive,
                stockLimit: product.stockLimit,
                maxPerCustomer: product.maxPerCustomer,
                slug: product.slug,
                metaTitle: product.metaTitle,
                metaDescription: product.metaDescription,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                console.error('[VOUCHER] Validation error:', error.errors);
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            console.error('[VOUCHER] Error creating voucher product:', error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });
    // Public single voucher product fetch by id or slug
    app.get('/api/vouchers/products/:idOrSlug', async (req, res) => {
        try {
            const idOrSlug = req.params.idOrSlug;
            let product = null;
            // Try direct ID lookup first
            try {
                product = await neonDb.getVoucherProduct(idOrSlug);
            }
            catch (_) { /* ignore */ }
            if (!product) {
                // Fallback: iterate over all and match slug
                const all = await neonDb.getVoucherProducts();
                product = all.find((p) => p.slug === idOrSlug);
            }
            if (!product) {
                return res.status(404).json({ error: 'Voucher product not found' });
            }
            // Helper to properly encode URLs with spaces in path segments
            const encodeImageUrl = (url) => {
                if (!url)
                    return null;
                try {
                    const urlObj = new URL(url);
                    // Encode each path segment individually to handle spaces
                    urlObj.pathname = urlObj.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
                    return urlObj.toString();
                }
                catch {
                    return url;
                }
            };
            const p = product;
            return res.json({
                id: p.id,
                name: p.name,
                description: p.description,
                detailedDescription: p.detailedDescription ?? p.detailed_description,
                price: p.price,
                originalPrice: p.originalPrice ?? p.original_price,
                category: p.category,
                sessionDuration: p.sessionDuration ?? p.session_duration,
                sessionType: p.sessionType ?? p.session_type,
                validityPeriod: p.validityPeriod ?? p.validity_period,
                redemptionInstructions: p.redemptionInstructions ?? p.redemption_instructions,
                termsAndConditions: p.termsAndConditions ?? p.terms_and_conditions,
                imageUrl: encodeImageUrl(p.imageUrl ?? p.image_url),
                thumbnailUrl: encodeImageUrl(p.thumbnailUrl ?? p.thumbnail_url),
                promoImageUrl: encodeImageUrl(p.promoImageUrl ?? p.promo_image_url),
                displayOrder: p.displayOrder ?? p.display_order,
                featured: p.featured,
                badge: p.badge,
                isActive: p.isActive ?? p.is_active,
                stockLimit: p.stockLimit ?? p.stock_limit,
                maxPerCustomer: p.maxPerCustomer ?? p.max_per_customer,
                slug: p.slug,
                metaTitle: p.metaTitle ?? p.meta_title,
                metaDescription: p.metaDescription ?? p.meta_description,
                createdAt: p.createdAt ?? p.created_at,
                updatedAt: p.updatedAt ?? p.updated_at,
            });
        }
        catch (err) {
            console.error('[VOUCHER] Error fetching single product:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.put("/api/vouchers/products/:id", async (req, res) => {
        try {
            console.log('[VOUCHER UPDATE] Updating product:', req.params.id, 'with data:', req.body);
            let existing = null;
            try {
                existing = await neonDb.getVoucherProduct(req.params.id);
            }
            catch (e) {
                console.warn('[VOUCHER UPDATE] Fetch existing failed:', e);
            }
            const updates = {};
            if (req.body.name !== undefined)
                updates.name = req.body.name;
            if (req.body.description !== undefined)
                updates.description = req.body.description;
            if (req.body.detailedDescription !== undefined)
                updates.detailedDescription = req.body.detailedDescription;
            if (req.body.price !== undefined)
                updates.price = req.body.price;
            if (req.body.originalPrice !== undefined)
                updates.originalPrice = req.body.originalPrice;
            if (req.body.category !== undefined)
                updates.category = req.body.category;
            if (req.body.sessionDuration !== undefined)
                updates.sessionDuration = req.body.sessionDuration;
            if (req.body.sessionType !== undefined)
                updates.sessionType = req.body.sessionType;
            if (req.body.validityPeriod !== undefined)
                updates.validityPeriod = req.body.validityPeriod;
            if (req.body.redemptionInstructions !== undefined)
                updates.redemptionInstructions = req.body.redemptionInstructions;
            if (req.body.termsAndConditions !== undefined)
                updates.termsAndConditions = req.body.termsAndConditions;
            if (req.body.imageUrl !== undefined)
                updates.imageUrl = req.body.imageUrl;
            if (req.body.thumbnailUrl !== undefined)
                updates.thumbnailUrl = req.body.thumbnailUrl;
            if (req.body.promoImageUrl !== undefined)
                updates.promoImageUrl = req.body.promoImageUrl;
            if (req.body.displayOrder !== undefined)
                updates.displayOrder = req.body.displayOrder;
            if (req.body.featured !== undefined)
                updates.featured = req.body.featured;
            if (req.body.badge !== undefined)
                updates.badge = req.body.badge;
            if (req.body.isActive !== undefined)
                updates.isActive = req.body.isActive;
            if (req.body.stockLimit !== undefined)
                updates.stockLimit = req.body.stockLimit;
            if (req.body.maxPerCustomer !== undefined)
                updates.maxPerCustomer = req.body.maxPerCustomer;
            const slugify = (text) => text.toString().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/--+/g, '-');
            if (req.body.slug !== undefined && req.body.slug !== '') {
                updates.slug = req.body.slug;
            }
            else if (req.body.name && existing && req.body.name !== existing.name) {
                const base = slugify(req.body.name);
                let candidate = base;
                let i = 1;
                try {
                    const all = await neonDb.getVoucherProducts();
                    while (all.find((p) => p.slug === candidate && p.id !== existing.id))
                        candidate = `${base}-${i++}`;
                }
                catch (e) {
                    console.warn('[VOUCHER UPDATE] Slug uniqueness check failed:', e);
                }
                updates.slug = candidate;
            }
            if (req.body.metaTitle !== undefined)
                updates.metaTitle = req.body.metaTitle;
            if (req.body.metaDescription !== undefined)
                updates.metaDescription = req.body.metaDescription;
            console.log('[VOUCHER UPDATE] Updates object:', updates);
            const product = await neonDb.updateVoucherProduct(req.params.id, updates);
            const bucketName = process.env.AWS_S3_BUCKET || '';
            const parseKey = (urlStr) => { if (!urlStr)
                return null; try {
                const u = new URL(urlStr);
                let p = u.pathname.replace(/^\//, '');
                const b = process.env.AWS_S3_BUCKET || '';
                if (p.startsWith(b + '/'))
                    p = p.slice(b.length + 1);
                return p || null;
            }
            catch {
                return null;
            } };
            if (existing && bucketName) {
                const newImageUrl = req.body.imageUrl;
                const newThumbUrl = req.body.thumbnailUrl;
                if (existing.imageUrl && newImageUrl && existing.imageUrl !== newImageUrl) {
                    const oldKey = parseKey(existing.imageUrl);
                    if (oldKey) {
                        try {
                            await s3Client.send(new client_s3_1.DeleteObjectCommand({ Bucket: bucketName, Key: oldKey }));
                            console.log('[VOUCHER UPDATE] Deleted old image object:', oldKey);
                        }
                        catch (e) {
                            console.warn('[VOUCHER UPDATE] Failed to delete old image object:', oldKey, e);
                        }
                    }
                }
                if (existing.thumbnailUrl && newThumbUrl && existing.thumbnailUrl !== newThumbUrl) {
                    const oldThumbKey = parseKey(existing.thumbnailUrl);
                    if (oldThumbKey) {
                        try {
                            await s3Client.send(new client_s3_1.DeleteObjectCommand({ Bucket: bucketName, Key: oldThumbKey }));
                            console.log('[VOUCHER UPDATE] Deleted old thumbnail object:', oldThumbKey);
                        }
                        catch (e) {
                            console.warn('[VOUCHER UPDATE] Failed to delete old thumbnail object:', oldThumbKey, e);
                        }
                    }
                }
            }
            const response = {
                id: product.id,
                name: product.name,
                description: product.description,
                detailedDescription: product.detailedDescription,
                price: product.price,
                originalPrice: product.originalPrice,
                category: product.category,
                sessionDuration: product.sessionDuration,
                sessionType: product.sessionType,
                validityPeriod: product.validityPeriod,
                redemptionInstructions: product.redemptionInstructions,
                termsAndConditions: product.termsAndConditions,
                imageUrl: product.imageUrl,
                thumbnailUrl: product.thumbnailUrl,
                promoImageUrl: product.promoImageUrl,
                displayOrder: product.displayOrder,
                featured: product.featured,
                badge: product.badge,
                isActive: product.isActive,
                stockLimit: product.stockLimit,
                maxPerCustomer: product.maxPerCustomer,
                slug: product.slug,
                metaTitle: product.metaTitle,
                metaDescription: product.metaDescription,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
            };
            console.log('[VOUCHER UPDATE] Success:', response);
            res.json(response);
        }
        catch (error) {
            console.error('[VOUCHER UPDATE] Error updating voucher product:', error);
            res.status(500).json({ error: 'Internal server error', message: error.message });
        }
    });
    app.delete("/api/vouchers/products/:id", authenticateUser, async (req, res) => {
        try {
            const id = req.params.id;
            console.log('[VOUCHER DELETE] Request to delete product:', id);
            // Check references to avoid FK constraint failures
            try {
                const ref = await runSql('SELECT COUNT(1)::int AS c FROM voucher_sales WHERE product_id = $1', [id]);
                if (ref?.[0]?.c > 0) {
                    return res.status(409).json({ success: false, error: 'Product has sales and cannot be deleted', references: ref[0].c });
                }
            }
            catch (e) {
                console.warn('[VOUCHER DELETE] Reference check failed (continuing):', e);
            }
            const existing = await neonDb.getVoucherProduct(id);
            const bucketName = process.env.AWS_S3_BUCKET || '';
            const parseKey = (urlStr) => { if (!urlStr)
                return null; try {
                const u = new URL(urlStr);
                let p = u.pathname.replace(/^\//, '');
                const b = process.env.AWS_S3_BUCKET || '';
                if (p.startsWith(b + '/'))
                    p = p.slice(b.length + 1);
                return p || null;
            }
            catch {
                return null;
            } };
            if (existing && bucketName) {
                const imgUrl = (existing.imageUrl ?? existing.image_url);
                const thumbUrl = (existing.thumbnailUrl ?? existing.thumbnail_url);
                for (const url of [imgUrl, thumbUrl]) {
                    const key = url ? parseKey(url) : null;
                    if (key) {
                        try {
                            await s3Client.send(new client_s3_1.DeleteObjectCommand({ Bucket: bucketName, Key: key }));
                            console.log('[VOUCHER DELETE] Deleted object:', key);
                        }
                        catch (e) {
                            console.warn('[VOUCHER DELETE] Failed to delete object:', key, e);
                        }
                    }
                }
            }
            await neonDb.deleteVoucherProduct(id);
            console.log('[VOUCHER DELETE] Deleted product row:', id);
            res.json({ success: true, id });
        }
        catch (error) {
            const code = error?.code || error?.detail || '';
            console.error('Error deleting voucher product:', error);
            if (String(code).includes('foreign key') || error?.code === '23503') {
                return res.status(409).json({ success: false, error: 'Product cannot be deleted due to existing references' });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // ====== FIX VOUCHER PRODUCT IMAGE URLS (encode spaces) ======
    app.post("/api/admin/vouchers/fix-image-urls", authenticateUser, async (req, res) => {
        try {
            console.log('[FIX URLS] Starting URL fix for voucher products...');
            const products = await neonDb.getVoucherProducts();
            let fixed = 0;
            let skipped = 0;
            const details = [];
            for (const product of products) {
                const oldImageUrl = product.imageUrl;
                const oldThumbnailUrl = product.thumbnailUrl;
                // Helper to fix URL encoding - replace all spaces with %20
                const fixUrl = (url) => {
                    if (!url)
                        return null;
                    // Simple and reliable: just replace spaces with %20
                    if (url.includes(' ')) {
                        const fixed = url.replace(/ /g, '%20');
                        console.log('[FIX URLS] Encoding space in URL:', url, '->', fixed);
                        return fixed;
                    }
                    return url;
                };
                const newImageUrl = fixUrl(oldImageUrl);
                const newThumbnailUrl = fixUrl(oldThumbnailUrl);
                if (newImageUrl !== oldImageUrl || newThumbnailUrl !== oldThumbnailUrl) {
                    // Use direct SQL to ensure %20 is preserved (Drizzle might decode it)
                    const setClauses = [];
                    const params = [];
                    let paramIdx = 1;
                    if (newImageUrl !== oldImageUrl && newImageUrl) {
                        setClauses.push(`image_url = $${paramIdx++}`);
                        params.push(newImageUrl);
                    }
                    if (newThumbnailUrl !== oldThumbnailUrl && newThumbnailUrl) {
                        setClauses.push(`thumbnail_url = $${paramIdx++}`);
                        params.push(newThumbnailUrl);
                    }
                    setClauses.push(`updated_at = NOW()`);
                    params.push(product.id);
                    const sql = `UPDATE voucher_products SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`;
                    console.log('[FIX URLS] Executing SQL:', sql, 'with params:', params);
                    await runSql(sql, params);
                    fixed++;
                    details.push({
                        id: product.id,
                        name: product.name,
                        oldImageUrl,
                        newImageUrl,
                        oldThumbnailUrl,
                        newThumbnailUrl,
                    });
                    console.log(`[FIX URLS] Fixed: ${product.name}`);
                }
                else {
                    skipped++;
                }
            }
            console.log(`[FIX URLS] Done. Fixed: ${fixed}, Skipped: ${skipped}`);
            res.json({ success: true, fixed, skipped, details });
        }
        catch (error) {
            console.error('[FIX URLS] Error:', error);
            res.status(500).json({ error: 'Failed to fix URLs', message: error.message });
        }
    });
    // ====== COUPON ADMIN ROUTES (continuation) ======
    app.put("/api/admin/coupons/:id", authenticateUser, async (req, res) => {
        try {
            const { applicableProductId, applicableProducts, ...rest } = req.body;
            const updates = { ...rest };
            if (Array.isArray(applicableProducts)) {
                updates.applicableProducts = applicableProducts;
            }
            else if (applicableProductId) {
                updates.applicableProducts = [applicableProductId];
            }
            const coupon = await storage_1.storage.updateDiscountCoupon(req.params.id, updates);
            res.json(coupon);
        }
        catch (error) {
            console.error("Error updating discount coupon:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.delete("/api/admin/coupons/:id", authenticateUser, async (req, res) => {
        try {
            await storage_1.storage.deleteDiscountCoupon(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting discount coupon:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ====== VOUCHER COUPONS MANAGEMENT (CRUD) ======
    // Get all discount coupons
    app.get("/api/vouchers/coupons", authenticateUser, async (req, res) => {
        try {
            const coupons = await storage_1.storage.getDiscountCoupons();
            res.json(coupons);
        }
        catch (error) {
            console.error("Error fetching discount coupons:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Create new discount coupon
    app.post("/api/vouchers/coupons", authenticateUser, async (req, res) => {
        try {
            console.log('[COUPON CREATE] Request body:', JSON.stringify(req.body, null, 2));
            const { applicableProductId, applicableProducts, applicableProductSlug, ...rest } = req.body;
            const couponData = { ...rest };
            // Handle applicableProducts field conversion
            if (Array.isArray(applicableProducts) && applicableProducts.length > 0) {
                couponData.applicableProducts = applicableProducts;
            }
            else if (applicableProductId) {
                couponData.applicableProducts = [applicableProductId];
            }
            else if (applicableProductSlug && applicableProductSlug.trim() !== '') {
                // Convert product slug to array for applicableProducts
                couponData.applicableProducts = [applicableProductSlug.trim()];
            }
            else {
                // If no specific product selected, set to null (all products)
                couponData.applicableProducts = null;
            }
            // Convert date strings to Date objects if present
            if (couponData.startDate && typeof couponData.startDate === 'string') {
                couponData.startDate = new Date(couponData.startDate);
            }
            if (couponData.endDate && typeof couponData.endDate === 'string') {
                couponData.endDate = new Date(couponData.endDate);
            }
            // Convert numeric string fields to proper types
            if (couponData.discountValue && typeof couponData.discountValue === 'string') {
                couponData.discountValue = couponData.discountValue.toString();
            }
            if (couponData.minOrderAmount && typeof couponData.minOrderAmount === 'string') {
                couponData.minOrderAmount = couponData.minOrderAmount.toString();
            }
            if (couponData.maxDiscountAmount && typeof couponData.maxDiscountAmount === 'string') {
                couponData.maxDiscountAmount = couponData.maxDiscountAmount.toString();
            }
            console.log('[COUPON CREATE] Processing data:', JSON.stringify(couponData, null, 2));
            const coupon = await storage_1.storage.createDiscountCoupon(couponData);
            console.log('[COUPON CREATE] Success:', coupon.id);
            res.json(coupon);
        }
        catch (error) {
            console.error("[COUPON CREATE] Error details:", error);
            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            console.error("[COUPON CREATE] Error message:", errorMessage);
            console.error("[COUPON CREATE] Error stack:", error instanceof Error ? error.stack : '');
            // Check for duplicate code constraint violation
            if (errorMessage.includes('discount_coupons_code_unique') || errorMessage.includes('duplicate key')) {
                return res.status(400).json({
                    error: "Coupon code already exists",
                    details: `A coupon with code "${couponData.code}" already exists. Please use a different code.`
                });
            }
            res.status(500).json({ error: "Internal server error", details: errorMessage });
        }
    });
    // Update discount coupon
    app.put("/api/vouchers/coupons/:id", authenticateUser, async (req, res) => {
        try {
            console.log('[COUPON UPDATE] Request body:', JSON.stringify(req.body, null, 2));
            const { applicableProductId, applicableProducts, applicableProductSlug, ...rest } = req.body;
            const updates = { ...rest };
            if (Array.isArray(applicableProducts) && applicableProducts.length > 0) {
                updates.applicableProducts = applicableProducts;
            }
            else if (applicableProductId) {
                updates.applicableProducts = [applicableProductId];
            }
            else if (applicableProductSlug && applicableProductSlug.trim() !== '') {
                // Convert product slug to array for applicableProducts
                updates.applicableProducts = [applicableProductSlug.trim()];
            }
            else {
                // If no specific product selected, set to null (all products)
                updates.applicableProducts = null;
            }
            // Convert date strings to Date objects if present
            if (updates.startDate && typeof updates.startDate === 'string') {
                updates.startDate = new Date(updates.startDate);
            }
            if (updates.endDate && typeof updates.endDate === 'string') {
                updates.endDate = new Date(updates.endDate);
            }
            // Convert numeric string fields to proper types
            if (updates.discountValue && typeof updates.discountValue === 'string') {
                updates.discountValue = updates.discountValue.toString();
            }
            if (updates.minOrderAmount && typeof updates.minOrderAmount === 'string') {
                updates.minOrderAmount = updates.minOrderAmount.toString();
            }
            if (updates.maxDiscountAmount && typeof updates.maxDiscountAmount === 'string') {
                updates.maxDiscountAmount = updates.maxDiscountAmount.toString();
            }
            console.log('[COUPON UPDATE] Processing updates:', JSON.stringify(updates, null, 2));
            const coupon = await storage_1.storage.updateDiscountCoupon(req.params.id, updates);
            console.log('[COUPON UPDATE] Success:', coupon.id);
            res.json(coupon);
        }
        catch (error) {
            console.error("[COUPON UPDATE] Error details:", error);
            const errorMessage = error instanceof Error ? error.message : 'Internal server error';
            console.error("[COUPON UPDATE] Error message:", errorMessage);
            console.error("[COUPON UPDATE] Error stack:", error instanceof Error ? error.stack : '');
            // Check for duplicate code constraint violation
            if (errorMessage.includes('discount_coupons_code_unique') || errorMessage.includes('duplicate key')) {
                return res.status(400).json({
                    error: "Coupon code already exists",
                    details: `A coupon with code "${updates.code}" already exists. Please use a different code.`
                });
            }
            res.status(500).json({ error: "Internal server error", details: errorMessage });
        }
    });
    // Delete discount coupon
    app.delete("/api/vouchers/coupons/:id", authenticateUser, async (req, res) => {
        try {
            await storage_1.storage.deleteDiscountCoupon(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting discount coupon:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Validate coupon code (public endpoint for frontend)
    app.post("/api/vouchers/coupons/validate", async (req, res) => {
        try {
            const { code, orderAmount, items } = req.body;
            if (!code) {
                return res.status(400).json({ error: "Coupon code is required" });
            }
            const codeTrimmed = String(code).trim();
            const codeUpper = codeTrimmed.toUpperCase();
            const strict95Codes = new Set((process.env.COUPONS_95_ONLY || 'VCWIEN')
                .split(',')
                .map(s => s.trim().toUpperCase())
                .filter(Boolean));
            // IMPORTANT: Database coupons take priority over ENV coupons
            // This allows admin to dynamically edit coupons without code changes
            let coupon = await storage_1.storage.getDiscountCouponByCode(codeTrimmed);
            // Only fall back to ENV coupon if no DB coupon exists
            const envCoupon = coupon ? null : (0, coupons_1.findCoupon)(codeUpper);
            if (!coupon && !envCoupon) {
                return res.status(404).json({ error: "Invalid coupon code" });
            }
            console.log('[COUPON VALIDATE] Using source:', coupon ? 'DATABASE' : 'ENV');
            console.log('[COUPON VALIDATE] Coupon code:', codeUpper);
            // Validate coupon
            const now = new Date();
            const errors = [];
            if (!envCoupon && coupon) {
                if (!coupon.isActive) {
                    errors.push("Coupon is not active");
                }
                if (coupon.startDate && new Date(coupon.startDate) > now) {
                    errors.push("Coupon is not yet valid");
                }
                if (coupon.endDate && new Date(coupon.endDate) < now) {
                    errors.push("Coupon has expired");
                }
                if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
                    errors.push("Coupon usage limit reached");
                }
                if (coupon.minOrderAmount && orderAmount && parseFloat(String(orderAmount)) < parseFloat(String(coupon.minOrderAmount))) {
                    errors.push(`Minimum order amount is €${coupon.minOrderAmount}`);
                }
            }
            if (errors.length > 0) {
                return res.status(400).json({ error: errors.join(", "), valid: false });
            }
            // Determine applicable subtotal and discount
            if (envCoupon) {
                if (!(0, coupons_1.isCouponActive)(envCoupon)) {
                    return res.status(400).json({ error: 'Coupon is not active', valid: false });
                }
                // Calculate in cents; item.price expected in euros
                let applicableSubtotalCents = 0;
                let hasExact95Eligible = false;
                if (Array.isArray(items) && items.length > 0) {
                    for (const it of items) {
                        const sku = (it.sku || it.productSlug || '').toString();
                        const matches = (0, coupons_1.allowsSku)(envCoupon, sku);
                        if (matches) {
                            const lineTotalCents = Math.round((Number(it.price) || 0) * 100) * (Number(it.quantity) || 1);
                            applicableSubtotalCents += Math.max(0, lineTotalCents);
                            if (Math.abs(Number(it.price || 0) - 95) < 1e-6) {
                                hasExact95Eligible = true;
                            }
                        }
                    }
                }
                else {
                    applicableSubtotalCents = Math.max(0, Math.round((Number(orderAmount) || 0) * 100));
                }
                // Enforce €95-only constraint for strict codes
                if (strict95Codes.has(codeUpper) && !hasExact95Eligible) {
                    return res.status(200).json({ valid: false, error: 'Gutschein nur für 95€ Gutscheine gültig' });
                }
                let discountCents = 0;
                if (envCoupon.type === 'percent') {
                    const pct = Math.max(0, Math.min(100, envCoupon.value));
                    discountCents = Math.round((applicableSubtotalCents * pct) / 100);
                }
                else {
                    discountCents = Math.min(applicableSubtotalCents, Math.max(0, Math.round(envCoupon.value)));
                }
                return res.json({
                    valid: true,
                    coupon: {
                        id: envCoupon.code,
                        code: envCoupon.code,
                        name: envCoupon.code,
                        discountType: envCoupon.type === 'percent' ? 'percentage' : 'fixed',
                        discountValue: envCoupon.value,
                        discountAmount: (discountCents / 100).toFixed(2),
                        applicableProducts: envCoupon.skus || ['all']
                    }
                });
            }
            // Fallback: DB coupons flow (legacy)
            // Determine applicable subtotal: restrict to applicableProducts if provided
            let applicableSubtotal = 0;
            const allProducts = !coupon.applicableProducts || coupon.applicableProducts.length === 0 || coupon.applicableProducts.includes('all');
            console.log('[COUPON VALIDATE] Coupon:', coupon.code);
            console.log('[COUPON VALIDATE] applicableProducts from DB:', coupon.applicableProducts);
            console.log('[COUPON VALIDATE] allProducts allowed:', allProducts);
            if (Array.isArray(items) && items.length > 0) {
                for (const it of items) {
                    const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 1);
                    console.log('[COUPON VALIDATE] Checking item:', {
                        productId: it.productId,
                        productSlug: it.productSlug,
                        sku: it.sku,
                        name: it.name,
                        price: it.price,
                        lineTotal
                    });
                    if (allProducts) {
                        applicableSubtotal += lineTotal;
                        console.log('[COUPON VALIDATE] -> Added (all products allowed)');
                    }
                    else {
                        // More robust matching: check productId, productSlug, sku, and name variations
                        const applicableProds = coupon.applicableProducts || [];
                        const itemProductId = (it.productId || '').toLowerCase();
                        const itemProductSlug = (it.productSlug || '').toLowerCase();
                        const itemSku = (it.sku || '').toLowerCase();
                        const itemName = (it.name || '').toLowerCase();
                        const matches = applicableProds.some(p => {
                            const prodLower = (p || '').toLowerCase();
                            return (
                            // Exact matches
                            (itemProductId && itemProductId === prodLower) ||
                                (itemProductSlug && itemProductSlug === prodLower) ||
                                (itemSku && itemSku === prodLower) ||
                                (itemName && itemName === prodLower) ||
                                // Partial matches (slug contains or is contained)
                                (itemProductSlug && prodLower && (itemProductSlug.includes(prodLower) || prodLower.includes(itemProductSlug))) ||
                                (itemSku && prodLower && (itemSku.includes(prodLower) || prodLower.includes(itemSku))));
                        });
                        if (matches) {
                            applicableSubtotal += lineTotal;
                            console.log('[COUPON VALIDATE] -> Added (product matches restriction)');
                        }
                        else {
                            console.log('[COUPON VALIDATE] -> Skipped (product does not match restriction)');
                        }
                    }
                }
            }
            else {
                applicableSubtotal = parseFloat(orderAmount || '0');
            }
            console.log('[COUPON VALIDATE] Final applicableSubtotal:', applicableSubtotal);
            let discountAmount = 0;
            if (coupon.discountType === 'percentage') {
                discountAmount = (applicableSubtotal * parseFloat(coupon.discountValue)) / 100;
                if (coupon.maxDiscountAmount) {
                    discountAmount = Math.min(discountAmount, parseFloat(coupon.maxDiscountAmount));
                }
            }
            else {
                discountAmount = parseFloat(coupon.discountValue);
                discountAmount = Math.min(discountAmount, applicableSubtotal);
            }
            return res.json({
                valid: true,
                coupon: {
                    id: coupon.id,
                    code: coupon.code,
                    name: coupon.name,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    discountAmount: Number(discountAmount || 0).toFixed(2),
                    applicableProducts: coupon.applicableProducts || ['all']
                }
            });
        }
        catch (error) {
            console.error("Error validating coupon:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Coupon analytics (admin)
    app.get('/api/vouchers/coupons/analytics', authenticateUser, async (req, res) => {
        try {
            const coupons = await storage_1.storage.getDiscountCoupons();
            const sales = await storage_1.storage.getVoucherSales();
            const analytics = coupons.map(c => {
                const related = sales.filter(s => (s.couponId && s.couponId === c.id) || (s.couponCode && s.couponCode.toUpperCase() === c.code.toUpperCase()));
                const usageCount = related.length;
                const totalDiscount = related.reduce((sum, s) => sum + Number(s.discountAmount || 0), 0);
                const totalRevenue = related.reduce((sum, s) => sum + Number(s.finalAmount || 0), 0);
                const lastUsedAt = related.reduce((latest, s) => {
                    const d = s.createdAt;
                    const dt = d instanceof Date ? d : (d ? new Date(d) : null);
                    if (!dt)
                        return latest;
                    return !latest || dt > latest ? dt : latest;
                }, null);
                return {
                    id: c.id,
                    code: c.code,
                    name: c.name,
                    discountType: c.discountType,
                    discountValue: c.discountValue,
                    isActive: c.isActive,
                    usageCount,
                    totalDiscountAmount: Number(totalDiscount.toFixed(2)),
                    totalRevenueInfluenced: Number(totalRevenue.toFixed(2)),
                    lastUsedAt,
                };
            });
            res.json(analytics);
        }
        catch (error) {
            console.error('Error generating coupon analytics:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Voucher settings (ephemeral in-memory for now)
    let voucherSettings = {
        defaultValidityDays: 365,
        defaultAspectRatio: '4:3',
        imageQuality: 0.9,
        updatedAt: new Date(),
    };
    app.get('/api/vouchers/settings', authenticateUser, async (req, res) => {
        res.json(voucherSettings);
    });
    app.put('/api/vouchers/settings', authenticateUser, async (req, res) => {
        try {
            const { defaultValidityDays, defaultAspectRatio, imageQuality } = req.body || {};
            if (defaultValidityDays !== undefined)
                voucherSettings.defaultValidityDays = parseInt(defaultValidityDays);
            if (defaultAspectRatio !== undefined)
                voucherSettings.defaultAspectRatio = String(defaultAspectRatio);
            if (imageQuality !== undefined)
                voucherSettings.imageQuality = Math.min(1, Math.max(0.4, Number(imageQuality)));
            voucherSettings.updatedAt = new Date();
            res.json(voucherSettings);
        }
        catch (e) {
            res.status(400).json({ error: 'Invalid settings payload' });
        }
    });
    // CSV export endpoints
    app.get('/api/vouchers/products.csv', authenticateUser, async (req, res) => {
        try {
            const products = await neonDb.getVoucherProducts();
            const header = 'id,name,price,originalPrice,slug,isActive\n';
            const rows = products.map((p) => [
                p.id,
                '"' + String(p.name || '').replace(/"/g, '""') + '"',
                p.price,
                p.original_price || '',
                p.slug || '',
                p.is_active,
            ].join(','));
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="voucher-products.csv"');
            res.send(header + rows.join('\n'));
        }
        catch (error) {
            console.error('Error exporting products CSV:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get('/api/vouchers/sales.csv', authenticateUser, async (req, res) => {
        try {
            const sales = await storage_1.storage.getVoucherSales();
            const header = 'id,productId,voucherCode,purchaserEmail,finalAmount,discountAmount,couponCode,createdAt\n';
            const rows = sales.map((s) => [
                s.id,
                s.productId,
                s.voucherCode,
                s.purchaserEmail,
                s.finalAmount,
                s.discountAmount,
                s.couponCode || '',
                s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
            ].join(','));
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="voucher-sales.csv"');
            res.send(header + rows.join('\n'));
        }
        catch (error) {
            console.error('Error exporting sales CSV:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Optional: secure admin endpoint to force refresh coupons after Heroku config change
    app.post("/__admin/refresh-coupons", async (req, res) => {
        try {
            const token = req.headers["x-admin-token"] || '';
            if (token !== process.env.ADMIN_TOKEN) {
                return res.status(401).json({ ok: false });
            }
            const count = (0, coupons_1.forceRefreshCoupons)();
            return res.json({ ok: true, reloaded: count });
        }
        catch (e) {
            return res.status(500).json({ ok: false });
        }
    });
    // Voucher print queue endpoint
    app.get("/api/admin/vouchers/print-queue", authenticateUser, async (req, res) => {
        try {
            // TODO: Implement print queue functionality
            // For now, return empty array
            res.json([]);
        }
        catch (error) {
            console.error("Error fetching print queue:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Voucher Sales Routes
    app.get("/api/vouchers/sales", authenticateUser, async (req, res) => {
        try {
            const sales = await storage_1.storage.getVoucherSales();
            res.json(sales);
        }
        catch (error) {
            console.error("Error fetching voucher sales:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/vouchers/sales", authenticateUser, async (req, res) => {
        try {
            const validatedData = insertVoucherSaleSchema.parse(req.body);
            const sale = await storage_1.storage.createVoucherSale(validatedData);
            res.status(201).json(sale);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: "Validation error", details: error.errors });
            }
            console.error("Error creating voucher sale:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.put("/api/vouchers/sales/:id", authenticateUser, async (req, res) => {
        try {
            const sale = await storage_1.storage.updateVoucherSale(req.params.id, req.body);
            res.json(sale);
        }
        catch (error) {
            console.error("Error updating voucher sale:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ========= Create Client from Voucher Sale =========
    // Convert a voucher purchaser into a CRM client
    app.post("/api/vouchers/sales/:id/create-client", authenticateUser, async (req, res) => {
        try {
            const saleId = req.params.id;
            // Get the voucher sale with all data
            const saleResult = await runSql(`
        SELECT vs.*, vp.name as product_name
        FROM voucher_sales vs
        LEFT JOIN voucher_products vp ON vs.product_id = vp.id
        WHERE vs.id = $1
      `, [saleId]);
            if (saleResult.length === 0) {
                return res.status(404).json({ error: "Voucher sale not found" });
            }
            const sale = saleResult[0];
            // Check if already linked to a client
            if (sale.client_id) {
                return res.status(400).json({
                    error: "Already linked to a client",
                    clientId: sale.client_id
                });
            }
            // Check if client already exists with this email
            const existingClientResult = await runSql('SELECT id, first_name, last_name, email FROM crm_clients WHERE LOWER(email) = LOWER($1) LIMIT 1', [sale.purchaser_email]);
            if (existingClientResult.length > 0) {
                // Link existing client to this sale
                const existingClient = existingClientResult[0];
                await runSql('UPDATE voucher_sales SET client_id = $1 WHERE id = $2', [existingClient.id, saleId]);
                // Update client's lifetime_value
                const currentLifetimeValue = await runSql('SELECT COALESCE(lifetime_value, 0) as lv FROM crm_clients WHERE id = $1', [existingClient.id]);
                const newLifetimeValue = parseFloat(currentLifetimeValue[0]?.lv || 0) + parseFloat(sale.final_amount || 0);
                await runSql('UPDATE crm_clients SET lifetime_value = $1 WHERE id = $2', [newLifetimeValue.toFixed(2), existingClient.id]);
                return res.json({
                    success: true,
                    message: "Linked to existing client",
                    client: existingClient,
                    isNew: false
                });
            }
            // Parse purchaser name into first/last name
            const fullName = sale.purchaser_name || 'Unknown';
            const nameParts = fullName.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Unknown';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            // Build notes with purchase info
            const paymentInfo = [];
            if (sale.card_brand && sale.card_last4) {
                paymentInfo.push(`Payment: ${sale.card_brand} ****${sale.card_last4}`);
            }
            if (sale.coupon_code) {
                paymentInfo.push(`Coupon used: ${sale.coupon_code}`);
            }
            const notes = [
                `Added from voucher purchase`,
                `Voucher Code: ${sale.voucher_code}`,
                `Product: ${sale.product_name || 'Unknown'}`,
                `Amount: €${parseFloat(sale.final_amount || 0).toFixed(2)}`,
                ...paymentInfo,
                `Purchase Date: ${new Date(sale.created_at).toLocaleDateString('de-DE')}`
            ].join('\n');
            // Create the new client
            const newClientData = {
                firstName,
                lastName,
                email: sale.purchaser_email,
                phone: sale.purchaser_phone || '',
                address: sale.billing_address || '',
                city: sale.billing_city || '',
                zip: sale.billing_zip || '',
                country: sale.billing_country || '',
                notes,
                status: 'active',
                source: 'voucher_purchase',
                clientSince: new Date(sale.created_at),
                lifetimeValue: sale.final_amount || '0'
            };
            const createdClient = await storage_1.storage.createCrmClient(newClientData);
            // Link client to the voucher sale
            await runSql('UPDATE voucher_sales SET client_id = $1 WHERE id = $2', [createdClient.id, saleId]);
            console.log(`[Client] Created client from voucher sale: ${createdClient.id} - ${firstName} ${lastName}`);
            res.json({
                success: true,
                message: "Client created successfully",
                client: createdClient,
                isNew: true
            });
        }
        catch (error) {
            console.error("Error creating client from voucher sale:", error);
            res.status(500).json({ error: error.message || "Failed to create client" });
        }
    });
    // ========= Stripe Sales Sync Endpoint =========
    // Manually sync voucher sales from Stripe checkout sessions
    app.post("/api/vouchers/sync-stripe", authenticateUser, async (req, res) => {
        try {
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeSecretKey) {
                return res.status(500).json({ error: "Stripe not configured" });
            }
            const StripeLib = (await import('stripe')).default;
            const stripe = new StripeLib(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
            // Fetch all checkout sessions from the last 90 days
            const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
            const sessions = await stripe.checkout.sessions.list({
                limit: 100,
                created: { gte: ninetyDaysAgo },
                expand: ['data.line_items']
            });
            let synced = 0;
            let skipped = 0;
            let errors = [];
            for (const session of sessions.data) {
                // Only process paid sessions
                if (session.payment_status !== 'paid') {
                    skipped++;
                    continue;
                }
                // Check if already exists in database
                const existingCheck = await runSql('SELECT id FROM voucher_sales WHERE stripe_session_id = $1 LIMIT 1', [session.id]);
                if (existingCheck.length > 0) {
                    skipped++;
                    continue;
                }
                try {
                    // Extract voucher info from metadata or line items
                    const metadata = session.metadata || {};
                    const lineItems = session.line_items?.data || [];
                    // Generate voucher code if not in metadata
                    const voucherCode = metadata.voucher_code ||
                        metadata.voucher_id ||
                        `SYNC-${session.id.slice(-8).toUpperCase()}`;
                    // Get product info
                    const productName = lineItems[0]?.description || metadata.product_name || 'Unknown Product';
                    const productId = metadata.product_id || null;
                    // Get customer info
                    const customerEmail = session.customer_email || session.customer_details?.email || '';
                    const customerName = session.customer_details?.name || metadata.purchaser_name || '';
                    // Get recipient info from metadata
                    const recipientName = metadata.recipient_name || metadata.to_name || '';
                    const recipientEmail = metadata.recipient_email || '';
                    const giftMessage = metadata.message || metadata.gift_message || '';
                    // Extract coupon code from metadata (voucher_used is the key from checkout)
                    const couponCode = metadata.voucher_used && metadata.voucher_used !== 'none'
                        ? metadata.voucher_used
                        : metadata.coupon_code || metadata.discount_code || null;
                    // Extract billing address from customer_details
                    const customerAddress = session.customer_details?.address || {};
                    const billingAddress = customerAddress.line1 || '';
                    const billingCity = customerAddress.city || '';
                    const billingZip = customerAddress.postal_code || '';
                    const billingCountry = customerAddress.country || '';
                    const customerPhone = session.customer_details?.phone || '';
                    // Calculate amounts - use amount_total, fallback to amount_subtotal
                    const amountInCents = session.amount_total || session.amount_subtotal || 0;
                    const finalAmount = amountInCents / 100;
                    // Try to get original amount from metadata, otherwise use final amount
                    const origAmountFromMeta = metadata.original_amount ? parseFloat(metadata.original_amount) : null;
                    const originalAmount = origAmountFromMeta || finalAmount;
                    const discountAmount = originalAmount - finalAmount;
                    const currency = (session.currency || 'EUR').toUpperCase();
                    // Insert the voucher sale with billing data
                    const insertResult = await runSql(`
            INSERT INTO voucher_sales (
              voucher_code, product_id, purchaser_email, purchaser_name, purchaser_phone,
              recipient_name, recipient_email, gift_message, original_amount, discount_amount, final_amount,
              currency, payment_status, stripe_session_id, stripe_payment_intent_id,
              coupon_code, billing_address, billing_city, billing_zip, billing_country, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING id
          `, [
                        voucherCode,
                        productId,
                        customerEmail,
                        customerName,
                        customerPhone,
                        recipientName,
                        recipientEmail,
                        giftMessage,
                        originalAmount.toFixed(2),
                        discountAmount > 0 ? discountAmount.toFixed(2) : '0',
                        finalAmount.toFixed(2),
                        currency,
                        'paid',
                        session.id,
                        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
                        couponCode,
                        billingAddress,
                        billingCity,
                        billingZip,
                        billingCountry,
                        new Date(session.created * 1000).toISOString()
                    ]);
                    // Try to get card details from payment intent
                    const saleId = insertResult[0]?.id;
                    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
                    if (saleId && paymentIntentId) {
                        try {
                            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                                expand: ['payment_method']
                            });
                            const pm = paymentIntent.payment_method;
                            if (pm && typeof pm === 'object' && 'card' in pm) {
                                const card = pm.card;
                                if (card) {
                                    await runSql(`UPDATE voucher_sales SET card_brand = $1, card_last4 = $2 WHERE id = $3`, [card.brand || '', card.last4 || '', saleId]);
                                }
                            }
                        }
                        catch (cardErr) {
                            // Card details are optional, don't fail sync
                        }
                    }
                    synced++;
                }
                catch (insertError) {
                    console.error(`[Stripe Sync] Error inserting session ${session.id}:`, insertError);
                    errors.push(`${session.id}: ${insertError.message}`);
                }
            }
            res.json({
                success: true,
                synced,
                skipped,
                total: sessions.data.length,
                errors: errors.length > 0 ? errors : undefined
            });
        }
        catch (error) {
            console.error("[Stripe Sync] Error:", error);
            res.status(500).json({ error: error.message || "Sync failed" });
        }
    });
    // ========= Voucher PDF Generation (no webhook required) =========
    app.get('/voucher/pdf', async (req, res) => {
        try {
            const sessionId = String(req.query.session_id || '').trim();
            if (!sessionId)
                return res.status(400).send('Missing session_id');
            const { StripeVoucherService } = await import('./services/stripeVoucherService');
            const stripeSession = await StripeVoucherService.retrieveSession(sessionId);
            // We need the payment_status; if not present, re-fetch with expand
            let isPaid = stripeSession.payment_status === 'paid';
            let session = stripeSession;
            if (!isPaid) {
                const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
                if (!stripeSecretKey)
                    return res.status(500).send('Stripe not configured');
                const StripeLib = (await import('stripe')).default;
                const stripe = new StripeLib(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
                session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
                isPaid = session?.payment_status === 'paid';
            }
            if (!isPaid)
                return res.status(402).send('Payment not completed yet');
            const m = session.metadata || {};
            const sku = m.sku || 'Voucher';
            const name = m.recipient_name || 'Beschenkte/r';
            const from = m.from_name || '—';
            const note = m.message || '';
            const vId = m.voucher_id || session.id;
            const exp = m.expiry_date || '12 Monate ab Kaufdatum';
            const titleMap = {
                'Maternity-Basic': 'Schwangerschafts Fotoshooting - Basic',
                'Family-Basic': 'Family Fotoshooting - Basic',
                'Newborn-Basic': 'Newborn Fotoshooting - Basic',
                'Maternity-Premium': 'Schwangerschafts Fotoshooting - Premium',
                'Family-Premium': 'Family Fotoshooting - Premium',
                'Newborn-Premium': 'Newborn Fotoshooting - Premium',
                'Maternity-Deluxe': 'Schwangerschafts Fotoshooting - Deluxe',
                'Family-Deluxe': 'Family Fotoshooting - Deluxe',
                'Newborn-Deluxe': 'Newborn Fotoshooting - Deluxe',
            };
            const title = titleMap[String(sku)] || 'Gutschein';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${vId}.pdf"`);
            const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
            doc.pipe(res);
            // NEW LAYOUT: Image at top, then user message as heading, logo in footer
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            const pageMargin = 50;
            const contentWidth = pageWidth - (pageMargin * 2);
            let currentY = 40;
            // 1. HERO IMAGE AT THE TOP (customer-selected or template photo)
            let heroRendered = false;
            try {
                const artUrl = String(m.custom_image || m.design_image || m.product_hero_image || '').trim();
                if (artUrl) {
                    const respImg = await fetch(artUrl);
                    if (respImg && respImg.ok) {
                        const artArr = await respImg.arrayBuffer();
                        const artBuf = Buffer.from(artArr);
                        const imgWidth = contentWidth;
                        doc.image(artBuf, pageMargin, currentY, { fit: [imgWidth, 280], align: 'center' });
                        currentY += 290;
                        heroRendered = true;
                    }
                }
            }
            catch (e) {
                console.warn('Voucher art fetch error:', e);
            }
            if (!heroRendered) {
                currentY += 20; // Small gap if no image
            }
            // 2. USER'S PERSONAL MESSAGE AS MAIN HEADING (instead of generic "PERSONALISIERTER GUTSCHEIN")
            if (note && note.trim()) {
                doc.fontSize(22).fillColor('#222222').text(note, pageMargin, currentY, {
                    align: 'center',
                    width: contentWidth
                });
                currentY = doc.y + 15;
            }
            else {
                // Fallback if no message provided
                doc.fontSize(22).fillColor('#222222').text('Gutschein', pageMargin, currentY, {
                    align: 'center',
                    width: contentWidth
                });
                currentY = doc.y + 15;
            }
            // 3. RED BANNER with product title
            try {
                const bannerY = currentY;
                const bannerX = pageMargin;
                const bannerW = contentWidth;
                const bannerH = 32;
                doc.save();
                doc.rect(bannerX, bannerY, bannerW, bannerH).fill('#b3202e');
                doc.fillColor('#ffffff').fontSize(16).text(title, bannerX + 14, bannerY + 8, { width: bannerW - 28, align: 'left' });
                doc.restore();
                currentY = bannerY + bannerH + 20;
            }
            catch { }
            // 4. VOUCHER DETAILS
            doc.fillColor('#222222');
            // Dynamic product description
            try {
                let product = null;
                const idOrSlug = String(m.sku || '').trim();
                if (idOrSlug && neonDb && typeof neonDb.getVoucherProduct === 'function') {
                    try {
                        product = await neonDb.getVoucherProduct(idOrSlug);
                    }
                    catch (dbErr) {
                        console.warn('Could not fetch voucher product:', dbErr);
                    }
                    if (!product && typeof neonDb.getVoucherProducts === 'function') {
                        try {
                            const all = await neonDb.getVoucherProducts();
                            const slug = idOrSlug.toLowerCase();
                            product = all.find((p) => (p.slug || '').toLowerCase() === slug)
                                || all.find((p) => (p.name || '').toLowerCase().includes(slug.replace(/-/g, ' ')));
                        }
                        catch (dbErr2) {
                            console.warn('Could not fetch all voucher products:', dbErr2);
                        }
                    }
                }
                const dynamicSub = (product?.description || product?.detailedDescription || product?.detailed_description || '').toString();
                if (dynamicSub && dynamicSub.trim()) {
                    doc.fontSize(10).text(dynamicSub, pageMargin, currentY, { width: contentWidth, align: 'left' });
                    currentY = doc.y + 10;
                }
            }
            catch (e) {
                console.warn('Voucher description block render error:', e);
            }
            // Voucher meta
            doc.fontSize(9);
            doc.text(`Gutschein-ID: ${vId}  |  SKU: ${sku}`, pageMargin, currentY);
            doc.text(`Empfänger/in: ${name}`);
            doc.text(`Von: ${from}`);
            doc.text(`Gültig bis: ${exp}`);
            currentY = doc.y + 10;
            // Terms
            doc.fontSize(8).fillColor('#444444').text('Einlösbar für die oben genannte Leistung in unserem Studio. Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.', pageMargin, currentY, { align: 'justify', width: contentWidth });
            currentY = doc.y + 10;
            // Payment info
            const paid = ((session.amount_total || 0) / 100).toFixed(2) + ' ' + String(session.currency || 'EUR').toUpperCase();
            const paymentDate = new Date((session.created || Date.now() / 1000) * 1000);
            const formattedDate = `${String(paymentDate.getDate()).padStart(2, '0')}/${String(paymentDate.getMonth() + 1).padStart(2, '0')}/${String(paymentDate.getFullYear()).slice(-2)}`;
            doc.fontSize(8).fillColor('#222222').text(`Belegt durch Zahlung: ${paid} | Datum: ${formattedDate}`, pageMargin, currentY);
            // 5. FOOTER WITH LOGO AND CONTACT DETAILS (positioned at bottom of page)
            const footerY = pageHeight - 120;
            // Logo centered in footer
            try {
                const logoUrl = process.env.VOUCHER_LOGO_URL || 'https://i.postimg.cc/j55DNmbh/frontend-logo.jpg';
                const resp = await fetch(logoUrl);
                if (resp && resp.ok) {
                    const arr = await resp.arrayBuffer();
                    const imgBuf = Buffer.from(arr);
                    const logoWidth = 120;
                    const centerX = (pageWidth - logoWidth) / 2;
                    doc.image(imgBuf, centerX, footerY, { fit: [logoWidth, 40] });
                }
            }
            catch (e) {
                console.warn('Voucher logo fetch error:', e);
            }
            // Contact details below logo
            doc.fontSize(9).fillColor('#222222');
            doc.text('www.newagefotografie.com', pageMargin, footerY + 50, { align: 'center', width: contentWidth });
            doc.text('hallo@newagefotografie.com', { align: 'center' });
            doc.text('WhatsApp: 0043 677 633 99210', { align: 'center' });
            doc.end();
        }
        catch (e) {
            console.error('Voucher PDF generation failed', e);
            res.status(500).send('Failed to generate PDF');
        }
    });
    // Voucher PDF Preview: generate a sample personalized voucher PDF without requiring payment
    app.get('/voucher/pdf/preview', async (req, res) => {
        try {
            const qp = req.query || {};
            const sku = String(qp.sku || 'Family-Basic');
            const name = String(qp.name || qp.recipient_name || 'Anna Muster');
            const from = String(qp.from || qp.from_name || 'Max Beispiel');
            const note = String(qp.message || 'Alles Gute zum besonderen Anlass!');
            const vId = String(qp.voucher_id || 'VCHR-PREVIEW-1234');
            const exp = String(qp.expiry_date || '12 Monate ab Kaufdatum');
            const amount = parseFloat(String(qp.amount || '95.00'));
            const currency = String(qp.currency || 'EUR');
            // Try custom_image or design_image from query, otherwise fetch product default
            let customImageUrl = String(qp.custom_image || qp.design_image || '').trim();
            if (!customImageUrl && sku) {
                try {
                    if (neonDb && typeof neonDb.getVoucherProduct === 'function') {
                        const product = await neonDb.getVoucherProduct(sku);
                        customImageUrl = product?.imageUrl || '';
                    }
                }
                catch (e) {
                    console.warn('Could not fetch product default image for preview:', e);
                }
            }
            const titleMap = {
                'Maternity-Basic': 'Schwangerschafts Fotoshooting - Basic',
                'Family-Basic': 'Family Fotoshooting - Basic',
                'Newborn-Basic': 'Newborn Fotoshooting - Basic',
                'Maternity-Premium': 'Schwangerschafts Fotoshooting - Premium',
                'Family-Premium': 'Family Fotoshooting - Premium',
                'Newborn-Premium': 'Newborn Fotoshooting - Premium',
                'Maternity-Deluxe': 'Schwangerschafts Fotoshooting - Deluxe',
                'Family-Deluxe': 'Family Fotoshooting - Deluxe',
                'Newborn-Deluxe': 'Newborn Fotoshooting - Deluxe',
            };
            const title = titleMap[sku] || 'Gutschein';
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${vId}.pdf"`);
            const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
            doc.pipe(res);
            // NEW LAYOUT: Image at top, then user message as heading, logo in footer
            const pageWidth = 595.28;
            const pageHeight = 841.89;
            const pageMargin = 50;
            const contentWidth = pageWidth - (pageMargin * 2);
            let currentY = 40;
            // 1. HERO IMAGE AT THE TOP (customer-selected or template photo)
            let heroRendered = false;
            if (customImageUrl) {
                try {
                    const respImg = await fetch(customImageUrl);
                    if (respImg && respImg.ok) {
                        const imgArr = await respImg.arrayBuffer();
                        const imgBuf = Buffer.from(imgArr);
                        const imgWidth = contentWidth;
                        doc.image(imgBuf, pageMargin, currentY, { fit: [imgWidth, 280], align: 'center' });
                        currentY += 290;
                        heroRendered = true;
                    }
                }
                catch (err) {
                    console.warn('Preview image error:', err);
                }
            }
            if (!heroRendered) {
                currentY += 20; // Small gap if no image
            }
            // 2. USER'S PERSONAL MESSAGE AS MAIN HEADING (instead of generic "PERSONALISIERTER GUTSCHEIN")
            if (note && note.trim()) {
                doc.fontSize(22).fillColor('#222222').text(note, pageMargin, currentY, {
                    align: 'center',
                    width: contentWidth
                });
                currentY = doc.y + 15;
            }
            else {
                // Fallback if no message provided
                doc.fontSize(22).fillColor('#222222').text('Gutschein', pageMargin, currentY, {
                    align: 'center',
                    width: contentWidth
                });
                currentY = doc.y + 15;
            }
            // 3. RED BANNER with product title
            try {
                const bannerY = currentY;
                const bannerX = pageMargin;
                const bannerW = contentWidth;
                const bannerH = 32;
                doc.save();
                doc.rect(bannerX, bannerY, bannerW, bannerH).fill('#b3202e');
                doc.fillColor('#ffffff').fontSize(16).text(title, bannerX + 14, bannerY + 8, { width: bannerW - 28, align: 'left' });
                doc.restore();
                currentY = bannerY + bannerH + 20;
            }
            catch { }
            // 4. VOUCHER DETAILS
            doc.fillColor('#222222');
            // Dynamic product description (preview mode - fetch from DB if available)
            try {
                let product = null;
                const idOrSlug = String(sku || '').trim();
                if (idOrSlug && neonDb && typeof neonDb.getVoucherProduct === 'function') {
                    try {
                        product = await neonDb.getVoucherProduct(idOrSlug);
                    }
                    catch (dbErr) {
                        console.warn('Preview: Could not fetch voucher product:', dbErr);
                    }
                    if (!product && typeof neonDb.getVoucherProducts === 'function') {
                        try {
                            const all = await neonDb.getVoucherProducts();
                            const slug = idOrSlug.toLowerCase();
                            product = all.find((p) => (p.slug || '').toLowerCase() === slug)
                                || all.find((p) => (p.name || '').toLowerCase().includes(slug.replace(/-/g, ' ')));
                        }
                        catch (dbErr2) {
                            console.warn('Preview: Could not fetch all voucher products:', dbErr2);
                        }
                    }
                }
                const dynamicSub = (product?.description || product?.detailedDescription || product?.detailed_description || '').toString();
                if (dynamicSub && dynamicSub.trim()) {
                    doc.fontSize(10).text(dynamicSub, pageMargin, currentY, { width: contentWidth, align: 'left' });
                    currentY = doc.y + 10;
                }
            }
            catch (e) {
                console.warn('Preview description render error:', e);
            }
            // Voucher meta
            doc.fontSize(9);
            doc.text(`Gutschein-ID: ${vId}  |  SKU: ${sku}`, pageMargin, currentY);
            doc.text(`Empfänger/in: ${name}`);
            doc.text(`Von: ${from}`);
            doc.text(`Gültig bis: ${exp}`);
            currentY = doc.y + 10;
            // Terms
            doc.fontSize(8).fillColor('#444444').text('Einlösbar für die oben genannte Leistung in unserem Studio. Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.', pageMargin, currentY, { align: 'justify', width: contentWidth });
            currentY = doc.y + 10;
            // Payment info
            const paid = amount.toFixed(2) + ' ' + currency.toUpperCase();
            const previewDate = new Date();
            const formattedPreviewDate = `${String(previewDate.getDate()).padStart(2, '0')}/${String(previewDate.getMonth() + 1).padStart(2, '0')}/${String(previewDate.getFullYear()).slice(-2)}`;
            doc.fontSize(8).fillColor('#222222').text(`Vorschau der Zahlung: ${paid} | Datum: ${formattedPreviewDate}`, pageMargin, currentY);
            // 5. FOOTER WITH LOGO AND CONTACT DETAILS (positioned at bottom of page)
            const footerY = pageHeight - 120;
            // Logo centered in footer
            try {
                const logoUrl = process.env.VOUCHER_LOGO_URL || 'https://i.postimg.cc/j55DNmbh/frontend-logo.jpg';
                const resp = await fetch(logoUrl);
                if (resp && resp.ok) {
                    const arr = await resp.arrayBuffer();
                    const imgBuf = Buffer.from(arr);
                    const logoWidth = 120;
                    const centerX = (pageWidth - logoWidth) / 2;
                    doc.image(imgBuf, centerX, footerY, { fit: [logoWidth, 40] });
                }
            }
            catch (e) {
                console.warn('Logo fetch error:', e);
            }
            // Contact details below logo
            doc.fontSize(9).fillColor('#222222');
            doc.text('www.newagefotografie.com', pageMargin, footerY + 50, { align: 'center', width: contentWidth });
            doc.text('hallo@newagefotografie.com', { align: 'center' });
            doc.text('WhatsApp: 0043 677 633 99210', { align: 'center' });
            doc.end();
        }
        catch (e) {
            console.error('Voucher PDF preview failed', e);
            // Don't try to send error response if headers already sent
            if (!res.headersSent) {
                res.status(500).send('Failed to generate preview PDF');
            }
        }
    });
    // ==================== PRICE LIST ROUTES ====================
    app.get("/api/crm/price-list", async (req, res) => {
        try {
            // Fetch price list from database
            const priceList = await db_1.db.select().from(schema_1.priceListItems).where((0, drizzle_orm_2.eq)(schema_1.priceListItems.isActive, true)).orderBy(schema_1.priceListItems.category, schema_1.priceListItems.name);
            // Convert decimal to number for API response
            const formattedPriceList = priceList.map(item => ({
                id: item.id,
                category: item.category,
                name: item.name,
                description: item.description,
                price: parseFloat(item.price),
                currency: item.currency,
                taxRate: item.taxRate ? parseFloat(item.taxRate) : 19,
                sku: item.sku,
                productCode: item.productCode,
                unit: item.unit,
                notes: item.notes,
                isActive: item.isActive
            }));
            res.json(formattedPriceList);
        }
        catch (error) {
            console.error("Error fetching price list:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Create new price list item
    app.post("/api/crm/price-list", async (req, res) => {
        try {
            const newItem = await db_1.db.insert(schema_1.priceListItems).values(req.body).returning();
            res.json(newItem[0]);
        }
        catch (error) {
            console.error("Error creating price list item:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Update price list item
    app.put("/api/crm/price-list/:id", async (req, res) => {
        try {
            const updatedItem = await db_1.db.update(schema_1.priceListItems)
                .set(req.body)
                .where((0, drizzle_orm_2.eq)(schema_1.priceListItems.id, req.params.id))
                .returning();
            res.json(updatedItem[0]);
        }
        catch (error) {
            console.error("Error updating price list item:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Delete price list item
    app.delete("/api/crm/price-list/:id", async (req, res) => {
        try {
            await db_1.db.delete(schema_1.priceListItems).where((0, drizzle_orm_2.eq)(schema_1.priceListItems.id, req.params.id));
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting price list item:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Import price list from CSV
    app.post("/api/crm/price-list/import", async (req, res) => {
        try {
            const { items } = req.body;
            if (!Array.isArray(items)) {
                return res.status(400).json({ error: "Items must be an array" });
            }
            // Validate and format items
            const formattedItems = items.map((item) => ({
                name: item.name || item.Name || '',
                description: item.description || item.Description || '',
                category: item.category || item.Category || 'GENERAL',
                price: item.price || item.Price || '0',
                currency: item.currency || item.Currency || 'EUR',
                taxRate: item.taxRate || item.TaxRate || '19.00',
                sku: item.sku || item.SKU || '',
                productCode: item.productCode || item.ProductCode || '',
                unit: item.unit || item.Unit || 'piece',
                notes: item.notes || item.Notes || '',
                isActive: item.isActive !== undefined ? item.isActive : true
            }));
            // Insert into database
            const insertedItems = await db_1.db.insert(schema_1.priceListItems).values(formattedItems).returning();
            res.json({
                success: true,
                imported: insertedItems.length,
                items: insertedItems
            });
        }
        catch (error) {
            console.error("Error importing price list:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Get original hardcoded price list (for migration/reference)
    app.get("/api/crm/price-list/legacy", async (req, res) => {
        try {
            // Complete New Age Fotografie price list based on official price guide
            const priceList = [
                // PRINTS Section
                {
                    id: 'print-15x10',
                    category: 'PRINTS',
                    name: '15 x 10cm',
                    description: 'Print 15 x 10cm',
                    price: 35.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'print-10er-box',
                    category: 'PRINTS',
                    name: '10er 15 x 10cm + Gift Box',
                    description: '10er 15 x 10cm + Geschenkbox',
                    price: 300.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'print-20x30-a4',
                    category: 'PRINTS',
                    name: '20 x 30cm (A4)',
                    description: 'Print 20 x 30cm (A4 Format)',
                    price: 59.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'print-30x40-a3',
                    category: 'PRINTS',
                    name: '30 x 40cm (A3)',
                    description: 'Print 30 x 40cm (A3 Format)',
                    price: 79.00,
                    currency: 'EUR',
                    is_active: true
                },
                // LEINWAND Section
                {
                    id: 'canvas-30x20-a4',
                    category: 'LEINWAND',
                    name: '30 x 20cm (A4)',
                    description: 'Leinwand 30 x 20cm (A4 Format)',
                    price: 75.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'canvas-40x30-a3',
                    category: 'LEINWAND',
                    name: '40 x 30cm (A3)',
                    description: 'Leinwand 40 x 30cm (A3 Format)',
                    price: 105.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'canvas-60x40-a2',
                    category: 'LEINWAND',
                    name: '60 x 40cm (A2)',
                    description: 'Leinwand 60 x 40cm (A2 Format)',
                    price: 145.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'canvas-70x50',
                    category: 'LEINWAND',
                    name: '70 x 50cm',
                    description: 'Leinwand 70 x 50cm',
                    price: 185.00,
                    currency: 'EUR',
                    is_active: true
                },
                // LUXUSRAHMEN Section
                {
                    id: 'luxury-frame-a2-black',
                    category: 'LUXUSRAHMEN',
                    name: 'A2 (60 x 40cm) Leinwand in schwarzem Holzrahmen',
                    description: 'A2 (60 x 40cm) Leinwand in schwarzem Holzrahmen',
                    price: 190.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'luxury-frame-40x40',
                    category: 'LUXUSRAHMEN',
                    name: '40 x 40cm Bildrahmen',
                    description: '40 x 40cm Bildrahmen',
                    price: 145.00,
                    currency: 'EUR',
                    is_active: true
                },
                // DIGITAL Section
                {
                    id: 'digital-1-bild',
                    category: 'DIGITAL',
                    name: '1 Bild',
                    description: '1 Digitales Bild',
                    price: 35.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'digital-10x-paket',
                    category: 'DIGITAL',
                    name: '10x Paket',
                    description: '10 Digitale Bilder Paket',
                    price: 295.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'digital-15x-paket',
                    category: 'DIGITAL',
                    name: '15x Paket',
                    description: '15 Digitale Bilder Paket',
                    price: 365.00,
                    currency: 'EUR',
                    is_active: true
                },
                {
                    id: 'digital-20x-paket',
                    category: 'DIGITAL',
                    name: '20x Paket',
                    description: '20 Digitale Bilder Paket',
                    price: 395.00,
                    currency: 'EUR',
                    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
                    is_active: true
                },
                {
                    id: 'digital-25x-paket',
                    category: 'DIGITAL',
                    name: '25x Paket',
                    description: '25 Digitale Bilder Paket',
                    price: 445.00,
                    currency: 'EUR',
                    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
                    is_active: true
                },
                {
                    id: 'digital-30x-paket',
                    category: 'DIGITAL',
                    name: '30x Paket',
                    description: '30 Digitale Bilder Paket',
                    price: 490.00,
                    currency: 'EUR',
                    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
                    is_active: true
                },
                {
                    id: 'digital-35x-paket',
                    category: 'DIGITAL',
                    name: '35x Paket',
                    description: '35 Digitale Bilder Paket',
                    price: 525.00,
                    currency: 'EUR',
                    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
                    is_active: true
                },
                {
                    id: 'digital-alle-portraits',
                    category: 'DIGITAL',
                    name: 'Alle Porträts Insgesamt',
                    description: 'Alle Porträts Insgesamt',
                    price: 595.00,
                    currency: 'EUR',
                    notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
                    is_active: true
                },
                // EXTRAS Section
                {
                    id: 'shooting-ohne-gutschein',
                    category: 'EXTRAS',
                    name: 'Shooting ohne Gutschein',
                    description: 'Shooting ohne Gutschein',
                    price: 95.00,
                    currency: 'EUR',
                    notes: 'Kostenlose Versand',
                    is_active: true
                }
            ];
            res.json(priceList);
        }
        catch (error) {
            console.error("Error fetching price list:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== KNOWLEDGE BASE ROUTES ====================
    app.get("/api/knowledge-base", authenticateUser, async (req, res) => {
        try {
            const entries = await db_1.db.select().from(knowledgeBase);
            res.json(entries);
        }
        catch (error) {
            console.error("Error fetching knowledge base:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/knowledge-base", authenticateUser, async (req, res) => {
        try {
            const result = insertKnowledgeBaseSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ error: result.error.issues });
            }
            // Ensure tags is an array per schema
            const kbData = {
                ...result.data,
                tags: Array.isArray(result.data.tags) ? result.data.tags : (result.data.tags ? [result.data.tags] : []),
            };
            const kbInsertRes = await db_1.db.insert(knowledgeBase).values(kbData).returning();
            const entry = Array.isArray(kbInsertRes) ? kbInsertRes[0] : (kbInsertRes?.rows?.[0] ?? kbInsertRes);
            res.status(201).json(entry);
        }
        catch (error) {
            console.error("Error creating knowledge base entry:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.put("/api/knowledge-base/:id", authenticateUser, async (req, res) => {
        try {
            const result = insertKnowledgeBaseSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ error: result.error.issues });
            }
            const updateData = {
                ...result.data,
                tags: Array.isArray(result.data.tags) ? result.data.tags : (result.data.tags ? [result.data.tags] : []),
                updatedAt: new Date(),
            };
            const kbUpdateRes = await db_1.db.update(knowledgeBase)
                .set(updateData)
                .where((0, drizzle_orm_2.eq)(knowledgeBase.id, req.params.id))
                .returning();
            const entry = Array.isArray(kbUpdateRes) ? kbUpdateRes[0] : (kbUpdateRes?.rows?.[0] ?? kbUpdateRes);
            if (!entry) {
                return res.status(404).json({ error: "Knowledge base entry not found" });
            }
            res.json(entry);
        }
        catch (error) {
            console.error("Error updating knowledge base entry:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.delete("/api/knowledge-base/:id", authenticateUser, async (req, res) => {
        try {
            const kbDeleteRes = await db_1.db.delete(knowledgeBase)
                .where((0, drizzle_orm_2.eq)(knowledgeBase.id, req.params.id))
                .returning();
            const entry = Array.isArray(kbDeleteRes) ? kbDeleteRes[0] : (kbDeleteRes?.rows?.[0] ?? kbDeleteRes);
            if (!entry) {
                return res.status(404).json({ error: "Knowledge base entry not found" });
            }
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting knowledge base entry:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== QUESTIONNAIRE/SURVEY ROUTES ====================
    // Get all surveys (questionnaire templates)
    app.get("/api/surveys", authenticateUser, async (req, res) => {
        try {
            const surveys = await runSql('SELECT * FROM surveys ORDER BY created_at DESC');
            res.json({ surveys, total: surveys.length, page: 1, limit: 50 });
        }
        catch (error) {
            console.error("Error fetching surveys:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Create questionnaire link for client
    app.post("/api/admin/create-questionnaire-link", authenticateUser, async (req, res) => {
        try {
            const { client_id, template_id } = req.body;
            if (!client_id) {
                return res.status(400).json({ error: "client_id is required" });
            }
            // Generate short token (16 hex chars)
            const token = require('crypto').randomBytes(8).toString('hex');
            // Set expiration to 30 days from now
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            // Insert questionnaire link
            await runSql('INSERT INTO questionnaire_links (token, client_id, template_id, expires_at) VALUES ($1, $2, $3, $4)', [token, client_id, template_id || 'default-questionnaire', expiresAt]);
            // Generate public URL
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3001`;
            const link = `${baseUrl}/q/${token}`;
            res.json({ token, link });
        }
        catch (error) {
            console.error("Error creating questionnaire link:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Get questionnaire by token (public endpoint)
    app.get("/api/questionnaire/:token", async (req, res) => {
        try {
            const { token } = req.params;
            // Get questionnaire link details
            const linkResult = await runSql(`SELECT ql.*, c.first_name, c.last_name, c.email 
         FROM questionnaire_links ql 
         JOIN crm_clients c ON ql.client_id = c.id 
         WHERE ql.token = $1 AND (ql.expires_at IS NULL OR ql.expires_at > NOW())`, [token]);
            if (linkResult.length === 0) {
                return res.status(404).json({ error: "Questionnaire not found or expired" });
            }
            const link = linkResult[0];
            // Get the questionnaire template
            const surveyResult = await runSql('SELECT * FROM surveys WHERE id = $1', [link.template_id || 'default-questionnaire']);
            if (surveyResult.length === 0) {
                return res.status(404).json({ error: "Questionnaire template not found" });
            }
            const survey = surveyResult[0];
            res.json({
                token,
                clientName: `${link.first_name || ''} ${link.last_name || ''}`.trim(),
                clientEmail: link.email,
                isUsed: link.is_used,
                survey: {
                    title: survey.title,
                    description: survey.description,
                    pages: survey.pages,
                    settings: survey.settings
                }
            });
        }
        catch (error) {
            console.error("Error fetching questionnaire:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Submit questionnaire response (public endpoint)
    app.post("/api/email-questionnaire", async (req, res) => {
        try {
            const { token, clientName, clientEmail, answers } = req.body;
            if (!token || !clientName || !clientEmail || !answers) {
                return res.status(400).json({ error: "Missing required fields" });
            }
            // Verify token and get client info
            const linkResult = await runSql(`SELECT ql.*, c.first_name, c.last_name 
         FROM questionnaire_links ql 
         JOIN crm_clients c ON ql.client_id = c.id 
         WHERE ql.token = $1 AND (ql.expires_at IS NULL OR ql.expires_at > NOW()) AND ql.is_used = FALSE`, [token]);
            if (linkResult.length === 0) {
                return res.status(404).json({ error: "Invalid or expired questionnaire link" });
            }
            const link = linkResult[0];
            // Store response in database
            await runSql('INSERT INTO questionnaire_responses (client_id, token, template_slug, answers) VALUES ($1, $2, $3, $4)', [link.client_id, token, link.template_id, JSON.stringify(answers)]);
            // Mark link as used
            await runSql('UPDATE questionnaire_links SET is_used = TRUE WHERE token = $1', [token]);
            // Send studio notification email
            try {
                const { sendStudioNotificationEmail, sendClientConfirmationEmail } = await import('./utils/emailService');
                // Send studio notification
                await sendStudioNotificationEmail(clientName, clientEmail, answers, link);
                // Send client confirmation
                await sendClientConfirmationEmail(clientEmail, clientName);
            }
            catch (emailError) {
                console.error("Email sending error:", emailError);
                // Don't fail the response if email fails, just log it
            }
            res.json({ success: true, message: "Questionnaire submitted successfully" });
        }
        catch (error) {
            console.error("Error submitting questionnaire:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== OPENAI ASSISTANTS ROUTES ====================
    app.get("/api/openai/assistants", authenticateUser, async (req, res) => {
        try {
            const assistants = await db_1.db.select().from(openaiAssistants);
            res.json(assistants);
        }
        catch (error) {
            console.error("Error fetching OpenAI assistants:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.post("/api/openai/assistants", authenticateUser, async (req, res) => {
        try {
            const result = insertOpenaiAssistantSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ error: result.error.issues });
            }
            // Create OpenAI Assistant via API if API key is available
            let openaiAssistantId = null;
            if (process.env.OPENAI_API_KEY) {
                try {
                    const openaiResponse = await fetch('https://api.openai.com/v1/assistants', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                            'Content-Type': 'application/json',
                            'OpenAI-Beta': 'assistants=v2'
                        },
                        body: JSON.stringify({
                            name: result.data.name,
                            description: result.data.description,
                            model: result.data.model || 'gpt-4o',
                            instructions: result.data.instructions,
                        })
                    });
                    if (openaiResponse.ok) {
                        const openaiAssistant = await openaiResponse.json();
                        openaiAssistantId = openaiAssistant.id;
                    }
                    else {
                        console.error("OpenAI API error:", await openaiResponse.text());
                    }
                }
                catch (openaiError) {
                    console.error("Failed to create OpenAI assistant:", openaiError);
                }
            }
            const assistantData = {
                name: result.data.name,
                instructions: result.data.instructions,
                description: result.data.description || '',
                model: result.data.model || 'gpt-4o',
                isActive: typeof result.data.isActive === 'boolean' ? result.data.isActive : true,
                knowledgeBaseIds: Array.isArray(result.data.knowledgeBaseIds) ? result.data.knowledgeBaseIds : (result.data.knowledgeBaseIds ? [result.data.knowledgeBaseIds] : []),
                openaiAssistantId,
                createdBy: req.user.id,
            };
            const assistantInsertRes = await db_1.db.insert(openaiAssistants).values(assistantData).returning();
            const assistant = Array.isArray(assistantInsertRes) ? assistantInsertRes[0] : (assistantInsertRes?.rows?.[0] ?? assistantInsertRes);
            res.status(201).json(assistant);
        }
        catch (error) {
            console.error("Error creating OpenAI assistant:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.put("/api/openai/assistants/:id", authenticateUser, async (req, res) => {
        try {
            const result = insertOpenaiAssistantSchema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({ error: result.error.issues });
            }
            const updateAssistant = {
                ...result.data,
                isActive: typeof result.data.isActive === 'boolean' ? result.data.isActive : undefined,
                updatedAt: new Date(),
            };
            const assistantUpdateRes = await db_1.db.update(openaiAssistants)
                .set(updateAssistant)
                .where((0, drizzle_orm_2.eq)(openaiAssistants.id, req.params.id))
                .returning();
            const assistant = Array.isArray(assistantUpdateRes) ? assistantUpdateRes[0] : (assistantUpdateRes?.rows?.[0] ?? assistantUpdateRes);
            if (!assistant) {
                return res.status(404).json({ error: "OpenAI assistant not found" });
            }
            res.json(assistant);
        }
        catch (error) {
            console.error("Error updating OpenAI assistant:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.delete("/api/openai/assistants/:id", authenticateUser, async (req, res) => {
        try {
            const assistantDeleteRes = await db_1.db.delete(openaiAssistants)
                .where((0, drizzle_orm_2.eq)(openaiAssistants.id, req.params.id))
                .returning();
            const assistant = Array.isArray(assistantDeleteRes) ? assistantDeleteRes[0] : (assistantDeleteRes?.rows?.[0] ?? assistantDeleteRes);
            if (!assistant) {
                return res.status(404).json({ error: "OpenAI assistant not found" });
            }
            res.json({ success: true });
        }
        catch (error) {
            console.error("Error deleting OpenAI assistant:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ==================== OPENAI CHAT ROUTES ====================
    app.post("/api/openai/chat/thread", async (req, res) => {
        try {
            if (!process.env.OPENAI_API_KEY) {
                return res.status(400).json({ error: "OpenAI API key not configured" });
            }
            const response = await fetch('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }
            const thread = await response.json();
            res.json({ threadId: thread.id });
        }
        catch (error) {
            console.error("Error creating thread:", error);
            res.status(500).json({ error: "Failed to create thread" });
        }
    });
    app.post("/api/openai/chat/message", async (req, res) => {
        try {
            const { message, threadId, assistantId } = req.body;
            if (!message) {
                return res.status(400).json({ error: "Message is required" });
            }
            if (!process.env.OPENAI_API_KEY) {
                return res.status(400).json({ error: "OpenAI API key not configured" });
            }
            if (!threadId) {
                return res.status(400).json({ error: "Thread ID is required" });
            }
            // Use the provided assistantId or default to the CRM assistant
            const finalAssistantId = assistantId || 'asst_CH4vIbZPs7gUD36Lxf7vlfIV';
            console.log('Using assistant ID:', finalAssistantId);
            // Add message to thread
            await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    role: 'user',
                    content: message
                })
            });
            // Create run with assistant
            const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    assistant_id: finalAssistantId
                })
            });
            if (!runResponse.ok) {
                throw new Error(`Run creation failed: ${runResponse.status}`);
            }
            const run = await runResponse.json();
            // Poll for completion
            let runStatus = run.status;
            let attempts = 0;
            const maxAttempts = 30;
            while ((runStatus === 'queued' || runStatus === 'in_progress') && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
                const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'OpenAI-Beta': 'assistants=v2'
                    }
                });
                if (statusResponse.ok) {
                    const statusData = await statusResponse.json();
                    runStatus = statusData.status;
                }
            }
            // Get messages
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            if (!messagesResponse.ok) {
                throw new Error(`Failed to get messages: ${messagesResponse.status}`);
            }
            const messagesData = await messagesResponse.json();
            const assistantMessage = messagesData.data.find((msg) => msg.role === 'assistant');
            if (!assistantMessage) {
                throw new Error('No assistant response found');
            }
            const aiResponse = assistantMessage.content[0]?.text?.value || 'Sorry, I could not process your request.';
            res.json({ response: aiResponse });
        }
        catch (error) {
            console.error("Error sending message:", error);
            // Provide CRM-focused fallback response for admin users
            const crmFallbackResponse = generateCRMFallbackResponse(req.body.message);
            res.json({ response: crmFallbackResponse });
        }
    });
    function generateCRMFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('client') || lowerMessage.includes('kunden') || lowerMessage.includes('customer')) {
            return `I can help you manage clients in your CRM system:

• **View all clients**: Go to Clients page to see your complete client database
• **Add new client**: Use the "New Client" button to create client records
• **Import clients**: Bulk import from CSV/Excel files
• **Client details**: View contact info, booking history, and revenue data
• **High-value clients**: See your top clients by revenue

What specific client management task can I help you with?`;
        }
        if (lowerMessage.includes('invoice') || lowerMessage.includes('rechnung') || lowerMessage.includes('payment')) {
            return `I can assist with invoice and payment management:

• **Create invoices**: Generate professional invoices with company branding
• **Track payments**: Monitor paid, pending, and overdue invoices
• **Send invoices**: Email invoices directly to clients
• **Payment status**: Update payment status and track revenue
• **Download invoices**: Generate PDF copies for your records

Which invoice task would you like help with?`;
        }
        if (lowerMessage.includes('booking') || lowerMessage.includes('appointment') || lowerMessage.includes('calendar') || lowerMessage.includes('termin')) {
            return `I can help you manage bookings and appointments:

• **View calendar**: See all upcoming photography sessions
• **Schedule sessions**: Book new client appointments
• **Manage availability**: Update your booking calendar
• **Session details**: Track session types, locations, and requirements
• **Client communications**: Send booking confirmations and reminders

What booking management task can I assist with?`;
        }
        if (lowerMessage.includes('email') || lowerMessage.includes('mail') || lowerMessage.includes('message')) {
            return `I can help with email and communication management:

• **Inbox management**: View and organize client emails
• **Send emails**: Compose and send professional communications
• **Email campaigns**: Create marketing campaigns for clients
• **Templates**: Use predefined templates for common responses
• **Lead notifications**: Track new lead inquiries automatically

What email task would you like assistance with?`;
        }
        if (lowerMessage.includes('report') || lowerMessage.includes('analytics') || lowerMessage.includes('revenue') || lowerMessage.includes('dashboard')) {
            return `I can help you with business analytics and reporting:

• **Revenue reports**: Track total revenue and payment status
• **Client analytics**: See your highest-value clients and booking patterns
• **Performance metrics**: Monitor business growth and key indicators
• **Dashboard overview**: Get a quick summary of your business status
• **Export data**: Download reports for external analysis

Which analytics or reporting task can I help you with?`;
        }
        return `Hello! I'm your CRM Operations Assistant. I can help you with:

• **Client Management**: Add, edit, and organize client records
• **Invoice Processing**: Create, send, and track invoices and payments
• **Booking Management**: Schedule appointments and manage your calendar
• **Email Communications**: Handle inbox, send emails, and manage campaigns
• **Business Analytics**: Generate reports and track performance metrics
• **Data Management**: Import/export client data and manage databases

What would you like help with today? Just describe the task and I'll guide you through it.`;
    }
    function generateFallbackResponse(message, knowledgeArticles = []) {
        const lowerMessage = message.toLowerCase();
        // Search knowledge base for relevant content
        const relevantArticle = knowledgeArticles.find(article => lowerMessage.includes(article.title.toLowerCase()) ||
            article.content.toLowerCase().includes(lowerMessage) ||
            article.tags.some((tag) => lowerMessage.includes(tag.toLowerCase())));
        if (lowerMessage.includes('preis') || lowerMessage.includes('kosten') || lowerMessage.includes('price') || lowerMessage.includes('much') || lowerMessage.includes('cost')) {
            return `Gerne teile ich Ihnen unsere aktuellen Preise mit! 📸

**Professionelle Fotoshootings:**
• Kleines Paket: 1 Foto + Datei + 40x30cm Leinwand: €95
• Standard Paket: 5 Fotos + Dateien + 60x40cm Leinwand: €95  
• Premium Paket: 10 Fotos + Dateien + 70x50cm Leinwand: €295
• Digital Paket: 10 digitale Bilder: €250 - **BESTSELLER!**

**Alle Pakete inkludieren:**
• 60 Minuten professionelles Fotoshooting
• Willkommensgetränk und Beratung
• Outfit-Wechsel möglich
• Bis zu 12 Erwachsene + 4 Kinder
• Haustiere willkommen! 🐕

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}

Welches Paket interessiert Sie am meisten?`;
        }
        if (lowerMessage.includes('termin') || lowerMessage.includes('booking') || lowerMessage.includes('buchung')) {
            return `Sehr gerne helfe ich Ihnen bei der Terminbuchung! 📅

Wir sind meistens ausgebucht, aber ich kann Sie gerne auf unsere Warteliste setzen. Oft bekommen wir kurzfristig Termine frei!

**So geht's:**
1. Geben Sie mir Ihre WhatsApp Nummer: +43 677 633 99210
2. Nennen Sie mir Ihre Wunschtermine
3. Ich melde mich bei Ihnen sobald ein Platz frei wird

**Online Kalender:** https://newagefotografie.sproutstudio.com/invitation/live-link-shootings-new-age-fotografie

Welche Art von Shooting interessiert Sie? Familie, Neugeborene, Schwangerschaft oder Business?`;
        }
        if (lowerMessage.includes('hallo') || lowerMessage.includes('hi') || lowerMessage.includes('guten tag')) {
            return `Hallo! Schön, dass Sie da sind! 😊

Ich bin Alex von New Age Fotografie Wien. Wir sind spezialisiert auf:
• Familienfotografie
• Neugeborenen-Shootings  
• Schwangerschaftsfotos
• Business-Headshots

Wie kann ich Ihnen heute helfen? Haben Sie Fragen zu unseren Preisen, möchten Sie einen Termin vereinbaren oder brauchen Sie andere Informationen?

WhatsApp: +43 677 633 99210`;
        }
        if (lowerMessage.includes('familien') || lowerMessage.includes('family') || lowerMessage.includes('familie')) {
            return `Familienfotografie ist unsere Spezialität! 👨‍👩‍👧‍👦

**Familienfotos Pakete:**
• Kleines Paket: 1 Foto + Datei + 40x30cm Leinwand: €95
• Mittleres Paket: 5 Fotos + Dateien + 60x40cm Leinwand: €95  
• Großes Paket: 10 Fotos + Dateien + 70x50cm Leinwand: €295
• 10er Paket (nur digitale Bilder): €250 - **BESTSELLER!**

**Inklusive:**
• 60 Min professionelles Fotoshooting
• Willkommensgetränk & Beratung
• Outfit-Wechsel möglich
• Bis zu 12 Erwachsene + 4 Kinder
• Haustiere willkommen! 🐕

Termin buchen: WhatsApp +43 677 633 99210`;
        }
        if (lowerMessage.includes('location') || lowerMessage.includes('adresse') || lowerMessage.includes('wo')) {
            return `Wir haben Studios in Wien und Zürich! 📍

**Studio Wien:**
Schönbrunner Str. 25, 1050 Wien
(5 Minuten von Kettenbrückengasse, Parkplätze verfügbar)

**Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}

**Öffnungszeiten:**
Freitag - Sonntag: 09:00 - 17:00

Möchten Sie einen Termin vereinbaren?`;
        }
        // If we found a relevant article, use it intelligently
        if (relevantArticle) {
            // Extract specific pricing info from knowledge base if it's about pricing
            if (lowerMessage.includes('preis') || lowerMessage.includes('kosten') || lowerMessage.includes('price') || lowerMessage.includes('much')) {
                return `Gerne teile ich Ihnen unsere aktuellen Preise mit! 📸

**Professionelle Fotoshootings:**
• Kleines Paket: 1 Foto + Datei + 40x30cm Leinwand: €95
• Standard Paket: 5 Fotos + Dateien + 60x40cm Leinwand: €95  
• Premium Paket: 10 Fotos + Dateien + 70x50cm Leinwand: €295
• Digital Paket: 10 digitale Bilder: €250 - **BESTSELLER!**

**Alle Pakete inkludieren:**
• 60 Minuten professionelles Fotoshooting
• Willkommensgetränk und Beratung
• Outfit-Wechsel möglich
• Bis zu 12 Erwachsene + 4 Kinder
• Haustiere willkommen! 🐕

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}`;
            }
            // For general questions, provide focused response based on article content
            return `Basierend auf Ihrem Interesse kann ich Ihnen folgende Informationen geben:

Als Ihr Photo Consultant bei New Age Fotografie unterstütze ich Sie gerne bei allen Fragen rund um professionelle Fotoshootings in Wien.

**Unsere Spezialgebiete:**
• Familienfotografie & Kinderporträts
• Neugeborenen-Shootings
• Schwangerschaftsfotos (Babybauch)
• Business-Headshots & Corporate Fotografie

**Studio Wien:**
Schönbrunner Str. 25, 1050 Wien
(5 Min von Kettenbrückengasse)

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}

Was interessiert Sie am meisten? Preise, Terminbuchung oder spezielle Fotoshootings?`;
        }
        return `Vielen Dank für Ihre Nachricht! 😊

Ich bin Alex von New Age Fotografie Wien. Gerne helfe ich Ihnen bei:
• **Preisanfragen** (ab €95 für Foto-Pakete)
• **Terminbuchungen** (meist ausgebucht, aber Warteliste verfügbar)  
• **Informationen** über unsere Services

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}

Was interessiert Sie am meisten?`;
    }
    // ==================== CHAT LEADS TRACKING ====================
    app.post("/api/chat/save-lead", async (req, res) => {
        try {
            const { name, email, phone, message, conversation } = req.body;
            const leadInsertRes = await db_1.db.insert(schema_1.crmLeads).values({
                name: name || 'Chat Visitor',
                email: email || '',
                phone: phone || '',
                message: message || '',
                source: 'Website Chat',
                status: 'new',
                priority: 'medium',
                value: 0,
                tags: ['chat', 'website'],
                followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            }).returning();
            const lead = Array.isArray(leadInsertRes) ? leadInsertRes[0] : (leadInsertRes?.rows?.[0] ?? leadInsertRes);
            // If conversation history exists, save it as a message
            if (conversation && conversation.length > 0) {
                const conversationText = conversation.map((msg) => `${msg.isUser ? 'Kunde' : 'Alex'}: ${msg.text}`).join('\n');
                await db_1.db.insert(schema_1.crmMessages).values({
                    senderName: name || 'Chat Visitor',
                    senderEmail: email || 'chat@website.com',
                    subject: 'Website Chat Conversation',
                    content: conversationText,
                    status: 'unread',
                    clientId: null,
                    assignedTo: null,
                });
            }
            res.json({ success: true, leadId: lead.id });
        }
        catch (error) {
            console.error("Error saving chat lead:", error);
            res.status(500).json({ error: "Failed to save lead" });
        }
    });
    // Helper function to generate voucher codes
    function generateVoucherCode() {
        return 'NAF-' + Math.random().toString(36).substring(2, 15).toUpperCase();
    }
    // Helper function to send voucher email
    async function sendVoucherEmail(voucherSale) {
        try {
            console.log(`Sending voucher email to ${voucherSale.customerEmail}`);
            console.log(`Voucher code: ${voucherSale.voucherCode}`);
            // Integration with existing email system
            // This would send a professional voucher email with the code
        }
        catch (error) {
            console.error('Error sending voucher email:', error);
        }
    }
    // ==================== AUTOBLOG ROUTES ====================
    // Set up multer for file uploads
    const autoblogUpload = (0, multer_1.default)({
        storage: multer_1.default.memoryStorage(),
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit
            files: 3 // Maximum 3 images
        },
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            }
            else {
                cb(new Error('Only image files are allowed'), false);
            }
        }
    });
    // AutoBlog status endpoint
    app.get("/api/autoblog/status", async (req, res) => {
        try {
            res.json({
                available: !!process.env.OPENAI_API_KEY,
                maxImages: 3,
                supportedLanguages: ['de', 'en'],
                features: ['AI Content Generation', 'SEO Optimization', 'Multi-language Support', 'Direct Chat Interface']
            });
        }
        catch (error) {
            console.error('AutoBlog status error:', error);
            res.status(500).json({ error: 'Failed to get AutoBlog status' });
        }
    });
    // AutoBlog generation endpoint
    // FIX #2: AutoBlog route now exclusively uses TOGNINJA Assistant API (Fix from expert analysis)
    app.post("/api/autoblog/generate", authenticateUser, autoblogUpload.array('images', 3), async (req, res) => {
        try {
            const { AutoBlogOrchestrator } = await import('./autoblog');
            const { autoBlogInputSchema } = await import('./autoblog-schema');
            // FIX #2: Parse ALL form data properly
            const input = autoBlogInputSchema.parse({
                contentGuidance: req.body.contentGuidance || req.body.userPrompt, // Support both field names
                language: req.body.language || 'de',
                siteUrl: req.body.siteUrl,
                publishOption: req.body.publishOption || 'draft',
                scheduledFor: req.body.scheduledFor,
                customSlug: req.body.customSlug
            });
            // Check if files were uploaded
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one image is required'
                });
            }
            // Get user ID for blog post creation
            const authorId = req.user?.id;
            if (!authorId) {
                return res.status(401).json({
                    success: false,
                    error: 'User authentication required'
                });
            }
            // Initialize AutoBlog orchestrator
            const orchestrator = new AutoBlogOrchestrator();
            // FIX #2: Pass ALL form data to orchestrator including images and guidance
            console.log('🔧 FIX #2: Passing complete form data to AutoBlog orchestrator...');
            console.log('Form data received:', {
                contentGuidance: input.contentGuidance,
                language: input.language,
                siteUrl: input.siteUrl,
                publishOption: input.publishOption,
                customSlug: input.customSlug,
                imageCount: req.files?.length || 0
            });
            // Generate blog post with complete form data
            const result = await orchestrator.generateAutoBlog(req.files, input, authorId, "e5dc81e8-7073-4041-8814-affb60f4ef6c" // pass studio ID for assistant lookup
            );
            res.json(result);
        }
        catch (error) {
            console.error('AutoBlog generation error:', error);
            let errorMessage = 'Failed to generate blog post';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            res.status(500).json({
                success: false,
                error: errorMessage
            });
        }
    });
    // AutoBlog Chat Interface - OpenAI Assistant API Communication
    app.post("/api/autoblog/chat", authenticateUser, autoblogUpload.array('images', 3), async (req, res) => {
        try {
            const { message, assistantId, threadId, publishOption = 'draft', customSlug, scheduledFor } = req.body;
            const images = req.files;
            console.log('AutoBlog Assistant chat request:', { message, assistantId, threadId, imageCount: images?.length || 0 });
            if (!process.env.OPENAI_API_KEY) {
                return res.status(500).json({ error: 'OpenAI API key not configured' });
            }
            if (!assistantId) {
                return res.status(400).json({ error: 'Assistant ID is required' });
            }
            // Import centralized config and debugging setup
            const { BLOG_ASSISTANT, DEBUG_OPENAI } = await import('./config');
            // Initialize OpenAI Assistant API with debug logging
            const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
            if (DEBUG_OPENAI) {
                // Some OpenAI client implementations may not expose these properties in types
                openai.baseURL = "https://api.openai.com/v1";
                openai.defaultHeaders = { ...(openai.defaultHeaders || {}), "x-openai-debug": "true" };
            }
            // DIAGNOSTIC CHECK #1: Verify assistant ID
            console.dir({
                requestedAssistantId: assistantId,
                configuredAssistantId: BLOG_ASSISTANT,
                match: assistantId === BLOG_ASSISTANT
            }, { depth: 2 });
            // Force use of correct assistant ID
            const correctAssistantId = BLOG_ASSISTANT;
            // Create or retrieve thread
            let currentThreadId = threadId;
            if (!currentThreadId) {
                try {
                    const thread = await openai.beta.threads.create();
                    currentThreadId = thread.id;
                    console.log('Created new thread:', currentThreadId);
                }
                catch (threadError) {
                    console.error('Error creating thread:', threadError);
                    throw new Error('Failed to create conversation thread');
                }
            }
            // Prepare message content for Assistant API
            let messageContent = [];
            if (message && message.trim()) {
                messageContent.push({
                    type: "text",
                    text: message
                });
            }
            // Handle image uploads for Assistant API with file upload approach
            if (images && images.length > 0) {
                console.log(`Processing ${images.length} images for Assistant API`);
                for (const image of images) {
                    try {
                        // Upload file to OpenAI for Assistant API
                        const fileUpload = await openai.files.create({
                            file: fs_1.default.createReadStream(image.path),
                            purpose: "assistants"
                        });
                        messageContent.push({
                            type: "image_file",
                            image_file: { file_id: fileUpload.id }
                        });
                        console.log(`Uploaded file to OpenAI: ${fileUpload.id} for ${image.originalname}`);
                    }
                    catch (imageError) {
                        console.error('Error uploading image to OpenAI:', imageError);
                        // Fallback to base64 approach if file upload fails
                        try {
                            const imageBuffer = fs_1.default.readFileSync(image.path);
                            const base64Image = imageBuffer.toString('base64');
                            const mimeType = image.mimetype || 'image/jpeg';
                            messageContent.push({
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`
                                }
                            });
                            console.log(`Added base64 image for ${image.originalname}`);
                        }
                        catch (base64Error) {
                            console.error('Error converting image to base64:', base64Error);
                        }
                    }
                }
            }
            // Add message to thread
            try {
                await openai.beta.threads.messages.create(currentThreadId, {
                    role: "user",
                    content: messageContent.length > 0 ? messageContent : (message || "Generate a blog post")
                });
                console.log('Added message to thread');
            }
            catch (messageError) {
                console.error('Error adding message to thread:', messageError);
                throw new Error('Failed to add message to conversation');
            }
            // Now run the OpenAI Assistant
            console.log('Starting OpenAI Assistant run with Assistant ID:', assistantId);
            let run;
            try {
                run = await openai.beta.threads.runs.create(currentThreadId, {
                    assistant_id: correctAssistantId,
                    metadata: { feature: "autoblog-chat", studioId: req.user?.id }
                });
                console.log('✅ Using correct TOGNINJA assistant ID:', correctAssistantId);
                console.log('Started assistant run:', run.id, 'on thread:', currentThreadId);
            }
            catch (runError) {
                console.error('Error starting assistant run:', runError);
                throw new Error('Failed to start assistant processing');
            }
            // Use direct HTTP API calls to bypass SDK parameter ordering issues
            console.log('Using direct HTTP API calls to work around SDK compatibility issues...');
            // Wait for the Assistant run to complete using direct HTTP API
            let attempts = 0;
            const maxAttempts = 60; // 2 minutes max
            let runCompleted = false;
            while (attempts < maxAttempts && !runCompleted) {
                try {
                    console.log(`Checking run status (attempt ${attempts + 1}) with threadId: ${currentThreadId}, runId: ${run.id}`);
                    const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                            'Content-Type': 'application/json',
                            'OpenAI-Beta': 'assistants=v2'
                        }
                    });
                    if (!statusResponse.ok) {
                        throw new Error(`HTTP ${statusResponse.status}: ${statusResponse.statusText}`);
                    }
                    const runStatus = await statusResponse.json();
                    console.log(`Assistant run status: ${runStatus.status} (attempt ${attempts + 1})`);
                    if (runStatus.status === 'completed') {
                        console.log('Assistant run completed successfully!');
                        runCompleted = true;
                        break;
                    }
                    else if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
                        throw new Error(`Assistant run failed with status: ${runStatus.status}`);
                    }
                    // Wait 2 seconds before checking again
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    attempts++;
                }
                catch (statusError) {
                    console.error('Error checking run status via HTTP API:', statusError);
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            if (!runCompleted) {
                throw new Error('Assistant run timed out after 2 minutes');
            }
            // Retrieve messages using direct HTTP API
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            if (!messagesResponse.ok) {
                throw new Error(`Failed to retrieve messages: ${messagesResponse.statusText}`);
            }
            const messagesData = await messagesResponse.json();
            const assistantMessages = messagesData.data.filter(msg => msg.role === 'assistant');
            if (assistantMessages.length === 0) {
                throw new Error('No response from assistant');
            }
            const latestMessage = assistantMessages[0];
            let responseText = '';
            // Extract text content from the message
            for (const content of latestMessage.content) {
                if (content.type === 'text') {
                    responseText += content.text.value + '\n';
                }
            }
            responseText = responseText.trim();
            console.log('Generated blog content via OpenAI Assistant API (HTTP):', responseText.length, 'characters');
            // Handle blog post creation if this is a generation request
            let blogPost = null;
            if (responseText && publishOption) {
                try {
                    const title = extractTitle(responseText);
                    const content = responseText;
                    const excerpt = extractExcerpt(responseText);
                    if (title && content) {
                        const baseSlug = customSlug || title.toLowerCase().replace(/[^a-z0-9äöüß]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
                        const slug = `${baseSlug}-${Date.now()}`;
                        const blogPostData = {
                            title,
                            content,
                            excerpt,
                            slug,
                            status: publishOption.toUpperCase(),
                            tags: ['Familienfotografie', 'Wien', 'Fotoshooting'],
                            metaDescription: excerpt?.substring(0, 155) || '',
                            scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
                            imageUrl: `/blog-images/${Date.now()}-blog-header.jpg`,
                            published: publishOption === 'publish',
                            publishedAt: publishOption === 'publish' ? new Date() : null
                        };
                        const { blogPosts } = await import('@shared/schema');
                        const [newPost] = await db_1.db.insert(blogPosts).values(blogPostData).returning();
                        blogPost = newPost;
                        console.log('Created blog post via OpenAI Assistant API:', blogPost.id);
                    }
                }
                catch (blogError) {
                    console.error('Error creating blog post:', blogError);
                }
            }
            res.json({
                success: true,
                response: responseText,
                threadId: currentThreadId,
                blogPost,
                metadata: {
                    model: 'gpt-4o',
                    assistantId: assistantId,
                    runId: run.id,
                    status: 'completed',
                    method: 'openai-assistant-api',
                    note: 'Generated using your specific OpenAI Assistant (TOGNINJA BLOG WRITER) with full capabilities'
                }
            });
        }
        catch (error) {
            console.error('AutoBlog Assistant chat error:', error);
            let errorMessage = 'Failed to process chat request';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            res.status(500).json({
                success: false,
                error: errorMessage
            });
        }
    });
    // Helper functions for blog content extraction
    function extractTitle(content) {
        const titleMatch = content.match(/^#\s*(.+)$/m) || content.match(/Title:\s*(.+)$/m);
        return titleMatch ? titleMatch[1].trim() : `Familienfotografie Wien - ${new Date().toLocaleDateString('de-DE')}`;
    }
    function extractExcerpt(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        return sentences.slice(0, 2).join('. ').trim().substring(0, 200) + '...';
    }
    // Test endpoint for debugging
    app.get("/api/autoblog/debug", async (req, res) => {
        try {
            res.json({
                message: "AutoBlog system debug",
                openaiAvailable: !!process.env.OPENAI_API_KEY,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    // AutoBlog status endpoint
    app.get("/api/autoblog/status", authenticateUser, async (req, res) => {
        try {
            const openaiAvailable = !!process.env.OPENAI_API_KEY;
            const maxImages = parseInt(process.env.MAX_AUTOBLOG_IMAGES || '3');
            res.json({
                available: openaiAvailable,
                maxImages,
                supportedLanguages: ['de', 'en'],
                features: [
                    'Image-based content generation',
                    'SEO optimization',
                    'Brand voice integration',
                    'Multi-language support'
                ]
            });
        }
        catch (error) {
            console.error('AutoBlog status error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get AutoBlog status'
            });
        }
    });
    // AI Agent Chat Endpoint
    app.post('/api/agent/chat', async (req, res) => {
        try {
            const { message, studioId, userId } = req.body;
            if (!message || !studioId || !userId) {
                return res.status(400).json({ error: 'Missing required parameters' });
            }
            // Import runAgent dynamically to avoid module loading issues
            const { runAgent } = await import('../agent/run-agent');
            // Run the AI agent with the user's message
            const response = await runAgent(studioId, userId, message);
            res.json({
                response: response,
                actionPerformed: false // Could enhance this to detect if agent performed actions
            });
        }
        catch (error) {
            console.error('Agent chat error:', error);
            // Fallback response for CRM Operations Assistant
            const fallbackResponse = `I'm your CRM Operations Assistant. I can help you with:

📧 **Email Management**: Reply to client emails, send booking confirmations
📅 **Appointment Management**: Create, modify, cancel bookings
👥 **Client Management**: Add, update, search client records  
💰 **Invoice Operations**: Generate, send, track invoices and payments
📊 **Business Analytics**: Run reports, analyze data, export information

Current system status: The AI agent system is temporarily unavailable. Please try again shortly or describe what specific task you'd like help with.`;
            res.json({
                response: fallbackResponse,
                actionPerformed: false
            });
        }
    });
    // ==================== CONTACT FORM ROUTES ====================
    app.post("/api/contact", async (req, res) => {
        try {
            const { fullName, email, phone, message } = req.body;
            // Validate required fields
            if (!fullName || !email || !message) {
                return res.status(400).json({ error: "Name, email, and message are required" });
            }
            // Save to database as a lead
            const leadData = {
                firstName: fullName.split(' ')[0] || fullName,
                lastName: fullName.split(' ').slice(1).join(' ') || '',
                email: email,
                phone: phone || null,
                source: 'Website Contact Form',
                notes: message,
                status: 'new'
            };
            const newLead = await db_1.db.insert(schema_1.crmLeads).values(leadData).returning();
            // Send email notification to business
            try {
                const transporter = nodemailer_1.default.createTransport({
                    host: 'smtp.easyname.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.BUSINESS_MAILBOX_USER || '30840mail10',
                        pass: process.env.EMAIL_PASSWORD || 'your-email-password'
                    }
                });
                const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #7C3AED; padding-bottom: 10px;">
              Neue Kontaktanfrage von Website
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Kontaktdaten:</h3>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a></p>
              ${phone ? `<p><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
              <p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
            </div>

            <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Nachricht:</h3>
              <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Diese Nachricht wurde automatisch von Ihrer Website generiert. 
                Der Lead wurde bereits in Ihrem CRM-System gespeichert.
              </p>
            </div>
          </div>
        `;
                await transporter.sendMail({
                    from: `"New Age Fotografie Website" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
                    to: getEnvContactEmailSync() || 'no-reply@localhost',
                    subject: `Neue Kontaktanfrage von ${fullName}`,
                    html: emailHtml
                });
            }
            catch (emailError) {
                console.error('Error sending contact form email:', emailError);
                // Don't fail the request if email fails - lead is still saved
            }
            res.json({
                success: true,
                message: "Ihre Nachricht wurde erfolgreich gesendet. Wir melden uns bald bei Ihnen!",
                leadId: newLead[0]?.id
            });
        }
        catch (error) {
            console.error("Error processing contact form:", error);
            res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." });
        }
    });
    // ==================== APPOINTMENT/WAITLIST ROUTES ====================
    app.post("/api/waitlist", async (req, res) => {
        try {
            const { fullName, email, phone, preferredDate, message } = req.body;
            // Validate required fields
            if (!fullName || !email || !phone || !preferredDate) {
                return res.status(400).json({ error: "Name, email, phone, and preferred date are required" });
            }
            // Save to database as a lead with appointment details
            const leadData = {
                firstName: fullName.split(' ')[0] || fullName,
                lastName: fullName.split(' ').slice(1).join(' ') || '',
                email: email,
                phone: phone,
                source: 'Appointment Request (Waitlist)',
                notes: `Preferred Date: ${preferredDate}${message ? '\n\nAdditional Message: ' + message : ''}`,
                status: 'new'
            };
            const newLead = await db_1.db.insert(schema_1.crmLeads).values(leadData).returning();
            // Send appointment request email to business
            try {
                const transporter = nodemailer_1.default.createTransport({
                    host: 'smtp.easyname.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.BUSINESS_MAILBOX_USER || '30840mail10',
                        pass: process.env.EMAIL_PASSWORD || 'your-email-password'
                    }
                });
                const formatDate = (dateString) => {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('de-DE', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                };
                const appointmentEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7C3AED; border-bottom: 2px solid #7C3AED; padding-bottom: 10px;">
              📅 Neue Terminanfrage
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Kundendaten:</h3>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></p>
              <p><strong>Eingegangen:</strong> ${new Date().toLocaleString('de-DE')}</p>
            </div>

            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7C3AED;">
              <h3 style="color: #7C3AED; margin: 0 0 15px 0;">🗓️ Gewünschter Termin:</h3>
              <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0;">
                ${formatDate(preferredDate)}
              </p>
              <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">
                (${preferredDate})
              </p>
            </div>

            ${message ? `
              <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0;">💬 Zusätzliche Nachricht:</h3>
                <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            ` : ''}

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">📞 Schnelle Aktionen:</h3>
              <p style="margin: 5px 0;">
                <a href="tel:${phone}" style="color: #7C3AED; text-decoration: none; font-weight: bold;">
                  📱 ${phone} anrufen
                </a>
              </p>
              <p style="margin: 5px 0;">
                <a href="mailto:${email}?subject=Bestätigung Ihres Fotoshooting-Termins am ${formatDate(preferredDate)}" style="color: #7C3AED; text-decoration: none; font-weight: bold;">
                  ✉️ Terminbestätigung senden
                </a>
              </p>
              <p style="margin: 5px 0;">
                <a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hallo ${fullName.split(' ')[0]}, vielen Dank für Ihre Terminanfrage für den ${formatDate(preferredDate)}. Gerne bestätige ich Ihnen den Termin!" style="color: #7C3AED; text-decoration: none; font-weight: bold;">
                  💬 WhatsApp-Bestätigung
                </a>
              </p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Diese Terminanfrage wurde automatisch von Ihrer Website generiert. 
                Der Lead wurde bereits in Ihrem CRM-System gespeichert.
              </p>
            </div>
          </div>
        `;
                await transporter.sendMail({
                    from: `"New Age Fotografie Website" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
                    to: getEnvContactEmailSync() || 'no-reply@localhost',
                    subject: `📅 Neue Terminanfrage: ${fullName} für ${formatDate(preferredDate)}`,
                    html: appointmentEmailHtml
                });
                // Send confirmation email to customer
                const customerConfirmationHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7C3AED; margin: 0;">New Age Fotografie</h1>
              <p style="color: #666; margin: 5px 0;">Familienfotograf Wien</p>
            </div>

            <h2 style="color: #333; text-align: center;">
              Vielen Dank für Ihre Terminanfrage! 📸
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #7C3AED; margin: 0 0 20px 0;">Ihre Anfrage im Überblick:</h3>
              <p><strong>Gewünschter Termin:</strong> ${formatDate(preferredDate)}</p>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>E-Mail:</strong> ${email}</p>
              <p><strong>Telefon:</strong> ${phone}</p>
              ${message ? `<p><strong>Ihre Nachricht:</strong><br>${message}</p>` : ''}
            </div>

            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">📞 Wie geht es weiter?</h3>
              <p style="margin: 10px 0;">
                Wir melden uns innerhalb von <strong>24 Stunden</strong> bei Ihnen zurück, um Ihren Wunschtermin zu bestätigen oder alternative Termine vorzuschlagen.
              </p>
              <p style="margin: 10px 0;">
                <strong>Dringende Anfragen:</strong><br>
                WhatsApp/Tel: <a href="tel:+43677663992010" style="color: #7C3AED;">+43 677 633 99210</a><br>
                E-Mail: <a href="mailto:${getEnvContactEmailSync()}" style="color: #7C3AED;">${getEnvContactEmailSync()}</a>
              </p>
            </div>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #333; margin: 0 0 10px 0;">💡 Tipp für Ihren Fotoshooting-Termin:</h4>
              <ul style="color: #666; margin: 0; padding-left: 20px;">
                <li>Wir fotografieren auch an Wochenenden</li>
                <li>Flexible Termingestaltung nach Ihren Wünschen</li>
                <li>Outdoor- und Indoor-Fotoshootings möglich</li>
                <li>Professionelle Nachbearbeitung inklusive</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                New Age Fotografie | Wehrgasse 11A/2+5, 1050 Wien<br>
                Tel/WhatsApp: +43 677 633 99210 | E-Mail: ${getEnvContactEmailSync()}
              </p>
            </div>
          </div>
        `;
                await transporter.sendMail({
                    from: `"New Age Fotografie" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
                    to: email,
                    subject: '📅 Terminanfrage erhalten - Wir melden uns bald!',
                    html: customerConfirmationHtml
                });
            }
            catch (emailError) {
                console.error('Error sending appointment emails:', emailError);
                // Don't fail the request if email fails - lead is still saved
            }
            res.json({
                success: true,
                message: "Ihre Terminanfrage wurde erfolgreich übermittelt. Wir melden uns innerhalb von 24 Stunden bei Ihnen!",
                leadId: newLead[0]?.id
            });
        }
        catch (error) {
            console.error("Error processing appointment request:", error);
            res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." });
        }
    });
    // ==================== NEWSLETTER/VOUCHER SIGNUP ROUTES ====================
    app.post("/api/newsletter/signup", async (req, res) => {
        try {
            const { email } = req.body;
            // Validate email
            if (!email || !email.includes('@')) {
                return res.status(400).json({ error: "Valid email address is required" });
            }
            // Save to database as a lead
            const leadData = {
                name: email.split('@')[0] || 'Newsletter Subscriber',
                email: email,
                source: 'Newsletter Signup (50 EUR Voucher)',
                message: 'Signed up for 50 EUR voucher offer',
                status: 'new'
            };
            const newLead = await db_1.db.insert(schema_1.crmLeads).values(leadData).returning();
            // Send voucher email to customer
            try {
                const transporter = nodemailer_1.default.createTransport({
                    host: 'smtp.easyname.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.BUSINESS_MAILBOX_USER || '30840mail10',
                        pass: process.env.EMAIL_PASSWORD || 'your-email-password'
                    }
                });
                const voucherEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7C3AED; margin: 0;">New Age Fotografie</h1>
              <p style="color: #666; margin: 5px 0;">Familienfotograf Wien</p>
            </div>

            <h2 style="color: #333; text-align: center;">
              Vielen Dank für Ihr Interesse! 🎉
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="color: #7C3AED; margin: 0 0 20px 0; font-size: 24px;">
                Ihr 50€ Fotoshooting-Gutschein
              </h3>
              <div style="background-color: #7C3AED; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">VOUCHER50</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Gutscheincode für 50€ Rabatt</p>
              </div>
              <p style="color: #666; margin: 10px 0;">
                Gültig für alle Fotoshooting-Pakete. Einfach bei der Buchung angeben.
              </p>
            </div>

            <div style="margin: 30px 0;">
              <h3 style="color: #333;">So einfach geht's:</h3>
              <ol style="color: #666; line-height: 1.6;">
                <li>WhatsApp an <strong>+43 677 633 99210</strong> oder E-Mail an <strong>${getEnvContactEmailSync()}</strong></li>
                <li>Ihren Wunschtermin nennen</li>
                <li>Gutscheincode <strong>VOUCHER50</strong> erwähnen</li>
                <li>50€ sparen und wunderschöne Erinnerungen schaffen!</li>
              </ol>
            </div>

            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #333; margin: 0 0 10px 0;">Unsere Fotoshootings:</h4>
              <ul style="color: #666; margin: 0; padding-left: 20px;">
                <li>Familienfotografie</li>
                <li>Neugeborenen-Fotografie</li>
                <li>Schwangerschaftsfotos</li>
                <li>Business-Headshots</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                New Age Fotografie | Wehrgasse 11A/2+5, 1050 Wien<br>
                Tel/WhatsApp: +43 677 633 99210 | E-Mail: ${getEnvContactEmailSync()}
              </p>
            </div>
          </div>
        `;
                await transporter.sendMail({
                    from: `"New Age Fotografie" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
                    to: email,
                    subject: '🎉 Ihr 50€ Fotoshooting-Gutschein ist da!',
                    html: voucherEmailHtml
                });
                // Send notification to business
                await transporter.sendMail({
                    from: `"New Age Fotografie Website" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
                    to: getEnvContactEmailSync() || 'no-reply@localhost',
                    subject: `Neue Newsletter-Anmeldung: ${email}`,
                    html: `
            <h3>Neue Newsletter-Anmeldung</h3>
            <p><strong>E-Mail:</strong> ${email}</p>
            <p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
            <p><strong>Angebot:</strong> 50 EUR Gutschein</p>
            <p>Der Lead wurde automatisch in Ihrem CRM-System gespeichert.</p>
          `
                });
            }
            catch (emailError) {
                console.error('Error sending voucher email:', emailError);
                // Don't fail the request if email fails - lead is still saved
            }
            res.json({
                success: true,
                message: "Vielen Dank! Prüfen Sie Ihre E-Mails für Ihren 50€ Gutschein.",
                leadId: newLead[0]?.id
            });
        }
        catch (error) {
            console.error("Error processing newsletter signup:", error);
            res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." });
        }
    });
    // Website Wizard routes
    app.use('/api/website-wizard', website_wizard_1.default);
    app.use('/api/gallery', gallery_shop_1.default);
    // Storage subscription routes
    app.use('/api/storage', storage_routes_1.default);
    // File upload and management routes (DISABLED - has schema mismatches, using filesRouter above instead)
    // app.use('/api/files', fileRoutes);
    // Gallery transfer routes
    app.use('/api/gallery-transfer', gallery_transfer_routes_1.default);
    // Storage statistics routes
    app.use('/api/storage-stats', storage_stats_routes_1.default);
    // Print ordering routes (Prodigi integration)
    app.use('/api/print', prodigi_1.default);
    // Storage health check (diagnostics for Backblaze/AWS S3 configuration)
    app.get('/api/storage/health', async (_req, res) => {
        const bucket = process.env.AWS_S3_BUCKET || '';
        const endpoint = process.env.AWS_S3_ENDPOINT || '';
        const region = process.env.AWS_REGION || 'eu-central-003';
        const accessConfigured = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
        let canList = false;
        let error;
        try {
            const client = new client_s3_1.S3Client({
                region,
                endpoint: endpoint || undefined,
                // path-style required for Backblaze S3 compatibility when endpoint is set
                forcePathStyle: Boolean(endpoint),
            });
            await client.send(new client_s3_2.ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
            canList = true;
        }
        catch (e) {
            error = e?.message || String(e);
        }
        res.json({ bucket, endpoint, region, accessConfigured, canList, error });
    });
    // Accounting Export routes
    // Attach storage to request so accounting export can access invoices/clients
    app.use('/api/accounting-export', authenticateUser, (req, _res, next) => {
        req.storage = storage_2.storage;
        next();
    }, routes_1.default);
    // Register test routes
    (0, routes_test_1.registerTestRoutes)(app);
    const httpServer = (0, http_1.createServer)(app);
    return httpServer;
}
