if (!window.Eurus.loadedScript.includes('sticky-atc.js')) {
  window.Eurus.loadedScript.push('sticky-atc.js');

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.data('xStickyATC', (sectionId) => ({
        openDetailOnMobile: false,
        currentAvailableOptions: [],
        options: [],
        init() {
          this.variants = xParseJSON(this.$el.getAttribute('x-variants-data'));

          document.addEventListener(`eurus:product-page-variant-select:updated:${sectionId}`, (e) => {
            this.currentAvailableOptions = e.detail.currentAvailableOptions,
            this.options = e.detail.options;

            this.renderProductPrice(e.detail.html);
            this.renderMedia(e.detail.html);
          });
        },
        renderProductPrice(html) {
          const destinations = document.querySelectorAll(`.price-sticky-${sectionId}`);
          destinations.forEach((destination) => {
            const source = html.getElementById('price-sticky-' + sectionId);
            if (source && destination) destination.innerHTML = source.innerHTML;
          })
        },
        renderMedia(html) {
          const destination = document.getElementById('product-image-sticky-' + sectionId);
          const source = html.getElementById('product-image-sticky-' + sectionId);
  
          if (source && destination) destination.innerHTML = source.innerHTML;
        }
      }))
    })
  })
}