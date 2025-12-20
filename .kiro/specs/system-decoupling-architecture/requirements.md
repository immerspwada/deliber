# Requirements Document: System Decoupling Architecture

## Introduction

The Thai Ride Hailing App currently suffers from "Siloed Development" where features are implemented partially and do not function cohesively across all required roles (Customer, Provider/Rider, Admin). This specification defines a comprehensive architectural refactoring to ensure every feature follows the "4-Layer Impact" rule, creating a truly integrated multi-role platform.

## Glossary

- **System**: The Thai Ride Hailing Platform
- **Customer**: End-user who requests services (rides, delivery, shopping, etc.)
- **Provider**: Service provider (Driver, Rider, Shopper, Mover, Laundry Provider)
- **Admin**: Platform administrator with full system access
- **Service_Entity**: Any bookable service (Ride, Delivery, Shopping, Queue, Moving, Laundry)
- **Cross_Role_Visibility**: The ability for data created by one role to be visible and actionable by other roles
- **4_Layer_Impact**: The architectural pattern requiring Database, Business Logic, API, and Cross-Role Visibility for every feature
- **Atomic_Operation**: Database operation that ensures data consistency across all roles
- **Real_Time_Sync**: Live data synchronization between roles using Supabase Realtime
- **RBAC**: Role-Based Access Control ensuring proper data access per role
- **Holistic_Integration**: Complete feature implementation across all affected roles

## Requirements

### Requirement 1: Unified Service Architecture

**User Story:** As a system architect, I want all service types to follow a consistent architectural pattern, so that features work uniformly across Customer, Provider, and Admin roles.

#### Acceptance Criteria

1. WHEN a new service type is added, THE System SHALL implement all 4 layers (Database, Business Logic, API, Cross-Role Visibility)
2. WHEN a Customer creates a service request, THE System SHALL make it immediately visible to eligible Providers and Admin
3. WHEN a Provider updates service status, THE System SHALL sync the update to Customer and Admin in real-time
4. WHERE any service entity exists, THE System SHALL enforce consistent status flow (pending → matched → in_progress → completed)
5. THE System SHALL maintain referential integrity between users, service_providers, and all service request tables

### Requirement 2: Database Layer Completeness

**User Story:** As a database architect, I want every feature to have complete schema support with proper relationships, so that all roles can access and modify data according to their permissions.

#### Acceptance Criteria

1. WHEN a service request table is created, THE System SHALL include foreign keys for customer_id, provider_id, and all required metadata
2. THE System SHALL implement RLS policies for each role (customer reads own, provider reads assigned/available, admin reads all)
3. WHEN a status change occurs, THE System SHALL use atomic functions to prevent race conditions
4. THE System SHALL enable Realtime subscriptions on all service request tables
5. THE System SHALL maintain audit trails for all critical state changes
6. WHEN relationships are defined, THE System SHALL use CASCADE or SET NULL appropriately to maintain data integrity

### Requirement 3: Business Logic Decoupling

**User Story:** As a developer, I want business logic separated into role-specific composables, so that each role has clear, maintainable code without duplication.

#### Acceptance Criteria

1. THE System SHALL organize composables by role (useCustomer*, useProvider*, useAdmin*)
2. WHEN business logic is shared, THE System SHALL extract it into shared utilities (useServices, useRealtime)
3. THE System SHALL NOT duplicate database queries across role-specific composables
4. WHEN a composable is created, THE System SHALL document which database tables and functions it uses
5. THE System SHALL implement error handling consistently across all composables

### Requirement 4: Unified API Construction

**User Story:** As an API consumer, I want consistent endpoints for each role, so that I can predict how to interact with any service type.

#### Acceptance Criteria

1. WHEN a Customer creates a service request, THE System SHALL provide a POST endpoint with standard request format
2. WHEN a Provider queries available jobs, THE System SHALL provide a GET endpoint filtered by location and service type
3. WHEN a Provider accepts a job, THE System SHALL provide a PUT endpoint with atomic acceptance logic
4. WHEN an Admin queries all requests, THE System SHALL provide a GET endpoint with filtering and pagination
5. THE System SHALL enforce RBAC on all endpoints using RLS policies
6. WHEN status updates occur, THE System SHALL validate state transitions before persisting

### Requirement 5: Cross-Role Real-Time Visibility

**User Story:** As a platform user, I want to see updates from other roles in real-time, so that I always have current information about my services.

#### Acceptance Criteria

1. WHEN a Customer creates a request, THE System SHALL notify nearby Providers via Realtime subscription
2. WHEN a Provider accepts a request, THE System SHALL notify the Customer via Realtime subscription
3. WHEN a Provider updates status, THE System SHALL sync to Customer and Admin via Realtime
4. WHEN an Admin modifies a request, THE System SHALL notify affected Customer and Provider
5. THE System SHALL implement Realtime channels per service type (ride_requests, delivery_requests, etc.)
6. WHEN network connectivity is lost, THE System SHALL queue updates and sync when reconnected

### Requirement 6: Provider Job Pool Architecture

**User Story:** As a Provider, I want to see all available jobs in my area for my service types, so that I can choose which jobs to accept.

#### Acceptance Criteria

1. WHEN a Provider is online, THE System SHALL show pending requests within their service radius
2. THE System SHALL filter jobs by Provider's enabled service types (ride, delivery, shopping, etc.)
3. WHEN multiple Providers view the same job, THE System SHALL use atomic acceptance to prevent double-booking
4. WHEN a job is accepted by another Provider, THE System SHALL remove it from all other Providers' views
5. THE System SHALL sort available jobs by distance, time, or earnings potential

### Requirement 7: Admin Omniscient Dashboard

**User Story:** As an Admin, I want complete visibility and control over all services, so that I can monitor and manage the platform effectively.

#### Acceptance Criteria

1. THE Admin SHALL view all service requests regardless of status or role
2. THE Admin SHALL modify service status with proper audit logging
3. THE Admin SHALL cancel services and issue refunds
4. THE Admin SHALL view real-time Provider locations and availability
5. THE Admin SHALL access detailed analytics for all service types
6. WHEN Admin makes changes, THE System SHALL notify affected Customer and Provider

### Requirement 8: Atomic State Transitions

**User Story:** As a system engineer, I want all state changes to be atomic, so that race conditions and data inconsistencies are prevented.

#### Acceptance Criteria

1. WHEN a Provider accepts a request, THE System SHALL use an atomic function that checks availability and updates status in one transaction
2. WHEN a request is cancelled, THE System SHALL atomically update status, refund wallet, and notify all parties
3. WHEN a request is completed, THE System SHALL atomically update status, transfer earnings, and trigger rating requests
4. THE System SHALL prevent invalid state transitions (e.g., completed → pending)
5. WHEN concurrent updates occur, THE System SHALL use database locks or optimistic locking

### Requirement 9: Notification Orchestration

**User Story:** As a platform user, I want to receive timely notifications about service updates, so that I stay informed about my requests.

#### Acceptance Criteria

1. WHEN a service status changes, THE System SHALL send push notifications to affected parties
2. WHEN a Provider is matched, THE System SHALL notify Customer with Provider details
3. WHEN a Customer cancels, THE System SHALL notify the assigned Provider
4. WHEN a service is completed, THE System SHALL send rating request notifications
5. THE System SHALL support notification preferences per user (push, SMS, email)

### Requirement 10: Service Type Extensibility

**User Story:** As a product manager, I want to easily add new service types, so that the platform can grow without major refactoring.

#### Acceptance Criteria

1. WHEN a new service type is added, THE System SHALL provide a template migration script
2. THE System SHALL support service-specific metadata (e.g., package_size for delivery, helpers_count for moving)
3. WHEN a new service is added, THE System SHALL automatically integrate with existing Provider, Customer, and Admin flows
4. THE System SHALL maintain a service registry documenting all available service types
5. THE System SHALL support service-specific pricing calculations

### Requirement 11: Error Recovery and Resilience

**User Story:** As a system operator, I want the system to gracefully handle failures, so that users experience minimal disruption.

#### Acceptance Criteria

1. WHEN a database operation fails, THE System SHALL rollback partial changes and notify the user
2. WHEN Realtime connection drops, THE System SHALL queue updates and sync when reconnected
3. WHEN a Provider goes offline mid-service, THE System SHALL reassign the request or notify Customer
4. THE System SHALL implement retry logic with exponential backoff for transient failures
5. THE System SHALL log all errors with context for debugging

### Requirement 12: Performance and Scalability

**User Story:** As a system architect, I want the architecture to scale efficiently, so that the platform can handle growth.

#### Acceptance Criteria

1. WHEN querying available jobs, THE System SHALL use spatial indexes for location-based filtering
2. THE System SHALL implement pagination for all list endpoints
3. WHEN multiple Providers query jobs, THE System SHALL cache results appropriately
4. THE System SHALL use database connection pooling to handle concurrent requests
5. THE System SHALL monitor query performance and optimize slow queries

### Requirement 13: Data Consistency Validation

**User Story:** As a quality engineer, I want automated validation of data consistency, so that cross-role data integrity is maintained.

#### Acceptance Criteria

1. THE System SHALL validate that every service request has a valid customer_id
2. WHEN a request is matched, THE System SHALL validate that provider_id exists and is active
3. THE System SHALL prevent orphaned records (requests without customers, ratings without requests)
4. THE System SHALL run periodic consistency checks and report anomalies
5. WHEN inconsistencies are found, THE System SHALL provide Admin tools to resolve them

### Requirement 14: Migration Strategy

**User Story:** As a DevOps engineer, I want a clear migration path from the current siloed architecture, so that we can refactor safely.

#### Acceptance Criteria

1. THE System SHALL provide a migration plan that can be executed incrementally
2. WHEN refactoring a service type, THE System SHALL maintain backward compatibility during transition
3. THE System SHALL include rollback procedures for each migration step
4. THE System SHALL validate data integrity after each migration
5. THE System SHALL document breaking changes and required code updates

### Requirement 15: Testing and Validation Framework

**User Story:** As a QA engineer, I want comprehensive tests for cross-role interactions, so that I can verify the system works holistically.

#### Acceptance Criteria

1. THE System SHALL include integration tests that simulate Customer → Provider → Admin flows
2. WHEN a feature is implemented, THE System SHALL test all 4 layers (Database, Logic, API, Visibility)
3. THE System SHALL test race conditions (multiple Providers accepting same job)
4. THE System SHALL test network failure scenarios and recovery
5. THE System SHALL include property-based tests for state transition validity
