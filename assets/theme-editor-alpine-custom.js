document.addEventListener('alpine:init', () => {
  Alpine.data("xMap", (data) => ({
    load() {
      this.$el.querySelector(
        "iframe"
      ).src = `https://maps.google.com/maps?q=${data}&t=m&z=17&ie=UTF8&output=embed&iwloc=near`;
    },
    loadMap(location) {
      this.$el.querySelector(
        "iframe"
      ).src = `https://maps.google.com/maps?q=${location}&t=m&z=17&ie=UTF8&output=embed&iwloc=near`;
    },
    removeMap() {
      this.$el.querySelector(
        "iframe"
      ).src = ``;
    } 
  }));
  
  Alpine.data('xFeaturedCollection', (sectionId, pageParam, container) => ({
    sectionId: sectionId,
    pageParam: pageParam,
    currentTab: 1,
    loading: true,
    loaded: [],
    select(index) {
      const selectedPage = index - 1;
      this.currentTab = selectedPage;

      if (!this.loaded.includes(selectedPage)) {
        this.loading = true;
        if (Shopify.designMode) {
          const content = document.createElement('div');
          const template = container.querySelector(`#x-fc-${sectionId}-${index}`);
          if (template) {
            content.appendChild(template.content.firstElementChild.cloneNode(true));
            container.appendChild(content.querySelector('.x-fc-content'));
            template.remove();
          }
          
          this.loading = false;
        } else {
          let url = `${window.location.pathname}?section_id=${this.sectionId}&${this.pageParam}=${index}`;

          fetch(url, {
            method: 'GET'
          }).then(
            response => response.text()
          ).then(responseText => {
            const html = (new DOMParser()).parseFromString(responseText, 'text/html');
            const contentId = `x-fc-${this.sectionId}-${index}`;

            if (Shopify.designMode && document.getElementById(contentId)) {
              document.getElementById(contentId).remove();
            }

            const newContent = html.getElementById(contentId);
            if (newContent && !document.getElementById(contentId)) {
              container.appendChild(newContent);
              this.loaded.push(selectedPage);
            }

            this.loading = false;
          })
        }
      }
    }
  }));

  Alpine.data('xLocalizationForm', () => ({ 
    submit(value, input) {
      document.getElementById(input).value = value;
      document.getElementById('localization_form').submit();
    }
  }));

  Alpine.store('xShopifyPaymentBtn', {
    load(e) {
      (events => {
        const init = () => {
          events.forEach(type => window.removeEventListener(type, init));

          e.innerHTML = e.getAttribute('data-shopify-payment-button');
          e.removeAttribute('data-shopify-payment-button');
          Shopify.PaymentButton.init();
        }
      
        events.forEach(type => window.addEventListener(type, init, {once: true, passive: true}));
      })(['touchstart', 'mouseover', 'wheel', 'scroll', 'keydown']);
    },
  });

  Alpine.data('xPopups', (data) => ({
    enable: false,
    show: Shopify.designMode ? ( localStorage.getItem(data.name + '-' + data.sectionId)?.length ? xParseJSON(localStorage.getItem(data.name + '-' + data.sectionId)) : false ) : false,
    delayDays: data.delayDays ? data.delayDays : 0,
    t: '',
    init() {
      if (Shopify.designMode) {
        // select section popup
        document.addEventListener('shopify:section:select', (event) => {
          if (event.detail.sectionId.includes(data.sectionId)) {
            if (window.Alpine) {
              this.open();
              localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(true));
            } else {
              document.addEventListener('alpine:initialized', () => {
                this.open();
                localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(true));
              });
            }
          } else {
            if (window.Alpine) {
              this.close();
              localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(false));
            } else {
              document.addEventListener('alpine:initialized', () => {
                this.close();
                localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(false));
              });
            }
          }
        });

        // deselect section popup
        document.addEventListener('shopify:section:deselect', function(event) {
          if (event.detail.sectionId.includes(data.sectionId)) {
            if (window.Alpine) {
              this.close();
            } else {
              document.addEventListener('alpine:initialized', () => {
                this.close();
              });
            }
          }
        })  
      }

      if (this.$el.querySelector('.newsletter-message')) {
        this.open();
        return;
      }
    },
    load() {
      if (!data.showOnMobile && window.innerWidth < 768 || window.location.pathname === '/challenge') return;
      if (Shopify.designMode) {
        this.open();
      } 
      else {
        if (data.name == 'popup-promotion' && !this.handleSchedule() && data.showCountdown) {
          return;
        }

        setTimeout(() => {
          this.open();
        }, data.delays * 1000);
      }
    },
    open() {
      if (!Shopify.designMode && !this.getExpire() && !this.show){
        this.show = false;
        return;
      }

      if (data.name == 'popup-age-verification') {
        if (this.getExpire() && !Shopify.designMode && !data.show_popup) {
          return;
        }
        document.body.classList.add("overflow-hidden");
        Alpine.store('xPopup').open = true;
      }

      this.show = true;
    },
    close() {
      if (!Shopify.designMode && this.getExpire()) this.setExpire();
      this.show = false;
      localStorage.removeItem(data.name + '-' + data.sectionId);
      if (data.name == 'popup-age-verification') {
        document.body.classList.remove("overflow-hidden");
        Alpine.store('xPopup').open = false;
      }
    },
    toggle() {
      clearTimeout(this.t);
      this.t = setTimeout(() => {
        this.show = !this.show;
      }, 300);
    },
    setExpire() {
      const item = {
        section: data.sectionId,
        expires: Date.now() + 5 * 60 * 1000
      }
      
      localStorage.setItem(data.sectionId, JSON.stringify(item))
    },
    getExpire() {
      const item = xParseJSON(localStorage.getItem(data.sectionId));
      if (item == null) {     
        return true;
      }
      if (Date.now() > item.expires) {
        localStorage.removeItem(data.sectionId);
        return true;
      }
      return false;
    },
    handleSchedule() {
      if (data.showCountdown) {
        let el = document.getElementById('x-promotion-' + data.sectionId);
        let settings = xParseJSON(el.getAttribute('x-countdown-data'));
        if(!Alpine.store('xHelper').canShow(settings)) {
          if (!Shopify.designMode && data.schedule_enabled) {
            this.show = false;
            return false;
          }
        }
      }
      this.enable = true;
      return true;
    }
  }));

  Alpine.data('xProductCart', () => ({
    loading: false,
    errorMessage: false,
    buttonSubmit: "",
    addToCart(e) {
      e.preventDefault();
      let formData = new FormData(this.$refs.product_form);
      this.loading = true;

      formData.append(
        'sections',
        Alpine.store('xCartHelper').getSectionsToRender().map((section) => section.id)
      );
      formData.append('sections_url', window.location.pathname);
      fetch('/cart/add', {
        method:'POST',
        headers: { Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
        body: formData
      }).then(reponse => {
        return reponse.json();
      }).then((response) => {
        if (response.status == '422') {
          this.errorMessage = true;
          if(this.$refs.error_message){
            this.$refs.error_message.textContent = response.description;
          }
          return;
        } else {
          document.dispatchEvent(new CustomEvent("eurus:cart:items-changed"));

          Alpine.store('xCartHelper').getSectionsToRender().forEach((section => {
            const sectionElement = document.querySelector(section.selector);
            if (sectionElement) {
              if (response.sections[section.id])
                sectionElement.innerHTML = getSectionInnerHTML(response.sections[section.id], section.selector);
            }
          }));

          if (Alpine.store('xQuickView').show) {
            Alpine.store('xQuickView').show = false;
          }
          Alpine.store('xPopup').open = false;
          Alpine.store('xMiniCart').openCart();
          
          Alpine.store('xCartHelper').currentItemCount = parseInt(document.querySelector('#cart-icon-bubble span').innerHTML);
        }
      }).catch((error) => {
        console.error('Error:', error);
      }).finally(() => {
        this.loading = false;
      }) 
    }
  }));

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

  Alpine.store('xProductRecommendations', {
    load(el, url) {
      fetch(url)
        .then(response => response.text())
        .then(text => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('.product-recommendations');

          if (recommendations && recommendations.innerHTML.trim().length) {
            requestAnimationFrame(() => {
              el.innerHTML = recommendations.innerHTML;
            });
          }
        })
        .catch(e => {
          console.error(e);
        });
    }
  });

  Alpine.store('xProductRecently', {
    show: false,
    productsToShow: 0,
    productsToShowMax: 10,
    init() {
      if (document.getElementById('shopify-section-recently-viewed')) {
        this.productsToShow = document.getElementById('shopify-section-recently-viewed').getAttribute("x-products-to-show");
      }
    },
    showProductRecently() {
      if (localStorage.getItem("recently-viewed")?.length) {
        this.show = true;
      } else {
        this.show = false;
      }
    },
    setProduct(productViewed) {
      let productList = [];
      if (localStorage.getItem("recently-viewed")?.length) {
        productList = JSON.parse(localStorage.getItem("recently-viewed")); 
        productList = [...productList.filter(p => p !== productViewed)].filter((p, i) => i<this.productsToShowMax);
        this.show = true;
        let newData = [productViewed, ...productList];
        localStorage.setItem('recently-viewed', JSON.stringify(newData))
      } else {
        this.show = false;
        localStorage.setItem('recently-viewed', JSON.stringify([productViewed]));
      }
    },
    getProductRecently(sectionId, productId) {
      let products = [];
      if (localStorage.getItem("recently-viewed")?.length) {
        products = JSON.parse(localStorage.getItem("recently-viewed"));
        products = productId ? [...products.filter(p => p !== productId)] : products;
        products = products.slice(0,this.productsToShow);
      } else {
        return;
      }
      const el = document.getElementById("shopify-section-recently-viewed");
      let query = products.map(value => "id:" + value).join(' OR ');
      var search_url = `${Shopify.routes.root}search?section_id=${ sectionId }&type=product&q=${query}`;
      fetch(search_url).then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          console.log(error)
          throw error;
        }

        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-recently-viewed').innerHTML;
        el.innerHTML = resultsMarkup;
      })
      .catch((error) => {
        throw error;
      });
    },
    clearStory() {
      var result = confirm('Are you sure you want to clear your recently viewed products?');
      if (result === true) {
        localStorage.removeItem("recently-viewed");
        this.show = false;
      }
    }
  });

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.data('xVariantSelect', (
        sectionId,
        isProductPage,
        unavailableText,
        productUrl,
        productId,
        showFirstImageAvaiable,
        chooseOption
      ) => ({
        variants: null,
        currentVariant: {},
        options: [],
        currentAvailableOptions: [],
        cachedResults: [],
        quickViewSectionId: 'quick-view',
        handleSectionId: sectionId,
        init() {
          this.variants = xParseJSON(this.$el.getAttribute('x-variants-data'));

          if (chooseOption) {
            this.handleSectionId = 'choose-option';
          }
          document.addEventListener('eurus:cart:items-changed', () => {
            this.cachedResults = [];
            
            Alpine.store('xUpdateVariantQuanity').updateQuantity(this.handleSectionId, productUrl, this.currentVariant.id);
          });

          this.$watch('options', () => {
            this._updateVariantSelector();
          });
        },
        initMedia() {
          this._updateMasterId();
          this._updateMedia();
        },
        _updateVariantSelector() {
          this._updateMasterId();
          this._updateVariantStatuses();
  
          if (!this.currentVariant) {
            this._setUnavailable();
            return;
          }
  
          if (isProductPage) {
            window.history.replaceState({}, '', `?variant=${this.currentVariant.id}`);
          }
  
          this._updateVariantInput();
          if (showFirstImageAvaiable) {
            this._updateMedia();
          } else if (document.readyState === "complete" && !sectionId.includes(this.quickViewSectionId)) {
            this._updateMedia();
          }
          this._updateProductForms();
          this._setAvailable();
          Alpine.store('xPickupAvailable').updatePickUp(sectionId, this.currentVariant.id);
  
          const cacheKey = sectionId + '-' + this.currentVariant.id;
          if (this.cachedResults[cacheKey]) {
            const html = this.cachedResults[cacheKey];
  
            this._renderPriceProduct(html);
            this._renderProductBadges(html);
            this._renderInventoryStatus(html);
            this._renderBuyButtons(html);
            
            this._dispatchVariantSelected(html);
          } else {
            const variantId = this.currentVariant.id;
            fetch(`${productUrl}?variant=${variantId}&section_id=${this.handleSectionId}`)
              .then((response) => response.text())
              .then((responseText) => {
                const html = new DOMParser().parseFromString(responseText, 'text/html');
                if (this.currentVariant && variantId == this.currentVariant.id
                  && html.getElementById(`x-product-template-${productId}-${sectionId}`)) {
                  this._renderPriceProduct(html);
                  this._renderProductBadges(html);
                  this._renderInventoryStatus(html);
                  this._renderBuyButtons(html);
                  Alpine.store('xUpdateVariantQuanity').render(html, this.handleSectionId);
                  this.cachedResults[cacheKey] = html;

                  this._dispatchVariantSelected(html);
                }
              });
          }
        },
        _dispatchVariantSelected(html) {
          document.dispatchEvent(new CustomEvent(`eurus:product-page-variant-select:updated:${sectionId}`, {
            detail: {
              currentVariantStatus: this.currentVariant.available,
              currentAvailableOptions: this.currentAvailableOptions,
              options: this.options,
              html: html
            }
          }));
        },
        _updateVariantStatuses() {
          const selectedOptionOneVariants = this.variants.filter(variant => this.options[0] === this._decodeOptionValue(variant.option1));
          this.options.forEach((option, index) => {
            this.currentAvailableOptions[index] = [];
            if (index === 0) return;

            const previousOptionSelected = this.options[index - 1];
            selectedOptionOneVariants.forEach((variant) => {
              if (variant.available && this._decodeOptionValue(variant[`option${ index }`]) === previousOptionSelected) {
                this.currentAvailableOptions[index].push(this._decodeOptionValue(variant[`option${ index + 1 }`]));
              }
            });
          });
        },
        _decodeOptionValue(option) {
          return option
                  .replaceAll('\\/', '/');
        },
        _renderInventoryStatus(html) {
          const destination = document.getElementById('block-inventory-' + sectionId);
          const source = html.getElementById('block-inventory-' + sectionId);
          if (source && destination) destination.innerHTML = source.innerHTML;
        },
        _updateMedia() {
          if (this.currentVariant && this.currentVariant.featured_image != null && !chooseOption) {
            let slideVariant = document.getElementsByClassName(this.currentVariant.featured_media.id + '-' + sectionId);
            let index = parseInt(slideVariant[0].getAttribute('index'));
            let splideEl = document.getElementById("x-product-" + sectionId);
            if (splideEl.splide && this.currentVariant.featured_image != null) {
              splideEl.splide.go(index - 1)
            } else {
              document.addEventListener(`eurus:media-gallery-ready:${sectionId}`, () => {
                if (splideEl.splide)
                  splideEl.splide.go(index - 1);
              });
            }
  
            let activeEL = document.getElementById('postion-image-' + sectionId + '-' + this.currentVariant.featured_media.id);
            if (!activeEL) return;
  
            let stackedEL = document.getElementById('stacked-' + sectionId);
            stackedEL.prepend(activeEL);
          }
        },
        _updateMasterId() {
          this.currentVariant = this.variants.find((variant) => {
            return !variant.options.map((option, index) => {
              return this.options[index] === option.replaceAll('\\/', '/');
            }).includes(false);
          });
        },
        _updateVariantInput() {
          const productForms = document.querySelectorAll(`#product-form-${sectionId}, #product-form-installment-${sectionId}, #product-form-sticky-${sectionId}`);
          productForms.forEach((productForm) => {
            const input = productForm.querySelector('input[name="id"]');
            if (!input) return;
            input.value = this.currentVariant.id;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          })
        },
        _updateProductForms() {
          const productForms = document.querySelectorAll(`#product-form-${sectionId}, #product-form-installment-${sectionId}, #product-form-sticky-${sectionId}`);
          productForms.forEach((productForm) => {
            const input = productForm.querySelector('input[name="id"]');
            input.value = this.currentVariant.id;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
        },
        _renderPriceProduct(html) {
          const destination = document.getElementById('price-' + sectionId);
          const source = html.getElementById('price-' + sectionId);
  
          if (source && destination) destination.innerHTML = source.innerHTML;
        },
        _renderProductBadges(html) {
          const destination = document.getElementById('x-badges-' + sectionId);
          const source = html.getElementById('x-badges-'+ sectionId);
          
          if (source && destination) destination.innerHTML += source.innerHTML;
        },
        _renderBuyButtons(html) {
          const productForms = document.querySelectorAll(`#product-form-${sectionId}, #product-form-installment-${sectionId}, #product-form-sticky-${sectionId}`);
          const atcSource = html.getElementById('x-atc-button-' + sectionId);
          productForms.forEach((productForm) => {
            const atcDestination = productForm.querySelector('.add_to_cart_button');
            if (!atcDestination) return;

            if (atcSource && atcDestination) atcDestination.innerHTML = atcSource.innerHTML;
    
            if (this.currentVariant.available) {
              /// Enable add to cart button
              if (html.getElementById('form-gift-card-' + sectionId)) {
                document.getElementById('Recipient-checkbox-' + sectionId).checked && atcDestination.disabled ? atcDestination.setAttribute('disabled', 'disabled') : atcDestination.removeAttribute('disabled');
              } else {
                atcDestination.removeAttribute('disabled');
              }
            } else {
              atcDestination.setAttribute('disabled', 'disabled');
            }
          });
          const paymentButtonDestination = document.getElementById('x-payment-button-' + sectionId);
          const paymentButtonSource = html.getElementById('x-payment-button-' + sectionId);
          if (paymentButtonSource && paymentButtonDestination) {
            if (paymentButtonSource.classList.contains('hidden')) {
              paymentButtonDestination.classList.add('hidden');
            } else {
              paymentButtonDestination.classList.remove('hidden');
            }
          }
        },
        _setUnavailable() {
          const price = document.getElementById(`price-` + sectionId);
          if (price) price.classList.add('hidden');

          const priceDesktop = document.getElementById(`price-sticky-${sectionId}`);
          if (priceDesktop) priceDesktop.classList.add('hidden');
          
          const inventory = document.getElementById(`block-inventory-` + sectionId);
          if (inventory) inventory.classList.add('hidden');
  
          const badges = document.getElementById(`x-badges-` + sectionId);
          if (badges) badges.classList.add('hidden');
  
          const pickup = document.getElementById(`pickup-` + sectionId);
          if (pickup) pickup.classList.add('hidden');
  
          const quantity = document.getElementById('x-quantity-' + sectionId);
          if (quantity) quantity.classList.add('unavailable');
  
          this._setBuyButtonUnavailable();
        },
        _setAvailable() {
          const price = document.getElementById(`price-` + sectionId);
          if (price) price.classList.remove('hidden');
  
          const inventory = document.getElementById(`block-inventory-` + sectionId);
          if (inventory) inventory.classList.remove('hidden');
  
          const badges = document.getElementById(`x-badges-` + sectionId);
          if (badges) badges.classList.remove('hidden');
  
          const pickup = document.getElementById(`pickup-` + sectionId);
          if (pickup) pickup.classList.remove('hidden');
  
          const quantity = document.getElementById('x-quantity-' + sectionId);
          if (quantity) quantity.classList.remove('unavailable');
        },
        _setBuyButtonUnavailable() {
          const productForms = document.querySelectorAll(`#product-form-${sectionId},  #product-form-sticky-${sectionId}`);
          productForms.forEach((productForm) => {
            const addButton = productForm.querySelector('.add_to_cart_button');
            if (!addButton) return;
            addButton.setAttribute('disabled', 'disabled');
            const addButtonText = addButton.querySelector('.x-atc-text');
            addButtonText.textContent = unavailableText;
          });
        }
      }))
    });
  });

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.data('xStickyATC', (sectionId) => ({
        openDetailOnMobile: false,
        currentAvailableOptions: [],
        options: [],
        init() {
          this.variants = xParseJSON(this.$el.getAttribute('x-variants-data'));

          document.addEventListener('eurus:product-page-variant-select:updated', (e) => {
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
  });

  Alpine.store('xPickupAvailable', {
    updatePickUp(id, variantId) {
      const container = document.getElementsByClassName('pick-up-'+ id)[0];
      if (!container) return;

      fetch(window.Shopify.routes.root + `variants/${variantId}/?section_id=pickup-availability`)
        .then(response => response.text())
        .then(text => {
          const pickupAvailabilityHTML = new DOMParser()
            .parseFromString(text, 'text/html')
            .querySelector('.shopify-section');

          container.innerHTML = pickupAvailabilityHTML.innerHTML;
        })
        .catch(e => {
          console.error(e);
        }); 
    }
  });

  Alpine.store('xUpdateVariantQuanity', {
    updateQuantity(sectionId, productUrl, currentVariant) {
      const url = currentVariant ? `${productUrl}?variant=${currentVariant}&section_id=${sectionId}` :
                    `${productUrl}?section_id=${sectionId}`;

      fetch(url)
        .then((response) => response.text())
        .then((responseText) => {
          let html = new DOMParser().parseFromString(responseText, 'text/html');
          this.render(html, sectionId);
        });
    },
    render(html, sectionId) {
      const destination = document.getElementById('x-quantity-' + sectionId);
      const source = html.getElementById('x-quantity-'+ sectionId);
      if (source && destination) destination.innerHTML = source.innerHTML;
    }
  });

  Alpine.store('xVideo', {
    ytIframeId: 0,
    vimeoIframeId: 0,
    externalListened: false,
    play(el) {
      let video = el.getElementsByClassName('video')[0];
      if (video) {
        if (video.tagName == 'IFRAME') {
          this.externalPostCommand(video, 'play');
        } else if (video.tagName == 'VIDEO') {
          video.play();
        }
      }
    },
    pause(el) {
      let video = el.getElementsByClassName('video')[0];
      if (video) {
        if (video.tagName == 'IFRAME') {
          this.externalPostCommand(video, 'pause');
        } else if (video.tagName == 'VIDEO') {
          video.pause();
        }
      }
    },
    mp4Thumbnail(el) {
      const videoContainer = el.closest('.external-video');
      const imgThumbnail = videoContainer.getElementsByClassName('img-thumbnail')[0];
      const buttonPlay = videoContainer.getElementsByClassName('button-play')[0];
      const video = videoContainer.getElementsByClassName('video')[0];
      if (imgThumbnail) {
        imgThumbnail.classList.add('hidden');
      }
      if (buttonPlay) {
        buttonPlay.classList.add('hidden');
      }
      if (video) {
        video.setAttribute("controls",'');
      }
      this.play(videoContainer);
    },
    externalLoad(el, host, id, loop, title, controls = 1) {
      let src = '';
      let pointerEvent = '';
      if (host == 'youtube') {
        src = `https://www.youtube.com/embed/${id}?mute=1&playlist=${id}&autoplay=1&playsinline=1&enablejsapi=1&modestbranding=1&rel=0&controls=${controls}&showinfo=${controls}`;
      } else {
        src = `https://player.vimeo.com/video/${id}?muted=1&autoplay=1&playsinline=1&api=1&controls=${controls}`;
      }

      if (controls == 0) {
        pointerEvent = " pointer-events-none";
      }
      requestAnimationFrame(() => {
        const videoContainer = el.closest('.external-video');
        videoContainer.innerHTML = `<iframe data-video-loop="${loop}" class="iframe-video absolute w-full h-full video top-1/2 -translate-y-1/2 ${ pointerEvent }"
          frameborder="0" host="${host}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen playsinline
          src="${src}" title="${title}"></iframe>`;

        videoContainer.querySelector('.iframe-video').addEventListener("load", () => {
          setTimeout(() => {
            this.play(videoContainer);

            if (host == 'youtube') {
              this.ytIframeId++;
              videoContainer.querySelector('.iframe-video').contentWindow.postMessage(JSON.stringify({
                event: 'listening',
                id: this.ytIframeId,
                channel: 'widget'
              }), '*');
            } else {
              this.vimeoIframeId++;
              videoContainer.querySelector('.iframe-video').contentWindow.postMessage(JSON.stringify({
                method: 'addEventListener',
                value: 'finish'
              }), '*');
            }
          }, 100);
        });
      });

      this.externalListen();
    },
    renderVimeoFacade(el, id, options) {
      fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=${options.width}`)
        .then(reponse => {
          return reponse.json();
        }).then((response) => {
          const html = `
            <picture>
              <img src="${response.thumbnail_url}" loading="lazy" class="w-full h-full object-cover" alt="${options.alt}" width="${response.width}" height="${response.height}"/>
            </picture>
          `;
          
          requestAnimationFrame(() => {
            el.innerHTML = html;
          });
        });
    },
    externalListen() {
      if (!this.externalListened) {
        window.addEventListener('message', (event) => {
          var iframes = document.getElementsByTagName('IFRAME');

          for (let i = 0, iframe, win, message; i < iframes.length; i++) {
            iframe = iframes[i];

            if (iframe.getAttribute('data-video-loop') !== 'true') continue;

            // Cross-browser way to get iframe's window object
            win = iframe.contentWindow || iframe.contentDocument.defaultView;

            if (win === event.source) {
              if (event.origin == 'https://www.youtube.com') {
                message = JSON.parse(event.data);
                if (message.info && message.info.playerState == 0) {
                  this.play(iframe.parentNode);
                }
              }

              if (event.origin == 'https://player.vimeo.com') {
                message = JSON.parse(event.data);
                if (message.event == "finish") {
                  this.play(iframe.parentNode);
                }
              }
            }
          }
        });

        this.externalListened = true;
      }
    },
    externalPostCommand(iframe, cmd) {
      const host = iframe.getAttribute('host');
      const command = host == 'youtube' ? {
        "event": "command",
        "func": cmd + "Video"
      } : {
        "method": cmd,
        "value": "true"
      };

      iframe.contentWindow.postMessage(JSON.stringify(command), '*');
    },
  });

  Alpine.data('xShippingPolicy', (url) => ({
    show: false,
    htmlInner: '',
    loadShipping() {
      this.show = true;
      Alpine.store('xPopup').open = true;
      fetch(url)
        .then(response => response.text())
        .then(data => {
          const parser = new DOMParser();
          const text = parser.parseFromString(data, 'text/html');
          this.htmlInner = text.querySelector('.shopify-policy__container').innerHTML;
        })
    },
    shippingFocus() {
      Alpine.store('xFocusElement').trapFocus('ShippingPolicyPopup','CloseShopping');
    },
    shippingRemoveFocus() {
      const activeElement = document.getElementById('LoadShoppingPolicy');
      Alpine.store('xFocusElement').removeTrapFocus(activeElement);
    }
  }));
  
  Alpine.store('xScrollPromotion', {
    load(el) {
      let scroll = el.getElementsByClassName('el_animate');
      for (let i = 0; i < scroll.length; i++) {
        scroll[i].classList.add('animate-scroll-banner');
      }
    }
  });

  Alpine.data('xCartFields', () => ({
    fields: {
      note: '',
      custom_field: ''
    },
    custom_field_label: '',
    custom_field_required: false,
    custom_field_error: false,
    openField: false,
    t: '',
    loadData() {
      const data = xParseJSON(this.$el.getAttribute('x-cart-fields-data'));
      const customFieldRow = `\n${data.custom_field_label}: ${localStorage.cart_custom_field}`;
      const cartNote = this.$refs.cart_field_note_data ? this.$refs.cart_field_note_data.value : '';
      
      var note = cartNote.replaceAll(customFieldRow, '');
      const customField = localStorage.cart_custom_field ? localStorage.cart_custom_field : '';

      this.fields = {
        note: note,
        custom_field: customField
      }

      this.custom_field_label = data.custom_field_label;
      this.custom_field_required = data.custom_field_required;
      this.saveCartNote();

      this.$watch('fields', () => {
        this.saveCartNote();
      });

      document.addEventListener('eurus:cart:validate', () => {
        if (this.custom_field_required && (!this.fields.custom_field || this.fields.custom_field.length == 0)) {
          this.custom_field_error = true;
          this.openField = 'custom_field';
          Alpine.store('xCartHelper').validated = false;
        }
      });
    },
    saveCartNote() {
      clearTimeout(this.t);

      const func = () => {
        var note = this.fields.note;
        if (this.fields.custom_field && this.fields.custom_field.length > 0) {
          note += `\n${this.custom_field_label}: ${this.fields.custom_field}`;
        }

        Alpine.store('xCartHelper').updateCartNote(note);
        localStorage.cart_custom_field = this.fields.custom_field;
        this.custom_field_error = false;
      }
      
      this.t = setTimeout(() => {
        func();
      }, 200);
    }
  }));
  
  Alpine.data("xCounponCode", () => ({
    coppySuccess: false,
    copyCode() {
      if (this.coppySuccess) return;

      const discountCode = this.$refs.code_value.textContent.trim();
      navigator.clipboard.writeText(discountCode).then(
        () => {
          this.coppySuccess = true;

          setTimeout(() => {
            this.coppySuccess = false;
          }, 5000);
        },
        () => {
          alert('Copy fail');
        }
      );
    } 
  }));

});
requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.data('xEventCalendar', (event) => ({
      open: false,
      eventDetails: {},
      addToCal(options) {
        let link = "";
        let timeEnd = ""
        this.eventDetails = event;

        if(!event) {
          this.eventDetails = JSON.parse(JSON.stringify(Alpine.store("xEventCalendarDetail").eventDetail))
        }
        let timeStart = this.handleTime(this.eventDetails.month, this.eventDetails.day, this.eventDetails.timeStart, options);
        if (this.eventDetails.show_end_date) {
          timeEnd = this.handleTime(this.eventDetails.end_month, this.eventDetails.end_day, this.eventDetails.timeEnd, options);
        } else {
          timeEnd = this.handleTime(this.eventDetails.month, this.eventDetails.day, this.eventDetails.timeEnd, options);
        }
        switch (options) {
          case 'apple':
            this.createDownloadICSFile(0, timeStart, timeEnd, this.eventDetails.title, this.eventDetails.details, this.eventDetails.location, "apple");
            break;
          break;
          case 'google':
            link = "http://www.google.com/calendar/event?action=TEMPLATE&trp=false" + "&text=" + encodeURIComponent(this.eventDetails.title) + "&dates=" + timeStart + "/" +  timeEnd + "&location=" + encodeURIComponent(this.eventDetails.location) + "&details=" + encodeURIComponent(this.eventDetails.details);
            window.open(link)
          break;
          case 'outlook':
            link = "https://outlook.live.com/calendar/action/compose?rru=addevent" + "&startdt=" + timeStart + "&enddt=" + timeEnd + "&subject=" + encodeURIComponent(this.eventDetails.title) + "&location=" + encodeURIComponent(this.eventDetails.location) + "&body=" + encodeURIComponent(this.eventDetails.details);
            window.open(link)
            break;
          case 'yahoo':
            link = "http://calendar.yahoo.com/?v=60" + "&st=" + timeStart + "&et=" +  timeEnd + "&title=" + encodeURIComponent(this.eventDetails.title) + "&in_lo=" + encodeURIComponent(this.eventDetails.location) + "&desc=" + encodeURIComponent(this.eventDetails.details);
            window.open(link)
            break;
          case 'ical': 
            this.createDownloadICSFile(0, timeStart, timeEnd, this.eventDetails.title, this.eventDetails.details, this.eventDetails.location, "ical");
            break;
          default:
            console.log(`Sorry, error`);
        }
      },
      handleTime(month,day,time, options) {
        let timeHandle = this.getTime(time).split(":");
        let date = new Date();
        const hour = timeHandle[0] ? timeHandle[0] : 0;
        const minute = timeHandle[1] ? timeHandle[1] : 0;
        if (options != 'outlook') {
          date = new Date(Date.UTC(date.getUTCFullYear(), this.getMonthNumber(month), parseInt(day), parseInt(hour), parseInt(minute)));
          date.setTime(date.getTime() + (-1 * parseInt(this.eventDetails.timezone) * 60 - date.getTimezoneOffset()) * 60 * 1000)
          return date.toISOString().split("Z")[0].replace(".000", "").replace(/[^A-Z0-9]/ig, "");
        } else {
          date = new Date(date.getUTCFullYear(), this.getMonthNumber(month), parseInt(day), parseInt(hour), parseInt(minute));
          date.setTime(date.getTime() + (-1 * parseInt(this.eventDetails.timezone) * 60 - date.getTimezoneOffset()) * 60 * 1000)
          return date.toISOString();
        }
      },
      getMonthNumber(month) {
        return new Date(`${month} 1, 2022`).getMonth();
      },
      getTime(timeOriginal){
        let time = timeOriginal.toUpperCase();

        if (time.includes("PM")) {
          let hour = time.split(":")[0];
          return parseInt(hour) + 12 + ":" + time.substring(time.indexOf(":"), time.length).replace("PM","").replace(" ", "");
        } else if (time.includes("AM")) {
          return time.replace("AM","");
        } else {
          return time;
        }
      },
      createDownloadICSFile(timezone, timeStart, timeEnd, title, description, location, type) {
        let icsBody = ""
        icsBody = "BEGIN:VCALENDAR\n" +
        "VERSION:2.0\n" +
        "PRODID:Calendar\n" +
        "CALSCALE:GREGORIAN\n" +
        "METHOD:PUBLISH\n" +
        "BEGIN:VTIMEZONE\n" +
        "TZID:" + timezone + "\n" +
        "END:VTIMEZONE\n" +
        "BEGIN:VEVENT\n" +
        "SUMMARY:" + title + "\n" +
        "UID:@Default\n" +
        "SEQUENCE:0\n" +
        "STATUS:CONFIRMED\n" +
        "TRANSP:TRANSPARENT\n" +
        "DTSTART;TZID=" + timezone + ":" + timeStart + "\n" +
        "DTEND;TZID=" + timezone + ":" + timeEnd + "\n" +
        "DTSTAMP:"+ new Date() + "\n" +
        "LOCATION:" + location + "\n" +
        "DESCRIPTION:" + description + "\n" +
        "END:VEVENT\n" +
        "END:VCALENDAR\n";

        this.download(title + ".ics", icsBody, type);
      },
      download(filename, fileBody, type) {
        var element = document.createElement("a");
        if (type == "ical") {
          element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(fileBody));
        } else if (type == "apple") {
          var file = new Blob([fileBody], { type: "text/calendar;charset=utf-8"})
          element.href = window.URL.createObjectURL(file)
        }
        element.setAttribute("download", filename);

        element.style.display = "none";
        document.body.appendChild(element);

        element.click();
        document.body.removeChild(element);
      }
    }));

    Alpine.store('xEventCalendarDetail', {
      show: false,
      eventDetail: {},
      handleEventSelect() {
        var _this = this;
        const eventDetail = JSON.parse(JSON.stringify(this.eventDetail));

        document.addEventListener('shopify:section:select', function(event) {
          if (event.target.classList.contains('section-event-calendar') == false) {
            if (window.Alpine) {
              _this.close();
            } else {
              document.addEventListener('alpine:initialized', () => {
                _this.close();
              });
            }
          }
        })
        
        if(eventDetail && eventDetail.blockID && eventDetail.sectionID) {
          this.eventDetail = xParseJSON(document.getElementById('x-data-event-' + eventDetail.blockID).getAttribute('x-event-data'));
          let element = document.getElementById('EventDescription-' + this.eventDetail.sectionID);
          element.innerHTML = this.eventDetail.description;
          element.innerHTML = element.textContent;
        }
      },
      load(el, blockID) {
        this.eventDetail = xParseJSON(el.closest('#x-data-event-' + blockID).getAttribute('x-event-data'));
        let element = document.getElementById('EventDescription-' + this.eventDetail.sectionID);
        element.innerHTML = this.eventDetail.description;
        element.innerHTML = element.textContent;
        this.showEventCalendarDetail();
      },
      showEventCalendarDetail() {
        this.show = true;
        Alpine.store('xPopup').open = true;
      },
      close() {
        this.show = false;
        Alpine.store('xPopup').open = false;
      }
    });
  })
})