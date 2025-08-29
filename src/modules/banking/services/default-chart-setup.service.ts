// services/default-chart-setup.service.ts
import { Injectable } from '@nestjs/common';
import { AccountType } from '@prisma/client';

export interface DefaultAccount {
    code: string;
    name: string;
    type: AccountType;
    parent?: string;
    description?: string;
}

@Injectable()
export class DefaultChartSetupService {

    getDefaultPropertyManagementChart(): DefaultAccount[] {
        return [
            // Assets (1000-1999)
            { code: '1000', name: 'CURRENT ASSETS', type: AccountType.ASSET, description: 'Assets that can be converted to cash within one year' },
            { code: '1100', name: 'Cash and Cash Equivalents', type: AccountType.ASSET, parent: '1000' },
            { code: '1110', name: 'Checking Account - Operating', type: AccountType.ASSET, parent: '1100' },
            { code: '1120', name: 'Checking Account - Security Deposits', type: AccountType.ASSET, parent: '1100' },
            { code: '1130', name: 'Savings Account', type: AccountType.ASSET, parent: '1100' },
            { code: '1140', name: 'Money Market Account', type: AccountType.ASSET, parent: '1100' },

            { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, parent: '1000' },
            { code: '1210', name: 'Rent Receivable', type: AccountType.ASSET, parent: '1200' },
            { code: '1220', name: 'Other Receivables', type: AccountType.ASSET, parent: '1200' },
            { code: '1230', name: 'Allowance for Doubtful Accounts', type: AccountType.ASSET, parent: '1200' },

            { code: '1300', name: 'Prepaid Expenses', type: AccountType.ASSET, parent: '1000' },
            { code: '1310', name: 'Prepaid Insurance', type: AccountType.ASSET, parent: '1300' },
            { code: '1320', name: 'Prepaid Property Taxes', type: AccountType.ASSET, parent: '1300' },

            { code: '1500', name: 'FIXED ASSETS', type: AccountType.ASSET, description: 'Long-term assets used in business operations' },
            { code: '1510', name: 'Land', type: AccountType.ASSET, parent: '1500' },
            { code: '1520', name: 'Buildings', type: AccountType.ASSET, parent: '1500' },
            { code: '1525', name: 'Accumulated Depreciation - Buildings', type: AccountType.ASSET, parent: '1500' },
            { code: '1530', name: 'Equipment', type: AccountType.ASSET, parent: '1500' },
            { code: '1535', name: 'Accumulated Depreciation - Equipment', type: AccountType.ASSET, parent: '1500' },
            { code: '1540', name: 'Improvements', type: AccountType.ASSET, parent: '1500' },
            { code: '1545', name: 'Accumulated Depreciation - Improvements', type: AccountType.ASSET, parent: '1500' },

            // Liabilities (2000-2999)
            { code: '2000', name: 'CURRENT LIABILITIES', type: AccountType.LIABILITY, description: 'Debts due within one year' },
            { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY, parent: '2000' },
            { code: '2110', name: 'Trade Payables', type: AccountType.LIABILITY, parent: '2100' },
            { code: '2120', name: 'Maintenance Payables', type: AccountType.LIABILITY, parent: '2100' },

            { code: '2200', name: 'Accrued Expenses', type: AccountType.LIABILITY, parent: '2000' },
            { code: '2210', name: 'Accrued Utilities', type: AccountType.LIABILITY, parent: '2200' },
            { code: '2220', name: 'Accrued Property Taxes', type: AccountType.LIABILITY, parent: '2200' },
            { code: '2230', name: 'Accrued Interest', type: AccountType.LIABILITY, parent: '2200' },

            { code: '2300', name: 'Security Deposits Held', type: AccountType.LIABILITY, parent: '2000', description: 'Tenant security deposits held in trust' },
            { code: '2400', name: 'Prepaid Rent', type: AccountType.LIABILITY, parent: '2000', description: 'Rent collected in advance' },

            { code: '2500', name: 'LONG-TERM LIABILITIES', type: AccountType.LIABILITY, description: 'Debts due after one year' },
            { code: '2510', name: 'Mortgages Payable', type: AccountType.LIABILITY, parent: '2500' },
            { code: '2520', name: 'Notes Payable', type: AccountType.LIABILITY, parent: '2500' },
            { code: '2530', name: 'Lines of Credit', type: AccountType.LIABILITY, parent: '2500' },

            // Equity (3000-3999)
            { code: '3000', name: 'OWNER\'S EQUITY', type: AccountType.EQUITY, description: 'Owner\'s stake in the business' },
            { code: '3100', name: 'Owner\'s Capital', type: AccountType.EQUITY, parent: '3000' },
            { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY, parent: '3000' },
            { code: '3300', name: 'Owner Distributions', type: AccountType.EQUITY, parent: '3000' },

            // Revenue (4000-4999)
            { code: '4000', name: 'REVENUE', type: AccountType.REVENUE, description: 'Income from property operations' },
            { code: '4100', name: 'Rental Income', type: AccountType.REVENUE, parent: '4000' },
            { code: '4110', name: 'Base Rent', type: AccountType.REVENUE, parent: '4100' },
            { code: '4120', name: 'NNN Income', type: AccountType.REVENUE, parent: '4100' },
            { code: '4130', name: 'Parking Income', type: AccountType.REVENUE, parent: '4100' },

            { code: '4200', name: 'Other Income', type: AccountType.REVENUE, parent: '4000' },
            { code: '4210', name: 'Late Fees', type: AccountType.REVENUE, parent: '4200' },
            { code: '4220', name: 'Application Fees', type: AccountType.REVENUE, parent: '4200' },
            { code: '4230', name: 'Pet Fees', type: AccountType.REVENUE, parent: '4200' },
            { code: '4240', name: 'Laundry Income', type: AccountType.REVENUE, parent: '4200' },
            { code: '4250', name: 'Forfeited Deposits', type: AccountType.REVENUE, parent: '4200' },

            // Expenses (5000-5999)
            { code: '5000', name: 'OPERATING EXPENSES', type: AccountType.EXPENSE, description: 'Day-to-day property operation costs' },

            { code: '5100', name: 'Property Operations', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5110', name: 'Maintenance and Repairs', type: AccountType.EXPENSE, parent: '5100' },
            { code: '5120', name: 'Landscaping', type: AccountType.EXPENSE, parent: '5100' },
            { code: '5130', name: 'Cleaning', type: AccountType.EXPENSE, parent: '5100' },
            { code: '5140', name: 'Pest Control', type: AccountType.EXPENSE, parent: '5100' },
            { code: '5150', name: 'Snow Removal', type: AccountType.EXPENSE, parent: '5100' },

            { code: '5200', name: 'Utilities', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5210', name: 'Electricity', type: AccountType.EXPENSE, parent: '5200' },
            { code: '5220', name: 'Gas', type: AccountType.EXPENSE, parent: '5200' },
            { code: '5230', name: 'Water and Sewer', type: AccountType.EXPENSE, parent: '5200' },
            { code: '5240', name: 'Trash and Recycling', type: AccountType.EXPENSE, parent: '5200' },
            { code: '5250', name: 'Internet and Cable', type: AccountType.EXPENSE, parent: '5200' },

            { code: '5300', name: 'Professional Services', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5310', name: 'Property Management Fees', type: AccountType.EXPENSE, parent: '5300' },
            { code: '5320', name: 'Legal Fees', type: AccountType.EXPENSE, parent: '5300' },
            { code: '5330', name: 'Accounting Fees', type: AccountType.EXPENSE, parent: '5300' },
            { code: '5340', name: 'Advertising', type: AccountType.EXPENSE, parent: '5300' },
            { code: '5350', name: 'Leasing Commissions', type: AccountType.EXPENSE, parent: '5300' },

            { code: '5400', name: 'Taxes and Licenses', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5410', name: 'Property Taxes', type: AccountType.EXPENSE, parent: '5400' },
            { code: '5420', name: 'Business Licenses', type: AccountType.EXPENSE, parent: '5400' },

            { code: '5500', name: 'Insurance', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5510', name: 'Property Insurance', type: AccountType.EXPENSE, parent: '5500' },
            { code: '5520', name: 'Liability Insurance', type: AccountType.EXPENSE, parent: '5500' },

            { code: '5600', name: 'Administrative Expenses', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5610', name: 'Office Supplies', type: AccountType.EXPENSE, parent: '5600' },
            { code: '5620', name: 'Telephone', type: AccountType.EXPENSE, parent: '5600' },
            { code: '5630', name: 'Bank Fees', type: AccountType.EXPENSE, parent: '5600' },
            { code: '5640', name: 'Software Subscriptions', type: AccountType.EXPENSE, parent: '5600' },

            { code: '5700', name: 'Capital Improvements', type: AccountType.EXPENSE, parent: '5000' },
            { code: '5800', name: 'Depreciation Expense', type: AccountType.EXPENSE, parent: '5000' },
        ];
    }

    /**
     * Get simplified chart for small property owners
     */
    getSimplifiedChart(): DefaultAccount[] {
        return [
            // Basic Assets
            { code: '1100', name: 'Checking Account', type: AccountType.ASSET },
            { code: '1200', name: 'Savings Account', type: AccountType.ASSET },
            { code: '1300', name: 'Rent Receivable', type: AccountType.ASSET },
            { code: '1500', name: 'Property', type: AccountType.ASSET },

            // Basic Liabilities
            { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY },
            { code: '2200', name: 'Security Deposits Held', type: AccountType.LIABILITY },
            { code: '2500', name: 'Mortgage Payable', type: AccountType.LIABILITY },

            // Basic Equity
            { code: '3000', name: 'Owner\'s Equity', type: AccountType.EQUITY },

            // Basic Revenue
            { code: '4100', name: 'Rental Income', type: AccountType.REVENUE },
            { code: '4200', name: 'Late Fees', type: AccountType.REVENUE },

            // Basic Expenses
            { code: '5100', name: 'Maintenance', type: AccountType.EXPENSE },
            { code: '5200', name: 'Utilities', type: AccountType.EXPENSE },
            { code: '5300', name: 'Insurance', type: AccountType.EXPENSE },
            { code: '5400', name: 'Property Taxes', type: AccountType.EXPENSE },
            { code: '5500', name: 'Management Fees', type: AccountType.EXPENSE },
        ];
    }

    /**
     * Validate chart of accounts structure
     */
    validateChartStructure(accounts: DefaultAccount[]): string[] {
        const errors: string[] = [];
        const codes = new Set<string>();

        accounts.forEach(account => {
            // Check for duplicate codes
            if (codes.has(account.code)) {
                errors.push(`Duplicate account code: ${account.code}`);
            }
            codes.add(account.code);

            // Validate parent references
            if (account.parent && !accounts.some(a => a.code === account.parent)) {
                errors.push(`Parent account ${account.parent} not found for ${account.code}`);
            }

            // Validate account code format
            if (!/^\d{4}$/.test(account.code)) {
                errors.push(`Invalid account code format: ${account.code} (should be 4 digits)`);
            }
        });

        return errors;
    }
}