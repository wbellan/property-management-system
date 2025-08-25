// prisma/seed.ts - Updated for enhanced schema
import { PrismaClient, UserRole, UserStatus, LeaseStatus, MaintenanceStatus, MaintenancePriority, InvoiceStatus, InvoiceType, PaymentMethod, PaymentStatus, ExpenseType, PropertyType, SpaceType, SpaceStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seed...');

    // Clear existing data in correct order (children first, then parents)
    console.log('Clearing existing data...');

    // Level 1: Delete records with no dependencies
    await prisma.rentPayment.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.maintenanceAssignment.deleteMany();
    await prisma.propertyExpense.deleteMany();
    await prisma.ledgerEntry.deleteMany();
    await prisma.rentIncrease.deleteMany();
    await prisma.leaseRenewal.deleteMany();

    // Level 2: Delete new image tables
    await prisma.propertyImage.deleteMany();
    await prisma.spaceImage.deleteMany();

    // Level 3: Delete records that depend on Level 1
    await prisma.invoice.deleteMany();
    await prisma.maintenanceRequest.deleteMany();
    await prisma.lease.deleteMany();

    // Level 4: Delete records that depend on Level 2
    await prisma.tenant.deleteMany();
    await prisma.space.deleteMany();

    // Level 5: Delete junction tables
    await prisma.userProperty.deleteMany();
    await prisma.userEntity.deleteMany();

    // Level 6: Delete user invitations BEFORE users (since they reference users)
    await prisma.userInvitation.deleteMany();

    // Level 7: Delete users (now safe to delete)
    await prisma.user.deleteMany();

    // Level 8: Delete other entities
    await prisma.vendor.deleteMany();
    await prisma.property.deleteMany();
    await prisma.bankLedger.deleteMany();
    await prisma.chartOfAccount.deleteMany();
    await prisma.entity.deleteMany();
    await prisma.organization.deleteMany();

    console.log('Database cleared successfully');

    // Create organization
    const organization = await prisma.organization.create({
        data: {
            name: 'Austin Property Holdings',
            description: 'Professional property management company',
            address: '1500 South Lamar Blvd, Austin, TX 78704',
            phone: '(512) 555-0100',
            email: 'info@austinpropertyholdings.com',
            website: 'https://austinpropertyholdings.com'
        }
    });

    console.log('✅ Created organization:', organization.name);

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
            organizationId: organization.id
        }
    });

    const entity2 = await prisma.entity.create({
        data: {
            name: 'Cedar Park Holdings Inc',
            legalName: 'Cedar Park Holdings Incorporated',
            entityType: 'Corporation',
            taxId: '98-7654321',
            address: '1890 Ranch Shopping Center, Cedar Park, TX 78613',
            phone: '(512) 555-0300',
            email: 'info@cedarparkholdings.com',
            organizationId: organization.id
        }
    });

    console.log('✅ Created entities');

    // Create users with proper password hashing
    const hashedPassword = await bcrypt.hash('Austin2024!', 12);

    const superAdmin = await prisma.user.create({
        data: {
            email: 'admin@austinpropertyholdings.com',
            passwordHash: hashedPassword,
            firstName: 'Sarah',
            lastName: 'Johnson',
            phone: '(512) 555-0101',
            role: UserRole.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
            organizationId: organization.id,
            emailVerified: true
        }
    });

    const orgAdmin = await prisma.user.create({
        data: {
            email: 'operations@austinpropertyholdings.com',
            passwordHash: hashedPassword,
            firstName: 'Michael',
            lastName: 'Chen',
            phone: '(512) 555-0102',
            role: UserRole.ORG_ADMIN,
            status: UserStatus.ACTIVE,
            organizationId: organization.id,
            emailVerified: true
        }
    });

    const entityManager = await prisma.user.create({
        data: {
            email: 'lakeway.manager@austinpropertyholdings.com',
            passwordHash: hashedPassword,
            firstName: 'Jennifer',
            lastName: 'Rodriguez',
            phone: '(512) 555-0103',
            role: UserRole.ENTITY_MANAGER,
            status: UserStatus.ACTIVE,
            organizationId: organization.id,
            emailVerified: true
        }
    });

    const propertyManager = await prisma.user.create({
        data: {
            email: 'property.manager@austinpropertyholdings.com',
            passwordHash: hashedPassword,
            firstName: 'Amanda',
            lastName: 'Davis',
            phone: '(512) 555-0104',
            role: UserRole.PROPERTY_MANAGER,
            status: UserStatus.ACTIVE,
            organizationId: organization.id,
            emailVerified: true
        }
    });

    const accountant = await prisma.user.create({
        data: {
            email: 'accountant@austinpropertyholdings.com',
            passwordHash: hashedPassword,
            firstName: 'David',
            lastName: 'Kim',
            phone: '(512) 555-0105',
            role: UserRole.ACCOUNTANT,
            status: UserStatus.ACTIVE,
            organizationId: organization.id,
            emailVerified: true
        }
    });

    const maintenanceStaff = await prisma.user.create({
        data: {
            email: 'maintenance@austinpropertyholdings.com',
            passwordHash: hashedPassword,
            firstName: 'Carlos',
            lastName: 'Martinez',
            phone: '(512) 555-0106',
            role: UserRole.MAINTENANCE,
            status: UserStatus.ACTIVE,
            organizationId: organization.id,
            emailVerified: true
        }
    });

    console.log('✅ Created users');

    // Link users to entities
    await prisma.userEntity.createMany({
        data: [
            { userId: entityManager.id, entityId: entity1.id },
            { userId: propertyManager.id, entityId: entity1.id },
            { userId: propertyManager.id, entityId: entity2.id },
            { userId: accountant.id, entityId: entity1.id },
            { userId: accountant.id, entityId: entity2.id }
        ]
    });

    console.log('✅ Created user-entity relationships');

    // Create properties with enhanced schema
    const property1 = await prisma.property.create({
        data: {
            name: 'Lakeway Vista Apartments',
            address: '2200 Lakeway Vista Dr',
            city: 'Lakeway',
            state: 'TX',
            zipCode: '78734',
            propertyType: PropertyType.RESIDENTIAL,  // Use enum value
            description: 'Modern apartment complex with lake views and premium amenities',
            totalSpaces: 24,  // Changed from totalUnits
            yearBuilt: 2018,
            squareFootage: 30000,  // Changed from squareFeet
            lotSize: 50000,
            purchasePrice: 4200000.00,
            currentMarketValue: 5500000.00,
            entityId: entity1.id
        }
    });

    const property2 = await prisma.property.create({
        data: {
            name: 'Cedar Park Commons',
            address: '1200 Cypress Creek Rd',
            city: 'Cedar Park',
            state: 'TX',
            zipCode: '78613',
            propertyType: PropertyType.RESIDENTIAL,  // Use enum value
            description: 'Family-friendly apartment community with playground and pool',
            totalSpaces: 36,  // Changed from totalUnits
            yearBuilt: 2017,
            squareFootage: 45000,  // Changed from squareFeet
            lotSize: 75000,
            purchasePrice: 6300000.00,
            currentMarketValue: 7800000.00,
            entityId: entity2.id
        }
    });

    const property3 = await prisma.property.create({
        data: {
            name: 'Austin Tech Center',
            address: '500 Downtown Plaza',
            city: 'Austin',
            state: 'TX',
            zipCode: '78701',
            propertyType: PropertyType.OFFICE,  // Use enum value
            description: 'Modern office building in downtown Austin',
            totalSpaces: 12,  // Changed from totalUnits
            yearBuilt: 2020,
            squareFootage: 25000,  // Changed from squareFeet
            lotSize: 15000,
            purchasePrice: 8500000.00,
            currentMarketValue: 9200000.00,
            entityId: entity1.id
        }
    });

    console.log('✅ Created properties');

    // Link property manager to properties
    await prisma.userProperty.createMany({
        data: [
            { userId: propertyManager.id, propertyId: property1.id },
            { userId: propertyManager.id, propertyId: property2.id },
            { userId: propertyManager.id, propertyId: property3.id }
        ]
    });

    console.log('✅ Created user-property relationships');

    // Create spaces with enhanced schema
    const spaces = [];

    // Property 1 units (Lakeway Vista - 24 units)
    for (let i = 1; i <= 24; i++) {
        const space = await prisma.space.create({
            data: {
                name: `Unit A${i.toString().padStart(2, '0')}`,
                type: SpaceType.APARTMENT,
                status: SpaceStatus.AVAILABLE,
                floorNumber: Math.ceil(i / 8),
                bedrooms: i <= 8 ? 1 : i <= 16 ? 2 : 3,
                bathrooms: i <= 8 ? 1.0 : 2.0,
                squareFootage: i <= 8 ? 650 : i <= 16 ? 950 : 1250,
                rent: i <= 8 ? 1400 : i <= 16 ? 1800 : 2200,
                deposit: i <= 8 ? 1400 : i <= 16 ? 1800 : 2200,
                description: `${i <= 8 ? 1 : i <= 16 ? 2 : 3} bedroom apartment with modern finishes`,
                property: {
                    connect: { id: property1.id }
                }
            }
        });
        spaces.push(space);
    }

    // Property 2 units (Cedar Park - 36 units)
    for (let i = 1; i <= 36; i++) {
        const space = await prisma.space.create({
            data: {
                name: `Unit B${i.toString().padStart(2, '0')}`,
                type: SpaceType.APARTMENT,
                status: SpaceStatus.AVAILABLE,
                floorNumber: Math.ceil(i / 12),
                bedrooms: i <= 12 ? 1 : i <= 24 ? 2 : 3,
                bathrooms: i <= 12 ? 1.0 : 2.0,
                squareFootage: i <= 12 ? 700 : i <= 24 ? 1000 : 1300,
                rent: i <= 12 ? 1500 : i <= 24 ? 1900 : 2300,
                deposit: i <= 12 ? 1500 : i <= 24 ? 1900 : 2300,
                description: `${i <= 12 ? 1 : i <= 24 ? 2 : 3} bedroom family apartment`,
                property: {
                    connect: { id: property2.id }
                }
            }
        });
        spaces.push(space);
    }

    // Property 3 spaces (Austin Tech Center - 12 office suites)
    for (let i = 1; i <= 12; i++) {
        const space = await prisma.space.create({
            data: {
                name: `Suite ${i.toString().padStart(2, '0')}`,
                type: SpaceType.OFFICE,
                status: SpaceStatus.AVAILABLE,
                floorNumber: Math.ceil(i / 6),
                bedrooms: null,
                bathrooms: 1.0,
                squareFootage: 800 + (i * 200),
                rent: 2500 + (i * 200),
                deposit: 2500 + (i * 200),
                description: `Professional office suite with downtown views`,
                property: {
                    connect: { id: property3.id }
                }
            }
        });
        spaces.push(space);
    }

    console.log(`✅ Created ${spaces.length} spaces`);

    // Create tenants
    const tenants = [];
    const tenantUsers = [
        { firstName: 'James', lastName: 'Anderson', email: 'james.anderson@email.com', income: 5200 },
        { firstName: 'Emily', lastName: 'Wilson', email: 'emily.wilson@email.com', income: 4800 },
        { firstName: 'Robert', lastName: 'Garcia', email: 'robert.garcia@email.com', income: 6200 },
        { firstName: 'Sarah', lastName: 'Brown', email: 'sarah.brown@email.com', income: 5500 },
        { firstName: 'Michael', lastName: 'Davis', email: 'michael.davis@email.com', income: 7200 },
        { firstName: 'Jessica', lastName: 'Taylor', email: 'jessica.taylor@email.com', income: 4500 },
        { firstName: 'Christopher', lastName: 'Miller', email: 'christopher.miller@email.com', income: 8500 },
        { firstName: 'Ashley', lastName: 'Jones', email: 'ashley.jones@email.com', income: 6800 },
        { firstName: 'Matthew', lastName: 'Williams', email: 'matthew.williams@email.com', income: 5900 },
        { firstName: 'Amanda', lastName: 'Johnson', email: 'amanda.johnson@email.com', income: 7500 }
    ];

    for (const tenantData of tenantUsers) {
        const tenantUser = await prisma.user.create({
            data: {
                email: tenantData.email,
                passwordHash: hashedPassword,
                firstName: tenantData.firstName,
                lastName: tenantData.lastName,
                phone: `(512) 555-${Math.floor(Math.random() * 9000) + 1000}`,
                role: UserRole.TENANT,
                status: UserStatus.ACTIVE,
                organizationId: organization.id,
                emailVerified: true
            }
        });

        const tenant = await prisma.tenant.create({
            data: {
                userId: tenantUser.id,
                firstName: tenantData.firstName,
                lastName: tenantData.lastName,
                email: tenantData.email,
                phone: tenantUser.phone!,
                emergencyContactName: `Emergency Contact for ${tenantData.firstName}`,
                emergencyContactPhone: `(512) 555-${Math.floor(Math.random() * 9000) + 1000}`,
                dateOfBirth: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                isBusinessTenant: false,
                monthlyIncome: tenantData.income,
                organizationId: organization.id
            }
        });

        tenants.push({ user: tenantUser, tenant });
    }

    console.log('✅ Created tenants');

    // Create active leases with propertyId (85% occupancy)
    const totalSpaceCount = spaces.length;
    const occupiedCount = Math.floor(totalSpaceCount * 0.85);
    const occupiedSpaces = spaces.slice(0, occupiedCount);
    const leases = [];

    for (let i = 0; i < occupiedSpaces.length && i < tenants.length; i++) {
        const space = occupiedSpaces[i];
        const tenant = tenants[i];

        // Create lease start dates over the past 2 years
        const daysAgo = Math.floor(Math.random() * 730);
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
                status: LeaseStatus.ACTIVE,
                renewalTerms: space.type === SpaceType.OFFICE ?
                    'Commercial lease with triple net expenses' :
                    'Standard residential lease agreement',
                specialTerms: space.type === SpaceType.APARTMENT && Math.random() > 0.7 ?
                    'Pet deposit: $200' : undefined,
                space: {
                    connect: { id: space.id }
                },
                property: {
                    connect: { id: space.propertyId }
                },
                tenant: {
                    connect: { id: tenant.user.id }
                }
            }
        });

        // Update space status to OCCUPIED
        await prisma.space.update({
            where: { id: space.id },
            data: { status: SpaceStatus.OCCUPIED }
        });

        leases.push(lease);
    }

    console.log(`✅ Created ${leases.length} active leases (${Math.round((leases.length / totalSpaceCount) * 100)}% occupancy)`);

    // Create some property images
    const propertyImages = [
        { propertyId: property1.id, url: '/images/properties/lakeway-exterior.jpg', filename: 'lakeway-exterior.jpg', caption: 'Lakeway Vista - Building Exterior', isPrimary: true },
        { propertyId: property1.id, url: '/images/properties/lakeway-pool.jpg', filename: 'lakeway-pool.jpg', caption: 'Lakeway Vista - Pool Area', isPrimary: false },
        { propertyId: property2.id, url: '/images/properties/cedar-park-exterior.jpg', filename: 'cedar-park-exterior.jpg', caption: 'Cedar Park Commons - Main Building', isPrimary: true },
        { propertyId: property2.id, url: '/images/properties/cedar-park-playground.jpg', filename: 'cedar-park-playground.jpg', caption: 'Cedar Park Commons - Playground', isPrimary: false },
        { propertyId: property3.id, url: '/images/properties/tech-center-exterior.jpg', filename: 'tech-center-exterior.jpg', caption: 'Austin Tech Center - Downtown Location', isPrimary: true },
    ];

    for (const imageData of propertyImages) {
        await prisma.propertyImage.create({
            data: {
                ...imageData,
                mimeType: 'image/jpeg',
                size: 1024000 + Math.floor(Math.random() * 2048000), // Random size between 1-3MB
            }
        });
    }

    console.log('✅ Created property images');

    // Continue with rest of your existing seed script...
    // (Chart of accounts, bank ledgers, vendors, maintenance, financial records, etc.)
    // Just keep the rest of your seed script as is, since those parts don't conflict with the new schema

    // Create chart of accounts for each entity
    const accountTypes = [
        { code: '1001', name: 'Operating Cash', type: 'Asset' },
        { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
        { code: '1200', name: 'Security Deposits Held', type: 'Asset' },
        { code: '1300', name: 'Prepaid Expenses', type: 'Asset' },
        { code: '2100', name: 'Security Deposits Payable', type: 'Liability' },
        { code: '2200', name: 'Accounts Payable', type: 'Liability' },
        { code: '2300', name: 'Accrued Expenses', type: 'Liability' },
        { code: '3000', name: 'Owner Equity', type: 'Equity' },
        { code: '3100', name: 'Retained Earnings', type: 'Equity' },
        { code: '4100', name: 'Rental Income', type: 'Revenue' },
        { code: '4200', name: 'Late Fees', type: 'Revenue' },
        { code: '4300', name: 'Application Fees', type: 'Revenue' },
        { code: '4400', name: 'Other Income', type: 'Revenue' },
        { code: '5100', name: 'Maintenance & Repairs', type: 'Expense' },
        { code: '5200', name: 'Utilities', type: 'Expense' },
        { code: '5300', name: 'Insurance', type: 'Expense' },
        { code: '5400', name: 'Property Taxes', type: 'Expense' },
        { code: '5500', name: 'Management Fees', type: 'Expense' },
        { code: '5600', name: 'Landscaping', type: 'Expense' }
    ];

    for (const entity of [entity1, entity2]) {
        for (const account of accountTypes) {
            await prisma.chartOfAccount.create({
                data: {
                    entityId: entity.id,
                    accountCode: account.code,
                    accountName: account.name,
                    accountType: account.type,
                    description: `${account.name} for ${entity.name}`
                }
            });
        }
    }

    console.log('✅ Created chart of accounts');

    // Create bank ledgers
    for (const entity of [entity1, entity2]) {
        await prisma.bankLedger.create({
            data: {
                entityId: entity.id,
                accountName: `${entity.name} Operating Account`,
                accountNumber: '****' + Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
                bankName: 'Austin Community Bank',
                accountType: 'Checking',
                currentBalance: 50000 + Math.random() * 100000
            }
        });

        await prisma.bankLedger.create({
            data: {
                entityId: entity.id,
                accountName: `${entity.name} Security Deposits`,
                accountNumber: '****' + Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
                bankName: 'Austin Community Bank',
                accountType: 'Savings',
                currentBalance: 25000 + Math.random() * 50000
            }
        });
    }

    console.log('✅ Created bank ledgers');

    // Create vendors
    const vendors = [];
    const vendorData = [
        { name: 'Austin HVAC Solutions', type: 'HVAC', contact: 'John Smith', phone: '(512) 555-2001' },
        { name: 'Hill Country Plumbing', type: 'Plumbing', contact: 'Maria Lopez', phone: '(512) 555-2002' },
        { name: 'Texas Electrical Services', type: 'Electrical', contact: 'Robert Taylor', phone: '(512) 555-2003' },
        { name: 'Austin Appliance Repair', type: 'Appliance', contact: 'Jennifer Davis', phone: '(512) 555-2004' },
        { name: 'Lone Star Landscaping', type: 'Landscaping', contact: 'Carlos Rodriguez', phone: '(512) 555-2005' },
        { name: 'Clean Pro Services', type: 'Cleaning', contact: 'Sarah Williams', phone: '(512) 555-2006' }
    ];

    for (const vendorInfo of vendorData) {
        const vendor = await prisma.vendor.create({
            data: {
                name: vendorInfo.name,
                vendorType: vendorInfo.type,
                contactName: vendorInfo.contact,
                phone: vendorInfo.phone,
                email: `${vendorInfo.contact.toLowerCase().replace(' ', '.')}@${vendorInfo.name.toLowerCase().replace(/\s+/g, '')}.com`,
                address: `${Math.floor(Math.random() * 9999)} Business Dr, Austin, TX 78701`,
                isInsured: true,
                entityId: entity1.id
            }
        });
        vendors.push(vendor);
    }

    console.log('✅ Created vendors');

    // Calculate and display summary statistics
    const finalTotalSpaces = spaces.length;
    const totalLeases = leases.length;
    const occupancyRate = Math.round((totalLeases / finalTotalSpaces) * 100);
    const totalMonthlyRevenue = leases.reduce((sum, lease) => sum + Number(lease.monthlyRent), 0);
    const totalAnnualRevenue = totalMonthlyRevenue * 12;

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Portfolio Summary:');
    console.log(`   • Organization: ${organization.name}`);
    console.log(`   • Entities: ${[entity1, entity2].length}`);
    console.log(`   • Properties: ${[property1, property2, property3].length}`);
    console.log(`   • Total Units: ${finalTotalSpaces}`);
    console.log(`   • Occupied Units: ${totalLeases}`);
    console.log(`   • Occupancy Rate: ${occupancyRate}%`);
    console.log(`   • Monthly Revenue: $${totalMonthlyRevenue.toLocaleString()}`);
    console.log(`   • Annual Revenue: $${totalAnnualRevenue.toLocaleString()}`);

    console.log('\n👥 User Accounts (Password: Austin2024!):');
    console.log(`   • Super Admin: ${superAdmin.email}`);
    console.log(`   • Org Admin: ${orgAdmin.email}`);
    console.log(`   • Entity Manager: ${entityManager.email}`);
    console.log(`   • Property Manager: ${propertyManager.email}`);
    console.log(`   • Accountant: ${accountant.email}`);
    console.log(`   • Maintenance: ${maintenanceStaff.email}`);
    console.log(`   • Tenants: ${tenants.length} tenant accounts created`);

    console.log('\n🚀 Ready for development and testing!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });