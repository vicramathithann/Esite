"use client";

import React from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import NumberInput from "@/components/NumberInput";

export interface FormVariantRow {
  id?: string;
  ram: string;
  customRam?: string;
  isCustomRam?: boolean;
  storage: string;
  customStorage?: string;
  isCustomStorage?: boolean;
  basePrice: string;
  originalPrice: string;
  stock: string;
  inStock: boolean;
  isDefault: boolean;
  sku?: string;
}

export const COMMON_RAM_OPTIONS = ["4GB", "6GB", "8GB", "12GB", "16GB", "24GB"];
export const COMMON_STORAGE_OPTIONS = ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"];

export interface VariantEditorProps {
  variants: FormVariantRow[];
  onChange: (variants: FormVariantRow[]) => void;
  rowErrors?: Record<number, string[]>;
}

export default function VariantEditor({
  variants,
  onChange,
  rowErrors = {},
}: VariantEditorProps) {
  const handleAddVariant = () => {
    const last = variants[variants.length - 1];
    const newVariant: FormVariantRow = {
      ram: last ? last.ram : "8GB",
      storage: "256GB",
      basePrice: last ? last.basePrice : "",
      originalPrice: last ? last.originalPrice : "",
      stock: "20",
      inStock: true,
      isDefault: variants.length === 0,
    };
    onChange([...variants, newVariant]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      alert("A product must have at least one variant.");
      return;
    }
    const updated = variants.filter((_, i) => i !== index);
    // If we removed the default, make the first one default
    if (variants[index].isDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }
    onChange(updated);
  };

  const handleUpdateVariant = (index: number, patch: Partial<FormVariantRow>) => {
    const updated = variants.map((v, i) => {
      if (i === index) {
        return { ...v, ...patch };
      }
      if (patch.isDefault && i !== index) {
        return { ...v, isDefault: false };
      }
      return v;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Product Variants</h3>
          <p className="text-xs text-muted">
            Configure every RAM, storage, price, and inventory tier for this model.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddVariant}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#C9A66B]/15 text-[#8C6226] dark:text-[#D4B483] border border-[#C9A66B]/30 hover:bg-[#C9A66B]/25 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Variant
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-xl bg-tile/40">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-tile/80 text-muted font-semibold">
              <th className="py-2.5 px-3 w-12 text-center" title="Default Variant">Default</th>
              <th className="py-2.5 px-3 min-w-[130px]">RAM</th>
              <th className="py-2.5 px-3 min-w-[140px]">Storage</th>
              <th className="py-2.5 px-3 min-w-[120px]">Base Price (₹) *</th>
              <th className="py-2.5 px-3 min-w-[120px]">Original Price (₹)</th>
              <th className="py-2.5 px-3 min-w-[90px]">Stock *</th>
              <th className="py-2.5 px-3 w-20 text-center">In Stock</th>
              <th className="py-2.5 px-3 w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {variants.map((variant, idx) => {
              const errors = rowErrors[idx] || [];
              const hasErrors = errors.length > 0;
              const isRamCustom = variant.isCustomRam || !COMMON_RAM_OPTIONS.includes(variant.ram);
              const isStorageCustom = variant.isCustomStorage || !COMMON_STORAGE_OPTIONS.includes(variant.storage);

              return (
                <React.Fragment key={variant.id || idx}>
                  <tr className={`hover:bg-tile/50 transition-colors ${hasErrors ? "bg-red-500/5" : ""}`}>
                    {/* Default Radio */}
                    <td className="py-3 px-3 text-center align-middle">
                      <input
                        type="radio"
                        name="default_variant"
                        checked={variant.isDefault}
                        onChange={() => handleUpdateVariant(idx, { isDefault: true })}
                        className="cursor-pointer accent-[#C9A66B] w-4 h-4"
                        title="Set as default storefront variant"
                      />
                    </td>

                    {/* RAM */}
                    <td className="py-3 px-3 align-top">
                      <div className="space-y-1">
                        <select
                          value={isRamCustom ? "Custom" : variant.ram}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Custom") {
                              handleUpdateVariant(idx, {
                                isCustomRam: true,
                                ram: variant.customRam || "18GB",
                              });
                            } else {
                              handleUpdateVariant(idx, {
                                isCustomRam: false,
                                ram: val,
                              });
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-tile border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                        >
                          {COMMON_RAM_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="Custom">Custom...</option>
                        </select>
                        {isRamCustom && (
                          <input
                            type="text"
                            placeholder="e.g. 24GB"
                            value={variant.ram}
                            onChange={(e) =>
                              handleUpdateVariant(idx, {
                                ram: e.target.value,
                                customRam: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 bg-tile border border-border rounded text-[11px] text-foreground focus:outline-none focus:border-[#C9A66B]"
                          />
                        )}
                      </div>
                    </td>

                    {/* Storage */}
                    <td className="py-3 px-3 align-top">
                      <div className="space-y-1">
                        <select
                          value={isStorageCustom ? "Custom" : variant.storage}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Custom") {
                              handleUpdateVariant(idx, {
                                isCustomStorage: true,
                                storage: variant.customStorage || "4TB",
                              });
                            } else {
                              handleUpdateVariant(idx, {
                                isCustomStorage: false,
                                storage: val,
                              });
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-tile border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                        >
                          {COMMON_STORAGE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          <option value="Custom">Custom...</option>
                        </select>
                        {isStorageCustom && (
                          <input
                            type="text"
                            placeholder="e.g. 512GB"
                            value={variant.storage}
                            onChange={(e) =>
                              handleUpdateVariant(idx, {
                                storage: e.target.value,
                                customStorage: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1 bg-tile border border-border rounded text-[11px] text-foreground focus:outline-none focus:border-[#C9A66B]"
                          />
                        )}
                      </div>
                    </td>

                    {/* Base Price */}
                    <td className="py-3 px-3 align-top">
                      <NumberInput
                        value={variant.basePrice}
                        onChange={(e) =>
                          handleUpdateVariant(idx, { basePrice: e.target.value })
                        }
                        placeholder="Price"
                        hasError={errors.some((err) => err.includes("Base price") || err.includes("price"))}
                        className="w-full px-2.5 py-1.5 bg-tile border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                      />
                    </td>

                    {/* Original Price */}
                    <td className="py-3 px-3 align-top">
                      <NumberInput
                        value={variant.originalPrice}
                        onChange={(e) =>
                          handleUpdateVariant(idx, { originalPrice: e.target.value })
                        }
                        placeholder="Orig Price"
                        hasError={errors.some((err) => err.includes("Original price"))}
                        className="w-full px-2.5 py-1.5 bg-tile border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                      />
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-3 align-top">
                      <NumberInput
                        value={variant.stock}
                        onChange={(e) => {
                          const val = e.target.value;
                          const stNum = parseInt(val, 10);
                          handleUpdateVariant(idx, {
                            stock: val,
                            inStock: !isNaN(stNum) && stNum > 0,
                          });
                        }}
                        placeholder="Stock"
                        hasError={errors.some((err) => err.includes("Stock"))}
                        className="w-full px-2.5 py-1.5 bg-tile border border-border rounded-lg text-foreground text-xs focus:outline-none focus:border-[#C9A66B]"
                      />
                    </td>

                    {/* In Stock Toggle */}
                    <td className="py-3 px-3 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={variant.inStock && parseInt(variant.stock || "0", 10) > 0}
                        onChange={(e) =>
                          handleUpdateVariant(idx, { inStock: e.target.checked })
                        }
                        className="w-4 h-4 cursor-pointer accent-[#C9A66B]"
                        title="Mark variant as in-stock"
                      />
                    </td>

                    {/* Delete */}
                    <td className="py-3 px-3 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        disabled={variants.length <= 1}
                        className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-tile transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title={variants.length <= 1 ? "At least one variant required" : "Delete variant"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>

                  {/* Row errors */}
                  {hasErrors && (
                    <tr className="bg-red-500/5">
                      <td colSpan={8} className="px-4 py-1.5 text-[11px] text-red-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.join(" • ")}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
