import { useState, useEffect } from 'react';
import { hotelRpc } from '../lib/supabase';
import type { MenuCategory, MenuItem } from '../types';
import { 
  PlusCircle, Edit, Trash2, Check, X, Loader2, RefreshCw, FolderPlus, Utensils
} from 'lucide-react';

interface RestaurantMenuAdminProps {
  companyId: string;
}

export function RestaurantMenuAdmin({ companyId }: RestaurantMenuAdminProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'dishes' | 'categories'>('dishes');

  // Modals and form states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySortOrder, setCategorySortOrder] = useState(0);

  const [dishModalOpen, setDishModalOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishDescription, setDishDescription] = useState('');
  const [dishPrice, setDishPrice] = useState(0);
  const [dishCategoryId, setDishCategoryId] = useState('');
  const [dishImageUrl, setDishImageUrl] = useState('');
  const [dishIsAvailable, setDishIsAvailable] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMenuData();
  }, [companyId]);

  async function loadMenuData() {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data: catData, error: catError } = await hotelRpc.restaurantGetCategories(companyId);
      if (catError) throw catError;
      setCategories((catData as any[]) || []);

      const { data: itemData, error: itemError } = await hotelRpc.restaurantGetMenuItems(companyId);
      if (itemError) throw itemError;
      setMenuItems((itemData as any[]) || []);
    } catch (err) {
      console.error('Error al cargar datos del restaurante:', err);
    } finally {
      setLoading(false);
    }
  }

  // Categories actions
  const handleOpenCategoryModal = (cat?: MenuCategory) => {
    if (cat) {
      setSelectedCategory(cat);
      setCategoryName(cat.name);
      setCategorySortOrder(cat.sort_order);
    } else {
      setSelectedCategory(null);
      setCategoryName('');
      setCategorySortOrder(categories.length);
    }
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await hotelRpc.restaurantUpsertCategory({
        id: selectedCategory ? selectedCategory.id : null,
        companyId,
        name: categoryName,
        sortOrder: categorySortOrder,
      });
      if (error) throw error;
      setCategoryModalOpen(false);
      loadMenuData();
    } catch (err) {
      console.error('Error al guardar categoría:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la categoría "${name}"? Todos los platos asociados quedarán sin categoría.`)) return;
    try {
      const { error } = await hotelRpc.restaurantDeleteCategory(id);
      if (error) throw error;
      loadMenuData();
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
    }
  };

  // Dish actions
  const handleOpenDishModal = (dish?: MenuItem) => {
    if (dish) {
      setSelectedDish(dish);
      setDishName(dish.name);
      setDishDescription(dish.description || '');
      setDishPrice(dish.price);
      setDishCategoryId(dish.category_id || '');
      setDishImageUrl(dish.image_url || '');
      setDishIsAvailable(dish.is_available);
    } else {
      setSelectedDish(null);
      setDishName('');
      setDishDescription('');
      setDishPrice(0);
      setDishCategoryId(categories.length > 0 ? categories[0].id : '');
      setDishImageUrl('');
      setDishIsAvailable(true);
    }
    setDishModalOpen(true);
  };

  const handleSaveDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await hotelRpc.restaurantUpsertMenuItem({
        id: selectedDish ? selectedDish.id : null,
        companyId,
        categoryId: dishCategoryId || null,
        name: dishName,
        description: dishDescription || null,
        price: dishPrice,
        imageUrl: dishImageUrl || null,
        isAvailable: dishIsAvailable,
      });
      if (error) throw error;
      setDishModalOpen(false);
      loadMenuData();
    } catch (err) {
      console.error('Error al guardar plato:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (dish: MenuItem) => {
    try {
      const { error } = await hotelRpc.restaurantUpsertMenuItem({
        id: dish.id,
        companyId,
        categoryId: dish.category_id || null,
        name: dish.name,
        description: dish.description || null,
        price: dish.price,
        imageUrl: dish.image_url || null,
        isAvailable: !dish.is_available,
      });
      if (error) throw error;
      loadMenuData();
    } catch (err) {
      console.error('Error al cambiar disponibilidad:', err);
    }
  };

  const handleDeleteDish = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el plato "${name}"?`)) return;
    try {
      const { error } = await hotelRpc.restaurantDeleteMenuItem(id);
      if (error) throw error;
      loadMenuData();
    } catch (err) {
      console.error('Error al eliminar plato:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider text-[10px] mb-1">
            <Utensils className="w-3.5 h-3.5" />
            <span>Administración del Restaurante</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Menú del Restaurante</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMenuData}
            disabled={loading}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-none border border-white/5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {activeSubTab === 'dishes' ? (
            <button
              onClick={() => handleOpenDishModal()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-wider rounded-none cursor-pointer transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Nuevo Plato
            </button>
          ) : (
            <button
              onClick={() => handleOpenCategoryModal()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black uppercase tracking-wider rounded-none cursor-pointer transition-colors flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              Nueva Categoría
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-black/40">
        <button
          onClick={() => setActiveSubTab('dishes')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-none cursor-pointer ${
            activeSubTab === 'dishes'
              ? 'border-amber-500 text-amber-400 bg-white/2'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/1'
          }`}
        >
          Platos e Ítems
        </button>
        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-6 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 rounded-none cursor-pointer ${
            activeSubTab === 'categories'
              ? 'border-amber-500 text-amber-400 bg-white/2'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/1'
          }`}
        >
          Categorías
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Dishes Tab */}
          {activeSubTab === 'dishes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((dish) => {
                const category = categories.find(c => c.id === dish.category_id);
                return (
                  <div 
                    key={dish.id} 
                    className={`glass-card border p-5 flex flex-col justify-between transition-all ${
                      dish.is_available ? 'border-white/5 bg-black/30' : 'border-red-500/10 bg-red-950/5 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-wider rounded-none">
                          {category ? category.name : 'Sin Categoría'}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-none ${
                          dish.is_available 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {dish.is_available ? 'Disponible' : 'Agotado'}
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-extrabold text-white tracking-tight uppercase mb-1">
                        {dish.name}
                      </h3>
                      
                      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-4">
                        {dish.description || 'Sin descripción disponible.'}
                      </p>
                    </div>

                    <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-auto">
                      <span className="text-sm font-black text-amber-500 font-mono">
                        ${Number(dish.price).toLocaleString('es-CL')}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleToggleAvailability(dish)}
                          className={`p-2 border rounded-none cursor-pointer transition-colors ${
                            dish.is_available 
                              ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400' 
                              : 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400'
                          }`}
                          title={dish.is_available ? 'Marcar como Agotado' : 'Marcar como Disponible'}
                        >
                          {dish.is_available ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleOpenDishModal(dish)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-none border border-white/5 cursor-pointer transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDish(dish.id, dish.name)}
                          className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-none border border-red-500/10 cursor-pointer transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {menuItems.length === 0 && (
                <div className="col-span-full text-center py-20 text-slate-500 border border-dashed border-white/5 rounded-none">
                  <Utensils className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                  <p className="text-[10px] font-black uppercase tracking-wider">No hay platos registrados</p>
                  <button
                    onClick={() => handleOpenDishModal()}
                    className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-wider rounded-none cursor-pointer"
                  >
                    Agregar Primer Plato
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {activeSubTab === 'categories' && (
            <div className="overflow-x-auto border border-white/5 rounded-none bg-black/40">
              <table className="w-full border-collapse text-left text-xs text-slate-300">
                <thead className="bg-white/5 uppercase font-bold tracking-widest border-b border-white/10 text-slate-400">
                  <tr>
                    <th className="p-4 text-[10px]">Nombre de Categoría</th>
                    <th className="p-4 text-[10px] text-center w-24">Orden</th>
                    <th className="p-4 text-[10px] text-right w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-white/2 transition-colors">
                      <td className="p-4 font-bold text-white uppercase tracking-wider">
                        {cat.name}
                      </td>
                      <td className="p-4 text-center font-mono text-slate-400">
                        {cat.sort_order}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenCategoryModal(cat)}
                            className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-none border border-white/5 cursor-pointer transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-none border border-red-500/10 cursor-pointer transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-20 text-slate-500 border border-dashed border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-wider">No hay categorías registradas</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Category Add/Edit Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card border border-white/10 bg-[#090e17] rounded-none shadow-2xl overflow-hidden">
            <div className="h-1 bg-amber-500 w-full" />
            <div className="p-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4">
                {selectedCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-[9px] text-slate-450 uppercase font-black tracking-widest mb-1.5">Nombre</label>
                  <input
                    type="text"
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                    placeholder="Ej: BEBIDAS, ENTRADAS..."
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-450 uppercase font-black tracking-widest mb-1.5">Orden de Visualización</label>
                  <input
                    type="number"
                    required
                    value={categorySortOrder}
                    onChange={(e) => setCategorySortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(false)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-none text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-none text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {submitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dish Add/Edit Modal */}
      {dishModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card border border-white/10 bg-[#090e17] rounded-none shadow-2xl overflow-hidden">
            <div className="h-1 bg-amber-500 w-full" />
            <div className="p-6">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-4">
                {selectedDish ? 'Editar Plato' : 'Nuevo Plato'}
              </h3>
              <form onSubmit={handleSaveDish} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] text-slate-455 uppercase font-black tracking-widest mb-1.5">Nombre</label>
                    <input
                      type="text"
                      required
                      value={dishName}
                      onChange={(e) => setDishName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                      placeholder="Ej: Lomo a lo Pobre"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-455 uppercase font-black tracking-widest mb-1.5">Precio ($ CLP)</label>
                    <input
                      type="number"
                      required
                      value={dishPrice}
                      onChange={(e) => setDishPrice(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-slate-455 uppercase font-black tracking-widest mb-1.5">Categoría</label>
                  <select
                    value={dishCategoryId}
                    onChange={(e) => setDishCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#131c2e] border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Selecciona una Categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-slate-455 uppercase font-black tracking-widest mb-1.5">Descripción</label>
                  <textarea
                    value={dishDescription}
                    onChange={(e) => setDishDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors resize-none"
                    placeholder="Detalles del plato, ingredientes..."
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-slate-455 uppercase font-black tracking-widest mb-1.5">URL de Imagen (Opcional)</label>
                  <input
                    type="url"
                    value={dishImageUrl}
                    onChange={(e) => setDishImageUrl(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/40 border border-white/5 rounded-none text-white font-semibold outline-none text-xs focus:border-amber-500/30 transition-colors"
                    placeholder="https://ejemplo.com/plato.jpg"
                  />
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="is_available"
                    checked={dishIsAvailable}
                    onChange={(e) => setDishIsAvailable(e.target.checked)}
                    className="w-4 h-4 border border-white/5 bg-black/40 text-amber-500 cursor-pointer"
                  />
                  <label htmlFor="is_available" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                    Disponible inmediatamente para pedido
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDishModalOpen(false)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-none text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border border-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-none text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {submitting ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
