---
description: Stock Management Workflow (Vendor to Admin)
---

# Stock Management Workflow

This workflow outlines the process for stock requests from shopkeepers and their fulfillment by administrators.

## 1. Shopkeeper Actions (Vendor Desk)
- **Daily Reporting**: Shopkeepers log into the "Vendor Desk" and enter daily sales data.
- **Stock Request**:
    - Shopkeeper opens the "Request Stock" modal.
    - Fills in Product Name, Quantity, Unit, Current Stock, and Preferred Delivery Time.
    - Submission saves the request with a "Requested" status.
- **Tracking**: View real-time status updates in the "Recent Requests" section.

## 2. Admin Actions (Admin Portal)
- **Review**: Admin navigates to the "Stock Requests" page.
- **Verification**: Admin reviews vendor details and AI-driven demand suggestions.
- **Fulfillment**:
    - Admin clicks "Manage Request".
    - Modifies quantity if necessary.
    - Assigns a Supplier (from the Vendors list).
    - Schedules actual delivery date/time.
- **Status Update**: Admin moves status to "Approved", "In Transit", or "Delivered".

## 3. System Integration & Data Tracking
- **Notifications**: System triggers UI notifications for shopkeepers on status changes.
- **Inventory Sync**: Upon "Delivered" status, the shopkeeper's inventory is automatically updated.
- **Analytics**: All data is archived for demand prediction and performance reporting.
