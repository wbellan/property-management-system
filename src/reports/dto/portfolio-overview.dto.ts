// src/reports/dto/portfolio-overview.dto.ts
import { IsOptional, IsString, IsDateString, IsArray, IsBoolean, IsEnum, IsInt, Min, Max, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PortfolioSection {
    FINANCIAL = 'financial',
    OPERATIONAL = 'operational',
    MARKET = 'market',
    PERFORMANCE = 'performance',
    RISK = 'risk',
    TRENDS = 'trends',
    PROJECTIONS = 'projections',
    BENCHMARKS = 'benchmarks',
}

export enum PerformanceMetric {
    ROI = 'roi',
    CAP_RATE = 'cap_rate',
    CASH_ON_CASH = 'cash_on_cash',
    IRR = 'irr',
    NOI = 'noi',
    GROSS_YIELD = 'gross_yield',
    NET_YIELD = 'net_yield',
    DEBT_SERVICE_RATIO = 'debt_service_ratio',
    OPERATING_RATIO = 'operating_ratio',
    VACANCY_RATE = 'vacancy_rate',
    COLLECTION_RATE = 'collection_rate',
    TENANT_RETENTION = 'tenant_retention',
}

export enum RiskCategory {
    FINANCIAL = 'financial',
    OPERATIONAL = 'operational',
    MARKET = 'market',
    REGULATORY = 'regulatory',
    ENVIRONMENTAL = 'environmental',
    TENANT = 'tenant',
    PROPERTY = 'property',
}

export enum ProjectionType {
    CONSERVATIVE = 'conservative',
    MODERATE = 'moderate',
    OPTIMISTIC = 'optimistic',
    SCENARIO_BASED = 'scenario_based',
}

export class PortfolioOverviewDto {
    @ApiProperty({
        example: 'entity-id-123',
        description: 'The entity ID to generate portfolio overview for'
    })
    @IsString()
    entityId: string;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include financial projections and forecasting'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeProjections?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include market comparison and benchmarking data'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeMarketComparison?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include comprehensive risk analysis'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeRiskAnalysis?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include detailed performance metrics and KPIs'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includePerformanceMetrics?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include historical trend analysis'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeTrendAnalysis?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include asset valuation and appreciation'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeValuation?: boolean;

    @ApiProperty({
        required: false,
        type: [String],
        enum: PortfolioSection,
        example: ['financial', 'operational', 'market'],
        description: 'Specific sections to include in the overview'
    })
    @IsOptional()
    @IsArray()
    @IsEnum(PortfolioSection, { each: true })
    sections?: PortfolioSection[];

    @ApiProperty({
        required: false,
        type: [String],
        enum: PerformanceMetric,
        example: ['roi', 'cap_rate', 'cash_on_cash'],
        description: 'Specific performance metrics to calculate'
    })
    @IsOptional()
    @IsArray()
    @IsEnum(PerformanceMetric, { each: true })
    performanceMetrics?: PerformanceMetric[];

    @ApiProperty({
        required: false,
        type: [String],
        enum: RiskCategory,
        example: ['financial', 'operational', 'market'],
        description: 'Risk categories to analyze'
    })
    @IsOptional()
    @IsArray()
    @IsEnum(RiskCategory, { each: true })
    riskCategories?: RiskCategory[];

    @ApiProperty({
        required: false,
        example: '2024-01-01',
        description: 'Start date for analysis period (YYYY-MM-DD)'
    })
    @IsOptional()
    @IsDateString()
    analysisStartDate?: string;

    @ApiProperty({
        required: false,
        example: '2024-12-31',
        description: 'End date for analysis period (YYYY-MM-DD)'
    })
    @IsOptional()
    @IsDateString()
    analysisEndDate?: string;

    @ApiProperty({
        required: false,
        example: 12,
        minimum: 1,
        maximum: 60,
        description: 'Number of months for projections (1-60)'
    })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(1)
    @Max(60)
    projectionMonths?: number;

    @ApiProperty({
        required: false,
        enum: ProjectionType,
        example: ProjectionType.MODERATE,
        description: 'Type of financial projections to generate'
    })
    @IsOptional()
    @IsEnum(ProjectionType)
    projectionType?: ProjectionType;

    @ApiProperty({
        required: false,
        type: [String],
        example: ['property-id-123', 'property-id-456'],
        description: 'Specific property IDs to include in portfolio analysis'
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    propertyIds?: string[];

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include detailed property-by-property breakdown'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includePropertyBreakdown?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include executive summary with key highlights'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeExecutiveSummary?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include recommendations and action items'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeRecommendations?: boolean;

    @ApiProperty({
        required: false,
        example: 'USD',
        description: 'Currency for financial calculations and reporting'
    })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiProperty({
        required: false,
        example: 0.95,
        minimum: 0.5,
        maximum: 0.99,
        description: 'Confidence level for projections and risk analysis (0.5-0.99)'
    })
    @IsOptional()
    @Transform(({ value }) => parseFloat(value))
    @IsNumber()
    @Min(0.5)
    @Max(0.99)
    confidenceLevel?: number;

    @ApiProperty({
        required: false,
        example: 36,
        minimum: 12,
        maximum: 120,
        description: 'Months of historical data to use for trend analysis (12-120)'
    })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsInt()
    @Min(12)
    @Max(120)
    historicalMonths?: number;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include cash flow analysis and projections'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeCashFlow?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include debt analysis and leverage metrics'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeDebtAnalysis?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include tax implications and benefits analysis'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeTaxAnalysis?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include environmental and sustainability metrics'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeESGMetrics?: boolean;

    @ApiProperty({
        required: false,
        type: 'object',
        description: 'Custom benchmark values for comparison',
        example: {
            targetROI: 8.5,
            targetCapRate: 6.0,
            targetOccupancy: 95.0,
            industryAvgROI: 7.2,
            marketCapRate: 5.8
        }
    })
    @IsOptional()
    benchmarks?: {
        targetROI?: number;
        targetCapRate?: number;
        targetOccupancy?: number;
        targetCashOnCash?: number;
        industryAvgROI?: number;
        marketCapRate?: number;
        peerGroupROI?: number;
        inflationRate?: number;
        riskFreeRate?: number;
    };

    @ApiProperty({
        required: false,
        type: 'object',
        description: 'Advanced filtering options for portfolio analysis',
        example: {
            propertyTypes: ['residential', 'commercial'],
            acquisitionYear: { min: 2020, max: 2024 },
            valueRange: { min: 500000, max: 5000000 },
            performanceThreshold: 'above_average'
        }
    })
    @IsOptional()
    filters?: {
        propertyTypes?: string[];
        acquisitionYear?: {
            min?: number;
            max?: number;
        };
        valueRange?: {
            min?: number;
            max?: number;
        };
        performanceThreshold?: 'below_average' | 'average' | 'above_average' | 'top_quartile';
        riskLevel?: 'low' | 'medium' | 'high';
        includeVacant?: boolean;
        excludeNonPerforming?: boolean;
        geographicRegion?: string[];
    };

    @ApiProperty({
        required: false,
        example: 'detailed',
        enum: ['summary', 'standard', 'detailed', 'comprehensive'],
        description: 'Level of detail for the portfolio overview'
    })
    @IsOptional()
    @IsEnum(['summary', 'standard', 'detailed', 'comprehensive'])
    detailLevel?: 'summary' | 'standard' | 'detailed' | 'comprehensive';

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include scenario analysis (best case, worst case, most likely)'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeScenarioAnalysis?: boolean;

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include sensitivity analysis for key variables'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeSensitivityAnalysis?: boolean;

    @ApiProperty({
        required: false,
        example: 'quarterly',
        enum: ['monthly', 'quarterly', 'annually'],
        description: 'Frequency for trend analysis and projections'
    })
    @IsOptional()
    @IsEnum(['monthly', 'quarterly', 'annually'])
    analysisFrequency?: 'monthly' | 'quarterly' | 'annually';

    @ApiProperty({
        required: false,
        example: true,
        description: 'Include charts and visualizations in the response'
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    includeVisualizations?: boolean;

    @ApiProperty({
        required: false,
        example: 'UTC',
        description: 'Timezone for date calculations and reporting'
    })
    @IsOptional()
    @IsString()
    timezone?: string;
}