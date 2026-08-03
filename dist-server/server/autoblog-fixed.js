"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixedAutoBlogGenerator = exports.FixedAutoBlogGenerator = void 0;
// Fixed AutoBlog implementation using Chat Completions API with TOGNINJA instructions
const openai_1 = __importDefault(require("openai"));
const config_1 = require("./config");
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
class FixedAutoBlogGenerator {
    /**
     * Generate content using TOGNINJA assistant instructions via Chat Completions API
     * This avoids the SDK parameter ordering issues while preserving assistant training
     */
    async generateContent(input) {
        try {
            console.log('🎯 FIXED TOGNINJA GENERATOR - Using Chat Completions with assistant instructions');
            // Step 1: Get TOGNINJA assistant instructions
            let systemPrompt = '';
            try {
                const assistant = await openai.beta.assistants.retrieve(config_1.BLOG_ASSISTANT);
                systemPrompt = assistant.instructions || '';
                console.log('✅ Retrieved TOGNINJA instructions:', systemPrompt.length, 'characters');
            }
            catch (error) {
                console.error('Failed to retrieve assistant instructions:', error);
                systemPrompt = `You are TOGNINJA BLOG WRITER for New Age Fotografie photography studio in Vienna, Austria. 
Generate professional German blog content about photography sessions with SEO optimization, 
including H1/H2 structure, meta descriptions, and Vienna-specific content.`;
            }
            // Step 2: Analyze images if provided
            let imageContext = '';
            if (input.images && input.images.length > 0) {
                try {
                    const imageMessages = [{
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Describe this photography session briefly:"
                                },
                                ...input.images.map(img => ({
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/jpeg;base64,${img.toString('base64')}`
                                    }
                                }))
                            ]
                        }];
                    const imageResponse = await openai.chat.completions.create({
                        model: "gpt-4o",
                        messages: imageMessages,
                        max_tokens: 100
                    });
                    imageContext = imageResponse.choices[0]?.message?.content || 'Professional photography session';
                    console.log('✅ Image analysis:', imageContext);
                }
                catch (error) {
                    console.error('Image analysis failed:', error);
                    imageContext = 'Professional photography session';
                }
            }
            // Step 3: Create context-aware user message with SEO intelligence
            const contextualPrompt = `
Photography Session: ${imageContext}
Studio: New Age Fotografie, Vienna

${input.siteContext || 'Professional Vienna photography studio context'}
Language: ${input.language === 'de' ? 'German' : 'English'}

User Request: ${input.userPrompt}

Please generate content according to your TOGNINJA training and instructions.
${imageContext.includes('family') ? 'Focus on family photography aspects.' : ''}
${imageContext.includes('newborn') ? 'Focus on newborn photography aspects.' : ''}
      `.trim();
            // Step 4: Generate content using Chat Completions API with TOGNINJA instructions
            console.log('🚀 Generating content with TOGNINJA training...');
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: contextualPrompt }
                ],
                temperature: 0.7,
                max_tokens: 4000
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content generated');
            }
            console.log('✅ TOGNINJA content generated:', content.length, 'characters');
            console.log('📝 Content preview:', content.substring(0, 200) + '...');
            return {
                success: true,
                content,
                method: 'chat-completions-with-togninja-instructions'
            };
        }
        catch (error) {
            console.error('❌ Fixed AutoBlog generation failed:', error);
            return {
                success: false,
                content: '',
                method: 'failed'
            };
        }
    }
}
exports.FixedAutoBlogGenerator = FixedAutoBlogGenerator;
exports.fixedAutoBlogGenerator = new FixedAutoBlogGenerator();
