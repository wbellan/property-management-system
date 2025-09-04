// prisma/seed.ts - Comprehensive Dataset with Bank Transactions
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clean existing data in correct order (respecting foreign key constraints)
  console.log('Cleaning existing data...');

  await prisma.paymentReceipt.deleteMany({});
  await prisma.reconciliationMatch.deleteMany({});
  await prisma.bankReconciliation.deleteMany({});
  await prisma.bankTransaction.deleteMany({});
  await prisma.bankStatement.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.paymentApplication.deleteMany({});
  await prisma.paymentAttachment.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.invoiceAttachment.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.rentPayment.deleteMany({});
  await prisma.rentIncrease.deleteMany({});
  await prisma.leaseRenewal.deleteMany({});
  await prisma.lease.deleteMany({});
  await prisma.maintenanceAssignment.deleteMany({});
  await prisma.maintenanceRequest.deleteMany({});
  await prisma.propertyExpense.deleteMany({});
  await prisma.spaceImage.deleteMany({});
  await prisma.propertyImage.deleteMany({});
  await prisma.space.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.bankLedger.deleteMany({});
  await prisma.chartAccount.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.userProperty.deleteMany({});
  await prisma.userEntity.deleteMany({});
  await prisma.userInvitation.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.userSetting.deleteMany({});
  await prisma.organizationSetting.deleteMany({});
  await prisma.settingsAudit.deleteMany({});
  await prisma.passwordHistory.deleteMany({});
  await prisma.passwordPolicy.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.entity.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log('Database cleaned successfully');
  console.log('Creating fresh data...');

  // Create organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Austin Property Holdings',
      description: 'Professional property management company serving Austin and surrounding areas',
      address: '1500 South Lamar Blvd, Austin, TX 78704',
      phone: '(512) 555-0100',
      email: 'info@austinpropertyholdings.com',
      website: 'https://austinpropertyholdings.com',
    },
  });
  console.log('✅ Created organization');

  // Create password hash
  const passwordHash = await bcrypt.hash('Austin2024!', 10);

  // Create users with diverse roles
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@austinpropertyholdings.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '(512) 555-0101',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      organizationId: organization.id,
      emailVerified: true,
      title: 'Chief Executive Officer',
      department: 'Executive',
    },
  });

  const orgAdmin = await prisma.user.create({
    data: {
      email: 'operations@austinpropertyholdings.com',
      passwordHash,
      firstName: 'Michael',
      lastName: 'Chen',
      phone: '(512) 555-0102',
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
      organizationId: organization.id,
      emailVerified: true,
      title: 'Operations Manager',
      department: 'Operations',
    },
  });

  const entityManager = await prisma.user.create({
    data: {
      email: 'entity.manager@austinpropertyholdings.com',
      passwordHash,
      firstName: 'Jennifer',
      lastName: 'Rodriguez',
      phone: '(512) 555-0103',
      role: 'ENTITY_MANAGER',
      status: 'ACTIVE',
      organizationId: organization.id,
      emailVerified: true,
      title: 'Entity Manager',
      department: 'Finance',
    },
  });

  const propertyManager = await prisma.user.create({
    data: {
      email: 'property.manager@austinpropertyholdings.com',
      passwordHash,
      firstName: 'Amanda',
      lastName: 'Davis',
      phone: '(512) 555-0104',
      role: 'PROPERTY_MANAGER',
      status: 'ACTIVE',
      organizationId: organization.id,
      emailVerified: true,
      title: 'Property Manager',
      department: 'Property Management',
    },
  });

  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@austinpropertyholdings.com',
      passwordHash,
      firstName: 'David',
      lastName: 'Kim',
      phone: '(512) 555-0105',
      role: 'ACCOUNTANT',
      status: 'ACTIVE',
      organizationId: organization.id,
      emailVerified: true,
      title: 'Staff Accountant',
      department: 'Finance',
    },
  });

  const maintenanceStaff = await prisma.user.create({
    data: {
      email: 'maintenance@austinpropertyholdings.com',
      passwordHash,
      firstName: 'Carlos',
      lastName: 'Martinez',
      phone: '(512) 555-0106',
      role: 'MAINTENANCE',
      status: 'ACTIVE',
      organizationId: organization.id,
      emailVerified: true,
      title: 'Maintenance Supervisor',
      department: 'Maintenance',
    },
  });

  // Create tenant users
  const tenantUser1 = await prisma.user.create({
    data: {
      email: 'tenant1@example.com',
      passwordHash,
      firstName: 'James',
      lastName: 'Anderson',
      phone: '(512) 555-1001',
      role: 'TENANT',
      status: 'ACTIVE',
      organizationId: organization.id,
      emailVerified: true,
      address: '123 Current St, Austin, TX 78701',
    },
  });

  const tenantUser2 = await prisma.user.create({
    data: {
      email: 'tenant2@example.com',
      passwordHash,
      firstName: 'Emily',
      lastName: 'Wilson',
      phone: '(512) 555-1002',
      role: 'TENANT',
      status: 'ACTIVE',
      organizationId: organization.id,
      emailVerified: true,
      address: '456 Tenant Ave, Austin, TX 78702',
    },
  });

  const tenantUser3 = await prisma.user.create({
    data: {
      email: 'tenant3@example.com',
      passwordHash,
      firstName: 'Robert',
      lastName: 'Garcia',
      phone: '(512) 555-1003',
      role: 'TENANT',
      status: 'ACTIVE',
      organizationId: organization.id,
      emailVerified: true,
      address: '789 Renter Rd, Austin, TX 78703',
    },
  });

  console.log('✅ Created users');

  // Create entities
  const entity1 = await prisma.entity.create({
    data: {
      name: 'Lakeway Investments LLC',
      legalName: 'Lakeway Investments Limited Liability Company',
      entityType: 'LLC',
      taxId: '12-3456789',
      address: '2100 Lakeway Blvd, Lakeway, TX 78734',
      phone: '(512) 555-0200',
      email: 'info@lakewayinvestments.com',
      organizationId: organization.id,
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      description: 'Residential property investment entity',
    },
  });

  const entity2 = await prisma.entity.create({
    data: {
      name: 'Downtown Holdings Inc',
      legalName: 'Downtown Holdings Incorporated',
      entityType: 'Corporation',
      taxId: '98-7654321',
      address: '789 Corporate Dr, Austin, TX 78701',
      phone: '(512) 555-0300',
      email: 'info@downtownholdings.com',
      organizationId: organization.id,
      isActive: true,
      isVerified: true,
      verifiedAt: new Date(),
      description: 'Commercial and mixed-use property entity',
    },
  });

  console.log('✅ Created entities');

  // Create user-entity relationships
  await prisma.userEntity.createMany({
    data: [
      { userId: superAdmin.id, entityId: entity1.id },
      { userId: superAdmin.id, entityId: entity2.id },
      { userId: entityManager.id, entityId: entity1.id },
      { userId: entityManager.id, entityId: entity2.id },
      { userId: propertyManager.id, entityId: entity1.id },
      { userId: propertyManager.id, entityId: entity2.id },
      { userId: accountant.id, entityId: entity1.id },
      { userId: accountant.id, entityId: entity2.id },
    ],
  });

  // Create default chart of accounts for each entity
  const defaultAccounts = [
    // Assets
    { code: '1100', name: 'Checking Account - Operating', type: 'ASSET', description: 'Primary operating checking account' },
    { code: '1110', name: 'Checking Account - Security Deposits', type: 'ASSET', description: 'Dedicated security deposits account' },
    { code: '1200', name: 'Rent Receivable', type: 'ASSET', description: 'Outstanding rent receivables' },
    { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', description: 'Prepaid insurance, taxes, etc.' },
    { code: '1500', name: 'Buildings', type: 'ASSET', description: 'Real estate properties' },
    { code: '1600', name: 'Accumulated Depreciation', type: 'ASSET', description: 'Building depreciation' },

    // Liabilities
    { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', description: 'Vendor and contractor payables' },
    { code: '2200', name: 'Accrued Expenses', type: 'LIABILITY', description: 'Accrued utilities, wages, etc.' },
    { code: '2300', name: 'Security Deposits Held', type: 'LIABILITY', description: 'Tenant security deposits held' },
    { code: '2500', name: 'Mortgage Payable', type: 'LIABILITY', description: 'Property mortgage loans' },

    // Equity
    { code: '3100', name: 'Owner\'s Equity', type: 'EQUITY', description: 'Owner equity contributions' },
    { code: '3200', name: 'Retained Earnings', type: 'EQUITY', description: 'Accumulated retained earnings' },

    // Revenue
    { code: '4100', name: 'Rental Income', type: 'REVENUE', description: 'Monthly rental income' },
    { code: '4200', name: 'Late Fees', type: 'REVENUE', description: 'Late payment fees' },
    { code: '4300', name: 'Application Fees', type: 'REVENUE', description: 'Tenant application fees' },
    { code: '4400', name: 'Other Income', type: 'REVENUE', description: 'Pet fees, parking, etc.' },

    // Expenses
    { code: '5100', name: 'Maintenance and Repairs', type: 'EXPENSE', description: 'Property maintenance costs' },
    { code: '5200', name: 'Utilities', type: 'EXPENSE', description: 'Water, electric, gas, trash' },
    { code: '5300', name: 'Insurance', type: 'EXPENSE', description: 'Property insurance premiums' },
    { code: '5400', name: 'Property Taxes', type: 'EXPENSE', description: 'Real estate taxes' },
    { code: '5500', name: 'Management Fees', type: 'EXPENSE', description: 'Property management fees' },
    { code: '5600', name: 'Bank Fees', type: 'EXPENSE', description: 'Banking and processing fees' },
    { code: '5700', name: 'Professional Services', type: 'EXPENSE', description: 'Legal, accounting, etc.' },
    { code: '5800', name: 'Marketing and Advertising', type: 'EXPENSE', description: 'Vacancy marketing costs' },
  ];

  const chartAccounts1 = [];
  const chartAccounts2 = [];

  for (const account of defaultAccounts) {
    const account1 = await prisma.chartAccount.create({
      data: {
        entityId: entity1.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type as any,
        description: account.description,
      },
    });
    chartAccounts1.push(account1);

    const account2 = await prisma.chartAccount.create({
      data: {
        entityId: entity2.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type as any,
        description: account.description,
      },
    });
    chartAccounts2.push(account2);
  }
  console.log('✅ Created chart of accounts');

  // Create bank accounts with explicit chart account mapping
  const operatingAccount1 = chartAccounts1.find(a => a.accountCode === '1100');
  const securityAccount1 = chartAccounts1.find(a => a.accountCode === '1110');
  const operatingAccount2 = chartAccounts2.find(a => a.accountCode === '1100');

  const bankAccount1Operating = await prisma.bankLedger.create({
    data: {
      entityId: entity1.id,
      accountName: 'Operating Checking',
      bankName: 'First National Bank',
      accountType: 'CHECKING',
      accountNumber: '****1234',
      routingNumber: '111000025',
      currentBalance: 46904.33,
      chartAccountId: operatingAccount1!.id,
    },
  });

  const bankAccount1Deposits = await prisma.bankLedger.create({
    data: {
      entityId: entity1.id,
      accountName: 'Security Deposits Account',
      bankName: 'First National Bank',
      accountType: 'SAVINGS',
      accountNumber: '****5678',
      routingNumber: '111000025',
      currentBalance: 18000,
      chartAccountId: securityAccount1!.id,
    },
  });

  const bankAccount2 = await prisma.bankLedger.create({
    data: {
      entityId: entity2.id,
      accountName: 'Business Checking',
      bankName: 'Austin Community Bank',
      accountType: 'CHECKING',
      accountNumber: '****9876',
      routingNumber: '114000093',
      currentBalance: 85000,
      chartAccountId: operatingAccount2!.id,
    },
  });
  console.log('✅ Created bank accounts with chart account mapping');

  // Create bank statements
  const bankStatement1 = await prisma.bankStatement.create({
    data: {
      bankAccountId: bankAccount1Operating.id,
      statementStartDate: new Date('2024-08-31'),
      statementEndDate: new Date('2024-09-30'),
      openingBalance: 45000.00,
      closingBalance: 46904.33,
      statementReference: 'STMT-2024-09',
      importedById: entityManager.id,
      importedAt: new Date(),
    },
  });
  console.log('✅ Created bank statements');

  // Create bank transactions for check register
  const bankTransactionData = [
    {
      transactionDate: new Date('2024-08-31T10:00:00Z'),
      amount: 1400.00,
      description: 'Monthly Rent - Unit A01',
      referenceNumber: 'DEP001',
      transactionType: 'DEBIT',
      runningBalance: 46400.00
    },
    {
      transactionDate: new Date('2024-08-31T10:30:00Z'),
      amount: 1800.00,
      description: 'Monthly Rent - Unit A02',
      referenceNumber: 'DEP002',
      transactionType: 'DEBIT',
      runningBalance: 48200.00
    },
    {
      transactionDate: new Date('2024-09-01T14:15:00Z'),
      amount: 245.67,
      description: 'Austin Electric Company',
      referenceNumber: '1234',
      transactionType: 'CREDIT',
      runningBalance: 47954.33
    },
    {
      transactionDate: new Date('2024-09-02T09:30:00Z'),
      amount: 350.00,
      description: 'Hill Country Plumbing',
      referenceNumber: 'ACH001',
      transactionType: 'CREDIT',
      runningBalance: 47604.33
    },
    {
      transactionDate: new Date('2024-09-04T16:45:00Z'),
      amount: 50.00,
      description: 'Late Fee - Unit A05',
      referenceNumber: 'DEP003',
      transactionType: 'DEBIT',
      runningBalance: 47654.33
    },
    {
      transactionDate: new Date('2024-09-09T11:20:00Z'),
      amount: 750.00,
      description: 'Property Insurance Co',
      referenceNumber: '1235',
      transactionType: 'CREDIT',
      runningBalance: 46904.33
    }
  ];

  // Create the bank transactions
  for (const txn of bankTransactionData) {
    await prisma.bankTransaction.create({
      data: {
        bankStatementId: bankStatement1.id,
        transactionDate: txn.transactionDate,
        amount: txn.amount,
        description: txn.description,
        referenceNumber: txn.referenceNumber,
        transactionType: txn.transactionType,
        runningBalance: txn.runningBalance,
      },
    });
  }
  console.log('✅ Created bank transactions');

  // Create properties
  const property1 = await prisma.property.create({
    data: {
      name: 'Lakeway Vista Apartments',
      address: '2200 Lakeway Vista Dr',
      city: 'Lakeway',
      state: 'TX',
      zipCode: '78734',
      entityId: entity1.id,
      propertyType: 'RESIDENTIAL',
      yearBuilt: 2018,
      totalSpaces: 24,
      squareFootage: 30000,
      lotSize: 50000,
      purchasePrice: 4200000,
      currentMarketValue: 5500000,
      description: 'Modern apartment complex with lake views and premium amenities',
    },
  });

  const property2 = await prisma.property.create({
    data: {
      name: 'Cedar Park Commons',
      address: '1200 Cypress Creek Rd',
      city: 'Cedar Park',
      state: 'TX',
      zipCode: '78613',
      entityId: entity2.id,
      propertyType: 'RESIDENTIAL',
      yearBuilt: 2017,
      totalSpaces: 36,
      squareFootage: 45000,
      lotSize: 75000,
      purchasePrice: 6300000,
      currentMarketValue: 7800000,
      description: 'Family-friendly apartment community with playground and pool',
    },
  });

  const property3 = await prisma.property.create({
    data: {
      name: 'Austin Tech Center',
      address: '500 Downtown Plaza',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      entityId: entity1.id,
      propertyType: 'OFFICE',
      yearBuilt: 2020,
      totalSpaces: 12,
      squareFootage: 25000,
      lotSize: 15000,
      purchasePrice: 8500000,
      currentMarketValue: 9200000,
      description: 'Modern office building in downtown Austin',
    },
  });

  console.log('✅ Created properties');

  // Link property manager to properties
  await prisma.userProperty.createMany({
    data: [
      { userId: propertyManager.id, propertyId: property1.id },
      { userId: propertyManager.id, propertyId: property2.id },
      { userId: propertyManager.id, propertyId: property3.id },
    ],
  });

  // Create spaces
  const spaces = [];

  // Property 1 units (Lakeway Vista - 24 units)
  for (let i = 1; i <= 24; i++) {
    const space = await prisma.space.create({
      data: {
        name: `Unit A${i.toString().padStart(2, '0')}`,
        type: 'APARTMENT',
        status: 'AVAILABLE',
        floorNumber: Math.ceil(i / 8),
        bedrooms: i <= 8 ? 1 : i <= 16 ? 2 : 3,
        bathrooms: i <= 8 ? 1.0 : 2.0,
        squareFootage: i <= 8 ? 650 : i <= 16 ? 950 : 1250,
        rent: i <= 8 ? 1400 : i <= 16 ? 1800 : 2200,
        deposit: i <= 8 ? 1400 : i <= 16 ? 1800 : 2200,
        description: `${i <= 8 ? 1 : i <= 16 ? 2 : 3} bedroom apartment with modern finishes`,
        propertyId: property1.id,
      },
    });
    spaces.push(space);
  }

  // Property 2 units (Cedar Park - 36 units)
  for (let i = 1; i <= 36; i++) {
    const space = await prisma.space.create({
      data: {
        name: `Unit B${i.toString().padStart(2, '0')}`,
        type: 'APARTMENT',
        status: 'AVAILABLE',
        floorNumber: Math.ceil(i / 12),
        bedrooms: i <= 12 ? 1 : i <= 24 ? 2 : 3,
        bathrooms: i <= 12 ? 1.0 : 2.0,
        squareFootage: i <= 12 ? 700 : i <= 24 ? 1000 : 1300,
        rent: i <= 12 ? 1500 : i <= 24 ? 1900 : 2300,
        deposit: i <= 12 ? 1500 : i <= 24 ? 1900 : 2300,
        description: `${i <= 12 ? 1 : i <= 24 ? 2 : 3} bedroom family apartment`,
        propertyId: property2.id,
      },
    });
    spaces.push(space);
  }

  // Property 3 spaces (Austin Tech Center - 12 office suites)
  for (let i = 1; i <= 12; i++) {
    const space = await prisma.space.create({
      data: {
        name: `Suite ${i.toString().padStart(3, '0')}`,
        type: 'OFFICE',
        status: 'AVAILABLE',
        floorNumber: Math.ceil(i / 6),
        bathrooms: 1.0,
        squareFootage: 800 + (i * 200),
        rent: 2500 + (i * 200),
        deposit: 2500 + (i * 200),
        description: `Professional office suite with downtown views`,
        propertyId: property3.id,
      },
    });
    spaces.push(space);
  }

  console.log(`✅ Created ${spaces.length} spaces`);

  // Create tenant profiles for tenant users
  const tenant1 = await prisma.tenant.create({
    data: {
      userId: tenantUser1.id,
      firstName: 'James',
      lastName: 'Anderson',
      email: 'tenant1@example.com',
      phone: '(512) 555-1001',
      emergencyContactName: 'Sarah Anderson',
      emergencyContactPhone: '(512) 555-9001',
      dateOfBirth: new Date('1985-03-15'),
      monthlyIncome: 5200,
      employerInfo: 'Austin Tech Solutions - Software Developer',
      organizationId: organization.id,
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      userId: tenantUser2.id,
      firstName: 'Emily',
      lastName: 'Wilson',
      email: 'tenant2@example.com',
      phone: '(512) 555-1002',
      emergencyContactName: 'David Wilson',
      emergencyContactPhone: '(512) 555-9002',
      dateOfBirth: new Date('1990-07-22'),
      monthlyIncome: 4800,
      employerInfo: 'Memorial Healthcare - Registered Nurse',
      organizationId: organization.id,
    },
  });

  const tenant3 = await prisma.tenant.create({
    data: {
      userId: tenantUser3.id,
      firstName: 'Robert',
      lastName: 'Garcia',
      email: 'tenant3@example.com',
      phone: '(512) 555-1003',
      emergencyContactName: 'Maria Garcia',
      emergencyContactPhone: '(512) 555-9003',
      dateOfBirth: new Date('1982-11-08'),
      monthlyIncome: 6200,
      employerInfo: 'Garcia & Associates - Senior Accountant',
      organizationId: organization.id,
    },
  });

  console.log('✅ Created tenant profiles');

  // Create active leases (80% occupancy)
  const totalSpaceCount = spaces.length;
  const occupiedCount = Math.floor(totalSpaceCount * 0.8);
  const occupiedSpaces = spaces.slice(0, occupiedCount);
  const tenants = [tenant1, tenant2, tenant3];
  const leases = [];

  for (let i = 0; i < occupiedSpaces.length && i < tenants.length * 20; i++) {
    const space = occupiedSpaces[i];
    const tenant = tenants[i % tenants.length];

    const daysAgo = Math.floor(Math.random() * 540);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    const lease = await prisma.lease.create({
      data: {
        startDate,
        endDate,
        monthlyRent: space.rent || 1500,
        securityDeposit: space.deposit || 1500,
        status: 'ACTIVE',
        renewalTerms: space.type === 'OFFICE' ?
          'Commercial lease with triple net expenses' :
          'Standard residential lease agreement with annual renewal option',
        specialTerms: Math.random() > 0.7 ? 'Pet deposit: $200, Small pets allowed' : undefined,
        spaceId: space.id,
        propertyId: space.propertyId,
        tenantId: tenant.userId!,
        utilitiesIncluded: space.type === 'APARTMENT',
        petDeposit: Math.random() > 0.7 ? 200 : undefined,
      },
    });

    await prisma.space.update({
      where: { id: space.id },
      data: { status: 'OCCUPIED' },
    });

    leases.push(lease);
  }

  console.log(`✅ Created ${leases.length} active leases`);

  // Create corresponding ledger entries for bank transactions
  const accountMappings = [
    { description: 'Monthly Rent - Unit A01', chartAccount: chartAccounts1.find(a => a.accountCode === '4100') },
    { description: 'Monthly Rent - Unit A02', chartAccount: chartAccounts1.find(a => a.accountCode === '4100') },
    { description: 'Austin Electric Company', chartAccount: chartAccounts1.find(a => a.accountCode === '5200') },
    { description: 'Hill Country Plumbing', chartAccount: chartAccounts1.find(a => a.accountCode === '5100') },
    { description: 'Late Fee - Unit A05', chartAccount: chartAccounts1.find(a => a.accountCode === '4200') },
    { description: 'Property Insurance Co', chartAccount: chartAccounts1.find(a => a.accountCode === '5300') },
  ];

  for (let i = 0; i < bankTransactionData.length; i++) {
    const txn = bankTransactionData[i];
    const mapping = accountMappings[i];
    const isDeposit = txn.transactionType === 'DEBIT';

    // Bank account ledger entry
    await prisma.ledgerEntry.create({
      data: {
        bankLedgerId: bankAccount1Operating.id,
        chartAccountId: operatingAccount1!.id,
        transactionType: isDeposit ? 'DEBIT' : 'CREDIT',
        amount: txn.amount,
        description: txn.description,
        transactionDate: txn.transactionDate,
        entryType: 'PAYMENT',
        debitAmount: isDeposit ? txn.amount : 0,
        creditAmount: isDeposit ? 0 : txn.amount,
        referenceNumber: txn.referenceNumber,
        createdById: entityManager.id,
      },
    });

    // Corresponding chart account entry
    if (mapping.chartAccount) {
      await prisma.ledgerEntry.create({
        data: {
          bankLedgerId: bankAccount1Operating.id,
          chartAccountId: mapping.chartAccount.id,
          transactionType: isDeposit ? 'CREDIT' : 'DEBIT',
          amount: txn.amount,
          description: txn.description,
          transactionDate: txn.transactionDate,
          entryType: 'PAYMENT',
          debitAmount: isDeposit ? 0 : txn.amount,
          creditAmount: isDeposit ? txn.amount : 0,
          referenceNumber: txn.referenceNumber,
          createdById: entityManager.id,
        },
      });
    }
  }

  console.log('✅ Created ledger entries');

  // Create vendors
  const vendors = [];
  const vendorData = [
    { name: 'Austin HVAC Solutions', type: 'HVAC', contact: 'John Smith', phone: '(512) 555-2001', email: 'john@austinhvac.com' },
    { name: 'Hill Country Plumbing', type: 'Plumbing', contact: 'Maria Lopez', phone: '(512) 555-2002', email: 'maria@hillcountryplumbing.com' },
    { name: 'Texas Electrical Services', type: 'Electrical', contact: 'Robert Taylor', phone: '(512) 555-2003', email: 'robert@texaselectrical.com' },
    { name: 'Austin Appliance Repair', type: 'Appliance', contact: 'Jennifer Davis', phone: '(512) 555-2004', email: 'jennifer@appliancerepair.com' },
    { name: 'Lone Star Landscaping', type: 'Landscaping', contact: 'Carlos Rodriguez', phone: '(512) 555-2005', email: 'carlos@lonestarlandscape.com' },
    { name: 'Clean Pro Services', type: 'Cleaning', contact: 'Sarah Williams', phone: '(512) 555-2006', email: 'sarah@cleanpro.com' },
  ];

  for (const vendorInfo of vendorData) {
    const vendor = await prisma.vendor.create({
      data: {
        name: vendorInfo.name,
        vendorType: vendorInfo.type,
        contactName: vendorInfo.contact,
        phone: vendorInfo.phone,
        email: vendorInfo.email,
        address: `${Math.floor(Math.random() * 9999) + 1000} Business Dr, Austin, TX 787${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`,
        isInsured: true,
        entityId: entity1.id,
        description: `Professional ${vendorInfo.type.toLowerCase()} services`,
      },
    });
    vendors.push(vendor);
  }

  console.log('✅ Created vendors');

  // Create sample maintenance requests
  const maintenanceRequests = [];
  const occupiedSpacesForMaintenance = occupiedSpaces.slice(0, 8);

  for (let i = 0; i < occupiedSpacesForMaintenance.length; i++) {
    const space = occupiedSpacesForMaintenance[i];
    const tenant = tenants[i % tenants.length];
    const vendor = vendors[i % vendors.length];

    const request = await prisma.maintenanceRequest.create({
      data: {
        propertyId: space.propertyId,
        spaceId: space.id,
        tenantId: tenant.userId!,
        title: `${['HVAC Repair', 'Plumbing Issue', 'Electrical Problem', 'Appliance Repair'][i % 4]} - ${space.name}`,
        description: `Tenant reported issue requiring professional attention in ${space.name}`,
        priority: ['LOW', 'MEDIUM', 'HIGH'][i % 3] as any,
        status: i < 4 ? 'COMPLETED' : 'IN_PROGRESS',
        estimatedCost: 200 + (i * 50),
        actualCost: i < 4 ? 200 + (i * 50) : undefined,
        requestedAt: new Date(Date.now() - (i * 86400000)),
        completedAt: i < 4 ? new Date(Date.now() - ((i - 2) * 86400000)) : undefined,
      },
    });

    await prisma.maintenanceAssignment.create({
      data: {
        maintenanceReqId: request.id,
        vendorId: vendor.id,
        assignedUserId: maintenanceStaff.id,
        scheduledDate: new Date(Date.now() + (86400000 * (i + 1))),
        status: i < 4 ? 'COMPLETED' : 'ASSIGNED',
        completedAt: i < 4 ? new Date() : undefined,
        cost: i < 4 ? 200 + (i * 50) : undefined,
      },
    });

    maintenanceRequests.push(request);
  }

  console.log(`✅ Created ${maintenanceRequests.length} maintenance requests`);

  // Create sample payments
  const samplePayments = [];

  for (let i = 0; i < 5; i++) {
    const lease = leases[i % leases.length];

    const property = await prisma.property.findUnique({
      where: { id: lease.propertyId }
    });

    if (!property) continue;

    const payment = await prisma.payment.create({
      data: {
        amount: lease.monthlyRent,
        paymentDate: new Date(Date.now() - (i * 86400000 * 7)),
        paymentMethod: 'MANUAL',
        paymentType: ['CHECK', 'ACH', 'CASH'][i % 3] as any,
        status: 'COMPLETED',
        processingStatus: 'CLEARED',
        payerName: `${tenants[i % tenants.length].firstName} ${tenants[i % tenants.length].lastName}`,
        paymentNumber: `PAY-${Date.now()}-${i}`,
        referenceNumber: `${i % 2 === 0 ? 'CHECK' : 'ACH'}-${1000 + i}`,
        memo: `Rent payment for lease ${lease.id}`,
        entityId: property.entityId,
        bankLedgerId: property.entityId === entity1.id ? bankAccount1Operating.id : bankAccount2.id,
        isDeposited: true,
        depositDate: new Date(Date.now() - (i * 86400000 * 7)),
        receivedDate: new Date(Date.now() - (i * 86400000 * 7)),
      },
    });
    samplePayments.push(payment);
  }

  console.log(`✅ Created ${samplePayments.length} sample payments`);

  // Calculate summary statistics
  const totalSpaces = spaces.length;
  const totalLeases = leases.length;
  const occupancyRate = Math.round((totalLeases / totalSpaces) * 100);
  const totalMonthlyRevenue = leases.reduce((sum, lease) => sum + Number(lease.monthlyRent), 0);
  const totalAnnualRevenue = totalMonthlyRevenue * 12;

  console.log('\n🎉 Database seeding completed successfully!');

  console.log('\n📊 Portfolio Summary:');
  console.log(`   • Organization: ${organization.name}`);
  console.log(`   • Entities: 2 (${entity1.name}, ${entity2.name})`);
  console.log(`   • Properties: 3 (2 residential, 1 commercial)`);
  console.log(`   • Total Spaces: ${totalSpaces}`);
  console.log(`   • Occupied Spaces: ${totalLeases}`);
  console.log(`   • Occupancy Rate: ${occupancyRate}%`);
  console.log(`   • Monthly Revenue: $${totalMonthlyRevenue.toLocaleString()}`);
  console.log(`   • Annual Revenue: $${totalAnnualRevenue.toLocaleString()}`);
  console.log(`   • Bank Transactions: ${bankTransactionData.length} transactions`);
  console.log(`   • Ledger Entries: ${bankTransactionData.length * 2} entries`);
  console.log(`   • Maintenance Requests: ${maintenanceRequests.length}`);
  console.log(`   • Sample Payments: ${samplePayments.length}`);

  console.log('\n🔑 Demo Login Credentials (Password: Austin2024!):');
  console.log(`   • Super Admin: ${superAdmin.email}`);
  console.log(`   • Org Admin: ${orgAdmin.email}`);
  console.log(`   • Entity Manager: ${entityManager.email}`);
  console.log(`   • Property Manager: ${propertyManager.email}`);
  console.log(`   • Accountant: ${accountant.email}`);
  console.log(`   • Maintenance: ${maintenanceStaff.email}`);

  console.log('\n🏦 Banking Data:');
  console.log('   • 3 bank accounts with proper chart account mapping');
  console.log('   • 1 bank statement with 6 transactions');
  console.log('   • 6 bank transactions for check register testing');
  console.log('   • 12 corresponding ledger entries (double-entry bookkeeping)');
  console.log('   • Final balance: $46,904.33');

  console.log('\n🚀 Complete dataset ready for all API testing!');
}

main()
  .catch((e) => {
    console.error('⚠ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });