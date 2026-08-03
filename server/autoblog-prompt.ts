import type { AutoBlogInput } from './autoblog-schema';

interface PromptContext {
  studioName: string;
  internalBookingPath: string;
  siteContext: string;
  userPrompt?: string;
  language: string;
}

export function buildAutoBlogPrompt(context: PromptContext): string {
  const { studioName, internalBookingPath, siteContext, userPrompt, language } = context;
  
  const isGerman = language === 'de';
  
  return `You are a professional business content writer specializing in photography industry marketing materials for ${studioName} photography studio in Vienna, Austria.

BUSINESS OBJECTIVE:
Write a marketing blog article about professional photography services to attract potential clients.

BUSINESS CONTEXT:
Photography studio information: ${siteContext}
Photography session description: ${userPrompt || 'Professional photography session showcase'}

TARGET AUDIENCE:
Business clients seeking professional photography services in Vienna.

INSTRUCTIONS:
Create a business marketing blog post about photography services. Respond only with valid JSON matching this schema:

{
  "title": "Blog post title (max 140 chars)",
  "keyphrase": "2-4 word SEO keyphrase (max 60 chars)",
  "slug": "kebab-case-url-slug (lowercase, alphanumeric + hyphens only)",
  "excerpt": "Brief summary for previews (max 180 chars, plain text)",
  "content_html": "Full HTML blog post content",
  "seo_title": "SEO-optimized title for search engines (max 70 chars)",
  "meta_description": "Meta description for search results (max 160 chars)",
  "cover_image": null,
  "image_alts": ["Alt text for image 1", "Alt text for image 2", "Alt text for image 3"],
  "tags": ["tag1", "tag2", "tag3"],
  "status": "DRAFT",
  "publish_now": false,
  "language": "${language}"
}

WRITING REQUIREMENTS:
${isGerman ? `
- German business language
- Professional photography industry tone
- Marketing content for Vienna photography services
` : `
- English business language  
- Professional photography industry tone
- Marketing content for Vienna photography services
`}

SEO REQUIREMENTS:
- Include the keyphrase naturally in:
  * First paragraph introduction
  * SEO title and meta description
  * At least 2 times throughout the content
- One internal link to "${internalBookingPath}" with relevant anchor text
- One authoritative external link (non-competitor, relevant to photography or business)
- Paragraphs should be under 300 words each
- Use short, engaging sentences

HTML CONTENT REQUIREMENTS:
- Write a COMPLETE blog post of 800-1200 words
- Use semantic HTML: <h2>, <h3>, <p>, <strong>, <em>
- NO scripts, iframes, or javascript
- NO markdown - pure HTML only
- NO "H1:" or "H2:" text prefixes in headings
- NO ### symbols anywhere in content
- Include proper heading hierarchy (start with <h2> since <h1> is the title)
- Add rel="noopener" to external links
- Structure should include:
  * Introduction paragraph with keyphrase
  * 2-3 main content sections with <h2> headings
  * Personal insights about the photography session
  * Conclusion with call-to-action

IMAGE INTEGRATION:
- Images will be automatically added to the blog post
- Provide descriptive alt text for each uploaded image
- Reference the images naturally in your content
- Provide descriptive alt text for each uploaded image
- Include location context (Wien/Vienna) when relevant
- Make alt text SEO-friendly but natural

TAGS:
- 3-7 relevant tags in ${isGerman ? 'German' : 'English'}
- Mix broad and specific terms
- Examples: ${isGerman ? '"Fotografie", "Wien", "Portrait", "Studio"' : '"photography", "Vienna", "portrait", "studio"'}

SAMPLE CONTENT STRUCTURE:
${isGerman ? `
<p>Einführung mit Keyphrase und professioneller Beschreibung der Fotosession...</p>

<h2>Professionelle Fototechnik und Bildkomposition</h2>
<p>Beschreibung der verwendeten Techniken und des kreativen Prozesses...</p>

<h2>Tipps für Ihre professionelle Fotosession</h2>
<p>Hilfreiche Ratschläge für Kunden...</p>

<p>Abschluss mit Call-to-Action und <a href="${internalBookingPath}">Buchungslink</a>.</p>

<p>Weitere Informationen finden Sie auf <a href="https://www.wien.gv.at/" rel="noopener">der offiziellen Wien Website</a>.</p>
` : `
<p>Introduction with keyphrase and professional description of the photography session...</p>

<h2>Professional Photography Techniques and Composition</h2>
<p>Description of techniques used and creative process...</p>

<h2>Tips for Your Professional Photo Session</h2>
<p>Helpful advice for clients...</p>

<p>Conclusion with call-to-action and <a href="${internalBookingPath}">booking link</a>.</p>

<p>For more information, visit <a href="https://www.wien.gv.at/" rel="noopener">the official Vienna website</a>.</p>
`}

CRITICAL FORMATTING RULES:
- Headings should be clean: <h2>Section Title</h2> 
- NO text prefixes like "H1:", "H2:", etc.
- NO markdown symbols like ###
- NO excessive formatting - keep content clean and professional

Remember: Output ONLY valid JSON. No markdown, no explanations, no additional text.`;
}