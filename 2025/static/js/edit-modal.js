/**
 * Student Project Edit Modal
 * A beautiful overlay interface for editing student project data
 */

(function() {
  'use strict';

  // State management
  let originalData = {};
  let currentData = {};
  let isDirty = false;
  let draggedItem = null;

  // Context options
  const CONTEXTS = [
    'Digital Context',
    'Autonomous Context',
    'Applied Context',
    'Socio-Political Context',
    'Jewelry Context'
  ];

  /**
   * Initialize the edit modal functionality
   */
  function init() {
    // Only initialize on student detail pages
    if (!document.querySelector('.meta')) return;

    injectEditButton();
    injectModal();
    bindEvents();
  }

  /**
   * Inject the edit button into the page
   */
  function injectEditButton() {
    const meta = document.querySelector('.meta');
    if (!meta) return;

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-project-btn';
    editBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      <span>Edit Project</span>
    `;
    editBtn.setAttribute('aria-label', 'Edit project');

    meta.style.position = 'relative';
    meta.appendChild(editBtn);
  }

  /**
   * Inject the modal HTML into the page
   */
  function injectModal() {
    const modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.className = 'edit-modal';
    modal.innerHTML = `
      <div class="edit-modal__backdrop"></div>
      <div class="edit-modal__container">
        <div class="edit-modal__header">
          <h2 class="edit-modal__title">Edit Project</h2>
          <button class="edit-modal__close" aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="edit-modal__content">
          <!-- Identity Section -->
          <section class="edit-section edit-section--identity">
            <div class="edit-section__header">
              <div class="edit-section__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h3>Identity</h3>
            </div>
            <div class="edit-section__content">
              <div class="edit-field">
                <label for="edit-student-name">Student Name</label>
                <input type="text" id="edit-student-name" name="student_name" class="edit-input" />
              </div>
              <div class="edit-field">
                <label for="edit-project-title">Project Title</label>
                <input type="text" id="edit-project-title" name="project_title" class="edit-input edit-input--large" />
              </div>
            </div>
          </section>

          <!-- Classification Section -->
          <section class="edit-section edit-section--classification">
            <div class="edit-section__header">
              <div class="edit-section__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
              </div>
              <h3>Classification</h3>
            </div>
            <div class="edit-section__content edit-section__content--row">
              <div class="edit-field edit-field--flex">
                <label for="edit-context">Context</label>
                <select id="edit-context" name="context" class="edit-select">
                  ${CONTEXTS.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
              <div class="edit-field">
                <label for="edit-year">Year</label>
                <input type="text" id="edit-year" name="year" class="edit-input edit-input--small" placeholder="2024-2025" />
              </div>
            </div>
          </section>

          <!-- Story Section -->
          <section class="edit-section edit-section--story">
            <div class="edit-section__header">
              <div class="edit-section__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <h3>Project Story</h3>
            </div>
            <div class="edit-section__content">
              <div class="edit-field">
                <label for="edit-description">Description</label>
                <textarea id="edit-description" name="description" class="edit-textarea" rows="8" placeholder="Tell the story of your project..."></textarea>
              </div>
            </div>
          </section>

          <!-- Media Section -->
          <section class="edit-section edit-section--media">
            <div class="edit-section__header">
              <div class="edit-section__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
              <h3>Media Gallery</h3>
              <span class="edit-section__hint">Drag to reorder</span>
            </div>
            <div class="edit-section__content">
              <div class="edit-field">
                <label>Main Image</label>
                <div class="edit-main-image" id="edit-main-image">
                  <img src="" alt="Main project image" />
                  <div class="edit-main-image__label">Hero Image</div>
                </div>
              </div>
              <div class="edit-field">
                <label>Gallery Images</label>
                <div class="edit-gallery" id="edit-gallery">
                  <!-- Images will be populated dynamically -->
                </div>
                <p class="edit-hint">Drag images to reorder. First image can be set as main.</p>
              </div>
            </div>
          </section>

          <!-- Links Section -->
          <section class="edit-section edit-section--links">
            <div class="edit-section__header">
              <div class="edit-section__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </div>
              <h3>Social Links</h3>
            </div>
            <div class="edit-section__content">
              <div class="edit-links" id="edit-links">
                <!-- Links will be populated dynamically -->
              </div>
              <button type="button" class="edit-add-link" id="edit-add-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Link
              </button>
            </div>
          </section>
        </div>

        <div class="edit-modal__footer">
          <div class="edit-modal__status" id="edit-status"></div>
          <div class="edit-modal__actions">
            <button type="button" class="edit-btn edit-btn--secondary" id="edit-cancel">Cancel</button>
            <button type="button" class="edit-btn edit-btn--primary" id="edit-save">
              <span>Save Changes</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * Bind all event listeners
   */
  function bindEvents() {
    // Edit button
    document.querySelector('.edit-project-btn')?.addEventListener('click', openModal);

    // Close modal
    document.querySelector('.edit-modal__close')?.addEventListener('click', closeModal);
    document.querySelector('.edit-modal__backdrop')?.addEventListener('click', closeModal);
    document.getElementById('edit-cancel')?.addEventListener('click', closeModal);

    // Save button
    document.getElementById('edit-save')?.addEventListener('click', saveChanges);

    // Add link button
    document.getElementById('edit-add-link')?.addEventListener('click', addLinkField);

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('edit-modal')?.classList.contains('is-open')) {
        closeModal();
      }
    });

    // Track changes
    document.getElementById('edit-modal')?.addEventListener('input', () => {
      isDirty = true;
      updateSaveButton();
    });
  }

  /**
   * Open the modal and populate with current data
   */
  function openModal() {
    const modal = document.getElementById('edit-modal');
    if (!modal) return;

    // Gather current data from the page
    gatherCurrentData();

    // Populate form fields
    populateForm();

    // Show modal with animation
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Focus first input
    setTimeout(() => {
      document.getElementById('edit-student-name')?.focus();
    }, 300);
  }

  /**
   * Close the modal
   */
  function closeModal() {
    const modal = document.getElementById('edit-modal');
    if (!modal) return;

    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }

    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    isDirty = false;
  }

  /**
   * Gather current data from the page
   */
  function gatherCurrentData() {
    const meta = document.querySelector('.meta');
    const article = document.querySelector('article');
    const mainImage = document.querySelector('.main-image');
    const images = document.querySelectorAll('.image');
    const socialLinks = document.querySelectorAll('.social-link');

    originalData = {
      student_name: meta?.querySelector('h3')?.textContent?.trim() || '',
      project_title: meta?.querySelector('h2')?.textContent?.trim() || '',
      context: extractContext(meta?.querySelector('.year')?.textContent || ''),
      year: extractYear(meta?.querySelector('.year')?.textContent || ''),
      description: article?.textContent?.trim() || '',
      main_image: extractImageId(mainImage?.getAttribute('src') || mainImage?.getAttribute('cf-src') || ''),
      images: Array.from(images).map(img => extractImageId(img.getAttribute('src') || img.getAttribute('local-src') || '')),
      social_links: Array.from(socialLinks).map(link => link.getAttribute('href') || link.textContent)
    };

    currentData = JSON.parse(JSON.stringify(originalData));
  }

  /**
   * Extract context from combined string
   */
  function extractContext(str) {
    const match = str.match(/(Digital|Autonomous|Applied|Socio-Political|Jewelry)\s*Context/i);
    return match ? `${match[1]} Context` : 'Autonomous Context';
  }

  /**
   * Extract year from combined string
   */
  function extractYear(str) {
    const match = str.match(/\d{4}-\d{4}/);
    return match ? match[0] : '2024-2025';
  }

  /**
   * Extract image ID from URL
   */
  function extractImageId(url) {
    // Handle Cloudflare URLs
    const cfMatch = url.match(/imagedelivery\.net\/[^/]+\/([^/]+\/[^/]+)/);
    if (cfMatch) return cfMatch[1].replace(/\/\w+$/, '');

    // Handle local URLs
    const localMatch = url.match(/\/2025\/static\/media\/(.+)/);
    if (localMatch) return localMatch[1];

    return url;
  }

  /**
   * Populate the form with current data
   */
  function populateForm() {
    document.getElementById('edit-student-name').value = currentData.student_name;
    document.getElementById('edit-project-title').value = currentData.project_title;
    document.getElementById('edit-context').value = currentData.context;
    document.getElementById('edit-year').value = currentData.year;
    document.getElementById('edit-description').value = currentData.description;

    // Main image
    const mainImageContainer = document.getElementById('edit-main-image');
    const mainImg = mainImageContainer?.querySelector('img');
    if (mainImg && currentData.main_image) {
      mainImg.src = `https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${currentData.main_image}/thumb`;
    }

    // Gallery images
    populateGallery();

    // Social links
    populateLinks();
  }

  /**
   * Populate gallery with draggable images
   */
  function populateGallery() {
    const gallery = document.getElementById('edit-gallery');
    if (!gallery) return;

    gallery.innerHTML = '';

    currentData.images.forEach((imageId, index) => {
      const item = createGalleryItem(imageId, index);
      gallery.appendChild(item);
    });

    // Initialize drag and drop
    initDragAndDrop();
  }

  /**
   * Create a gallery item element
   */
  function createGalleryItem(imageId, index) {
    const item = document.createElement('div');
    item.className = 'edit-gallery__item';
    item.draggable = true;
    item.dataset.index = index;
    item.dataset.imageId = imageId;

    item.innerHTML = `
      <img src="https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${imageId}/thumb" alt="Gallery image ${index + 1}" />
      <div class="edit-gallery__item-actions">
        <button type="button" class="edit-gallery__set-main" title="Set as main image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </button>
        <span class="edit-gallery__item-order">${index + 1}</span>
      </div>
      <div class="edit-gallery__item-handle">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="5" r="1"></circle>
          <circle cx="9" cy="12" r="1"></circle>
          <circle cx="9" cy="19" r="1"></circle>
          <circle cx="15" cy="5" r="1"></circle>
          <circle cx="15" cy="12" r="1"></circle>
          <circle cx="15" cy="19" r="1"></circle>
        </svg>
      </div>
    `;

    // Set as main image handler
    item.querySelector('.edit-gallery__set-main')?.addEventListener('click', (e) => {
      e.stopPropagation();
      setAsMainImage(imageId);
    });

    return item;
  }

  /**
   * Initialize drag and drop for gallery
   */
  function initDragAndDrop() {
    const gallery = document.getElementById('edit-gallery');
    if (!gallery) return;

    const items = gallery.querySelectorAll('.edit-gallery__item');

    items.forEach(item => {
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
      item.addEventListener('dragover', handleDragOver);
      item.addEventListener('drop', handleDrop);
      item.addEventListener('dragenter', handleDragEnter);
      item.addEventListener('dragleave', handleDragLeave);
    });
  }

  function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
  }

  function handleDragEnd(e) {
    this.classList.remove('is-dragging');
    document.querySelectorAll('.edit-gallery__item').forEach(item => {
      item.classList.remove('drag-over');
    });
    draggedItem = null;
    updateGalleryOrder();
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
      this.classList.add('drag-over');
    }
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this !== draggedItem && draggedItem) {
      const gallery = document.getElementById('edit-gallery');
      const items = Array.from(gallery.querySelectorAll('.edit-gallery__item'));
      const fromIndex = items.indexOf(draggedItem);
      const toIndex = items.indexOf(this);

      if (fromIndex < toIndex) {
        this.parentNode.insertBefore(draggedItem, this.nextSibling);
      } else {
        this.parentNode.insertBefore(draggedItem, this);
      }

      isDirty = true;
      updateSaveButton();
    }

    this.classList.remove('drag-over');
  }

  /**
   * Update gallery order numbers and data
   */
  function updateGalleryOrder() {
    const gallery = document.getElementById('edit-gallery');
    if (!gallery) return;

    const items = gallery.querySelectorAll('.edit-gallery__item');
    const newOrder = [];

    items.forEach((item, index) => {
      item.dataset.index = index;
      item.querySelector('.edit-gallery__item-order').textContent = index + 1;
      newOrder.push(item.dataset.imageId);
    });

    currentData.images = newOrder;
  }

  /**
   * Set an image as the main image
   */
  function setAsMainImage(imageId) {
    currentData.main_image = imageId;

    const mainImageContainer = document.getElementById('edit-main-image');
    const mainImg = mainImageContainer?.querySelector('img');
    if (mainImg) {
      mainImg.src = `https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${imageId}/thumb`;
    }

    isDirty = true;
    updateSaveButton();
    showStatus('Main image updated', 'success');
  }

  /**
   * Populate social links
   */
  function populateLinks() {
    const linksContainer = document.getElementById('edit-links');
    if (!linksContainer) return;

    linksContainer.innerHTML = '';

    if (currentData.social_links.length === 0) {
      addLinkField();
    } else {
      currentData.social_links.forEach((link, index) => {
        addLinkField(link);
      });
    }
  }

  /**
   * Add a new link field
   */
  function addLinkField(value = '') {
    const linksContainer = document.getElementById('edit-links');
    if (!linksContainer) return;

    const linkItem = document.createElement('div');
    linkItem.className = 'edit-link-item';
    linkItem.innerHTML = `
      <input type="url" class="edit-input edit-link-input" value="${value}" placeholder="https://example.com" />
      <button type="button" class="edit-link-remove" aria-label="Remove link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    linkItem.querySelector('.edit-link-remove')?.addEventListener('click', () => {
      linkItem.remove();
      isDirty = true;
      updateSaveButton();
    });

    linksContainer.appendChild(linkItem);
  }

  /**
   * Update save button state
   */
  function updateSaveButton() {
    const saveBtn = document.getElementById('edit-save');
    if (saveBtn) {
      saveBtn.classList.toggle('has-changes', isDirty);
    }
  }

  /**
   * Show status message
   */
  function showStatus(message, type = 'info') {
    const status = document.getElementById('edit-status');
    if (!status) return;

    status.textContent = message;
    status.className = `edit-modal__status edit-modal__status--${type}`;

    setTimeout(() => {
      status.textContent = '';
      status.className = 'edit-modal__status';
    }, 3000);
  }

  /**
   * Gather form data
   */
  function gatherFormData() {
    const links = Array.from(document.querySelectorAll('.edit-link-input'))
      .map(input => input.value.trim())
      .filter(link => link.length > 0);

    return {
      student_name: document.getElementById('edit-student-name')?.value?.trim() || '',
      project_title: document.getElementById('edit-project-title')?.value?.trim() || '',
      context: document.getElementById('edit-context')?.value || '',
      year: document.getElementById('edit-year')?.value?.trim() || '',
      description: document.getElementById('edit-description')?.value?.trim() || '',
      main_image: currentData.main_image,
      images: currentData.images,
      social_links: links
    };
  }

  /**
   * Save changes
   */
  async function saveChanges() {
    const saveBtn = document.getElementById('edit-save');
    if (!saveBtn) return;

    const formData = gatherFormData();

    // Validate required fields
    if (!formData.student_name || !formData.project_title) {
      showStatus('Please fill in all required fields', 'error');
      return;
    }

    // Show saving state
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
      <span>Saving...</span>
      <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"></circle>
      </svg>
    `;

    try {
      // Get current page slug from URL
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const slug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

      // Create the update payload
      const payload = {
        slug: slug,
        data: formData
      };

      // Try to save via Netlify CMS API or local storage fallback
      const saved = await saveToBackend(payload);

      if (saved) {
        showStatus('Changes saved successfully!', 'success');
        isDirty = false;
        updateSaveButton();

        // Update the page with new data
        updatePageDisplay(formData);

        setTimeout(() => {
          closeModal();
        }, 1500);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Save error:', error);
      showStatus('Changes saved locally. Sync when online.', 'warning');

      // Save to localStorage as fallback
      saveToLocalStorage(formData);
      isDirty = false;
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <span>Save Changes</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    }
  }

  /**
   * Save to backend (Netlify CMS or custom endpoint)
   */
  async function saveToBackend(payload) {
    // Check if Netlify Identity is available
    if (window.netlifyIdentity?.currentUser()) {
      // User is logged in, attempt to save via Git Gateway
      try {
        const response = await fetch('/.netlify/git/github/contents/2025/students/' + payload.slug + '.md', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.netlifyIdentity.currentUser().token.access_token}`
          },
          body: JSON.stringify({
            message: `Update ${payload.data.student_name}'s project`,
            content: btoa(unescape(encodeURIComponent(generateMarkdown(payload.data)))),
            sha: await getFileSha(payload.slug)
          })
        });
        return response.ok;
      } catch (e) {
        console.warn('Git Gateway save failed:', e);
        return false;
      }
    }

    // Fallback: save to localStorage
    return false;
  }

  /**
   * Generate markdown content from form data
   */
  function generateMarkdown(data) {
    const frontmatter = [
      '---',
      `student_name: ${data.student_name}`,
      `project_title: ${data.project_title}`,
      `context: ${data.context}`,
      `year: ${data.year}`,
      `main_image: ${data.main_image}`,
      'images:'
    ];

    data.images.forEach(img => {
      frontmatter.push(`  - ${img}`);
    });

    frontmatter.push('social_links:');
    data.social_links.forEach(link => {
      frontmatter.push(`  - ${link}`);
    });

    frontmatter.push('---');
    frontmatter.push(data.description);

    return frontmatter.join('\n');
  }

  /**
   * Get file SHA for GitHub API
   */
  async function getFileSha(slug) {
    try {
      const response = await fetch(`/.netlify/git/github/contents/2025/students/${slug}.md`, {
        headers: {
          'Authorization': `Bearer ${window.netlifyIdentity?.currentUser()?.token?.access_token}`
        }
      });
      const data = await response.json();
      return data.sha;
    } catch (e) {
      return null;
    }
  }

  /**
   * Save to localStorage as fallback
   */
  function saveToLocalStorage(data) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const slug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

    const key = `sintlucas_edit_${slug}`;
    localStorage.setItem(key, JSON.stringify({
      data: data,
      timestamp: Date.now()
    }));
  }

  /**
   * Update the page display with new data
   */
  function updatePageDisplay(data) {
    // Update meta section
    const meta = document.querySelector('.meta');
    if (meta) {
      const h2 = meta.querySelector('h2');
      const h3 = meta.querySelector('h3');
      const year = meta.querySelector('.year');

      if (h2) h2.textContent = data.project_title;
      if (h3) h3.textContent = data.student_name;
      if (year) year.innerHTML = `${data.context}&nbsp;&nbsp;${data.year}`;
    }

    // Update article
    const article = document.querySelector('article');
    if (article) {
      article.innerHTML = `<p>${data.description}</p>`;
    }

    // Update main image
    const mainImage = document.querySelector('.main-image');
    if (mainImage && data.main_image) {
      mainImage.src = `https://imagedelivery.net/7-GLn6-56OyK7JwwGe0hfg/${data.main_image}/xl`;
    }

    // Update social links
    const socialLinksContainer = document.querySelector('.social-links');
    if (socialLinksContainer) {
      socialLinksContainer.innerHTML = data.social_links
        .map(link => `<a class="social-link" target="_blank" href="${link}">${link.replace('https://', '')}</a>`)
        .join('');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
