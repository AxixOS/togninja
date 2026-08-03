// agent/core/self-reasoning-demo.ts - Working demonstration of self-reasoning system
import { selfDiagnosis } from './self-diagnosis';

export async function demonstrateSelfReasoning() {
  console.log('🧠 DEMONSTRATING SELF-REASONING SYSTEM:');
  
  // Test 1: Database column error
  const testError1 = 'column "total" of relation "crm_invoice_items" does not exist';
  console.log('\n🔍 Test 1: Database column error');
  
  const diagnosis1 = await selfDiagnosis.diagnose(testError1, {
    table: 'crm_invoice_items',
    operation: 'INSERT'
  });
  
  console.log(`✅ Issue identified: ${diagnosis1.issue}`);
  console.log(`🎯 Root cause: ${diagnosis1.root_cause}`);
  console.log(`💡 Solutions: ${diagnosis1.suggested_fixes.join(', ')}`);
  console.log(`🤖 Auto-fix available: ${diagnosis1.auto_fix_available}`);
  
  // Test 2: Unknown error pattern
  const testError2 = 'Cannot read properties of undefined reading foobarbaz';
  console.log('\n🔍 Test 2: Unknown error pattern');
  
  const diagnosis2 = await selfDiagnosis.diagnose(testError2, {
    operation: 'data_access'
  });
  
  console.log(`✅ Issue identified: ${diagnosis2.issue}`);
  console.log(`🎯 Root cause: ${diagnosis2.root_cause}`);
  console.log(`💡 Solutions: ${diagnosis2.suggested_fixes.join(', ')}`);
  
  // Test 3: Connection error
  const testError3 = 'Connection timeout to database server';
  console.log('\n🔍 Test 3: Connection timeout error');
  
  const diagnosis3 = await selfDiagnosis.diagnose(testError3, {
    service: 'database'
  });
  
  console.log(`✅ Issue identified: ${diagnosis3.issue}`);
  console.log(`🎯 Root cause: ${diagnosis3.root_cause}`);
  console.log(`💡 Solutions: ${diagnosis3.suggested_fixes.join(', ')}`);
  console.log(`🤖 Auto-fix available: ${diagnosis3.auto_fix_available}`);
  
  console.log('\n🎉 Self-reasoning system demonstration complete!');
  
  return {
    test1: diagnosis1,
    test2: diagnosis2,
    test3: diagnosis3,
    summary: `Self-reasoning system can identify and suggest fixes for ${diagnosis1.auto_fix_available + diagnosis3.auto_fix_available}/3 error types automatically`
  };
}