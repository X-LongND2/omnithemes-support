const installMediaQueryWatcher = (mediaQuery, changedCallback) => {
  const mq = window.matchMedia(mediaQuery);
  mq.addEventListener('change', e => changedCallback(e.matches));
  changedCallback(mq.matches);
};

const deferScriptLoad = (name, src, onload, requestVisualChange = false) => {
  (events => {
    const loadScript = () => {
      events.forEach(type => window.removeEventListener(type, loadScript));
      clearTimeout(autoloadScript);

      const initScript = () => {
        const script = document.createElement('script');
        script.setAttribute('src', src);
        script.setAttribute('defer', '');
        script.onload = () => {
          window.Eurus.loadedScript.push(name);
          document.dispatchEvent(new CustomEvent(name + ' loaded'));
          onload();
        };

        document.head.appendChild(script);
      }

      if (requestVisualChange) {
        if (window.requestIdleCallback) {
          requestIdleCallback(initScript);
        } else {
          requestAnimationFrame(initScript);
        }
      } else {
        initScript();
      }
    };

    let autoloadScript;
    if (Shopify.designMode) {
      loadScript();
    } else {
      const wait = window.innerWidth > 767 ? 2000 : 5000;
      events.forEach(type => window.addEventListener(type, loadScript, {once: true, passive: true}));
      autoloadScript = setTimeout(() => {
        loadScript();
      }, wait);
    }
  })(['touchstart', 'mouseover', 'wheel', 'scroll', 'keydown']);
}

const getSectionInnerHTML = (html, selector = '.shopify-section') => {
  return new DOMParser()
    .parseFromString(html, 'text/html')
    .querySelector(selector).innerHTML;
}

const xParseJSON = (jsonString) => {
  jsonString = String.raw`${jsonString}`;
  jsonString = jsonString.replaceAll("\\","\\\\").replaceAll('\\"', '\"');

  return JSON.parse(jsonString);
}

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xDarkMode', {
      toggleThemeMode() {
        if (document.documentElement.classList.contains('dark')) {
          localStorage.eurus_theme = 0;
          document.documentElement.classList.remove('dark');
        } else {
          localStorage.eurus_theme = 1;
          document.documentElement.classList.add('dark');
        }
        Alpine.store('xHeaderMenu').setTopStickyHeader();
      }
    });

    Alpine.store('xHelper', {
      countdown(configs, callback) {
        let endDate = new Date(
          configs.end_year,
          configs.end_month - 1,
          configs.end_day,
          configs.end_hour,
          configs.end_minute
        );
        const endTime = endDate.getTime() + (-1 * configs.timezone * 60 - endDate.getTimezoneOffset()) * 60 * 1000;
        
        let startTime;
        if (configs.start_year) {
          let startDate = new Date(
            configs.start_year,
            configs.start_month - 1,
            configs.start_day,
            configs.start_hour,
            configs.start_minute
          );
          startTime = startDate.getTime() + (-1 * configs.timezone * 60 - startDate.getTimezoneOffset()) * 60 * 1000;
        } else {
          startTime = new Date().getTime();
        }

        let x = setInterval(function() {
          let now = new Date().getTime();
          let distance = endTime - now;

          if (distance < 0 || startTime > now) {
            callback(false, 0, 0, 0, 0);
            clearInterval(x);
          } else {
            var days = Math.floor(distance / (1000 * 60 * 60 * 24));
            var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            callback(true, seconds, minutes, hours, days);
          }
        }, 1000);
      },
      canShow(configs) {
        let endDate = new Date(
          configs.end_year,
          configs.end_month - 1,
          configs.end_day,
          configs.end_hour,
          configs.end_minute
        );
        const endTime = endDate.getTime() + (-1 * configs.timezone * 60 - endDate.getTimezoneOffset()) * 60 * 1000;
        
        let startTime;
        if (configs.start_year) {
          let startDate = new Date(
            configs.start_year,
            configs.start_month - 1,
            configs.start_day,
            configs.start_hour,
            configs.start_minute
          );
          startTime = startDate.getTime() + (-1 * configs.timezone * 60 - startDate.getTimezoneOffset()) * 60 * 1000;
        } else {
          startTime = new Date().getTime();
        }
        let now = new Date().getTime();
        let distance = endTime - now;

        if (distance < 0 || startTime > now) {
          return false;
        } 
        return true;
      },
      
    });
  });
});

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.data('xCart', () => ({
      t: '',
      loading: false,
      updateItemQty(itemId) {
        let qty = parseInt(document.getElementById(`cart-qty-${itemId}`).value);
        if (this.validateQty(qty)) {
          this._postUpdateItem(itemId, qty);
        }
      },
      minusItemQty(itemId) {
        let qty = parseInt(document.getElementById(`cart-qty-${itemId}`).value);
        if (this.validateQty(qty)) {
          if (qty > 0) {
            qty -= 1;
            document.getElementById(`cart-qty-${itemId}`).value = qty;
          }

          this._postUpdateItem(itemId, qty);
        }
      },
      plusItemQty(itemId) {
        let qty = parseInt(document.getElementById(`cart-qty-${itemId}`).value);
        if (this.validateQty(qty)) {
          if (qty >= 0) {
            qty += 1;
            document.getElementById(`cart-qty-${itemId}`).value = qty;
          }

          this._postUpdateItem(itemId, qty);
        }
      },
      removeItem(itemId) {
        this._postUpdateItem(itemId, 0, 0);
      },
      _postUpdateItem(itemId, qty, wait = 500) {
        clearTimeout(this.t);

        const func = () => {
          this.loading = true;
          let removeEl = document.getElementById(`remove-${itemId}`);
          if(removeEl){
            removeEl.style.display = 'none';
          }
          document.getElementById(`loading-${itemId}`).classList.remove('hidden');
          const sections = Alpine.store('xCartHelper').getSectionsToRender().map(s => s.id).join(',');
          let updateData = {
            'id': `${itemId}`,
            'quantity': qty,
            'sections': sections
          };

          fetch(`${Shopify.routes.root}cart/change.js`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          })
            .then(response => response.text())
            .then(state => {
              const parsedState = JSON.parse(state);

              if (parsedState.status == '422') {
                this._addErrorMessage(itemId, parsedState.message);
              } else {
                Alpine.store('xCartHelper').getSectionsToRender().forEach((section => {
                  const sectionElement = document.querySelector(section.selector);
                  if (sectionElement) {
                    if (parsedState.sections[section.id])
                      sectionElement.innerHTML = getSectionInnerHTML(parsedState.sections[section.id], section.selector);
                  }
                }));
  
                if (parsedState.item_count > 0
                  && Alpine.store('xCartHelper').currentItemCount == parsedState.item_count) {
                  const errorMessage = window.Eurus.cart_quantity_error_html.replace(
                    '[quantity]',
                    parseInt(document.getElementById(`cart-qty-${itemId}`).value)
                  );
                  this._addErrorMessage(itemId, errorMessage);
                } else {
                  document.dispatchEvent(new CustomEvent("eurus:cart:items-changed"));
                }

                Alpine.store('xCartHelper').currentItemCount = parsedState.item_count;
              }

              let loadingEl = document.getElementById(`loading-${itemId}`);
              let removeEl = document.getElementById(`remove-${itemId}`);
              if(removeEl){
                removeEl.style.display = 'block';
              }
              if (loadingEl) {
                loadingEl.classList.add('hidden');
              }
              this.loading = false;
            });
        }

        this.t = setTimeout(() => {
          func();
        }, wait);
      },
      _addErrorMessage(itemId, message) {
        const lineItemError = document.getElementById(`LineItemError-${itemId}`)
        lineItemError.classList.remove('hidden');
        lineItemError
          .getElementsByClassName('cart-item__error-text')[0]
          .innerHTML = message;
      },
      validateQty: function(number) {
        if((parseFloat(number) != parseInt(number)) && isNaN(number)) {
          return false
        }

        return true;
      }
    }));

    Alpine.store('xCartHelper', {
      currentItemCount: 0,
      validated: true,
      openField: '',
      updateCart: function(data, needValidate = false) {
        const formData = JSON.stringify(data);
        fetch(Shopify.routes.root + 'cart/update', {
          method:'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: formData
        }).then(() => {
          if (needValidate) this.validateCart();
        });
      },
      cartValidationRequest() {
        this.validateCart();
        Alpine.store('xMiniCart').openCart();
      },
      validateCart: function() {
        this.validated = true;

        document.dispatchEvent(new CustomEvent("eurus:cart:validate"));
        document.dispatchEvent(new CustomEvent("eurus:cart:validated"));
      },
      goToCheckout(e) {
        this.validateCart();

        if (this.validated) {
          let formData = {
            'attributes': {
              'collection-pagination': null,
              'blog-pagination': null,
              'choose-option-id': null
            }
          };

          fetch(Shopify.routes.root+'cart/update', {
            method:'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(formData)
          });
        } else {
          e.preventDefault();
        }
      },
      getSectionsToRender() {
        const cartItemEl = document.getElementById('main-cart-items');
        if (cartItemEl) {
          const templateId = cartItemEl.closest('.shopify-section').id
                              .replace('cart-items', '')
                              .replace('shopify-section-', '');

          return [
            {
              id: templateId + 'cart-items',
              selector: '#main-cart-items'
            },
            {
              id: templateId + 'cart-footer',
              selector: '#main-cart-footer'
            },
            {
              id: templateId + 'cart-upsell',
              selector: '#main-cart-upsell'
            },
            {
              id: "cart-icon-bubble",
              selector: '#cart-icon-bubble'
            },
            {
              id: 'mobile-cart-icon-bubble',
              selector: '#mobile-cart-icon-bubble'
            }
          ];
        }

        return [
          {
            id: "cart-icon-bubble",
            selector: '#cart-icon-bubble'
          },
          {
            id: 'mobile-cart-icon-bubble',
            selector: '#mobile-cart-icon-bubble'
          },
          {
            id: 'cart-drawer',
            selector: '#CartDrawer'
          }
        ];
      }
    });
  });
});

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.data('xModalSearch', (type, desktopMaximunResults, mobileMaximunResults, productTypeSelected) => ({
      t: '',
      result: ``,
      query: '',
      cachedResults: [],
      openResults: false,
      productTypeSelected: productTypeSelected,
      showSuggest: false,
      loading: false,
      open() {
        this.$refs.open_search.style.opacity = "1";
        this.$refs.open_search.style.maxHeight = "500px";
        this.$refs.open_search.classList.remove("overflow-hidden");
        this.$refs.open_search.classList.remove("hidden");
      },
      close() {
        this.$refs.open_search.style.opacity = "0";
        this.$refs.open_search.style.maxHeight = "0px";
        this.$refs.open_search.classList.add("overflow-hidden");
        this.$refs.open_search.classList.add("hidden");
      },
      keyUp() {
        this.query = this.$el.value;
        return () => {
          clearTimeout(this.t);
          this.t = setTimeout(() => {
            if (this.query != "") {
              this.showSuggest = false;
              this.getSearchResult(this.query);
            } else {
              this.showSuggest = true;
              this.result = "";
            }
          }, 300);
        };
      },
      getSearchResult(query) {
        this.openResults = true;
        const limit = window.innerWidth > 767 ? desktopMaximunResults : mobileMaximunResults;
        let q = this.productTypeSelected != productTypeSelected ? `${this.productTypeSelected} AND ${query}` : query;

        const queryKey = q.replace(" ", "-").toLowerCase() + '_' + limit;

        if (this.cachedResults[queryKey]) {
          this.result = this.cachedResults[queryKey];
          return;
        }

        this.loading = true;
        const fieldsSearch = "author,body,product_type,tag,title,variants.barcode,variants.sku,variants.title,vendor";
        fetch(`${Shopify.routes.root}search/suggest?q=${encodeURIComponent(q)}&${encodeURIComponent('resources[type]')}=article&${encodeURIComponent('resources[options][fields]')}=${encodeURIComponent(fieldsSearch)}&${encodeURIComponent('resources[limit]')}=${encodeURIComponent(limit)}&section_id=predictive-search`)
          .then((response) => {
            return response.text();
          })
          .then((response) => {
            const parser = new DOMParser();
            const text = parser.parseFromString(response, 'text/html');
            this.result = text.querySelector("#shopify-section-predictive-search").innerHTML;
            this.cachedResults[queryKey] = this.result;
          })
          .catch((error) => {
            throw error;
          });
        this.loading = false;
      },
      setProductType(value, input) {
        this.productTypeSelected = value;
        document.getElementById(input).value = value;
        if(this.query != '') {
          this.getSearchResult(this.query);
        }
      },
      focusForm() {
        console.log(this.$el.value)
        if (this.$el.value != '') {
          this.showSuggest = false;
        } else {
          this.showSuggest = true;
        }
      }
    }));
  });
});

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xHeaderMenu', {
      isSticky: false,
      stickyCalulating: false,
      isTouch: ('ontouchstart' in window) || window.DocumentTouch && window.document instanceof DocumentTouch || window.navigator.maxTouchPoints || window.navigator.msMaxTouchPoints ? true : false,
      sectionId: '',
      stickyType: 'none',
      lastScrollTop: 0,
      themeModeChanged: false,
      showLogoTransparent: true,
      offsetTop: 0,
      selectItem(el, isSub) {
        if(el.querySelector(".mega-list-nav")) {
          el.style.setProperty('--mega-menu-height', el.querySelector(".mega-list-nav").offsetHeight + 'px') 
        } 
        el.style.setProperty('--header-container-height', document.getElementById("x-header-container").offsetHeight + 'px')
        const itemSelector = isSub ? '.toggle-menu-sub' : '.toggle-menu';

        var items = isSub ? el.closest('.toggle-menu').querySelectorAll(itemSelector) : document.querySelectorAll(itemSelector);

        for (var i = 0; i < items.length; i++) {
          if (isSub) {
            items[i].style.display = "none";
          } else {
            items[i].style.maxHeight = "0px"; 
            items[i].style.opacity = "0";
            items[i].classList.add('max-h-0', 'overflow-hidden');
          }
        }

        let toggleMenu = el.querySelector(itemSelector);

        if (toggleMenu) {
          if (isSub) {
            toggleMenu.style.display = 'block';
          } else {
            toggleMenu.style.maxHeight = '';
            toggleMenu.style.opacity = "1";
            toggleMenu.classList.remove('max-h-0', 'overflow-hidden');
          }
        }
      },
      hideMenu() {
        var items = document.querySelectorAll('.toggle-menu');
        for(var i = 0; i < items.length; i++) {  
          items[i].style.maxHeight = "0px";
          items[i].style.opacity = "0";
          items[i].classList.add("overflow-hidden");
        }
      },

      // start handle touch menu on the ipad
      touchItem(el, isSub = false) {
        const touchClass = isSub ? 'touched-sub' : 'touched';

        el.addEventListener("touchend", (e) => {
          if (el.classList.contains(touchClass)) {
            window.location.replace(el.getAttribute('href'));
          } else {
            e.preventDefault(); 
            var dropdown = document.querySelectorAll(`.${touchClass}`);
            for(var i = 0; i < dropdown.length; i++) { 
              dropdown[i].classList.remove(touchClass); 
            }

            el.classList.add(touchClass);
            this.selectItem(el.closest('.has-dropdown'), isSub);
          }
        });
      },

      // handle sticky header
      initSticky(el, sectionId, stickyType) {
        this.sectionId = sectionId;
        this.stickyType = stickyType;
        this.offsetTop = el.offsetTop;
        el.style.height = document.getElementById("sticky-header").offsetHeight + 'px';
        window.addEventListener('resize', () => {
          this.reCalculateHeaderHeight();
        });
      },
      handleAlwaysSticky() {
        const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
        const stickyLine = document.getElementById(this.sectionId).offsetTop;
        
        if (scrollPos > stickyLine) this.addStickyHeader();
      },
      handelOnScrollSticky() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop < this.offsetTop) {
          requestAnimationFrame(() => {
            document.getElementById("sticky-header").classList
              .remove('sticky-header');
          });
        }

        if (Math.abs(scrollTop - this.lastScrollTop) > 10) {
          if (scrollTop < this.lastScrollTop) {
            document.getElementById('sticky-header').classList.remove('header-up', 'opacity-0');
            this.setVariableHeightHeader(true);
          } else if (!this.themeModeChanged) {
            document.getElementById('sticky-header').classList.add('header-up');
            this.setVariableHeightHeader(false);
          }
          this.lastScrollTop = scrollTop;
        }
        this.themeModeChanged = false;
      },
      addStickyHeader() {
        let isMiniCartOpen = false;
        if (Alpine.store('xMiniCart').open && this.stickyType != 'on-scroll-up') {
          isMiniCartOpen = true;
          requestAnimationFrame(() => {
            Alpine.store('xMiniCart').hideCart();
          });
        }

        requestAnimationFrame(() => {
          let stickyEl = document.getElementById("sticky-header");
          stickyEl.classList.add("sticky-header", 'reduce-logo-size');

          this.isSticky = true;
          this.showLogoTransparent = false
        });

        requestAnimationFrame(() => {
          let stickyEl = document.getElementById("sticky-header");
          if (this.stickyType == 'on-scroll-up') {
            setTimeout(() => {
              stickyEl.classList.add('on-scroll-up-animation');
            }, 500);
          }
          if (!Alpine.store('xMiniCart').open || window.innerWidth > 768 ) {
            if (this.stickyType == 'always'
              || this.stickyType == 'reduce-logo-size') stickyEl.classList.add('always-animation');
          }
        });

        if (isMiniCartOpen) {
          requestAnimationFrame(() => {
            Alpine.store('xMiniCart').openCart();
          });
        }
      },
      removeStickyHeader() {
        this.isSticky = false;
        this.showLogoTransparent = true;
        requestAnimationFrame(() => {
          document.getElementById("sticky-header").classList
            .remove('sticky-header', 'reduce-logo-size', 'always-animation', 'on-scroll-up-animation');
          this.reCalculateHeaderHeight();
          this.setVariableHeightHeader(false);
        });
      },
      handleChangeThemeMode() {
        this.themeModeChanged = true;
        this.reCalculateHeaderHeight();
      },
      reCalculateHeaderHeight() {
        document.getElementById("x-header-container").style.height
          = document.getElementById("sticky-header").offsetHeight + 'px';
      },
      addTransparentHover(el) {
        if (window.innerWidth < 1024) return;

        el.classList.add('sticky-header-active');
      },
      removeTransparentHover(el) {
        if (window.innerWidth < 1024) return;
        
        el.classList.remove('sticky-header-active');
      },
      setVariableHeightHeader(sticky) {
        let root = document.documentElement;
        if (sticky) {
          root.style.setProperty('--height-header', document.getElementById("sticky-header").offsetHeight + "px");
        } else {
          root.style.setProperty('--height-header', "0px");
        }
      },
      setTopStickyHeader() {
        let root = document.documentElement;
        root.style.setProperty('--top-header',document.getElementById("sticky-header-content").offsetHeight + "px");
      }
    });
  });
});

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xMobileNav', {
      show: false,
      loading: false,
      currentMenuLinks: [],
      open() {
        this.show = true;
        Alpine.store('xPopup').open = true;
      },
      close() {
        this.show = false;
        Alpine.store('xPopup').open = false;
      },
      setActiveLink(linkId) {
        this.currentMenuLinks.push(linkId);
      },
      removeActiveLink(linkId) {
        const index = this.currentMenuLinks.indexOf(linkId);
        if (index !== -1) {
          this.currentMenuLinks.splice(index, 1);
        }
      },
      resetMenu() {
        this.currentMenuLinks = [];
      },
      scrollTop() { 
        document.getElementById('menu-navigation').scrollTop = 0; 
      }
    });

    Alpine.store('xPopup', {
      open: false
    }); 

    Alpine.store('xShowCookieBanner', {
      show: false
    });

    Alpine.store('xMiniCart', {
      open: false,
      type: '',
      openCart() {
        if (window.location.pathname != '/cart') {        
          requestAnimationFrame(() => {
            Alpine.store('xQuickView').close();
          });

          requestAnimationFrame(() => {
            document.getElementById('sticky-header').classList.remove('on-scroll-up-animation');

            if (window.innerWidth < 768 || this.type == "drawer") {
              Alpine.store('xPopup').open = true;
            }

            requestAnimationFrame(() => {
              document.getElementById('sticky-header').classList.remove('header-up');
              this.open = true;
            });
            
            if (Alpine.store('xHeaderMenu').stickyType == 'on-scroll-up') {
              setTimeout(() => {
                requestAnimationFrame(() => {
                  document.getElementById('sticky-header').classList.add('on-scroll-up-animation');
                });
              }, 200);
            }
          });
        }
      },
      hideCart() {
        requestAnimationFrame(() => {
          this.open = false;
          Alpine.store('xPopup').open = false;
        });
      }
    });

    Alpine.store('xModal', {
      activeElement: "",
      setActiveElement(element) {
        this.activeElement = element;
      },
      focus(container, elementFocus) {
        Alpine.store('xFocusElement').trapFocus(container, elementFocus);
      },
      removeFocus() {
        const openedBy = document.getElementById(this.activeElement);
        Alpine.store('xFocusElement').removeTrapFocus(openedBy);
      }
    });

    Alpine.store('xFocusElement', {
      focusableElements: ['button, [href], input, select, textarea, [tabindex]:not([tabindex^="-"])'],
      listeners: {},
      trapFocus(container, elementFocus) {
        if ( window.innerWidth < 1025 ) return;

        let c = document.getElementById(container);
        let e = document.getElementById(elementFocus);
        this.listeners = this.listeners || {};
        const elements = Array.from(c.querySelectorAll(this.focusableElements));
        var first = elements[0];
        var last = elements[elements.length - 1];
        
        this.removeTrapFocus();
        
        this.listeners.focusin = (event)=>{
          if (
            event.target !== c &&
            event.target !== last &&
            event.target !== first
          ){
            return;
          }
          document.addEventListener('keydown', this.listeners.keydown);
        };

        this.listeners.focusout = () => {
          document.removeEventListener('keydown', this.listeners.keydown);
        }

        this.listeners.keydown = (e) =>{
          if (e.code.toUpperCase() !== 'TAB') return;
  
          if (e.target === last && !e.shiftKey) {
            e.preventDefault();
            first.focus();
          }
  
          if ((e.target === first || e.target == c) && e.shiftKey) {
            e.preventDefault();
            last.focus();
          }
        }
        document.addEventListener('focusout', this.listeners.focusout);
        document.addEventListener('focusin', this.listeners.focusin);
        e.focus();
      },
      removeTrapFocus(elementToFocus = null) {
        if ( window.innerWidth < 1025 ) return;

        document.removeEventListener('focusin', ()=>{
          document.addEventListener('keydown', this.listeners.focusin);
        });
        document.removeEventListener('focusout', ()=>{
          document.removeEventListener('keydown', this.listeners.focusout);
        });
        document.removeEventListener('keydown', this.listeners.keydown);
        if (elementToFocus) elementToFocus.focus();
      }
    });
  });
});

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xCartAnalytics', {
      viewCart() {
        fetch(
          '/cart.js'
        ).then(response => {
          return response.text();
        }).then(cart => {
          cart = JSON.parse(cart);
          if (cart.items.length > 0) {
            Shopify.analytics.publish('view_cart', {'cart': cart});
          }
        });
      }
    });
  });
});

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xCustomerEvent', {
      fire(eventName, el, data) {
        if (Shopify.designMode) return;
        
        const formatedData = data ? data : xParseJSON(el.getAttribute('x-customer-event-data'));
        Shopify.analytics.publish(eventName, formatedData);
      }
    });
  });
});

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xSplide', {
      load(el, configs) {
        const initSlider = () => {
          const id = el.getAttribute("id");

          if(configs.classes != undefined) {
            if (!configs.classes.arrow) configs.classes.arrow = "arrow w-8 h-8 p-2 absolute z-10 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center";
            if (!configs.classes.next) configs.classes.next = "right-0";
            if (!configs.classes.prev) configs.classes.prev = "-rotate-180";
          }
          let splide = new Splide("#" + id, configs);

          if (configs.thumbs) {
            let thumbsRoot = document.getElementById(configs.thumbs);
            let thumbs = thumbsRoot.getElementsByClassName('x-thumbnail');
            let current;
            let _this = this;

            for (let i=0;i<thumbs.length;i++) {
              thumbs[i].addEventListener('click', function () {
                _this.moveThumbnail(i, thumbs[i], thumbsRoot, configs.thumbs_direction);
                splide.go(i);
              });
            }
            splide.on('mounted move', function () {
              let thumbnail = thumbs[splide.index];
            
              if (thumbnail) {
                if (current) {
                  current.classList.add('opacity-30');
                }
                thumbnail.classList.remove('opacity-30');
                current = thumbnail;
                _this.moveThumbnail(splide.index, thumbnail, thumbsRoot, configs.thumbs_direction);
              }
            });
          }

          if (configs.hotspot) {
            let hotspotRoot = document.getElementById(configs.hotspot);
            let hotspots = hotspotRoot.getElementsByClassName('x-hotspot');
            let current;

            for (let i=0;i<hotspots.length;i++) {
              hotspots[i].addEventListener('mouseover', function () {
                splide.go(i);
              });
              hotspots[i].addEventListener('focus', function () {
                splide.go(i);
              });
            }

            splide.on('mounted move', function () {
              let hotspot = hotspots[splide.index];
            
              if (hotspot) {
                if (current) {
                  current.classList.remove('active-hotspot');
                }
                hotspot.classList.add('active-hotspot');
                current = hotspot;
              }
            });
          }

          if (configs.progressBar) {
            var bar = splide.root.querySelector( '.splide-progress-bar' );
            splide.on( 'mounted move', function () {
              var end  = splide.Components.Controller.getEnd() + 1;
              var rate = (splide.index + 1) / end;
              if (bar) {
                bar.style.width = String( 100 * rate ) + '%';
              }
            });
          }

          if (configs.events) {
            configs.events.forEach((e) => {
              splide.on(e.event, e.callback);
            });
          }

          
          el.splide = splide;
          if (configs.thumbnail) {
            var thumbnails = new Splide( "#" + configs.thumbnail, {
              pagination  : false,
              autoplay: configs.autoplay,
              interval: configs.interval,
              speed: 500,
              updateOnMove: true,
              isNavigation: true,
              type: "loop",
              click: true,
              flickPower: 50,
              perMove: 1,
              perPage: 3,
              classes: {
                pagination: "hidden",
                arrows: "splide__arrows hidden",
              }
            });
            splide.sync( thumbnails );
          }
          splide.mount();
          if (configs.thumbnail) {
            thumbnails.mount();
          }
        }

        if (!window.Eurus.loadedScript.includes('slider')) {
          deferScriptLoad('slider', window.Eurus.sliderScript, initSlider, true);
        } else {
          initSlider();
        }
      },
      moveThumbnail(index, thumbnail, thumbsRoot, direction) {
        if (direction == 'vertical') {
          setTimeout(() => {
            thumbsRoot.scrollTop = (index+1) * thumbnail.offsetHeight - thumbsRoot.offsetHeight*0.5 + thumbnail.offsetHeight*0.5 + index*12;
          },50);
        } else {
          thumbsRoot.scrollLeft = (index-2) * thumbnail.offsetWidth;
        }
      }
    });
  });
});

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.data('xParallax', () => ({
      debounce(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
              timeout = null;
              func.apply(context, args);
            };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      },
      load(disable) {
        if (disable) return;

        if ("IntersectionObserver" in window && 'IntersectionObserverEntry' in window) {
          const observerOptions = {
            root: null,
            rootMargin: '0px 0px',
            threshold: 0
          };

          var observer = new IntersectionObserver(handleIntersect, observerOptions);
          var el;
          function handleIntersect(entries) {
            entries.forEach(function(entry) {
              if (entry.isIntersecting) {
                el = entry.target;
                window.addEventListener('scroll', parallax, {passive: true, capture: false});
              } else {
                window.removeEventListener('scroll', parallax, {passive: true, capture: false});
              }
            });
          }

          observer.observe(this.$el);
          
          var parallax = this.debounce(function() {
            var rect = el.getBoundingClientRect();
            var speed = (window.innerHeight / el.parentElement.offsetHeight) * 20;
            var shiftDistance = (rect.top - window.innerHeight) / speed;
            var maxShiftDistance = el.parentElement.offsetHeight / 11;
            if (shiftDistance + maxShiftDistance < 0) {
              shiftDistance = -maxShiftDistance;
            }
            el.style.transform = 'translate3d(0, '+ shiftDistance +'px, 0)';
          }, 10);
        }
      }
    }));
  });
});
