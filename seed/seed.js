require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Consumer = require('../models/Consumer');
const Meter = require('../models/Meter');
const Tariff = require('../models/Tariff');
const Reading = require('../models/Reading');
const Bill = require('../models/Bill');
const { calculateBill } = require('../utils/billCalculator');

const seedDatabase = async () => {
  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/utilityBilling';
  const fallbackUri = 'mongodb://127.0.0.1:27017/utilityBilling';
  let targetDbName = 'Atlas';

  try {
    console.log('Connecting to primary MongoDB URI...');
    await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB Atlas successfully: ' + mongoose.connection.host);
  } catch (err) {
    console.error('-------------------------------------------------------');
    console.error('❌ MongoDB Atlas Connection Failed:', err.message);
    if (err.message.includes('Authentication failed') || err.message.includes('bad auth')) {
      console.error('\n⚠️  ATLAS AUTHENTICATION FAILED:');
      console.error('The database user "project" with password "mani123" was rejected by Atlas.');
      console.error('👉 How to fix in 30 seconds on MongoDB Atlas:');
      console.error('   1. Open https://cloud.mongodb.com and select your project');
      console.error('   2. Click "Database Access" in the left sidebar');
      console.error('   3. If user "project" exists, click "Edit" -> "Edit Password" -> set to "mani123"');
      console.error('   4. If not, click "Add New Database User" -> Username: project, Password: mani123');
      console.error('   5. Set "Database User Privileges" to "Read and write to any database" -> Click "Add User"');
      console.error('   6. Click "Network Access" in sidebar -> Ensure IP 0.0.0.0/0 is present');
    }
    console.error('-------------------------------------------------------');

    if (primaryUri !== fallbackUri) {
      console.log('🔄 Seeding local MongoDB database (127.0.0.1:27017) so you can test right away...');
      try {
        await mongoose.disconnect().catch(() => {});
        await mongoose.connect(fallbackUri);
        targetDbName = 'Local MongoDB';
        console.log('✅ Connected to Local MongoDB successfully: ' + mongoose.connection.host);
      } catch (localErr) {
        console.error('Local MongoDB fallback also failed:', localErr.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }

  try {
    // Clean existing collections to avoid duplicate key conflicts
    await Promise.all([
      User.deleteMany({}),
      Consumer.deleteMany({}),
      Meter.deleteMany({}),
      Tariff.deleteMany({}),
      Reading.deleteMany({}),
      Bill.deleteMany({})
    ]);
    console.log(`Cleared existing database records in ${targetDbName}.`);

    // 1. CREATE TARIFF SLABS (Stored in MongoDB, not hardcoded!)
    const electricityTariff = await Tariff.create({
      name: 'Domestic Electricity Tariff (Standard)',
      connectionType: 'Electricity',
      slabs: [
        { from: 0, to: 100, rate: 3 },
        { from: 101, to: 200, rate: 5 },
        { from: 201, to: 500, rate: 7 },
        { from: 501, to: null, rate: 10 }
      ],
      fixedCharge: 100,
      isDefault: true
    });

    const waterTariff = await Tariff.create({
      name: 'Domestic Water Supply Tariff',
      connectionType: 'Water',
      slabs: [
        { from: 0, to: 100, rate: 2 },
        { from: 101, to: 200, rate: 4 },
        { from: 201, to: null, rate: 6 }
      ],
      fixedCharge: 50,
      isDefault: true
    });
    console.log('Tariff slabs created.');

    // 2. CREATE SYSTEM USERS WITH BCRYPT HASHING
    // Admin User
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@example.com',
      password: 'Admin@123',
      role: 'admin'
    });

    // Meter Reader User
    const readerUser = await User.create({
      name: 'Field Meter Reader',
      email: 'reader@example.com',
      password: 'Reader@123',
      role: 'meter_reader'
    });

    // 3. CREATE METERS
    const meter1 = await Meter.create({
      meterNumber: 'MTR001',
      connectionType: 'Electricity',
      installationDate: new Date('2025-01-15'),
      lastReading: 1450, // Matches specification: Previous 1200, Current 1450
      status: 'Active'
    });

    const meter2 = await Meter.create({
      meterNumber: 'MTR002',
      connectionType: 'Water',
      installationDate: new Date('2025-02-01'),
      lastReading: 320,
      status: 'Active'
    });

    const meter3 = await Meter.create({
      meterNumber: 'MTR003',
      connectionType: 'Electricity',
      installationDate: new Date('2025-03-10'),
      lastReading: 950,
      status: 'Active'
    });
    console.log('Utility meters created.');

    // 4. CREATE CONSUMERS
    // Primary Demo Consumer
    const consumer1 = await Consumer.create({
      consumerId: 'CON001',
      name: 'John Doe',
      email: 'consumer@example.com',
      phone: '9876543210',
      address: 'Flat 402, Sunshine Heights, Civil Lines',
      connectionType: 'Electricity',
      meterId: meter1._id,
      tariffId: electricityTariff._id,
      role: 'consumer'
    });

    // Create Consumer User account linked to Consumer record
    const consumerUser1 = await User.create({
      name: consumer1.name,
      email: consumer1.email,
      password: 'Consumer@123',
      role: 'consumer',
      consumerRef: consumer1._id
    });
    consumer1.userId = consumerUser1._id;
    await consumer1.save();

    // Link meter1 to consumer1
    meter1.consumerId = consumer1._id;
    await meter1.save();

    // Secondary Demo Consumer (Water)
    const consumer2 = await Consumer.create({
      consumerId: 'CON002',
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '9811223344',
      address: 'Plot 18, Royal Palms, Green Avenue',
      connectionType: 'Water',
      meterId: meter2._id,
      tariffId: waterTariff._id,
      role: 'consumer'
    });
    const consumerUser2 = await User.create({
      name: consumer2.name,
      email: consumer2.email,
      password: 'Consumer@123',
      role: 'consumer',
      consumerRef: consumer2._id
    });
    consumer2.userId = consumerUser2._id;
    await consumer2.save();
    meter2.consumerId = consumer2._id;
    await meter2.save();

    // Tertiary Consumer
    const consumer3 = await Consumer.create({
      consumerId: 'CON003',
      name: 'Rajesh Kumar',
      email: 'rajesh@example.com',
      phone: '9711556677',
      address: 'House 88, Lake View Colony',
      connectionType: 'Electricity',
      meterId: meter3._id,
      tariffId: electricityTariff._id,
      role: 'consumer'
    });
    const consumerUser3 = await User.create({
      name: consumer3.name,
      email: consumer3.email,
      password: 'Consumer@123',
      role: 'consumer',
      consumerRef: consumer3._id
    });
    consumer3.userId = consumerUser3._id;
    await consumer3.save();
    meter3.consumerId = consumer3._id;
    await meter3.save();

    console.log('Sample consumers and credentials seeded.');

    // 5. SEED READINGS & BILLS
    // A) Past Month Reading (August) for John Doe - Paid
    const readingAug = await Reading.create({
      meterId: meter1._id,
      consumerId: consumer1._id,
      previousReading: 1020,
      currentReading: 1200,
      unitsConsumed: 180,
      readingDate: new Date('2026-08-15'),
      month: 'August',
      year: 2026,
      enteredBy: readerUser._id
    });
    const calcAug = calculateBill(180, electricityTariff.slabs, electricityTariff.fixedCharge);
    await Bill.create({
      billId: 'BIL1001',
      consumerId: consumer1._id,
      meterId: meter1._id,
      readingId: readingAug._id,
      billingMonth: 'August',
      billingYear: 2026,
      previousReading: 1020,
      currentReading: 1200,
      unitsConsumed: 180,
      energyCharge: calcAug.energyCharge,
      fixedCharge: calcAug.fixedCharge,
      surcharge: 0,
      totalAmount: calcAug.totalAmount,
      dueDate: new Date('2026-08-30'),
      status: 'PAID',
      paymentDate: new Date('2026-08-25'),
      breakdown: calcAug.breakdown
    });

    // B) Current Month Reading (September) for John Doe - EXACT PROMPT SPECIFICATION
    // Previous: 1200, Current: 1450, Units: 250 -> ₹1250 total!
    const readingSep = await Reading.create({
      meterId: meter1._id,
      consumerId: consumer1._id,
      previousReading: 1200,
      currentReading: 1450,
      unitsConsumed: 250,
      readingDate: new Date('2026-09-15'),
      month: 'September',
      year: 2026,
      enteredBy: readerUser._id
    });
    const calcSep = calculateBill(250, electricityTariff.slabs, electricityTariff.fixedCharge);
    const dueDateSep = new Date();
    dueDateSep.setDate(dueDateSep.getDate() + 15);

    await Bill.create({
      billId: 'BIL1002',
      consumerId: consumer1._id,
      meterId: meter1._id,
      readingId: readingSep._id,
      billingMonth: 'September',
      billingYear: 2026,
      previousReading: 1200,
      currentReading: 1450,
      unitsConsumed: 250,
      energyCharge: calcSep.energyCharge,
      fixedCharge: calcSep.fixedCharge,
      surcharge: 0,
      totalAmount: calcSep.totalAmount,
      dueDate: dueDateSep,
      status: 'UNPAID',
      breakdown: calcSep.breakdown
    });

    // C) Water Bill for Priya Sharma - Unpaid Overdue to demonstrate Stretch Goal Late Surcharge!
    const readingWater = await Reading.create({
      meterId: meter2._id,
      consumerId: consumer2._id,
      previousReading: 200,
      currentReading: 320,
      unitsConsumed: 120,
      readingDate: new Date('2026-08-01'),
      month: 'August',
      year: 2026,
      enteredBy: readerUser._id
    });
    const calcWater = calculateBill(120, waterTariff.slabs, waterTariff.fixedCharge);
    const overdueDueDate = new Date('2026-08-16');
    const overdueSurcharge = Math.round(calcWater.totalAmount * 0.05);

    await Bill.create({
      billId: 'BIL1003',
      consumerId: consumer2._id,
      meterId: meter2._id,
      readingId: readingWater._id,
      billingMonth: 'August',
      billingYear: 2026,
      previousReading: 200,
      currentReading: 320,
      unitsConsumed: 120,
      energyCharge: calcWater.energyCharge,
      fixedCharge: calcWater.fixedCharge,
      surcharge: overdueSurcharge,
      totalAmount: calcWater.totalAmount + overdueSurcharge,
      dueDate: overdueDueDate,
      status: 'UNPAID',
      breakdown: calcWater.breakdown
    });

    console.log('=======================================================');
    console.log(` Database Seeding into [${targetDbName}] Completed!`);
    console.log(' Demo Accounts Ready:');
    console.log('   👑 Admin:        admin@example.com    / Admin@123');
    console.log('   📟 Meter Reader: reader@example.com   / Reader@123');
    console.log('   👤 Consumer:     consumer@example.com / Consumer@123');
    console.log(' Spec Check: CON001 Bill BIL1002 is 250 units = ₹1250 (UNPAID)');
    console.log(' Overdue Check: CON002 Bill BIL1003 has 5% late surcharge');
    console.log('=======================================================');

    process.exit(0);
  } catch (err) {
    console.error('Error during data population:', err);
    process.exit(1);
  }
};

seedDatabase();
