(() => {
  "use strict";

  const fileInput = document.getElementById("file-input");
  const uploadTray = document.getElementById("upload-tray");
  const uploadSave = document.getElementById("upload-save");
  const dropOverlay = document.getElementById("drop-overlay");

  const deletePanel = document.getElementById("delete-panel");
  const deleteForm = document.getElementById("delete-form");
  const deleteTray = document.getElementById("delete-tray");

  const gallery = document.getElementById("gallery");
  const monthNav = document.getElementById("month-nav");

  const imageMenu = document.getElementById("image-menu");
  const imageMenuStatus = document.getElementById("image-menu-status");

  // ---------- Upload staging ----------

  let stagedFiles = [];

  function syncFileInput() {
    const dt = new DataTransfer();
    stagedFiles.forEach((file) => dt.items.add(file));
    fileInput.files = dt.files;
  }

  function renderUploadTray() {
    uploadTray.innerHTML = "";
    stagedFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "tray-item";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      item.appendChild(img);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "tray-remove";
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        URL.revokeObjectURL(img.src);
        stagedFiles.splice(index, 1);
        syncFileInput();
        renderUploadTray();
      });
      item.appendChild(remove);

      uploadTray.appendChild(item);
    });

    uploadSave.hidden = stagedFiles.length === 0;
  }

  function addFiles(fileList) {
    const images = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    stagedFiles = stagedFiles.concat(images);
    syncFileInput();
    renderUploadTray();
  }

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) addFiles(fileInput.files);
  });

  // Whole page is a drop zone.
  ["dragenter", "dragover"].forEach((type) => {
    document.body.addEventListener(type, (event) => {
      if (!event.dataTransfer || !event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      dropOverlay.hidden = false;
    });
  });

  document.body.addEventListener("dragleave", (event) => {
    if (event.relatedTarget === null || !document.body.contains(event.relatedTarget)) {
      dropOverlay.hidden = true;
    }
  });

  document.body.addEventListener("drop", (event) => {
    if (!event.dataTransfer || !event.dataTransfer.files.length) return;
    event.preventDefault();
    dropOverlay.hidden = true;
    addFiles(event.dataTransfer.files);
  });

  // ---------- Delete staging ----------

  const pendingDeletions = new Map(); // path -> { path, name, url }

  function renderDeleteTray() {
    deleteTray.innerHTML = "";
    deleteForm.querySelectorAll('input[name="paths"]').forEach((el) => el.remove());

    pendingDeletions.forEach(({ path, name, url }) => {
      const item = document.createElement("div");
      item.className = "tray-item";

      const img = document.createElement("img");
      img.src = url;
      img.alt = name;
      item.appendChild(img);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "tray-remove";
      remove.setAttribute("aria-label", `Keep ${name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        pendingDeletions.delete(path);
        renderDeleteTray();
      });
      item.appendChild(remove);
      deleteTray.appendChild(item);

      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "paths";
      hidden.value = path;
      deleteForm.appendChild(hidden);
    });

    deletePanel.hidden = pendingDeletions.size === 0;
  }

  // ---------- Gallery ----------

  function monthNumberKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  function renderGallery(months) {
    monthNav.innerHTML = "";
    gallery.innerHTML = "";

    if (!months.length) {
      gallery.innerHTML = '<p class="empty">No images yet — drop some in to get started.</p>';
      return;
    }

    const currentKey = monthNumberKey(new Date());

    months.forEach((month) => {
      const link = document.createElement("a");
      link.href = `#${month.key}`;
      link.textContent = month.label;
      if (month.key === currentKey) link.classList.add("current");
      monthNav.appendChild(link);

      const section = document.createElement("section");
      section.className = "month-section";
      section.id = month.key;

      const heading = document.createElement("h2");
      heading.textContent = month.label;
      section.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "image-grid";

      month.images.forEach((image) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.url = image.url;
        btn.dataset.path = image.path;
        btn.dataset.name = image.name;

        const img = document.createElement("img");
        img.src = image.url;
        img.alt = image.name;
        img.loading = "lazy";
        btn.appendChild(img);

        grid.appendChild(btn);
      });

      section.appendChild(grid);
      gallery.appendChild(section);
    });
  }

  async function loadGallery() {
    try {
      const res = await fetch("/.netlify/functions/list");
      if (res.status === 401) {
        window.location.href = "/login/";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      renderGallery(data.months || []);
    } catch (err) {
      gallery.innerHTML = `<p class="empty">Couldn’t load images (${err.message}). Try reloading the page.</p>`;
    }
  }

  // ---------- Image popup menu ----------

  let activeImage = null;

  function openMenu(button) {
    activeImage = {
      url: button.dataset.url,
      path: button.dataset.path,
      name: button.dataset.name,
    };
    imageMenuStatus.hidden = true;
    imageMenuStatus.textContent = "";

    const rect = button.getBoundingClientRect();
    imageMenu.style.top = `${rect.bottom + window.scrollY + 4}px`;
    imageMenu.style.left = `${rect.left + window.scrollX}px`;
    imageMenu.hidden = false;
  }

  function closeMenu() {
    imageMenu.hidden = true;
    activeImage = null;
  }

  gallery.addEventListener("click", (event) => {
    const button = event.target.closest("#gallery button");
    if (!button) return;
    event.stopPropagation();
    openMenu(button);
  });

  document.addEventListener("click", (event) => {
    if (!imageMenu.hidden && !imageMenu.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  imageMenu.addEventListener("click", async (event) => {
    const action = event.target.dataset && event.target.dataset.action;
    if (!action || !activeImage) return;

    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(activeImage.url);
        imageMenuStatus.textContent = "Copied!";
      } catch {
        imageMenuStatus.textContent = "Couldn’t copy — copy it manually.";
      }
      imageMenuStatus.hidden = false;
      return;
    }

    if (action === "delete") {
      pendingDeletions.set(activeImage.path, { ...activeImage });
      renderDeleteTray();
      closeMenu();
    }
  });

  loadGallery();
})();
