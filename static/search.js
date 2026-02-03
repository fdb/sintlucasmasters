const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

const setStatus = (statusEl, message, tone = "") => {
  statusEl.textContent = message;
  statusEl.dataset.tone = tone;
};

const createSearchController = () => {
  const container = document.querySelector("[data-site-search]");
  if (!container) return null;

  const toggle = container.querySelector("[data-search-toggle]");
  const field = container.querySelector("[data-search-field]");
  const input = container.querySelector("[data-search-input]");
  const status = container.querySelector("[data-search-status]");

  if (!toggle || !field || !input || !status) return null;

  const main = document.querySelector("main");
  const grid = document.querySelector("[data-project-grid]");
  const initialGridHtml = grid ? grid.innerHTML : "";
  const initialMainHtml = main ? main.innerHTML : "";
  const existingEmptyState = document.querySelector(".empty-state");
  const initialEmptyText = existingEmptyState?.textContent || "";
  const hadInitialEmptyState = Boolean(existingEmptyState);
  let searchEmptyState = existingEmptyState;
  let createdEmptyState = false;
  let dynamicGrid = null;
  let activeGrid = grid;
  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = (urlParams.get("search") || "").trim();

  let isOpen = false;
  let debounceId = null;
  let activeController = null;

  const setOpen = (nextOpen) => {
    isOpen = nextOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
    container.dataset.open = isOpen ? "true" : "false";
    field.setAttribute("aria-hidden", String(!isOpen));
    input.tabIndex = isOpen ? 0 : -1;
    if (!isOpen) {
      if (input.value.trim()) {
        input.value = "";
        resetGrid();
        updateSearchParam("");
        setStatus(status, `Type at least ${SEARCH_MIN_LENGTH} characters.`);
      } else if (dynamicGrid) {
        resetGrid();
      }
    }
    if (isOpen) {
      input.focus();
    }
  };

  const ensureGrid = () => {
    if (activeGrid) return activeGrid;
    if (!main) return null;
    if (!dynamicGrid) {
      dynamicGrid = document.createElement("div");
      dynamicGrid.className = "grid";
      dynamicGrid.dataset.searchGrid = "true";
      main.innerHTML = "";
      main.appendChild(dynamicGrid);
    }
    activeGrid = dynamicGrid;
    return activeGrid;
  };

  const ensureEmptyState = () => {
    const gridEl = ensureGrid();
    if (!gridEl) return null;
    if (searchEmptyState && searchEmptyState.isConnected) return searchEmptyState;
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.dataset.searchEmpty = "true";
    gridEl.insertAdjacentElement("afterend", empty);
    createdEmptyState = true;
    searchEmptyState = empty;
    return empty;
  };

  const showEmptyState = (message) => {
    const empty = ensureEmptyState();
    if (!empty) return;
    empty.textContent = message;
    empty.style.display = "block";
  };

  const hideEmptyState = () => {
    const empty = searchEmptyState;
    if (!empty) return;
    empty.style.display = "none";
  };

  const resetGrid = () => {
    if (dynamicGrid) {
      if (main) {
        main.innerHTML = initialMainHtml;
      }
      dynamicGrid = null;
      activeGrid = grid;
      searchEmptyState = existingEmptyState;
      createdEmptyState = false;
      return;
    }

    if (!grid) return;
    grid.innerHTML = initialGridHtml;
    if (hadInitialEmptyState) {
      const empty = searchEmptyState;
      if (empty) {
        empty.textContent = initialEmptyText;
        empty.style.display = "block";
      }
    } else if (createdEmptyState) {
      if (searchEmptyState) searchEmptyState.remove();
      searchEmptyState = null;
      createdEmptyState = false;
    }
  };

  const updateGrid = (html) => {
    const gridEl = ensureGrid();
    if (!gridEl) return 0;
    gridEl.innerHTML = html;
    gridEl.classList.remove("search-fade");
    void gridEl.offsetWidth;
    gridEl.classList.add("search-fade");

    const cardCount = gridEl.querySelectorAll(".card").length;
    if (!cardCount) {
      showEmptyState("No results found.");
      return 0;
    }

    hideEmptyState();
    return cardCount;
  };

  const updateSearchParam = (query) => {
    const url = new URL(window.location.href);
    if (query.length >= SEARCH_MIN_LENGTH) {
      url.searchParams.set("search", query);
    } else {
      url.searchParams.delete("search");
    }
    window.history.replaceState({}, "", url);
  };

  const runSearch = async (query) => {
    if (!main && !grid) return;
    ensureGrid();

    if (activeController) {
      activeController.abort();
    }
    activeController = new AbortController();

    setStatus(status, "Searching...", "loading");

    try {
      const params = new URLSearchParams({ query });
      const response = await fetch(`/api/search?${params.toString()}`, {
        headers: {
          Accept: "text/html",
        },
        signal: activeController.signal,
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const html = await response.text();
      const countFromGrid = updateGrid(html);

      const countHeader = response.headers.get("x-results-count");
      const count = countHeader ? Number.parseInt(countHeader, 10) : countFromGrid;
      const displayCount = Number.isFinite(count) ? count : countFromGrid;
      setStatus(status, `${displayCount} result${displayCount === 1 ? "" : "s"}`);
      updateSearchParam(query);
    } catch (error) {
      if (error.name === "AbortError") return;
      setStatus(status, "Search unavailable. Try again.", "error");
    }
  };

  const handleInput = () => {
    const query = input.value.trim();
    if (query.length < SEARCH_MIN_LENGTH) {
      if (activeController) activeController.abort();
      setStatus(status, `Type at least ${SEARCH_MIN_LENGTH} characters.`);
      resetGrid();
      updateSearchParam("");
      return;
    }

    if (debounceId) {
      window.clearTimeout(debounceId);
    }

    debounceId = window.setTimeout(() => {
      runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleKeydown = (event) => {
    if (event.key === "Escape") {
      if (input.value.trim()) {
        input.value = "";
        resetGrid();
        updateSearchParam("");
        setStatus(status, `Type at least ${SEARCH_MIN_LENGTH} characters.`);
        return;
      }
      setOpen(false);
      input.blur();
    }
  };

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    setOpen(!isOpen);
  });

  input.addEventListener("input", handleInput);
  document.addEventListener("keydown", handleKeydown);

  setOpen(false);
  setStatus(status, `Type at least ${SEARCH_MIN_LENGTH} characters.`);
  if (initialSearch.length >= SEARCH_MIN_LENGTH) {
    input.value = initialSearch;
    setOpen(true);
    runSearch(initialSearch);
  }
  return { setOpen };
};

document.addEventListener("DOMContentLoaded", () => {
  createSearchController();
});
