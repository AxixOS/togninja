import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export function createOpenAITool(name: string, description: string, parameters: z.ZodSchema) {
  try {
    const jsonSchema = zodToJsonSchema(parameters, name);
  
  // Handle $ref-based schemas by extracting the actual definition
  let actualSchema = jsonSchema;
  if (jsonSchema && typeof jsonSchema === 'object' && '$ref' in jsonSchema && 'definitions' in jsonSchema) {
    const refName = jsonSchema.$ref.replace('#/definitions/', '');
    actualSchema = (jsonSchema.definitions as any)[refName];
  }
  
  // Debug logging removed
  
  // Ensure we always return a valid JSON Schema object
  if (!actualSchema || typeof actualSchema !== 'object' || actualSchema.type === undefined) {
    console.log(`[${name}] Invalid schema, using fallback`);
    return {
      type: "function" as const,
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
    type: "function" as const,
    function: {
      name,
      description,
      parameters: actualSchema
    }
  };
  
  } catch (error) {
    console.error(`❌ JSON Schema error for tool "${name}":`, error);
    return {
      type: "function" as const,
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