/**
 * Content Quality Fixes for AutoBlog System
 * Addresses: image-content mismatch, H1/H2 prefixes, excessive ###, duplicate images
 */

export interface ImageAnalysisResult {
  sessionType: string;
  subjects: string;
  setting: string;
  emotions: string;
  clothing: string;
  specifics: string;
}

export class ContentQualityProcessor {
  
  /**
   * Analyze uploaded images to determine exact session type and content
   */
  async analyzeImagesForAccurateContent(images: any[], openai: any): Promise<ImageAnalysisResult> {
    if (images.length === 0) {
      return {
        sessionType: 'general',
        subjects: 'unknown',
        setting: 'studio',
        emotions: 'professional',
        clothing: 'varied',
        specifics: 'photography session'
      };
    }

    try {
      console.log('🔍 CONTENT FIX: Analyzing images for accurate content matching...');
      
      const imageMessages = [
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: `Analyze these photography session images very carefully. I need precise details to match content to images:

1. SESSION TYPE: Is this newborn, maternity/pregnancy, family with children, business headshots, couple, or other?
2. SUBJECTS: Describe exactly who is in the photos (pregnant woman, newborn baby, family with X children, business person, etc.)
3. SETTING: Studio with white backdrop, outdoor location, home setting, office environment?
4. EMOTIONS: Professional, candid, intimate, playful, formal?
5. CLOTHING: Formal attire, casual wear, maternity dresses, business suits?
6. SPECIFICS: Any unique elements, props, poses, or notable features?

Be very precise - the content must match these exact images, not generic assumptions.`
            },
            ...images.map(img => ({
              type: "image_url" as const,
              image_url: {
                url: `data:image/jpeg;base64,${img.buffer.toString('base64')}`
              }
            }))
          ]
        }
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: imageMessages,
        max_tokens: 800,
        temperature: 0.3 // Lower temperature for more precise analysis
      });

      const analysis = response.choices[0]?.message?.content || '';
      console.log('✅ Detailed image analysis:', analysis.substring(0, 300) + '...');
      
      // Parse the analysis into structured data
      return this.parseImageAnalysis(analysis);
      
    } catch (error) {
      console.error('❌ Image analysis failed:', error);
      return {
        sessionType: 'family',
        subjects: 'family members',
        setting: 'professional studio',
        emotions: 'warm and professional',
        clothing: 'coordinated outfits',
        specifics: 'professional photography session'
      };
    }
  }

  /**
   * Parse image analysis response into structured data
   */
  private parseImageAnalysis(analysis: string): ImageAnalysisResult {
    const sessionTypeMatch = analysis.match(/SESSION TYPE[:\-\s]*(.*?)(?:\n|$)/i);
    const subjectsMatch = analysis.match(/SUBJECTS[:\-\s]*(.*?)(?:\n|$)/i);
    const settingMatch = analysis.match(/SETTING[:\-\s]*(.*?)(?:\n|$)/i);
    const emotionsMatch = analysis.match(/EMOTIONS[:\-\s]*(.*?)(?:\n|$)/i);
    const clothingMatch = analysis.match(/CLOTHING[:\-\s]*(.*?)(?:\n|$)/i);
    const specificsMatch = analysis.match(/SPECIFICS[:\-\s]*(.*?)(?:\n|$)/i);

    return {
      sessionType: sessionTypeMatch?.[1]?.trim() || this.detectSessionType(analysis),
      subjects: subjectsMatch?.[1]?.trim() || 'photography subjects',
      setting: settingMatch?.[1]?.trim() || 'professional setting',
      emotions: emotionsMatch?.[1]?.trim() || 'warm and professional',
      clothing: clothingMatch?.[1]?.trim() || 'coordinated attire',
      specifics: specificsMatch?.[1]?.trim() || 'professional photography session'
    };
  }

  /**
   * Detect session type from analysis text
   */
  private detectSessionType(analysis: string): string {
    const lowerAnalysis = analysis.toLowerCase();
    
    if (lowerAnalysis.includes('newborn') || lowerAnalysis.includes('baby')) {
      return 'newborn';
    }
    if (lowerAnalysis.includes('maternity') || lowerAnalysis.includes('pregnancy') || lowerAnalysis.includes('pregnant')) {
      return 'maternity';
    }
    if (lowerAnalysis.includes('business') || lowerAnalysis.includes('headshot') || lowerAnalysis.includes('professional portrait')) {
      return 'business';
    }
    if (lowerAnalysis.includes('family') || lowerAnalysis.includes('children') || lowerAnalysis.includes('kids')) {
      return 'family';
    }
    if (lowerAnalysis.includes('couple') || lowerAnalysis.includes('engagement')) {
      return 'couple';
    }
    
    return 'portrait';
  }

  /**
   * Clean content to remove H1/H2 prefixes and excessive ### usage
   */
  cleanContentFormatting(content: string): string {
    console.log('🧹 CONTENT FIX: Cleaning H1/H2 prefixes and markdown formatting...');
    
    let cleanedContent = content;
    
    // Remove "H1:" or "H2:" text prefixes from headings
    cleanedContent = cleanedContent.replace(/^(H1|H2|H3|H4|H5|H6):\s*/gmi, '');
    cleanedContent = cleanedContent.replace(/(<h[1-6][^>]*>)\s*(H1|H2|H3|H4|H5|H6):\s*/gi, '$1');
    
    // Convert excessive ### markdown to proper HTML headings
    cleanedContent = cleanedContent.replace(/#{4,}\s*(.*?)$/gm, '<h3>$1</h3>');
    cleanedContent = cleanedContent.replace(/###\s*(.*?)$/gm, '<h3>$1</h3>');
    cleanedContent = cleanedContent.replace(/##\s*(.*?)$/gm, '<h2>$1</h2>');
    cleanedContent = cleanedContent.replace(/#\s*(.*?)$/gm, '<h1>$1</h1>');
    
    // Remove excessive ### usage within content
    cleanedContent = cleanedContent.replace(/###/g, '');
    
    // Clean up any remaining markdown artifacts
    cleanedContent = cleanedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    cleanedContent = cleanedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Remove any stray # symbols that aren't part of headings
    cleanedContent = cleanedContent.replace(/(?<!<h[1-6][^>]*>)#(?![^<]*<\/h[1-6]>)/g, '');
    
    console.log('✅ Content formatting cleaned');
    return cleanedContent;
  }

  /**
   * Embed images strategically without duplication
   */
  embedImagesWithoutDuplication(content: string, images: any[], featuredImageUrl?: string): string {
    console.log('🖼️ CONTENT FIX: Embedding images without duplication...');
    
    // Track which images have been used
    const usedImages = new Set<string>();
    
    // Mark featured image as used if it exists
    if (featuredImageUrl) {
      const featuredImageIndex = images.findIndex(img => img.publicUrl === featuredImageUrl);
      if (featuredImageIndex !== -1) {
        usedImages.add(featuredImageUrl);
        console.log('🚫 Featured image marked as used, will not duplicate in content');
      }
    }
    
    // Find all paragraphs and H2 sections for strategic placement
    const paragraphs = content.split(/<\/p>/gi).filter(p => p.trim().length > 100);
    const h2Sections = content.split(/<h2[^>]*>/gi);
    
    let contentWithImages = content;
    let imagesEmbedded = 0;
    
    // Calculate distribution strategy
    const availableImages = images.filter(img => !usedImages.has(img.publicUrl));
    const sectionsForImages = Math.min(availableImages.length, Math.max(2, h2Sections.length - 1));
    
    for (let i = 0; i < availableImages.length && imagesEmbedded < sectionsForImages; i++) {
      const image = availableImages[i];
      
      // Skip if already used
      if (usedImages.has(image.publicUrl)) {
        continue;
      }
      
      // Create image HTML with proper alt text based on actual image analysis
      const imageAlt = this.generateContextualAltText(image, imagesEmbedded + 1);
      const imageHtml = `
<figure style="margin: 30px 0; text-align: center;">
  <img src="${image.publicUrl}" alt="${imageAlt}" style="width: 100%; max-width: 600px; height: auto; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);">
</figure>`;
      
      // Find strategic insertion point (after H2 or between paragraphs)
      const targetSectionIndex = Math.floor((i / availableImages.length) * sectionsForImages);
      const insertionPattern = new RegExp(`(<h2[^>]*>.*?</h2>.*?<p>.*?</p>)`, 'i');
      const matches = Array.from(contentWithImages.matchAll(insertionPattern));
      
      if (matches[targetSectionIndex]) {
        const insertPoint = matches[targetSectionIndex].index! + matches[targetSectionIndex][0].length;
        contentWithImages = contentWithImages.substring(0, insertPoint) + imageHtml + contentWithImages.substring(insertPoint);
        imagesEmbedded++;
        usedImages.add(image.publicUrl);
        console.log(`✅ Embedded image ${i + 1} strategically in section ${targetSectionIndex + 1}`);
      }
    }
    
    console.log(`✅ Successfully embedded ${imagesEmbedded} images without duplication`);
    return contentWithImages;
  }

  /**
   * Generate contextual alt text for images
   */
  private generateContextualAltText(image: any, imageNumber: number): string {
    // Use the image filename or generate based on context
    const filename = image.filename || `image-${imageNumber}`;
    
    if (filename.includes('newborn') || filename.includes('baby')) {
      return `Professionelle Neugeborenenfotografie bei New Age Fotografie Wien - Bild ${imageNumber}`;
    }
    if (filename.includes('maternity') || filename.includes('pregnant')) {
      return `Babybauch Fotoshooting in Wien bei New Age Fotografie - Bild ${imageNumber}`;
    }
    if (filename.includes('family')) {
      return `Familienfotografie Session bei New Age Fotografie Wien - Bild ${imageNumber}`;
    }
    if (filename.includes('business') || filename.includes('headshot')) {
      return `Business Headshots bei New Age Fotografie Wien - Bild ${imageNumber}`;
    }
    
    return `Professionelle Fotografie bei New Age Fotografie Wien - Session Bild ${imageNumber}`;
  }

  /**
   * Build enhanced prompt with accurate image analysis
   */
  buildImageAwarePrompt(analysis: ImageAnalysisResult, userGuidance: string): string {
    return `ACCURATE IMAGE ANALYSIS FOR CONTENT MATCHING:

SESSION TYPE: ${analysis.sessionType}
SUBJECTS IN PHOTOS: ${analysis.subjects}
SETTING: ${analysis.setting}
EMOTIONS/MOOD: ${analysis.emotions}
CLOTHING/STYLE: ${analysis.clothing}
SPECIFIC DETAILS: ${analysis.specifics}

USER GUIDANCE: ${userGuidance || 'Create professional content matching the uploaded images exactly'}

CRITICAL CONTENT REQUIREMENTS:
1. Content MUST match the actual images uploaded - no generic assumptions
2. If images show maternity, write about maternity photography 
3. If images show newborn, write about newborn photography
4. If images show family, write about family photography
5. Use EXACT details from image analysis in the content
6. NO H1: or H2: prefixes in headings
7. NO excessive ### markdown usage
8. Create content that reflects what's actually in the photos

STRICT FORMATTING RULES:
- Use clean HTML headings: <h2>Title</h2>
- NO markdown ### symbols in content
- NO "H1:" or "H2:" text prefixes
- Use <p>, <strong>, <em> for proper formatting
- Images will be added separately - focus on matching text content to actual photos`;
  }
}

export const contentProcessor = new ContentQualityProcessor();