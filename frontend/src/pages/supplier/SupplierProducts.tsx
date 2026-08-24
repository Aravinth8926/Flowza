import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Textarea } from '../../components/ui/Textarea';
import { productService } from '../../services/productService';
import { Product, ProductCreatePayload, ProductUpdatePayload } from '../../types';
import { toast } from 'sonner';
import {
    Package,
    Plus,
    Search,
    Edit2,
    Trash2,
    Power,
    PowerOff,
    Tag,
    DollarSign,
    Layers,
    Image as ImageIcon,
} from 'lucide-react';

export const SupplierProducts: React.FC = () => {
    const queryClient = useQueryClient();

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const limit = 10;

    // Modals state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Form states
    const [formData, setFormData] = useState<ProductCreatePayload>({
        name: '',
        sku: '',
        description: '',
        category: '',
        price: 0,
        unit: 'units',
        image_url: '',
        is_active: true,
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // Fetch Products Query
    const { data: productsData, isLoading, isError } = useQuery({
        queryKey: ['my-products', page, searchQuery, categoryFilter, activeFilter],
        queryFn: async () => {
            const activeParam = activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined;
            const res = await productService.getMyProducts({
                page,
                limit,
                search: searchQuery || undefined,
                category: categoryFilter || undefined,
                is_active: activeParam,
            });
            return res.data;
        },
    });

    // Create Product Mutation
    const createMutation = useMutation({
        mutationFn: (payload: ProductCreatePayload) => productService.createProduct(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-products'] });
            toast.success('Product created successfully!');
            setIsAddModalOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            const errMsg = error.response?.data?.error?.message || 'Failed to create product';
            toast.error(errMsg);
        },
    });

    // Update Product Mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ProductUpdatePayload }) =>
            productService.updateProduct(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-products'] });
            toast.success('Product updated successfully!');
            setIsEditModalOpen(false);
            setSelectedProduct(null);
            resetForm();
        },
        onError: (error: any) => {
            const errMsg = error.response?.data?.error?.message || 'Failed to update product';
            toast.error(errMsg);
        },
    });

    // Delete Product Mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => productService.deleteProduct(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-products'] });
            toast.success('Product deleted successfully!');
        },
        onError: (error: any) => {
            const errMsg = error.response?.data?.error?.message || 'Failed to delete product';
            toast.error(errMsg);
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            sku: '',
            description: '',
            category: '',
            price: 0,
            unit: 'units',
            image_url: '',
            is_active: true,
        });
        setFormErrors({});
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!formData.name.trim()) {
            errors.name = 'Product Name is required';
        }
        if (formData.price < 0) {
            errors.price = 'Price must be greater than or equal to 0';
        }
        if (!formData.unit.trim()) {
            errors.unit = 'Unit is required';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        createMutation.mutate(formData);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm() || !selectedProduct) return;
        updateMutation.mutate({ id: selectedProduct.id, payload: formData });
    };

    const handleOpenEdit = (product: Product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            sku: product.sku || '',
            description: product.description || '',
            category: product.category || '',
            price: product.price,
            unit: product.unit,
            image_url: product.image_url || '',
            is_active: product.is_active,
        });
        setIsEditModalOpen(true);
    };

    const handleToggleActive = (product: Product) => {
        updateMutation.mutate({
            id: product.id,
            payload: { is_active: !product.is_active },
        });
    };

    const handleDelete = (productId: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            deleteMutation.mutate(productId);
        }
    };

    const products = productsData?.items || [];
    const pagination = productsData?.pagination;

    return (
        <PageWrapper>
            <div className="space-y-6 max-w-6xl mx-auto pb-16">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            My Product Catalog
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Manage your products, pricing, SKUs, and availability
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            resetForm();
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 self-start sm:self-auto"
                    >
                        <Plus size={16} />
                        Add Product
                    </Button>
                </div>

                {/* Filters & Search */}
                <div className="bg-white dark:bg-[#0c111d] rounded-xl border border-slate-200 dark:border-[#1e293b] p-4 space-y-3 shadow-xs">
                    <div className="flex flex-col md:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <Input
                                placeholder="Search by product name or SKU..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9 text-xs h-9 bg-slate-50 dark:bg-[#111827]"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="w-full md:w-48">
                            <Input
                                placeholder="Filter by category..."
                                value={categoryFilter}
                                onChange={(e) => {
                                    setCategoryFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="text-xs h-9 bg-slate-50 dark:bg-[#111827]"
                            />
                        </div>

                        {/* Active/Inactive Filter */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#151d2e] p-1 rounded-lg self-start">
                            {[
                                { id: 'all', label: 'All' },
                                { id: 'active', label: 'Active' },
                                { id: 'inactive', label: 'Inactive' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveFilter(tab.id);
                                        setPage(1);
                                    }}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${activeFilter === tab.id
                                            ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xs'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Product List */}
                {isLoading ? (
                    <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p>Loading your products...</p>
                    </div>
                ) : isError ? (
                    <div className="p-12 text-center text-xs text-red-500">
                        Failed to load products. Please try again.
                    </div>
                ) : products.length === 0 ? (
                    <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] space-y-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-[#151d2e] flex items-center justify-center text-slate-400 mx-auto">
                            <Package size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">No products found</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            {searchQuery || categoryFilter || activeFilter !== 'all'
                                ? 'No products match your search filters. Try clearing them.'
                                : "You haven't added any products to your catalog yet."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {products.map((product) => (
                                <Card key={product.id} className="border-slate-200 dark:border-[#1e293b] hover:shadow-xs transition-shadow overflow-hidden">
                                    <CardContent className="p-4 flex gap-4">
                                        {/* Image */}
                                        <div className="h-20 w-20 rounded-lg bg-slate-100 dark:bg-[#151d2e] border border-slate-200 dark:border-[#1e293b] flex items-center justify-center shrink-0 overflow-hidden">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '';
                                                    }}
                                                />
                                            ) : (
                                                <ImageIcon size={24} className="text-slate-400" />
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {product.name}
                                                    </h3>
                                                    <Badge
                                                        variant={product.is_active ? 'success' : 'secondary'}
                                                        className="text-xxs uppercase font-extrabold tracking-wider shrink-0"
                                                    >
                                                        {product.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-3 mt-1 text-xxs text-slate-500 dark:text-slate-400 font-semibold">
                                                    {product.sku && (
                                                        <span className="flex items-center gap-0.5">
                                                            <Tag size={10} /> SKU: {product.sku}
                                                        </span>
                                                    )}
                                                    {product.category && (
                                                        <span className="flex items-center gap-0.5">
                                                            <Layers size={10} /> {product.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-[#1e293b]">
                                                <div className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                                                    ₹{Number(product.price).toFixed(2)} <span className="text-xxs font-normal text-slate-400">/ {product.unit}</span>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleToggleActive(product)}
                                                        className={`p-1.5 rounded-md border transition-all cursor-pointer ${product.is_active
                                                                ? 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900/50 dark:hover:bg-amber-950/20'
                                                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-950/20'
                                                            }`}
                                                        title={product.is_active ? 'Deactivate Product' : 'Activate Product'}
                                                    >
                                                        {product.is_active ? <PowerOff size={12} /> : <Power size={12} />}
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenEdit(product)}
                                                        className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#1e293b] dark:text-slate-400 dark:hover:bg-[#151d2e] transition-all cursor-pointer"
                                                        title="Edit Product"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.total_pages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-[#1e293b]">
                                <p className="text-xxs text-slate-500">
                                    Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} total products)
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 1}
                                        onClick={() => setPage((p) => p - 1)}
                                        className="text-xs"
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === pagination.total_pages}
                                        onClick={() => setPage((p) => p + 1)}
                                        className="text-xs"
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Add Product Modal */}
                <Dialog
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    title="Add New Product"
                    description="Create a new product listing in your catalog"
                    size="md"
                >
                    <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. Basmati Rice 25kg"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                error={formErrors.name}
                                className="text-xs h-9"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                    SKU (Internal Code)
                                </label>
                                <Input
                                    placeholder="e.g. RICE-001"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className="text-xs h-9"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                    Category
                                </label>
                                <Input
                                    placeholder="e.g. Grains"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="text-xs h-9"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                    Price (INR) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.price || ''}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        error={formErrors.price}
                                        className="pl-7 text-xs h-9"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                    Unit <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    placeholder="e.g. kg, bag, box"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    error={formErrors.unit}
                                    className="text-xs h-9"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                Image URL
                            </label>
                            <Input
                                placeholder="e.g. https://images.unsplash.com/photo-..."
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                className="text-xs h-9"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                Description
                            </label>
                            <Textarea
                                placeholder="Provide details about product quality, origin, packaging, etc."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#1e293b]">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Creating...' : 'Create Product'}
                            </Button>
                        </div>
                    </form>
                </Dialog>

                {/* Edit Product Modal */}
                <Dialog
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title="Edit Product"
                    description="Update product details in your catalog"
                    size="md"
                >
                    <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. Basmati Rice 25kg"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                error={formErrors.name}
                                className="text-xs h-9"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                    SKU (Internal Code)
                                </label>
                                <Input
                                    placeholder="e.g. RICE-001"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className="text-xs h-9"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                    Category
                                </label>
                                <Input
                                    placeholder="e.g. Grains"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="text-xs h-9"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                    Price (INR) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.price || ''}
                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        error={formErrors.price}
                                        className="pl-7 text-xs h-9"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                    Unit <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    placeholder="e.g. kg, bag, box"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    error={formErrors.unit}
                                    className="text-xs h-9"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                Image URL
                            </label>
                            <Input
                                placeholder="e.g. https://images.unsplash.com/photo-..."
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                className="text-xs h-9"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-[#f1f5f9] mb-1">
                                Description
                            </label>
                            <Textarea
                                placeholder="Provide details about product quality, origin, packaging, etc."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#1e293b]">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Dialog>
            </div>
        </PageWrapper>
    );
};
