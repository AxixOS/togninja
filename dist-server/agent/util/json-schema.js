"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenAITool = createOpenAITool;
const zod_to_json_schema_1 = require("zod-to-json-schema");
function createOpenAITool(name, description, parameters) {
    try {
        const jsonSchema = (0, zod_to_json_schema_1.zodToJsonSchema)(parameters, name);
        // Handle $ref-based schemas by extracting the actual definition
        let actualSchema = jsonSchema;
        if (jsonSchema && typeof jsonSchema === 'object' && '$ref' in jsonSchema && 'definitions' in jsonSchema) {
            const refName = jsonSchema.$ref.replace('#/definitions/', '');
            actualSchema = jsonSchema.definitions[refName];
        }
        // Debug logging removed
        // Ensure we always return a valid JSON Schema object
        if (!actualSchema || typeof actualSchema !== 'object' || actualSchema.type === undefined) {
            console.log(`[${name}] Invalid schema, using fallback`);
            return {
                type: "function",
                function: {
                    name,
                    description,
                    parameters: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                }
            };
        }
        return {
            type: "function",
            function: {
                name,
                description,
                parameters: actualSchema
            }
        };
    }
    catch (error) {
        console.error(`❌ JSON Schema error for tool "${name}":`, error);
        return {
            type: "function",
            function: {
                name,
                description,
                parameters: {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        };
    }
}
