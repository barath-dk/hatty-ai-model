import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class PreviewDeployment {
  private stagingDir: string;
  private baseUrl: string;
  private usePathBased: boolean;
  private previewBaseUrl: string;

  constructor() {
    this.stagingDir = process.env.STAGING_DIR || '/var/www/staging';
    this.baseUrl = process.env.STAGING_DOMAIN || 'staging.yourdomain.com';
    this.usePathBased = process.env.USE_PATH_BASED_PREVIEWS === 'true';
    this.previewBaseUrl = process.env.PREVIEW_BASE_URL || 'http://localhost/preview';
  }

  async deploy(code: string, deploymentId: string): Promise<string> {
    try {
      const subdomain = `app-${deploymentId}`;
      const deploymentPath = path.join(this.stagingDir, subdomain);

      // Ensure staging directory exists
      await fs.ensureDir(deploymentPath);

      // Log the original code for debugging
      console.log('📝 Original AI response:', code.substring(0, 500));

      // Parse and process the generated code
      const processedFiles = this.processCode(code);

      // Log processed files for debugging
      console.log('📦 Processed files:', Object.keys(processedFiles));
      Object.entries(processedFiles).forEach(([fileName, content]) => {
        if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
          console.log(`📄 ${fileName} (${content.length} chars):`, content.substring(0, 200));
        }
      });

      // Write all files to deployment directory
      await Promise.all(
        Object.entries(processedFiles).map(async ([filePath, content]) => {
          const fullPath = path.join(deploymentPath, filePath);
          await fs.ensureDir(path.dirname(fullPath));
          await fs.writeFile(fullPath, content, 'utf8');
        })
      );

      // Create package.json if it doesn't exist
      if (!processedFiles['package.json']) {
        await this.createPackageJson(deploymentPath, subdomain);
      }

      // Build the project (if it's a React/Next.js app)
      await this.buildProject(deploymentPath);

      // Return the preview URL - use path-based for local development
      const previewUrl = this.usePathBased
        ? `${this.previewBaseUrl}/${deploymentId}`
        : `http://${subdomain}.${this.baseUrl}`;

      console.log(`✅ Deployed to: ${previewUrl}`);
      return previewUrl;

    } catch (error) {
      console.error('Deployment failed:', error);
      throw new Error(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processCode(code: string): Record<string, string> {
    const files: Record<string, string> = {};

    // Check if code contains markdown code blocks
    if (code.includes('```')) {
      // Extract all code blocks from markdown
      const codeBlockRegex = /```(?:[\w]+)?\n([\s\S]*?)```/g;
      const matches = [...code.matchAll(codeBlockRegex)];

      if (matches.length > 0) {
        console.log(`🔍 Found ${matches.length} code blocks`);
        matches.forEach((match, index) => {
          const codeContent = match[1].trim();
          const beforeBlock = code.substring(0, match.index);

          // Skip empty blocks
          if (!codeContent) {
            console.log(`⏭️  Block ${index}: Empty, skipping`);
            return;
          }

          console.log(`📋 Block ${index}: ${codeContent.substring(0, 100)}...`);

          // Try to extract filename from text before code block
          let fileName = this.extractFileName(beforeBlock, codeContent);
          console.log(`📝 Block ${index}: Detected filename: ${fileName || 'none'}`);


          if (!fileName) {
            // Check if it's package.json
            if (codeContent.startsWith('{') && codeContent.includes('"name"') && codeContent.includes('"version"')) {
              fileName = 'package.json';
            }
            // Check for HTML
            else if (codeContent.includes('<!DOCTYPE html>') || codeContent.includes('<html')) {
              fileName = 'index.html';
            }
            // Check for React components
            else if (codeContent.includes('import React') || codeContent.includes('from \'react\'')) {
              // Check if it's an index file or component
              if (codeContent.includes('ReactDOM.render') || codeContent.includes('createRoot')) {
                fileName = 'src/index.tsx';
              } else {
                fileName = index === 0 ? 'src/App.tsx' : `src/Component${index}.tsx`;
              }
            }
            // Check for CSS
            else if (codeContent.includes('{') && (codeContent.includes(':') && codeContent.includes(';')) && !codeContent.includes('function')) {
              fileName = 'styles.css';
            }
            // TypeScript/JavaScript
            else if (codeContent.includes('export') || codeContent.includes('function') || codeContent.includes('const')) {
              fileName = `src/code${index}.tsx`;
            }
            // Default: skip this block
            else {
              return;
            }
          }

          // Skip index files that just import and render - we'll combine everything
          if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
            // Check if this is an index file (has ReactDOM.render/createRoot)
            if (codeContent.includes('ReactDOM.render') || codeContent.includes('createRoot')) {
              console.log(`⏭️  Block ${index}: Index file detected, skipping`);
              return; // Skip index files
            }

            // Transform code to be browser-compatible
            const transformedContent = this.transformForBrowser(codeContent);

            // For React components, append to a combined App.tsx instead of creating separate files
            if (!files['App.tsx']) {
              files['App.tsx'] = '';
            }
            files['App.tsx'] += transformedContent + '\n\n';
          } else {
            // For non-React files (CSS, JSON, etc.), save normally
            files[fileName] = codeContent;
          }
        });

        // Process the combined App.tsx to find and expose the main component
        if (files['App.tsx']) {
          // Find the main component (TodoApp or App)
          const mainComponentMatch = files['App.tsx'].match(/function\s+(TodoApp|App)\s*\(/);
          if (mainComponentMatch) {
            const componentName = mainComponentMatch[1];
            console.log(`🎯 Main component found: ${componentName}`);
            // Ensure it's exposed on window
            if (!files['App.tsx'].includes('window.App')) {
              files['App.tsx'] += `\nwindow.App = ${componentName};\n`;
            }
          }
        }

        // If we have React/TS files, ensure proper HTML with React scripts
        const hasReactFiles = Object.keys(files).some(f => f.endsWith('.tsx') || f.endsWith('.jsx'));
        const hasHtmlFile = Object.keys(files).some(f => f.endsWith('.html'));

        if (hasReactFiles) {
          // Check if existing HTML has React scripts
          const currentHtml = files['index.html'] || '';
          const hasReactScripts = currentHtml.includes('react') && currentHtml.includes('babel');

          // If no HTML or HTML missing React scripts, create/replace it
          if (!hasHtmlFile || !hasReactScripts) {
            files['index.html'] = this.createIndexHtml('Generated App');
          }
        }
      } else {
        // No valid code blocks found, treat as plain code
        files['index.html'] = this.wrapInHtml('<!-- No valid code blocks found in the response -->');
      }
    } else {
      // No markdown - check if it's valid code
      const trimmedCode = code.trim();

      if (trimmedCode.includes('import React') || trimmedCode.includes('export default function')) {
        // React component
        files['src/App.tsx'] = trimmedCode;
        files['index.html'] = this.createIndexHtml('React App');
      } else if (trimmedCode.includes('<!DOCTYPE html>') || trimmedCode.includes('<html')) {
        // HTML file
        files['index.html'] = trimmedCode;
      } else {
        // Treat as plain content
        files['index.html'] = this.wrapInHtml(trimmedCode);
      }
    }

    return files;
  }

  private extractFileName(comment: string, code: string): string {
    // Look for file name patterns in comments
    const patterns = [
      /\/\/\s*([^\/\n]+\.[a-zA-Z]+)/,
      /\/\*\s*([^\/\n]+\.[a-zA-Z]+)/,
      /<!--\s*([^-\n]+\.[a-zA-Z]+)/
    ];

    for (const pattern of patterns) {
      const match = comment.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Guess based on code content
    if (code.includes('<!DOCTYPE html>')) return 'index.html';
    if (code.includes('import React')) return 'App.tsx';
    if (code.includes('export default function')) return 'App.tsx';
    if (code.includes('@import') || code.includes('body {')) return 'styles.css';

    return '';
  }

  private transformForBrowser(code: string): string {
    // Remove imports for React, ReactDOM and other npm packages
    // These are loaded as UMD globals in the browser
    let transformed = code
      .replace(/import\s+React[,\s]*(?:\{[^}]*\})?\s+from\s+['"]react['"]\s*;?/gi, '')
      .replace(/import\s+ReactDOM\s+from\s+['"]react-dom['"]\s*;?/gi, '')
      .replace(/import\s+\{[^}]*\}\s+from\s+['"]react['"]\s*;?/gi, '')
      .replace(/import\s+.*\s+from\s+['"]react-dom\/client['"]\s*;?/gi, '')
      // Remove CSS imports (browser can't handle these without a bundler)
      .replace(/import\s+['"]\.\/[^'"]*\.css['"]\s*;?/gi, '')
      .replace(/import\s+['"][^'"]*\.css['"]\s*;?/gi, '')
      // Remove type imports (TypeScript)
      .replace(/import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"][^'"]*types[^'"]*['"]\s*;?/gi, '')
      .replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?/gi, '')
      // Remove relative imports that are trying to import App or other components
      .replace(/import\s+.*\s+from\s+['"]\.\.?\/[^'"]*['"]\s*;?/gi, '');

    // If this looks like an index file with ReactDOM.render, remove the render call
    // but keep any component definitions
    if (transformed.includes('ReactDOM.render') || transformed.includes('createRoot')) {
      // Remove ReactDOM.render() calls
      transformed = transformed.replace(/ReactDOM\.render\s*\([^)]*\);?/g, '');
      // Remove createRoot and root.render() calls
      transformed = transformed.replace(/const\s+root\s*=\s*ReactDOM\.createRoot[^;]*;?/g, '');
      transformed = transformed.replace(/root\.render\s*\([^)]*\);?/g, '');
      // Remove any remaining document.getElementById('root') calls
      transformed = transformed.replace(/document\.getElementById\s*\(\s*['"]root['"]\s*\)/g, '');
    }

    // Replace React hooks to use React.hook syntax (for UMD React)
    transformed = transformed
      .replace(/\buseState\b/g, 'React.useState')
      .replace(/\buseEffect\b/g, 'React.useEffect')
      .replace(/\buseRef\b/g, 'React.useRef')
      .replace(/\buseCallback\b/g, 'React.useCallback')
      .replace(/\buseMemo\b/g, 'React.useMemo')
      .replace(/\buseContext\b/g, 'React.useContext')
      .replace(/\buseReducer\b/g, 'React.useReducer');

    // Remove TypeScript type annotations
    // Remove generic type parameters like <Todo[]>, <string>, etc.
    transformed = transformed.replace(/<[A-Z][^>]*>/g, '');
    // Remove type annotations like : string, : number, : Todo, etc.
    transformed = transformed.replace(/:\s*[A-Z][a-zA-Z0-9\[\]]+(?=\s*[=,)\{])/g, '');
    // Remove React.FC type
    transformed = transformed.replace(/:\s*React\.FC\s*/g, ' ');
    // Remove interface definitions
    transformed = transformed.replace(/interface\s+\w+\s*\{[^}]*\}/gs, '');
    // Remove type definitions
    transformed = transformed.replace(/type\s+\w+\s*=\s*\{[^}]*\}/gs, '');

    // Clean up multiple empty lines
    transformed = transformed.replace(/\n{3,}/g, '\n\n').trim();

    // If after cleanup there's no actual component, return a simple placeholder
    if (transformed.length < 20 || !transformed.includes('function') && !transformed.includes('=>')) {
      return `function App() {
  return React.createElement('div', { className: 'p-8' },
    React.createElement('h1', { className: 'text-2xl font-bold mb-4' }, 'Todo App'),
    React.createElement('p', null, 'Component could not be loaded. Please try generating again.')
  );
}
window.App = App;`;
    }

    // Ensure default export is available on window for the HTML to access
    // Transform 'export default App' to 'window.App = App; export default App'
    if (transformed.includes('export default')) {
      transformed = transformed.replace(
        /export\s+default\s+(\w+)\s*;?/g,
        'window.App = $1;'
      );
      // Handle 'export default function App()' pattern
      transformed = transformed.replace(
        /export\s+default\s+function\s+(\w+)/g,
        'function $1'
      );
      // Add window assignment at the end if it's a function component
      if (transformed.match(/function\s+\w+\s*\(/)) {
        const functionMatch = transformed.match(/function\s+(\w+)\s*\(/);
        if (functionMatch && !transformed.includes('window.App')) {
          transformed += `\nwindow.App = ${functionMatch[1]};`;
        }
      }
    } else {
      // No explicit export default, try to find the component function
      const functionMatch = transformed.match(/function\s+(\w+)\s*\(/);
      if (functionMatch && !transformed.includes('window.App')) {
        transformed += `\nwindow.App = ${functionMatch[1]};`;
      }
    }

    return transformed;
  }

  private createIndexHtml(title: string = 'Generated App'): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="./styles.css">
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="./App.tsx" data-type="module"></script>
    <script type="text/babel">
      // Wait for App component to be loaded, then render it
      const renderApp = () => {
        // Get the default export from the loaded App module
        const App = window.App || (() => React.createElement('div', null, 'Loading...'));
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
      };

      // Give the App.tsx time to load and execute
      setTimeout(renderApp, 100);
    </script>
</body>
</html>`;
  }

  private wrapInHtml(content: string): string {
    if (content.includes('<html')) return content;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated App</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
  }

  private async createPackageJson(deploymentPath: string, name: string): Promise<void> {
    const packageJson = {
      name: name.toLowerCase(),
      version: '1.0.0',
      private: true,
      scripts: {
        start: 'serve -s build',
        build: 'react-scripts build',
        dev: 'react-scripts start'
      },
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'react-scripts': '5.0.1'
      },
      browserslist: {
        production: ['>0.2%', 'not dead', 'not op_mini all'],
        development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
      }
    };

    await fs.writeFile(
      path.join(deploymentPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }

  private async buildProject(deploymentPath: string): Promise<void> {
    try {
      // For now, we'll serve static files directly
      // In production, you might want to run actual build processes

      // If it's a React project, create a simple build
      const srcPath = path.join(deploymentPath, 'src');
      if (await fs.pathExists(srcPath)) {
        // Copy src contents to root for direct serving
        await fs.copy(srcPath, deploymentPath, { overwrite: true });
      }

      // Ensure there's an index.html
      const indexPath = path.join(deploymentPath, 'index.html');
      if (!await fs.pathExists(indexPath)) {
        await fs.writeFile(indexPath, this.createIndexHtml('Generated App'));
      }

    } catch (error) {
      console.warn('Build process failed, serving as static files:', error);
    }
  }

  async cleanup(deploymentId: string): Promise<void> {
    try {
      const subdomain = `app-${deploymentId}`;
      const deploymentPath = path.join(this.stagingDir, subdomain);

      if (await fs.pathExists(deploymentPath)) {
        await fs.remove(deploymentPath);
        console.log(`🗑️  Cleaned up deployment: ${subdomain}`);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  async listDeployments(): Promise<string[]> {
    try {
      if (!await fs.pathExists(this.stagingDir)) {
        return [];
      }

      const entries = await fs.readdir(this.stagingDir);
      return entries.filter(entry => entry.startsWith('app-'));
    } catch (error) {
      console.error('Failed to list deployments:', error);
      return [];
    }
  }
}
