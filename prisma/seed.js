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

    // Create maintenance user
    const maintenanceUser = await prisma.user.upsert({
        where: { email: 'maintenance@demoproperties.com' },
        update: {},
        create: {
            email: 'maintenance@demoproperties.com',
            passwordHash: hashedPassword,
            firstName: 'Mike',
            lastName: 'Maintenance',
            phone: '+1-555-0202',
            role: 'MAINTENANCE',
            status: 'ACTIVE',
            organizationId: organization.id,
        },
    });

    console.log('✅ Created maintenance user:', maintenanceUser.email);

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

    // Create some rent payments for the lease
    const rentPayments = [];
    for (let i = 0; i < 3; i++) {
        const paymentDate = new Date();
        paymentDate.setMonth(paymentDate.getMonth() - i);

        const periodStart = new Date(paymentDate);
        periodStart.setDate(1); // First day of month

        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0); // Last day of month

        const refNumber = `PAY-${Date.now()}-${i}`;

        const existingPayment = await prisma.rentPayment.findFirst({
            where: { referenceNumber: refNumber }
        });

        if (!existingPayment) {
            const rentPayment = await prisma.rentPayment.create({
                data: {
                    leaseId: lease.id,
                    amount: 1500.00,
                    paymentDate,
                    periodStart,
                    periodEnd,
                    paymentMethod: 'ONLINE',
                    status: 'COMPLETED',
                    referenceNumber: refNumber,
                    notes: `Monthly rent payment for ${periodStart.toLocaleDateString()}`,
                },
            });
            rentPayments.push(rentPayment);
        }
    }

    console.log('✅ Created rent payment records');

    // Create a second tenant and lease for demo
    const tenant2 = await prisma.user.upsert({
        where: { email: 'tenant2@example.com' },
        update: {},
        create: {
            email: 'tenant2@example.com',
            passwordHash: hashedPassword,
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '+1-555-0301',
            role: 'TENANT',
            status: 'ACTIVE',
            organizationId: organization.id,
        },
    });

    // Create second lease for unit A2
    const startDate2 = new Date();
    startDate2.setMonth(startDate2.getMonth() - 6); // Started 6 months ago
    const endDate2 = new Date();
    endDate2.setFullYear(endDate2.getFullYear() + 1);

    const lease2 = await prisma.lease.upsert({
        where: { id: 'demo-lease-2-id' },
        update: {},
        create: {
            id: 'demo-lease-2-id',
            spaceId: spaces[1].id, // Unit A2
            tenantId: tenant2.id,
            startDate: startDate2,
            endDate: endDate2,
            monthlyRent: 1600.00,
            securityDeposit: 1600.00,
            status: 'ACTIVE',
            leaseTerms: 'Standard 18-month residential lease agreement',
            nnnExpenses: 175.00,
            utilitiesIncluded: true,
        },
    });

    console.log('✅ Created second lease for unit A2');

    // Check if rent increase already exists
    const existingRentIncrease = await prisma.rentIncrease.findFirst({
        where: { leaseId: lease2.id }
    });

    if (!existingRentIncrease) {
        const rentIncrease = await prisma.rentIncrease.create({
            data: {
                leaseId: lease2.id,
                previousRent: 1550.00,
                newRent: 1600.00,
                increaseAmount: 50.00,
                increasePercent: 3.23,
                effectiveDate: new Date(),
                reason: 'Annual rent increase per lease agreement',
            },
        });
        console.log('✅ Created rent increase record');
    }

    // Create chart of accounts for the entity first
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

    // Create some invoices for the leases
    const invoice1 = await prisma.invoice.upsert({
        where: { invoiceNumber: 'INV-2024-001' },
        update: {},
        create: {
            leaseId: lease.id,
            invoiceNumber: 'INV-2024-001',
            invoiceType: 'RENT',
            amount: 1500.00,
            dueDate: new Date(),
            status: 'SENT',
            description: 'Monthly rent for January 2024',
            notes: 'Payment due by the 1st of the month',
        },
    });

    const invoice2 = await prisma.invoice.upsert({
        where: { invoiceNumber: 'INV-2024-002' },
        update: {},
        create: {
            leaseId: lease2.id,
            invoiceNumber: 'INV-2024-002',
            invoiceType: 'RENT',
            amount: 1600.00,
            dueDate: new Date(),
            status: 'SENT',
            description: 'Monthly rent for January 2024',
            notes: 'Payment due by the 1st of the month',
        },
    });

    console.log('✅ Created 2 demo invoices');

    // Create a payment for the first invoice
    const existingPayment = await prisma.payment.findFirst({
        where: { referenceNumber: 'PAY-2024-001' }
    });

    if (!existingPayment) {
        const payment1 = await prisma.payment.create({
            data: {
                invoiceId: invoice1.id,
                amount: 1500.00,
                paymentDate: new Date(),
                paymentMethod: 'ONLINE',
                status: 'COMPLETED',
                referenceNumber: 'PAY-2024-001',
                notes: 'Online payment via tenant portal',
            },
        });

        // Update the invoice status to PAID
        await prisma.invoice.update({
            where: { id: invoice1.id },
            data: { status: 'PAID' },
        });

        console.log('✅ Created payment and marked invoice as paid');
    }

    // Create ledger entries
    const cashAccount = await prisma.chartOfAccount.findFirst({
        where: { entityId: entity.id, accountCode: '1000' },
    });

    const rentalIncomeAccount = await prisma.chartOfAccount.findFirst({
        where: { entityId: entity.id, accountCode: '4000' },
    });

    const maintenanceAccount = await prisma.chartOfAccount.findFirst({
        where: { entityId: entity.id, accountCode: '5000' },
    });

    if (cashAccount && rentalIncomeAccount && bankLedger) {
        // Check if ledger entry already exists
        const existingLedgerEntry = await prisma.ledgerEntry.findFirst({
            where: { referenceNumber: 'PAY-2024-001' }
        });

        if (!existingLedgerEntry) {
            const ledgerEntry1 = await prisma.ledgerEntry.create({
                data: {
                    bankLedgerId: bankLedger.id,
                    chartAccountId: rentalIncomeAccount.id,
                    transactionType: 'CREDIT',
                    amount: 1500.00,
                    description: 'Rent payment from John Tenant - Unit A1',
                    referenceNumber: 'PAY-2024-001',
                    transactionDate: new Date(),
                    reconciled: false,
                    createdById: superAdmin.id,
                },
            });
        }

        if (maintenanceAccount) {
            const existingMaintenanceEntry = await prisma.ledgerEntry.findFirst({
                where: { referenceNumber: 'MAINT-001' }
            });

            if (!existingMaintenanceEntry) {
                const ledgerEntry2 = await prisma.ledgerEntry.create({
                    data: {
                        bankLedgerId: bankLedger.id,
                        chartAccountId: maintenanceAccount.id,
                        transactionType: 'DEBIT',
                        amount: 250.00,
                        description: 'HVAC repair for Unit A2',
                        referenceNumber: 'MAINT-001',
                        transactionDate: new Date(),
                        reconciled: false,
                        createdById: superAdmin.id,
                    },
                });
            }
        }

        console.log('✅ Created ledger entries for income and expenses');
    }

    // Create demo vendors
    const hvacVendor = await prisma.vendor.upsert({
        where: { id: 'demo-hvac-vendor-id' },
        update: {},
        create: {
            id: 'demo-hvac-vendor-id',
            name: 'ABC HVAC Services',
            description: 'Professional heating, ventilation, and air conditioning services',
            vendorType: 'HVAC',
            contactName: 'Mike Johnson',
            phone: '+1-555-0400',
            email: 'mike@abchvac.com',
            address: '789 Service Street, Demo City, DC 12345',
            licenseNumber: 'HVAC-12345',
            isInsured: true,
            isActive: true,
            entityId: entity.id,
        },
    });

    const plumbingVendor = await prisma.vendor.upsert({
        where: { id: 'demo-plumbing-vendor-id' },
        update: {},
        create: {
            id: 'demo-plumbing-vendor-id',
            name: 'Quick Fix Plumbing',
            description: 'Emergency and routine plumbing services',
            vendorType: 'Plumbing',
            contactName: 'Sarah Wilson',
            phone: '+1-555-0401',
            email: 'sarah@quickfixplumbing.com',
            address: '456 Repair Ave, Demo City, DC 12345',
            licenseNumber: 'PLB-67890',
            isInsured: true,
            isActive: true,
            entityId: entity.id,
        },
    });

    const electricalVendor = await prisma.vendor.upsert({
        where: { id: 'demo-electrical-vendor-id' },
        update: {},
        create: {
            id: 'demo-electrical-vendor-id',
            name: 'Bright Spark Electric',
            description: 'Licensed electrical contractors for residential and commercial',
            vendorType: 'Electrical',
            contactName: 'Tom Rodriguez',
            phone: '+1-555-0402',
            email: 'tom@brightspark.com',
            address: '321 Electric Ave, Demo City, DC 12345',
            licenseNumber: 'ELE-54321',
            isInsured: true,
            isActive: true,
            entityId: entity.id,
        },
    });

    console.log('✅ Created 3 demo vendors');

    // Create demo maintenance requests
    const maintenanceRequest1 = await prisma.maintenanceRequest.upsert({
        where: { id: 'demo-maintenance-1-id' },
        update: {},
        create: {
            id: 'demo-maintenance-1-id',
            propertyId: property.id,
            spaceId: spaces[0].id, // Unit A1
            tenantId: tenant.id,
            title: 'Air conditioning not cooling properly',
            description: 'The AC unit in the living room is not cooling effectively. Temperature stays around 78 degrees even when set to 72.',
            priority: 'HIGH',
            status: 'OPEN',
            estimatedCost: 150.00,
        },
    });

    const maintenanceRequest2 = await prisma.maintenanceRequest.upsert({
        where: { id: 'demo-maintenance-2-id' },
        update: {},
        create: {
            id: 'demo-maintenance-2-id',
            propertyId: property.id,
            spaceId: spaces[1].id, // Unit A2
            tenantId: tenant2.id,
            title: 'Kitchen faucet leaking',
            description: 'The kitchen faucet has been dripping constantly for the past week. Appears to be coming from the base.',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            estimatedCost: 75.00,
        },
    });

    const maintenanceRequest3 = await prisma.maintenanceRequest.upsert({
        where: { id: 'demo-maintenance-3-id' },
        update: {},
        create: {
            id: 'demo-maintenance-3-id',
            propertyId: property.id,
            spaceId: spaces[2].id, // Unit A3
            tenantId: tenant.id, // Same tenant for demo
            title: 'Toilet running continuously',
            description: 'Toilet in the main bathroom runs continuously and won\'t stop filling.',
            priority: 'LOW',
            status: 'COMPLETED',
            estimatedCost: 50.00,
            actualCost: 45.00,
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
    });

    const maintenanceRequest4 = await prisma.maintenanceRequest.upsert({
        where: { id: 'demo-maintenance-4-id' },
        update: {},
        create: {
            id: 'demo-maintenance-4-id',
            propertyId: property.id,
            spaceId: spaces[3].id, // Unit A4
            tenantId: tenant2.id,
            title: 'Electrical outlet not working in bedroom',
            description: 'The outlet near the bed stopped working yesterday. No power to any devices plugged in.',
            priority: 'EMERGENCY',
            status: 'OPEN',
            estimatedCost: 100.00,
        },
    });

    console.log('✅ Created 4 demo maintenance requests');

    // Create maintenance assignments
    const assignment1 = await prisma.maintenanceAssignment.upsert({
        where: { id: 'demo-assignment-1-id' },
        update: {},
        create: {
            id: 'demo-assignment-1-id',
            maintenanceReqId: maintenanceRequest1.id,
            vendorId: hvacVendor.id,
            scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            notes: 'Assigned to HVAC specialist for AC diagnosis and repair',
        },
    });

    const assignment2 = await prisma.maintenanceAssignment.upsert({
        where: { id: 'demo-assignment-2-id' },
        update: {},
        create: {
            id: 'demo-assignment-2-id',
            maintenanceReqId: maintenanceRequest2.id,
            vendorId: plumbingVendor.id,
            scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
            notes: 'Plumber scheduled to repair kitchen faucet leak',
        },
    });

    const assignment3 = await prisma.maintenanceAssignment.upsert({
        where: { id: 'demo-assignment-3-id' },
        update: {},
        create: {
            id: 'demo-assignment-3-id',
            maintenanceReqId: maintenanceRequest3.id,
            vendorId: plumbingVendor.id,
            completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            cost: 45.00,
            notes: 'Replaced toilet flapper valve. Issue resolved.',
        },
    });

    const assignment4 = await prisma.maintenanceAssignment.upsert({
        where: { id: 'demo-assignment-4-id' },
        update: {},
        create: {
            id: 'demo-assignment-4-id',
            maintenanceReqId: maintenanceRequest4.id,
            vendorId: electricalVendor.id,
            scheduledDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now (emergency)
            notes: 'Emergency electrical repair - priority assignment',
        },
    });

    console.log('✅ Created 4 maintenance assignments');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📋 Demo Accounts Created:');
    console.log('Super Admin: admin@demoproperties.com / admin123');
    console.log('Org Admin: orgadmin@demoproperties.com / admin123');
    console.log('Entity Manager: manager@sunsetproperties.com / admin123');
    console.log('Maintenance User: maintenance@demoproperties.com / admin123');
    console.log('Tenant 1: tenant@example.com / admin123');
    console.log('Tenant 2: tenant2@example.com / admin123');
    console.log('\n📊 Demo Data Created:');
    console.log('- 1 Organization with 1 Entity');
    console.log('- 1 Property with 4 Units');
    console.log('- 2 Active Leases');
    console.log('- 3 Vendors (HVAC, Plumbing, Electrical)');
    console.log('- 4 Maintenance Requests with Assignments');
    console.log('- Financial records (invoices, payments, ledger entries)');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });