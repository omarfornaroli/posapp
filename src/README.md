# Firebase Studio - POSAPP

This is a NextJS starter in Firebase Studio, evolved into a Point of Sale Application (POSAPP).

## Getting Started

There are two primary ways to run this application: locally using Node.js or in a containerized environment using Docker.

### Running with Docker (Recommended)

Using Docker is the recommended method as it sets up both the application and a MongoDB database in a consistent environment with a single command.

**Prerequisites:**
- Docker and Docker Compose must be installed on your system.

**Steps:**
1.  Ensure Docker is running on your machine.
2.  Open a terminal in the root directory of the project.
3.  Run the following command:
    ```bash
    docker-compose up --build
    ```
4.  The application will be available at `http://localhost:9002`. The MongoDB database will be accessible on `localhost:27017`.

The Docker configuration uses a volume for the MongoDB data, so your data will persist across container restarts.

### Running Locally

**Prerequisites:**
- Node.js (v18 or later recommended)
- A running MongoDB instance.

**Steps:**
1.  Install project dependencies:
    ```bash
    npm install
    ```
2.  Create a `.env.local` file in the root directory and add your MongoDB connection string:
    ```env
    MONGODB_URI=mongodb://localhost:27017/posapp
    LOAD_DEMO_DATA=true # Optional: set to false for a clean database
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
4.  The application will typically be available at `http://localhost:9002`.

### Building and Running for Production

To test the application in a production-like environment (which enables features like the PWA service worker), follow these steps:

1.  **Build the Application**: This command compiles and optimizes your app for production.
    ```bash
    npm run build
    ```

2.  **Start the Production Server**: This command starts a server to serve the built application.
    ```bash
    npm run start
    ```
3. The application will be available at `http://localhost:9002`.

**Note:** The PWA features, including the service worker and caching, are disabled in development mode (`npm run dev`) by default. You must run the production build to test them.

## Features Overview

The POSAPP is designed to provide a comprehensive solution for managing sales, inventory, and related business operations. Below is an overview of its key features:

### 1. Point of Sale (POS)
- **Intuitive Interface**: Easily add products to a cart via barcode scanning, live search, or a product grid (future).
- **Cart Management**: Update item quantities, remove items, and clear the cart.
- **Client Association**: Assign sales to existing clients or process as walk-in customer sales.
- **Discounts**:
    - **Item-level discounts**: Apply percentage or fixed amount discounts to individual items in the cart.
    - **Overall sale discounts**: Apply a percentage or fixed amount discount to the entire sale subtotal.
- **Promotions**: Automatic application of active promotions based on configured conditions (e.g., minimum sell amount, specific products/categories, client, payment methods).
- **Tax Calculation**: Apply multiple taxes to the taxable amount.
- **Payment Processing**:
    - Support for multiple payment methods (e.g., Cash, Credit Card).
    - Split payments across different methods.
- **Receipt Generation**: Generate and display a detailed receipt after each successful transaction.
- **Continuous Scan Mode**: Efficiently scan multiple product barcodes consecutively.
- **State Persistence**: The POS cart, selected client, applied taxes, and some other settings are persisted in local storage to survive page reloads.

### 2. Product Management
- **CRUD Operations**: Add, view, edit, and delete products.
- **Detailed Product Information**: Manage fields like name, category, product group, SKU, barcode, price, cost, stock quantity, supplier, measurement unit, description, image URL, and various behavioral flags (e.g., `isService`, `isEnabled`, `isPriceChangeAllowed`).
- **Inventory Tracking**: Includes quantity, reorder points, and low stock warnings.
- **Import/Export**:
    - **Export**: Export all products to a JSON file.
    - **Import**: Import products from JSON or CSV files, with conflict resolution (skip/overwrite) and default category assignment.
- **Customizable Grid View**:
    - Show/hide columns.
    - Reorder columns.
    - Sort by any sortable column.
    - Group products by multiple criteria (e.g., category, then supplier).
    - Save and load custom grid configurations/templates.

### 3. Client Management
- **CRUD Operations**: Add, view, edit, and delete client records.
- **Client Details**: Manage client name, email, phone, and address.
- **Registration Date**: Automatically tracked.
- **Real-time Updates**: Client list updates in real-time.

### 4. Sales Reports
- **Transaction History**: View a list of all past sale transactions.
- **Date Range Filtering**: Filter sales by a specific date range.
- **Sortable Data**: Sort transactions by ID, date, client, items, subtotal, tax, or total amount.
- **Data Export**: Export filtered sales data to a JSON file.
- **Real-time Updates**: Sales list updates in real-time.

### 5. Promotions Management
- **CRUD Operations**: Add, view, edit, and delete promotions.
- **Flexible Discount Types**: Percentage or fixed amount discounts.
- **Date-Based Activation**: Define start and optional end dates for promotions.
- **Complex Conditions**:
    - Minimum sell amount.
    - Specific product IDs or categories.
    - Specific client IDs.
    - Specific payment methods used.
- **Active/Inactive Status**: Toggle promotions on or off.
- **Real-time Updates**: Promotions list updates in real-time.

### 6. Tax Management
- **CRUD Operations**: Add, view, edit, and delete tax rates.
- **Tax Details**: Manage tax name, rate (as a percentage), and description.
- **Real-time Updates**: Tax list updates in real-time.

### 7. Payment Methods Management
- **CRUD Operations**: Add, view, edit, and delete payment methods.
- **Method Details**: Manage name, description, enabled status, and set a default payment method.
- **Real-time Updates**: Payment methods list updates in real-time.

### 8. User Management
- **CRUD Operations**: Add, view, edit, and delete users.
- **User Details**: Manage user name, email, role, and profile image URL.
- **Role Assignment**: Assign predefined roles (Admin, Editor, Viewer).
- **Join Date**: Automatically tracked.
- **Real-time Updates**: User list updates in real-time.

### 9. Roles & Permissions Management
- **View Permissions**: Display all system roles and their currently assigned permissions.
- **Edit Permissions**: Dynamically modify permissions for Editor and Viewer roles (Admin role permissions are fixed).
- **Granular Control**: Manage access to various application features and pages.
- **Real-time Updates**: Role permission data updates in real-time.

### 10. Theme Management
- **Multiple Themes**: Supports multiple pre-defined and user-added themes.
- **Theme Customization**: Edit theme name, fonts (body and headline), and a full palette of HSL-based colors (primary, secondary, accent, background, foreground, card, etc.).
- **Default Theme**: Set any theme as the application-wide default. Changes apply after page refresh.
- **Random Theme Generation**: Quickly add new themes with randomized color palettes and fonts.
- **Real-time Updates**: Theme list updates in real-time.

### 11. Translations Management
- **Centralized Editing**: View and edit all translation keys for active languages directly from the UI.
- **Multi-Locale Support**: Displays input fields for each active language.
- **Real-time Updates**: Changes saved to the database are reflected, and the `useRxTranslate` hook ensures UI components can react to live translation updates.
- **Database-Driven**: Translations are primarily sourced from the database, with JSON files as fallbacks.

### 12. Languages Management
- **Dynamic Language Configuration**: Add, edit, and delete application languages.
- **Enable/Disable Languages**: Control which languages are available to users.
- **Set Default Language**: Designate one language as the application's default.
- **Configuration File Update**: An "Apply & Update Config File" action regenerates `src/i18n-config.ts` based on database settings, which then requires a server restart to take full effect on routing and middleware.
- **Real-time Updates**: Language list updates in real-time.

### 13. Countries Management
- **CRUD Operations**: Add, edit, and delete country records.
- **Country Details**: Manage name, ISO codes (Alpha-2, Alpha-3, Numeric), default currency code, and flag image URL.
- **Enable/Disable & Default**: Control active countries and set a default country for the application.
- **Real-time Updates**: Country list updates in real-time.

### 14. Currencies Management
- **CRUD Operations**: Add, edit, and delete currencies.
- **Currency Details**: Manage name, ISO code, symbol, decimal places, and exchange rate (optional).
- **Enable/Disable & Default**: Control active currencies and set a default currency.
- **Real-time Updates**: Currency list updates in real-time.

### 15. Settings
- **Receipt Customization**:
    - Configure logo URL, footer text, company name, address, and phone.
    - Control visibility of various sections on the receipt (company info, client info, item barcodes, discount summary, promotions, payment details).
    - Set default receipt width (auto, 80mm, 58mm) and margin.
    - Live preview of receipt changes.
- **Real-time Updates**: Receipt settings update in real-time.

### 16. Notifications System
- **Real-time Alerts**: In-app notifications for various system events (e.g., entity creation/update/deletion, errors, system messages).
- **Notification Bell**: Header component displays unread notification count and provides a dropdown to view recent notifications.
- **Mark as Read**: Users can mark individual notifications as read.
- **Actionable Notifications**: Some notifications include links to relevant pages.
- **Actor Information**: Notifications can display information about the user or system process that triggered them.
- **Notifications Manager Page**: A dedicated page to view, manage, and delete all notifications, with pagination.

## Tech Stack
- **Next.js**: React framework for server-side rendering and static site generation.
- **React**: JavaScript library for building user interfaces.
- **TypeScript**: Superset of JavaScript adding static typing.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **ShadCN UI**: Re-usable UI components built with Radix UI and Tailwind CSS.
- **MongoDB**: NoSQL database used for data persistence.
- **Mongoose**: ODM for MongoDB in Node.js.
- **Genkit (for AI)**: Not yet explicitly used but set up for future AI features.
- **Next-Intl**: For internationalization (i18n).
- **Zod**: TypeScript-first schema declaration and validation.
- **React Hook Form**: For managing form state and validation.
- **Lucide React**: Icon library.
- **RxJS**: For reactive programming, especially used in the translation service.