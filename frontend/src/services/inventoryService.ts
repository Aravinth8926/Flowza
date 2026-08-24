import api from './api';
import type {
    InventoryRecord,
    InventoryListResponse,
    InventoryUpdatePayload,
    InventoryAdjustPayload,
} from '../types';

export interface InventoryApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

const inventoryService = {
    listMyInventory: async (page = 1, limit = 50): Promise<InventoryApiResponse<InventoryListResponse>> => {
        const res = await api.get('/inventory', { params: { page, limit } });
        return res.data;
    },

    getInventory: async (productId: string): Promise<InventoryApiResponse<InventoryRecord>> => {
        const res = await api.get(`/inventory/${productId}`);
        return res.data;
    },

    updateInventory: async (
        productId: string,
        payload: InventoryUpdatePayload,
    ): Promise<InventoryApiResponse<InventoryRecord>> => {
        const res = await api.patch(`/inventory/${productId}`, payload);
        return res.data;
    },

    adjustStock: async (
        productId: string,
        payload: InventoryAdjustPayload,
    ): Promise<InventoryApiResponse<InventoryRecord>> => {
        const res = await api.post(`/inventory/${productId}/adjust`, payload);
        return res.data;
    },
};

export default inventoryService;
