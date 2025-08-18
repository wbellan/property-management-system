# Property Management System

A comprehensive property management system built with NestJS, Prisma, and PostgreSQL.

## Features

- **Multi-tenant Architecture**: Organizations → Entities → Properties → Spaces → Leases
- **Role-based Access Control**: Super Admin, Org Admin, Entity Manager, Property Manager, Tenant, etc.
- **Financial Management**: Bank ledgers, chart of accounts, invoices, payments, rent tracking
- **Maintenance System**: Tenant requests, work orders, cost tracking
- **Lease Management**: Active leases, rent increases, renewals, NNN expenses
- **Reporting**: Financial reports, occupancy rates, reconciliation

## Tech Stack

- **Backend**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based guards
- **Documentation**: Swagger/OpenAPI
- **Validation**: Class-validator with DTOs

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd property-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start PostgreSQL (using Docker)**
   ```bash
   docker-compose up -d postgres
   ```

5. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # Seed demo data
   npm run db:seed
   ```

6. **Start the development server**
   ```bash
   npm run start:dev
   ```

7. **Access the API**
   - API: http://localhost:3000/api/v1
   - Documentation: http://localhost:3000/api/docs

### Demo Accounts

The seed script creates these demo accounts:

- **Super Admin**: admin@demoproperties.com / admin123
- **Org Admin**: orgadmin@demoproperties.com / admin123  
- **Entity Manager**: manager@sunsetproperties.com / admin123
- **Tenant**: tenant@example.com / admin123

## Project Structure

```
src/
├── auth/           # Authentication & authorization
├── users/          # User management
├── organizations/  # Organization management
├── entities/       # Entity (property owner) management
├── properties/     # Property management
├── spaces/         # Space/unit management
├── leases/         # Lease management
├── financials/     # Financial management
├── maintenance/    # Maintenance requests
├── reports/        # Reporting & analytics
├── prisma/         # Database service
└── common/         # Shared utilities, guards, decorators
```

## API Documentation

Once the server is running, visit http://localhost:3000/api/docs for interactive API documentation.

## Database Schema

The system uses a hierarchical structure:

- **Organization** (Property Management Company)
  - **Entities** (Property Owners - LLCs, individuals, etc.)
    - **Properties** (Buildings/complexes)
      - **Spaces** (Units/rooms)
        - **Leases** (Tenant agreements)

Each entity has its own financial tracking including bank ledgers, chart of accounts, and transaction history.

## Development

### Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run db:studio` - Open Prisma Studio
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with demo data

### Adding New Features

1. Create DTOs in the appropriate module's `dto/` folder
2. Implement service logic with proper error handling
3. Create controller endpoints with proper guards and validation
4. Add tests for new functionality
5. Update API documentation

## Deployment

### Environment Variables

Required environment variables for production:

```bash
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your-super-secret-jwt-key"
NODE_ENV="production"
PORT=3000
```

### Docker Deployment

```bash
# Build the application
npm run build

# Create production image
docker build -t property-management-system .

# Run with docker-compose
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.