const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    console.log('🔧 Creating super admin user...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('password', 10);

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@demo.com' }
    });

    if (existingAdmin) {
      console.log('⚠️ Admin user already exists, updating...');
      
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email: 'admin@demo.com' },
        data: {
          accountType: 'ADMIN',
          password: hashedPassword,
          firstName: 'Super',
          lastName: 'Admin'
        }
      });
      
      console.log('✅ Admin user updated successfully:', updatedUser.email);
    } else {
      // Create new admin user
      const adminUser = await prisma.user.create({
        data: {
          firstName: 'Super',
          lastName: 'Admin',
          email: 'admin@demo.com',
          password: hashedPassword,
          accountType: 'ADMIN'
        }
      });

      console.log('✅ Super admin user created successfully!');
      console.log('📧 Email: admin@demo.com');
      console.log('🔑 Password: password');
      console.log('👤 User ID:', adminUser.id);
    }

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createSuperAdmin();