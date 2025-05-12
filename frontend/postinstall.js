const chalk = require('chalk')
const { readFile, writeFile, copyFile, mkdir, access } = require('fs').promises
const { constants } = require('fs')
const path = require('path')

console.log(chalk.green('here'))

function log(...args) {
  console.log(chalk.yellow('[react-native-maps]'), ...args)
}

// Helper function to check if a file/directory exists
async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch (error) {
    return false
  }
}

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  if (await exists(dirPath)) return
  
  // Create parent directories recursively if needed
  await mkdir(dirPath, { recursive: true })
  log(`Created directory: ${dirPath}`)
}

// Function to patch React Native Maps for web
const reactNativeMaps = async function() {
  try {
    log('📦 Creating web compatibility of react-native-maps using an empty module loaded on web builds')
    const modulePath = 'node_modules/react-native-maps'
    
    // Check if module exists
    if (!(await exists(modulePath))) {
      log('⚠️ react-native-maps module not found. Skipping patch.')
      return
    }
    
    // Ensure lib directory exists
    const libDir = path.join(modulePath, 'lib')
    await ensureDir(libDir)
    
    // Create empty web module
    await writeFile(path.join(libDir, 'index.web.js'), 'module.exports = {}', 'utf-8')
    log('Created index.web.js file')
    
    // Copy type definitions if they exist
    const indexTsPath = path.join(libDir, 'index.d.ts')
    if (await exists(indexTsPath)) {
      await copyFile(indexTsPath, path.join(libDir, 'index.web.d.ts'))
      log('Copied index.d.ts to index.web.d.ts')
    } else {
      // Create empty type definitions if none exist
      await writeFile(path.join(libDir, 'index.web.d.ts'), 'declare const _default: {};\nexport default _default;\n', 'utf-8')
      log('Created empty index.web.d.ts file')
    }
    
    // Update package.json
    const pkgPath = path.join(modulePath, 'package.json')
    if (await exists(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'))
      pkg['react-native'] = 'lib/index.js'
      pkg['main'] = 'lib/index.web.js'
      await writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8')
      log('Updated package.json configuration')
    } else {
      log('⚠️ Could not find package.json')
    }
    
    log('✅ React Native Maps patch completed successfully')
  } catch (error) {
    log(`❌ React Native Maps Error: ${error.message}`)
    console.error('Full error:', error)
  }
}

// Function to fix Platform module for React Native on web
const fixPlatformModule = async function() {
  try {
    console.log(chalk.yellow('[Platform-Fix]'), '📦 Creating web compatibility for Platform module')
    const reactNativePath = 'node_modules/react-native'
    const utilitiesPath = path.join(reactNativePath, 'Libraries/Utilities')
    
    // Check if react-native module exists
    if (!(await exists(reactNativePath))) {
      console.log(chalk.yellow('[Platform-Fix]'), '⚠️ react-native module not found. Skipping patch.')
      return
    }
    
    // Ensure the Utilities directory exists
    await ensureDir(utilitiesPath)
    
    // Content for the Platform.web.js file
    const platformWebContent = `
/**
 * Web implementation for Platform detection in React Native
 */
'use strict';

const Platform = {
  OS: 'web',
  select: function(obj) {
    return obj.web || obj.default || {};
  },
  get Version() {
    return navigator.appVersion;
  },
  get isTesting() {
    return false;
  }
};

module.exports = Platform;
`;
    
    // Create Platform.web.js
    await writeFile(path.join(utilitiesPath, 'Platform.web.js'), platformWebContent, 'utf-8')
    console.log(chalk.yellow('[Platform-Fix]'), 'Created Platform.web.js file')
    
    console.log(chalk.yellow('[Platform-Fix]'), '✅ Platform fix completed successfully')
  } catch (error) {
    console.log(chalk.yellow('[Platform-Fix]'), `❌ Error: ${error.message}`)
    console.error('Full error:', error)
  }
}

// Function to fix AccessibilityInfo component for React Native on web
const fixAccessibilityInfo = async function() {
  try {
    console.log(chalk.yellow('[Accessibility-Fix]'), '📦 Creating web compatibility for AccessibilityInfo component')
    const reactNativePath = 'node_modules/react-native'
    const componentsPath = path.join(reactNativePath, 'Libraries/Components')
    const accessibilityInfoPath = path.join(componentsPath, 'AccessibilityInfo')

    // Check if react-native module exists
    if (!(await exists(reactNativePath))) {
      console.log(chalk.yellow('[Accessibility-Fix]'), '⚠️ react-native module not found. Skipping patch.')
      return
    }

    // Ensure the AccessibilityInfo directory exists
    await ensureDir(accessibilityInfoPath)

    // Create empty implementation for legacySendAccessibilityEvent
    const legacySendAccessibilityEventContent = `
/**
 * Web implementation for AccessibilityInfo/legacySendAccessibilityEvent in React Native
 */
'use strict';

function legacySendAccessibilityEvent(reactTag, eventType) {
  // No-op implementation for web
}

module.exports = legacySendAccessibilityEvent;
`;

    // Create the legacySendAccessibilityEvent.web.js file
    await writeFile(path.join(accessibilityInfoPath, 'legacySendAccessibilityEvent.web.js'), legacySendAccessibilityEventContent, 'utf-8')
    console.log(chalk.yellow('[Accessibility-Fix]'), 'Created legacySendAccessibilityEvent.web.js file')

    // Create a simple web version of the AccessibilityInfo module
    const accessibilityInfoWebContent = `
/**
 * Web implementation for AccessibilityInfo in React Native
 */
'use strict';

const AccessibilityInfo = {
  isReduceMotionEnabled: function() {
    return new Promise((resolve) => {
      resolve(false);
    });
  },
  isScreenReaderEnabled: function() {
    return new Promise((resolve) => {
      resolve(false);
    });
  },
  isBoldTextEnabled: function() {
    return new Promise((resolve) => {
      resolve(false);
    });
  },
  isGrayscaleEnabled: function() {
    return new Promise((resolve) => {
      resolve(false);
    });
  },
  isInvertColorsEnabled: function() {
    return new Promise((resolve) => {
      resolve(false);
    });
  },
  isReduceTransparencyEnabled: function() {
    return new Promise((resolve) => {
      resolve(false);
    });
  },
  // Add other required methods with empty implementations
  setAccessibilityFocus: function(reactTag) {},
  announceForAccessibility: function(announcement) {},
  getRecommendedTimeoutMillis: function(originalTimeout) {
    return originalTimeout;
  },
  addEventListener: function() {
    return {
      remove: function() {}
    };
  },
  removeEventListener: function() {},
  // Ensure we're exporting the same interface as the native module
  fetch: {
    REDUCE_MOTION: 'reduceMotion',
    SCREEN_READER: 'screenReader',
    BOLD_TEXT: 'boldText',
    GRAYSCALE: 'grayscale',
    INVERT_COLORS: 'invertColors',
    REDUCE_TRANSPARENCY: 'reduceTransparency',
  },
};

module.exports = AccessibilityInfo;
`;

    await writeFile(path.join(accessibilityInfoPath, 'AccessibilityInfo.web.js'), accessibilityInfoWebContent, 'utf-8')
    console.log(chalk.yellow('[Accessibility-Fix]'), 'Created AccessibilityInfo.web.js file')

    console.log(chalk.yellow('[Accessibility-Fix]'), '✅ AccessibilityInfo fix completed successfully')
  } catch (error) {
    console.log(chalk.yellow('[Accessibility-Fix]'), `❌ Error: ${error.message}`)
    console.error('Full error:', error)
  }
}

// Function to fix PlatformColorValueTypes module for React Native on web
const fixPlatformColorValueTypes = async function() {
  try {
    console.log(chalk.yellow('[PlatformColor-Fix]'), '📦 Creating web compatibility for PlatformColorValueTypes module')
    const reactNativePath = 'node_modules/react-native'
    const styleSheetPath = path.join(reactNativePath, 'Libraries/StyleSheet')
    
    // Check if react-native module exists
    if (!(await exists(reactNativePath))) {
      console.log(chalk.yellow('[PlatformColor-Fix]'), '⚠️ react-native module not found. Skipping patch.')
      return
    }
    
    // Ensure the StyleSheet directory exists
    await ensureDir(styleSheetPath)
    
    // Content for the PlatformColorValueTypes.web.js file
    const platformColorValueTypesContent = `
/**
 * Web implementation for PlatformColorValueTypes in React Native
 */
'use strict';

export type NativeColorValue = {
  resource_paths: Array<string>,
};

export type ProcessedColorValue = number;
`;
    
    // Create PlatformColorValueTypes.web.js
    await writeFile(path.join(styleSheetPath, 'PlatformColorValueTypes.web.js'), platformColorValueTypesContent, 'utf-8')
    console.log(chalk.yellow('[PlatformColor-Fix]'), 'Created PlatformColorValueTypes.web.js file')
    
    console.log(chalk.yellow('[PlatformColor-Fix]'), '✅ PlatformColorValueTypes fix completed successfully')
  } catch (error) {
    console.log(chalk.yellow('[PlatformColor-Fix]'), `❌ Error: ${error.message}`)
    console.error('Full error:', error)
  }
}

// Function to fix BaseViewConfig module for React Native on web
const fixBaseViewConfig = async function() {
  try {
    console.log(chalk.yellow('[BaseViewConfig-Fix]'), '📦 Creating web compatibility for BaseViewConfig module')
    const reactNativePath = 'node_modules/react-native'
    const nativeComponentPath = path.join(reactNativePath, 'Libraries/NativeComponent')
    
    // Check if react-native module exists
    if (!(await exists(reactNativePath))) {
      console.log(chalk.yellow('[BaseViewConfig-Fix]'), '⚠️ react-native module not found. Skipping patch.')
      return
    }
    
    // Ensure the NativeComponent directory exists
    await ensureDir(nativeComponentPath)
    
    // Content for the BaseViewConfig.web.js file
    const baseViewConfigContent = `
/**
 * Web implementation for BaseViewConfig in React Native
 */
'use strict';

const BaseViewConfig = {
  uiViewClassName: 'RCTView',
  bubblingEventTypes: {},
  directEventTypes: {},
  validAttributes: {},
};

module.exports = BaseViewConfig;
`;
    
    // Create BaseViewConfig.web.js
    await writeFile(path.join(nativeComponentPath, 'BaseViewConfig.web.js'), baseViewConfigContent, 'utf-8')
    console.log(chalk.yellow('[BaseViewConfig-Fix]'), 'Created BaseViewConfig.web.js file')
    
    console.log(chalk.yellow('[BaseViewConfig-Fix]'), '✅ BaseViewConfig fix completed successfully')
  } catch (error) {
    console.log(chalk.yellow('[BaseViewConfig-Fix]'), `❌ Error: ${error.message}`)
    console.error('Full error:', error)
  }
}

// Function to fix ReactDevToolsSettingsManager for React Native on web
const fixReactDevTools = async function() {
  try {
    console.log(chalk.yellow('[ReactDevTools-Fix]'), '📦 Creating web compatibility for ReactDevToolsSettingsManager module')
    const reactNativePath = 'node_modules/react-native'
    const privatePath = path.join(reactNativePath, 'src/private')
    const debuggingPath = path.join(privatePath, 'debugging')
    
    // Check if react-native module exists
    if (!(await exists(reactNativePath))) {
      console.log(chalk.yellow('[ReactDevTools-Fix]'), '⚠️ react-native module not found. Skipping patch.')
      return
    }
    
    // Ensure the debugging directory exists
    await ensureDir(debuggingPath)
    
    // Content for the ReactDevToolsSettingsManager.web.js file
    const reactDevToolsContent = `
/**
 * Web implementation for ReactDevToolsSettingsManager in React Native
 */
'use strict';

const ReactDevToolsSettingsManager = {
  getSettings: function() {
    return Promise.resolve({});
  },
  setSettings: function(settings) {
    return Promise.resolve();
  },
};

module.exports = ReactDevToolsSettingsManager;
`;
    
    // Create ReactDevToolsSettingsManager.web.js
    await writeFile(path.join(debuggingPath, 'ReactDevToolsSettingsManager.web.js'), reactDevToolsContent, 'utf-8')
    console.log(chalk.yellow('[ReactDevTools-Fix]'), 'Created ReactDevToolsSettingsManager.web.js file')
    
    console.log(chalk.yellow('[ReactDevTools-Fix]'), '✅ ReactDevToolsSettingsManager fix completed successfully')
  } catch (error) {
    console.log(chalk.yellow('[ReactDevTools-Fix]'), `❌ Error: ${error.message}`)
    console.error('Full error:', error)
  }
}

// Function to fix RCTAlertManager module for React Native on web
const fixAlertManager = async function() {
  try {
    console.log(chalk.yellow('[Alert-Fix]'), '📦 Creating web compatibility for RCTAlertManager module')
    const reactNativePath = 'node_modules/react-native'
    const alertPath = path.join(reactNativePath, 'Libraries/Alert')
    
    // Check if react-native module exists
    if (!(await exists(reactNativePath))) {
      console.log(chalk.yellow('[Alert-Fix]'), '⚠️ react-native module not found. Skipping patch.')
      return
    }
    
    // Ensure the Alert directory exists
    await ensureDir(alertPath)
    
    // Content for the RCTAlertManager.web.js file
    const alertManagerContent = `
/**
 * Web implementation for RCTAlertManager in React Native
 */
'use strict';

const RCTAlertManager = {
  alertWithArgs: function(args, callback) {
    // Simple web implementation using browser's alert
    const title = args.title || '';
    const message = args.message || '';
    const buttons = args.buttons || [];
    const defaultValue = args.defaultValue || '';
    const cancelButtonKey = args.cancelButtonKey;
    const destructiveButtonKey = args.destructiveButtonKey;
    
    // For confirm/alert dialogs
    if (!args.type || args.type === 'default') {
      let buttonIndex = 0;
      
      // If we have a cancel button and user clicks cancel (false)
      // or if we have a destructive button and user clicks OK (true)
      if (buttons.length > 0) {
        // Use confirm dialog when we have buttons
        const buttonLabels = buttons.map(btn => btn.text || '').join('\\n');
        if (window.confirm(\`\${title}\\n\${message}\\n\\n\${buttonLabels}\`)) {
          // User clicked OK - find the non-cancel button index
          buttonIndex = cancelButtonKey !== undefined ? 1 : 0;
        } else {
          // User clicked Cancel
          buttonIndex = cancelButtonKey !== undefined ? 0 : buttons.length - 1;
        }
      } else {
        // Simple alert with OK button
        window.alert(\`\${title}\\n\${message}\`);
      }
      
      // Execute callback with the button index
      if (callback) {
        callback(buttonIndex);
      }
    }
    // For prompt dialogs
    else if (args.type === 'plain-text' || args.type === 'secure-text') {
      const result = window.prompt(\`\${title}\\n\${message}\`, defaultValue);
      
      // If user clicked OK, result contains the value
      // If user clicked Cancel, result is null
      if (callback) {
        if (result === null) {
          // User clicked Cancel
          callback(cancelButtonKey !== undefined ? 0 : buttons.length - 1, result);
        } else {
          // User clicked OK with a value
          callback(cancelButtonKey !== undefined ? 1 : 0, result);
        }
      }
    }
  }
};

module.exports = RCTAlertManager;
`;
    
    // Create RCTAlertManager.web.js
    await writeFile(path.join(alertPath, 'RCTAlertManager.web.js'), alertManagerContent, 'utf-8')
    console.log(chalk.yellow('[Alert-Fix]'), 'Created RCTAlertManager.web.js file')
    
    console.log(chalk.yellow('[Alert-Fix]'), '✅ RCTAlertManager fix completed successfully')
  } catch (error) {
    console.log(chalk.yellow('[Alert-Fix]'), `❌ Error: ${error.message}`)
    console.error('Full error:', error)
  }
}

// Run all patches
async function runAllPatches() {
  try {
    await reactNativeMaps()
    await fixPlatformModule()
    await fixAccessibilityInfo()
    await fixPlatformColorValueTypes()
    await fixBaseViewConfig()
    await fixReactDevTools()
    await fixAlertManager()
    console.log(chalk.green('All patches completed successfully!'))
  } catch (error) {
    console.error(chalk.red('Error in patching:'), error)
  }
}

runAllPatches()
