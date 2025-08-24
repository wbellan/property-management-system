// src/settings/default-settings.service.ts
export class DefaultSettingsService {

    static getDefaultOrganizationSettings(organizationId: string) {
        return [
            // Security Settings
            {
                organizationId,
                settingKey: 'password_min_length',
                settingValue: '8',
                category: 'security',
                isUserEditable: false
            },
            {
                organizationId,
                settingKey: 'session_timeout',
                settingValue: '480', // 8 hours in minutes
                category: 'security',
                isUserEditable: false
            },
            {
                organizationId,
                settingKey: 'require_2fa',
                settingValue: 'false',
                category: 'security',
                isUserEditable: false
            },

            // Maintenance Settings
            {
                organizationId,
                settingKey: 'maintenance_auto_assign',
                settingValue: 'false',
                category: 'maintenance',
                isUserEditable: false
            },
            {
                organizationId,
                settingKey: 'urgent_request_notification',
                settingValue: 'immediate',
                category: 'maintenance',
                isUserEditable: false
            },
            {
                organizationId,
                settingKey: 'maintenance_sla_hours',
                settingValue: JSON.stringify({
                    emergency: 2,
                    high: 24,
                    medium: 72,
                    low: 168
                }),
                category: 'maintenance',
                isUserEditable: false
            },

            // Billing Settings
            {
                organizationId,
                settingKey: 'late_fee_percentage',
                settingValue: '5.0',
                category: 'billing',
                isUserEditable: false
            },
            {
                organizationId,
                settingKey: 'grace_period_days',
                settingValue: '5',
                category: 'billing',
                isUserEditable: false
            },
            {
                organizationId,
                settingKey: 'auto_late_fees',
                settingValue: 'false',
                category: 'billing',
                isUserEditable: false
            },

            // Communication Settings
            {
                organizationId,
                settingKey: 'email_notifications_enabled',
                settingValue: 'true',
                category: 'communication',
                isUserEditable: true
            },
            {
                organizationId,
                settingKey: 'sms_notifications_enabled',
                settingValue: 'false',
                category: 'communication',
                isUserEditable: true
            },

            // Lease Management
            {
                organizationId,
                settingKey: 'lease_renewal_notice_days',
                settingValue: '60',
                category: 'leases',
                isUserEditable: false
            },
            {
                organizationId,
                settingKey: 'auto_rent_increases',
                settingValue: 'false',
                category: 'leases',
                isUserEditable: false
            },

            // Appearance
            {
                organizationId,
                settingKey: 'company_logo_url',
                settingValue: '',
                category: 'branding',
                isUserEditable: false
            },
            {
                organizationId,
                settingKey: 'primary_color',
                settingValue: '#6366f1',
                category: 'branding',
                isUserEditable: false
            }
        ];
    }

    static getDefaultPasswordPolicy(organizationId: string) {
        return {
            organizationId,
            minLength: 8,
            requireUpper: true,
            requireLower: true,
            requireNumbers: true,
            requireSymbols: false,
            maxAge: null, // No expiration by default
            historyCount: 5,
            lockoutAttempts: 5,
            lockoutDuration: 30
        };
    }

    static getDefaultUserSettings(userId: string) {
        return [
            // Appearance
            {
                userId,
                settingKey: 'theme',
                settingValue: 'light',
                category: 'appearance'
            },
            {
                userId,
                settingKey: 'language',
                settingValue: 'en',
                category: 'appearance'
            },
            {
                userId,
                settingKey: 'timezone',
                settingValue: 'America/Chicago',
                category: 'appearance'
            },

            // Notifications
            {
                userId,
                settingKey: 'email_notifications',
                settingValue: 'true',
                category: 'notifications'
            },
            {
                userId,
                settingKey: 'push_notifications',
                settingValue: 'true',
                category: 'notifications'
            },
            {
                userId,
                settingKey: 'maintenance_notifications',
                settingValue: 'true',
                category: 'notifications'
            },

            // Dashboard
            {
                userId,
                settingKey: 'dashboard_refresh_interval',
                settingValue: '300', // 5 minutes
                category: 'dashboard'
            },
            {
                userId,
                settingKey: 'default_date_range',
                settingValue: '30', // 30 days
                category: 'dashboard'
            }
        ];
    }
}