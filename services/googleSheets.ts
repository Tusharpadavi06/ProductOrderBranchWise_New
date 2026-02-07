/**
 * FRONTEND SERVICE - WEB PORTAL SIDE
 * This service sends order data to the Google Apps Script Web App.
 */
import { BRANCH_CONFIG } from '../constants';

// EXACT URL provided by you for the latest deployment
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyZQABz5q9uXVgq5b5CcdBbH7t6vUy9zXTc_2jp30-3x7lMwI1AGkukVY3mZu5h9zeHEQ/exec';

export const submitToGoogleSheets = async (order: any): Promise<boolean> => {
  try {
    const url = GOOGLE_SCRIPT_URL.trim();
    if (!url || url.includes('your_deployed_web_app_url')) {
      console.error('Configuration Error: Google Script URL is not set correctly.');
      return false;
    }

    const branchInfo = BRANCH_CONFIG[order.branch] || { headEmail: 'admin@ginzalimited.com', headName: 'Administrator' };

    // Format data for the Google Sheet (Branch-wise tabs)
    const payload = order.items.map((item: any) => ({
      'Order No': order.id,
      'Timestamp': new Date().toLocaleString('en-IN'),
      'Customer PO': order.customerPONo || 'N/A',
      'Customer Name': order.customer?.name || 'N/A',
      'Customer Email': order.customer?.email || 'N/A',
      'Order Date': order.orderDate,
      'Unit (Category)': item.category, 
      'Item Name': item.itemName,
      'Color': item.color || 'STD',
      'Width': item.width || 'STD',
      'Unit (of item)': item.uom,
      'Qty': item.quantity,
      'Rate': item.rate,
      'Discount': item.discount || 0,
      'Delivery Date': item.dispatchDate,
      'Remark': item.remark || order.remark || 'N/A',
      'Customer Number': order.customer?.contact_no || 'N/A',
      'Billing Address': order.billingAddress || 'N/A',
      'Delivery Address': order.deliveryAddress || 'N/A',
      'Transporter Name': item.transportName || 'N/A',
      'Sales Person Name': order.salesPerson,
      'Account Status': order.accountStatus || 'Pending',
      'Branch': order.branch,
      'Approval Status': 'PENDING',
      'Branch Head Name': branchInfo.headName,
      'Branch Head Email': branchInfo.headEmail
    }));

    // Send POST request to Google Apps Script
    // 'no-cors' mode is required as GAS doesn't return standard CORS headers on POST.
    // However, if the network is down or URL is wrong, it will throw "Failed to fetch".
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // In 'no-cors' mode, we cannot check response.ok, so we assume success if no error is thrown
    return true;
  } catch (error) {
    console.error('Google Sheets Submission Error (Failed to Fetch):', error);
    return false;
  }
};