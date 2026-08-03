// agent/core/self-diagnosis.ts - Self-diagnosis and error resolution system
import { knowledgeBase } from './knowledge-base';
import { toolRegistry } from './tools';

export interface DiagnosisResult {
  issue: string;
  root_cause: string;
  suggested_fixes: string[];
  confidence: number;
  auto_fix_available: boolean;
  fix_steps?: Array<{
    action: string;
    tool?: string;
    parameters?: any;
  }>;
}

export class SelfDiagnosisSystem {
  private commonIssues = new Map<string, DiagnosisResult>();

  constructor() {
    this.initializeCommonIssues();
  }

  // Initialize database of common issues and their solutions
  private initializeCommonIssues() {
    // Database schema issues
    this.commonIssues.set('column_not_exist', {
      issue: 'Database column does not exist',
      root_cause: 'Code is trying to insert into a column that doesn\'t exist in the database table',
      suggested_fixes: [
        'Add missing column to database table using ALTER TABLE',
        'Update code to match actual database schema',
        'Run database migration to sync schema'
      ],
      confidence: 0.95,
      auto_fix_available: true,
      fix_steps: [
        {
          action: 'Analyze database schema',
          tool: 'execute_sql',
          parameters: { query: 'DESCRIBE table_name' }
        },
        {
          action: 'Add missing column',
          tool: 'execute_sql',
          parameters: { query: 'ALTER TABLE table_name ADD COLUMN column_name TYPE' }
        }
      ]
    });

    // Tool execution failures
    this.commonIssues.set('tool_execution_failed', {
      issue: 'Tool execution failed with errors',
      root_cause: 'Tool parameters are invalid or system dependencies are missing',
      suggested_fixes: [
        'Validate tool parameters against schema',
        'Check system dependencies and connections',
        'Retry with corrected parameters'
      ],
      confidence: 0.85,
      auto_fix_available: false
    });

    // Search returning no results
    this.commonIssues.set('no_search_results', {
      issue: 'Search queries returning no results',
      root_cause: 'Search terms too specific or data doesn\'t exist in database',
      suggested_fixes: [
        'Try broader search terms',
        'Check if data exists in database',
        'Use fuzzy search or partial matching'
      ],
      confidence: 0.80,
      auto_fix_available: true,
      fix_steps: [
        {
          action: 'Try broader search',
          tool: 'global_search',
          parameters: { term: 'broadened_search_term' }
        }
      ]
    });
  }

  // Main diagnosis method - DISABLED to prevent infinite loops
  async diagnose(error: string, context: any = {}): Promise<DiagnosisResult> {
    console.log('✅ Self-diagnosis DISABLED - skipping to direct execution');

    // Return a no-op diagnosis that forces direct execution
    return {
      issue: 'Direct execution mode',
      root_cause: 'Diagnosis system bypassed for immediate action',
      suggested_fixes: ['Proceeding with direct tool execution'],
      confidence: 1.0,
      auto_fix_available: false
    };
  }

  // Pattern match against known issues
  private async patternMatch(error: string, context: any): Promise<DiagnosisResult | null> {
    const errorLower = error.toLowerCase();

    // Database column errors
    if (errorLower.includes('column') && errorLower.includes('does not exist')) {
      const diagnosis = this.commonIssues.get('column_not_exist')!;
      // Extract table and column names from error
      const tableMatch = error.match(/relation "([^"]+)"/);
      const columnMatch = error.match(/column "([^"]+)"/);
      
      if (tableMatch && columnMatch) {
        diagnosis.fix_steps = [{
          action: `Add missing column ${columnMatch[1]} to table ${tableMatch[1]}`,
          tool: 'execute_sql',
          parameters: {
            query: `ALTER TABLE ${tableMatch[1]} ADD COLUMN ${columnMatch[1]} TEXT`
          }
        }];
      }
      
      return diagnosis;
    }

    // SQL syntax errors
    if (errorLower.includes('syntax error') || errorLower.includes('invalid sql')) {
      return {
        issue: 'SQL syntax error',
        root_cause: 'Invalid SQL query structure or unsupported syntax',
        suggested_fixes: [
          'Review SQL query syntax',
          'Check for typos in table/column names',
          'Verify SQL dialect compatibility'
        ],
        confidence: 0.90,
        auto_fix_available: false
      };
    }

    // Connection errors
    if (errorLower.includes('connection') || errorLower.includes('timeout')) {
      return {
        issue: 'Database connection issue',
        root_cause: 'Cannot establish connection to database server',
        suggested_fixes: [
          'Check database server status',
          'Verify connection credentials',
          'Test network connectivity'
        ],
        confidence: 0.85,
        auto_fix_available: true,
        fix_steps: [{
          action: 'Test database connection',
          tool: 'execute_sql',
          parameters: { query: 'SELECT 1' }
        }]
      };
    }

    return null;
  }

  // Search knowledge base for similar issues
  private async knowledgeBaseDiagnosis(error: string, context: any): Promise<DiagnosisResult | null> {
    try {
      const searchResults = await knowledgeBase.search(`Error: ${error}`, 3, 0.7);
      
      if (searchResults.length === 0) {
        return null;
      }

      const mostRelevant = searchResults[0];
      
      // Extract solution from knowledge base document
      const content = mostRelevant.document.content;
      const solutionMatch = content.match(/Solution: (.*?)(?:\n|$)/);
      const causesMatch = content.match(/Causes: (.*?)(?:\n|$)/);
      
      return {
        issue: error,
        root_cause: causesMatch ? causesMatch[1] : 'Previously encountered issue',
        suggested_fixes: solutionMatch ? [solutionMatch[1]] : ['Apply documented solution'],
        confidence: mostRelevant.similarity,
        auto_fix_available: false
      };
      
    } catch (kbError) {
      console.error('Knowledge base diagnosis failed:', kbError);
      return null;
    }
  }

  // Generate new diagnosis for unknown errors
  private async generateDiagnosis(error: string, context: any): Promise<DiagnosisResult> {
    // Basic heuristic-based diagnosis
    const suggestions = [];
    
    if (error.includes('undefined') || error.includes('null')) {
      suggestions.push('Check for null/undefined values in data');
      suggestions.push('Add proper error handling for missing data');
    }
    
    if (error.includes('permission') || error.includes('access')) {
      suggestions.push('Check user permissions and access rights');
      suggestions.push('Verify authentication credentials');
    }
    
    if (error.includes('timeout')) {
      suggestions.push('Increase timeout limits');
      suggestions.push('Check for performance issues');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Review error logs for more details');
      suggestions.push('Check system dependencies and configuration');
    }

    return {
      issue: error,
      root_cause: 'Unknown error pattern - requires investigation',
      suggested_fixes: suggestions,
      confidence: 0.50,
      auto_fix_available: false
    };
  }

  // Learn from errors by storing solutions in knowledge base
  private async learnFromError(error: string, context: any, diagnosis: DiagnosisResult) {
    try {
      const learningDocument = `
Error: ${error}
Context: ${JSON.stringify(context, null, 2)}
Root Cause: ${diagnosis.root_cause}
Solutions: ${diagnosis.suggested_fixes.join('; ')}
Confidence: ${diagnosis.confidence}
Timestamp: ${new Date().toISOString()}
`;

      await knowledgeBase.addDocument(learningDocument, {
        type: 'error_diagnosis',
        error_type: this.classifyError(error),
        confidence: diagnosis.confidence,
        auto_fix: diagnosis.auto_fix_available
      });

      console.log('📚 Learned from error and stored in knowledge base');
    } catch (learnError) {
      console.error('Failed to learn from error:', learnError);
    }
  }

  // Classify error types for better organization
  private classifyError(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('sql') || errorLower.includes('database')) return 'database';
    if (errorLower.includes('connection') || errorLower.includes('network')) return 'connectivity';
    if (errorLower.includes('permission') || errorLower.includes('access')) return 'authorization';
    if (errorLower.includes('syntax') || errorLower.includes('parsing')) return 'syntax';
    if (errorLower.includes('timeout') || errorLower.includes('performance')) return 'performance';
    
    return 'general';
  }

  // Attempt automatic fixes for supported issues
  async attemptAutoFix(diagnosis: DiagnosisResult, context: any): Promise<boolean> {
    if (!diagnosis.auto_fix_available || !diagnosis.fix_steps) {
      console.log('❌ Auto-fix not available for this issue');
      return false;
    }

    console.log('🔧 Attempting automatic fix...');
    
    try {
      for (const step of diagnosis.fix_steps) {
        console.log(`⚡ Executing fix step: ${step.action}`);
        
        if (step.tool && toolRegistry.has(step.tool)) {
          const tool = toolRegistry.get(step.tool)!;
          await tool.handler(step.parameters || {}, context);
          console.log(`✅ Fix step completed: ${step.action}`);
        } else {
          console.log(`⚠️ Cannot execute step - tool ${step.tool} not available`);
        }
      }
      
      console.log('🎉 Auto-fix completed successfully');
      return true;
      
    } catch (fixError) {
      console.error('❌ Auto-fix failed:', fixError);
      
      // Learn from failed fix attempt
      await this.learnFromError(`Auto-fix failed: ${fixError.message}`, context, {
        issue: 'Auto-fix failure',
        root_cause: 'Fix steps could not be executed successfully',
        suggested_fixes: ['Manual intervention required', 'Review fix steps'],
        confidence: 0.80,
        auto_fix_available: false
      });
      
      return false;
    }
  }
}

// Singleton instance
export const selfDiagnosis = new SelfDiagnosisSystem();