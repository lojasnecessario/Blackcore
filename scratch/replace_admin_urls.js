const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.next')) {
        results = results.concat(walk(file));
      }
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, '../src'));
const adminUrlImport = `import { getAdminUrl } from '@/lib/admin-url'`;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("'/admin") || content.includes('"/admin') || content.includes('`/admin')) {
    
    // Add import if missing
    if (!content.includes('getAdminUrl')) {
       // insert after the last import
       const importMatches = [...content.matchAll(/^import .* from .*$/gm)];
       if (importMatches.length > 0) {
          const lastImport = importMatches[importMatches.length - 1];
          const insertPos = lastImport.index + lastImport[0].length;
          content = content.slice(0, insertPos) + '\n' + adminUrlImport + content.slice(insertPos);
       } else {
          content = adminUrlImport + '\n' + content;
       }
    }

    // Replace <Link href="/admin/...">
    content = content.replace(/href="\/admin\/([^"]*)"/g, 'href={getAdminUrl(\'/$1\')}');
    content = content.replace(/href="\/admin"/g, 'href={getAdminUrl(\'/\')}');
    
    // Replace <Link href={`/admin/...`}>
    content = content.replace(/href=\{`\/admin\/([^`]*)`\}/g, 'href={getAdminUrl(`/$1`)}');
    content = content.replace(/href=\{`\/admin`\}/g, 'href={getAdminUrl(\'/\')}');

    // Replace router.push('/admin/...')
    content = content.replace(/push\('\/admin\/([^']*)'\)/g, 'push(getAdminUrl(\'/$1\'))');
    content = content.replace(/push\('\/admin'\)/g, 'push(getAdminUrl(\'/\'))');

    // Replace redirect('/admin/...')
    content = content.replace(/redirect\('\/admin\/([^']*)'\)/g, 'redirect(getAdminUrl(\'/$1\'))');
    content = content.replace(/redirect\('\/admin'\)/g, 'redirect(getAdminUrl(\'/\'))');

    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
