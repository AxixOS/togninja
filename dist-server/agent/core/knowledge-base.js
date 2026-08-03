"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeBase = exports.KnowledgeBase = void 0;
// agent/core/knowledge-base.ts - Comprehensive pgvector knowledge base system
const serverless_1 = require("@neondatabase/serverless");
const openai_1 = __importDefault(require("openai"));
// Initialize OpenAI for embeddings
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
class KnowledgeBase {
    constructor() {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        this.sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
    }
    // Initialize the pgvector extension and knowledge base table
    async initialize() {
        try {
            // Enable pgvector extension
            await this.sql `CREATE EXTENSION IF NOT EXISTS vector`;
            // Create knowledge base table with pgvector support
            await this.sql `
        CREATE TABLE IF NOT EXISTS knowledge_base (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          embedding vector(1536),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
            // Create vector index for fast similarity search
            await this.sql `
        CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx 
        ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `;
            console.log('✅ Knowledge base initialized with pgvector support');
        }
        catch (error) {
            console.error('❌ Knowledge base initialization error:', error);
            throw error;
        }
    }
    // Add document to knowledge base
    async addDocument(content, metadata = {}) {
        try {
            // Generate embedding using OpenAI
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: content,
            });
            const embedding = embeddingResponse.data[0].embedding;
            // Insert document with embedding
            const result = await this.sql `
        INSERT INTO knowledge_base (content, metadata, embedding)
        VALUES (${content}, ${JSON.stringify(metadata)}, ${JSON.stringify(embedding)})
        RETURNING id
      `;
            const docId = result[0].id;
            console.log(`✅ Knowledge base document added: ${docId}`);
            return docId;
        }
        catch (error) {
            console.error('❌ Error adding document to knowledge base:', error);
            throw error;
        }
    }
    // Search knowledge base using semantic similarity
    async search(query, limit = 5, threshold = 0.7) {
        try {
            // Generate query embedding
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: query,
            });
            const queryEmbedding = embeddingResponse.data[0].embedding;
            // Perform similarity search using cosine similarity
            const results = await this.sql `
        SELECT 
          id,
          content,
          metadata,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}) as similarity
        FROM knowledge_base
        WHERE 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}) > ${threshold}
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}
        LIMIT ${limit}
      `;
            return results.map((row) => ({
                document: {
                    id: row.id,
                    content: row.content,
                    metadata: row.metadata,
                    created_at: row.created_at,
                    updated_at: row.updated_at
                },
                similarity: row.similarity
            }));
        }
        catch (error) {
            console.error('❌ Knowledge base search error:', error);
            throw error;
        }
    }
    // Update document
    async updateDocument(id, content, metadata = {}) {
        try {
            // Generate new embedding
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: content,
            });
            const embedding = embeddingResponse.data[0].embedding;
            // Update document
            await this.sql `
        UPDATE knowledge_base
        SET 
          content = ${content},
          metadata = ${JSON.stringify(metadata)},
          embedding = ${JSON.stringify(embedding)},
          updated_at = NOW()
        WHERE id = ${id}
      `;
            console.log(`✅ Knowledge base document updated: ${id}`);
        }
        catch (error) {
            console.error('❌ Error updating knowledge base document:', error);
            throw error;
        }
    }
    // Delete document
    async deleteDocument(id) {
        try {
            await this.sql `
        DELETE FROM knowledge_base WHERE id = ${id}
      `;
            console.log(`✅ Knowledge base document deleted: ${id}`);
        }
        catch (error) {
            console.error('❌ Error deleting knowledge base document:', error);
            throw error;
        }
    }
    // Get document by ID
    async getDocument(id) {
        try {
            const result = await this.sql `
        SELECT * FROM knowledge_base WHERE id = ${id}
      `;
            if (result.length === 0)
                return null;
            const row = result[0];
            return {
                id: row.id,
                content: row.content,
                metadata: row.metadata,
                created_at: row.created_at,
                updated_at: row.updated_at
            };
        }
        catch (error) {
            console.error('❌ Error getting knowledge base document:', error);
            throw error;
        }
    }
    // Bulk add documents
    async bulkAddDocuments(documents) {
        const docIds = [];
        for (const doc of documents) {
            const docId = await this.addDocument(doc.content, doc.metadata || {});
            docIds.push(docId);
        }
        console.log(`✅ Bulk added ${documents.length} documents to knowledge base`);
        return docIds;
    }
    // Get statistics
    async getStats() {
        try {
            const [totalResult, todayResult] = await Promise.all([
                this.sql `SELECT COUNT(*) as count FROM knowledge_base`,
                this.sql `SELECT COUNT(*) as count FROM knowledge_base WHERE created_at >= CURRENT_DATE`
            ]);
            return {
                total: parseInt(totalResult[0].count),
                created_today: parseInt(todayResult[0].count)
            };
        }
        catch (error) {
            console.error('❌ Error getting knowledge base stats:', error);
            throw error;
        }
    }
}
exports.KnowledgeBase = KnowledgeBase;
// Singleton instance
exports.knowledgeBase = new KnowledgeBase();
// Auto-initialize on import
exports.knowledgeBase.initialize().catch(console.error);
