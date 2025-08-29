# 📚 Book Finder

A modern **React + Vite + TailwindCSS** app to search and explore books using the **[Open Library API](https://openlibrary.org/dev/docs/api/search)**.  
Built with performance in mind: fast search, client-side sorting, debounced queries, infinite scroll, favorites, and a detailed book view.

---

## 🚀 Features
- 🔎 **Search by Title, Author, Subject, Year, or Language**
- ⚡ **Fast & Debounced API calls** (no extra requests while typing)
- 📄 **Paginated results** (infinite "Load more")
- 📚 **View toggle** → Grid / List layouts
- ⭐ **Save favorites** (stored in `localStorage`)
- 🔽 **Sorting** → by Relevance, Year, Title, Author
- 🏷 **Filters** → Year range + Language
- 📖 **Detail Modal** with book description, publishers, ISBN, and subjects
- 🎨 **Responsive UI** with TailwindCSS + Lucide icons

---

## 🖼 Preview
<img width="1900" height="924" alt="image" src="https://github.com/user-attachments/assets/d15b6a8b-bfeb-4a00-8981-81732f39a88a" />


---

## 🛠️ Tech Stack
- **React 18** (UI components)
- **Vite** (fast dev + build tool)
- **TailwindCSS** (utility-first styling)
- **Lucide-react** (icons)
- **Open Library API** (book data + covers)

---

## ⚙️ Installation & Setup

1. **Clone the repo**
   ``bash
   git clone https://github.com/your-username/Book_finder.git
   cd Book_finder
   npm run dev
