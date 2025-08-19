// src/reports/dto/analytics-query.dto.ts
import { IsOptional, IsString, IsDateString, IsArray, IsBoolean, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum GroupByPeriod {
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    QUARTER = 'quarter',
    YEAR = 'year',
}

export enum AnalyticsMetric {
    REVENUE = 'revenue',
    EXPENSES = 'expenses',
    PROFIT = 'profit',
    OCCUPANCY = 'occupancy',
    VACANCY_RATE = 'vacancy_rate',
    RENT_ROLL = 'rent_roll',
    MAINTENANCE_COST = 'maintenance_cost',
    LATE_FEES = 'late_fees',
    CASH_FLOW = 'cash_flow',
    ROI = 'roi',
    CAP_RATE = 'cap_rate',
    OPERATING_RATIO = 'operating_ratio',
    COLLECTION_RATE = 'collection_rate',
    TENANT_RETENTION = 'tenant_retention',
    AVERAGE_RENT = 'average_rent',
    COST_PER_UNIT = 'cost_per_unit',
}

export enum FilterCategory {
    PROPERTY_TYPE = 'property_type',
    LEASE_STATUS = 'lease_status',
    TENANT_TYPE = 'tenant_type',
    MAINTENANCE_CATEGORY = 'maintenance_category',
    EXPENSE_CATEGORY = 'expense_category',
    PAYMENT_METHOD = 'payment_method',
    VENDOR_TYPE = 'vendor_type',
}

export class AnalyticsQueryDto {
    @ApiProperty({
        example: 'entity-id-123',
        description: 'The entity ID to generate analytics for'
    })
    @IsString()
    entityId: string;

    @ApiProperty({
        required: false,
        example: '2024-01-01',
        description: 'Start date for analytics period (YYYY-MM-DD)'
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({
        required: false,
        example: '2024-12-31',
        description: 'End date for analytics period (YYYY-MM-DD)'
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({
        required: false,
        type: [String],
        enum: AnalyticsMetric,
        example: ['revenue', 'expenses', 'occupancy'],
        description: 'Specific metrics to include in analytics'
    })
    @IsOptional()
    @IsArray()
    @IsEnum(AnalyticsMetric, { each: true })
    metrics?: AnalyticsMetric[];

    @ApiProperty({
        required: false,
        type: [String],
        example: ['property-id-123', 'property-id-456'],
        description: 'Specific property IDs to filter analytics'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    propertyIds?: string[];

    @ApiProperty({
        enum: GroupByPeriod,
        required: false,
        example: GroupByPeriod.MONTH,
        description: 'How to group/aggregate the analytics data'
    })
    @IsOptional()
    @IsEnum(GroupByPeriod)
    aggregation?: GroupByPeriod;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include trend analysis and growth rates'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeTrends?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include forecasting and predictive analytics'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeForecasting?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include comparative analysis with previous periods'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeComparison?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include detailed breakdown by property'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeBreakdown?: boolean;

    @ApiProperty({
        required: false,
        example: 12,
        minimum: 1,
        maximum: 36,
        description: 'Number of months for forecasting (1-36)'
    })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    @Max(36)
    forecastMonths?: number;

    @ApiProperty({
        required: false,
        example: '2023-01-01',
        description: 'Comparison period start date (YYYY-MM-DD)'
    })
    @IsOptional()
    @IsDateString()
    comparisonStartDate?: string;

    @ApiProperty({
        required: false,
        example: '2023-12-31',
        description: 'Comparison period end date (YYYY-MM-DD)'
    })
    @IsOptional()
    @IsDateString()
    comparisonEndDate?: string;

    @ApiProperty({
        required: false,
        type: 'object',
        description: 'Advanced filters for refining analytics',
        example: {
            minValue: 1000,
            maxValue: 50000,
            categories: ['residential', 'commercial'],
            statuses: ['active', 'pending'],
            priorities: ['high', 'medium']
        }
    })
    @IsOptional()
    filters?: {
        minValue?: number;
        maxValue?: number;
        categories?: string[];
        statuses?: string[];
        priorities?: string[];
        propertyTypes?: string[];
        tenantTypes?: string[];
        excludeVacant?: boolean;
        includeProjected?: boolean;
        riskLevel?: 'low' | 'medium' | 'high' | 'all';
        performanceThreshold?: number;
    };

    @ApiProperty({
        required: false,
        type: [String],
        enum: FilterCategory,
        example: ['property_type', 'lease_status'],
        description: 'Categories to group filters by'
    })
    @IsOptional()
    @IsArray()
    @IsEnum(FilterCategory, { each: true })
    filterCategories?: FilterCategory[];

    @ApiProperty({
        required: false,
        example: 'desc',
        enum: ['asc', 'desc'],
        description: 'Sort order for results'
    })
    @IsOptional()
    @IsEnum(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';

    @ApiProperty({
        required: false,
        example: 'revenue',
        description: 'Field to sort results by'
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiProperty({
        required: false,
        example: 100,
        minimum: 1,
        maximum: 1000,
        description: 'Maximum number of results to return'
    })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    @Max(1000)
    limit?: number;

    @ApiProperty({
        required: false,
        example: 0,
        minimum: 0,
        description: 'Number of results to skip (for pagination)'
    })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(0)
    offset?: number;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include raw data points in response'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeRawData?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include statistical analysis (mean, median, std dev)'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeStatistics?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include performance benchmarks and industry comparisons'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeBenchmarks?: boolean;

    @ApiProperty({
        required: false,
        example: 'UTC',
        description: 'Timezone for date calculations'
    })
    @IsOptional()
    @IsString()
    timezone?: string;

    @ApiProperty({
        required: false,
        example: 'USD',
        description: 'Currency for financial calculations'
    })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include anomaly detection in trends'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeAnomalies?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include seasonal analysis'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeSeasonality?: boolean;

    @ApiProperty({
        required: false,
        example: 0.95,
        minimum: 0.5,
        maximum: 0.99,
        description: 'Confidence level for forecasting (0.5-0.99)'
    })
    @IsOptional()
    @Transform(({ value }) => parseFloat(value))
    @Min(0.5)
    @Max(0.99)
    confidenceLevel?: number;
}