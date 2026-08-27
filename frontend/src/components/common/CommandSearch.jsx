import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "../../hooks/useProducts";
import { useCategories } from "../../hooks/useCategories";
import { formatINR } from "../../utils/formatINR";
import LogoFallback from "./LogoFallback";
import {
  IconSearch,
  IconX,
  IconArrowUpRight,
  CategoryIcon,
} from "./Icons";

export default function CommandSearch({ isOpen, onClose, onSelect }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Fetch search matches
  const { data: searchResults, isLoading: isSearching } = useProducts(
    query.trim() ? { search: query.trim(), limit: 8 } : { limit: 6 }
  );
  const { data: categories } = useCategories();

  const filteredCategories = useMemo(() => {
    return (categories || [])
      .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 4);
  }, [categories, query]);

  const productsList = useMemo(() => {
    return searchResults?.data || [];
  }, [searchResults]);

  const totalItems = productsList.length + filteredCategories.length;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        setSelectedIndex(0);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleProductPick = useCallback(
    (product) => {
      if (onSelect) {
        onSelect(product);
      } else {
        navigate(`/products/${product.id}`);
        onClose();
      }
    },
    [onSelect, navigate, onClose]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex < productsList.length) {
          const product = productsList[selectedIndex];
          if (product) {
            handleProductPick(product);
          }
        } else {
          const catIndex = selectedIndex - productsList.length;
          const category = filteredCategories[catIndex];
          if (category) {
            navigate(`/categories/${category.id}`);
            onClose();
          }
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, totalItems, selectedIndex, productsList, filteredCategories, navigate, onClose, handleProductPick]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-charcoal/40 dark:bg-black/70 backdrop-blur-md transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface/95 dark:bg-surface/95 backdrop-blur-2xl border border-border/80 dark:border-border/80 rounded-2xl shadow-feather-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/70 dark:border-border/70">
          <IconSearch className="w-5 h-5 text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search ranked products, startups, or categories..."
            className="flex-1 bg-transparent text-charcoal dark:text-cream placeholder:text-muted/60 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-charcoal dark:hover:text-white"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-medium text-muted bg-surface-soft dark:bg-elevated border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-border/40 dark:divide-border/40 scrollbar-hide">
          {/* Products Section */}
          <div className="py-1">
            <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              <span>{query.trim() ? "Search Results" : "Top Ranked Products"}</span>
              {isSearching && <span className="text-[10px] lowercase text-coral">searching...</span>}
            </div>

            {productsList.length > 0 ? (
              productsList.map((product, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductPick(product)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-white"
                        : "hover:bg-surface-soft dark:hover:bg-elevated text-charcoal dark:text-cream"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        {product.logoUrl ? (
                          <img
                            src={product.logoUrl}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover border border-border/50"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <LogoFallback
                          name={product.websiteName}
                          className={`w-8 h-8 rounded-lg text-xs ${
                            product.logoUrl ? "hidden" : "flex"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">
                            {product.websiteName}
                          </span>
                          {product.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-soft dark:bg-elevated border border-border/60 text-muted">
                              {product.category.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted truncate">
                          {product.description || product.websiteUrl}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-xs font-semibold text-coral">
                        {formatINR(product.currentAmount)}
                      </span>
                      <IconArrowUpRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? "text-coral translate-x-0.5 -translate-y-0.5" : "text-muted/40"
                        }`}
                      />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-muted">
                No matching products found
              </div>
            )}
          </div>

          {/* Categories Section */}
          {filteredCategories.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                Categories
              </div>
              {filteredCategories.map((category, catIdx) => {
                const globalIndex = productsList.length + catIdx;
                const isSelected = selectedIndex === globalIndex;
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      navigate(`/categories/${category.id}`);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-coral/10 dark:bg-coral/20 text-charcoal dark:text-white"
                        : "hover:bg-surface-soft dark:hover:bg-elevated text-charcoal dark:text-cream"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-muted">
                        <CategoryIcon idOrName={category.id} className="w-4 h-4" />
                      </span>
                      <span className="text-sm font-medium truncate">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted font-mono">
                      {category.productCount || 0} products
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-soft/60 dark:bg-elevated/60 border-t border-border/60 text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> Select
            </span>
          </div>
          <span>TopRankPlots Global Metropolis</span>
        </div>
      </div>
    </div>
  );
}
