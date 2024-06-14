if (!window.Eurus.loadedScript.includes('product-media.js')) {
  window.Eurus.loadedScript.push('product-media.js');

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.data('xProductMedia', (settings) => ({
        thumbnailOnMouseDown: false,
        thumbnailOfset: 0,
        thumbnailScrollOfset: 0,
        thumbnailGrabbingClass: '',
        zoomIsOpen: false,
        productMediaIsOpen: '',
        videoExternalListened: false,
        thumbnailHandleMouseDown(e) {
          this.thumbnailOnMouseDown = true;
          this.thumbnailGrabbingClass = 'cursor-grabbing';
          if (settings.thumbnail_direction == 'horizontal') {
            this.thumbnailOfset = e.pageX - this.$refs.thumbnail.offsetLeft;
            this.thumbnailScrollOfset = this.$refs.thumbnail.scrollLeft;
          } else {
            this.thumbnailOfset = e.pageY - this.$refs.thumbnail.offsetTop;
            this.thumbnailScrollOfset = this.$refs.thumbnail.scrollTop;
          }
        },
        thumbnailHandleMouseMove(e) {
          if(!this.thumbnailOnMouseDown) return;
          e.preventDefault();
          if (settings.thumbnail_direction == 'horizontal') {
            const x = e.pageX - this.$refs.thumbnail.offsetLeft;
            const walk = (x - this.thumbnailOfset) * 2; 
            this.$refs.thumbnail.scrollLeft = this.thumbnailScrollOfset - walk;
          }
          else {
            const y = e.pageY - this.$refs.thumbnail.offsetTop;
            const walk = (y - this.thumbnailOfset) * 2; 
            this.$refs.thumbnail.scrollTop = this.thumbnailScrollOfset - walk;
          }
        },
        thumbnailHandleMouseLeave() {
          this._thumbnailRemoveGrabing();
        },
        thumbnailHandleMouseUp() {
          this._thumbnailRemoveGrabing();
        },
        _thumbnailRemoveGrabing() {
          this.thumbnailOnMouseDown = false;
          this.thumbnailGrabbingClass = 'md:cursor-grab';
        },
        zoomOpen(position) {
          this.zoomIsOpen = true;
          Alpine.store('xPopup').open = true;
          setTimeout(() => {
            document.getElementById(position + '-image-zoom-' + settings.section_id).scrollIntoView()
          }, 10);
          Alpine.store('xModal').activeElement = 'product-image-' + settings.section_id + '-' + position;
        },
        zoomClose() {
          this.zoomIsOpen = false;
          Alpine.store('xPopup').open = false;
        },
        
        videoHandleIntersect() {
          if (settings.video_autoplay) {
            Alpine.store('xVideo').play(this.$el);
          }
        },
        productModelInit() {
          window.Shopify.loadFeatures([
            {
              name: 'shopify-xr',
              version: '1.0',
              onLoad: this._productModelSetupShopifyXR,
            },
          ]);
        },
        _productModelSetupShopifyXR() {
          const setup = () => {
            document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
              window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
              modelJSON.remove();
            });
            window.ShopifyXR.setupXRElements();
          }
  
          if (!window.ShopifyXR) {
            document.addEventListener('shopify_xr_initialized', () => {
              setup();
            });
            return;
          }
      
          setup();
        },
        productModelLoadMedia() {
          let container = this.$el.parentNode;
          const content = document.createElement('div');
          content.appendChild(container.querySelector('template').content.firstElementChild.cloneNode(true));
  
          this.$el.classList.add('hidden');
          container.appendChild(content.querySelector('model-viewer'));
  
          this._productModelLoadViewerUI();
        },
        productModelPauseViewer() {
          if (this.$el.modelViewerUI) this.$el.modelViewerUI.pause();
        },
        _productModelLoadViewerUI() {
          window.Shopify.loadFeatures([
            {
              name: 'model-viewer-ui',
              version: '1.0',
              onLoad: this._productModelSetupViewerUI.bind(this),
            },
          ]);
        },
        _productModelSetupViewerUI(errors) {
          if (errors) return;
  
          this.$el.parentNode.modelViewerUI
            = new Shopify.ModelViewerUI(this.$el.parentNode.querySelector('model-viewer')); 
        }
      }));
    });
  });
}