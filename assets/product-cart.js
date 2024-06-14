if (!window.Eurus.loadedScript.includes('product-cart.js')) {
  window.Eurus.loadedScript.push('product-cart.js');

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.data('xProductCart', (
        wrappringVariantId,
      ) => ({
        loading: false,
        errorMessage: false,
        buttonSubmit: "",
        error_message_wrapper: {},
        addToCart(e) {
          e.preventDefault();
          this.loading = true;

          let formData = new FormData(this.$refs.product_form);
          let product = Object.fromEntries(formData);
          let items = []
  
          if(this.$refs.gift_wrapping_checkbox && this.$refs.gift_wrapping_checkbox.checked){
            items = [{"id": product.id, "quantity": product.quantity}, {"id": wrappringVariantId, "quantity": product.quantity}];
          } else {
            items = [{"id": product.id, "quantity": product.quantity}]
          }

          fetch(window.Shopify.routes.root + 'cart/add.js', {
            method:'POST',
            headers: { Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
            body: JSON.stringify({ "items": items, "sections":  Alpine.store('xCartHelper').getSectionsToRender().map((section) => section.id) })
          }).then(reponse => {
            return reponse.json();
          }).then((response) => {
            if (response.status == '422') {
              if (typeof response.errors == 'object') {
                this.error_message_wrapper = response.errors;
                document.querySelector('.recipient-error-message').classList.remove('hidden');
              } else {
                this.errorMessage = true;
                if(this.$refs.error_message){
                  this.$refs.error_message.textContent = response.description;
                }
              }
            } else {
              document.querySelector('.recipient-error-message') ? document.querySelector('.recipient-error-message').classList.add('hidden') : '';
              this.error_message_wrapper = {};

              document.dispatchEvent(new CustomEvent("eurus:cart:items-changed"));
  
              Alpine.store('xCartHelper').getSectionsToRender().forEach((section => {
                const sectionElement = document.querySelector(section.selector);
                if (sectionElement) {
                  if (response.sections[section.id])
                    sectionElement.innerHTML = getSectionInnerHTML(response.sections[section.id], section.selector);
                }
              }));
  
              if (Alpine.store('xQuickView') && Alpine.store('xQuickView').show) {
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
            if(this.$refs.gift_wrapping_checkbox) this.$refs.gift_wrapping_checkbox.checked = false;
          }) 
        }
      }))
    });
  });
}