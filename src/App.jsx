import React, { useEffect, useMemo, useRef, useState } from "react";
import { Book, Search, Star, X, Filter, Loader2, Info } from "lucide-react";

/**
 * Book Finder – React + Tailwind (single-file component)
 * API: https://openlibrary.org/search.json
 * Cover images: https://covers.openlibrary.org/b/id/{cover_i}-M.jpg
 *
 * Notes:
 * - No auth needed. Requests are debounced & cancellable to avoid race conditions.
 * - Pagination via `page`. We fetch 20 results at a time. Infinite "Load more".
 * - Sort client-side (title, author, first publish year) or use API relevance.
 * - Filters: Title, Author, Subject/Keyword, Year range, Language.
 * - View: Grid/List toggle. Favorites saved to localStorage for Alex.
 * - Detail modal fetches Work details when possible (best-effort).
 */

const PAGE_SIZE = 20;
const LANG_OPTS = [
  { code: "", label: "Any" },
  { code: "eng", label: "English" },
  { code: "hin", label: "Hindi" },
  { code: "tel", label: "Telugu" },
  { code: "tam", label: "Tamil" },
  { code: "mar", label: "Marathi" },
  { code: "kan", label: "Kannada" },
  { code: "ben", label: "Bengali" },
];

const SORTS = [
  { id: "relevance", label: "Relevance (API)" },
  { id: "year", label: "Year (old → new)" },
  { id: "year_desc", label: "Year (new → old)" },
  { id: "title", label: "Title (A–Z)" },
  { id: "author", label: "Author (A–Z)" },
];

function useDebouncedValue(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

function BookCard({ book, layout = "grid", onSelect, onToggleFav, fav }) {
  const cover = book.cover_i
    ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
    : `https://placehold.co/300x450?text=No+Cover`;
  const authors = (book.author_name || []).join(", ");
  const year = book.first_publish_year || "—";
  const subjects = (book.subject || []).slice(0, 3).join(" · ");

  return (
    <div
      className={
        layout === "grid"
          ? "group relative rounded-2xl border border-amber-200 bg-white shadow-md hover:shadow-lg hover:scale-105 hover:border-amber-300 transition-all duration-300 cursor-pointer overflow-hidden"
          : "flex gap-5 items-center rounded-2xl border border-amber-200 bg-white shadow-md hover:shadow-lg hover:border-amber-300 transition-all duration-300 cursor-pointer overflow-hidden"
      }
      onClick={() => onSelect(book)}
    >
      <div className={layout === "grid" ? "" : "w-24 shrink-0"}>
        <img
          src={cover}
          alt={book.title}
          className={
            layout === "grid"
              ? "w-full aspect-[2/3] object-cover"
              : "w-24 h-32 object-cover rounded-xl ml-4"
          }
          loading="lazy"
        />
      </div>
      <div className={layout === "grid" ? "p-4" : "flex-1 min-w-0 p-4"}>
        <h3 className="font-semibold text-gray-800 line-clamp-2 text-base leading-tight">
          {book.title}
        </h3>
        <p className="text-gray-700 line-clamp-1 mt-2">{authors || "Unknown author"}</p>
        <div className="mt-2 text-sm text-amber-900 flex items-center gap-2">
          <span>{year}</span>
          {subjects && (
            <>
              <span>•</span>
              <span className="line-clamp-1">{subjects}</span>
            </>
          )}
        </div>
      </div>
      <button
        className="absolute top-3 right-3 rounded-full p-2.5 bg-white/95 hover:bg-emerald-50 shadow-md border border-amber-200 transition-all hover:scale-110"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFav(book);
        }}
        aria-label={fav ? "Remove from favorites" : "Add to favorites"}
        title={fav ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={fav ? "fill-emerald-500 stroke-emerald-500" : "stroke-amber-600"} size={20} />
      </button>
    </div>
  );
}

function DetailModal({ book, onClose }) {
  const [loading, setLoading] = useState(false);
  const [work, setWork] = useState(null);
  const controller = useRef(null);

  useEffect(() => {
    if (!book) return;
    const key = (book.key || "").split("/").filter(Boolean)[1]; // works/OL...W
    if (!key) return;

    const fetchWork = async () => {
      try {
        controller.current?.abort();
        controller.current = new AbortController();
        setLoading(true);
        const res = await fetch(`https://openlibrary.org/works/${key}.json`, {
          signal: controller.current.signal,
        });
        if (!res.ok) throw new Error("Failed to load work");
        const data = await res.json();
        setWork(data);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchWork();
    return () => controller.current?.abort();
  }, [book]);

  if (!book) return null;
  const cover = book.cover_i
    ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
    : `https://placehold.co/400x600?text=No+Cover`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0" onClick={onClose}>
      <div
        className="w-full h-full bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left side - Book cover */}
        <div className="md:w-2/5 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center p-8">
          <div className="text-center">
            <img 
              src={cover} 
              alt={book.title} 
              className="w-64 h-96 object-cover rounded-2xl shadow-2xl mx-auto mb-6 border border-amber-200" 
            />
            <div className="flex items-center justify-center gap-2">
              <Star className="fill-emerald-500 stroke-emerald-500" size={24} />
              <span className="text-amber-900 font-medium text-lg">Available in your library</span>
            </div>
          </div>
        </div>
        
        {/* Right side - Book details */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 md:p-12">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight mb-4">{book.title}</h1>
                <p className="text-xl md:text-2xl text-gray-700 mb-6">
                  by {(book.author_name || []).join(", ") || "Unknown author"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-3 hover:bg-amber-50 transition-all hover:scale-110 ml-4"
                aria-label="Close"
              >
                <X size={28} className="text-amber-700" />
              </button>
            </div>

            {/* Book details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <div>
                  <span className="font-semibold text-gray-800 text-lg">First published:</span>
                  <span className="text-gray-700 text-lg ml-3">{book.first_publish_year || "—"}</span>
                </div>
                {book.publisher && (
                  <div>
                    <span className="font-semibold text-gray-800 text-lg">Publisher:</span>
                    <span className="text-gray-700 text-lg ml-3">{book.publisher.slice(0, 3).join(", ")}</span>
                  </div>
                )}
                {book.isbn && (
                  <div>
                    <span className="font-semibold text-gray-800 text-lg">ISBN:</span>
                    <span className="text-gray-700 text-lg ml-3">{book.isbn.slice(0, 3).join(", ")}</span>
                  </div>
                )}
              </div>
              {book.subject && (
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg mb-3">Subjects & Genres:</h3>
                  <div className="flex flex-wrap gap-2">
                    {book.subject.slice(0, 12).map((subject, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="border-t border-amber-200 pt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                <Info size={24}/> About This Book
              </h2>
              {loading ? (
                <div className="flex items-center gap-3 text-amber-700">
                  <Loader2 className="animate-spin" size={20}/>
                  <span className="text-lg">Loading description…</span>
                </div>
              ) : work?.description ? (
                <div className="prose prose-lg max-w-none">
                  <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                    {typeof work.description === "string" ? work.description : work.description?.value}
                  </p>
                </div>
              ) : (
                <p className="text-lg text-amber-700 italic">No description available for this book.</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="border-t border-amber-200 pt-8 mt-8">
              <div className="flex flex-wrap gap-4">
                <button className="px-8 py-4 bg-amber-600 text-white font-semibold text-lg rounded-2xl hover:bg-amber-700 transition-all shadow-md">
                  Find in Library
                </button>
                <button className="px-8 py-4 border border-amber-600 text-amber-700 font-semibold text-lg rounded-2xl hover:bg-amber-50 transition-all">
                  Save for Later
                </button>
                <button className="px-8 py-4 border border-amber-300 text-amber-800 font-semibold text-lg rounded-2xl hover:bg-amber-50 transition-all">
                  Share Book
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Query state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [lang, setLang] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [sort, setSort] = useState("relevance");
  const [view, setView] = useState("grid"); // grid | list

  // Results state
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [numFound, setNumFound] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const [favs, setFavs] = useLocalStorage("bookfinder:favs", {});

  const debTitle = useDebouncedValue(title);
  const debAuthor = useDebouncedValue(author);
  const debSubject = useDebouncedValue(subject);
  const debLang = useDebouncedValue(lang);
  const debYearMin = useDebouncedValue(yearMin);
  const debYearMax = useDebouncedValue(yearMax);
  const debSort = useDebouncedValue(sort);

  const controller = useRef(null);

  const queryKey = useMemo(
    () => `${debTitle}|${debAuthor}|${debSubject}|${debLang}|${debYearMin}|${debYearMax}|${debSort}`,
    [debTitle, debAuthor, debSubject, debLang, debYearMin, debYearMax, debSort]
  );

  useEffect(() => {
    // Reset results when query changes
    setItems([]);
    setPage(1);
  }, [queryKey]);

  useEffect(() => {
    const fetchPage = async () => {
      // Skip if no input at all
      if (![debTitle, debAuthor, debSubject].some(Boolean)) return;
      setLoading(true);
      setError("");
      try {
        controller.current?.abort();
        controller.current = new AbortController();

        const params = new URLSearchParams();
        if (debTitle) params.set("title", debTitle);
        if (debAuthor) params.set("author", debAuthor);
        if (debSubject) params.set("subject", debSubject);
        if (debLang) params.set("language", debLang);
        if (debYearMin) params.set("first_publish_year__gte", debYearMin);
        if (debYearMax) params.set("first_publish_year__lte", debYearMax);
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        // fields to slim payload
        params.set(
          "fields",
          [
            "key",
            "title",
            "author_name",
            "first_publish_year",
            "cover_i",
            "subject",
            "publisher",
            "isbn",
          ].join(",")
        );

        const url = `https://openlibrary.org/search.json?${params.toString()}`;
        const res = await fetch(url, { signal: controller.current.signal });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setNumFound(data.numFound || 0);
        setItems((prev) => {
          const merged = [...prev, ...(data.docs || [])];
          if (debSort !== "relevance") {
            return sortDocs(merged, debSort);
          }
          return merged;
        });
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchPage();

    return () => controller.current?.abort();
  }, [page, queryKey]);

  const hasMore = items.length < numFound;

  function sortDocs(docs, mode) {
    const cp = [...docs];
    switch (mode) {
      case "year":
        cp.sort((a, b) => (a.first_publish_year || 9e9) - (b.first_publish_year || 9e9));
        break;
      case "year_desc":
        cp.sort((a, b) => (b.first_publish_year || -9e9) - (a.first_publish_year || -9e9));
        break;
      case "title":
        cp.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "author":
        cp.sort((a, b) => (a.author_name?.[0] || "").localeCompare(b.author_name?.[0] || ""));
        break;
      default:
        break; // relevance is API order
    }
    return cp;
  }

  function toggleFav(book) {
    setFavs((prev) => {
      const k = book.key;
      const next = { ...prev };
      if (next[k]) delete next[k];
      else next[k] = {
        key: book.key,
        title: book.title,
        author: (book.author_name || []).join(", "),
        cover_i: book.cover_i || null,
      };
      return next;
    });
  }

  const favList = Object.values(favs);

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-orange-50 via-amber-25 to-yellow-50 text-gray-700 overflow-x-hidden" style={{ backgroundColor: '#FFFBF0' }}>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/95 border-b border-amber-200 shadow-sm w-full">
        <div className="px-4 py-4 flex items-center gap-3 w-full">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-600 text-white shadow-md"><Book size={20} /></div>
          <div className="flex-1">
            <h1 className="font-bold text-2xl leading-tight text-gray-800">Book Finder</h1>
            <p className="text-sm text-gray-700">For Alex – search by title, author, subject, year, or language.</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 w-full">
        {/* Search & Filters */}
        <div className="rounded-3xl bg-white shadow-lg p-4 md:p-6 border border-amber-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="text-base font-semibold text-gray-800">Title</label>
              <div className="mt-1 relative">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., The Alchemist"
                  className="w-full rounded-2xl border border-amber-300 px-12 py-3 bg-white text-gray-800 text-base placeholder-gray-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600" size={20} />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="text-base font-semibold text-gray-800">Author</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., Paulo Coelho"
                className="mt-1 w-full rounded-2xl border border-amber-300 px-4 py-3 bg-white text-gray-800 text-base placeholder-gray-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-base font-semibold text-gray-800">Subject / Keyword</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., fantasy"
                className="mt-1 w-full rounded-2xl border border-amber-300 px-4 py-3 bg-white text-gray-800 text-base placeholder-gray-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-base font-semibold text-gray-800">Language</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-amber-300 px-4 py-3 bg-white text-gray-800 text-base focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all"
              >
                {LANG_OPTS.map((o) => (
                  <option key={o.code} value={o.code} className="bg-white">{o.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-base font-semibold text-gray-800">Year from</label>
              <input
                inputMode="numeric"
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value.replace(/[^0-9-]/g, ""))}
                placeholder="e.g., 1990"
                className="mt-1 w-full rounded-2xl border border-amber-300 px-4 py-3 bg-white text-gray-800 text-base placeholder-gray-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-base font-semibold text-gray-800">Year to</label>
              <input
                inputMode="numeric"
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value.replace(/[^0-9-]/g, ""))}
                placeholder="e.g., 2020"
                className="mt-1 w-full rounded-2xl border border-amber-300 px-4 py-3 bg-white text-gray-800 text-base placeholder-gray-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-base font-semibold flex items-center gap-2 text-gray-800"><Filter size={18}/> Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-amber-300 px-4 py-3 bg-white text-gray-800 text-base focus:border-amber-600 focus:ring-2 focus:ring-amber-200 transition-all"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white">{s.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex items-end gap-3">
              <button
                onClick={() => setView(view === "grid" ? "list" : "grid")}
                className="w-full rounded-2xl px-4 py-3 bg-amber-600 text-white font-semibold text-base hover:bg-amber-700 transition-all shadow-md"
              >
                Toggle {view === "grid" ? "List" : "Grid"} View
              </button>
              <button
                onClick={() => {
                  setTitle("");
                  setAuthor("");
                  setSubject("");
                  setLang("");
                  setYearMin("");
                  setYearMax("");
                  setSort("relevance");
                }}
                className="rounded-2xl border border-amber-300 px-4 py-3 bg-white text-amber-900 font-semibold text-base hover:bg-amber-50 transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-base text-gray-700">
          <div>
            {items.length > 0 ? (
              <span>
                Showing <span className="font-medium text-gray-800">{items.length}</span> of
                {" "}
                <span className="font-medium text-gray-800">{numFound.toLocaleString()}</span> results
              </span>
            ) : (
              <span>Start by typing a title, author, or subject.</span>
            )}
          </div>
          {error && <span className="text-red-600 text-base">{error}</span>}
        </div>

        {/* Results */}
        <div className={view === "grid" ? "mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11 gap-4" : "mt-4 space-y-3"}>
          {items.map((b) => (
            <BookCard
              key={`${b.key}-${b.cover_i || "nocover"}`}
              book={b}
              layout={view}
              onSelect={setSelected}
              onToggleFav={toggleFav}
              fav={Boolean(favs[b.key])}
            />
          ))}
        </div>

        {/* Load more */}
        {items.length > 0 && (
          <div className="mt-6 flex items-center justify-center">
            {hasMore ? (
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 font-semibold text-lg shadow-md transition-all"
              >
                {loading && <Loader2 className="animate-spin" size={18}/>} Load more
              </button>
            ) : (
              <p className="text-base text-amber-900">No more results.</p>
            )}
          </div>
        )}

        {/* Favorites */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-800">
            <Star className="fill-emerald-500 stroke-emerald-500" size={22}/> Favorites
          </h2>
          {favList.length === 0 ? (
            <p className="text-base text-amber-900">Save books you like to quickly find them later.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11 gap-3">
              {favList.map((f) => (
                <div key={f.key} className="relative rounded-2xl bg-white shadow-md border border-amber-200 overflow-hidden">
                  <img
                    src={f.cover_i ? `https://covers.openlibrary.org/b/id/${f.cover_i}-M.jpg` : `https://placehold.co/300x450?text=No+Cover`}
                    alt={f.title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                  <div className="p-3">
                    <p className="text-base font-medium line-clamp-2 text-gray-800">{f.title}</p>
                    <p className="text-sm text-gray-700 line-clamp-1 mt-1">{f.author}</p>
                  </div>
                  <button
                    className="absolute top-3 right-3 rounded-full p-2.5 bg-white/95 hover:bg-red-50 transition-all hover:scale-110 shadow-md border border-amber-200"
                    title="Remove from favorites"
                    onClick={() => setFavs((prev) => { const n = { ...prev }; delete n[f.key]; return n; })}
                  >
                    <X size={18} className="text-amber-900" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {selected && <DetailModal book={selected} onClose={() => setSelected(null)} />}

      <footer className="mt-16 border-t border-amber-200 w-full">
        <div className="px-4 py-8 text-base text-amber-900 flex flex-wrap items-center gap-2 w-full">
          <span>Built with the Open Library API.</span>
          <a className="underline-offset-2 hover:underline text-amber-700" href="https://openlibrary.org/dev/docs/api/search" target="_blank" rel="noreferrer">API docs</a>
        </div>
      </footer>
    </div>
  );
}