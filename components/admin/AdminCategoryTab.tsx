import React, { useState, useEffect, useCallback } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { generateText } from "../../lib/vectorService";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  Category,
  logAdminAction,
} from "../../lib/supabaseService";
import {
  SpinnerIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
  CheckIcon,
  XIcon,
} from "../Icons";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";

const AdminCategoryTab: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<Category, "id">>({
    name: "",
    name_tr: "",
    icon: "",
    default_image: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useLanguage();
  const { success: showSuccess, error: showError } = useToast();
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastEditedField, setLastEditedField] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  // Translation Logic
  const debouncedName = useDebounce(editForm.name, 800);
  const debouncedNameTr = useDebounce(editForm.name_tr, 800);

  const translateText = useCallback(
    async (
      text: string,
      targetLanguage: "English" | "Turkish"
    ): Promise<string> => {
      if (!text.trim()) return "";
      try {
        const prompt = `Translate the following category name to ${targetLanguage}. Only return the translated word, without any introductory phrases:\n\n"${text}"`;
        const generatedText = await generateText(prompt);
        return generatedText?.trim() || "";
      } catch (error) {
        console.warn("Translation failed:", error);
        return "";
      }
    },
    []
  );

  useEffect(() => {
    if (debouncedName && lastEditedField === "name") {
      (async () => {
        setIsTranslating(true);
        const tr = await translateText(debouncedName, "Turkish");
        if (tr) setEditForm((p) => ({ ...p, name_tr: tr }));
        setIsTranslating(false);
      })();
    }
  }, [debouncedName, lastEditedField, translateText]);

  useEffect(() => {
    if (debouncedNameTr && lastEditedField === "name_tr") {
      (async () => {
        setIsTranslating(true);
        const tr = await translateText(debouncedNameTr, "English");
        if (tr) setEditForm((p) => ({ ...p, name: tr }));
        setIsTranslating(false);
      })();
    }
  }, [debouncedNameTr, lastEditedField, translateText]);

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "name" || name === "name_tr") setLastEditedField(name);
    setEditForm({ ...editForm, [name]: value });
  };

  const loadCategories = async () => {
    setLoading(true);
    const data = await getCategories();
    setCategories(data);
    setLoading(false);
  };

  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditForm({
      name: category.name,
      name_tr: category.name_tr || "",
      icon: category.icon || "",
      default_image: category.default_image || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({ name: "", name_tr: "", icon: "", default_image: "" });
    setLastEditedField(null);
  };

  const handleSave = async () => {
    if (!editForm.name)
      return showError(
        t("categoryNameRequired") || "Category name is required"
      );

    setIsSaving(true);
    try {
      if (isAdding) {
        const result = await createCategory(editForm);
        await logAdminAction({
          action_type: "CREATE",
          table_name: "categories",
          record_id: (result as any)?.id || "new",
          new_data: editForm,
        });
      } else if (editingId) {
        const oldCat = categories.find((c) => c.id === editingId);
        await updateCategory(editingId, editForm);
        await logAdminAction({
          action_type: "UPDATE",
          table_name: "categories",
          record_id: editingId,
          old_data: oldCat,
          new_data: editForm,
        });
      }
      await loadCategories();
      handleCancelEdit();
      showSuccess(t("adminSuccessTitle"));
    } catch (error: any) {
      showError(t("categorySaveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(t("confirmDeleteCategory", { name }))) return;

    try {
      const oldCat = categories.find((c) => c.id === id);
      await deleteCategory(id);
      await logAdminAction({
        action_type: "DELETE",
        table_name: "categories",
        record_id: id,
        old_data: oldCat,
      });
      await loadCategories();
      showSuccess(t("categoryDeletedSuccess"));
    } catch (error: any) {
      showError(t("adminErrorTitle"));
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="p-8 text-center">
        <SpinnerIcon className="w-8 h-8 mx-auto text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Category Management
        </h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId("new");
            setEditForm({ name: "", name_tr: "", icon: "", default_image: "" });
          }}
          className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="bg-white dark:bg-brand-surface rounded-xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 dark:text-brand-text-light uppercase bg-gray-50 dark:bg-brand-bg">
            <tr>
              <th className="px-6 py-4">Icon</th>
              <th className="px-6 py-4">Name (EN) / (TR)</th>
              <th className="px-6 py-4">Default Image</th>
              <th className="px-6 py-4">Usage</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {isAdding && (
              <tr className="bg-brand-primary/5">
                <td className="px-6 py-4">
                  <input
                    type="text"
                    placeholder="Icon name"
                    value={editForm.icon}
                    onChange={(e) =>
                      setEditForm({ ...editForm, icon: e.target.value })
                    }
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <input
                      type="text"
                      name="name"
                      placeholder="English Name"
                      value={editForm.name}
                      onChange={handleFormInputChange}
                      className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                    />
                    <input
                      type="text"
                      name="name_tr"
                      placeholder="Turkish Name"
                      value={editForm.name_tr}
                      onChange={handleFormInputChange}
                      className={`w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface ${
                        isTranslating ? "animate-pulse opacity-50" : ""
                      }`}
                    />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    placeholder="Image URL"
                    value={editForm.default_image}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        default_image: e.target.value,
                      })
                    }
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                  />
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-400">-</span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-green-600 hover:text-green-700 p-1"
                  >
                    {isSaving ? (
                      <SpinnerIcon className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckIcon className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            )}
            {categories.map((cat) => (
              <tr
                key={cat.id}
                className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4">
                  {editingId === cat.id ? (
                    <input
                      type="text"
                      value={editForm.icon}
                      onChange={(e) =>
                        setEditForm({ ...editForm, icon: e.target.value })
                      }
                      className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                    />
                  ) : (
                    <span className="text-gray-500 dark:text-brand-text-muted">
                      {cat.icon || "-"}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === cat.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        name="name"
                        value={editForm.name}
                        onChange={handleFormInputChange}
                        className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface"
                      />
                      <input
                        type="text"
                        name="name_tr"
                        value={editForm.name_tr}
                        onChange={handleFormInputChange}
                        className={`w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface ${
                          isTranslating ? "animate-pulse opacity-50" : ""
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-brand-text-light">
                        {cat.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {cat.name_tr || "No translation"}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === cat.id ? (
                    <div className="flex flex-col gap-2">
                      {editForm.default_image && (
                        <img
                          src={editForm.default_image}
                          alt="Preview"
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <input
                        type="text"
                        value={editForm.default_image}
                        placeholder="Image URL"
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            default_image: e.target.value,
                          })
                        }
                        className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-brand-surface text-xs"
                      />
                    </div>
                  ) : cat.default_image ? (
                    <img
                      src={cat.default_image}
                      alt={cat.name}
                      className="w-10 h-10 object-cover rounded shadow-sm border border-gray-200"
                    />
                  ) : (
                    <span className="text-gray-400 italic">No image</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${
                      cat.usage_count && cat.usage_count > 0
                        ? "bg-brand-primary/10 text-brand-primary"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {cat.usage_count || 0} deals
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  {editingId === cat.id ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="text-green-600 hover:text-green-700 p-1"
                      >
                        {isSaving ? (
                          <SpinnerIcon className="w-5 h-5 animate-spin" />
                        ) : (
                          <CheckIcon className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                      >
                        <EditIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminCategoryTab;
