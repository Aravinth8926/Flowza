import api from './api';
import { Product, ProductCreatePayload, ProductUpdatePayload, ProductListResponse, GenericResponse } from '../types';

export interface ProductQueryFilters {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    supplier_company_id?: string;
    is_active?: boolean;
}

export const productService = {
    createProduct: async (payload: ProductCreatePayload): Promise<GenericResponse<Product>> => {
        const response = await api.post('/api/v1/products', payload);
        return response.data;
    },

    getMyProducts: async (filters: ProductQueryFilters = {}): Promise<GenericResponse<ProductListResponse>> => {
        const response = await api.get('/api/v1/products/my', { params: filters });
        return response.data;
    },

    listProducts: async (filters: ProductQueryFilters = {}): Promise<GenericResponse<ProductListResponse>> => {
        const response = await api.get('/api/v1/products', { params: filters });
        return response.data;
    },

    getProductById: async (productId: string): Promise<GenericResponse<Product>> => {
        const response = await api.get(`/api/v1/products/${productId}`);
        return response.data;
    },

    updateProduct: async (productId: string, payload: ProductUpdatePayload): Promise<GenericResponse<Product>> => {
        const response = await api.patch(`/api/v1/products/${productId}`, payload);
        return response.data;
    },

    deleteProduct: async (productId: string): Promise<GenericResponse<null>> => {
        const response = await api.delete(`/api/v1/products/${productId}`);
        return response.data;
    },
};
