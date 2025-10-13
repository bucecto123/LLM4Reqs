// JWT Status Checker - Run this in browser console
function checkJWTStatus() {
  console.log('🔐 JWT Authentication Status Check');
  console.log('=' .repeat(40));
  
  // Check tokens
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  const tokenExpiry = localStorage.getItem('token_expiry');
  const oldToken = localStorage.getItem('api_token');
  const user = localStorage.getItem('user');
  
  console.log('📱 Token Storage:');
  console.log('  Access Token:', accessToken ? '✅ Present' : '❌ Missing');
  console.log('  Refresh Token:', refreshToken ? '✅ Present' : '❌ Missing');
  console.log('  Token Expiry:', tokenExpiry ? '✅ Present' : '❌ Missing');
  console.log('  Old API Token:', oldToken ? '⚠️ Still exists' : '✅ Removed');
  console.log('  User Data:', user ? '✅ Present' : '❌ Missing');
  
  // Check token format
  if (accessToken) {
    const isJWT = accessToken.startsWith('eyJ');
    console.log('\n🔍 Token Analysis:');
    console.log('  Format:', isJWT ? 'JWT ✅' : 'Sanctum Legacy ⚠️');
    console.log('  Preview:', accessToken.substring(0, 30) + '...');
  }
  
  // Check expiration
  if (tokenExpiry) {
    const expiryDate = new Date(parseInt(tokenExpiry));
    const now = new Date();
    const timeLeft = Math.floor((expiryDate - now) / 1000 / 60);
    console.log('\n⏰ Expiration Info:');
    console.log('  Expires at:', expiryDate.toLocaleString());
    console.log('  Time left:', timeLeft > 0 ? `${timeLeft} minutes` : 'EXPIRED');
    console.log('  Auto-refresh:', timeLeft <= 5 ? 'Will refresh soon ⚡' : 'Not yet needed ✅');
  }
  
  // Overall status
  const isFullJWT = accessToken && refreshToken && tokenExpiry && !oldToken;
  console.log('\n🎯 Overall Status:');
  console.log('  JWT System:', isFullJWT ? 'ACTIVE ✅' : 'INCOMPLETE ⚠️');
  
  return {
    isJWT: isFullJWT,
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    hasExpiry: !!tokenExpiry,
    hasOldToken: !!oldToken,
    timeLeft: tokenExpiry ? Math.floor((new Date(parseInt(tokenExpiry)) - new Date()) / 1000 / 60) : null
  };
}

// Run the check
checkJWTStatus();