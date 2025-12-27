# Firebase Studio - POSIFY

This is a NextJS starter in Firebase Studio, evolved into a Point of Sale Application (POSIFY).

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
    MONGODB_URI=mongodb://localhost:27017/posify
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
3. The application will be available at `http://localhost:3000` by default.

**Note:** The PWA features, including the service worker and caching, are disabled in development mode (`npm run dev`) by default. You must run the production build to test them.


## Features Overview

The POSIFY is designed to provide a comprehensive solution for managing sales, inventory, and related business operations. Below is an overview of its key features:

### 1. Point of Sale (POS)
- **Intuitive Interface**: Easily add products to a cart via barcode scanning, live search, or a product grid.
- **Cart Management**: Update item quantities, remove items, and clear the cart.
- **Client Association**: Assign sales to existing clients or process as walk-in customer sales.
- **Discounts**:
    - **Item-level discounts**: Apply percentage or fixed amount discounts to individual items in the cart.
    - **Overall sale discounts**: Apply a percentage or fixed amount discount to the entire sale subtotal.
- **Promotions**: Automatic application of active promotions based on configured conditions.
- **Tax Calculation**: Apply multiple taxes to the taxable amount.
- **Payment Processing**:
    - Support for multiple payment methods (e.g., Cash, Credit Card).
    - Split payments across different methods.
- **Receipt Generation**: Generate and display a detailed receipt after each successful transaction.
- **Continuous Scan Mode**: Efficiently scan multiple product barcodes consecutively.
- **State Persistence**: The POS cart, selected client, applied taxes, and other settings are persisted in local storage to survive page reloads.

### 2. Returns Management
- **Find Original Sale**: Easily locate the original transaction by its ID to process a return.
- **Itemized Returns**: Select specific items and quantities from the original sale to return.
- **Stock Replenishment**: Returned items (that are not services) automatically have their stock quantity increased.
- **Reason & Notes**: Add a reason and notes to each return for record-keeping.
- **Refund Calculation**: Automatically calculates the total refund amount based on the items being returned.

### 3. Product Management
- **CRUD Operations**: Add, view, edit, and delete products.
- **Detailed Product Information**: Manage fields like name, category, SKU, barcode, price, cost, stock quantity, supplier, and various behavioral flags.
- **Inventory Tracking**: Includes quantity, reorder points, and low stock warnings.
- **Advanced Import/Export**:
    - **Export**: Export all products to JSON, CSV, or XLSX formats.
    - **Import**: Import products from CSV or Excel files with an advanced column mapping interface and conflict resolution (skip/overwrite).
- **Customizable Grid View**: Show/hide columns, reorder, sort, and group products by various criteria.

### 4. Client Management
- **CRUD Operations**: Add, view, edit, and delete client records.
- **Client Details**: Manage client name, email, phone, and address.
- **Real-time Updates**: Client list updates in real-time across the app.

### 5. Reports & Analytics
- **Standard Reports**:
    - **Sales Report**: Filter transaction history by date range, client, payment method, dispatch status, and product category.
    - **Products, Suppliers, Promotions**: View filterable and sortable lists of all catalog data.
    - **Returns Report**: View a complete history of all processed returns.
    - **Profit Margin Report**: Analyze profitability with metrics like total revenue, cost of goods sold, and gross profit.
- **AI-Powered Reports**:
    - **Natural Language Queries**: Generate complex, custom reports by simply describing what you want to see (e.g., "show me the top 5 selling products this month").
    - **AI Summary**: Get a concise, AI-generated summary of the key findings in your report.
    - **Data Export**: Download AI-generated reports as PDF or JSON.
    - **Saved Reports**: Save generated reports for later viewing.

### 6. Catalog & Business Rules
- **Promotions Management**: Create complex, condition-based promotions (e.g., minimum purchase, specific products, client groups).
- **Tax Management**: Configure multiple tax rates.
- **Payment Methods Management**: Define and manage accepted payment methods.
- **Supplier Management**: Keep a directory of suppliers and update product costs from an external file (e.g., a supplier's price list).

### 7. Administration & System
- **User Management**: Add, edit, and delete users. Invite new users via email to set up their accounts.
- **Roles & Permissions Management**: Granularly control user access by assigning permissions to roles (Admin, Editor, Viewer).
- **Theme Management**: Customize the application's look and feel with multiple themes, editable colors, and fonts.
- **Multi-Language Support**:
    - **Language Management**: Dynamically add, enable/disable, and set default languages for the application.
    - **Translations Manager**: Edit all translation keys for all active languages in a centralized UI.
    - **AI Auto-Translation**: Automatically translate all application text to a new language when it's added.
- **Settings**:
    - **Receipt Customization**: Configure receipt logo, footer text, and section visibility.
    - **POS Behaviors**: Customize session duration, authorization requirements, and default dispatch behavior.
    - **SMTP & AI Configuration**: Manage API keys and server settings for email and AI services.

### 8. Notifications System
- **Real-time Alerts**: In-app notifications for various system events (e.g., entity creation/update/deletion, errors, system messages).
- **Notification Bell**: Header component displays unread notification count and a dropdown to view recent notifications.
- **Notifications Manager**: A dedicated page to view and manage all notifications.

## Tech Stack
- **Next.js**: React framework for server-side rendering and static site generation.
- **React**: JavaScript library for building user interfaces.
- **TypeScript**: Superset of JavaScript adding static typing.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **ShadCN UI**: Re-usable UI components built with Radix UI and Tailwind CSS.
- **MongoDB**: NoSQL database used for data persistence.
- **Mongoose**: ODM for MongoDB in Node.js.
- **Genkit (for AI)**: For AI-powered reporting and translation features.
- **Next-Intl**: For internationalization (i18n), powered by a custom database-driven translation service.
- **Dexie.js**: For robust client-side (IndexedDB) storage and offline capabilities.
- **Zod**: TypeScript-first schema declaration and validation.
- **React Hook Form**: For managing form state and validation.
- **Lucide React**: Icon library.
- **RxJS**: For reactive programming, especially used in the translation service.
