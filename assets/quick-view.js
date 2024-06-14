requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.store('xQuickView', {
      sectionId: window.xQuickView.sectionId,
      enabled: window.xQuickView.enabled,
      buttonLabel: window.xQuickView.buttonLabel,
      show_atc_button: window.xQuickView.show_atc_button,
      show: false,
      loading: false,
      cachedResults: [],
      loadedChooseOptions: [],
      loadedChooseOptionsID: [],
      selected: false,
      addListener() {
        document.addEventListener('eurus:cart:items-changed', () => {
          this.cachedResults = [];
        });
      },
      showBtn(enable, showATCButton, textBtn) {
        this.enabled = enable;
        this.buttonLabel = textBtn;
        this.show_atc_button = showATCButton;
      },
      load(url, el) {
        let getVariant = el.getAttribute('data-variant');
        let urlProduct = getVariant?`${url}?variant=${getVariant}&section_id=${this.sectionId}`:`${url}?section_id=${this.sectionId}`;
        
        if (this.cachedResults[urlProduct]) {
          document.getElementById('quickview-product-content').innerHTML = this.cachedResults[urlProduct];
          return true;
        }

        this.loading = true;
        fetch(urlProduct)
          .then(reponse => {
            return reponse.text();
          })
          .then((response) => {
            const parser = new DOMParser();
            const content = parser.parseFromString(response,'text/html')
                              .getElementById("quickview-product-content").innerHTML;
            document.getElementById('quickview-product-content').innerHTML = content;
            this.cachedResults[urlProduct] = content;
          })
          .finally(() => {
            this.loading = false;
          })

        return true;
      },
      async loadChooseOptions(url, el, optionId) {
        var formData = {
          'attributes': {
            'choose_option_id': optionId           
          }
        };
      
        if (this.loadedChooseOptionsID[optionId]) {
          return true;
        }
      
        try {
          const response = await fetch(Shopify.routes.root + 'cart/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(formData)
          });
      
          const responseData = await response.json();
      
          this.loadedChooseOptionsID[optionId] = true;
          await this.renderChooseOptions(url, responseData.attributes.choose_option_id);
        } catch (error) {
          console.log(error);
        }
      },
      
      async renderChooseOptions(url, optionId) {
        let urlProduct = `${url}?section_id=choose-option`;
        let urlChooseOptions = urlProduct + '_choose-options';
        let destinationEl = document.getElementById('choose-options-' + optionId);
      
        if (this.loadedChooseOptions[urlChooseOptions]) {
          return true;
        }
      
        try {
          const response = await fetch(urlProduct);
          const content = await response.text();
      
          const parser = new DOMParser();
          const parsedContent = parser.parseFromString(content, 'text/html').getElementById("choose-options-content").innerHTML;
      
          destinationEl.innerHTML = parsedContent;
          this.loadedChooseOptions[urlChooseOptions] = true;
        } catch (error) {
          console.log(error);
        }
      },      
      open() {
        this.show = true;
        Alpine.store('xPopup').open = true;
      },
      close() {
        this.show = false;
        Alpine.store('xPopup').open = false;
      },
      focusQuickView(quickView, btnClose) {
        if ( !this.selected ) { 
          Alpine.store('xFocusElement').trapFocus(quickView, btnClose);
        }
      },
      removeFocusQuickView() {
        if ( !this.selected ) { 
          const elementActive = document.getElementById("button_quickview");
          Alpine.store('xFocusElement').removeTrapFocus(elementActive);
        }
      }
    });
  });
});