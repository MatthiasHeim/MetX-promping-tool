import fs from 'fs';

// Read the ultimate fixed dashboard
const dashboard = JSON.parse(fs.readFileSync('./examples/broken_dashboards/metx-dashboard-Gemini-ULTIMATE-FIXED.json', 'utf8'));

console.log('🔧 Creating version with completely new IDs...');

// Generate new unique IDs starting from a high number to avoid conflicts
let idCounter = 999000;
function getNewId() {
  return idCounter++;
}

// Store ID mappings for referential integrity
const idMappings = {};

// 1. Generate new dashboard ID
const oldDashboardId = dashboard.id;  
const newDashboardId = getNewId();
dashboard.id = newDashboardId;
idMappings[oldDashboardId] = newDashboardId;
console.log(`Dashboard ID: ${oldDashboardId} → ${newDashboardId}`);

// 2. Update global_datetime  
const oldGlobalDatetimeId = dashboard.global_datetime.id;
const newGlobalDatetimeId = getNewId();
dashboard.global_datetime.id = newGlobalDatetimeId;
dashboard.global_datetime.id_profile = newDashboardId; // Must match dashboard ID
idMappings[oldGlobalDatetimeId] = newGlobalDatetimeId;
console.log(`Global datetime ID: ${oldGlobalDatetimeId} → ${newGlobalDatetimeId}`);

// 3. Process tabs
dashboard.tabs.forEach((tab, tabIndex) => {
  const oldTabId = tab.id;
  const newTabId = getNewId();
  tab.id = newTabId;
  tab.id_profile = newDashboardId; // Must match dashboard ID
  idMappings[oldTabId] = newTabId;
  console.log(`  Tab ${tabIndex} ID: ${oldTabId} → ${newTabId}`);
  
  // Update tab_active reference
  if (dashboard.tab_active === oldTabId) {
    dashboard.tab_active = newTabId;
    console.log(`  Updated tab_active: ${oldTabId} → ${newTabId}`);
  }
  
  // Update tab datetime
  if (tab.datetime) {
    const oldTabDatetimeId = tab.datetime.id;
    const newTabDatetimeId = getNewId();
    tab.datetime.id = newTabDatetimeId;
    tab.datetime.id_profile = newDashboardId; // Must match dashboard ID
    idMappings[oldTabDatetimeId] = newTabDatetimeId;
    console.log(`    Tab datetime ID: ${oldTabDatetimeId} → ${newTabDatetimeId}`);
  }
  
  // 4. Process layouts
  tab.layouts?.forEach((layout, layoutIndex) => {
    const oldLayoutId = layout.id;
    const newLayoutId = getNewId();
    layout.id = newLayoutId;
    layout.id_tab = newTabId; // Must reference new tab ID
    idMappings[oldLayoutId] = newLayoutId;
    console.log(`    Layout ${layoutIndex} ID: ${oldLayoutId} → ${newLayoutId}`);
  });
  
  // 5. Process viewports
  tab.viewports?.forEach((viewport, viewportIndex) => {
    const oldViewportId = viewport.id;
    const newViewportId = getNewId();
    viewport.id = newViewportId;
    viewport.id_profile = newDashboardId; // Must match dashboard ID
    idMappings[oldViewportId] = newViewportId;
    console.log(`    Viewport ${viewportIndex} ID: ${oldViewportId} → ${newViewportId}`);
  });
  
  // 6. Process maps
  tab.maps?.forEach((map, mapIndex) => {
    const oldMapId = map.id;
    const newMapId = getNewId();
    map.id = newMapId;
    map.id_profile = newDashboardId; // Must match dashboard ID
    map.id_tab = newTabId; // Must reference new tab ID
    
    // Update id_viewport reference
    if (map.id_viewport && idMappings[map.id_viewport]) {
      map.id_viewport = idMappings[map.id_viewport];
    }
    
    idMappings[oldMapId] = newMapId;
    console.log(`    Map ${mapIndex} ID: ${oldMapId} → ${newMapId}`);
    
    // Update layout references to this map
    tab.layouts?.forEach(layout => {
      if (layout.id_tool === oldMapId) {
        layout.id_tool = newMapId;
        console.log(`      Updated layout id_tool: ${oldMapId} → ${newMapId}`);
      }
    });
    
    // 7. Process layers
    map.layers?.forEach((layer, layerIndex) => {
      const oldLayerId = layer.id;
      const newLayerId = getNewId();
      layer.id = newLayerId;
      layer.id_profile = newDashboardId; // Must match dashboard ID
      layer.id_cartographicmap = newMapId; // Must reference new map ID
      
      // Add id_tab for GridLayerDescription
      if (layer.kind === 'GridLayerDescription') {
        layer.id_tab = newTabId;
      }
      
      idMappings[oldLayerId] = newLayerId;
      console.log(`      Layer ${layerIndex} (${layer.kind}) ID: ${oldLayerId} → ${newLayerId}`);
    });
  });
});

// Save the version with new IDs
const newIdPath = './examples/broken_dashboards/metx-dashboard-Gemini-NEW-IDS.json';
fs.writeFileSync(newIdPath, JSON.stringify(dashboard, null, 2));

console.log(`\n💾 Dashboard with new IDs saved to: ${newIdPath}`);
console.log(`\n🎯 Generated ${idCounter - 999000} new unique IDs`);
console.log('📋 All referential integrity maintained with new ID mappings');
console.log('\n🚀 This should avoid any ID conflicts with existing MetX objects!');