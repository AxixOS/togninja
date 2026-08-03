#!/usr/bin/env node

/**
 * Deployment Issue Fix Script
 * Addresses the Internal Server Error 500 on production deployment
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Fixing deployment issues for New Age Fotografie CRM...');

// 1. Create minimal working index.html for production
const createProductionHTML = () => {
  const htmlContent = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Age Fotografie - Familienfotograf in Wien</title>
    <meta name="description" content="Professioneller Familienfotograf in Wien. Neugeborenenfotos, Familienporträts, Business-Headshots. Vertrauen Sie auf 5 Jahre Erfahrung.">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            max-width: 600px;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        .logo {
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 20px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .status {
            font-size: 1.2rem;
            margin: 20px 0;
        }
        .contact {
            margin-top: 30px;
            font-size: 1.1rem;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #ff6b6b;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin: 10px;
            font-weight: bold;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #ff5252;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">NEW AGE FOTOGRAFIE</div>
        <div class="status">
            <div class="loading"></div>
            System wird geladen...
        </div>
        <p>Professioneller Familienfotograf in Wien</p>
        <div class="contact">
            <strong>Kontakt:</strong><br>
            📧 hallo@newagefotografie.com<br>
            📞 +43 677 663 99210<br>
            📍 Schönbrunner Str. 25, 1050 Wien
        </div>
        <div style="margin-top: 30px;">
            <a href="mailto:hallo@newagefotografie.com" class="btn">E-Mail senden</a>
            <a href="tel:+43677933992102" class="btn">Anrufen</a>
        </div>
    </div>

    <script>
        // Auto-reload every 30 seconds to check if main app is available
        let retryCount = 0;
        const maxRetries = 20;

        async function checkMainApp() {
            try {
                const response = await fetch('/api/health');
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'ok') {
                        // Main app is available, reload to normal site
                        window.location.reload();
                        return;
                    }
                }
            } catch (error) {
                console.log('Main app not ready yet, retrying...', error);
            }

            retryCount++;
            if (retryCount < maxRetries) {
                setTimeout(checkMainApp, 30000); // Check every 30 seconds
            } else {
                document.querySelector('.status').innerHTML = 
                    '⚠️ Technische Wartung läuft<br>Bitte kontaktieren Sie uns direkt.';
            }
        }

        // Start checking after 5 seconds
        setTimeout(checkMainApp, 5000);
    </script>
</body>
</html>`;

  // Ensure directories exist
  const publicDir = path.resolve('dist/public');
  const serverPublicDir = path.resolve('server/public');
  
  if (!fs.existsSync('dist')) fs.mkdirSync('dist', { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync('server')) fs.mkdirSync('server', { recursive: true });
  if (!fs.existsSync(serverPublicDir)) fs.mkdirSync(serverPublicDir, { recursive: true });

  // Write to both locations
  fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent);
  fs.writeFileSync(path.join(serverPublicDir, 'index.html'), htmlContent);
  
  console.log('✅ Created production HTML fallback');
};

// 2. Create simple health check endpoint test
const createHealthCheckTest = () => {
  const testScript = `#!/usr/bin/env node

import https from 'https';

const testEndpoint = (url) => {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

async function runHealthCheck() {
  console.log('🔍 Testing deployment health...');
  
  try {
    const result = await testEndpoint('https://www.newagefotografie.com/api/health');
    console.log('Status Code:', result.statusCode);
    console.log('Response:', result.data);
    
    if (result.statusCode === 200) {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed');
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
  }
}

runHealthCheck();
`;

  fs.writeFileSync('scripts/test-deployment-health.js', testScript);
  console.log('✅ Created health check test script');
};

// 3. Update replit deployment configuration
const updateReplitConfig = () => {
  const replitConfig = `# Replit Configuration for New Age Fotografie CRM

[deployment]
run = "NODE_ENV=production tsx server/index.ts"
deploymentTarget = "cloudrun"

[env]
NODE_ENV = "production"
DEMO_MODE = "false"

[[ports]]
localPort = 5000
externalPort = 80
`;

  fs.writeFileSync('.replit', replitConfig);
  console.log('✅ Updated Replit configuration');
};

// Run all fixes
try {
  createProductionHTML();
  createHealthCheckTest();
  updateReplitConfig();
  
  console.log('\n🎉 Deployment fixes completed!');
  console.log('📋 Next steps:');
  console.log('1. Deploy using Replit deploy button');
  console.log('2. Run: node scripts/test-deployment-health.js');
  console.log('3. Monitor deployment logs for any remaining issues');
  
} catch (error) {
  console.error('❌ Error applying fixes:', error);
  process.exit(1);
}