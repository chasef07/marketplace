// Debug utility to completely clear auth state
// Run this in the browser console if you're still getting auth errors

(function clearAllAuthData() {
  console.log('🧹 Clearing all authentication data...');
  
  // Clear localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('auth') || key.includes('sb-'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log('Removing:', key);
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear any cookies
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  console.log('✅ Auth data cleared! Refreshing page...');
  
  // Refresh the page
  setTimeout(() => {
    window.location.reload();
  }, 1000);
})();