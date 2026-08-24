import api from './api';
import type {
    Cart,
    CartListResponse,
    CheckoutPayload,
    CheckoutResult,
} from '../types';

export interface CartApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

const cartService = {
    // List all supplier-specific carts for the authenticated vendor
    listCarts: async (): Promise<CartApiResponse<CartListResponse>> => {
        const res = await api.get('/carts');
        return res.data;
    },

    // Get a specific cart
    getCart: async (cartId: string): Promise<CartApiResponse<Cart>> => {
        const res = await api.get(`/carts/${cartId}`);
        return res.data;
    },

    // Add a product to cart (supplier derived automatically)
    addToCart: async (productId: string): Promise<CartApiResponse<Cart>> => {
        const res = await api.post('/carts/items', { product_id: productId });
        return res.data;
    },

    // Update cart item quantity
    updateItem: async (itemId: string, quantity: number): Promise<CartApiResponse<Cart>> => {
        const res = await api.patch(`/carts/items/${itemId}`, { quantity });
        return res.data;
    },

    // Remove item from cart
    removeItem: async (itemId: string): Promise<CartApiResponse<Cart>> => {
        const res = await api.delete(`/carts/items/${itemId}`);
        return res.data;
    },

    // Clear all items from a cart
    clearCart: async (cartId: string): Promise<CartApiResponse<null>> => {
        const res = await api.delete(`/carts/${cartId}`);
        return res.data;
    },

    // Checkout a supplier-specific cart
    checkout: async (cartId: string, payload: CheckoutPayload): Promise<CartApiResponse<CheckoutResult>> => {
        const res = await api.post(`/carts/${cartId}/checkout`, payload);
        return res.data;
    },
};

export default cartService;
