async function testEndpoints() {
  const tests = [
    'http://localhost:3000/api/mobiles',
    'http://localhost:3000/api/mobiles?brand=Apple',
    'http://localhost:3000/api/mobiles?search=iPhone%2016%20Pro',
    'http://localhost:3000/api/mobiles?maxPrice=30000',
    'http://localhost:3000/api/mobiles/iphone-16-pro-max',
    'http://localhost:3000/',
    'http://localhost:3000/mobile/iphone-16-pro-max',
    'http://localhost:3000/phones/iphone-16-pro-max.jpg'
  ];

  for (const url of tests) {
    try {
      const res = await fetch(url);
      console.log(`[${res.status}] ${url}`);
      if (url.includes('/api/mobiles')) {
        const data = await res.json();
        console.log(`   Result: ${data.count !== undefined ? data.count + ' items' : data.mobile?.model}`);
      }
    } catch (e) {
      console.log(`[ERROR] ${url}: ${e.message}`);
    }
  }
}
testEndpoints();
