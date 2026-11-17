import React, { useEffect, useState } from 'react';
import { Edit3, UtensilsCrossed, X } from 'lucide-react';
import { EmptyState } from '../components/EmptyState.tsx';
import { LoadingState } from '../components/LoadingState.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { apiRequest } from '../services/api.ts';
import type { FoodMenuItem } from '../types/index.ts';

const DAYS: FoodMenuItem['day'][] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const MEALS: FoodMenuItem['meal_type'][] = [
  'Breakfast',
  'Lunch',
  'Evening Snacks',
  'Dinner',
];

const MEAL_TIMINGS: Record<FoodMenuItem['meal_type'], string> = {
  Breakfast: '7:30 AM – 9:30 AM',
  Lunch: '12:30 PM – 2:30 PM',
  'Evening Snacks': '5:00 PM – 6:00 PM',
  Dinner: '8:00 PM – 9:45 PM',
};

export function FoodMenuPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user?.role === 'MANAGER' || user?.role === 'OWNER';

  const [menu, setMenu] = useState<FoodMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<FoodMenuItem | null>(null);
  const [draftFoodItems, setDraftFoodItems] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ menu: FoodMenuItem[] }>('/menu');
      setMenu(res.menu);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load weekly food menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMenu();
  }, []);

  const openEdit = (item: FoodMenuItem) => {
    setEditingItem(item);
    setDraftFoodItems(item.food_items);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !draftFoodItems.trim()) return;
    setSaving(true);
    try {
      await apiRequest(`/menu/${editingItem.menu_id}`, {
        method: 'PUT',
        body: JSON.stringify({ food_items: draftFoodItems.trim() }),
      });
      toast.success(`Updated ${editingItem.day} ${editingItem.meal_type}.`);
      setEditingItem(null);
      void loadMenu();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update menu item.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Weekly Hostel Dining Schedule</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Hygienic home-style meals served Monday through Sunday ·{' '}
            {canEdit ? 'Click any meal card to edit menu items' : 'Included in monthly PG tariff'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          {MEALS.map((m) => (
            <span key={m} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <strong className="text-slate-900">{m}:</strong> {MEAL_TIMINGS[m]}
            </span>
          ))}
        </div>
      </div>

      {menu.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Menu not configured"
          description="Weekly meal items will appear here once added by the PG Manager."
        />
      ) : (
        <div className="space-y-4">
          {DAYS.map((day) => {
            const dayItems = MEALS.map((meal) =>
              menu.find((item) => item.day === day && item.meal_type === meal)
            ).filter(Boolean) as FoodMenuItem[];

            return (
              <div
                key={day}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-[#0F294A]">{day}</h3>
                  <span className="text-xs text-slate-400">4 Meals</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dayItems.map((item) => (
                    <div
                      key={item.menu_id}
                      className="rounded-xl bg-slate-50/70 border border-slate-200/80 p-4 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#0F766E]">
                            {item.meal_type}
                          </span>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="text-slate-400 hover:text-[#2563EB] p-1 rounded"
                              aria-label={`Edit ${item.day} ${item.meal_type}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
                          {item.food_items}
                        </p>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {MEAL_TIMINGS[item.meal_type]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Meal Modal for Manager / Owner */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">
                Edit {editingItem.day} · {editingItem.meal_type}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Menu Items
                </label>
                <textarea
                  rows={3}
                  required
                  value={draftFoodItems}
                  onChange={(e) => setDraftFoodItems(e.target.value)}
                  className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#1E3A8A] rounded-lg disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
