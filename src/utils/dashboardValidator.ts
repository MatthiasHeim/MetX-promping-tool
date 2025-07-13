/**
 * Dashboard Layer Validation Utility
 * 
 * Validates MetX dashboard JSON structure to ensure all required fields are present
 * and properly structured for successful upload to MetX platform.
 * 
 * Based on analysis of 299 layer instances across 13 different layer types
 * from examples/dashboards directory.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LayerValidationContext {
  dashboardId: number;
  tabId: number;
  mapId: number;
  layerIndex: number;
}

// Universal required fields present in ALL layer types
const UNIVERSAL_REQUIRED_FIELDS = [
  'id',
  'id_profile', 
  'id_cartographicmap',
  'index',
  'kind',
  'opacity',
  'show',
  'calibrated',
  'vertical_interpolation',
  'experimental',
  'custom_options',
  'time_created',
  'time_updated'
] as const;

// Weather model fields present in most weather data layers
const WEATHER_MODEL_FIELDS = [
  'model',
  'parameter_unit',
  'ens_select',
  'show_init_time'
] as const;

// Layer type specific required fields
const LAYER_TYPE_REQUIREMENTS: Record<string, string[]> = {
  'AviationLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    'aviation_type',
    'text_size'
  ],
  
  'BackgroundMapDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    'style'
  ],
  
  'BarbsLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'element_color',
    'parameter_unit_paired',
    'step'
  ],
  
  'GenericPoiLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'legend_visible',
    'poiOptions'
  ],
  
  'GridLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'step',
    'text_color',
    'text_size'
  ],
  
  'IsoLinesLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'filter_gauss',
    'filter_median',
    'line_color',
    'line_width',
    'text_color',
    'text_size',
    'value_range',
    'values'
  ],
  
  'LightningLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'legend_visible',
    'text_color',
    'text_size'
  ],
  
  'PressureSystemLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'filter_gauss',
    'filter_median',
    'line_color',
    'line_width',
    'text_color',
    'text_size',
    'value_range',
    'values'
  ],
  
  'StationLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'text_color',
    'text_size'
  ],
  
  'SymbolLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'layer_type',
    'step'
  ],
  
  'WeatherFrontsLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'line_width',
    'text_size'
  ],
  
  'WindAnimationLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'color_map',
    'parameter_unit_paired'
  ],
  
  'WmsLayerDescription': [
    ...UNIVERSAL_REQUIRED_FIELDS,
    ...WEATHER_MODEL_FIELDS,
    'color_map',
    'legend_visible'
  ]
};

/**
 * Validates a single layer against its type requirements
 */
export function validateLayer(
  layer: any, 
  context: LayerValidationContext
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if layer exists
  if (!layer) {
    return {
      isValid: false,
      errors: ['Layer is null or undefined'],
      warnings: []
    };
  }
  
  // Check for kind field first
  if (!layer.kind) {
    errors.push('Layer missing required "kind" field');
    return { isValid: false, errors, warnings };
  }
  
  // Get required fields for this layer type
  const requiredFields = LAYER_TYPE_REQUIREMENTS[layer.kind];
  if (!requiredFields) {
    warnings.push(`Unknown layer type: ${layer.kind}. Using universal validation only.`);
    // Fall back to universal fields
    const missingFields = UNIVERSAL_REQUIRED_FIELDS.filter(field => 
      !(field in layer) || layer[field] === undefined
    );
    if (missingFields.length > 0) {
      errors.push(`Missing universal required fields: ${missingFields.join(', ')}`);
    }
  } else {
    // Check all required fields for this layer type
    const missingFields = requiredFields.filter(field => 
      !(field in layer) || layer[field] === undefined
    );
    if (missingFields.length > 0) {
      errors.push(`Missing required fields for ${layer.kind}: ${missingFields.join(', ')}`);
    }
  }
  
  // Validate ID relationships using template structure
  if (layer.id_profile !== context.dashboardId) {
    errors.push(`Layer id_profile (${layer.id_profile}) should match dashboard ID (${context.dashboardId})`);
  }
  
  if (layer.id_cartographicmap !== context.mapId) {
    errors.push(`Layer id_cartographicmap (${layer.id_cartographicmap}) should match map ID (${context.mapId})`);
  }
  
  if (layer.index !== context.layerIndex) {
    warnings.push(`Layer index (${layer.index}) doesn't match expected index (${context.layerIndex})`);
  }
  
  // Validate field types
  if (typeof layer.opacity !== 'number' || layer.opacity < 0 || layer.opacity > 1) {
    errors.push(`Layer opacity must be a number between 0 and 1, got: ${layer.opacity}`);
  }
  
  if (typeof layer.show !== 'boolean') {
    errors.push(`Layer show must be boolean, got: ${typeof layer.show}`);
  }
  
  if (typeof layer.experimental !== 'boolean') {
    errors.push(`Layer experimental must be boolean, got: ${typeof layer.experimental}`);
  }
  
  if (typeof layer.index !== 'number') {
    errors.push(`Layer index must be number, got: ${typeof layer.index}`);
  }
  
  // Validate timestamps
  if (layer.time_created && !isValidISOTimestamp(layer.time_created)) {
    errors.push(`Invalid time_created timestamp: ${layer.time_created}`);
  }
  
  if (layer.time_updated && !isValidISOTimestamp(layer.time_updated)) {
    errors.push(`Invalid time_updated timestamp: ${layer.time_updated}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates all layers in a dashboard
 */
export function validateDashboardLayers(dashboard: any): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  
  if (!dashboard.tabs || !Array.isArray(dashboard.tabs)) {
    return {
      isValid: false,
      errors: ['Dashboard must have tabs array'],
      warnings: []
    };
  }
  
  dashboard.tabs.forEach((tab: any, tabIndex: number) => {
    if (!tab.maps || !Array.isArray(tab.maps)) {
      allWarnings.push(`Tab ${tabIndex} has no maps array`);
      return;
    }
    
    tab.maps.forEach((map: any, mapIndex: number) => {
      if (!map.layers || !Array.isArray(map.layers)) {
        allWarnings.push(`Tab ${tabIndex}, Map ${mapIndex} has no layers array`);
        return;
      }
      
      map.layers.forEach((layer: any, layerIndex: number) => {
        const context: LayerValidationContext = {
          dashboardId: dashboard.id,
          tabId: tab.id,
          mapId: map.id,
          layerIndex: layerIndex
        };
        
        const result = validateLayer(layer, context);
        
        // Prefix errors and warnings with location info
        result.errors.forEach(error => {
          allErrors.push(`Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}: ${error}`);
        });
        
        result.warnings.forEach(warning => {
          allWarnings.push(`Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}: ${warning}`);
        });
      });
    });
  });
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Fix layer indexing to ensure sequential indices starting from 0
 */
function fixLayerIndexing(dashboard: any): string[] {
  const fixes: string[] = []
  
  dashboard.tabs?.forEach((tab: any, tabIndex: number) => {
    tab.maps?.forEach((map: any, mapIndex: number) => {
      if (map.layers && Array.isArray(map.layers)) {
        // Check current indices
        const currentIndices = map.layers.map((layer: any) => layer.index).sort((a: number, b: number) => a - b)
        
        // Check if indices are sequential starting from 0
        const isSequential = currentIndices.every((index: number, i: number) => index === i)
        
        if (!isSequential) {
          // Fix layer indices to be sequential starting from 0
          map.layers.forEach((layer: any, layerIndex: number) => {
            const oldIndex = layer.index
            layer.index = layerIndex
            if (oldIndex !== layerIndex) {
              fixes.push(`Fixed layer index in Tab ${tabIndex}, Map ${mapIndex}: ${oldIndex} → ${layerIndex}`)
            }
          })
        }
      }
    })
  })
  
  return fixes
}

/**
 * Fix field consistency issues found in MetX uploads
 */
function fixFieldConsistency(dashboard: any): string[] {
  const fixes: string[] = []
  
  dashboard.tabs?.forEach((tab: any, tabIndex: number) => {
    tab.maps?.forEach((map: any, mapIndex: number) => {
      map.layers?.forEach((layer: any, layerIndex: number) => {
        
        // Fix BackgroundMapDescription custom_options
        if (layer.kind === 'BackgroundMapDescription' && layer.custom_options) {
          // Standardize show_state_border to null (not false)
          if (layer.custom_options.show_state_border === false) {
            layer.custom_options.show_state_border = null
            fixes.push(`Fixed show_state_border: false → null in Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}`)
          }
          
          // Ensure map_label_language is "en" (not null)
          if (layer.custom_options.map_label_language === null) {
            layer.custom_options.map_label_language = "en"
            fixes.push(`Fixed map_label_language: null → "en" in Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}`)
          }
        }
        
        // Fix vertical_interpolation consistency
        if (layer.kind === 'BackgroundMapDescription') {
          // Background layers should use "none" if not null
          if (layer.vertical_interpolation === null && layer.style !== "basic") {
            layer.vertical_interpolation = "none"
            fixes.push(`Fixed vertical_interpolation: null → "none" for background layer in Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}`)
          }
        }
        
        // Fix show_init_time consistency for WMS layers
        if (layer.kind === 'WmsLayerDescription') {
          if (layer.show_init_time === null) {
            layer.show_init_time = false
            fixes.push(`Fixed show_init_time: null → false for WMS layer in Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}`)
          }
        }
      })
    })
  })
  
  return fixes
}

/**
 * Fix layer parameter issues that prevent rendering
 */
function fixLayerParameters(dashboard: any): string[] {
  const fixes: string[] = []
  
  dashboard.tabs?.forEach((tab: any, tabIndex: number) => {
    tab.maps?.forEach((map: any, mapIndex: number) => {
      map.layers?.forEach((layer: any, layerIndex: number) => {
        
        // Fix WindAnimationLayerDescription issues
        if (layer.kind === 'WindAnimationLayerDescription') {
          // Fix incorrect parameter_unit
          if (layer.parameter_unit === 'wind_speed_u_10m:ms') {
            layer.parameter_unit = 'wind_speed_10m:ms'
            fixes.push(`Fixed WindAnimation parameter_unit: wind_speed_u_10m:ms → wind_speed_10m:ms in Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}`)
          }
          
          // Add missing parameter_unit_paired
          if (!layer.parameter_unit_paired) {
            layer.parameter_unit_paired = 'wind_dir_10m:d'
            fixes.push(`Added missing parameter_unit_paired: wind_dir_10m:d for WindAnimation in Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}`)
          }
          
          // Ensure proper color_map
          if (!layer.color_map || layer.color_map === 'wind_jet') {
            layer.color_map = 'gray_transparent'
            fixes.push(`Fixed WindAnimation color_map: ${layer.color_map || 'empty'} → gray_transparent in Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}`)
          }
        }
        
        // Fix WmsLayerDescription color_map consistency
        if (layer.kind === 'WmsLayerDescription') {
          // Fix empty color_map
          if (!layer.color_map || layer.color_map === '') {
            if (layer.parameter_unit?.includes('precip')) {
              layer.color_map = 'precip_segmented'
            } else if (layer.parameter_unit?.includes('t_2m')) {
              layer.color_map = 't_europe'
            } else if (layer.parameter_unit?.includes('cloud')) {
              layer.color_map = 'gray_transparent_dark'
            } else {
              layer.color_map = 'gray_transparent'
            }
            fixes.push(`Fixed WMS color_map: empty → ${layer.color_map} for ${layer.parameter_unit} in Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}`)
          }
        }
        
        // Fix calibrated field - must be null, not false
        if (layer.calibrated === false) {
          layer.calibrated = null
          fixes.push(`Fixed calibrated: false → null for layer ${layerIndex} in Tab ${tabIndex}, Map ${mapIndex}`)
        }
        
        // Fix vertical_interpolation field - must be null for non-background layers
        if (layer.kind !== 'BackgroundMapDescription' && layer.vertical_interpolation === 'none') {
          layer.vertical_interpolation = null
          fixes.push(`Fixed vertical_interpolation: "none" → null for ${layer.kind} layer ${layerIndex} in Tab ${tabIndex}, Map ${mapIndex}`)
        }
        
        // Ensure all layers have consistent timestamps
        const parentTimestamp = dashboard.time_created || new Date().toISOString()
        if (layer.time_created && layer.time_created !== parentTimestamp) {
          layer.time_created = parentTimestamp
          layer.time_updated = parentTimestamp
          fixes.push(`Synchronized layer timestamps with dashboard in Tab ${tabIndex}, Map ${mapIndex}, Layer ${layerIndex}`)
        }
      })
    })
  })
  
  return fixes
}

/**
 * Fix missing timestamp fields that are required by MetX
 */
function fixMissingTimestamps(dashboard: any): string[] {
  const fixes: string[] = [];
  const now = new Date().toISOString();
  
  // Fix global_datetime timestamps
  if (dashboard.global_datetime) {
    if (!dashboard.global_datetime.time_created) {
      dashboard.global_datetime.time_created = now;
      fixes.push('Added missing time_created to global_datetime');
    }
    if (!dashboard.global_datetime.time_updated) {
      dashboard.global_datetime.time_updated = now;
      fixes.push('Added missing time_updated to global_datetime');
    }
  }
  
  // Fix tab_active reference
  if (dashboard.tab_active && dashboard.tabs?.length > 0) {
    const firstTabId = dashboard.tabs[0].id;
    if (dashboard.tab_active !== firstTabId) {
      dashboard.tab_active = firstTabId;
      fixes.push(`Fixed tab_active reference: now points to tab ${firstTabId}`);
    }
  }
  
  // Fix tab timestamps and structure
  dashboard.tabs?.forEach((tab: any, tabIndex: number) => {
    if (!tab.time_created) {
      tab.time_created = now;
      fixes.push(`Added missing time_created to tab ${tabIndex}`);
    }
    if (!tab.time_updated) {
      tab.time_updated = now;
      fixes.push(`Added missing time_updated to tab ${tabIndex}`);
    }
    
    // Fix tab datetime timestamps
    if (tab.datetime) {
      if (!tab.datetime.time_created) {
        tab.datetime.time_created = now;
        fixes.push(`Added missing time_created to tab ${tabIndex} datetime`);
      }
      if (!tab.datetime.time_updated) {
        tab.datetime.time_updated = now;
        fixes.push(`Added missing time_updated to tab ${tabIndex} datetime`);
      }
    }
    
    // Fix map timestamps and structure
    tab.maps?.forEach((map: any, mapIndex: number) => {
      if (!map.time_created) {
        map.time_created = now;
        fixes.push(`Added missing time_created to map ${mapIndex} in tab ${tabIndex}`);
      }
      if (!map.time_updated) {
        map.time_updated = now;
        fixes.push(`Added missing time_updated to map ${mapIndex} in tab ${tabIndex}`);
      }
      
      // Fix missing gridCellLayout
      if (!map.gridCellLayout) {
        map.gridCellLayout = {
          gridColumnStart: 1,
          gridColumnEnd: 97,
          gridRowStart: 1,
          gridRowEnd: 97
        };
        fixes.push(`Added missing gridCellLayout to map ${mapIndex} in tab ${tabIndex}`);
      }
      
      // Fix map_projection - must be null, not an object
      if (map.map_projection && typeof map.map_projection === 'object' && map.map_projection.name === 'mercator') {
        map.map_projection = null;
        fixes.push(`Fixed map_projection: mercator object → null in map ${mapIndex}, tab ${tabIndex}`);
      }
      
      // Fix layer timestamps
      map.layers?.forEach((layer: any, layerIndex: number) => {
        if (!layer.time_created) {
          layer.time_created = now;
          fixes.push(`Added missing time_created to layer ${layerIndex} in map ${mapIndex}, tab ${tabIndex}`);
        }
        if (!layer.time_updated) {
          layer.time_updated = now;
          fixes.push(`Added missing time_updated to layer ${layerIndex} in map ${mapIndex}, tab ${tabIndex}`);
        }
      });
    });
  });
  
  return fixes;
}

/**
 * Fix ID consistency issues - ensure all references are correct
 */
function fixIdConsistency(dashboard: any): string[] {
  const fixes: string[] = [];
  
  dashboard.tabs?.forEach((tab: any) => {
    tab.maps?.forEach((map: any) => {
      map.layers?.forEach((layer: any, layerIndex: number) => {
        // Fix layer profile ID references
        if (layer.id_profile !== dashboard.id) {
          layer.id_profile = dashboard.id;
          fixes.push(`Fixed layer ${layerIndex} id_profile: now references dashboard ${dashboard.id}`);
        }
        
        // Fix layer cartographic map ID references  
        if (layer.id_cartographicmap !== map.id) {
          layer.id_cartographicmap = map.id;
          fixes.push(`Fixed layer ${layerIndex} id_cartographicmap: now references map ${map.id}`);
        }
      });
    });
  });
  
  return fixes;
}

/**
 * Generates missing IDs for dashboard components based on template structure
 */
export function generateMissingIds(dashboard: any): any {
  const baseIds = {
    dashboard: 12000,
    tab: 70000,
    layout: 170000, 
    map: 120000,
    viewport: 130000,
    layer: 550000 // Starting from observed range in examples
  };
  
  // Ensure dashboard has required IDs
  if (!dashboard.id) dashboard.id = baseIds.dashboard;
  if (!dashboard.global_datetime?.id) {
    if (!dashboard.global_datetime) dashboard.global_datetime = {};
    dashboard.global_datetime.id = baseIds.dashboard + 100;
    dashboard.global_datetime.id_profile = dashboard.id;
  }
  
  let currentLayerId = baseIds.layer;
  const allFixes: string[] = [];
  
  dashboard.tabs?.forEach((tab: any, tabIndex: number) => {
    // Generate tab IDs
    if (!tab.id) tab.id = baseIds.tab + tabIndex;
    if (!tab.id_profile) tab.id_profile = dashboard.id;
    
    // Generate datetime IDs for tab
    if (tab.datetime && !tab.datetime.id) {
      tab.datetime.id = tab.id;
      tab.datetime.id_profile = dashboard.id;
    }
    
    // Generate layout IDs
    tab.layouts?.forEach((layout: any, layoutIndex: number) => {
      if (!layout.id) layout.id = baseIds.layout + (tabIndex * 10) + layoutIndex;
      if (!layout.id_tab) layout.id_tab = tab.id;
    });
    
    // Generate viewport IDs
    tab.viewports?.forEach((viewport: any, viewportIndex: number) => {
      if (!viewport.id) viewport.id = baseIds.viewport + (tabIndex * 10) + viewportIndex;
      if (!viewport.id_profile) viewport.id_profile = dashboard.id;
    });
    
    // Generate map and layer IDs
    tab.maps?.forEach((map: any, mapIndex: number) => {
      if (!map.id) map.id = baseIds.map + (tabIndex * 10) + mapIndex;
      if (!map.id_profile) map.id_profile = dashboard.id;
      if (!map.id_tab) map.id_tab = tab.id;
      if (!map.id_viewport && tab.viewports?.[0]) {
        map.id_viewport = tab.viewports[0].id;
      }
      
      // Fix layout id_tool to match map ID
      tab.layouts?.forEach((layout: any) => {
        if (layout.type === 'Map' && layout.id_tool !== map.id) {
          layout.id_tool = map.id;
          allFixes.push(`Fixed layout id_tool: now references map ${map.id}`);
        }
      });
      
      // Fix viewport lastUpdatedBy to match map ID
      tab.viewports?.forEach((viewport: any) => {
        if (viewport.lastUpdatedBy !== map.id) {
          viewport.lastUpdatedBy = map.id;
          allFixes.push(`Fixed viewport lastUpdatedBy: now references map ${map.id}`);
        }
      });
      
      // Generate layer IDs
      map.layers?.forEach((layer: any, layerIndex: number) => {
        if (!layer.id) layer.id = currentLayerId++;
        if (!layer.id_profile) layer.id_profile = dashboard.id;
        if (!layer.id_cartographicmap) layer.id_cartographicmap = map.id;
        if (layer.index === undefined) layer.index = layerIndex;
        
        // Add timestamps if missing (fallback for basic cases)
        const now = new Date().toISOString();
        if (!layer.time_created) layer.time_created = now;
        if (!layer.time_updated) layer.time_updated = now;
      });
    });
  });
  
  // Apply comprehensive fixes
  const timestampFixes = fixMissingTimestamps(dashboard);
  allFixes.push(...timestampFixes);
  
  const idFixes = fixIdConsistency(dashboard);
  allFixes.push(...idFixes);
  
  const indexingFixes = fixLayerIndexing(dashboard);
  allFixes.push(...indexingFixes);
  
  const parameterFixes = fixLayerParameters(dashboard);
  allFixes.push(...parameterFixes);
  
  const consistencyFixes = fixFieldConsistency(dashboard);
  allFixes.push(...consistencyFixes);
  
  // Log fixes if any were applied
  if (allFixes.length > 0) {
    console.log('🔧 Dashboard fixes applied:', allFixes);
  }
  
  return dashboard;
}

/**
 * Helper function to validate ISO timestamp format
 */
function isValidISOTimestamp(timestamp: string): boolean {
  if (typeof timestamp !== 'string') return false;
  const date = new Date(timestamp);
  return date instanceof Date && !isNaN(date.getTime()) && timestamp.includes('T');
}

/**
 * Main validation function that checks and fixes a dashboard
 */
export function validateAndFixDashboard(dashboard: any): {
  dashboard: any;
  validation: ValidationResult;
} {
  // First generate missing IDs
  const fixedDashboard = generateMissingIds(JSON.parse(JSON.stringify(dashboard)));
  
  // Then validate the fixed dashboard
  const validation = validateDashboardLayers(fixedDashboard);
  
  return {
    dashboard: fixedDashboard,
    validation
  };
}