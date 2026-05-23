import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying League Detail Implementation\n');

// Check if the page file exists
const pageFile = './app/ligas/[id]/page.tsx';
if (fs.existsSync(pageFile)) {
  console.log(`✓ Page file exists: ${pageFile}`);
  const content = fs.readFileSync(pageFile, 'utf8');
  
  // Check for required features
  const features = [
    { name: 'League header with name', pattern: /league\.name/ },
    { name: 'Member count display', pattern: /member_count/ },
    { name: 'Access type badge', pattern: /access_type.*open.*private/ },
    { name: 'Member list rendering', pattern: /league\.members\.map/ },
    { name: 'Convidar (Invite) button', pattern: /Convidar/ },
    { name: 'Admin check logic', pattern: /isAdmin.*created_by.*currentUserId/ },
    { name: 'Configurações modal', pattern: /ConfigureModal/ },
    { name: 'Remove member functionality', pattern: /handleRemoveMember/ },
    { name: 'Delete league functionality', pattern: /handleDeleteLeague/ },
    { name: 'Join date formatting', pattern: /toLocaleDateString/ },
  ];
  
  console.log('\n📋 Feature Checklist:');
  features.forEach(feature => {
    const found = feature.pattern.test(content);
    console.log(`  ${found ? '✓' : '✗'} ${feature.name}`);
  });
} else {
  console.log(`✗ Page file not found: ${pageFile}`);
}

// Check test file
const testFile = './tests/unit/league-detail.test.tsx';
if (fs.existsSync(testFile)) {
  console.log(`\n✓ Unit test file exists: ${testFile}`);
  const testContent = fs.readFileSync(testFile, 'utf8');
  
  const testPatterns = [
    { name: 'League header tests', pattern: /League Header Rendering/ },
    { name: 'Member list tests', pattern: /Member List Rendering/ },
    { name: 'Admin action visibility tests', pattern: /Admin Action Visibility/ },
    { name: 'Member view tests', pattern: /Member View/ },
    { name: 'Invite functionality tests', pattern: /Convidar/ },
    { name: 'Remove member tests', pattern: /Remover/ },
    { name: 'Delete league tests', pattern: /Excluir/ },
    { name: 'Configuration modal tests', pattern: /Configurações/ },
  ];
  
  console.log('\n🧪 Test Coverage:');
  testPatterns.forEach(pattern => {
    const found = pattern.pattern.test(testContent);
    console.log(`  ${found ? '✓' : '✗'} ${pattern.name}`);
  });
}

// Check API route
const apiFile = './app/api/leagues/[id]/route.ts';
if (fs.existsSync(apiFile)) {
  console.log(`\n✓ API endpoint exists: ${apiFile}`);
  const apiContent = fs.readFileSync(apiFile, 'utf8');
  
  const apiFeatures = [
    { name: 'GET league details', pattern: /export async function GET/ },
    { name: 'Membership check', pattern: /league_members/ },
    { name: 'Member list fetch', pattern: /league_members.*select/ },
    { name: 'Access control (403)', pattern: /NOT_A_MEMBER/ },
  ];
  
  console.log('\n🔧 API Features:');
  apiFeatures.forEach(feature => {
    const found = feature.pattern.test(apiContent);
    console.log(`  ${found ? '✓' : '✗'} ${feature.name}`);
  });
}

console.log('\n✅ Implementation verification complete!');
