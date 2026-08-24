import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { productService } from '../../services/productService';
import { supplierService } from '../../services/supplierService';
import cartService from '../../services/cartService';
import { Product } from '../../types';
import { toast } from 'sonner';
import {
    Package,
    Search,
    Tag,
    Layers,
    Building,
    MapPin,
    Image as ImageIcon,
    Eye,
    ShoppingCart,
    Calendar,
    FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VendorCatalog: React.FC = () => {
    const navigate = useNavigate();

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [page, setPage] = useState(1);
    const limit = 12;

    // Detail Modal state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [addingProductId, setAddingProductId] = useState<string | null>(null);

    const handleAddToCart = async (product: Product, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setAddingProductId(product.id);
        try {
            await cartService.addToCart(product.id);
            toast.success(`${product.name} added to cart!`);
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message ?? 'Failed to add to cart');
        } finally {
            setAddingProductId(null);
        }
    };

    // Fetch Suppliers for filter dropdown
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers-list'],
        queryFn: () => supplierService.getSuppliers(),
    });

    // Fetch Products Query
    const { data: productsData, isLoading, isError } = useQuery({
        queryKey: ['vendor-products', page, searchQuery, categoryFilter, supplierFilter],
        queryFn: async () => {
            const res = await productService.listProducts({
                page,
                limit,
                search: searchQuery || undefined,
                category: categoryFilter || undefined,
                supplier_company_id: supplierFilter || undefined,
            });
            return res.data;
        },
    });

    const products = productsData?.items || [];
    const pagination = productsData?.pagination;

    const handleOpenDetail = (product: Product) => {
        setSelectedProduct(product);
        setIsDetailModalOpen(true);
    };

    const handleCreateOrderRequest = (product: Product) => {
        // Navigate to new order request page with pre-filled supplier and item
        navigate('/dashboard/vendor/orders/new', {
            state: {
                supplierId: product.company?.user_id || '', // or supplier user ID
                prefilledItem: {
                    product_name: product.name,
                    quantity: 1,
                    unit: product.unit,
                    estimated_price: product.price,
                    notes: `SKU: ${product.sku || 'N/A'}`,
                },
            },
        });
    };

    return (
        <PageWrapper>
            <div className="space-y-6 max-w-6xl mx-auto pb-16">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Supplier Product Catalog
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Browse and search products offered by verified suppliers in the network
                        </p>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white dark:bg-[#0c111d] rounded-xl border border-slate-200 dark:border-[#1e293b] p-4 space-y-3 shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Search */}
                        <div className="relative">
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
                        <div>
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

                        {/* Supplier Filter */}
                        <div>
                            <select
                                value={supplierFilter}
                                onChange={(e) => {
                                    setSupplierFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full rounded-lg border border-slate-300 dark:border-[#1e293b] bg-slate-50 dark:bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer h-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">All Suppliers</option>
                                {suppliers.map((s) => (
                                    <option key={s.company_id || s.id} value={s.company_id || ''}>
                                        {s.company_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                {isLoading ? (
                    <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p>Loading product catalog...</p>
                    </div>
                ) : isError ? (
                    <div className="p-12 text-center text-xs text-red-500">
                        Failed to load product catalog. Please try again.
                    </div>
                ) : products.length === 0 ? (
                    <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#0c111d] space-y-3">
                        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-[#151d2e] flex items-center justify-center text-slate-400 mx-auto">
                            <Package size={24} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">No products found</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            No products match your search or filter criteria. Try clearing them to see more.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((product) => (
                                <Card
                                    key={product.id}
                                    className="border-slate-200 dark:border-[#1e293b] hover:shadow-md transition-all overflow-hidden flex flex-col group cursor-pointer"
                                    onClick={() => handleOpenDetail(product)}
                                >
                                    {/* Image Container */}
                                    <div className="h-40 bg-slate-100 dark:bg-[#151d2e] border-b border-slate-200 dark:border-[#1e293b] relative flex items-center justify-center overflow-hidden shrink-0">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = '';
                                                }}
                                            />
                                        ) : (
                                            <ImageIcon size={32} className="text-slate-400" />
                                        )}
                                        {product.category && (
                                            <Badge className="absolute top-2 left-2 text-xxs bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-800">
                                                {product.category}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                        <div className="space-y-1">
                                            <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {product.name}
                                            </h3>
                                            {product.sku && (
                                                <p className="text-xxs text-slate-400 font-mono">SKU: {product.sku}</p>
                                            )}
                                        </div>

                                        {/* Supplier Info */}
                                        <div className="flex items-center gap-2 text-xxs text-slate-500 dark:text-slate-400 font-semibold">
                                            <Building size={12} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{product.company?.company_name || 'Unknown Supplier'}</span>
                                        </div>

                                        {/* Price & Action */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1e293b]">
                                            <div className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                                                ₹{Number(product.price).toFixed(2)}
                                                <span className="text-xxs font-normal text-slate-400"> / {product.unit}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenDetail(product);
                                                    }}
                                                >
                                                    <Eye size={14} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                                                    disabled={addingProductId === product.id}
                                                    onClick={(e) => handleAddToCart(product, e)}
                                                >
                                                    <ShoppingCart size={14} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
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

                {/* Product Details Modal */}
                <Dialog
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    title="Product Details"
                    description="Detailed specifications and supplier information"
                    size="lg"
                >
                    {selectedProduct && (
                        <div className="space-y-6 pt-2">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Image */}
                                <div className="w-full md:w-48 h-48 rounded-xl bg-slate-100 dark:bg-[#151d2e] border border-slate-200 dark:border-[#1e293b] flex items-center justify-center overflow-hidden shrink-0">
                                    {selectedProduct.image_url ? (
                                        <img
                                            src={selectedProduct.image_url}
                                            alt={selectedProduct.name}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = '';
                                            }}
                                        />
                                    ) : (
                                        <ImageIcon size={48} className="text-slate-400" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                                            {selectedProduct.name}
                                        </h2>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {selectedProduct.category && (
                                                <Badge variant="secondary" className="text-xxs font-bold">
                                                    <Layers size={10} className="mr-1" /> {selectedProduct.category}
                                                </Badge>
                                            )}
                                            {selectedProduct.sku && (
                                                <Badge variant="outline" className="text-xxs font-mono">
                                                    SKU: {selectedProduct.sku}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                                        <div>
                                            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">Price</span>
                                            <span className="font-mono text-lg font-black text-blue-600 dark:text-blue-400">
                                                ₹{Number(selectedProduct.price).toFixed(2)}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400"> / {selectedProduct.unit}</span>
                                        </div>
                                    </div>

                                    {selectedProduct.description && (
                                        <div>
                                            <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Description
                                            </span>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#111827] p-3 rounded-lg border border-slate-200/60 dark:border-[#1e293b]">
                                                {selectedProduct.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Supplier Card */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#111827] space-y-3">
                                <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 block">
                                    Supplier Information
                                </span>
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center shrink-0">
                                        {selectedProduct.company?.company_name?.slice(0, 2).toUpperCase() || 'SP'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {selectedProduct.company?.company_name}
                                        </h4>
                                        <p className="text-xxs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                            {selectedProduct.company?.description || 'Verified supplier network merchant.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#1e293b]">
                                <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                                    Close
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleCreateOrderRequest(selectedProduct);
                                    }}
                                    className="flex items-center gap-1.5"
                                >
                                    Request Order
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={addingProductId === selectedProduct.id}
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleAddToCart(selectedProduct);
                                    }}
                                    className="flex items-center gap-1.5"
                                >
                                    <ShoppingCart size={14} />
                                    Add to Cart
                                </Button>
                            </div>
                        </div>
                    )}
                </Dialog>
            </div>
        </PageWrapper>
    );
};
