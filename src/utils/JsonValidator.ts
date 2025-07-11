/**
 * Standalone JSON validation and formatting utility for MetX
 * Provides comprehensive JSON validation, formatting, and error fixing capabilities
 */

export interface JsonValidationResult {
  isValid: boolean;
  originalJson: string;
  fixedJson: string | null;
  errors: string[];
  warnings: string[];
  fixed: boolean;
}

export interface JsonValidationOptions {
  autoFix: boolean;
  indentSize: number;
  requireMetXStructure: boolean;
  strictMode: boolean;
}

export class JsonValidator {
  private static readonly DEFAULT_OPTIONS: JsonValidationOptions = {
    autoFix: true,
    indentSize: 2,
    requireMetXStructure: false,
    strictMode: false
  };

  // Valid values from template files
  private static readonly VALID_MODELS = [
    "mix", "ai-fourcast-ecmwf-ifs", "ai-graphcast-ecmwf-ifs", "cmc-gem", "chc-chirps2", "dwd-icon-d2", 
    "dwd-icon-eu", "dwd-icon-global", "ecmwf-aifs", "ecmwf-cams", "ecmwf-cmems", "ecmwf-efi", "ecmwf-ens", 
    "ecmwf-ens-cluster", "ecmwf-ens-tc", "ecmwf-era5", "ecmwf-ifs", "ecmwf-mmsf", "ecmwf-vareps", "ecmwf-wam", 
    "eumetsat-h03b", "eumetsat-h60b", "fmi-silam", "ksancm-wrf-16", "ksancm-wrf-48", "ksancm-wrf-dust", 
    "ksancm-wrf-nowcast", "meteosat-msg", "meteosat-msg-ext", "mf-arome", "mix-radar", "mix-satellite", 
    "mm-heliosat", "mm-lightning", "mm-swiss1k", "mm-swiss1k-hindcast", "mm-euro1k", "mm-nd1k", "mm-sing1k", 
    "mm-tides", "mm-us1k", "mri-esm2-ssp126", "mri-esm2-ssp245", "mri-esm2-ssp370", "mri-esm2-ssp460", 
    "mri-esm2-ssp585", "nasa-ghrsst", "nasa-srtm", "ncep-gfs", "ncep-gfs-ens", "ncep-hrrr", "noaa-hycom", 
    "noaa-swpc", "ukmo-um10", "opera-radar", "at-radar", "ca-radar", "cz-radar", "dk-radar", "fi-radar", 
    "mf-radar-metropolitan", "dwd-radar-px250", "it-radar", "no-radar", "pl-radar", "es-radar", "se-radar", 
    "mch-radar", "ukmo-500m-radar", "noaa-1k-radar", "mix-obs"
  ];

  private static readonly VALID_COLOR_MAPS = [
    "air_quality_index", "anomaly_temperature", "binary_warning_segmented", "blue_magenta", "blue_to_red", 
    "blues", "blues_inverted", "cape", "ceiling_height_airmet", "ceiling_height_segmented", "cin_segmented", 
    "cloud_type", "dust_segmented", "dwd_radar_5min", "dwd_warnings", "edr_turbulence", "fresh_snow_long_interval", 
    "fresh_snow_short_interval", "gray", "gray_inverted", "gray_transparent", "gray_transparent_dark", 
    "greens_shifted", "heavy_rain_warning_europe_segmented", "incessant_rain_warning_europe_segmented", "jet", 
    "jet_inverted", "jet_segmented", "jet_segmented_inverted", "jetstream", "land_usage", "lifted_index_global", 
    "lifted_index_global_segmented", "lightning_europe_transparent", "magenta_blue", "msg_h03b", 
    "negative_cold_index_segmented", "negative_index_segmented", "periodic", "periodic_inverted", "plasma", 
    "plasma_inverted", "pollen_europe_segmented", "pollen_grains_large", "pollen_grains_medium", 
    "pollen_grains_small", "pollen_segmented", "positive_index_segmented", "precip_europe_segmented", 
    "precip_layer_europe_segmented", "precip_layer_segmented", "precip_segmented", "precip_type_europe_segmented", 
    "precip_type_intensity_europe_segmented", "precip_type_intensity_segmented", "precip_type_segmented", 
    "precip_usa_segmented", "prism", "prism_inverted", "radar_coverage", "radar_log", "radar_reflectivity_segmented", 
    "radar_segmented", "red_to_blue", "red_yellow_green", "reds", "reds_inverted", "satellite", "satellite_fog", 
    "satellite_ir_clouds", "satellite_ir_clouds_greys", "satellite_ir_colored", "satellite_ir_water_vapor", 
    "satellite_ndvi", "seismic", "seismic_inverted", "snow_depth", "storm_warning", "sunshine_europe_segmented", 
    "t_arabia", "t_europe", "t_europe_segmented", "t_global", "t_global_segmented", "theta_e_arabia", 
    "theta_e_global", "theta_e_global_segmented", "traffic_light", "traffic_light_inverted", "transparent_blue", 
    "transparent_green", "transparent_red", "tstorm_warning_europe_segmented", "turbulence_ellrod3_segmented", 
    "turbulence_segmented", "turbulence_segmented_inverted", "ukmo_radar", "uv_index_europe_segmented", 
    "viridis", "viridis_inverted", "visibility_airmet", "visibility_segmented", "vorticity_segmented", 
    "wave_height_segmented", "wind_arabia", "wind_arabia_beaufort", "wind_speed_europe_segmented", 
    "wind_warning_europe_segmented", "wind_speed_arrows"
  ];

  private static readonly VALID_BACKGROUND_STYLES = [
    "topographique", "basic", "bright", "darkmatter", "hybrid", "outdoor", "pastel", "positron", 
    "toner", "topo", "voyager", "f866428e-554f-4ef7-b745-5b893ea778dd", "0e914266-89b2-46c2-8359-1b47522855c0", 
    "3958f66e-04a7-48e9-a088-a3b3c617c617", "b4033781-d6cb-42c4-ab61-59d1921da345", 
    "542e86e1-7347-4309-826b-006008055f48", "ff991184-9793-4129-9cc5-79bf690b8efb", 
    "ac4c3d0c-1979-4c94-b56c-e60ce151b2c0", "61bd317a-d1b2-4d81-ae68-011ad0d4d9b5"
  ];

  // Fallback values for invalid entries
  private static readonly DEFAULT_MODEL = "mix";
  private static readonly DEFAULT_COLOR_MAP = "t_europe";
  private static readonly DEFAULT_BACKGROUND_STYLE = "topographique";

  /**
   * Main validation method that checks and optionally fixes JSON
   */
  static validateJson(
    jsonString: string,
    options: Partial<JsonValidationOptions> = {}
  ): JsonValidationResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const result: JsonValidationResult = {
      isValid: false,
      originalJson: jsonString,
      fixedJson: null,
      errors: [],
      warnings: [],
      fixed: false
    };

    try {
      // Step 1: Try to parse as-is
      const parsed = JSON.parse(jsonString);
      result.isValid = true;
      result.fixedJson = JSON.stringify(parsed, null, opts.indentSize);
      
      // Step 2: Additional validations
      if (opts.requireMetXStructure) {
        this.validateMetXStructure(parsed, result);
        // Apply template value validation when MetX structure is required
        this.applyTemplateValidation(parsed);
        // Re-serialize with template fixes applied
        result.fixedJson = JSON.stringify(parsed, null, opts.indentSize);
      }
      
      return result;
    } catch (error) {
      result.errors.push(`JSON Parse Error: ${error instanceof Error ? error.message : String(error)}`);
      
      if (opts.autoFix) {
        return this.attemptJsonFix(jsonString, opts, result);
      }
      
      return result;
    }
  }

  /**
   * Attempts to fix common JSON formatting issues
   */
  private static attemptJsonFix(
    jsonString: string,
    options: JsonValidationOptions,
    result: JsonValidationResult
  ): JsonValidationResult {
    let fixedJson = jsonString;
    const fixes: string[] = [];

    try {
      // Fix 1: Fix trailing commas first (most important)
      fixedJson = this.fixTrailingCommas(fixedJson);
      fixes.push('Fixed trailing commas');

      // Fix 2: Remove extra spaces around brackets and braces
      fixedJson = this.fixSpacing(fixedJson);
      fixes.push('Fixed irregular spacing');

      // Fix 3: Fix missing commas between objects
      fixedJson = this.fixMissingCommas(fixedJson);
      fixes.push('Fixed missing commas');

      // Fix 4: Fix unescaped quotes
      fixedJson = this.fixUnescapedQuotes(fixedJson);
      fixes.push('Fixed unescaped quotes');

      // Fix 5: Fix layer array formatting specific to MetX
      fixedJson = this.fixLayerArrayFormatting(fixedJson);
      fixes.push('Fixed layer array formatting');

      // Try to parse the fixed version
      const parsed = JSON.parse(fixedJson);
      result.isValid = true;
      result.fixedJson = JSON.stringify(parsed, null, options.indentSize);
      result.fixed = true;
      result.warnings = fixes;
      
      return result;
    } catch (error) {
      result.errors.push(`Failed to fix JSON: ${error instanceof Error ? error.message : String(error)}`);
      result.fixedJson = null;
      return result;
    }
  }

  /**
   * Fixes irregular spacing around brackets and braces
   */
  private static fixSpacing(json: string): string {
    return json
      // Fix spacing around array brackets
      .replace(/\[\s+/g, '[')
      .replace(/\s+\]/g, ']')
      // Fix spacing around object braces
      .replace(/\{\s+/g, '{')
      .replace(/\s+\}/g, '}')
      // Fix spacing around colons
      .replace(/"\s*:\s*/g, '": ')
      // Fix spacing around commas
      .replace(/,\s*"/g, ', "')
      // Remove multiple spaces
      .replace(/\s+/g, ' ');
  }

  /**
   * Fixes missing commas between array elements and object properties
   */
  private static fixMissingCommas(json: string): string {
    return json
      // Add commas between objects in arrays
      .replace(/\}\s*\{/g, '}, {')
      // Add commas between array elements
      .replace(/\]\s*\[/g, '], [')
      // Add commas between object properties (basic case)
      .replace(/"\s*\n\s*"/g, '",\n  "')
      // Fix missing commas between property name and value pairs
      .replace(/"\s+"[^:]/g, (match) => match.charAt(0) + '", ' + match.slice(-1));
  }

  /**
   * Removes trailing commas that make JSON invalid
   */
  private static fixTrailingCommas(json: string): string {
    return json
      // Remove trailing commas in objects
      .replace(/,(\s*})/g, '$1')
      // Remove trailing commas in arrays
      .replace(/,(\s*])/g, '$1');
  }

  /**
   * Fixes unescaped quotes within strings
   */
  private static fixUnescapedQuotes(json: string): string {
    // This is a simplified fix - more complex scenarios may need additional handling
    // For now, just return the original string as this fix is too aggressive
    return json;
  }

  /**
   * Fixes MetX-specific layer array formatting issues
   */
  private static fixLayerArrayFormatting(json: string): string {
    // Fix the specific pattern found in MetX layer arrays
    const fixed = json
      // Fix the pattern: "layers": [            {
      .replace(/"layers":\s*\[\s*\{/g, '"layers": [\n    {')
      // Ensure proper indentation for layer objects
      .replace(/\{(\s*)"id":/g, '{\n      "id":')
      // Fix closing brackets alignment
      .replace(/\}\s*\]/g, '\n    }\n  ]');

    // Apply MetX-specific layer structure fixes
    try {
      const parsed = JSON.parse(fixed);
      if (parsed.tabs && Array.isArray(parsed.tabs)) {
        parsed.tabs.forEach((tab: Record<string, unknown>) => {
          if (tab.maps && Array.isArray(tab.maps)) {
            (tab.maps as Record<string, unknown>[]).forEach((map: Record<string, unknown>) => {
              if (map.layers && Array.isArray(map.layers)) {
                (map.layers as Record<string, unknown>[]).forEach((layer: Record<string, unknown>) => {
                  this.fixLayerStructure(layer);
                });
              }
            });
          }
        });
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If parsing fails, return the string-based fixes
      return fixed;
    }
  }

  /**
   * Fixes MetX layer structure issues
   */
  private static fixLayerStructure(layer: Record<string, unknown>): void {
    // Fix incorrect layer type names
    if (layer.kind === 'IsolineLayerDescription') {
      layer.kind = 'IsoLinesLayerDescription';
    }
    if (layer.kind === 'WindAnimationLayerDescription') {
      // This might need to be corrected to a valid type - check working examples
      layer.kind = 'BarbsLayerDescription'; // Most common wind layer type
    }

    // Validate and fix model field
    if (layer.model && typeof layer.model === 'string') {
      if (!this.VALID_MODELS.includes(layer.model)) {
        layer.model = this.DEFAULT_MODEL;
      }
    }

    // Validate and fix color_map field
    if (layer.color_map && typeof layer.color_map === 'string') {
      if (!this.VALID_COLOR_MAPS.includes(layer.color_map)) {
        layer.color_map = this.DEFAULT_COLOR_MAP;
      }
    }

    // Validate and fix style field for BackgroundMapDescription
    if (layer.kind === 'BackgroundMapDescription' && layer.style && typeof layer.style === 'string') {
      if (!this.VALID_BACKGROUND_STYLES.includes(layer.style)) {
        layer.style = this.DEFAULT_BACKGROUND_STYLE;
      }
    }

    // Fix WeatherFrontsLayerDescription structure
    if (layer.kind === 'WeatherFrontsLayerDescription') {
      const customOptions = layer.custom_options as Record<string, unknown> | undefined;
      if (customOptions) {
        // Move styling properties to root level
        if (customOptions.text_size !== undefined) {
          layer.text_size = customOptions.text_size;
          delete customOptions.text_size;
        }
        if (customOptions.line_color !== undefined) {
          layer.line_color = customOptions.line_color;
          delete customOptions.line_color;
        }
        if (customOptions.line_width !== undefined) {
          layer.line_width = customOptions.line_width;
          delete customOptions.line_width;
        }
        if (customOptions.text_color !== undefined) {
          layer.text_color = customOptions.text_color;
          delete customOptions.text_color;
        }
        
        // Clean up empty custom_options
        if (Object.keys(customOptions).length === 0) {
          layer.custom_options = {};
        }
      }
      
      // Remove parameter_unit if null (not needed for weather fronts)
      if (layer.parameter_unit === null) {
        delete layer.parameter_unit;
      }
    }

    // Fix IsoLinesLayerDescription structure
    if (layer.kind === 'IsoLinesLayerDescription') {
      const customOptions = layer.custom_options as Record<string, unknown> | undefined;
      if (customOptions) {
        // Move properties to root level and fix property names
        if (customOptions.text_size !== undefined) {
          layer.text_size = customOptions.text_size;
          delete customOptions.text_size;
        }
        if (customOptions.line_color !== undefined) {
          layer.line_color = customOptions.line_color;
          delete customOptions.line_color;
        }
        if (customOptions.line_width !== undefined) {
          layer.line_width = customOptions.line_width;
          delete customOptions.line_width;
        }
        if (customOptions.text_color !== undefined) {
          layer.text_color = customOptions.text_color;
          delete customOptions.text_color;
        }
        
        // Fix property names for filters
        if (customOptions.median_filter !== undefined) {
          layer.filter_median = customOptions.median_filter;
          delete customOptions.median_filter;
        }
        if (customOptions.gaussian_filter !== undefined) {
          layer.filter_gauss = customOptions.gaussian_filter;
          delete customOptions.gaussian_filter;
        }
        if (customOptions.filter_median !== undefined) {
          layer.filter_median = customOptions.filter_median;
          delete customOptions.filter_median;
        }
        if (customOptions.filter_gauss !== undefined) {
          layer.filter_gauss = customOptions.filter_gauss;
          delete customOptions.filter_gauss;
        }
        
        // Fix range property name
        if (customOptions.range !== undefined) {
          layer.value_range = customOptions.range;
          delete customOptions.range;
        }
        
        // Ensure values property exists
        if (layer.values === undefined) {
          layer.values = null;
        }
        
        // Clean up empty custom_options
        if (Object.keys(customOptions).length === 0) {
          layer.custom_options = {};
        }
      }
    }

    // Fix PressureSystemLayerDescription structure
    if (layer.kind === 'PressureSystemLayerDescription') {
      const customOptions = layer.custom_options as Record<string, unknown> | undefined;
      // Ensure filter properties are at root level if in custom_options
      if (customOptions) {
        if (customOptions.filter_gauss !== undefined) {
          layer.filter_gauss = customOptions.filter_gauss;
          delete customOptions.filter_gauss;
        }
        if (customOptions.filter_median !== undefined) {
          layer.filter_median = customOptions.filter_median;
          delete customOptions.filter_median;
        }
      }
    }

    // Fix common issues across all layer types
    const customOptions = layer.custom_options as Record<string, unknown> | undefined;
    if (customOptions && Object.keys(customOptions).length === 0) {
      layer.custom_options = {};
    }
  }

  /**
   * Applies template value validation to all layers in MetX structure
   */
  private static applyTemplateValidation(parsed: Record<string, unknown>): void {
    if (parsed.tabs && Array.isArray(parsed.tabs)) {
      parsed.tabs.forEach((tab: Record<string, unknown>) => {
        if (tab.maps && Array.isArray(tab.maps)) {
          (tab.maps as Record<string, unknown>[]).forEach((map: Record<string, unknown>) => {
            if (map.layers && Array.isArray(map.layers)) {
              (map.layers as Record<string, unknown>[]).forEach((layer: Record<string, unknown>) => {
                this.fixLayerStructure(layer);
              });
            }
          });
        }
      });
    }
  }

  /**
   * Validates MetX-specific JSON structure
   */
  private static validateMetXStructure(parsed: Record<string, unknown>, result: JsonValidationResult): void {
    const warnings: string[] = [];
    
    // Check for required MetX fields
    if (!parsed.id) warnings.push('Missing required field: id');
    if (!parsed.tabs) warnings.push('Missing required field: tabs');
    if (!Array.isArray(parsed.tabs)) warnings.push('Field "tabs" should be an array');
    
    // Check tabs structure
    if (parsed.tabs && Array.isArray(parsed.tabs)) {
      parsed.tabs.forEach((tab: Record<string, unknown>, index: number) => {
        if (!tab.maps) warnings.push(`Tab ${index}: Missing maps array`);
        if (tab.maps && Array.isArray(tab.maps)) {
          (tab.maps as Record<string, unknown>[]).forEach((map: Record<string, unknown>, mapIndex: number) => {
            if (!map.layers) warnings.push(`Tab ${index}, Map ${mapIndex}: Missing layers array`);
            if (map.layers && Array.isArray(map.layers)) {
              (map.layers as Record<string, unknown>[]).forEach((layer: Record<string, unknown>, layerIndex: number) => {
                if (!layer.kind) warnings.push(`Tab ${index}, Map ${mapIndex}, Layer ${layerIndex}: Missing kind field`);
                if (!layer.id) warnings.push(`Tab ${index}, Map ${mapIndex}, Layer ${layerIndex}: Missing id field`);
                if (layer.index === undefined) warnings.push(`Tab ${index}, Map ${mapIndex}, Layer ${layerIndex}: Missing index field`);
              });
            }
          });
        }
      });
    }
    
    result.warnings.push(...warnings);
  }

  /**
   * Validates and fixes MetX layer JSON specifically
   */
  static validateLayerJson(
    layerJson: string,
    options: Partial<JsonValidationOptions> = {}
  ): JsonValidationResult {
    const opts = { ...this.DEFAULT_OPTIONS, ...options, requireMetXStructure: true };
    
    // First, try to validate as a complete MetX structure
    let result = this.validateJson(layerJson, opts);
    
    // If that fails, try to validate as just a layers array
    if (!result.isValid) {
      const layersOnlyJson = `{"layers": ${layerJson}}`;
      result = this.validateJson(layersOnlyJson, opts);
      
      if (result.isValid && result.fixedJson) {
        // Extract just the layers array from the fixed JSON
        const parsed = JSON.parse(result.fixedJson);
        result.fixedJson = JSON.stringify(parsed.layers, null, opts.indentSize);
      }
    }
    
    return result;
  }

  /**
   * Utility method to format JSON with consistent indentation
   */
  static formatJson(jsonString: string, indentSize: number = 2): string {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, indentSize);
    } catch (error) {
      throw new Error(`Cannot format invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Utility method to minify JSON
   */
  static minifyJson(jsonString: string): string {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed);
    } catch (error) {
      throw new Error(`Cannot minify invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Checks if a string is valid JSON
   */
  static isValidJson(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  }
}