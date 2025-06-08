
# ExpenseFlow - Firebase Studio Project

ExpenseFlow is a comprehensive personal and group finance management application built with Next.js, React, ShadCN UI, Tailwind CSS, and Genkit (for AI features), all powered by Firebase. This project was developed iteratively with the assistance of an AI coding partner in Firebase Studio.

## Core Features Developed

### 1. User Management
- **Authentication**: Secure user signup, login, and logout using Firebase Authentication (email/password).
- **User Profiles**:
    - Firestore-backed user profiles storing display name, email, default currency.
    - Users can update their display name and default currency.
    - Password change functionality.
    - Account deletion (with re-authentication).

### 2. Expense Tracking
- **Manual Entry**: Add expenses with description, amount, currency, category, date, notes, and tags.
- **Recurring Expenses**: Option to mark expenses as recurring (daily, weekly, monthly, yearly) with an optional end date.
- **OCR Receipt Scanning**: Upload or capture receipt images; AI extracts details (merchant, date, amount, category) to pre-fill the expense form.
- **Multi-Currency**: Full support for multiple currencies in expenses, respecting user's default and allowing per-expense currency selection.
- **View & Manage**: List all expenses with filtering (search, date range, category, amount, group, currency) and sorting. Edit or delete existing expenses.

### 3. Income Tracking
- **Manual Entry**: Add income with source, amount, currency, date, and notes.
- **Multi-Currency**: Full support for multiple currencies in income records.
- **View & Manage**: List all income records. Edit or delete existing income.

### 4. Budgeting
- **Monthly Budgets**: Create, edit, and delete monthly budgets per category with a specific amount and currency.
- **Progress Tracking**: View budget progress against actual spending in the same currency and category for the current month.
- **Multi-Currency Awareness**: Alerts users if expenses in other currencies exist for a budgeted category, as they are not included in direct progress calculation.

### 5. Split Expenses (Personal)
- **Expense Selection**: Choose any personal (non-group) expense to split.
- **Participant Selection**: Select friends to include in the split.
- **Split Methods**:
    - **Equally**: Divides the amount evenly among selected participants.
    - **By Specific Amounts**: Manually enter the amount each participant owes.
    - **By Percentage**: Assign a percentage of the total to each participant.
- **Record Keeping**: Saved splits are viewable in a history section.
- **Settlement**:
    - Payers can mark amounts owed by others as settled.
    - Participants who owe can mark their share as paid (conceptual notification).
- **Edit & Delete**: Modify existing personal split details or delete split records.

### 6. Group Finance Management
- **Group Creation**: Create groups with a name and initial members from the friends list.
- **Member Management**:
    - View group members.
    - Add new members to the group (from friends list - creator only).
    - Remove members from the group (creator only).
    - Members can leave groups.
- **Group Details**:
    - Edit group name (creator only).
    - View expenses specifically assigned to the group.
    - Add new expenses directly associated with the group.
- **Group Expense Splitting**:
    - Option to split a group-associated expense *equally* among all current group members.
- **Balance Tracking**:
    - View individual member balances within the group (Paid for Group, Owes to Others, Net Balance) per currency.
    - Simplified "Who Owes Whom" summary for the group, broken down by currency.
- **Group Activity Log**: View a log of recent activities within the group (e.g., member added/removed, expense added, group name changed, settlements).

### 7. Friend Connections
- **Friend Requests**: Send requests to other users via email.
- **Request Management**: View incoming requests and accept or reject them.
- **Friends List**: View current friends.
- **Remove Friend**: Option to remove a connection.

### 8. Debt Overview
- **Consolidated View**: "Debts" page summarizing net balances (who owes whom) from *personal* (non-group) expense splits, broken down by currency.

### 9. Reminders
- **Creation**: Set reminders for bills or payments with title, notes, due date, and recurrence (none, daily, weekly, monthly, yearly).
- **Management**: View reminders sorted by status (overdue, due today, upcoming, completed). Edit, delete, or mark reminders as complete/pending.

### 10. Reporting & Dashboard
- **Dashboard**:
    - Quick overview: recent expenses, spending by top categories (bar chart with currency filter), and upcoming reminders.
    - Quick action buttons for common tasks.
- **Reports Page**:
    - Bar chart for spending by category.
    - Pie chart for category distribution.
    - Filters for time period (last 7/30 days, current month, all time, custom date range) and currency.
    - **AI-Powered Summary**: Generate a textual summary of spending habits, key spending areas, and potential savings suggestions for the selected period, with awareness of multi-currency data.
    - **CSV Export**: Export filtered expense data to a CSV file.

### 11. Application Settings & UI
- **Theme**: Light and Dark mode support.
- **Navigation**: Collapsible sidebar for app navigation.
- **User Preferences**: Set default currency for new entries.
- **Responsive Design**: Basic responsiveness for various screen sizes.
- **Notifications**: Toast notifications for user actions (success, error).
- **Form Validation**: Client-side validation using Zod.

---

## Future Enhancements Checklist

This list outlines potential features and improvements for future development:

### Core Functionality
-   [ ] **Currency Conversion & Advanced Aggregation**:
    -   [ ] Implement real-time or periodically updated currency conversion rates.
    -   [ ] Allow users to view aggregated reports/dashboard totals in a single preferred currency.
    -   [ ] Handle currency conversions during cross-currency splits or payments.
-   [ ] **Advanced Budgeting**:
    -   [ ] Support for different budget periods (weekly, yearly, custom).
    -   [ ] Budget rollover for unused/overspent amounts.
    -   [ ] Visual budget categories with icons.
    -   [ ] Budget vs. Actual spending charts per category.
-   [ ] **Advanced Group Features**:
    -   [ ] More sophisticated split methods within groups (by amount, percentage directly on group expense split dialog).
    -   [ ] Group-specific primary currency setting.
    -   [ ] Group savings goals or shared pots.
    -   [ ] Group invitations via link/email.
    -   [ ] Group expense settlement tracking and history.
    -   [ ] Group admin roles / transfer ownership.
-   [ ] **Investment & Asset Tracking**:
    -   [ ] Module to track investments (stocks, crypto, etc.).
    -   [ ] Net worth calculation and tracking.
-   [ ] **Advanced Debt Management**:
    -   [ ] Track loans and credit card debts separately with interest.
    -   [ ] Payment schedules and payoff calculators.
    -   [ ] Detailed debt settlement options (partial payments, record payment method).
-   [ ] **Recurring Transactions Automation**:
    -   [ ] Automatic creation of future instances of recurring expenses/income.
    -   [ ] Calendar view for upcoming recurring transactions.

### Reporting & Analytics
-   [ ] **Advanced Reports**:
    -   [ ] Net Income vs. Expense reports.
    -   [ ] Cash flow statements.
    -   [ ] Customizable report templates.
    -   [ ] More chart types (e.g., line charts for trends over time).
    -   [ ] Export reports to PDF.
-   [ ] **AI Enhancements**:
    -   [ ] AI-powered budget suggestions based on spending.
    -   [ ] Anomaly detection in spending patterns.
    -   [ ] Natural language queries for financial data.
    -   [ ] AI image generation for categories or receipt placeholders.

### User Experience & UI
-   [ ] **Internationalization (i18n) & Localization (l10n)**: Support for multiple languages and regional formats.
-   [ ] **Enhanced Accessibility (WCAG)**: Improve compliance for users with disabilities.
-   [ ] **Improved Loading States**: Implement skeleton loaders for a smoother experience.
-   [ ] **In-App Tutorials/Onboarding**: Guide new users through features.
-   [ ] **Customizable Dashboard**: Allow users to rearrange or choose widgets.
-   [ ] **Push Notifications**: For reminders, group activity, etc. (requires service worker/native capabilities).
-   [ ] **Bulk Data Operations**:
    -   [ ] Bulk edit/delete of expenses/income.
    -   [ ] Import data from CSV/OFX.

### Integrations & Backend
-   [ ] **Bank Account Linking**: Plaid integration for (read-only) transaction import.
-   [ ] **Firebase Functions**: Implement backend functions for:
    -   Automated data cleanup (e.g., on user deletion if desired).
    -   Processing recurring transactions.
    -   Complex calculations or notifications.
-   [ ] **Enhanced Security**:
    -   [ ] Two-Factor Authentication (2FA).
    -   [ ] Audit logs for sensitive actions.
-   [ ] **Offline Enhancements**: More robust offline capabilities beyond Firestore's default caching.
-   [ ] **Data Management**: User-initiated data backup and restore options.
