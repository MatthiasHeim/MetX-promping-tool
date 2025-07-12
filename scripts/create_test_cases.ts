#!/usr/bin/env tsx

/**
 * Script to automatically create evaluation test cases from MetX dashboard JSON files
 * 
 * Usage:
 * npm run create-test-cases -- --file path/to/dashboard.json --prompts "prompt1,prompt2,prompt3"
 * 
 * Or use the interactive mode:
 * npm run create-test-cases
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import readline from 'readline';

// Load environment variables
config();

interface DashboardTab {
  id: number;
  title: string;
  maps?: {
    layers: any[];
  }[];
}

interface DashboardJSON {
  tabs: DashboardTab[];
}

interface TestCase {
  name: string;
  description: string;
  user_prompt: string;
  expected_json: any[];
  source: string;
  is_active: boolean;
}

class TestCaseCreator {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Parse dashboard JSON and extract layers from each tab
   */
  parseDashboardJSON(filePath: string): { tabs: DashboardTab[], layers: any[][] } {
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      const dashboard: DashboardJSON = JSON.parse(fileContent);

      if (!dashboard.tabs || !Array.isArray(dashboard.tabs)) {
        throw new Error('Invalid dashboard JSON: missing or invalid tabs array');
      }

      const layers: any[][] = [];

      for (const tab of dashboard.tabs) {
        if (tab.maps && tab.maps.length > 0 && tab.maps[0].layers) {
          layers.push(tab.maps[0].layers);
        } else {
          console.warn(`Tab "${tab.title}" has no layers, skipping...`);
          layers.push([]);
        }
      }

      return { tabs: dashboard.tabs, layers };
    } catch (error) {
      throw new Error(`Failed to parse dashboard JSON: ${error.message}`);
    }
  }

  /**
   * Generate descriptive name from tab title and layer types
   */
  generateTestCaseName(tab: DashboardTab, layers: any[]): string {
    const baseTitle = tab.title || `Dashboard ${tab.id}`;
    
    // Extract layer types for more descriptive naming
    const layerTypes = layers
      .filter(layer => layer.kind && !layer.kind.includes('Background'))
      .map(layer => {
        if (layer.parameter_unit) {
          return layer.parameter_unit.split(':')[0];
        }
        return layer.kind?.replace('LayerDescription', '').replace('Description', '');
      })
      .filter(Boolean)
      .slice(0, 3); // Limit to first 3 layer types

    if (layerTypes.length > 0) {
      return `${baseTitle} - ${layerTypes.join(', ')}`;
    }

    return baseTitle;
  }

  /**
   * Generate description from layer analysis
   */
  generateDescription(tab: DashboardTab, layers: any[]): string {
    const layerCount = layers.filter(layer => !layer.kind?.includes('Background')).length;
    const parameters = layers
      .filter(layer => layer.parameter_unit)
      .map(layer => layer.parameter_unit.split(':')[0])
      .filter(Boolean);

    let description = `Test case for generating a dashboard`;
    
    if (parameters.length > 0) {
      description += ` with ${parameters.join(', ')}`;
    }
    
    if (tab.title && !tab.title.includes('Dashboard')) {
      description += ` for ${tab.title}`;
    }

    description += ` (${layerCount} weather layers)`;

    return description;
  }

  /**
   * Create test cases from dashboard and prompts
   */
  async createTestCases(filePath: string, prompts: string[]): Promise<void> {
    const { tabs, layers } = this.parseDashboardJSON(filePath);

    if (tabs.length !== prompts.length) {
      throw new Error(`Mismatch: ${tabs.length} tabs but ${prompts.length} prompts provided`);
    }

    const testCases: TestCase[] = [];

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tabLayers = layers[i];
      const prompt = prompts[i];

      if (tabLayers.length === 0) {
        console.warn(`Skipping tab "${tab.title}" - no layers found`);
        continue;
      }

      const testCase: TestCase = {
        name: this.generateTestCaseName(tab, tabLayers),
        description: this.generateDescription(tab, tabLayers),
        user_prompt: prompt,
        expected_json: tabLayers,
        source: filePath,
        is_active: true
      };

      testCases.push(testCase);
    }

    // Insert test cases into database
    for (const testCase of testCases) {
      try {
        const { error } = await this.supabase
          .from('evaluation_test_cases')
          .insert([testCase]);

        if (error) {
          console.error(`Failed to insert test case "${testCase.name}":`, error.message);
        } else {
          console.log(`✅ Created test case: "${testCase.name}"`);
        }
      } catch (error) {
        console.error(`Error inserting test case "${testCase.name}":`, error);
      }
    }

    console.log(`\n🎉 Successfully processed ${testCases.length} test cases from ${filePath}`);
  }

  /**
   * Interactive mode for creating test cases
   */
  async interactive(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    try {
      console.log('🚀 Interactive Test Case Creator\n');

      const filePath = await question('Enter path to dashboard JSON file: ');
      
      // Parse file to get tab count
      const { tabs } = this.parseDashboardJSON(filePath);
      console.log(`\nFound ${tabs.length} tabs:`);
      tabs.forEach((tab, i) => {
        console.log(`  ${i + 1}. ${tab.title || `Tab ${tab.id}`}`);
      });

      console.log(`\nPlease provide ${tabs.length} prompts (one per tab):`);
      const prompts: string[] = [];
      
      for (let i = 0; i < tabs.length; i++) {
        const prompt = await question(`Prompt ${i + 1}: `);
        prompts.push(prompt);
      }

      console.log('\n📝 Creating test cases...');
      await this.createTestCases(filePath, prompts);

    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      rl.close();
    }
  }
}

// CLI argument parsing
async function main() {
  const args = process.argv.slice(2);
  const creator = new TestCaseCreator();

  try {
    if (args.length === 0) {
      // Interactive mode
      await creator.interactive();
      return;
    }

    // Parse CLI arguments
    const fileIndex = args.findIndex(arg => arg === '--file');
    const promptsIndex = args.findIndex(arg => arg === '--prompts');

    if (fileIndex === -1 || promptsIndex === -1) {
      console.log(`
Usage:
  npm run create-test-cases                                    # Interactive mode
  npm run create-test-cases -- --file path.json --prompts "p1,p2,p3"  # CLI mode
      `);
      process.exit(1);
    }

    const filePath = args[fileIndex + 1];
    const promptsStr = args[promptsIndex + 1];

    if (!filePath || !promptsStr) {
      throw new Error('Missing file path or prompts');
    }

    const prompts = promptsStr.split(',').map(p => p.trim());
    await creator.createTestCases(filePath, prompts);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// ES module equivalent of require.main === module check
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}