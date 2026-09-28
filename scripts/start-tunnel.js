const localtunnel = require('localtunnel');
const fs = require('fs');

async function getIp() {
  try {
    const res = await fetch('https://loca.lt/mytunnelpassword');
    return (await res.text()).trim();
  } catch (e) {
    return 'Check https://loca.lt/mytunnelpassword';
  }
}

async function start() {
  const ipPassword = await getIp();
  console.log('Tunnel IP Password:', ipPassword);

  const tunnel = await localtunnel({ port: 3000 });
  console.log('----------------------------------------------------');
  console.log('PUBLIC URL:', tunnel.url);
  console.log('TUNNEL PASSWORD (IP):', ipPassword);
  console.log('----------------------------------------------------');

  fs.writeFileSync('public-url.txt', `URL: ${tunnel.url}\nPASSWORD: ${ipPassword}\n`, 'utf8');

  tunnel.on('close', () => {
    console.log('Tunnel closed. Reconnecting in 3 seconds...');
    setTimeout(start, 3000);
  });

  tunnel.on('error', (err) => {
    console.error('Tunnel error:', err.message);
    tunnel.close();
  });
}

start();
