(() => {
  const hero = document.querySelector(".detail-hero img");
  const galleryThumbs = Array.from(document.querySelectorAll(".detail-gallery img[data-lightbox-src]"));
  const thumbs = hero ? [hero, ...galleryThumbs] : galleryThumbs;
  if (thumbs.length === 0) return;

  const sources = thumbs.map((img) => img.getAttribute("data-lightbox-src") || img.src);
  const alts = thumbs.map((img) => img.getAttribute("alt") || "");

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("aria-hidden", "true");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "lightbox-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.className = "lightbox-nav lightbox-prev";
  prevButton.setAttribute("aria-label", "Previous image");
  prevButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-icon lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "lightbox-nav lightbox-next";
  nextButton.setAttribute("aria-label", "Next image");
  nextButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right-icon lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

  const media = document.createElement("div");
  media.className = "lightbox-media";

  const imageA = document.createElement("img");
  imageA.className = "lightbox-image";
  imageA.alt = "";

  const imageB = document.createElement("img");
  imageB.className = "lightbox-image";
  imageB.alt = "";

  media.append(imageA, imageB);
  lightbox.append(closeButton, prevButton, media, nextButton);
  document.body.appendChild(lightbox);

  let currentIndex = 0;
  let isOpen = false;
  let activeSlot = 0;
  const images = [imageA, imageB];

  let transitionToken = 0;
  const setImage = (index) => {
    const total = sources.length;
    currentIndex = (index + total) % total;
    const nextSrc = sources[currentIndex];
    const nextAlt = alts[currentIndex] || "";
    const nextSlot = activeSlot === 0 ? 1 : 0;
    const nextImg = images[nextSlot];
    const currentImg = images[activeSlot];
    const token = (transitionToken += 1);

    nextImg.classList.remove("is-active");

    nextImg.src = nextSrc;
    nextImg.alt = nextAlt;

    requestAnimationFrame(() => {
      if (token !== transitionToken) return;
      nextImg.classList.add("is-active");
      currentImg.classList.remove("is-active");
    });

    activeSlot = nextSlot;
  };

  const open = (index) => {
    setImage(index);
    if (isOpen) return;
    isOpen = true;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
  };

  const showPrev = (event) => {
    if (event) event.stopPropagation();
    setImage(currentIndex - 1);
  };

  const showNext = (event) => {
    if (event) event.stopPropagation();
    setImage(currentIndex + 1);
  };

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener("click", (event) => {
      event.preventDefault();
      open(index);
    });
  });

  prevButton.addEventListener("click", showPrev);
  nextButton.addEventListener("click", showNext);
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    close();
  });

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });

  media.addEventListener("click", (event) => {
    const activeImage = images[activeSlot];
    const rect = activeImage.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    if (clickX < rect.width / 2) {
      showPrev();
    } else {
      showNext();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!isOpen) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") showPrev();
    if (event.key === "ArrowRight") showNext();
  });
})();
