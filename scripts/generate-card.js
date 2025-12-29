const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

async function fetchImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const contentType = res.headers['content-type'] || 'image/jpeg';
        resolve(`data:${contentType};base64,${base64}`);
      });
    }).on('error', reject);
  });
}

function parseIssueBody(issueBody) {
  const data = {};
  const fieldRegex = /###\s+(.+?)\s*\n\s*\n([\s\S]*?)(?=\n###|\n$|$)/g;
  
  const fieldMap = {
    'Name': 'name',
    'Bio / Headline': 'bio',
    'Profile Picture URL': 'profile_picture',
    'Time posted': 'time',
    'Post Content': 'text',
    'Image URLs (Optional)': 'images',
    'Reaction Count': 'reactions',
    'Comments': 'comments',
    'Reposts': 'repost'
  };
  
  let match;
  while ((match = fieldRegex.exec(issueBody)) !== null) {
    const key = fieldMap[match[1].trim()];
    if (key) data[key] = match[2].trim();
  }
  
  if (data.images) {
    data.imageUrls = data.images.split('\n').map(url => url.trim()).filter(Boolean);
    data.imageCount = data.imageUrls.length;
  } else {
    data.imageUrls = [];
    data.imageCount = 0;
  }
  
  data.reactions = data.reactions || '0';
  data.comments = data.comments || '0';
  data.repost = data.repost || '0';
  
  return data;
}

async function populateTemplate(templateContent, data) {
  let result = templateContent
    .replace(/\$\{name\}/g, escapeHtml(data.name || ''))
    .replace(/\$\{bio\}/g, escapeHtml(data.bio || ''))
    .replace(/\$\{profile_picture\}/g, data.profile_picture || '')
    .replace(/\$\{time\}/g, escapeHtml(data.time || ''))
    .replace(/\$\{text\}/g, escapeHtml(data.text || ''))
    .replace(/\$\{reactions\}/g, data.reactions)
    .replace(/\$\{comments\}/g, data.comments)
    .replace(/\$\{repost\}/g, data.repost);
  
  if (data.imageCount > 0) {
    for (let i = 1; i <= 3; i++) {
      if (data.imageUrls[i - 1]) {
        try {
          const base64Image = await fetchImageAsBase64(data.imageUrls[i - 1]);
          const regex = new RegExp(`(<div class="gallery-slide img-${i}"[^>]*style="[^"]*background-image:\\s*url\\()([^)]+)(\\)[^"]*">)`, 'g');
          result = result.replace(regex, `$1${base64Image}$3`);
        } catch (error) {
          console.error(`Failed to fetch image ${i}:`, error.message);
        }
      }
    }
  }
  
  return result;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

async function generateCards() {
  try {
    const issueBody = process.env.ISSUE_BODY;
    const issueNumber = process.env.ISSUE_NUMBER;
    
    if (!issueBody || !issueNumber) {
      console.error('Missing ISSUE_BODY or ISSUE_NUMBER');
      process.exit(1);
    }
    
    const data = parseIssueBody(issueBody);
    
    const requiredFields = ['name', 'bio', 'profile_picture', 'time', 'text'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.error(`Missing required fields: ${missingFields.join(', ')}`);
      process.exit(1);
    }
    
    const useGallery = data.imageCount > 0;
    const templates = useGallery 
      ? ['linkedin-post-light.svg', 'linkedin-post-dark.svg']
      : ['linkedin-post-light-text.svg', 'linkedin-post-dark-text.svg'];
    
    const outputDir = path.join(process.cwd(), 'output', issueNumber);
    fs.mkdirSync(outputDir, { recursive: true });
    
    const generatedFiles = [];
    
    for (const templateName of templates) {
      const templatePath = path.join(process.cwd(), 'templates', templateName);
      if (!fs.existsSync(templatePath)) continue;
      
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const populatedContent = await populateTemplate(templateContent, data);
      
      const outputFileName = templateName.replace('linkedin-post-', '').replace('.svg', '.svg');
      const outputPath = path.join(outputDir, `linkedin-post-${outputFileName}`);
      fs.writeFileSync(outputPath, populatedContent, 'utf8');
      
      generatedFiles.push(outputPath);
    }
    
    if (generatedFiles.length > 0) {
      const summaryPath = path.join(outputDir, 'summary.txt');
      const summary = generatedFiles.map(f => path.basename(f)).join('\n');
      fs.writeFileSync(summaryPath, summary, 'utf8');
    }
    
    console.log(`Generated ${generatedFiles.length} cards`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

generateCards();
