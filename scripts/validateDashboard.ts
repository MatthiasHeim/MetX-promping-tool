#!/usr/bin/env tsx
/**
 * Dashboard Validation Script
 * 
 * This script validates and fixes MetX dashboard JSON files to ensure they have
 * all required fields and proper ID relationships for successful upload.
 * 
 * Usage:
 *   npx tsx scripts/validateDashboard.ts <path-to-dashboard.json>
 *   npx tsx scripts/validateDashboard.ts eval_inputs/AI_12400_metx.json
 */

import fs from 'fs';
import { validateAndFixDashboard, ValidationResult } from '../src/utils/dashboardValidator.js';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/validateDashboard.ts <path-to-dashboard.json>');
    process.exit(1);
  }
  
  const dashboardPath = args[0];
  
  if (!fs.existsSync(dashboardPath)) {
    console.error(`File not found: ${dashboardPath}`);
    process.exit(1);
  }
  
  try {
    // Read the dashboard JSON
    const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');
    const dashboard = JSON.parse(dashboardContent);
    
    console.log(`🔍 Validating dashboard: ${dashboardPath}`);
    console.log(`📊 Dashboard ID: ${dashboard.id}, Title: "${dashboard.title}"`);
    
    // Validate and fix the dashboard
    const { dashboard: fixedDashboard, validation } = validateAndFixDashboard(dashboard);
    
    // Print validation results
    printValidationResults(validation);
    
    // Count layers by type
    const layerStats = countLayersByType(fixedDashboard);
    console.log('\n📈 Layer Statistics:');
    Object.entries(layerStats).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} layer(s)`);
    });
    
    // If there were issues, save the fixed version
    if (!validation.isValid || validation.warnings.length > 0) {
      const fixedPath = dashboardPath.replace('.json', '_fixed.json');
      fs.writeFileSync(fixedPath, JSON.stringify(fixedDashboard, null, 2));
      console.log(`\n💾 Fixed dashboard saved to: ${fixedPath}`);
    } else {
      console.log('\n✅ Dashboard is valid - no fixes needed!');
    }
    
    // Print summary
    console.log(`\n📋 Summary:`);
    console.log(`  Status: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`  Errors: ${validation.errors.length}`);
    console.log(`  Warnings: ${validation.warnings.length}`);
    console.log(`  Total layers: ${getTotalLayerCount(fixedDashboard)}`);
    
  } catch (error) {
    console.error('❌ Error processing dashboard:', error);
    process.exit(1);
  }
}

function printValidationResults(validation: ValidationResult) {
  console.log(`\n🔍 Validation Results:`);
  console.log(`  Overall Status: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (validation.errors.length > 0) {
    console.log(`\n❌ Errors (${validation.errors.length}):`);
    validation.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${validation.warnings.length}):`);
    validation.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning}`);
    });
  }
  
  if (validation.isValid && validation.warnings.length === 0) {
    console.log('  🎉 No issues found!');
  }
}

function countLayersByType(dashboard: any): Record<string, number> {
  const counts: Record<string, number> = {};
  
  dashboard.tabs?.forEach((tab: any) => {
    tab.maps?.forEach((map: any) => {
      map.layers?.forEach((layer: any) => {
        const type = layer.kind || 'Unknown';
        counts[type] = (counts[type] || 0) + 1;
      });
    });
  });
  
  return counts;
}

function getTotalLayerCount(dashboard: any): number {
  let total = 0;
  dashboard.tabs?.forEach((tab: any) => {
    tab.maps?.forEach((map: any) => {
      total += map.layers?.length || 0;
    });
  });
  return total;
}

// Run the script
main();