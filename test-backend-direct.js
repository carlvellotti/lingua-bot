#!/usr/bin/env node

/**
 * Direct Backend Tests (no server needed)
 * Tests the category data structures directly
 */

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Direct Backend Category Tests\n');
  
  let passed = 0;
  let failed = 0;
  
  // Import the config
  const { interviewCategories, getCategoryById, getQuestionsByIds } = await import('./api/_lib/config.js');
  
  // Test 1: Have 5 categories
  if (await test('Have exactly 5 categories', async () => {
    if (interviewCategories.length !== 5) {
      throw new Error(`Expected 5 categories, got ${interviewCategories.length}`);
    }
    console.log(`   Categories: ${interviewCategories.map(c => c.id).join(', ')}`);
  })) passed++; else failed++;
  
  // Test 2: Each category has 12 questions
  if (await test('Each category has 12 questions', async () => {
    for (const cat of interviewCategories) {
      if (cat.questions.length !== 12) {
        throw new Error(`Category "${cat.id}" has ${cat.questions.length} questions`);
      }
    }
    console.log(`   Total: ${interviewCategories.length * 12} questions`);
  })) passed++; else failed++;
  
  // Test 3: All questions have required fields
  if (await test('All questions have required fields', async () => {
    for (const cat of interviewCategories) {
      for (const q of cat.questions) {
        if (!q.id) throw new Error(`Question missing id in ${cat.id}`);
        if (!q.text) throw new Error(`Question ${q.id} missing text`);
        if (!q.rationale) throw new Error(`Question ${q.id} missing rationale`);
        if (typeof q.estimatedDuration !== 'number') throw new Error(`Question ${q.id} missing duration`);
        if (!q.type) throw new Error(`Question ${q.id} missing type`);
        if (!['rigid', 'exploratory'].includes(q.type)) throw new Error(`Question ${q.id} has invalid type: ${q.type}`);
      }
    }
    console.log(`   All 60 questions validated`);
  })) passed++; else failed++;
  
  // Test 4: All categories have AI guidance
  if (await test('All categories have complete AI guidance', async () => {
    for (const cat of interviewCategories) {
      const g = cat.aiGuidance;
      if (!g) throw new Error(`Category ${cat.id} missing aiGuidance`);
      if (!g.systemStyle) throw new Error(`${cat.id} missing systemStyle`);
      if (!g.questionApproach) throw new Error(`${cat.id} missing questionApproach`);
      if (!g.pacing) throw new Error(`${cat.id} missing pacing`);
      if (!Array.isArray(g.probeFor) || g.probeFor.length === 0) throw new Error(`${cat.id} invalid probeFor`);
      if (!Array.isArray(g.avoid) || g.avoid.length === 0) throw new Error(`${cat.id} invalid avoid`);
      if (!Array.isArray(g.evaluationSignals) || g.evaluationSignals.length === 0) throw new Error(`${cat.id} invalid evaluationSignals`);
    }
    console.log(`   All 5 categories have complete guidance`);
  })) passed++; else failed++;
  
  // Test 5: getCategoryById works
  if (await test('getCategoryById() works correctly', async () => {
    const behavioral = getCategoryById('behavioral');
    if (!behavioral) throw new Error('Could not get behavioral category');
    if (behavioral.id !== 'behavioral') throw new Error('Wrong category returned');
    if (behavioral.name !== 'Behavioral') throw new Error('Wrong category name');
    
    const invalid = getCategoryById('invalid-id');
    if (invalid !== null) throw new Error('Should return null for invalid ID');
    
    console.log(`   Can retrieve: ${behavioral.name} with ${behavioral.questions.length} questions`);
  })) passed++; else failed++;
  
  // Test 6: getQuestionsByIds works
  if (await test('getQuestionsByIds() works correctly', async () => {
    const questions = getQuestionsByIds('behavioral', ['disagreed-engineer', 'owned-decision']);
    if (questions.length !== 2) throw new Error(`Expected 2 questions, got ${questions.length}`);
    if (questions[0].id !== 'disagreed-engineer') throw new Error('Wrong first question');
    if (questions[1].id !== 'owned-decision') throw new Error('Wrong second question');
    
    // Test with invalid IDs
    const partial = getQuestionsByIds('behavioral', ['disagreed-engineer', 'invalid-id']);
    if (partial.length !== 1) throw new Error('Should filter out invalid IDs');
    
    console.log(`   Retrieved: ${questions.map(q => q.id).join(', ')}`);
  })) passed++; else failed++;
  
  // Test 7: Product Sense is all exploratory
  if (await test('Product Sense questions are exploratory', async () => {
    const productSense = getCategoryById('product-sense');
    const explCount = productSense.questions.filter(q => q.type === 'exploratory').length;
    if (explCount !== 12) throw new Error(`Expected 12 exploratory, got ${explCount}`);
    console.log(`   All ${explCount} Product Sense questions are exploratory`);
  })) passed++; else failed++;
  
  // Test 8: Other categories are rigid
  if (await test('Behavioral, Execution, Metrics, Strategy are rigid', async () => {
    const rigidCats = ['behavioral', 'execution', 'metrics', 'strategy'];
    for (const catId of rigidCats) {
      const cat = getCategoryById(catId);
      const rigidCount = cat.questions.filter(q => q.type === 'rigid').length;
      if (rigidCount !== 12) throw new Error(`${catId}: expected 12 rigid, got ${rigidCount}`);
    }
    console.log(`   All 4 categories have 12 rigid questions each`);
  })) passed++; else failed++;
  
  // Test 9: Durations are reasonable
  if (await test('Question durations are reasonable', async () => {
    for (const cat of interviewCategories) {
      for (const q of cat.questions) {
        if (q.estimatedDuration < 3) throw new Error(`${q.id}: duration too short (${q.estimatedDuration})`);
        if (q.estimatedDuration > 20) throw new Error(`${q.id}: duration too long (${q.estimatedDuration})`);
      }
    }
    
    // Check category averages
    const behavioral = getCategoryById('behavioral');
    const behavioralAvg = behavioral.questions.reduce((sum, q) => sum + q.estimatedDuration, 0) / 12;
    
    const productSense = getCategoryById('product-sense');
    const productSenseAvg = productSense.questions.reduce((sum, q) => sum + q.estimatedDuration, 0) / 12;
    
    console.log(`   Behavioral avg: ${behavioralAvg.toFixed(1)} min, Product Sense avg: ${productSenseAvg.toFixed(1)} min`);
  })) passed++; else failed++;
  
  // Test 10: No duplicate question IDs
  if (await test('No duplicate question IDs', async () => {
    const allIds = new Set();
    for (const cat of interviewCategories) {
      for (const q of cat.questions) {
        if (allIds.has(q.id)) throw new Error(`Duplicate question ID: ${q.id}`);
        allIds.add(q.id);
      }
    }
    console.log(`   All ${allIds.size} question IDs are unique`);
  })) passed++; else failed++;
  
  // Test 11: Category descriptions exist
  if (await test('All categories have descriptions', async () => {
    for (const cat of interviewCategories) {
      if (!cat.description || cat.description.length < 10) {
        throw new Error(`Category ${cat.id} has insufficient description`);
      }
    }
    console.log(`   All categories have meaningful descriptions`);
  })) passed++; else failed++;
  
  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}\n`);
  
  if (passed === 11) {
    console.log('🎉 All backend data structure tests passed!');
    console.log('\nCategory Summary:');
    for (const cat of interviewCategories) {
      const totalDuration = cat.questions.reduce((sum, q) => sum + q.estimatedDuration, 0);
      const avgDuration = (totalDuration / cat.questions.length).toFixed(1);
      const types = cat.questions.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1;
        return acc;
      }, {});
      console.log(`  ${cat.name}: ${cat.questions.length}Q, ~${avgDuration} min avg, ${JSON.stringify(types)}`);
    }
  }
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

