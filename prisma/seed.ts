// prisma/seed.ts - Fixed to handle foreign key constraints properly
import { PrismaClient, UserRole, UserStatus, LeaseStatus, MaintenanceStatus, MaintenancePriority, InvoiceStatus, InvoiceType, PaymentMethod, PaymentStatus, ExpenseType } from '@prisma/client';
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

    // Level 2: Delete records that depend on Level 1
    await prisma.invoice.deleteMany();
    await prisma.maintenanceRequest.deleteMany();
    await prisma.lease.deleteMany();

    // Level 3: Delete records that depend on Level 2
    await prisma.tenant.deleteMany();
    await prisma.space.deleteMany();

    // Level 4: Delete junction tables
    await prisma.userProperty.deleteMany();
    await prisma.userEntity.deleteMany();

    // Level 5: Delete user invitations BEFORE users (since they reference users)
    await prisma.userInvitation.deleteMany();

    // Level 6: Delete users (now safe to delete)
    await prisma.user.deleteMany();

    // Level 7: Delete other entities
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

    // Create properties
    const property1 = await prisma.property.create({
        data: {
            name: 'Lakeway Vista Apartments',
            address: '2200 Lakeway Vista Dr',
            city: 'Lakeway',
            state: 'TX',
            zipCode: '78734',
            propertyType: 'Apartment Complex',
            totalUnits: 24,
            yearBuilt: 2018,
            squareFeet: 30000,
            description: 'Modern apartment complex with lake views and premium amenities',
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
            propertyType: 'Apartment Complex',
            totalUnits: 36,
            yearBuilt: 2017,
            squareFeet: 45000,
            description: 'Family-friendly apartment community with playground and pool',
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
            propertyType: 'Office Building',
            totalUnits: 12,
            yearBuilt: 2020,
            squareFeet: 25000,
            description: 'Modern office building in downtown Austin',
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

    // Create spaces (units)
    const spaces = [];

    // Property 1 units (Lakeway Vista - 24 units)
    for (let i = 1; i <= 24; i++) {
        const space = await prisma.space.create({
            data: {
                unitNumber: `A${i.toString().padStart(2, '0')}`,
                floor: Math.ceil(i / 8),
                spaceType: 'Apartment',
                bedrooms: i <= 8 ? 1 : i <= 16 ? 2 : 3,
                bathrooms: i <= 8 ? 1 : 2,
                squareFeet: i <= 8 ? 650 : i <= 16 ? 950 : 1250,
                description: `${i <= 8 ? 1 : i <= 16 ? 2 : 3} bedroom apartment with modern finishes`,
                propertyId: property1.id
            }
        });
        spaces.push(space);
    }

    // Property 2 units (Cedar Park - 36 units)
    for (let i = 1; i <= 36; i++) {
        const space = await prisma.space.create({
            data: {
                unitNumber: `B${i.toString().padStart(2, '0')}`,
                floor: Math.ceil(i / 12),
                spaceType: 'Apartment',
                bedrooms: i <= 12 ? 1 : i <= 24 ? 2 : 3,
                bathrooms: i <= 12 ? 1 : 2,
                squareFeet: i <= 12 ? 700 : i <= 24 ? 1000 : 1300,
                description: `${i <= 12 ? 1 : i <= 24 ? 2 : 3} bedroom family apartment`,
                propertyId: property2.id
            }
        });
        spaces.push(space);
    }

    // Property 3 spaces (Austin Tech Center - 12 office suites)
    for (let i = 1; i <= 12; i++) {
        const space = await prisma.space.create({
            data: {
                unitNumber: `Suite ${i.toString().padStart(2, '0')}`,
                floor: Math.ceil(i / 6),
                spaceType: 'Office',
                bedrooms: null,
                bathrooms: 1,
                squareFeet: 800 + (i * 200),
                description: `Professional office suite with downtown views`,
                propertyId: property3.id
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

    // Create active leases (85% occupancy)
    const totalSpaceCount = spaces.length;
    const occupiedCount = Math.floor(totalSpaceCount * 0.85);
    const occupiedSpaces = spaces.slice(0, occupiedCount);
    const leases = [];

    for (let i = 0; i < occupiedSpaces.length && i < tenants.length; i++) {
        const space = occupiedSpaces[i];
        const tenant = tenants[i];

        // Create lease start dates over the past 2 years
        const daysAgo = Math.floor(Math.random() * 730); // 0-730 days ago
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        // Set rent based on property type and size
        let monthlyRent;
        if (space.spaceType === 'Office') {
            monthlyRent = 2500 + (space.squareFeet! * 0.5); // $2.50+ per sq ft for office
        } else {
            monthlyRent = space.bedrooms === 1 ? 1400 + Math.random() * 200 :
                space.bedrooms === 2 ? 1800 + Math.random() * 300 :
                    2200 + Math.random() * 400;
        }

        const lease = await prisma.lease.create({
            data: {
                spaceId: space.id,
                tenantId: tenant.user.id,
                startDate,
                endDate,
                monthlyRent: Number(monthlyRent.toFixed(2)),
                securityDeposit: Number(monthlyRent.toFixed(2)),
                status: LeaseStatus.ACTIVE,
                leaseTerms: space.spaceType === 'Office' ?
                    'Commercial lease with triple net expenses' :
                    'Standard residential lease agreement',
                utilitiesIncluded: space.spaceType === 'Apartment' ? Math.random() > 0.5 : false,
                petDeposit: Math.random() > 0.7 ? 200 : null
            }
        });

        leases.push(lease);
    }

    console.log(`✅ Created ${leases.length} active leases (${Math.round((leases.length / totalSpaceCount) * 100)}% occupancy)`);

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

    // Create maintenance requests
    const maintenanceTypes = [
        { title: 'HVAC not cooling properly', priority: MaintenancePriority.HIGH },
        { title: 'Kitchen faucet leaking', priority: MaintenancePriority.MEDIUM },
        { title: 'Bathroom light not working', priority: MaintenancePriority.LOW },
        { title: 'Garbage disposal jammed', priority: MaintenancePriority.MEDIUM },
        { title: 'Toilet running constantly', priority: MaintenancePriority.HIGH },
        { title: 'Window won\'t close properly', priority: MaintenancePriority.LOW },
        { title: 'Dishwasher not draining', priority: MaintenancePriority.MEDIUM },
        { title: 'Ceiling fan making noise', priority: MaintenancePriority.LOW },
        { title: 'Water heater not working', priority: MaintenancePriority.HIGH },
        { title: 'Door lock needs repair', priority: MaintenancePriority.MEDIUM }
    ];

    for (let i = 0; i < 25; i++) {
        const lease = leases[Math.floor(Math.random() * leases.length)];
        const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
        const vendor = vendors[Math.floor(Math.random() * vendors.length)];

        // Get the space to find the propertyId
        const space = spaces.find(s => s.id === lease.spaceId);
        if (!space) continue; // Skip if space not found

        const status = Math.random() > 0.6 ? MaintenanceStatus.COMPLETED :
            Math.random() > 0.4 ? MaintenanceStatus.IN_PROGRESS :
                MaintenanceStatus.OPEN;

        const requestedAt = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Last 60 days

        const estimatedCost = 100 + Math.random() * 500;
        const actualCost = status === MaintenanceStatus.COMPLETED ?
            estimatedCost * (0.8 + Math.random() * 0.4) : null; // 80-120% of estimate

        const maintenanceRequest = await prisma.maintenanceRequest.create({
            data: {
                propertyId: space.propertyId,
                spaceId: lease.spaceId,
                tenantId: lease.tenantId,
                title: maintenanceType.title,
                description: `${maintenanceType.title} - tenant reported issue requires attention`,
                priority: maintenanceType.priority,
                status,
                estimatedCost: Number(estimatedCost.toFixed(2)),
                actualCost: actualCost ? Number(actualCost.toFixed(2)) : null,
                requestedAt,
                completedAt: status === MaintenanceStatus.COMPLETED ?
                    new Date(requestedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null
            }
        });

        // Create assignment if not open
        if (status !== MaintenanceStatus.OPEN) {
            await prisma.maintenanceAssignment.create({
                data: {
                    maintenanceReqId: maintenanceRequest.id,
                    vendorId: vendor.id,
                    assignedAt: new Date(requestedAt.getTime() + Math.random() * 24 * 60 * 60 * 1000),
                    scheduledDate: new Date(requestedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
                    completedAt: maintenanceRequest.completedAt,
                    cost: maintenanceRequest.actualCost
                }
            });
        }
    }

    console.log('✅ Created maintenance requests and assignments');

    // Create financial records (invoices and payments)
    for (const lease of leases) {
        const leaseStartDate = new Date(lease.startDate);
        const currentDate = new Date();
        const monthsDiff = Math.floor((currentDate.getTime() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

        // Create monthly invoices for each month since lease started
        for (let month = 0; month <= monthsDiff; month++) {
            const invoiceDate = new Date(leaseStartDate);
            invoiceDate.setMonth(invoiceDate.getMonth() + month);

            if (invoiceDate > currentDate) break;

            const dueDate = new Date(invoiceDate);
            dueDate.setDate(5); // Due on 5th of each month

            const invoice = await prisma.invoice.create({
                data: {
                    leaseId: lease.id,
                    invoiceNumber: `RENT-${lease.id.slice(-6)}-${invoiceDate.getFullYear()}${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}`,
                    invoiceType: InvoiceType.RENT,
                    amount: lease.monthlyRent,
                    dueDate,
                    status: Math.random() > 0.05 ? InvoiceStatus.PAID : InvoiceStatus.SENT, // 95% payment rate
                    description: `Monthly rent for ${invoiceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                }
            });

            // Create payment if invoice is paid
            if (invoice.status === InvoiceStatus.PAID) {
                const paymentDate = new Date(dueDate);
                paymentDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 10)); // Paid within 10 days

                await prisma.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        amount: lease.monthlyRent,
                        paymentDate,
                        paymentMethod: Math.random() > 0.3 ? PaymentMethod.BANK_TRANSFER :
                            Math.random() > 0.5 ? PaymentMethod.ONLINE : PaymentMethod.CHECK,
                        status: PaymentStatus.COMPLETED,
                        referenceNumber: `PAY-${Math.floor(Math.random() * 1000000)}`
                    }
                });

                // Create rent payment record
                const periodStart = new Date(invoiceDate);
                const periodEnd = new Date(invoiceDate);
                periodEnd.setMonth(periodEnd.getMonth() + 1);
                periodEnd.setDate(periodEnd.getDate() - 1);

                await prisma.rentPayment.create({
                    data: {
                        leaseId: lease.id,
                        amount: lease.monthlyRent,
                        paymentDate,
                        periodStart,
                        periodEnd,
                        paymentMethod: Math.random() > 0.3 ? PaymentMethod.BANK_TRANSFER :
                            Math.random() > 0.5 ? PaymentMethod.ONLINE : PaymentMethod.CHECK,
                        status: PaymentStatus.COMPLETED,
                        referenceNumber: `RENT-${Math.floor(Math.random() * 1000000)}`
                    }
                });
            }
        }
    }

    console.log('✅ Created financial records (invoices and payments)');

    // Create property expenses
    const expenseTypes = [
        ExpenseType.MAINTENANCE,
        ExpenseType.UTILITIES,
        ExpenseType.INSURANCE,
        ExpenseType.LANDSCAPING,
        ExpenseType.CLEANING,
        ExpenseType.REPAIRS
    ];

    const properties = [property1, property2, property3];
    for (const property of properties) {
        for (let i = 0; i < 15; i++) {
            const expenseType = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
            const expenseDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);

            const baseAmount = expenseType === ExpenseType.UTILITIES ? 200 + Math.random() * 500 :
                expenseType === ExpenseType.INSURANCE ? 500 + Math.random() * 1000 :
                    expenseType === ExpenseType.MAINTENANCE ? 100 + Math.random() * 800 :
                        expenseType === ExpenseType.LANDSCAPING ? 150 + Math.random() * 300 :
                            expenseType === ExpenseType.CLEANING ? 100 + Math.random() * 200 :
                                200 + Math.random() * 600;

            await prisma.propertyExpense.create({
                data: {
                    propertyId: property.id,
                    expenseType,
                    amount: Number(baseAmount.toFixed(2)),
                    description: `${expenseType.toLowerCase().replace('_', ' ')} expense for ${property.name}`,
                    expenseDate,
                    vendor: vendors[Math.floor(Math.random() * vendors.length)].name,
                    invoiceNumber: `INV-${Math.floor(Math.random() * 100000)}`,
                    allocateToTenants: expenseType === ExpenseType.UTILITIES ? Math.random() > 0.5 : false
                }
            });
        }
    }

    console.log('✅ Created property expenses');

    // Create some user invitations (pending)
    const pendingInvitations = [
        {
            firstName: 'Lisa',
            lastName: 'Thompson',
            email: 'lisa.thompson@email.com',
            role: UserRole.PROPERTY_MANAGER
        },
        {
            firstName: 'Mark',
            lastName: 'Johnson',
            email: 'mark.johnson@email.com',
            role: UserRole.MAINTENANCE
        }
    ];

    for (const invitation of pendingInvitations) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

        await prisma.userInvitation.create({
            data: {
                firstName: invitation.firstName,
                lastName: invitation.lastName,
                email: invitation.email,
                role: invitation.role,
                organizationId: organization.id,
                invitedById: orgAdmin.id,
                token: `invite-${Math.random().toString(36).substring(2, 15)}`,
                expiresAt,
                entityIds: [entity1.id]
            }
        });
    }

    console.log('✅ Created pending user invitations');

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
    console.log(`   • Properties: ${properties.length}`);
    console.log(`   • Total Units: ${finalTotalSpaces}`);
    console.log(`   • Occupied Units: ${totalLeases}`);
    console.log(`   • Occupancy Rate: ${occupancyRate}%`);
    console.log(`   • Monthly Revenue: ${totalMonthlyRevenue.toLocaleString()}`);
    console.log(`   • Annual Revenue: ${totalAnnualRevenue.toLocaleString()}`);

    console.log('\n👥 User Accounts (Password: Austin2024!):');
    console.log(`   • Super Admin: ${superAdmin.email}`);
    console.log(`   • Org Admin: ${orgAdmin.email}`);
    console.log(`   • Entity Manager: ${entityManager.email}`);
    console.log(`   • Property Manager: ${propertyManager.email}`);
    console.log(`   • Accountant: ${accountant.email}`);
    console.log(`   • Maintenance: ${maintenanceStaff.email}`);
    console.log(`   • Tenants: ${tenants.length} tenant accounts created`);

    console.log('\n🏢 Properties:');
    console.log(`   • ${property1.name} (${property1.totalUnits} units)`);
    console.log(`   • ${property2.name} (${property2.totalUnits} units)`);
    console.log(`   • ${property3.name} (${property3.totalUnits} units)`);

    console.log('\n💰 Financial Data:');
    console.log(`   • Chart of Accounts: ${accountTypes.length} accounts per entity`);
    console.log(`   • Bank Ledgers: 2 accounts per entity`);
    console.log(`   • Invoices: Generated for all lease periods`);
    console.log(`   • Payments: 95% payment success rate`);

    console.log('\n🔧 Maintenance:');
    console.log(`   • Vendors: ${vendors.length} service providers`);
    console.log(`   • Maintenance Requests: 25 work orders created`);
    console.log(`   • Request Status: Mixed (Open, In Progress, Completed)`);

    console.log('\n📧 Pending Invitations:');
    console.log(`   • ${pendingInvitations.length} users invited`);

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