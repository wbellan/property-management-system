// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create demo organization
    const organization = await prisma.organization.upsert({
        where: { id: 'demo-org-id' },
        update: {},
        create: {
            id: 'demo-org-id',
            name: 'Demo Property Management Co.',
            description: 'A demo property management company for testing',
            address: '123 Main Street, Demo City, DC 12345',
            phone: '+1-555-0123',
            email: 'contact@demoproperties.com',
            website: 'https://demoproperties.com',
        },
    });

    console.log('✅ Created organization:', organization.name);

    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@demoproperties.com' },
        update: {},
        create: {
            email: 'admin@demoproperties.com',
            passwordHash: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            phone: '+1-555-0100',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            organizationId: organization.id,
        },
    });

    console.log('✅ Created super admin:', superAdmin.email);

    // Create org admin user
    const orgAdmin = await prisma.user.upsert({
        where: { email: 'orgadmin@demoproperties.com' },
        update: {},
        create: {
            email: 'orgadmin@demoproperties.com',
            passwordHash: hashedPassword,
            firstName: 'Org',
            lastName: 'Admin',
            phone: '+1-555-0101',
            role: 'ORG_ADMIN',
            status: 'ACTIVE',
            organizationId: organization.id,
        },
    });

    console.log('✅ Created org admin:', orgAdmin.email);

    // Create demo entity (property owner)
    const entity = await prisma.entity.upsert({
        where: { id: 'demo-entity-id' },
        update: {},
        create: {
            id: 'demo-entity-id',
            name: 'Sunset Properties LLC',
            legalName: 'Sunset Properties Limited Liability Company',
            entityType: 'LLC',
            taxId: '12-3456789',
            address: '456 Business Ave, Demo City, DC 12345',
            phone: '+1-555-0200',
            email: 'info@sunsetproperties.com',
            organizationId: organization.id,
        },
    });

    console.log('✅ Created entity:', entity.name);

    // Create entity manager user
    const entityManager = await prisma.user.upsert({
        where: { email: 'manager@sunsetproperties.com' },
        update: {},
        create: {
            email: 'manager@sunsetproperties.com',
            passwordHash: hashedPassword,
            firstName: 'Entity',
            lastName: 'Manager',
            phone: '+1-555-0201',
            role: 'ENTITY_MANAGER',
            status: 'ACTIVE',
            organizationId: organization.id,
        },
    });

    // Link entity manager to entity
    await prisma.userEntity.upsert({
        where: {
            userId_entityId: {
                userId: entityManager.id,
                entityId: entity.id,
            },
        },
        update: {},
        create: {
            userId: entityManager.id,
            entityId: entity.id,
        },
    });

    console.log('✅ Created entity manager:', entityManager.email);

    // Create demo property
    const property = await prisma.property.upsert({
        where: { id: 'demo-property-id' },
        update: {},
        create: {
            id: 'demo-property-id',
            name: 'Sunset Apartments',
            address: '789 Residential Lane',
            city: 'Demo City',
            state: 'DC',
            zipCode: '12345',
            propertyType: 'Residential',
            totalUnits: 12,
            yearBuilt: 2020,
            squareFeet: 15000,
            description: 'Modern apartment complex with 12 units',
            entityId: entity.id,
        },
    });

    console.log('✅ Created property:', property.name);

    // Create demo spaces (units)
    const spaces = [];
    for (let i = 1; i <= 4; i++) {
        const space = await prisma.space.upsert({
            where: {
                propertyId_unitNumber: {
                    propertyId: property.id,
                    unitNumber: `A${i}`,
                },
            },
            update: {},
            create: {
                unitNumber: `A${i}`,
                floor: 1,
                spaceType: 'Apartment',
                bedrooms: 2,
                bathrooms: 1.5,
                squareFeet: 1000,
                description: `2-bedroom, 1.5-bathroom apartment unit A${i}`,
                propertyId: property.id,
            },
        });
        spaces.push(space);
    }

    console.log('✅ Created 4 apartment units');

    // Create demo tenant
    const tenant = await prisma.user.upsert({
        where: { email: 'tenant@example.com' },
        update: {},
        create: {
            email: 'tenant@example.com',
            passwordHash: hashedPassword,
            firstName: 'John',
            lastName: 'Tenant',
            phone: '+1-555-0300',
            role: 'TENANT',
            status: 'ACTIVE',
            organizationId: organization.id,
        },
    });

    console.log('✅ Created tenant:', tenant.email);

    // Create demo lease
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year lease

    const lease = await prisma.lease.upsert({
        where: { id: 'demo-lease-id' },
        update: {},
        create: {
            id: 'demo-lease-id',
            spaceId: spaces[0].id,
            tenantId: tenant.id,
            startDate,
            endDate,
            monthlyRent: 1500.00,
            securityDeposit: 1500.00,
            status: 'ACTIVE',
            leaseTerms: 'Standard 12-month residential lease agreement',
            nnnExpenses: 150.00,
            utilitiesIncluded: false,
        },
    });

    console.log('✅ Created lease for unit A1');

    // Create chart of accounts for the entity
    const chartAccounts = [
        { accountCode: '1000', accountName: 'Cash - Operating', accountType: 'Asset' },
        { accountCode: '1100', accountName: 'Accounts Receivable', accountType: 'Asset' },
        { accountCode: '1200', accountName: 'Security Deposits Held', accountType: 'Asset' },
        { accountCode: '2000', accountName: 'Accounts Payable', accountType: 'Liability' },
        { accountCode: '2100', accountName: 'Security Deposits Payable', accountType: 'Liability' },
        { accountCode: '3000', accountName: 'Owner Equity', accountType: 'Equity' },
        { accountCode: '4000', accountName: 'Rental Income', accountType: 'Revenue' },
        { accountCode: '4100', accountName: 'Late Fee Income', accountType: 'Revenue' },
        { accountCode: '5000', accountName: 'Maintenance Expense', accountType: 'Expense' },
        { accountCode: '5100', accountName: 'Utilities Expense', accountType: 'Expense' },
        { accountCode: '5200', accountName: 'Insurance Expense', accountType: 'Expense' },
        { accountCode: '5300', accountName: 'Property Tax Expense', accountType: 'Expense' },
    ];

    for (const account of chartAccounts) {
        await prisma.chartOfAccount.upsert({
            where: {
                entityId_accountCode: {
                    entityId: entity.id,
                    accountCode: account.accountCode,
                },
            },
            update: {},
            create: {
                ...account,
                entityId: entity.id,
                description: `${account.accountName} account`,
            },
        });
    }

    console.log('✅ Created chart of accounts');

    // Create demo bank ledger
    const bankLedger = await prisma.bankLedger.upsert({
        where: { id: 'demo-bank-ledger-id' },
        update: {},
        create: {
            id: 'demo-bank-ledger-id',
            accountName: 'Operating Account',
            accountNumber: '****1234',
            bankName: 'Demo Bank',
            accountType: 'Checking',
            currentBalance: 25000.00,
            entityId: entity.id,
        },
    });

    console.log('✅ Created bank ledger');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📋 Demo Accounts Created:');
    console.log('Super Admin: admin@demoproperties.com / admin123');
    console.log('Org Admin: orgadmin@demoproperties.com / admin123');
    console.log('Entity Manager: manager@sunsetproperties.com / admin123');
    console.log('Tenant: tenant@example.com / admin123');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });