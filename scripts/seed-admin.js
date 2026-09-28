const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function seedUser(userData) {
  const existing = await prisma.user.findUnique({
    where: { email: userData.email }
  });

  if (!existing) {
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: hashPassword(userData.password),
        role: userData.role || 'USER'
      }
    });
    console.log(`Created account: ${user.name} (${user.email}) [${user.role}]`);
  } else {
    await prisma.user.update({
      where: { email: userData.email },
      data: {
        password: hashPassword(userData.password),
        name: userData.name,
      }
    });
    console.log(`Account verified and updated: ${existing.email} [${existing.role}]`);
  }
}

async function main() {
  await seedUser({
    name: 'VM Mobiles Administrator',
    email: 'admin@vmmobiles.in',
    phone: '+91 99999 00000',
    password: 'admin123',
    role: 'ADMIN'
  });

  await seedUser({
    name: 'Vicram',
    email: 'vicram@example.com',
    phone: '+91 98765 43210',
    password: 'user123',
    role: 'USER'
  });

  await seedUser({
    name: 'Zara',
    email: 'zara@example.com',
    phone: '+91 98765 88990',
    password: 'user123',
    role: 'USER'
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
