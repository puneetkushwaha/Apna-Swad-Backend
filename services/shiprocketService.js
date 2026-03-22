const axios = require('axios');

class ShiprocketService {
  constructor() {
    this.baseUrl = 'https://apiv2.shiprocket.in/v1/external';
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Generates a new JWT token using API user credentials.
   * Token is valid for 24 hours.
   */
  async authenticate() {
    try {
      if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.token;
      }

      const email = process.env.SHIPROCKET_EMAIL;
      const password = process.env.SHIPROCKET_PASSWORD;

      if (!email || !password) {
        throw new Error('Shiprocket credentials missing in environment variables (.env)');
      }

      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        email,
        password,
      });

      this.token = response.data.token;
      // Set expiry to slightly less than 24 hours to be safe
      this.tokenExpiry = new Date(new Date().getTime() + 23 * 60 * 60 * 1000);
      
      console.log('Shiprocket authenticated successfully');
      return this.token;
    } catch (error) {
      console.error('Shiprocket Authentication Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Creates a custom order in Shiprocket.
   */
  async createCustomOrder(orderData) {
    try {
      const token = await this.authenticate();
      
      const response = await axios.post(`${this.baseUrl}/orders/create/adhoc`, orderData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Shiprocket Create Order Error:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('Shiprocket Create Order API Details:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get tracking details for a specific shipment.
   */
  async getTrackingDetails(shipmentId) {
    try {
      const token = await this.authenticate();
      const response = await axios.get(`${this.baseUrl}/courier/track/shipment/${shipmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Shiprocket Tracking Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPickupLocation() {
    try {
      const token = await this.authenticate();
      const response = await axios.get(`${this.baseUrl}/settings/company/pickup`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data && response.data.data && response.data.data.shipping_address && response.data.data.shipping_address.length > 0) {
        return response.data.data.shipping_address[0].pickup_location;
      }
      return "Primary";
    } catch (error) {
      console.error('Error fetching pickup location:', error.response?.data || error.message);
      return "Primary";
    }
  }

  /**
   * Syncs a local order to Shiprocket.
   */
  async syncOrder(order, user) {
    try {
      const pickupLocation = await this.getPickupLocation();
      
      const orderData = {
        order_id: order._id.toString(),
        order_date: order.createdAt.toISOString().split('T')[0],
        pickup_location: pickupLocation,
        billing_customer_name: user.name || "Customer",
        billing_last_name: "",
        billing_address: order.shippingAddress.street,
        billing_city: order.shippingAddress.city,
        billing_pincode: order.shippingAddress.zipCode,
        billing_state: order.shippingAddress.state,
        billing_country: "India",
        billing_email: user.email,
        billing_phone: order.shippingAddress.phone || user.phone || "0000000000",
        shipping_is_billing: true,
        order_items: order.items.map(item => ({
          name: item.name,
          sku: item.product.toString(),
          units: item.quantity,
          selling_price: item.price,
          discount: 0,
          tax: 0,
          hsn: ""
        })),
        payment_method: order.paymentStatus === 'completed' ? "Prepaid" : "COD",
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: order.totalAmount,
        length: 10, // These should ideally be calculated or defined per product
        breadth: 10,
        height: 10,
        weight: 0.5
      };

      console.log('Syncing Order to Shiprocket:', orderData.order_id);
      const result = await this.createCustomOrder(orderData);
      
      if (result && result.shipment_id) {
        order.trackingId = result.shipment_id;
        order.shiprocketOrderId = result.order_id;
        order.carrierName = "Shiprocket";
        await order.save();
        console.log(`Order ${order._id} synced to Shiprocket. Shipment ID: ${result.shipment_id}, SR Order ID: ${result.order_id}`);
      }

      return result;
    } catch (error) {
      console.error('Shiprocket Sync Order Error:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('Shiprocket API Details:', JSON.stringify(error.response.data, null, 2));
      }
      return null;
    }
  }

  /**
   * Cancels a shipment in Shiprocket.
   * @param {string} orderId - The Shiprocket order ID (not our internal MongoDB ID, but we store internal ID as order_id in SR).
   * Note: SR API usually takes 'ids': [id1, id2] for cancellation.
   */
  async cancelShiprocketOrder(srOrderId) {
    try {
      const token = await this.authenticate();
      
      const response = await axios.post(`${this.baseUrl}/orders/cancel`, {
        ids: [srOrderId]
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Shiprocket Cancel Order Error:', error.response?.data || error.message);
      // Don't throw if it's already cancelled or not found
      if (error.response?.status === 404 || error.response?.status === 422) {
        return { message: 'Order already cancelled or not found on Shiprocket' };
      }
      throw error;
    }
  }

  /**
   * Updates an order address in Shiprocket.
   * Note: This usually requires specific fields.
   */
  async updateShiprocketOrderAddress(srOrderId, addressData) {
    try {
      const token = await this.authenticate();
      const response = await axios.post(`${this.baseUrl}/orders/update/adhoc`, {
        order_id: srOrderId,
        ...addressData
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Shiprocket Update Order Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generates shipping labels for one or more shipments.
   * @param {string|number|Array<string|number>} shipmentIds - One or more Shiprocket shipment IDs.
   */
  async generateLabel(shipmentIds) {
    try {
      const token = await this.authenticate();
      const ids = Array.isArray(shipmentIds) ? shipmentIds : [shipmentIds];
      const response = await axios.post(`${this.baseUrl}/courier/generate/label`, {
        shipment_id: ids
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Shiprocket Label Generation Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Gets available couriers for a shipment.
   */
  async getServiceability(order) {
    try {
      const token = await this.authenticate();
      const pickupPostcode = "226020"; // This should ideally be fetched from settings
      const deliveryPostcode = order.shippingAddress.zipCode;
      const weight = 0.5; // Default weight
      const cod = order.paymentStatus === 'completed' ? 0 : 1;
      
      const url = `${this.baseUrl}/courier/serviceability?pickup_postcode=${pickupPostcode}&delivery_postcode=${deliveryPostcode}&weight=${weight}&cod=${cod}&shipment_id=${order.trackingId}`;
      
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Shiprocket Serviceability Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Assigns an AWB to a shipment.
   */
  async assignAWB(shipmentId, courierId = null) {
    try {
      const token = await this.authenticate();
      const data = { shipment_id: shipmentId };
      if (courierId) data.courier_id = courierId;
      
      const response = await axios.post(`${this.baseUrl}/courier/assign/awb`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Shiprocket AWB Assignment Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generates an invoice for one or more orders.
   * @param {Array<string|number>} orderIds - Array of Shiprocket order IDs.
   */
  async generateInvoice(orderIds) {
    try {
      const token = await this.authenticate();
      // If we are passing our MongoDB IDs, we should ideally resolve them to SR IDs
      // But for simplicity, we assume caller passes correct IDs (SR IDs preferred)
      const response = await axios.post(`${this.baseUrl}/orders/print/invoice`, {
        ids: orderIds
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Shiprocket Invoice Generation Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to generate invoice from Shiprocket');
    }
  }

  async getSROrderIdByCustomId(customOrderId) {
    try {
      const token = await this.authenticate();
      const response = await axios.get(`${this.baseUrl}/orders?show_all=1&search=${customOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data && response.data.data && response.data.data.length > 0) {
        return response.data.data[0].id;
      }
      return null;
    } catch (error) {
      console.error('Search SR Order Error:', error.response?.data || error.message);
      return null;
    }
  }
}

module.exports = new ShiprocketService();
